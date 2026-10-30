import { Router } from "express";
import { auth } from "@/middleware/authMiddleware.js";
import * as adminController from "./admin.controller.js";
import pujaRoutes from "@/modules/puja/puja.route.js";
import chadhawaRoutes from "@/modules/chadhawa/chadhawa.route.js";
import shopRoutes from "@/modules/shop/shop.route.js";
import { requireMainAdmin } from "@/middleware/mainAdmin.js";
import { noStore } from "@/middleware/noStore.js";
import { createAdminPanelRouter } from "./adminPanel.route.js";

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

// Admin panel modules (overview, users, tools, content, reports, audit...).
router.use(createAdminPanelRouter());

export default router;
