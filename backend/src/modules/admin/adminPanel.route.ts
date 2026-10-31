import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { FEATURES, FEATURE_KEYS, featureSettingKey } from "@/config/features.js";
import { OPENROUTER_MODEL } from "@/config/aiModels.js";
import type { MainAdminRequest } from "@/middleware/mainAdmin.js";
import { invalidateAccountStatus } from "@/middleware/authMiddleware.js";
import { writeAudit } from "./audit.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { cacheSetting, getAllSettings, setSetting } from "./settings.js";
import { parseContent, parsePage, parseRange, toCsv, maskSecret, CONTENT_TYPES } from "./adminPanel.validation.js";
import { EVENT_TYPES, EVENT_LABELS, ALL_EVENT_TYPES } from "@/config/events.js";
import { createAnalyticsRouter } from "./adminAnalytics.js";
import { createCostsRouter, aiCostCsv } from "./adminCosts.js";
import { createAccountsRouter, kindWhere } from "./adminAccounts.js";

const DAY_MS = 86_400_000;
/** Known ApiErrors pass through; anything else (e.g. Prisma, with file paths and SQL) is logged and replaced. */
function publicError(err: any, scope: string): ApiError {
  if (err instanceof ApiError) return err;
  // P2021/P2022: a table or column from a not-yet-applied migration. Say so instead of a vague 500.
  const missingRelation = err?.code === "P2010" && /42P01|does not exist/i.test(String(err?.message ?? "") + String(err?.meta?.code ?? "") + String(err?.meta?.message ?? ""));
  if (err?.code === "P2021" || err?.code === "P2022" || missingRelation) {
    console.error(`[${scope}] database migration pending:`, err?.meta?.modelName ?? err?.meta?.table ?? err.code);
    return new ApiError("Not available until the latest database migration has been applied.", 503);
  }
  console.error(`[${scope}] unexpected error:`, err);
  return new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR);
}
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);
export const wrap =
  (fn: (req: MainAdminRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as MainAdminRequest, res).catch((err) => next(publicError(err, "admin")));
const notFound = (what: string) => new ApiError(`${what} not found`, STATUS_CODES.NOT_FOUND);
const bad = (m: string) => new ApiError(m, STATUS_CODES.BAD_REQUEST);

interface UsageRow {
  feature: string;
  total: bigint;
  errors: bigint;
  rejected: bigint;
  lastAt: Date | null;
}

async function usageByFeature(from: Date, to: Date): Promise<Map<string, { total: number; errors: number; rejected: number; lastAt: Date | null }>> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT feature, COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'error') AS errors,
           COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
           MAX(created_at) AS "lastAt"
    FROM usage_events WHERE event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}
    GROUP BY feature`;
  return new Map(rows.map((r) => [r.feature, { total: num(r.total), errors: num(r.errors), rejected: num(r.rejected), lastAt: r.lastAt }]));
}

async function dailyUsage(from: Date, to: Date, features?: string[]) {
  const rows = await prisma.$queryRaw<{ day: Date; feature: string; total: bigint; errors: bigint; rejected: bigint }[]>`
    SELECT date_trunc('day', created_at) AS day, feature, COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'error') AS errors,
           COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
    FROM usage_events
    WHERE event_type = 'feature.request' AND created_at >= ${from} AND created_at < ${to}
    GROUP BY 1, 2 ORDER BY 1, 2`;
  return rows
    .filter((r) => !features || features.includes(r.feature))
    .map((r) => ({ day: r.day.toISOString().slice(0, 10), feature: r.feature, total: num(r.total), errors: num(r.errors), rejected: num(r.rejected) }));
}

async function dailySignups(from: Date, to: Date) {
  const rows = await prisma.$queryRaw<{ day: Date; total: bigint }[]>`
    SELECT date_trunc('day', created_at) AS day, COUNT(*) AS total
    FROM users WHERE is_deleted = false AND created_at >= ${from} AND created_at < ${to}
    GROUP BY 1 ORDER BY 1`;
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), total: num(r.total) }));
}

const trackingSince = async () => (await prisma.usageEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }))?.createdAt ?? null;

export function createAdminPanelRouter(): Router {
  const router = Router();

  // Cheap probe the frontend uses to decide whether to show the panel.
  router.get(
    "/access",
    wrap(async (req, res) => {
      sendResponse(res, true, { mainAdmin: true, email: req.adminEmail ?? null }, "Main admin access confirmed");
    }),
  );

  // ── Overview ───────────────────────────────────────────────────────────────
  router.get(
    "/overview",
    wrap(async (req, res) => {
      const days = Math.min(90, Math.max(1, Math.floor(Number(req.query.days)) || 30));
      const to = new Date(Date.now() + 1000);
      const from = new Date(Date.now() - days * DAY_MS);
      const d7 = new Date(Date.now() - 7 * DAY_MS);
      const live = kindWhere("customer"); // the Overview counts customers only; administrators are managed separately

      const [totalUsers, activeUsers, verifiedUsers, newInWindow, new7, usage, recentErrors, recentSignups, channels, products, categories, temples, pujas, chadhawas, since, recentAudit, contentGroups, inactiveUsers] =
        await Promise.all([
          prisma.user.count({ where: live }),
          prisma.user.count({ where: { ...live, isActive: true } }),
          prisma.user.count({ where: { ...live, isEmailVerified: true } }),
          prisma.user.count({ where: { ...live, createdAt: { gte: from } } }),
          prisma.user.count({ where: { ...live, createdAt: { gte: d7 } } }),
          usageByFeature(from, to),
          prisma.usageEvent.findMany({ where: { eventType: EVENT_TYPES.featureRequest, status: "error" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, feature: true, statusCode: true, durationMs: true, createdAt: true } }),
          prisma.user.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } }),
          prisma.darshanChannel.findMany({ select: { isLive: true } }),
          prisma.shopProduct.count(),
          prisma.shopCategory.count(),
          prisma.temple.count(),
          prisma.puja.count(),
          prisma.chadhawa.count(),
          trackingSince(),
          prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, actorEmail: true, action: true, summary: true, createdAt: true } }),
          prisma.contentItem.groupBy({ by: ["type", "status"], _count: { _all: true } }),
          prisma.user.count({ where: { ...live, isActive: false } }),
        ]);

      const features = FEATURES.map((f) => ({ key: f.key, label: f.label, ...(usage.get(f.key) ?? { total: 0, errors: 0, rejected: 0, lastAt: null }) }));
      const totalRequests = features.reduce((s, f) => s + f.total, 0);
      const totalErrors = features.reduce((s, f) => s + f.errors, 0);

      sendResponse(res, true, {
        windowDays: days,
        trackingSince: since,
        users: { total: totalUsers, active: activeUsers, inactive: inactiveUsers, emailVerified: verifiedUsers, newInWindow, newLast7Days: new7 },
        recentAudit,
        content: contentGroups.map((g) => ({ type: g.type, status: g.status, count: g._count._all })),
        usage: { totalRequests, totalErrors, errorRate: totalRequests ? totalErrors / totalRequests : 0, features },
        recentErrors,
        recentSignups,
        devotion: { channels: channels.length, liveNow: channels.filter((c) => c.isLive).length, temples, pujas, chadhawas },
        commerce: { products, categories },
        notConfigured: [
          { key: "orders", label: "Orders", reason: "No order system exists in the database yet." },
          { key: "bookings", label: "Puja / darshan bookings", reason: "No booking records are stored yet." },
          { key: "payments", label: "Payments & subscriptions", reason: "No payment provider is integrated." },
        ],
      });
    }),
  );

  // ── Astrology tools / feature switches ─────────────────────────────────────
  router.get(
    "/tools",
    wrap(async (_req, res) => {
      const [settings, usage] = await Promise.all([getAllSettings(), usageByFeature(new Date(Date.now() - 30 * DAY_MS), new Date(Date.now() + 1000))]);
      sendResponse(res, true, {
        windowDays: 30,
        tools: FEATURES.map((f) => ({
          ...f,
          enabled: settings.get(featureSettingKey(f.key)) !== false,
          usage: usage.get(f.key) ?? { total: 0, errors: 0, rejected: 0, lastAt: null },
        })),
        unsupported: [
          { key: "usage-limits", label: "Per-user usage limits", reason: "Not implemented: requests are only rate-limited per IP." },
          { key: "pricing", label: "Tool pricing", reason: "Not applicable: there is no payment system, so tools have no price." },
        ],
      });
    }),
  );

  router.put(
    "/tools/:key",
    wrap(async (req, res) => {
      const key = req.params.key;
      if (!FEATURE_KEYS.has(key)) throw notFound("Feature");
      if (typeof req.body?.enabled !== "boolean") throw bad("enabled (true/false) is required.");
      const enabled: boolean = req.body.enabled;
      await prisma.$transaction(async (tx) => {
        await setSetting(featureSettingKey(key), enabled, req.user!.id, tx);
        await writeAudit(req, { action: "feature.toggle", entityType: "feature", entityId: key, summary: `${enabled ? "Enabled" : "Disabled"} feature ${key}` }, tx);
      });
      cacheSetting(featureSettingKey(key), enabled);
      sendResponse(res, true, { key, enabled }, "Feature updated");
    }),
  );

  // ── Inner Voice ────────────────────────────────────────────────────────────
  router.get(
    "/inner-voice",
    wrap(async (_req, res) => {
      const keys = FEATURES.filter((f) => f.group === "inner-voice").map((f) => f.key);
      const from = new Date(Date.now() - 14 * DAY_MS);
      const to = new Date(Date.now() + 1000);
      const [settings, usage, daily, errors] = await Promise.all([
        getAllSettings(),
        usageByFeature(from, to),
        dailyUsage(from, to, keys),
        prisma.usageEvent.findMany({ where: { eventType: EVENT_TYPES.featureRequest, feature: { in: keys }, status: "error" }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, feature: true, statusCode: true, durationMs: true, createdAt: true } }),
      ]);
      sendResponse(res, true, {
        windowDays: 14,
        trackingSince: await trackingSince(),
        features: FEATURES.filter((f) => f.group === "inner-voice").map((f) => ({ ...f, enabled: settings.get(featureSettingKey(f.key)) !== false, usage: usage.get(f.key) ?? { total: 0, errors: 0, rejected: 0, lastAt: null } })),
        daily,
        errors,
        providers: [
          { id: "groq", name: "Groq", configured: !!process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || null },
          { id: "openrouter", name: "OpenRouter", configured: !!process.env.OPENROUTER_API_KEY, model: OPENROUTER_MODEL },
          { id: "sarvam", name: "Sarvam (voice)", configured: !!process.env.SARVAM_API_KEY, model: null },
        ],
        browserOnly: "Karma Score history, saved shlokas and AI Guru conversations are stored in each user's own browser. They are not on the server, so they cannot be shown or exported here.",
      });
    }),
  );

  // ── Devotion & Live ────────────────────────────────────────────────────────
  router.get(
    "/devotion",
    wrap(async (_req, res) => {
      const [channels, temples, pujas, chadhawas] = await Promise.all([
        prisma.darshanChannel.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, isLive: true, lastCheckedAt: true, currentLiveVideoId: true } }),
        prisma.temple.count(),
        prisma.puja.count(),
        prisma.chadhawa.count(),
      ]);
      sendResponse(res, true, {
        channels,
        catalog: { temples, pujas, chadhawas },
        youtubeConfigured: !!process.env.YOUTUBE_API_KEY,
        bookings: { configured: false, reason: "No booking records are stored. Pujas and chadhawas are a catalogue only." },
        manage: [
          { label: "Puja catalogue", path: "/admin/puja" },
          { label: "Chadhawa offerings", path: "/admin/chadhawa" },
        ],
      });
    }),
  );

  // ── Shop & orders ──────────────────────────────────────────────────────────
  router.get(
    "/shop-summary",
    wrap(async (_req, res) => {
      const [products, activeProducts, categories] = await Promise.all([prisma.shopProduct.count(), prisma.shopProduct.count({ where: { isActive: true } }), prisma.shopCategory.count()]);
      sendResponse(res, true, {
        catalog: { products, activeProducts, categories },
        orders: { configured: false, reason: "There is no checkout or orders table yet, so no order data exists to show." },
        manage: [
          { label: "Categories", path: "/admin/shop/categories" },
          { label: "Products", path: "/admin/shop/products" },
        ],
      });
    }),
  );

  // ── Payments & plans ───────────────────────────────────────────────────────
  router.get(
    "/payments",
    wrap(async (_req, res) => {
      sendResponse(res, true, {
        configured: false,
        reason: "No payment provider or subscription plans are integrated. Nothing is simulated here.",
      });
    }),
  );

  // ── Content & banners ──────────────────────────────────────────────────────
  router.get(
    "/content",
    wrap(async (req, res) => {
      const where: any = {};
      if (CONTENT_TYPES.includes(req.query.type as any)) where.type = req.query.type;
      if (req.query.status === "DRAFT" || req.query.status === "PUBLISHED") where.status = req.query.status;
      const items = await prisma.contentItem.findMany({ where, orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }], take: 500 });
      sendResponse(res, true, { items });
    }),
  );

  router.post(
    "/content",
    wrap(async (req, res) => {
      const input = parseContent(req.body, "create");
      const published = input.status === "PUBLISHED";
      const item = await prisma.$transaction(async (tx) => {
        const created = await tx.contentItem.create({
          data: { ...(input as any), createdBy: req.user!.id, publishedAt: published ? new Date() : null },
        });
        await writeAudit(req, { action: "content.create", entityType: "content", entityId: created.id, summary: `Created ${created.type} "${created.title}" (${created.status})` }, tx);
        return created;
      });
      sendResponse(res, true, item, "Content created", STATUS_CODES.CREATED);
    }),
  );

  router.put(
    "/content/:id",
    wrap(async (req, res) => {
      const existing = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound("Content");
      const input = parseContent(req.body, "update");
      const data: any = { ...input };
      if (input.status === "PUBLISHED" && existing.status !== "PUBLISHED") data.publishedAt = new Date();
      if (input.status === "DRAFT") data.publishedAt = null;
      const startsAt = "startsAt" in input ? input.startsAt : existing.startsAt;
      const endsAt = "endsAt" in input ? input.endsAt : existing.endsAt;
      if (startsAt && endsAt && endsAt <= startsAt) throw bad("endsAt must be after startsAt.");
      if ((input.type ?? existing.type) === "FAQ" && "body" in input && !input.body) throw bad("An FAQ needs an answer in the body.");
      const statusChanged = input.status && input.status !== existing.status;
      const item = await prisma.$transaction(async (tx) => {
        const updated = await tx.contentItem.update({ where: { id: existing.id }, data });
        await writeAudit(req, {
          action: statusChanged ? (input.status === "PUBLISHED" ? "content.publish" : "content.unpublish") : "content.update",
          entityType: "content",
          entityId: updated.id,
          summary: `${statusChanged ? (input.status === "PUBLISHED" ? "Published" : "Unpublished") : "Updated"} ${updated.type} "${updated.title}"`,
        }, tx);
        return updated;
      });
      sendResponse(res, true, item, "Content updated");
    }),
  );

  router.delete(
    "/content/:id",
    wrap(async (req, res) => {
      const existing = await prisma.contentItem.findUnique({ where: { id: req.params.id } });
      if (!existing) throw notFound("Content");
      await prisma.$transaction(async (tx) => {
        await tx.contentItem.delete({ where: { id: existing.id } });
        await writeAudit(req, { action: "content.delete", entityType: "content", entityId: existing.id, summary: `Deleted ${existing.type} "${existing.title}"` }, tx);
      });
      sendResponse(res, true, { id: existing.id }, "Content deleted");
    }),
  );

  // ── AI & integrations ──────────────────────────────────────────────────────
  router.get(
    "/integrations",
    wrap(async (_req, res) => {
      const t0 = Date.now();
      let db: { ok: boolean; latencyMs: number | null; error?: string } = { ok: false, latencyMs: null };
      try {
        await prisma.$queryRaw`SELECT 1`;
        db = { ok: true, latencyMs: Date.now() - t0 };
      } catch (e: any) {
        db = { ok: false, latencyMs: null, error: "Database query failed" };
      }
      const usage = await usageByFeature(new Date(Date.now() - 30 * DAY_MS), new Date(Date.now() + 1000));
      const providerUsage = (provider: string) => {
        const keys = FEATURES.filter((f) => f.provider === provider).map((f) => f.key);
        return keys.reduce((a, k) => { const u = usage.get(k); return { requests: a.requests + (u?.total ?? 0), errors: a.errors + (u?.errors ?? 0) }; }, { requests: 0, errors: 0 });
      };
      // The last REAL outcome per provider (from recorded feature requests). A configured key is not proof it works.
      const lastOutcome = async (provider: string) => {
        const keys = FEATURES.filter((f) => f.provider === provider).map((f) => f.key);
        if (!keys.length) return { lastSuccessAt: null, lastFailureAt: null };
        const [ok, bad] = await Promise.all([
          prisma.usageEvent.findFirst({ where: { eventType: EVENT_TYPES.featureRequest, feature: { in: keys }, status: "success" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
          prisma.usageEvent.findFirst({ where: { eventType: EVENT_TYPES.featureRequest, feature: { in: keys }, status: "error" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        ]);
        return { lastSuccessAt: ok?.createdAt ?? null, lastFailureAt: bad?.createdAt ?? null };
      };
      const [oOpenrouter, oGroq, oSarvam] = await Promise.all([lastOutcome("openrouter"), lastOutcome("groq"), lastOutcome("sarvam")]);
      const dbHost = (() => {
        try {
          const h = new URL(process.env.DATABASE_URL ?? "").hostname.toLowerCase();
          const local = h === "localhost" || h === "127.0.0.1" || h === "::1";
          const kind = local ? "local" : /neon\.tech$/.test(h) ? "Neon (remote)" : "remote";
          return { kind, host: local ? h : `${h.slice(0, 6)}…${h.split(".").slice(-2).join(".")}` };
        } catch { return { kind: "unknown", host: null }; }
      })();
      const secret = (envName: string) => ({ configured: !!process.env[envName], masked: maskSecret(process.env[envName]) });
      sendResponse(res, true, {
        windowDays: 30,
        database: { name: "PostgreSQL", ...db, ...dbHost },
        providers: [
          { id: "openrouter", name: "OpenRouter (Tarot, horoscope, chart interpretation, birth chart, compatibility, name analysis, Inner Voice, palm)", model: OPENROUTER_MODEL, envVar: "OPENROUTER_API_KEY", ...secret("OPENROUTER_API_KEY"), usage: providerUsage("openrouter"), ...oOpenrouter },
          { id: "groq", name: "Groq (Karma, AI Guru, Sacred Shloka, gemstone wording)", model: process.env.GROQ_MODEL || null, envVar: "GROQ_API_KEY", ...secret("GROQ_API_KEY"), usage: providerUsage("groq"), ...oGroq },
          { id: "sarvam", name: "Sarvam (voice)", model: null, envVar: "SARVAM_API_KEY", ...secret("SARVAM_API_KEY"), usage: providerUsage("sarvam"), ...oSarvam },
          { id: "resend", name: "Resend (email: inquiries, OTP)", model: null, envVar: "RESEND_API_KEY", issues: process.env.RESEND_API_KEY && !process.env.SMTP_FROM_EMAIL ? ["SMTP_FROM_EMAIL is not set, so no email can be sent"] : [], ...secret("RESEND_API_KEY"), detail: { fromEmail: process.env.SMTP_FROM_EMAIL || null, supportEmail: process.env.SUPPORT_EMAIL || null }, usage: null },
          { id: "youtube", name: "YouTube Data API (Live Darshan)", model: null, envVar: "YOUTUBE_API_KEY", ...secret("YOUTUBE_API_KEY"), usage: null, issues: process.env.YOUTUBE_API_KEY && !process.env.BACKEND_PUBLIC_URL ? ["BACKEND_PUBLIC_URL is not set, so live-status pushes cannot reach this server"] : [] },
          { id: "cloudinary", name: "Cloudinary (images)", model: null, configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET), masked: null, usage: null },
          { id: "google-oauth", name: "Google sign-in", model: null, envVar: "GOOGLE_CLIENT_ID", configured: !!process.env.GOOGLE_CLIENT_ID, masked: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 6)}…apps.googleusercontent.com` : null, usage: null, issues: [] },
          { id: "msg91", name: "MSG91 (phone OTP)", model: null, configured: !!(process.env.MSG91_AUTH_KEY || process.env.MSG91_WIDGET_ID), masked: null, usage: null },
        ],
        security: {
          jwtSecretConfigured: !!process.env.JWT_SECRET,
          jwtSecretStrong: (process.env.JWT_SECRET?.length ?? 0) >= 32,
          mainAdminEmailPinned: !!process.env.MAIN_ADMIN_EMAIL,
        },
        note: "This shows the configuration of THIS backend process only (the variables it was started with). Keys are never sent to the browser; 'masked' shows only the last 4 characters of long keys. 'Configured' is not proof the provider works: the last real success and failure come from recorded requests. No test calls are made from here.",
      });
    }),
  );

  // ── Reports ────────────────────────────────────────────────────────────────
  router.get(
    "/reports/summary",
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const [daily, signups, byFeature, since] = await Promise.all([dailyUsage(from, to), dailySignups(from, to), usageByFeature(from, to), trackingSince()]);
      sendResponse(res, true, {
        from: from.toISOString().slice(0, 10),
        to: new Date(to.getTime() - DAY_MS).toISOString().slice(0, 10),
        trackingSince: since,
        daily,
        signups,
        byFeature: FEATURES.map((f) => ({ key: f.key, label: f.label, ...(byFeature.get(f.key) ?? { total: 0, errors: 0, rejected: 0, lastAt: null }) })),
      });
    }),
  );

  // CSV exports read up to 20k rows: keep them from being hammered.
  router.get(
    "/reports/export",
    createRateLimiter({ windowMs: 60_000, max: 10, message: "Too many exports. Please wait a minute." }),
    wrap(async (req, res) => {
      const { from, to } = parseRange(req.query);
      const kind = String(req.query.kind ?? "");
      const stamp = `${from.toISOString().slice(0, 10)}_${new Date(to.getTime() - DAY_MS).toISOString().slice(0, 10)}`;
      let csv: string;
      const featureFilter = typeof req.query.feature === "string" && FEATURE_KEYS.has(req.query.feature) ? req.query.feature : undefined;
      if (kind === "usage") {
        const rows = (await dailyUsage(from, to)).filter((r) => !featureFilter || r.feature === featureFilter);
        csv = toCsv(["date", "feature", "requests", "errors", "rejected"], rows.map((r) => [r.day, r.feature, r.total, r.errors, r.rejected]));
      } else if (kind === "activity") {
        // Raw customer activity (no message content exists to leak); ids only, capped.
        const where: any = { createdAt: { gte: from, lt: to } };
        if (featureFilter) where.feature = featureFilter;
        if (typeof req.query.eventType === "string" && ALL_EVENT_TYPES.includes(req.query.eventType)) where.eventType = req.query.eventType;
        if (req.query.status === "success" || req.query.status === "error" || req.query.status === "rejected" || req.query.status === "failed") where.status = req.query.status;
        const rows = await prisma.usageEvent.findMany({ where, orderBy: { createdAt: "asc" }, take: 20000 });
        csv = toCsv(["time_utc", "user_id", "event_type", "feature", "status", "status_code", "duration_ms"], rows.map((r) => [r.createdAt, r.userId, r.eventType, r.feature, r.status, r.statusCode, r.durationMs]));
      } else if (kind === "signups") {
        const signupWhere: any = { isDeleted: false, createdAt: { gte: from, lt: to } };
        if (req.query.provider === "LOCAL" || req.query.provider === "GOOGLE") signupWhere.authProvider = req.query.provider;
        const rowsAll = await prisma.user.groupBy({ by: ["createdAt"], where: signupWhere, _count: { _all: true } });
        const perDay = new Map<string, number>();
        for (const r of rowsAll) { const d = r.createdAt.toISOString().slice(0, 10); perDay.set(d, (perDay.get(d) ?? 0) + r._count._all); }
        const rows = [...perDay.entries()].sort().map(([day, total]) => ({ day, total }));
        csv = toCsv(["date", "new_users"], rows.map((r) => [r.day, r.total]));
      } else if (kind === "costs") {
        csv = await aiCostCsv(from, to, featureFilter);
      } else if (kind === "audit") {
        const rows = await prisma.adminAuditLog.findMany({ where: { createdAt: { gte: from, lt: to } }, orderBy: { createdAt: "asc" }, take: 20000 });
        csv = toCsv(["time_utc", "actor", "action", "entity_type", "entity_id", "summary"], rows.map((r) => [r.createdAt, r.actorEmail, r.action, r.entityType, r.entityId, r.summary]));
      } else {
        throw bad("kind must be usage, signups, activity, costs or audit.");
      }
      await writeAudit(req, { action: "report.export", entityType: "report", entityId: kind, summary: `Exported ${kind} report ${stamp}` });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mybhagya-${kind}-${stamp}.csv"`);
      res.status(200).send("﻿" + csv);
    }),
  );

  // ── Settings & audit log ───────────────────────────────────────────────────
  router.get(
    "/settings",
    wrap(async (_req, res) => {
      const rows = await prisma.platformSetting.findMany({ orderBy: { key: "asc" } });
      sendResponse(res, true, {
        settings: rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt, updatedBy: r.updatedBy })),
        environment: process.env.NODE_ENV || "development",
        note: "Feature switches are managed under Astrology Tools. Only allow-listed settings can be changed from the panel.",
      });
    }),
  );

  router.get(
    "/audit-logs",
    wrap(async (req, res) => {
      const { page, pageSize } = parsePage(req.query, 25, 100);
      const action = typeof req.query.action === "string" && req.query.action ? req.query.action.slice(0, 60) : undefined;
      const prefix = typeof req.query.actionPrefix === "string" && /^[a-z_.]{1,30}$/.test(req.query.actionPrefix) ? req.query.actionPrefix : undefined;
      const where: any = { ...(action ? { action } : {}), ...(!action && prefix ? { action: { startsWith: prefix } } : {}) };
      const [total, items] = await Promise.all([
        prisma.adminAuditLog.count({ where }),
        prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      sendResponse(res, true, { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
    }),
  );

  router.use(createAccountsRouter());
  router.use(createAnalyticsRouter());
  router.use(createCostsRouter());

  return router;
}
