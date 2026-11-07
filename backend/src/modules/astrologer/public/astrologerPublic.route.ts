import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";
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
// notes, contact info, or anything from AstrologerApplication. No auth: public directory.
const PUBLIC_SELECT = {
  id: true,
  slug: true,
  displayName: true,
  bio: true,
  profilePhotoUrl: true,
  yearsOfExperience: true,
  languages: true,
  specialtyLabels: true,
  pricePerMinute: true,
  rating: true,
  consultationsCount: true,
  recognition: true,
  galleryUrls: true,
  qualifications: true,
  isDemo: true,
  publishedAt: true,
} satisfies Prisma.AstrologerProfileSelect;

type PublicProfileRow = Prisma.AstrologerProfileGetPayload<{ select: typeof PUBLIC_SELECT }>;

/**
 * Shapes a DB row into the public response. Field names here are deliberately chosen to
 * match the frontend's existing `Astrologer` type (frontend/src/data/astrologers.ts) so
 * AstrologerCard/AstrologerProfile need minimal adaptation beyond handling nulls — no
 * booking/review system exists yet, so rating/consultations/price are null for any
 * genuinely approved astrologer who hasn't set a price or received reviews; only the
 * seeded isDemo rows carry fabricated numbers. The frontend must render those as "not
 * set yet", never as a fake zero.
 */
function toPublicShape(p: PublicProfileRow) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.displayName,
    verified: true,
    recognition: p.recognition,
    photo: p.profilePhotoUrl,
    online: true,
    expertise: p.specialtyLabels,
    languages: p.languages,
    experienceYears: p.yearsOfExperience,
    rating: p.rating,
    consultations: p.consultationsCount,
    pricePerMin: p.pricePerMinute,
    originalPricePerMin: null as number | null,
    about: p.bio,
    qualifications: p.qualifications,
    availability: "",
    gallery: p.galleryUrls,
    demo: p.isDemo,
  };
}

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
      sendResponse(res, true, { items: items.map(toPublicShape), total, page, pageSize });
    }),
  );

  router.get(
    "/:slug",
    wrap(async (req, res) => {
      const profile = await prisma.astrologerProfile.findFirst({
        where: { slug: req.params.slug, isPublished: true, suspendedAt: null },
        select: PUBLIC_SELECT,
      });
      if (!profile) throw new ApiError("Astrologer not found", STATUS_CODES.NOT_FOUND);
      sendResponse(res, true, toPublicShape(profile));
    }),
  );

  return router;
}

export default createAstrologerPublicRouter;
