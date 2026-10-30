import { Router } from "express";
import * as chadhawaController from "./chadhawa.controller.js";

// Mounted under /api/admin/chadhawa, which applies the main-admin guard (SUPERADMIN, re-checked in the database).
const router = Router();

router.get("/", chadhawaController.listChadhawas);
router.post("/", chadhawaController.createChadhawa);

router.get(
  "/temples/:templeId",
  chadhawaController.listChadhawasByTemple,
);

router.get("/:id", chadhawaController.getChadhawa);
router.put("/:id", chadhawaController.updateChadhawa);
router.delete("/:id", chadhawaController.deleteChadhawa);

export default router;
