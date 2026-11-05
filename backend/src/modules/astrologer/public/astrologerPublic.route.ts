import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[astrologer.public] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

// Only ever selects AstrologerProfile's public-safe fields — never AstrologerDocument,
// notes, or contact info. No auth: this is the public directory.
const PUBLIC_SELECT = {
  id: true,
  displayName: true,
  bio: true,
  profilePhotoUrl: true,
  yearsOfExperience: true,
  languages: true,
  publishedAt: true,
} as const;

export function createAstrologerPublicRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 120 }));

  router.get(
    "/",
    wrap(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
      const [items, total] = await Promise.all([
        prisma.astrologerProfile.findMany({
          where: { isPublished: true, suspendedAt: null },
          select: PUBLIC_SELECT,
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.astrologerProfile.count({ where: { isPublished: true, suspendedAt: null } }),
      ]);
      sendResponse(res, true, { items, total, page, pageSize });
    }),
  );

  router.get(
    "/:id",
    wrap(async (req, res) => {
      const profile = await prisma.astrologerProfile.findFirst({
        where: { id: req.params.id, isPublished: true, suspendedAt: null },
        select: PUBLIC_SELECT,
      });
      if (!profile) throw new ApiError("Astrologer not found", STATUS_CODES.NOT_FOUND);
      sendResponse(res, true, profile);
    }),
  );

  return router;
}

export default createAstrologerPublicRouter;
