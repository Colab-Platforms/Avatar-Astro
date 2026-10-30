import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { auth, type AuthRequest } from "@/middleware/authMiddleware.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { FEATURES, FEATURE_KEYS, featureLabel } from "@/config/features.js";
import { EVENT_TYPES, EVENT_LABELS, PROFILE_FEATURE } from "@/config/events.js";
import { recordEvent } from "@/utils/usage.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";

const DAY_MS = 86_400_000;

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      if (err?.code === "P2021" || err?.code === "P2022") {
        console.error("[me] database migration pending:", err?.meta?.modelName ?? err.code);
        return next(new ApiError("Not available until the latest database migration has been applied.", 503));
      }
      console.error("[me] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max) : "";

const PROFILE_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phoneNo: true, gender: true,
  city: true, state: true, country: true, authProvider: true, isEmailVerified: true,
  isPhoneVerified: true, profileCompleted: true, createdAt: true,
} as const;

/**
 * Signed-in user's own dashboard data. Every query is keyed on req.user.id from
 * the verified JWT; no route accepts a user id from the client.
 */
export function createMeRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 120 }), auth("USER"));

  router.get(
    "/dashboard",
    wrap(async (req, res) => {
      const userId = req.user!.id;
      const user = await prisma.user.findFirst({
        where: { id: userId, isActive: true, isDeleted: false },
        select: { ...PROFILE_SELECT, _count: { select: { sessions: true } } },
      });
      if (!user) throw new ApiError("Account not found", STATUS_CODES.UNAUTHORIZED);

      const since = new Date(Date.now() - 30 * DAY_MS);
      const [byFeature, recent, tracked] = await Promise.all([
        prisma.usageEvent.groupBy({ by: ["feature"], where: { userId, eventType: EVENT_TYPES.featureRequest, createdAt: { gte: since }, status: "success" }, _count: { _all: true } }),
        prisma.usageEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, feature: true, status: true, eventType: true, createdAt: true } }),
        prisma.usageEvent.count({ where: { userId } }),
      ]);

      const { _count, ...profile } = user;
      sendResponse(res, true, {
        profile,
        activeSessions: _count.sessions,
        usage: { windowDays: 30, byFeature: byFeature.map((r) => ({ feature: r.feature, label: featureLabel(r.feature), count: r._count._all })) },
        recentActivity: recent.map((r) => ({ id: r.id, feature: r.feature, eventType: r.eventType, label: r.eventType === EVENT_TYPES.featureRequest ? featureLabel(r.feature) : `${EVENT_LABELS[r.eventType] ?? r.eventType}${FEATURE_KEYS.has(r.feature) ? `: ${featureLabel(r.feature)}` : ""}`, status: r.status, at: r.createdAt })),
        hasTrackedActivity: tracked > 0,
        persistence: {
          savedReports: false,
          innerVoiceHistory: false,
          bookings: false,
          note: "Readings and Inner Voice history are not stored on the server. Karma Score history, saved shlokas and guru chats stay in this browser only.",
        },
        knownFeatures: FEATURES.length,
      });
    }),
  );

  router.patch(
    "/profile",
    wrap(async (req, res) => {
      const b = req.body ?? {};
      const data: Record<string, string | null> = {};
      const fields: [string, number][] = [["firstName", 60], ["lastName", 60], ["city", 80], ["state", 80], ["country", 80], ["gender", 20]];
      for (const [k, max] of fields) {
        if (Object.prototype.hasOwnProperty.call(b, k)) data[k] = clean(b[k], max) || null;
      }
      if (Object.keys(data).length === 0) throw new ApiError("No editable fields supplied.", STATUS_CODES.BAD_REQUEST);
      if ("firstName" in data && !data.firstName) throw new ApiError("First name cannot be empty.", STATUS_CODES.BAD_REQUEST);
      const updated = await prisma.user.update({ where: { id: req.user!.id }, data, select: PROFILE_SELECT });
      recordEvent({ userId: req.user!.id, eventType: EVENT_TYPES.profileUpdated, feature: PROFILE_FEATURE, status: "success", metadata: { fields: Object.keys(data), source: "profile_page" } });
      sendResponse(res, true, updated, "Profile updated");
    }),
  );

  // The browser tells us a feature page was opened. Recorded as "opened", never as "used": opening is not completing.
  router.post(
    "/activity",
    wrap(async (req, res) => {
      const feature = typeof req.body?.feature === "string" ? req.body.feature : "";
      if (!FEATURE_KEYS.has(feature) || req.body?.event !== "opened") throw new ApiError("Unknown feature or event.", STATUS_CODES.BAD_REQUEST);
      recordEvent({ userId: req.user!.id, eventType: EVENT_TYPES.featureOpened, feature, status: "success" });
      sendResponse(res, true, { recorded: true }, "Recorded", STATUS_CODES.CREATED);
    }),
  );

  // Privacy control: delete the activity trail recorded for this account.
  router.delete(
    "/activity",
    wrap(async (req, res) => {
      const result = await prisma.usageEvent.deleteMany({ where: { userId: req.user!.id } });
      sendResponse(res, true, { deleted: result.count }, "Activity history cleared");
    }),
  );

  return router;
}
