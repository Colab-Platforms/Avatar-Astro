import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import type { AuthRequest } from "@/middleware/authMiddleware.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { SOURCE_LIST } from "@/config/rewards.js";
import { completeHoroscope, getBalance, horoscopeSummary, karmaSummary, listTransactions, recordKarmaPractices, totalsBySource, type Db } from "./points.service.js";

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      if (err?.code === "P2021" || err?.code === "P2022") {
        console.error("[points] database migration pending:", err?.meta?.modelName ?? err.code);
        return next(new ApiError("Not available until the latest database migration has been applied.", 503));
      }
      console.error("[points] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

/**
 * Shared Reward Points ledger, Daily Horoscope streak and Karma practice rewards. Mounted under /api/me, so the router-level
 * auth("USER") applies; every query is keyed on req.user.id from the verified token and no route takes a user id or a point amount.
 */
export function createPointsRouter(db: Db = prisma as unknown as Db): Router {
  const router = Router();
  const complete = createRateLimiter({ windowMs: 60_000, max: 20 });

  // Reward Points (the shared points ledger; the paid Coins Wallet lives elsewhere, at /api/wallet)
  router.get("/rewards", wrap(async (req, res) => {
    const id = req.user!.id;
    const [balance, bySource] = await Promise.all([getBalance(db, id), totalsBySource(db, id)]);
    sendResponse(res, true, { balance, bySource, knownSources: SOURCE_LIST }, "OK");
  }));
  router.get("/rewards/transactions", wrap(async (req, res) => {
    sendResponse(res, true, await listTransactions(db, req.user!.id, Number(req.query.page), Number(req.query.pageSize)), "OK");
  }));
  router.get("/rewards/totals", wrap(async (req, res) => {
    sendResponse(res, true, { bySource: await totalsBySource(db, req.user!.id) }, "OK");
  }));

  // Daily Horoscope
  router.get("/horoscope/streak", wrap(async (req, res) => {
    sendResponse(res, true, await horoscopeSummary(db, req.user!.id), "OK");
  }));
  router.post("/horoscope/complete", complete, wrap(async (req, res) => {
    const out = await completeHoroscope(db, req.user!.id, { sign: req.body?.sign, steps: req.body?.steps, horoscopeDate: req.body?.horoscopeDate });
    sendResponse(res, true, out, out.alreadyCompleted ? "Already completed today" : "Completed", out.alreadyCompleted ? STATUS_CODES.OK : STATUS_CODES.CREATED);
  }));

  // Karma Sankhya
  router.get("/karma/summary", wrap(async (req, res) => {
    sendResponse(res, true, await karmaSummary(db, req.user!.id), "OK");
  }));
  router.post("/karma/practices", complete, wrap(async (req, res) => {
    sendResponse(res, true, await recordKarmaPractices(db, req.user!.id, req.body?.practices), "OK");
  }));

  return router;
}
