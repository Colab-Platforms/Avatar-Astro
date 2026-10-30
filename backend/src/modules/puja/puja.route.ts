import { Router } from "express";
import { uploadTempleImages } from "@/middleware/upload.js";
import * as pujaController from "./puja.controller.js";

// Mounted under /api/admin/puja, which applies the main-admin guard (SUPERADMIN, re-checked in the database).
const router = Router();

// Temples
router.get("/temples", pujaController.listTemples);
router.post("/temples", pujaController.createTemple);
router.get("/temples/:id", pujaController.getTemple);
router.put("/temples/:id", pujaController.updateTemple);
router.delete("/temples/:id", pujaController.deleteTemple);

// Temple images
router.post(
  "/temples/:id/images",
  uploadTempleImages,
  pujaController.addTempleImages,
);
router.delete("/images/:imageId", pujaController.deleteTempleImage);

// Pujas
router.get("/temples/:id/pujas", pujaController.listPujas);
router.post("/temples/:id/pujas", pujaController.createPuja);
router.put("/pujas/:pujaId", pujaController.updatePuja);
router.delete("/pujas/:pujaId", pujaController.deletePuja);

export default router;
