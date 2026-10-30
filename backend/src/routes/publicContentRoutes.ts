import { Router } from "express";
import prisma from "@root/prisma.js";
import { FEATURES, featureSettingKey } from "@/config/features.js";
import { getAllSettings } from "@/modules/admin/settings.js";
import { createRateLimiter } from "@/utils/rateLimit.js";

/**
 * Public, read-only endpoints for what the main admin publishes. They return
 * only published, in-schedule items and the minimum fields the site needs.
 * If the database is unavailable they answer with empty/default data so the
 * public site is never broken by the admin features.
 */
export function createPublicContentRouter(): Router {
  const router = Router();
  router.use(createRateLimiter({ windowMs: 60_000, max: 120 }));

  router.get("/content", async (_req, res) => {
    // Always revalidate: a publish or a feature switch must show up immediately (payloads are tiny).
    res.setHeader("Cache-Control", "no-cache");
    try {
      const now = new Date();
      const items = await prisma.contentItem.findMany({
        where: {
          status: "PUBLISHED",
          AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 200,
        select: { id: true, type: true, title: true, body: true, linkUrl: true, imageUrl: true, sortOrder: true },
      });
      res.json({ success: true, data: items });
    } catch {
      res.json({ success: true, data: [] });
    }
  });

  // Which tools the admin has switched off, so the UI can say so up front.
  router.get("/config", async (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    try {
      const settings = await getAllSettings();
      const disabledFeatures = FEATURES.filter((f) => settings.get(featureSettingKey(f.key)) === false).map((f) => f.key);
      res.json({ success: true, data: { disabledFeatures } });
    } catch {
      res.json({ success: true, data: { disabledFeatures: [] } });
    }
  });

  return router;
}
