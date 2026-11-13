import { Router, Request, Response, NextFunction } from "express";
import { auth, type AuthRequest } from "@/middleware/authMiddleware.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import * as svc from "./chat.service.js";

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[chat] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

/** User-side chat API: starting/resuming a session, sending messages via REST history
 * (live delivery happens over Socket.IO — see realtime/socketServer.ts), and ending a chat. */
export function createChatRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 120 }), auth("USER"));

  router.get(
    "/eligibility/:astrologerProfileId",
    wrap(async (req, res) => sendResponse(res, true, await svc.getEligibility(req.user!.id, req.params.astrologerProfileId))),
  );

  router.post(
    "/sessions",
    wrap(async (req, res) => {
      const astrologerProfileId = String(req.body?.astrologerProfileId ?? "");
      if (!astrologerProfileId) throw new ApiError("astrologerProfileId is required", STATUS_CODES.BAD_REQUEST);
      const session = await svc.startSession(req.user!.id, astrologerProfileId);
      sendResponse(res, true, session, "Chat session ready", STATUS_CODES.CREATED);
    }),
  );

  router.get(
    "/sessions",
    wrap(async (req, res) => sendResponse(res, true, await svc.listUserConversations(req.user!.id))),
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
    "/sessions/:id/cancel",
    wrap(async (req, res) => {
      const session = await svc.cancelSession(req.params.id, req.user!.id);
      sendResponse(res, true, session, "Chat request cancelled");
    }),
  );

  router.post(
    "/sessions/:id/end",
    wrap(async (req, res) => {
      const session = await svc.endSessionByActor(req.params.id, req.user!.id);
      sendResponse(res, true, session, "Chat ended");
    }),
  );

  return router;
}

export default createChatRouter;
