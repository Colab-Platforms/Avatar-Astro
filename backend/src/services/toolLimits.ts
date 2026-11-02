/**
 * Per-user, per-tool usage limits over a rolling 24 hours, enforced on the server.
 *
 * Counting rule: a request to a metered endpoint (config/toolMeters.ts) by a signed-in user counts as ONE use as soon as it is
 * admitted (the tool is switched on and the user is under the limit), whether it later succeeds or is rejected for bad input.
 * A 5xx response (our failure or the AI provider's) is refunded, so users are not charged for errors that are not theirs.
 * Requests rejected because the tool is off or the limit is reached are never counted. Rows older than 24h stop counting
 * immediately (the window is computed per request) and are pruned as the user makes further requests.
 *
 * Races: check-and-insert runs in one transaction behind a per-(tool, user) Postgres advisory lock, so concurrent requests from
 * any number of sessions or application instances are serialised and can never exceed the limit.
 */
import type { NextFunction, Request, Response } from "express";
import prisma from "@root/prisma.js";
import { matchMetered } from "@/config/toolMeters.js";

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_LIMIT = 100_000;

// ── limit lookup (short cache so a busy tool does not hit the database on every request) ──
const TTL_MS = 5_000;
const cache = new Map<string, { limit: number | null; at: number }>();

export async function getToolLimit(tool: string): Promise<number | null> {
  const hit = cache.get(tool);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.limit;
  const row = await prisma.toolLimit.findUnique({ where: { toolKey: tool }, select: { perUserLimit: true } });
  const limit = row?.perUserLimit ?? null;
  cache.set(tool, { limit, at: Date.now() });
  return limit;
}
/** Make a committed admin change visible to this process at once (other instances pick it up within the TTL). */
export function cacheToolLimit(tool: string, limit: number | null): void {
  cache.set(tool, { limit, at: Date.now() });
}
export function resetToolLimitCache(): void {
  cache.clear();
}

export type ConsumeResult =
  | { allowed: true; attemptId: string; used: number; limit: number }
  | { allowed: false; used: number; limit: number; retryAt: Date };

export async function consumeToolUse(tool: string, userId: string, limit: number, now: Date = new Date()): Promise<ConsumeResult> {
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const lockKey = `tool:${tool}:${userId}`;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${lockKey}))) AS l`;
    const rows = await tx.toolUsageAttempt.findMany({
      where: { toolKey: tool, userId, createdAt: { gt: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (rows.length >= limit) {
      // The user can go again once enough of the oldest uses have left the window to drop below the limit.
      const frees = rows[rows.length - limit].createdAt;
      return { allowed: false as const, used: rows.length, limit, retryAt: new Date(frees.getTime() + WINDOW_MS) };
    }
    const created = await tx.toolUsageAttempt.create({ data: { toolKey: tool, userId, createdAt: now }, select: { id: true } });
    await tx.toolUsageAttempt.deleteMany({ where: { toolKey: tool, userId, createdAt: { lte: windowStart } } });
    return { allowed: true as const, attemptId: created.id, used: rows.length + 1, limit };
  });
}

export const refundToolUse = (attemptId: string) => prisma.toolUsageAttempt.deleteMany({ where: { id: attemptId } });

/** Uses in the current window for one user (for admin and tests). */
export async function usedInWindow(tool: string, userId: string, now: Date = new Date()): Promise<number> {
  return prisma.toolUsageAttempt.count({ where: { toolKey: tool, userId, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } } });
}

const when = (d: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(d) + " IST";

/** Mount after optionalAuth(). Only metered endpoints are touched; everything else passes straight through. */
export function toolLimitGate(tool: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();
    const path = req.originalUrl.split("?")[0].replace(/\/+$/, "") || "/";
    if (!matchMetered(tool, req.method, path)) return next();
    let limit: number | null;
    try {
      limit = await getToolLimit(tool);
    } catch (err: any) {
      console.warn("[toolLimit] limit lookup failed, allowing request:", err?.message);
      return next();
    }
    if (limit == null) return next();

    const userId = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId) {
      const message = "Please sign in to use this tool.";
      return res.status(401).json({ success: false, status: false, error: message, message, code: "SIGN_IN_REQUIRED" });
    }
    let result: ConsumeResult;
    try {
      result = await consumeToolUse(tool, userId, limit);
    } catch (err: any) {
      console.warn("[toolLimit] could not record use, allowing request:", err?.message);
      return next();
    }
    if (!result.allowed) {
      res.locals.__rejectReason = "limit";
      const seconds = Math.max(1, Math.ceil((result.retryAt.getTime() - Date.now()) / 1000));
      res.setHeader("Retry-After", String(seconds));
      const message = `You have used all ${limit} ${limit === 1 ? "use" : "uses"} of this tool in the last 24 hours. You can try again after ${when(result.retryAt)}.`;
      return res.status(429).json({
        success: false, status: false, error: message, message, code: "TOOL_LIMIT_REACHED",
        data: { tool, limit, used: result.used, windowHours: 24, retryAt: result.retryAt.toISOString(), retryAfterSeconds: seconds },
      });
    }
    // Our/provider failures are not the user's use.
    res.on("finish", () => {
      if (res.statusCode >= 500) refundToolUse(result.attemptId).catch(() => undefined);
    });
    next();
  };
}
