import type { Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { featureSettingKey } from "@/config/features.js";
import { isFeatureEnabled } from "@/modules/admin/settings.js";
import { EVENT_TYPES } from "@/config/events.js";
import { newUsageStore, runWithUsageStore, summarizeCalls, type RequestAiSummary } from "@/utils/aiUsageCapture.js";

const SENSITIVE_KEY = /token|password|secret|key|authorization|cookie|otp|code/i;

/**
 * Metadata is for safe context only. Keep short primitive values and short string lists, drop anything whose
 * key looks sensitive, and cap the size. Never put request bodies, tokens or user-written content in here.
 */
export function safeMetadata(input?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,29}$/.test(k) || SENSITIVE_KEY.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 120);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 12).map((x: string) => x.slice(0, 40));
    if (Object.keys(out).length >= 10) break;
  }
  return Object.keys(out).length ? out : undefined;
}

export interface RecordEventInput {
  userId?: string | null;
  eventType: string;
  feature: string;
  status: "success" | "failed" | "error" | "rejected";
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  ai?: Partial<RequestAiSummary>;
  servedFromCache?: boolean;
}

/** The single way customer activity is written. Fire-and-forget: tracking must never break the feature. */
export function recordEvent(e: RecordEventInput): void {
  prisma.usageEvent
    .create({
      data: {
        userId: e.userId ?? null,
        eventType: e.eventType,
        feature: e.feature,
        status: e.status,
        statusCode: e.statusCode ?? 0,
        durationMs: e.durationMs ?? 0,
        metadata: safeMetadata(e.metadata) as any,
        aiProvider: e.ai?.aiProvider ?? null,
        aiModel: e.ai?.aiModel ?? null,
        aiCalls: e.ai?.aiCalls ?? null,
        inputTokens: e.ai?.inputTokens ?? null,
        outputTokens: e.ai?.outputTokens ?? null,
        totalTokens: e.ai?.totalTokens ?? null,
        costUsd: e.ai?.costUsd ?? null,
        costBasis: e.ai?.costBasis ?? null,
        servedFromCache: e.servedFromCache ?? false,
      },
    })
    .catch((err: any) => console.warn("[activity] not recorded:", err?.message));
}

type UserReq = Request & { user?: { id: string } };

/**
 * Records one UsageEvent per request once the response has finished. Only
 * metadata is stored (feature, signed-in user id, status, duration), never
 * request or response bodies. Failures to record are swallowed so tracking can
 * never break a feature.
 */
export function trackFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();
    // One row per request, even if the middleware is mounted twice on the same path.
    if (res.locals.__usageTracked) return next();
    res.locals.__usageTracked = true;
    const started = Date.now();
    const store = newUsageStore();
    res.on("finish", () => {
      const statusCode = res.statusCode;
      // Anonymous 401s are probes/bots, not usage.
      const userId = (req as UserReq).user?.id ?? null;
      if (statusCode === 401 && !userId) return;
      const status = statusCode < 400 ? "success" : statusCode >= 500 ? "error" : "rejected";
      // A 304 means the browser reused its copy: nothing was generated, so it carries no AI cost.
      const notModified = statusCode === 304;
      recordEvent({
        userId,
        eventType: EVENT_TYPES.featureRequest,
        feature,
        status,
        statusCode,
        durationMs: Date.now() - started,
        metadata: { method: req.method, route: `${req.baseUrl}${req.route?.path && req.route.path !== "/" ? req.route.path : ""}` || req.path },
        ai: notModified ? undefined : summarizeCalls(store.calls),
        servedFromCache: notModified || store.servedFromCache,
      });
    });
    runWithUsageStore(store, next);
  };
}

/** Lets the main admin switch a feature off without a deploy. Fails open. */
export function featureGate(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();
    try {
      if (!(await isFeatureEnabled(featureSettingKey(feature)))) {
        const message = "This feature is temporarily unavailable. Please try again later.";
        return res.status(503).json({ success: false, status: false, error: message, message, code: "FEATURE_DISABLED" });
      }
    } catch {
      /* fail open */
    }
    next();
  };
}

/** Tracking + gate for a feature, as a mount-time middleware list. */
export const feature = (key: string) => [trackFeature(key), featureGate(key)];
