import { Router } from "express";
import prisma from "@root/prisma.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { parseRange, toCsv } from "./adminPanel.validation.js";
import { wrap } from "./adminPanel.route.js";
import { writeAudit } from "./audit.js";
import { buildReport, FEATURE_COST_CSV_HEADERS, featureCostCsvRows, type ObservedGroup, type ReportFilters } from "./aiFeatureCost.js";

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : undefined);
const filtersOf = (q: any): ReportFilters => ({ feature: str(q.feature), provider: str(q.provider), model: str(q.model) });

interface Raw {
  feature: string; route: string | null; provider: string | null; model: string | null;
  requests: bigint; calls: bigint | null; failed: bigint;
  actualRequests: bigint; actualUsd: number | null; estimatedRequests: bigint; estimatedUsd: number | null;
  tokenOnlyRequests: bigint; tokenOnlyInput: bigint | null; tokenOnlyOutput: bigint | null;
  tokenRequests: bigint; inputTokens: bigint | null; outputTokens: bigint | null;
}

/**
 * Reads the usage_events rows that the existing AI cost tracking already writes and groups them per route and model.
 * Nothing is written. Cached responses and non-AI requests have no ai_calls, so they are not counted; a request that
 * retried inside the provider layer is one row, so its retries are included once, not multiplied.
 */
async function observedGroups(from: Date, to: Date): Promise<ObservedGroup[]> {
  const rows = await prisma.$queryRaw<Raw[]>`
    SELECT feature, metadata->>'route' AS route, ai_provider AS provider, ai_model AS model,
           COUNT(*) AS requests, SUM(ai_calls) AS calls, COUNT(*) FILTER (WHERE status <> 'success') AS failed,
           COUNT(*) FILTER (WHERE cost_basis = 'actual') AS "actualRequests",
           SUM(cost_usd) FILTER (WHERE cost_basis = 'actual')::float8 AS "actualUsd",
           COUNT(*) FILTER (WHERE cost_basis = 'estimated') AS "estimatedRequests",
           SUM(cost_usd) FILTER (WHERE cost_basis = 'estimated')::float8 AS "estimatedUsd",
           COUNT(*) FILTER (WHERE cost_usd IS NULL AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "tokenOnlyRequests",
           SUM(input_tokens) FILTER (WHERE cost_usd IS NULL AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "tokenOnlyInput",
           SUM(output_tokens) FILTER (WHERE cost_usd IS NULL AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "tokenOnlyOutput",
           COUNT(*) FILTER (WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "tokenRequests",
           SUM(input_tokens) FILTER (WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "inputTokens",
           SUM(output_tokens) FILTER (WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS "outputTokens"
    FROM usage_events
    WHERE ai_calls > 0 AND event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}
    GROUP BY 1, 2, 3, 4`;
  return rows.map((r) => ({
    feature: r.feature, route: r.route, provider: r.provider, model: r.model,
    requests: num(r.requests), calls: num(r.calls), failed: num(r.failed),
    actualRequests: num(r.actualRequests), actualUsd: num(r.actualUsd),
    estimatedRequests: num(r.estimatedRequests), estimatedUsd: num(r.estimatedUsd),
    tokenOnlyRequests: num(r.tokenOnlyRequests), tokenOnlyInput: num(r.tokenOnlyInput), tokenOnlyOutput: num(r.tokenOnlyOutput),
    tokenRequests: num(r.tokenRequests), inputTokens: num(r.inputTokens), outputTokens: num(r.outputTokens),
  }));
}

export function createFeatureCostsRouter(): Router {
  const router = Router();

  router.get(
    "/costs/features",
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const report = buildReport(await observedGroups(from, to), filtersOf(req.query));
      sendResponse(res, true, {
        from: from.toISOString().slice(0, 10),
        to: new Date(to.getTime() - 86_400_000).toISOString().slice(0, 10),
        ...report,
        note: "Actual = cost reported by the provider on recorded requests. Estimated = recorded token counts x a verified or configured price. Operations with no recorded request show Unknown, never $0, unless the model is verified free. Nothing here calls a provider or writes a cost record.",
      });
    }),
  );

  router.get(
    "/costs/features/export",
    createRateLimiter({ windowMs: 60_000, max: 10, message: "Too many exports. Please wait a minute." }),
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const report = buildReport(await observedGroups(from, to), filtersOf(req.query));
      const stamp = `${from.toISOString().slice(0, 10)}_${new Date(to.getTime() - 86_400_000).toISOString().slice(0, 10)}`;
      await writeAudit(req, { action: "report.export", entityType: "report", entityId: "feature-costs", summary: `Exported AI feature cost breakdown ${stamp}` });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mybhagya-feature-costs-${stamp}.csv"`);
      res.status(200).send("﻿" + toCsv(FEATURE_COST_CSV_HEADERS, featureCostCsvRows(report)));
    }),
  );

  return router;
}
