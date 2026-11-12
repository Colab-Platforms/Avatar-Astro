import { Router } from "express";
import { auth } from "@/middleware/authMiddleware.js";
import * as adminController from "./admin.controller.js";
import pujaRoutes from "@/modules/puja/puja.route.js";
import chadhawaRoutes from "@/modules/chadhawa/chadhawa.route.js";
import shopRoutes from "@/modules/shop/shop.route.js";
import devotionLibraryRoutes from "@/modules/devotionLibrary/devotionLibrary.route.js";
import { requireMainAdmin } from "@/middleware/mainAdmin.js";
import { noStore } from "@/middleware/noStore.js";
import { createAdminPanelRouter } from "./adminPanel.route.js";
import { createAstrologyAudioAdminRouter } from "@/modules/astrologyAudio/astrologyAudio.route.js";
import { createAstrologerAdminRouter } from "@/modules/admin/astrologers/astrologerAdmin.route.js";
import { createToolPricingRouter } from "./toolPricing.route.js";
import { createBillingFailuresRouter } from "./billingFailures.route.js";

const router = Router();

// EVERY /api/admin route (dashboard, puja, chadhawa, shop and the panel modules) is main-admin only:
// a valid signed token, then a database re-check of an active SUPERADMIN account on each request.
// The old ADMIN role no longer opens anything here. Public catalogue reads live elsewhere
// (/api/temples, /api/chadhawa, /api/shop) and are unaffected.
router.use(noStore, auth("ADMIN"), requireMainAdmin);

router.get("/dashboard", adminController.getDashboard);

// Temple / Puja content management
router.use("/puja", pujaRoutes);

// Chadhawa offering management
router.use("/chadhawa", chadhawaRoutes);

// Shop categories / products management
router.use("/shop", shopRoutes);

// Spiritual Books + Mantras & Chants library management
router.use("/devotion-library", devotionLibraryRoutes);

// Astrology Audio Manager (ElevenLabs narration + Cloudinary storage)
router.use("/astrology/audio", createAstrologyAudioAdminRouter());

// Astrologer onboarding: application review, document verification, approval.
router.use("/astrologers", createAstrologerAdminRouter());

// Coin-wallet: premium AI tool pricing activation, and stuck-billing-hold reconciliation.
router.use("/tool-pricing", createToolPricingRouter());
router.use("/billing-failures", createBillingFailuresRouter());

// Admin panel modules (overview, users, tools, content, reports, audit...).
router.use(createAdminPanelRouter());

export default router;
