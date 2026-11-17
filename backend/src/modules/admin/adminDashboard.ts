import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { FEATURES } from "@/config/features.js";
import { EVENT_TYPES } from "@/config/events.js";
import { parsePage, parseRange } from "./adminPanel.validation.js";
import { wrap } from "./adminPanel.route.js";
import { ADMIN_ROLE_NAMES, kindWhere } from "./adminAccounts.js";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);
const featureLabel = (key: string) => FEATURES.find((f) => f.key === key)?.label ?? key;

/**
 * Every figure on the Overview dashboard, for one date range. Nothing is estimated or invented: each number is a count or a
 * sum over rows that exist (users, payment orders, generated readings, tool executions, recorded usage events), and a metric
 * with no source simply is not returned. Money is whole paise from Razorpay orders only (mock orders are never revenue).
 * Days and hours are UTC, like the other admin reports.
 */
export function createDashboardRouter(): Router {
  const router = Router();

  router.get(
    "/overview/dashboard",
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query, 30);
      const lastDay = new Date(to.getTime() - DAY_MS);
      // A single day is shown hour by hour (a one-point chart says nothing); longer ranges are shown day by day.
      const bucket: "hour" | "day" = to.getTime() - from.getTime() <= DAY_MS ? "hour" : "day";
      const live = kindWhere("customer"); // customers only; administrators are managed separately
      const inRange = { gte: from, lt: to };
      const adminRoles = Prisma.join(ADMIN_ROLE_NAMES);

      const [
        totalCustomers, newCustomers, activeAccounts, activeCustomersRow,
        revenueAgg, failedPayments, abandonedPayments,
        readingsCount, readingsByFeature, failedRuns, openRefunds,
        usageRows, since,
        regSeries, revenueSeries, failedSeries, activitySeries,
        recentRegistrations, recentPayments, recentReadings, recentAudit,
      ] = await Promise.all([
        prisma.user.count({ where: live }),
        prisma.user.count({ where: { ...live, createdAt: inRange } }),
        prisma.user.count({ where: { ...live, isActive: true } }),
        // A customer counts as active in the range if the platform recorded anything from them (sign-in, a feature, a page action).
        prisma.$queryRaw<{ n: bigint }[]>`
          SELECT COUNT(DISTINCT e.user_id) AS n
          FROM usage_events e JOIN users u ON u.id = e.user_id
          WHERE e.created_at >= ${from} AND e.created_at < ${to} AND u.is_deleted = false
            AND NOT EXISTS (SELECT 1 FROM user_role_mapping m JOIN roles r ON r.id = m.role_id WHERE m.user_id = u.id AND r.name IN (${adminRoles}))`,
        prisma.paymentOrder.aggregate({ where: { provider: "RAZORPAY", status: "SUCCESS", completedAt: inRange }, _sum: { amountPaise: true }, _count: { _all: true } }),
        prisma.paymentOrder.count({ where: { provider: "RAZORPAY", status: "FAILED", createdAt: inRange } }),
        prisma.paymentOrder.count({ where: { provider: "RAZORPAY", status: "EXPIRED", createdAt: inRange } }),
        prisma.generatedReading.count({ where: { createdAt: inRange } }),
        prisma.generatedReading.groupBy({ by: ["feature"], where: { createdAt: inRange }, _count: { _all: true }, orderBy: { _count: { feature: "desc" } } }),
        prisma.toolExecution.count({ where: { status: "FAILED", createdAt: inRange } }),
        prisma.paymentRefund.count({ where: { handling: "ACTION_REQUIRED" } }),
        prisma.$queryRaw<{ feature: string; total: bigint; errors: bigint }[]>`
          SELECT feature, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'error') AS errors
          FROM usage_events WHERE event_type = ${EVENT_TYPES.featureRequest} AND created_at >= ${from} AND created_at < ${to}
          GROUP BY feature`,
        prisma.usageEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.$queryRaw<{ t: Date; n: bigint }[]>`
          SELECT date_trunc(${bucket}, u.created_at) AS t, COUNT(*) AS n
          FROM users u
          WHERE u.is_deleted = false AND u.created_at >= ${from} AND u.created_at < ${to}
            AND NOT EXISTS (SELECT 1 FROM user_role_mapping m JOIN roles r ON r.id = m.role_id WHERE m.user_id = u.id AND r.name IN (${adminRoles}))
          GROUP BY 1`,
        prisma.$queryRaw<{ t: Date; paise: bigint; n: bigint }[]>`
          SELECT date_trunc(${bucket}, completed_at) AS t, COALESCE(SUM(amount_paise), 0) AS paise, COUNT(*) AS n
          FROM payment_orders
          WHERE provider::text = 'RAZORPAY' AND status::text = 'SUCCESS' AND completed_at >= ${from} AND completed_at < ${to}
          GROUP BY 1`,
        prisma.$queryRaw<{ t: Date; n: bigint }[]>`
          SELECT date_trunc(${bucket}, created_at) AS t, COUNT(*) AS n
          FROM payment_orders
          WHERE provider::text = 'RAZORPAY' AND status::text = 'FAILED' AND created_at >= ${from} AND created_at < ${to}
          GROUP BY 1`,
        prisma.$queryRaw<{ t: Date; customers: bigint; events: bigint }[]>`
          SELECT date_trunc(${bucket}, e.created_at) AS t, COUNT(DISTINCT e.user_id) AS customers, COUNT(*) AS events
          FROM usage_events e JOIN users u ON u.id = e.user_id
          WHERE e.created_at >= ${from} AND e.created_at < ${to} AND u.is_deleted = false
            AND NOT EXISTS (SELECT 1 FROM user_role_mapping m JOIN roles r ON r.id = m.role_id WHERE m.user_id = u.id AND r.name IN (${adminRoles}))
          GROUP BY 1`,
        prisma.user.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } }),
        prisma.paymentOrder.findMany({
          where: { provider: "RAZORPAY" }, orderBy: { createdAt: "desc" }, take: 6,
          select: { id: true, amountPaise: true, status: true, createdAt: true, completedAt: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        }),
        prisma.generatedReading.findMany({
          orderBy: { createdAt: "desc" }, take: 6,
          select: { id: true, feature: true, title: true, createdAt: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        }),
        prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, actorEmail: true, action: true, summary: true, createdAt: true } }),
      ]);

      // Every bucket in the range is present, so a quiet day is a visible zero rather than a gap.
      const step = bucket === "hour" ? HOUR_MS : DAY_MS;
      const keys: string[] = [];
      for (let t = from.getTime(); t < to.getTime(); t += step) keys.push(new Date(t).toISOString().slice(0, bucket === "hour" ? 13 : 10));
      const keyOf = (d: Date) => d.toISOString().slice(0, bucket === "hour" ? 13 : 10);
      const by = <T extends { t: Date }>(rows: T[]) => new Map(rows.map((r) => [keyOf(r.t), r]));
      const regBy = by(regSeries), revBy = by(revenueSeries), failBy = by(failedSeries), actBy = by(activitySeries);

      const features = usageRows.map((r) => ({ key: r.feature, label: featureLabel(r.feature), requests: num(r.total), errors: num(r.errors) })).sort((a, b) => b.requests - a.requests);
      const requests = features.reduce((s, f) => s + f.requests, 0);
      const errors = features.reduce((s, f) => s + f.errors, 0);
      const successful = revenueAgg._count._all;

      sendResponse(res, true, {
        from: from.toISOString().slice(0, 10),
        to: lastDay.toISOString().slice(0, 10),
        bucket,
        trackingSince: since?.createdAt ?? null,
        totals: {
          customers: { total: totalCustomers, new: newCustomers, activeInRange: num(activeCustomersRow[0]?.n), activeAccounts },
          revenue: { paise: revenueAgg._sum.amountPaise ?? 0, currency: "INR" },
          transactions: { successful, failed: failedPayments, abandoned: abandonedPayments },
          readings: { generated: readingsCount, byFeature: readingsByFeature.map((r) => ({ feature: r.feature, label: featureLabel(r.feature), count: r._count._all })) },
          tools: { requests, errors, errorRate: requests ? errors / requests : 0, features },
        },
        series: {
          registrations: keys.map((t) => ({ t, total: num(regBy.get(t)?.n) })),
          revenue: keys.map((t) => ({ t, paise: num(revBy.get(t)?.paise), count: num(revBy.get(t)?.n) })),
          transactions: keys.map((t) => ({ t, success: num(revBy.get(t)?.n), failed: num(failBy.get(t)?.n) })),
          activity: keys.map((t) => ({ t, activeCustomers: num(actBy.get(t)?.customers), events: num(actBy.get(t)?.events) })),
        },
        recent: {
          registrations: recentRegistrations,
          payments: recentPayments,
          readings: recentReadings,
          audit: recentAudit,
        },
        alerts: { paymentFailures: failedPayments, systemErrors: errors, failedReadingRuns: failedRuns, openRefunds },
      });
    }),
  );

  // ── Payments & plans: the real list of recharge orders ───────────────────────
  router.get(
    "/payments",
    wrap(async (req, res) => {
      const { page, pageSize } = parsePage(req.query, 25, 50);
      const where: Prisma.PaymentOrderWhereInput = {};
      const status = String(req.query.status ?? "");
      if (["CREATED", "SUCCESS", "FAILED", "EXPIRED"].includes(status)) where.status = status as "SUCCESS";
      if (req.query.from || req.query.to) {
        const { from, to } = parseRange(req.query, 30);
        where.createdAt = { gte: from, lt: to };
      }
      const [total, rows, byStatus, revenue] = await Promise.all([
        prisma.paymentOrder.count({ where }),
        prisma.paymentOrder.findMany({
          where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
          select: {
            id: true, amountPaise: true, provider: true, status: true, providerPaymentId: true, createdAt: true, completedAt: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.paymentOrder.groupBy({ by: ["status"], where: { provider: "RAZORPAY" }, _count: { _all: true } }),
        prisma.paymentOrder.aggregate({ where: { provider: "RAZORPAY", status: "SUCCESS" }, _sum: { amountPaise: true } }),
      ]);
      sendResponse(res, true, {
        items: rows.map((o) => ({ ...o, providerPaymentId: o.providerPaymentId ? `…${o.providerPaymentId.slice(-6)}` : null })),
        page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)),
        summary: {
          razorpayRevenuePaise: revenue._sum.amountPaise ?? 0,
          razorpayByStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
        },
      });
    }),
  );

  return router;
}
