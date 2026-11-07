import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import DevotionLibraryService from "./devotionLibrary.service.js";
import type { UploadFile } from "./devotionLibrary.types.js";
import {
  validateCreateBookSchema,
  validateCreateMantraSchema,
  validateListSchema,
  validateUpdateBookSchema,
  validateUpdateMantraSchema,
} from "./devotionLibrary.validators.js";

const service = new DevotionLibraryService();

const fail = (res: Response, error: any) =>
  sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);

// ── Books (admin) ───────────────────────────────────────────────────────────

export const listBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateListSchema(req.query);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.listBooks(value);
    sendResponse(res, true, data, "Books loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const getBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.getBookById(req.params.id);
    sendResponse(res, true, data, "Book loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const createBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateCreateBookSchema(req.body);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.createBook(value);
    sendResponse(res, true, data, "Book created successfully", STATUS_CODES.CREATED);
  } catch (error: any) {
    fail(res, error);
  }
};

export const updateBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateUpdateBookSchema(req.body);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.updateBook(req.params.id, value);
    sendResponse(res, true, data, "Book updated successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.deleteBook(req.params.id);
    sendResponse(res, true, null, "Book deleted successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const setBookFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as UploadFile | undefined;
    if (!file) return void sendResponse(res, false, null, "Select a PDF to upload", STATUS_CODES.BAD_REQUEST);

    const data = await service.setBookFile(req.params.id, file);
    sendResponse(res, true, data, "Book file uploaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const setBookCover = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as UploadFile | undefined;
    if (!file) return void sendResponse(res, false, null, "Select a cover image to upload", STATUS_CODES.BAD_REQUEST);

    const data = await service.setBookCover(req.params.id, file);
    sendResponse(res, true, data, "Cover image uploaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

// ── Mantras & Chants (admin) ─────────────────────────────────────────────────

export const listMantras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateListSchema(req.query);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.listMantras(value);
    sendResponse(res, true, data, "Mantras loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const getMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.getMantraById(req.params.id);
    sendResponse(res, true, data, "Mantra loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const createMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateCreateMantraSchema(req.body);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.createMantra(value);
    sendResponse(res, true, data, "Mantra created successfully", STATUS_CODES.CREATED);
  } catch (error: any) {
    fail(res, error);
  }
};

export const updateMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateUpdateMantraSchema(req.body);
    if (error) return void sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);

    const data = await service.updateMantra(req.params.id, value);
    sendResponse(res, true, data, "Mantra updated successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const deleteMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.deleteMantra(req.params.id);
    sendResponse(res, true, null, "Mantra deleted successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const setMantraAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as UploadFile | undefined;
    if (!file) return void sendResponse(res, false, null, "Select an audio file to upload", STATUS_CODES.BAD_REQUEST);

    const data = await service.setMantraAudio(req.params.id, file);
    sendResponse(res, true, data, "Audio uploaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const setMantraCover = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as UploadFile | undefined;
    if (!file) return void sendResponse(res, false, null, "Select a cover image to upload", STATUS_CODES.BAD_REQUEST);

    const data = await service.setMantraCover(req.params.id, file);
    sendResponse(res, true, data, "Cover image uploaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

// ── Stats (admin) ────────────────────────────────────────────────────────────

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.getStats();
    sendResponse(res, true, data, "Stats loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

// ── Public (unauthenticated) ──────────────────────────────────────────────────

export const listPublicBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.listPublicBooks();
    sendResponse(res, true, data, "Books loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const getPublicBookBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.getPublicBookBySlug(req.params.slug);
    sendResponse(res, true, data, "Book loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const downloadBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileUrl = await service.registerBookDownload(req.params.id);
    if (!fileUrl) return void sendResponse(res, false, null, "Book not found", STATUS_CODES.NOT_FOUND);
    res.redirect(302, fileUrl);
  } catch (error: any) {
    fail(res, error);
  }
};

export const listPublicMantras = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.listPublicMantras();
    sendResponse(res, true, data, "Mantras loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const getPublicMantraBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await service.getPublicMantraBySlug(req.params.slug);
    sendResponse(res, true, data, "Mantra loaded successfully");
  } catch (error: any) {
    fail(res, error);
  }
};

export const playMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.registerMantraPlay(req.params.id);
    sendResponse(res, true, null, "Play recorded");
  } catch (error: any) {
    fail(res, error);
  }
};

export const downloadMantra = async (req: Request, res: Response): Promise<void> => {
  try {
    const audioUrl = await service.registerMantraDownload(req.params.id);
    if (!audioUrl) return void sendResponse(res, false, null, "Mantra not found", STATUS_CODES.NOT_FOUND);
    res.redirect(302, audioUrl);
  } catch (error: any) {
    fail(res, error);
  }
};
