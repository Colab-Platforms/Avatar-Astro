import { Router } from "express";
import prisma from "@root/prisma.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { FEATURES, FEATURE_KEYS } from "@/config/features.js";
import { ALL_EVENT_TYPES, EVENT_LABELS, EVENT_TYPES, AUTH_FEATURE, PROFILE_FEATURE } from "@/config/events.js";
import { parsePage, parseRange } from "./adminPanel.validation.js";
import { wrap } from "./adminPanel.route.js";

const DAY_MS = 86_400_000;
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const STATUSES = ["success", "error", "rejected", "failed"];
const ACTIVITY_FEATURES = [...FEATURES.map((f) => f.key), AUTH_FEATURE, PROFILE_FEATURE];

/** Customer activity feed and analytics. Everything is computed from recorded rows; nothing is estimated. */
export function createAnalyticsRouter(): Router {
  const router = Router();

  // ── Customer activity feed ─────────────────────────────────────────────────
  router.get(
    "/activity",
    wrap(async (req, res) => {
      const { page, pageSize } = parsePage(req.query, 25, 100);
      const where: any = {};
      const q = req.query;

      if (typeof q.userId === "string" && q.userId) where.userId = q.userId.slice(0, 40);
      if (typeof q.eventType === "string" && ALL_EVENT_TYPES.includes(q.eventType)) where.eventType = q.eventType;
      if (typeof q.feature === "string" && ACTIVITY_FEATURES.includes(q.feature)) where.feature = q.feature;
      if (typeof q.status === "string" && STATUSES.includes(q.status)) where.status = q.status;
      if (typeof q.from === "string" || typeof q.to === "string") {
        const { from, to } = parseRange({ from: q.from, to: q.to }, 30);
        where.createdAt = { gte: from, lt: to };
      }
      // "Filter by customer" by name/email: resolve to ids first (bounded), then filter events by those ids.
      if (typeof q.customer === "string" && q.customer.trim()) {
        const term = q.customer.trim().slice(0, 100);
        const matches = await prisma.user.findMany({
          where: { isDeleted: false, OR: ["email", "firstName", "lastName"].map((f) => ({ [f]: { contains: term, mode: "insensitive" } })) },
          select: { id: true },
          take: 200,
        });
        where.userId = { in: matches.map((m) => m.id) };
      }

      const [total, rows] = await Promise.all([
        prisma.usageEvent.count({ where }),
        prisma.usageEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      // One query for every customer on this page (no N+1).
      const ids = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
      const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, firstName: true, lastName: true } }) : [];
      const byId = new Map(users.map((u) => [u.id, u]));

      sendResponse(res, true, {
        items: rows.map((r) => {
          const u = r.userId ? byId.get(r.userId) : undefined;
          return {
            id: r.id,
            at: r.createdAt,
            eventType: r.eventType,
            label: EVENT_LABELS[r.eventType] ?? r.eventType,
            feature: r.feature,
            status: r.status,
            statusCode: r.statusCode,
            durationMs: r.durationMs,
            metadata: r.metadata,
            customer: r.userId ? { id: r.userId, email: u?.email ?? null, name: u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || null : null, removed: !u } : null,
          };
        }),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        facets: {
          eventTypes: ALL_EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABELS[t] ?? t })),
          features: ACTIVITY_FEATURES.map((k) => ({ value: k, label: FEATURES.find((f) => f.key === k)?.label ?? (k === AUTH_FEATURE ? "Sign-in & accounts" : "Profile") })),
          statuses: STATUSES,
        },
      });
    }),
  );

  // ── Report analytics ───────────────────────────────────────────────────────
  router.get(
    "/reports/analytics",
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const activeEvents = `status = 'success'`;
      const [
        totalUsers, newUsers, signupsDaily, regByProvider, activeRow, returningRow, mauRow, dauRows, mauMonthly,
        requestRows, byFeatureRows, loginMethods, trendRows, firstEvent,
      ] = await Promise.all([
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.user.count({ where: { isDeleted: false, createdAt: { gte: from, lt: to } } }),
        prisma.$queryRaw<{ day: Date; provider: string; total: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, auth_provider::text AS provider, COUNT(*) AS total
          FROM users WHERE is_deleted = false AND created_at >= ${from} AND created_at < ${to} GROUP BY 1, 2 ORDER BY 1`,
        prisma.user.groupBy({ by: ["authProvider"], where: { isDeleted: false }, _count: { _all: true } }),
        prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE user_id IS NOT NULL AND status = 'success' AND created_at >= ${from} AND created_at < ${to}`,
        prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(DISTINCT e.user_id) AS n FROM usage_events e JOIN users u ON u.id = e.user_id
          WHERE e.status = 'success' AND e.created_at >= ${from} AND e.created_at < ${to} AND u.created_at < ${from}`,
        prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE user_id IS NOT NULL AND status = 'success' AND created_at >= ${new Date(to.getTime() - 30 * DAY_MS)} AND created_at < ${to}`,
        prisma.$queryRaw<{ day: Date; n: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, COUNT(DISTINCT user_id) AS n FROM usage_events
          WHERE user_id IS NOT NULL AND status = 'success' AND created_at >= ${from} AND created_at < ${to} GROUP BY 1 ORDER BY 1`,
        prisma.$queryRaw<{ month: Date; n: bigint }[]>`
          SELECT date_trunc('month', created_at) AS month, COUNT(DISTINCT user_id) AS n FROM usage_events
          WHERE user_id IS NOT NULL AND status = 'success' AND created_at >= ${from} AND created_at < ${to} GROUP BY 1 ORDER BY 1`,
        prisma.$queryRaw<{ total: bigint; ok: bigint; failed: bigint; rejected: bigint }[]>`
          SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'success') AS ok,
                 COUNT(*) FILTER (WHERE status = 'error') AS failed, COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
          FROM usage_events WHERE event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}`,
        prisma.$queryRaw<{ feature: string; total: bigint; ok: bigint; failed: bigint; rejected: bigint }[]>`
          SELECT feature, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'success') AS ok,
                 COUNT(*) FILTER (WHERE status = 'error') AS failed, COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
          FROM usage_events WHERE event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to} GROUP BY feature`,
        prisma.$queryRaw<{ method: string | null; status: string; n: bigint }[]>`
          SELECT metadata->>'method' AS method, status, COUNT(*) AS n FROM usage_events
          WHERE event_type IN ('auth.login', 'auth.login_failed') AND created_at >= ${from} AND created_at < ${to} GROUP BY 1, 2`,
        prisma.$queryRaw<{ day: Date; event_type: string; n: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, event_type, COUNT(*) AS n FROM usage_events
          WHERE created_at >= ${from} AND created_at < ${to} GROUP BY 1, 2 ORDER BY 1`,
        prisma.usageEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      void activeEvents;

      const r = requestRows[0] ?? { total: 0n, ok: 0n, failed: 0n, rejected: 0n };
      const totalReq = num(r.total), failedReq = num(r.failed);
      const usageMap = new Map(byFeatureRows.map((x) => [x.feature, x]));
      const features = FEATURES.map((f) => {
        const u = usageMap.get(f.key);
        return { key: f.key, label: f.label, provider: f.provider, total: num(u?.total), success: num(u?.ok), failed: num(u?.failed), rejected: num(u?.rejected) };
      });
      const used = features.filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
      const providers = new Map<string, { provider: string; requests: number; failed: number }>();
      for (const f of features) {
        if (f.provider === "none") continue;
        const p = providers.get(f.provider) ?? { provider: f.provider, requests: 0, failed: 0 };
        p.requests += f.total; p.failed += f.failed;
        providers.set(f.provider, p);
      }

      // Continuous day axis so charts show real zeros instead of skipping empty days.
      const days: string[] = [];
      for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) days.push(iso(new Date(t)));
      const reg = new Map<string, { email: number; google: number }>();
      for (const s of signupsDaily) {
        const d = iso(s.day); const cur = reg.get(d) ?? { email: 0, google: 0 };
        if (s.provider === "GOOGLE") cur.google += num(s.total); else cur.email += num(s.total);
        reg.set(d, cur);
      }
      const dau = new Map(dauRows.map((x) => [iso(x.day), num(x.n)]));
      const trend = new Map<string, Record<string, number>>();
      for (const t of trendRows) { const d = iso(t.day); const cur = trend.get(d) ?? {}; cur[t.event_type] = num(t.n); trend.set(d, cur); }

      sendResponse(res, true, {
        from: iso(from),
        to: iso(new Date(to.getTime() - DAY_MS)),
        trackingSince: firstEvent?.createdAt ?? null,
        kpis: {
          totalUsers, newUsers,
          activeUsers: num(activeRow[0]?.n), returningUsers: num(returningRow[0]?.n), monthlyActiveUsers: num(mauRow[0]?.n),
          totalRequests: totalReq, successfulRequests: num(r.ok), failedRequests: failedReq, rejectedRequests: num(r.rejected),
          failureRate: totalReq ? failedReq / totalReq : 0,
          mostUsedFeature: used[0] ? { key: used[0].key, label: used[0].label, total: used[0].total } : null,
        },
        registrations: days.map((d) => ({ day: d, email: reg.get(d)?.email ?? 0, google: reg.get(d)?.google ?? 0 })),
        dailyActiveUsers: days.map((d) => ({ day: d, users: dau.get(d) ?? 0 })),
        monthlyActiveUsers: mauMonthly.map((m) => ({ month: iso(m.month).slice(0, 7), users: num(m.n) })),
        features,
        mostUsed: used.slice(0, 5),
        leastUsed: [...features].sort((a, b) => a.total - b.total).slice(0, 5),
        requestStatus: [
          { status: "success", count: num(r.ok) }, { status: "failed", count: failedReq }, { status: "rejected", count: num(r.rejected) },
        ],
        authMethods: {
          accountsByProvider: regByProvider.map((g) => ({ provider: g.authProvider, users: g._count._all })),
          signInsByMethod: loginMethods.filter((l) => l.status === "success").map((l) => ({ method: l.method ?? "unknown", count: num(l.n) })),
          failedSignInsByMethod: loginMethods.filter((l) => l.status !== "success").map((l) => ({ method: l.method ?? "unknown", count: num(l.n) })),
        },
        activityTrend: days.map((d) => ({ day: d, ...(trend.get(d) ?? {}) })),
        eventTypes: Object.values(EVENT_TYPES),
        providers: [...providers.values()],
      });
    }),
  );

  void FEATURE_KEYS;
  return router;
}
