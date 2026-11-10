import { Router, Request, Response, NextFunction } from "express";
import { auth } from "@/middleware/authMiddleware.js";
import { requireAstrologer, type AstrologerRequest } from "@/middleware/astrologerAuth.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import prisma from "@root/prisma.js";
import * as svc from "./chat.service.js";

const wrap =
  (fn: (req: AstrologerRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AstrologerRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[chat.astrologer] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

/** Astrologer-side chat workspace API, reachable only through the same requireAstrologer
 * gate as the rest of the astrologer workspace (backend/src/modules/astrologer). */
export function createAstrologerChatRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 120 }), auth("USER"), requireAstrologer);

  router.get(
    "/sessions",
    wrap(async (req, res) => sendResponse(res, true, await svc.listAstrologerConversations(req.astrologerProfileId!))),
  );

  router.get(
    "/sessions/:id",
    wrap(async (req, res) => sendResponse(res, true, await svc.getSession(req.params.id, req.user!.id))),
  );

  router.get(
    "/sessions/:id/messages",
    wrap(async (req, res) => {
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const messages = await svc.getMessages(req.params.id, req.user!.id, cursor);
      sendResponse(res, true, messages);
    }),
  );

  router.post(
    "/sessions/:id/accept",
    wrap(async (req, res) => {
      const session = await svc.acceptSession(req.params.id, req.user!.id);
      sendResponse(res, true, session, "Chat accepted");
    }),
  );

  router.post(
    "/sessions/:id/reject",
    wrap(async (req, res) => {
      const session = await svc.rejectSession(req.params.id, req.user!.id);
      sendResponse(res, true, session, "Chat declined");
    }),
  );

  router.post(
    "/sessions/:id/end",
    wrap(async (req, res) => {
      const session = await svc.endSessionByActor(req.params.id, req.user!.id);
      sendResponse(res, true, session, "Chat ended");
    }),
  );

  router.patch(
    "/online",
    wrap(async (req, res) => {
      const isOnline = Boolean(req.body?.isOnline);
      const profile = await prisma.astrologerProfile.update({
        where: { id: req.astrologerProfileId! },
        data: { isOnline, lastSeenAt: new Date() },
        select: { id: true, isOnline: true },
      });
      sendResponse(res, true, profile, isOnline ? "You're online" : "You're offline");
    }),
  );

  return router;
}

export default createAstrologerChatRouter;
