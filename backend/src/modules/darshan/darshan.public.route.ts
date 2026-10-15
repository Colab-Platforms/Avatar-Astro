import express, { Router } from "express";
import * as darshanController from "./darshan.controller.js";

// Mounted at /api/darshan. Entirely public/unauthenticated — the temple
// reads are consumed directly by the frontend, and the websub/* routes are
// called by Google's WebSub hub, not by any client of ours.
const router = Router();

router.get("/temples", darshanController.listTemples);
router.get("/temples/:slug", darshanController.getTempleBySlug);

// WebSub (PubSubHubbub) push endpoint — YouTube's hub calls this directly,
// both to verify the subscription (GET) and to deliver notifications (POST).
// The POST body is an Atom XML feed, not JSON, so it needs its own text
// parser rather than the app-wide express.json().
router.get("/websub/callback", darshanController.verifyWebSubCallback);
router.post(
  "/websub/callback",
  express.text({ type: ["application/atom+xml", "application/xml", "text/xml"] }),
  darshanController.handleWebSubNotification,
);

export default router;
