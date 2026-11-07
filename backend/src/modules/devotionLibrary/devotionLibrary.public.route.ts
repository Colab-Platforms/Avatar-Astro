import { Router } from "express";
import { createRateLimiter } from "@/utils/rateLimit.js";
import * as controller from "./devotionLibrary.controller.js";

/**
 * Public, read-only + lightweight tracking endpoints for the Spiritual Books and
 * Mantras & Chants pages. Mounted at /api/devotion-library. Writes to admin content
 * stay behind the admin router, which applies auth("ADMIN").
 */
export function createDevotionLibraryPublicRouter(): Router {
  const router = Router();
  router.use(createRateLimiter({ windowMs: 60_000, max: 120 }));

  router.get("/books", controller.listPublicBooks);
  router.get("/books/:slug", controller.getPublicBookBySlug);
  router.get("/books/:id/download", controller.downloadBook);

  router.get("/mantras", controller.listPublicMantras);
  router.get("/mantras/:slug", controller.getPublicMantraBySlug);
  router.post("/mantras/:id/play", controller.playMantra);
  router.get("/mantras/:id/download", controller.downloadMantra);

  return router;
}
