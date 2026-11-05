import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { ALLOWED_DOCUMENT_MIME_TYPES } from "@/utils/fileSignature.js";

// Separate from middleware/upload.ts on purpose: profile-image uploads and private
// verification-document uploads must never share limits/field names/allowlists.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED = new Set(ALLOWED_DOCUMENT_MIME_TYPES);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new Error("Only PDF, JPG, JPEG and PNG files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Accepts a single file on the `document` field for astrologer verification documents. */
export const uploadSingleDocument = (req: Request, res: Response, next: NextFunction) => {
  upload.single("document")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    let message = "Document upload failed";
    if (error instanceof multer.MulterError) {
      message =
        error.code === "LIMIT_FILE_SIZE"
          ? `Document must be ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB or smaller`
          : error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    sendResponse(res, false, null, message, STATUS_CODES.BAD_REQUEST);
  });
};

export default upload;
