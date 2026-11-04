import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import * as svc from "./astrologerAdmin.service.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.astrologers] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

/**
 * Mounted inside admin.route.ts as router.use("/astrologers", createAstrologerAdminRouter())
 * — it inherits that router's `auth("ADMIN"), requireMainAdmin`, so every route here is
 * already SUPERADMIN-only before any handler runs. No auth wiring added here on purpose:
 * duplicating it would risk the two checks silently drifting apart.
 */
export function createAstrologerAdminRouter(): Router {
  const router = Router();

  router.get(
    "/overview",
    wrap(async (_req, res) => sendResponse(res, true, await svc.getOverview())),
  );

  router.get(
    "/applications",
    wrap(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
      const result = await svc.listApplications({
        status: req.query.status as any,
        specialtyKey: req.query.specialty as string | undefined,
        language: req.query.language as string | undefined,
        search: req.query.search as string | undefined,
        page,
        pageSize,
      });
      sendResponse(res, true, result);
    }),
  );

  router.get(
    "/applications/:id",
    wrap(async (req, res) => sendResponse(res, true, await svc.getApplicationDetail(req.params.id))),
  );

  router.get(
    "/applications/:id/readiness",
    wrap(async (req, res) => sendResponse(res, true, await svc.getReadiness(req.params.id))),
  );

  router.patch(
    "/applications/:id/status",
    wrap(async (req, res) => {
      const { toStatus, reason } = req.body ?? {};
      if (!toStatus) throw new ApiError("toStatus is required.", STATUS_CODES.BAD_REQUEST);
      const result = await svc.transitionStatus(req.params.id, toStatus, reason, req);
      sendResponse(res, true, result, "Status updated");
    }),
  );

  router.post(
    "/applications/:id/approve",
    wrap(async (req, res) => {
      const result = await svc.approveApplication(req.params.id, req);
      sendResponse(res, true, result, result.alreadyApproved ? "Already approved" : "Application approved");
    }),
  );

  router.post(
    "/applications/:id/reject",
    wrap(async (req, res) => {
      const result = await svc.transitionStatus(req.params.id, "REJECTED", req.body?.reason, req);
      sendResponse(res, true, result, "Application rejected");
    }),
  );

  router.post(
    "/applications/:id/suspend",
    wrap(async (req, res) => {
      const result = await svc.suspendAstrologer(req.params.id, req.body?.reason, req);
      sendResponse(res, true, result, result.alreadySuspended ? "Already suspended" : "Astrologer suspended");
    }),
  );

  router.post(
    "/applications/:id/reinstate",
    wrap(async (req, res) => {
      const result = await svc.reinstateAstrologer(req.params.id, req);
      sendResponse(res, true, result, result.alreadyReinstated ? "Already reinstated" : "Astrologer reinstated");
    }),
  );

  router.patch(
    "/applications/:id/publish",
    wrap(async (req, res) => {
      const isPublished = Boolean(req.body?.isPublished);
      const result = await svc.setPublication(req.params.id, isPublished, req);
      sendResponse(res, true, result, isPublished ? "Published" : "Unpublished");
    }),
  );

  router.post(
    "/applications/:id/notes",
    wrap(async (req, res) => {
      await svc.addNote(req.params.id, req.body?.note ?? "", req);
      sendResponse(res, true, { added: true }, "Note added", STATUS_CODES.CREATED);
    }),
  );

  router.post(
    "/applications/:id/interviews",
    wrap(async (req, res) => {
      const interview = await svc.recordInterview(req.params.id, req.body ?? {}, req);
      sendResponse(res, true, interview, "Interview recorded", STATUS_CODES.CREATED);
    }),
  );

  router.post(
    "/applications/:id/purge-documents",
    wrap(async (req, res) => {
      const retentionDays = Number(req.body?.retentionDays) > 0 ? Number(req.body.retentionDays) : 365;
      const result = await svc.purgeSupersededDocuments(req.params.id, retentionDays, req);
      sendResponse(res, true, result, `${result.purged} document(s) purged`);
    }),
  );

  router.get(
    "/documents/:documentId/signed-url",
    wrap(async (req, res) => {
      const url = await svc.getDocumentSignedUrl(req.params.documentId, req);
      sendResponse(res, true, { url, expiresInSeconds: 300 });
    }),
  );

  router.patch(
    "/documents/:documentId",
    wrap(async (req, res) => {
      const { verificationStatus, rejectionReason, reviewNotes } = req.body ?? {};
      if (!verificationStatus) throw new ApiError("verificationStatus is required.", STATUS_CODES.BAD_REQUEST);
      await svc.reviewDocument(req.params.documentId, { verificationStatus, rejectionReason, reviewNotes }, req);
      sendResponse(res, true, { reviewed: true }, "Document review recorded");
    }),
  );

  // Settings: document-scanning toggle, specialties, document requirements — all config-driven.
  router.get(
    "/settings/scanning",
    wrap(async (_req, res) => sendResponse(res, true, await svc.getScanningSetting())),
  );
  router.patch(
    "/settings/scanning",
    wrap(async (req, res) => {
      await svc.setScanningSetting(Boolean(req.body?.enabled), req);
      sendResponse(res, true, { enabled: Boolean(req.body?.enabled) }, "Scanning setting updated");
    }),
  );

  router.get(
    "/settings/specialties",
    wrap(async (_req, res) => sendResponse(res, true, await svc.listSpecialtyOptions())),
  );
  router.post(
    "/settings/specialties",
    wrap(async (req, res) => sendResponse(res, true, await svc.upsertSpecialtyOption(req.body ?? {}, req), "Specialty saved", STATUS_CODES.CREATED)),
  );

  router.get(
    "/settings/document-requirements",
    wrap(async (_req, res) => sendResponse(res, true, await svc.listDocumentRequirements())),
  );
  router.post(
    "/settings/document-requirements",
    wrap(async (req, res) => sendResponse(res, true, await svc.upsertDocumentRequirement(req.body ?? {}, req), "Document requirement saved", STATUS_CODES.CREATED)),
  );

  return router;
}

export default createAstrologerAdminRouter;
