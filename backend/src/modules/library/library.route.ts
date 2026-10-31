import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import type { AuthRequest } from "@/middleware/authMiddleware.js";
import {
  clearPersonalActivity, deleteConversation, deleteReading, getConversation, getReading, listConversations, listReadings, overview,
  setReadingSaved, timeline,
} from "./library.service.js";

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      if (err?.code === "P2021" || err?.code === "P2022") {
        console.error("[library] database migration pending:", err?.meta?.modelName ?? err.code);
        return next(new ApiError("Not available until the latest database migration has been applied.", 503));
      }
      console.error("[library] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

const ID = /^[a-z0-9]{12,40}$/i;
const notFound = (what: string) => new ApiError(`${what} not found`, STATUS_CODES.NOT_FOUND);
/** Someone else's id and a missing id are indistinguishable: both are "not found". */
const idOf = (req: Request, what: string) => {
  const id = String(req.params.id ?? "");
  if (!ID.test(id)) throw notFound(what);
  return id;
};

/**
 * The signed-in user's personal library. Mounted inside the /api/me router, which already enforces auth("USER").
 * Every call is scoped by the verified user id; no route accepts a user id from the client.
 */
export function createLibraryRouter(): Router {
  const router = Router();

  router.get("/overview", wrap(async (req, res) => sendResponse(res, true, await overview(req.user!.id))));

  router.get("/readings", wrap(async (req, res) => sendResponse(res, true, await listReadings(req.user!.id, req.query))));
  router.get("/readings/:id", wrap(async (req, res) => {
    const r = await getReading(req.user!.id, idOf(req, "Reading"));
    if (!r) throw notFound("Reading");
    sendResponse(res, true, r);
  }));
  router.post("/readings/:id/save", wrap(async (req, res) => {
    const saved = (req.body as any)?.saved;
    if (typeof saved !== "boolean") throw new ApiError("saved must be true or false.", STATUS_CODES.BAD_REQUEST);
    const r = await setReadingSaved(req.user!.id, idOf(req, "Reading"), saved);
    if (!r) throw notFound("Reading");
    sendResponse(res, true, r, saved ? "Saved" : "Removed from saved");
  }));
  router.delete("/readings/:id", wrap(async (req, res) => {
    if (!(await deleteReading(req.user!.id, idOf(req, "Reading")))) throw notFound("Reading");
    sendResponse(res, true, { deleted: true }, "Reading deleted");
  }));

  router.get("/conversations", wrap(async (req, res) => sendResponse(res, true, await listConversations(req.user!.id, req.query))));
  router.get("/conversations/:id", wrap(async (req, res) => {
    const c = await getConversation(req.user!.id, idOf(req, "Conversation"));
    if (!c) throw notFound("Conversation");
    sendResponse(res, true, c);
  }));
  router.delete("/conversations/:id", wrap(async (req, res) => {
    if (!(await deleteConversation(req.user!.id, idOf(req, "Conversation")))) throw notFound("Conversation");
    sendResponse(res, true, { deleted: true }, "Conversation deleted");
  }));

  router.get("/activity", wrap(async (req, res) => sendResponse(res, true, await timeline(req.user!.id, req.query))));

  // There is no booking or checkout system in this application (no tables, no payment provider), so there is nothing to list.
  // These answer honestly instead of showing invented records.
  router.get("/bookings", wrap(async (_req, res) => sendResponse(res, true, { configured: false, items: [], reason: "Puja and Darshan bookings are not part of the site yet: no booking records exist." })));
  router.get("/orders", wrap(async (_req, res) => sendResponse(res, true, { configured: false, items: [], reason: "The shop is a catalogue only: there is no checkout, so no orders exist." })));

  return router;
}

export { clearPersonalActivity };
