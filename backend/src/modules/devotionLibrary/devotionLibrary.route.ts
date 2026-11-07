import { Router } from "express";
import { uploadSingleImage } from "@/middleware/upload.js";
import { uploadBookPdf, uploadMantraAudio } from "@/middleware/devotionLibraryUpload.js";
import * as controller from "./devotionLibrary.controller.js";

// Mounted under /api/admin/devotion-library, which applies the main-admin guard
// (SUPERADMIN, re-checked in the database) via admin.route.ts.
const router = Router();

router.get("/stats", controller.getStats);

// Spiritual Books
router.get("/books", controller.listBooks);
router.post("/books", controller.createBook);
router.get("/books/:id", controller.getBook);
router.put("/books/:id", controller.updateBook);
router.delete("/books/:id", controller.deleteBook);
router.post("/books/:id/file", uploadBookPdf, controller.setBookFile);
router.post("/books/:id/cover", uploadSingleImage, controller.setBookCover);

// Mantras & Chants
router.get("/mantras", controller.listMantras);
router.post("/mantras", controller.createMantra);
router.get("/mantras/:id", controller.getMantra);
router.put("/mantras/:id", controller.updateMantra);
router.delete("/mantras/:id", controller.deleteMantra);
router.post("/mantras/:id/audio", uploadMantraAudio, controller.setMantraAudio);
router.post("/mantras/:id/cover", uploadSingleImage, controller.setMantraCover);

export default router;
