import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { matchesDeclaredType } from "@/utils/fileSignature.js";

export const MAX_BOOK_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_MANTRA_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

const bookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BOOK_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Accepts a single PDF on the `file` field for a spiritual book. */
export const uploadBookPdf = (req: Request, res: Response, next: NextFunction) => {
  bookUpload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      const file = req.file;
      if (file && !matchesDeclaredType(file.buffer, "application/pdf")) {
        sendResponse(res, false, null, "The uploaded file is not a valid PDF", STATUS_CODES.BAD_REQUEST);
        return;
      }
      next();
      return;
    }
    let message = "Book file upload failed";
    if (error instanceof multer.MulterError) {
      message =
        error.code === "LIMIT_FILE_SIZE"
          ? `The PDF must be ${MAX_BOOK_FILE_BYTES / (1024 * 1024)} MB or smaller`
          : error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    sendResponse(res, false, null, message, STATUS_CODES.BAD_REQUEST);
  });
};

const mantraUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MANTRA_AUDIO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "audio/mpeg" && file.mimetype !== "audio/mp3") {
      cb(new Error("Only MP3 audio files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Accepts a single MP3 on the `audio` field for a mantra/chant. */
export const uploadMantraAudio = (req: Request, res: Response, next: NextFunction) => {
  mantraUpload.single("audio")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    let message = "Audio upload failed";
    if (error instanceof multer.MulterError) {
      message =
        error.code === "LIMIT_FILE_SIZE"
          ? `The audio file must be ${MAX_MANTRA_AUDIO_BYTES / (1024 * 1024)} MB or smaller`
          : error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    sendResponse(res, false, null, message, STATUS_CODES.BAD_REQUEST);
  });
};
