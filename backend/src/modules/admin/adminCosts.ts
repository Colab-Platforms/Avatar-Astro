import { Router } from "express";
import prisma from "@root/prisma.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { FEATURES } from "@/config/features.js";
import { usdToInrRate } from "@/config/aiPricing.js";
import type { MainAdminRequest } from "@/middleware/mainAdmin.js";
import { parseRange, toCsv } from "./adminPanel.validation.js";
import { wrap } from "./adminPanel.route.js";
import { writeAudit } from "./audit.js";
import { readSnapshot, refreshSnapshot } from "./providerBalance.js";
import { diagnosticsSnapshot } from "@/utils/aiDiagnostics.js";
import { loadPricing, openRouterCatalogueSize } from "@/config/aiPricing.js";

const DAY_MS = 86_400_000;
const num = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const labelOf = (key: string) => FEATURES.find((f) => f.key === key)?.label ?? key;

interface Group {
  key: string;
  requests: bigint;
  tokens: bigint | null;
  cost: number | null;
  actual: number | null;
  estimated: number | null;
  unpriced: bigint;
  failed: bigint;
}

/**
 * Cost analytics. Every number is a sum over recorded usage_events rows where an AI provider was actually called
 * (ai_calls > 0). Rows from before tracking, non-AI requests and cached responses have no AI columns and add nothing.
 */
export function createCostsRouter(): Router {
  const router = Router();

  router.get(
    "/costs/summary",
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekStart = new Date(todayStart.getTime() - ((todayStart.getUTCDay() + 6) % 7) * DAY_MS); // Monday, UTC
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const tomorrow = new Date(todayStart.getTime() + DAY_MS);

      const groupBy = (col: string) =>
        prisma.$queryRawUnsafe<Group[]>(
          `SELECT ${col} AS key, COUNT(*) AS requests, SUM(total_tokens) AS tokens,
                  SUM(cost_usd)::float8 AS cost,
                  SUM(cost_usd) FILTER (WHERE cost_basis = 'actual')::float8 AS actual,
                  SUM(cost_usd) FILTER (WHERE cost_basis = 'estimated')::float8 AS estimated,
                  COUNT(*) FILTER (WHERE cost_usd IS NULL) AS unpriced,
                  COUNT(*) FILTER (WHERE status <> 'success') AS failed
           FROM usage_events WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= $1 AND created_at < $2
           GROUP BY 1 ORDER BY cost DESC NULLS LAST, requests DESC`,
          from,
          to,
        );
      const shape = (g: Group, label?: (k: string) => string) => ({
        key: g.key ?? "unknown",
        label: label ? label(g.key) : (g.key ?? "unknown"),
        requests: num(g.requests),
        tokens: g.tokens == null ? null : num(g.tokens),
        costUsd: g.cost,
        actualUsd: g.actual,
        estimatedUsd: g.estimated,
        unpricedRequests: num(g.unpriced),
        failedRequests: num(g.failed),
      });

      const [totalRow, windows, byFeature, byProvider, byModel, topRows, dailyRows, first] = await Promise.all([
        prisma.$queryRaw<{ requests: bigint; tokens: bigint | null; input: bigint | null; output: bigint | null; cost: number | null; actual: number | null; estimated: number | null; priced: bigint; unpriced: bigint; failed: bigint; customers: bigint }[]>`
          SELECT COUNT(*) AS requests, SUM(total_tokens) AS tokens, SUM(input_tokens) AS input, SUM(output_tokens) AS output,
                 SUM(cost_usd)::float8 AS cost,
                 SUM(cost_usd) FILTER (WHERE cost_basis = 'actual')::float8 AS actual,
                 SUM(cost_usd) FILTER (WHERE cost_basis = 'estimated')::float8 AS estimated,
                 COUNT(*) FILTER (WHERE cost_usd IS NOT NULL) AS priced,
                 COUNT(*) FILTER (WHERE cost_usd IS NULL) AS unpriced,
                 COUNT(*) FILTER (WHERE status <> 'success') AS failed,
                 COUNT(DISTINCT user_id) AS customers
          FROM usage_events WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}`,
        prisma.$queryRaw<{ today: number | null; week: number | null; month: number | null }[]>`
          SELECT SUM(cost_usd) FILTER (WHERE created_at >= ${todayStart})::float8 AS today,
                 SUM(cost_usd) FILTER (WHERE created_at >= ${weekStart})::float8 AS week,
                 SUM(cost_usd) FILTER (WHERE created_at >= ${monthStart})::float8 AS month
          FROM usage_events WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= ${new Date(Math.min(weekStart.getTime(), monthStart.getTime()))} AND created_at < ${tomorrow}`,
        groupBy("feature"),
        groupBy("ai_provider"),
        groupBy("ai_model"),
        prisma.$queryRaw<{ user_id: string | null; requests: bigint; tokens: bigint | null; cost: number | null }[]>`
          SELECT user_id, COUNT(*) AS requests, SUM(total_tokens) AS tokens, SUM(cost_usd)::float8 AS cost
          FROM usage_events WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}
          GROUP BY user_id HAVING SUM(cost_usd) IS NOT NULL ORDER BY cost DESC LIMIT 10`,
        prisma.$queryRaw<{ day: Date; requests: bigint; tokens: bigint | null; cost: number | null; actual: number | null; estimated: number | null }[]>`
          SELECT date_trunc('day', created_at) AS day, COUNT(*) AS requests, SUM(total_tokens) AS tokens, SUM(cost_usd)::float8 AS cost,
                 SUM(cost_usd) FILTER (WHERE cost_basis = 'actual')::float8 AS actual,
                 SUM(cost_usd) FILTER (WHERE cost_basis = 'estimated')::float8 AS estimated
          FROM usage_events WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}
          GROUP BY 1 ORDER BY 1`,
        prisma.$queryRaw<{ at: Date | null }[]>`SELECT MIN(created_at) AS at FROM usage_events WHERE ai_calls > 0`,
      ]);

      const t = totalRow[0];
      const w = windows[0] ?? { today: null, week: null, month: null };
      const ids = topRows.map((r) => r.user_id).filter((x): x is string => !!x);
      const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true, lastName: true } }) : [];
      const uById = new Map(users.map((u) => [u.id, u]));

      const days: string[] = [];
      for (let d = from.getTime(); d < to.getTime(); d += DAY_MS) days.push(iso(new Date(d)));
      const dailyMap = new Map(dailyRows.map((d) => [iso(d.day), d]));
      const priced = num(t?.priced);

      sendResponse(res, true, {
        from: iso(from),
        to: iso(new Date(to.getTime() - DAY_MS)),
        currency: "USD",
        inrRate: usdToInrRate(),
        trackingSince: first[0]?.at ?? null,
        note: "Only requests that actually called an AI provider are counted. Costs marked actual come from the provider; estimated costs are token counts multiplied by the configured price. Requests with no usable cost are counted as unpriced, never as zero. Days are UTC.",
        kpis: {
          totalCostUsd: t?.cost ?? null,
          actualCostUsd: t?.actual ?? null,
          estimatedCostUsd: t?.estimated ?? null,
          costTodayUsd: w.today,
          costThisWeekUsd: w.week,
          costThisMonthUsd: w.month,
          totalAiRequests: num(t?.requests),
          failedAiRequests: num(t?.failed),
          unpricedRequests: num(t?.unpriced),
          pricedRequests: priced,
          totalTokens: t?.tokens == null ? null : num(t.tokens),
          inputTokens: t?.input == null ? null : num(t.input),
          outputTokens: t?.output == null ? null : num(t.output),
          averageCostUsd: priced && t?.cost != null ? t.cost / priced : null,
          customers: num(t?.customers),
        },
        byFeature: byFeature.map((g) => shape(g, labelOf)),
        byProvider: byProvider.map((g) => shape(g)),
        byModel: byModel.map((g) => shape(g)),
        topCustomers: topRows.map((r) => {
          const u = r.user_id ? uById.get(r.user_id) : undefined;
          return {
            userId: r.user_id,
            email: u?.email ?? null,
            name: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || null : null,
            removed: !!r.user_id && !u,
            requests: num(r.requests),
            tokens: r.tokens == null ? null : num(r.tokens),
            costUsd: r.cost,
          };
        }),
        daily: days.map((d) => {
          const r = dailyMap.get(d);
          return { day: d, requests: num(r?.requests), tokens: r?.tokens == null ? 0 : num(r.tokens), costUsd: r?.cost ?? 0, actualUsd: r?.actual ?? 0, estimatedUsd: r?.estimated ?? 0 };
        }),
      });
    }),
  );

  // ── Why is AI usage missing? Flags and counts only: no prompts, content, keys or prices ──
  router.get(
    "/costs/diagnostics",
    wrap(async (_req, res) => {
      const since = new Date(Date.now() - 7 * DAY_MS);
      const rows = await prisma.$queryRaw<{ feature: string; requests: bigint; withAi: bigint; okWithoutAi: bigint; failed: bigint }[]>`
        SELECT feature, COUNT(*) AS requests, COUNT(*) FILTER (WHERE ai_calls > 0) AS "withAi",
               COUNT(*) FILTER (WHERE status = 'success' AND ai_calls IS NULL AND NOT served_from_cache) AS "okWithoutAi",
               COUNT(*) FILTER (WHERE status <> 'success') AS failed
        FROM usage_events WHERE event_type = 'feature.request' AND created_at >= ${since} GROUP BY feature ORDER BY feature`;
      const configured = (name: string) => !!process.env[name];
      sendResponse(res, true, {
        ...diagnosticsSnapshot(),
        providersConfigured: { openrouter: configured("OPENROUTER_API_KEY"), groq: configured("GROQ_API_KEY"), sarvam: configured("SARVAM_API_KEY") },
        pricingEntries: Object.keys(loadPricing()).length,
        openRouterPriceList: openRouterCatalogueSize(),
        windowDays: 7,
        features: rows.map((r) => ({ feature: r.feature, requests: num(r.requests), withAiUsage: num(r.withAi), succeededWithoutAi: num(r.okWithoutAi), notSuccessful: num(r.failed) })),
        note: "Per-process view: counters reset when the server restarts. A feature request that succeeded without AI usage either called no provider (cached, validation, or the provider is not configured on this server) or ran on a server that has not been restarted since this version was installed.",
      });
    }),
  );

  // ── Provider balances: reading never calls a provider; only the refresh does ──
  router.get(
    "/providers/balance",
    wrap(async (_req, res) => {
      const snap = await readSnapshot();
      sendResponse(res, true, { ...snap, minRefreshSeconds: 60 });
    }),
  );

  router.post(
    "/providers/balance/refresh",
    createRateLimiter({ windowMs: 60_000, max: 6, message: "Too many refreshes. Please wait a minute." }),
    wrap(async (req, res) => {
      const snap = await refreshSnapshot((req as MainAdminRequest).adminEmail ?? "admin");
      if (!snap.throttled) await writeAudit(req, { action: "providers.balance_refresh", entityType: "integration", summary: "Refreshed provider balances" });
      sendResponse(res, true, snap, snap.throttled ? "Checked less than a minute ago; showing the saved result." : "Provider balances refreshed");
    }),
  );

  return router;
}

/** CSV rows for AI requests; ids only (no names or emails), same as the activity export. */
export async function aiCostCsv(from: Date, to: Date, featureFilter?: string): Promise<string> {
  const where: any = { eventType: "feature.request", aiCalls: { gt: 0 }, createdAt: { gte: from, lt: to } };
  if (featureFilter) where.feature = featureFilter;
  const rows = await prisma.usageEvent.findMany({ where, orderBy: { createdAt: "asc" }, take: 20000 });
  return toCsv(
    ["time_utc", "user_id", "feature", "provider", "model", "ai_calls", "input_tokens", "output_tokens", "total_tokens", "cost_usd", "cost_basis", "status", "status_code", "duration_ms"],
    rows.map((r) => [r.createdAt, r.userId, r.feature, r.aiProvider, r.aiModel, r.aiCalls, r.inputTokens, r.outputTokens, r.totalTokens, r.costUsd == null ? "" : r.costUsd.toString(), r.costBasis, r.status, r.statusCode, r.durationMs]),
  );
}
