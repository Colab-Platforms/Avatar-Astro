import { Router, Request, Response, NextFunction } from "express";
import { auth, type AuthRequest } from "@/middleware/authMiddleware.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { uploadSingleImage } from "@/middleware/upload.js";
import { uploadSingleDocument } from "@/middleware/documentUpload.js";
import { uploadImageBufferWithRetry, deleteImageByPublicId, uploadPrivateDocumentBuffer, deletePrivateDocument } from "@/config/cloudinary.js";
import { matchesDeclaredType } from "@/utils/fileSignature.js";
import { isDocumentScanningEnabled, scanBuffer } from "@/services/malwareScan.js";
import { writeAudit } from "@/modules/admin/audit.js";
import * as svc from "./astrologer.service.js";

const PROFILE_PHOTO_FOLDER = "astrologers/profile-photos";
const DOCUMENT_FOLDER = "astrologers/verification-documents";

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[astrologer] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

export function createAstrologerRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 60 }), auth("USER"));

  router.get(
    "/config",
    wrap(async (_req, res) => sendResponse(res, true, await svc.getPublicConfig())),
  );

  router.get(
    "/application",
    wrap(async (req, res) => {
      const app = await svc.getLatestApplicationForUser(req.user!.id);
      sendResponse(res, true, app ? svc.toApplicantSafe(app) : null);
    }),
  );

  router.post(
    "/application",
    wrap(async (req, res) => {
      const app = await svc.startOrContinueDraft(req.user!.id);
      sendResponse(res, true, svc.toApplicantSafe(app), "Application ready", STATUS_CODES.CREATED);
    }),
  );

  router.patch(
    "/application",
    wrap(async (req, res) => {
      const app = await svc.updateDraftFields(req.user!.id, req.body ?? {});
      sendResponse(res, true, svc.toApplicantSafe(app), "Application updated");
    }),
  );

  router.put(
    "/application/specialties",
    wrap(async (req, res) => {
      const items = Array.isArray(req.body?.specialties) ? req.body.specialties : [];
      const app = await svc.setSpecialties(req.user!.id, items);
      sendResponse(res, true, svc.toApplicantSafe(app), "Specialties updated");
    }),
  );

  router.post(
    "/application/agreements",
    wrap(async (req, res) => {
      const items = Array.isArray(req.body?.agreements) ? req.body.agreements : [];
      await svc.acceptAgreements(req.user!.id, items, req.ip ?? null);
      sendResponse(res, true, { accepted: true }, "Agreements recorded");
    }),
  );

  router.post(
    "/application/photo",
    uploadSingleImage,
    wrap(async (req, res) => {
      const file = (req as Request & { file?: { buffer: Buffer } }).file;
      if (!file) throw new ApiError("Select a profile photograph to upload", STATUS_CODES.BAD_REQUEST);
      const uploaded = await uploadImageBufferWithRetry(file.buffer, PROFILE_PHOTO_FOLDER);
      try {
        await svc.setProfilePhoto(req.user!.id, uploaded.url, uploaded.publicId);
      } catch (err) {
        void deleteImageByPublicId(uploaded.publicId).catch((e) => console.error("[astrologer] cleanup failed for orphaned photo:", uploaded.publicId, e));
        throw err;
      }
      sendResponse(res, true, { profilePhotoUrl: uploaded.url }, "Profile photograph updated");
    }),
  );

  router.delete(
    "/application/photo",
    wrap(async (req, res) => {
      const app = await svc.getLatestApplicationForUser(req.user!.id);
      const publicId = (app as any)?.profilePhotoPublicId as string | null | undefined;
      await svc.setProfilePhoto(req.user!.id, null, null);
      if (publicId) void deleteImageByPublicId(publicId).catch((e) => console.error("[astrologer] failed to remove profile photo:", e));
      sendResponse(res, true, { removed: true }, "Profile photograph removed");
    }),
  );

  router.post(
    "/application/documents",
    uploadSingleDocument,
    wrap(async (req, res) => {
      const file = (req as Request & { file?: { buffer: Buffer; mimetype: string; originalname: string; size: number } }).file;
      if (!file) throw new ApiError("Select a document to upload", STATUS_CODES.BAD_REQUEST);
      const requirementId = typeof req.body?.requirementId === "string" && req.body.requirementId ? req.body.requirementId : null;

      if (!matchesDeclaredType(file.buffer, file.mimetype)) {
        throw new ApiError("The file's content does not match its declared type.", STATUS_CODES.BAD_REQUEST);
      }

      const app = await svc.getLatestApplicationForUser(req.user!.id);
      if (!app) throw new ApiError("No astrologer application found. Start one first.", STATUS_CODES.NOT_FOUND);

      const previous = await svc.assertDocumentReplaceable(app.id, app.status, requirementId);

      let scanStatus: "CLEAN" | "SKIPPED";
      const scanningEnabled = await isDocumentScanningEnabled();
      if (scanningEnabled) {
        const result = await scanBuffer(file.buffer);
        if (result.status === "INFECTED") {
          void writeAudit(req, { action: "astrologer.document.infected_upload_blocked", entityType: "AstrologerApplication", entityId: app.id, summary: "An uploaded document was blocked after testing positive for malware.", metadata: { detail: result.detail } }).catch(() => {});
          throw new ApiError("This file was rejected by security scanning and was not stored.", STATUS_CODES.BAD_REQUEST);
        }
        if (result.status === "SCAN_FAILED") {
          throw new ApiError("Document scanning is temporarily unavailable. Please try again shortly.", STATUS_CODES.SERVER_ERROR);
        }
        scanStatus = "CLEAN";
      } else {
        scanStatus = "SKIPPED";
      }

      const uploaded = await uploadPrivateDocumentBuffer(file.buffer, DOCUMENT_FOLDER, file.mimetype);
      let saved;
      try {
        saved = await svc.recordDocumentUpload({
          applicationId: app.id,
          requirementId,
          previousCurrentId: previous?.id ?? null,
          fileName: file.originalname.slice(0, 200),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePublicId: uploaded.publicId,
          storageResourceType: uploaded.resourceType,
          scanStatus,
        });
      } catch (err) {
        void deletePrivateDocument(uploaded.publicId, uploaded.resourceType).catch((e) => console.error("[astrologer] cleanup failed for orphaned document:", uploaded.publicId, e));
        throw err;
      }
      sendResponse(
        res,
        true,
        { id: saved.id, requirementId: saved.requirementId, fileName: saved.fileName, version: saved.version, verificationStatus: saved.verificationStatus },
        "Document uploaded",
        STATUS_CODES.CREATED,
      );
    }),
  );

  router.post(
    "/application/submit",
    wrap(async (req, res) => {
      const app = await svc.submitApplication(req.user!.id);
      sendResponse(res, true, { status: app.status, submittedAt: app.submittedAt }, "Application submitted");
    }),
  );

  router.post(
    "/application/withdraw",
    wrap(async (req, res) => {
      const app = await svc.withdrawApplication(req.user!.id);
      sendResponse(res, true, { status: app.status }, "Application withdrawn");
    }),
  );

  return router;
}

export default createAstrologerRouter;
