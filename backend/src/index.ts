import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import interpretationRoutes from "./routes/interpretationRoutes.js";
import compatibilityRoutes from "./routes/compatibilityRoutes.js";
import birthChartRoutes from "./routes/birthChartRoutes.js";
import nameAnalysisRoutes from "./routes/nameAnalysisRoutes.js";
import innerVoiceRoutes from "./routes/innerVoiceRoutes.js";
import aiProxyRoutes from "./routes/aiProxyRoutes.js";
import tarotRoutes from "./routes/tarotRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import { auth, optionalAuth } from "./middleware/authMiddleware.js";
import { captureReadings } from "./modules/library/readingCapture.js";
import { ttsLanguageCode } from "./utils/responseLanguage.js";
import { feature } from "./utils/usage.js";
import { installAiUsageCapture } from "./utils/aiUsageCapture.js";
import { createMeRouter } from "./modules/me/me.route.js";
import { createPublicContentRouter } from "./routes/publicContentRoutes.js";
import darshanRoutes from "./modules/darshan/darshan.public.route.js";
import { createAstrologerRouter } from "./modules/astrologer/astrologer.route.js";
import { createAstrologerPublicRouter } from "./modules/astrologer/public/astrologerPublic.route.js";
import authRoutes from "./modules/auth/auth.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import { createAstrologyAudioPublicRouter } from "./modules/astrologyAudio/astrologyAudio.route.js";
import publicTempleRoutes from "./modules/puja/puja.public.route.js";
import { createDevotionLibraryPublicRouter } from "./modules/devotionLibrary/devotionLibrary.public.route.js";
import publicChadhawaRoutes from "./modules/chadhawa/chadhawa.public.route.js";
import publicShopRoutes from "./modules/shop/shop.public.route.js";
import gemstoneRoutes from "./modules/gemstone/gemstone.route.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startDarshanRefreshLoop, stopDarshanRefreshLoop } from "./modules/darshan/darshan.refresh.js";
import { createWalletRouter } from "./modules/payment/wallet.route.js";
import { createChatRouter } from "./modules/chat/chat.route.js";
import { createAstrologerChatRouter } from "./modules/chat/chat.astrologer.route.js";
import { resumeAllActiveSessions, stopBillingTimers } from "./modules/chat/billing.js";
import { initSocketServer, clearPresenceTimers } from "./realtime/socketServer.js";
import { createShutdownController, installProcessHandlers } from "./utils/lifecycle.js";
import { isMockPaymentsMisconfigured } from "./modules/payment/mockPayments.js";
import { startReconciliationJob, stopReconciliationJob } from "./modules/payment/reconciliation.job.js";
import { razorpayWebhookHandler } from "./modules/payment/payment.webhook.js";
import { defaultRazorpayProvider } from "./modules/payment/payment.provider.js";
import prisma from "@root/prisma.js";
import { isOriginAllowed } from "./utils/corsOrigins.js";
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from "./modules/payment/toolBilling.service.js";
import { TOOL_KEYS } from "./modules/payment/toolKeys.js";
import { ApiError } from "./utils/ApiError.js";
import * as Sentry from "@sentry/node";

dotenv.config();

// Error tracking — active only when SENTRY_DSN is configured; a missing DSN changes nothing.
// setupExpressErrorHandler is attached just before our own errorHandler further down.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Error tracking only — no performance tracing. PII defaults to off in @sentry/node.
    tracesSampleRate: 0,
  });
  console.log("✓ Sentry error tracking enabled");
}

installAiUsageCapture();
const app = express();

// Startup configuration report. Names only, never values. In production a missing critical
// variable ABORTS startup — a deployed API that cannot sign anyone in or reach its database
// must fail loudly at deploy time, not serve errors to every user.
{
  const critical = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (critical.length) {
    console.error(`✗ MISSING REQUIRED ENV: ${critical.join(", ")} — sign-in and most features will fail`);
    if (process.env.NODE_ENV === "production") {
      console.error("✗ Refusing to start in production without critical configuration.");
      process.exit(1);
    }
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) console.warn("! JWT_SECRET is shorter than 32 characters");
  if ((process.env.OTP_HMAC_SECRET ?? "").trim().length < 32) console.error("✗ OTP_HMAC_SECRET is missing or shorter than 32 characters — e-mail OTPs cannot be issued or verified (registration / unverified login will fail closed)");
  const optional = ["OPENROUTER_API_KEY", "GROQ_API_KEY", "RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL", "YOUTUBE_API_KEY", "CORS_ORIGIN", "CLAMAV_HOST", "CLAMAV_PORT"].filter((k) => !process.env[k]);
  if (optional.length) console.warn(`! Optional env not set (related features disabled or degraded): ${optional.join(", ")}`);
  // The mock payment gateway stays locked outside development/test regardless of this flag; the warning
  // exists so a flag copied into a deployed environment is noticed and removed.
  if (isMockPaymentsMisconfigured()) console.error("✗ ALLOW_MOCK_PAYMENTS=true is set but NODE_ENV is not development/test — mock payments remain DISABLED. Remove the variable from this environment.");

  // Razorpay payment gateway validation
  const razorpayMissing = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"].filter((k) => !process.env[k]);
  if (razorpayMissing.length) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`! RAZORPAY CONFIGURATION INCOMPLETE: ${razorpayMissing.join(", ")} not set — real recharges will fail`);
    }
  } else {
    defaultRazorpayProvider.reloadConfig(process.env);
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    if (process.env.NODE_ENV === "production" && keyId.startsWith("rzp_test_")) {
      console.warn("! WARNING: RAZORPAY_KEY_ID is in TEST MODE (rzp_test_*) on a production instance!");
    }
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.warn("! RAZORPAY_WEBHOOK_SECRET is missing — payment webhook verification will fail closed");
    }
  }
}
// Render (and most hosts) terminate TLS at one proxy hop. Without this, req.ip is the proxy for every visitor,
// so the per-IP rate limits would be shared by all users at once.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5001;

// Security headers. This is a JSON API consumed by a separate frontend origin — CSP and the
// cross-origin embedding policies are meaningless here and would only break the Socket.IO
// polling fallback, so they're disabled; everything else (nosniff, frame denial, HSTS behind
// the TLS proxy, referrer policy, etc.) applies.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));

// Middleware — origin allow-list lives in utils/corsOrigins.ts (shared with Socket.IO's CORS config).
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      console.warn(`✗ CORS rejected origin: ${origin}`);
      callback(Object.assign(new Error("Not allowed by CORS"), { statusCode: 403 }));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Lets the browser read the dated filename of admin CSV exports.
    exposedHeaders: ["Content-Disposition", "X-Reading-Id", "X-Reading-Saved", "X-Conversation-Id"],
    credentials: true,
  }),
);
// Saves the original result of each successful AI generation to the signed-in user library (see modules/library).
app.use("/api", captureReadings());
// Mounted before the global 20mb body parser: it applies its own 250kb limit.
app.use("/api/ai", ...feature("ai-chat"), aiProxyRoutes);
app.use("/api/tarot", ...feature("tarot"), tarotRoutes);

// Razorpay webhook: raw bytes must be parsed for HMAC-SHA256 signature verification BEFORE express.json()
app.post(
  "/api/payments/razorpay/webhook",
  express.raw({ type: "*/*", limit: "100kb" }),
  razorpayWebhookHandler,
);

// 200kb covers every JSON body this API legitimately receives (the largest are astrology form
// payloads of a few kb; file uploads go through multer as multipart and are unaffected). The old
// global 20mb limit was a request-flooding surface. Routes needing more set their own parser
// BEFORE this line, like /api/ai's 250kb above.
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

// Liveness: answers as long as the process runs — no dependencies, never flaps.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Server is running" });
});

// Readiness: can this instance actually do work? Checks the database with a bounded timeout, so
// an orchestrator/uptime monitor can tell "process up, DB unreachable" apart from healthy.
app.get("/api/ready", async (_req: Request, res: Response) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("database ping timed out")), 3_000).unref()),
    ]);
    res.json({ success: true, message: "Ready" });
  } catch {
    res.status(503).json({ success: false, message: "Database unreachable" });
  }
});

// Zodiac endpoints
app.use("/api/zodiac", ...feature("zodiac"));
app.get("/api/zodiac/signs", (_req: Request, res: Response) => {
  const signs = [
    {
      name: "Aries",
      symbol: "♈",
      dates: "Mar 21 - Apr 19",
      element: "Fire",
      ruling_planet: "Mars",
    },
    {
      name: "Taurus",
      symbol: "♉",
      dates: "Apr 20 - May 20",
      element: "Earth",
      ruling_planet: "Venus",
    },
    {
      name: "Gemini",
      symbol: "♊",
      dates: "May 21 - Jun 20",
      element: "Air",
      ruling_planet: "Mercury",
    },
    {
      name: "Cancer",
      symbol: "♋",
      dates: "Jun 21 - Jul 22",
      element: "Water",
      ruling_planet: "Moon",
    },
    {
      name: "Leo",
      symbol: "♌",
      dates: "Jul 23 - Aug 22",
      element: "Fire",
      ruling_planet: "Sun",
    },
    {
      name: "Virgo",
      symbol: "♍",
      dates: "Aug 23 - Sep 22",
      element: "Earth",
      ruling_planet: "Mercury",
    },
    {
      name: "Libra",
      symbol: "♎",
      dates: "Sep 23 - Oct 22",
      element: "Air",
      ruling_planet: "Venus",
    },
    {
      name: "Scorpio",
      symbol: "♏",
      dates: "Oct 23 - Nov 21",
      element: "Water",
      ruling_planet: "Pluto",
    },
    {
      name: "Sagittarius",
      symbol: "♐",
      dates: "Nov 22 - Dec 21",
      element: "Fire",
      ruling_planet: "Jupiter",
    },
    {
      name: "Capricorn",
      symbol: "♑",
      dates: "Dec 22 - Jan 19",
      element: "Earth",
      ruling_planet: "Saturn",
    },
    {
      name: "Aquarius",
      symbol: "♒",
      dates: "Jan 20 - Feb 18",
      element: "Air",
      ruling_planet: "Uranus",
    },
    {
      name: "Pisces",
      symbol: "♓",
      dates: "Feb 19 - Mar 20",
      element: "Water",
      ruling_planet: "Neptune",
    },
  ];
  res.json({ success: true, data: signs });
});

app.get("/api/zodiac/signs/:sign", (req: Request, res: Response) => {
  const { sign } = req.params;
  const signData: Record<string, any> = {
    Aries: {
      name: "Aries",
      symbol: "♈",
      element: "Fire",
      ruling_planet: "Mars",
      dates: "Mar 21 - Apr 19",
    },
    Taurus: {
      name: "Taurus",
      symbol: "♉",
      element: "Earth",
      ruling_planet: "Venus",
      dates: "Apr 20 - May 20",
    },
    Gemini: {
      name: "Gemini",
      symbol: "♊",
      element: "Air",
      ruling_planet: "Mercury",
      dates: "May 21 - Jun 20",
    },
    Cancer: {
      name: "Cancer",
      symbol: "♋",
      element: "Water",
      ruling_planet: "Moon",
      dates: "Jun 21 - Jul 22",
    },
    Leo: {
      name: "Leo",
      symbol: "♌",
      element: "Fire",
      ruling_planet: "Sun",
      dates: "Jul 23 - Aug 22",
    },
    Virgo: {
      name: "Virgo",
      symbol: "♍",
      element: "Earth",
      ruling_planet: "Mercury",
      dates: "Aug 23 - Sep 22",
    },
    Libra: {
      name: "Libra",
      symbol: "♎",
      element: "Air",
      ruling_planet: "Venus",
      dates: "Sep 23 - Oct 22",
    },
    Scorpio: {
      name: "Scorpio",
      symbol: "♏",
      element: "Water",
      ruling_planet: "Pluto",
      dates: "Oct 23 - Nov 21",
    },
    Sagittarius: {
      name: "Sagittarius",
      symbol: "♐",
      element: "Fire",
      ruling_planet: "Jupiter",
      dates: "Nov 22 - Dec 21",
    },
    Capricorn: {
      name: "Capricorn",
      symbol: "♑",
      element: "Earth",
      ruling_planet: "Saturn",
      dates: "Dec 22 - Jan 19",
    },
    Aquarius: {
      name: "Aquarius",
      symbol: "♒",
      element: "Air",
      ruling_planet: "Uranus",
      dates: "Jan 20 - Feb 18",
    },
    Pisces: {
      name: "Pisces",
      symbol: "♓",
      element: "Water",
      ruling_planet: "Neptune",
      dates: "Feb 19 - Mar 20",
    },
  };
  res.json({ success: true, data: signData[sign] || signData["Aries"] });
});

// Newsletter
// Contact + partnership forms: validated, rate-limited, and delivered by email to SUPPORT_EMAIL.
app.use("/api", inquiryRoutes);

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes (ADMIN / SUPERADMIN only)
app.use("/api/admin", adminRoutes);

// Public temple/puja catalogue (read-only, no auth)
app.use("/api/temples", publicTempleRoutes);

// Public Chadhawa catalogue (read-only, no auth)
app.use("/api/chadhawa", publicChadhawaRoutes);

// Public Shop catalogue (read-only, no auth)
app.use("/api/shop", publicShopRoutes);

// Public Spiritual Books + Mantras & Chants library (read-only + download/play tracking, no auth)
app.use("/api/devotion-library", createDevotionLibraryPublicRouter());

// Ratna Jyotish (stateless gemstone calculator)
// Public calculator: optionalAuth only identifies a signed-in caller for usage attribution; it never blocks or grants anything.
// /kundali is the live Birth Chart feature (see frontend/src/features/kundali/api.ts), so it is gated under the
// "birth-chart" admin limit before falling through to the gemstone module's own "gemstone" gate below.
app.use("/api/gemstone-calculator/kundali", ...feature("birth-chart"));
app.use("/api/gemstone-calculator", ...feature("gemstone"), optionalAuth(), gemstoneRoutes);

// AI routes
app.use("/api/interpretation", ...feature("interpretation"), optionalAuth(), interpretationRoutes);
app.use("/api/compatibility", ...feature("compatibility"), optionalAuth(), compatibilityRoutes);
app.use("/api/birthchart", ...feature("birth-chart"), optionalAuth(), birthChartRoutes);
app.use("/api/name-analysis", ...feature("name-analysis"), optionalAuth(), nameAnalysisRoutes);
app.use("/api/inner-voice", ...feature("inner-voice"), innerVoiceRoutes);

// Signed-in user dashboard data and what the main admin publishes (public, read-only).
app.use("/api/me", createMeRouter());
app.use("/api/public", createPublicContentRouter());
app.use("/api/darshan", darshanRoutes);

// Astrologer onboarding: applicant application/document flow (signed-in USER), and the
// public published-astrologer directory (read-only, no auth). SUPERADMIN review/approval
// lives under /api/admin/astrologers (see admin.route.ts) using the existing admin auth.
app.use("/api/astrologer", createAstrologerRouter());
app.use("/api/astrologers", createAstrologerPublicRouter());

// Wallet (mock-gateway recharge) and the real-time astrologer chat REST surface — live
// message delivery and billing ticks happen over Socket.IO (see realtime/socketServer.ts).
app.use("/api/wallet", createWalletRouter());
app.use("/api/chat", createChatRouter());
app.use("/api/astrologer/chat", createAstrologerChatRouter());

// Published astrology About-section audio (public, read-only; never calls ElevenLabs)
app.use("/api/astrology", createAstrologyAudioPublicRouter());

// TTS proxy — matches the /api/tts path used by VoiceConsultation.tsx
app.post("/api/tts", ...feature("tts"), auth("USER"), async (req: Request, res: Response) => {
  const { text, language } = req.body ?? {};
  if (!String(text ?? "").trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "SARVAM_API_KEY not configured" });
  }
  // Each of the ten languages has its own verified voice language; anything else is refused rather than read in a Hindi voice.
  const langCode = ttsLanguageCode(language);
  if (!langCode) {
    return res.status(422).json({ error: "Voice is not available for this language", code: "tts_language_unsupported" });
  }
  const userId = req.user!.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;
  try {
    billed = await reserveToolExecution(userId, TOOL_KEYS.TTS_MAIN, executionId);
    if (billed.alreadySettled) return res.json(billed.execution!.resultPayload);

    const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        inputs: [String(text).slice(0, 500)],
        target_language_code: langCode,
        speaker: "manan",
        pace: 0.85,
        speech_sample_rate: 22050,
        model: "bulbul:v3",
        temperature: 0.4,
      }),
    });
    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.error("Sarvam TTS error:", sarvamRes.status, errText);
      if (billed && !billed.skip) await releaseToolExecution(executionId, "FAILED");
      return res.status(502).json({ error: "Sarvam TTS failed" });
    }
    const data = (await sarvamRes.json()) as any;
    const audio = data.audios?.[0];
    if (!audio) {
      if (billed && !billed.skip) await releaseToolExecution(executionId, "FAILED");
      return res.status(502).json({ error: "No audio in Sarvam response" });
    }
    const result = { audio };
    if (billed && !billed.skip) await settleToolExecution(executionId, result);
    return res.json(result);
  } catch (err: any) {
    if (billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (err instanceof ApiError) return res.status(err.statusCode).json({ error: err.message });
    console.error("TTS proxy error:", err.message);
    return res.status(500).json({ error: "TTS proxy failed" });
  }
});

// ── Palm Reading ────────────────────────────────────────────────────────────
// The live page analyses the photo in the browser (real MediaPipe hand-landmark detection,
// fixed narrative text per hand shape) and never calls a server AI route — it's fully free.
// A paid-vision-model endpoint used to exist here (forwarding the photo to Claude 3.5 Sonnet for
// a fabricated-precision "reading") but was never called by the frontend and has been removed;
// see git history if it's ever worth rebuilding properly on top of the real landmark data instead.
// /check carries no image and does no analysis: the page calls it first purely to consume one use
// of the admin's per-24h "palm-reading" limit before running the free, client-side analysis.
app.post("/api/palm-reading/check", ...feature("palm-reading"), auth("USER"), (_req: Request, res: Response) => {
  res.json({ success: true });
});

// Reports unexpected (5xx) errors to Sentry when configured, then passes through to ours below.
if (process.env.SENTRY_DSN) app.use(Sentry.expressErrorHandler());

// Error handling middleware (must be last).
// ApiError (thrown by the auth module / auth middleware) carries `statusCode`
// and is answered in the { status, data, message } shape the auth controllers
// use, so clients see one consistent envelope across the whole auth flow.
// Everything else keeps the original { success, error } shape.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (typeof err?.statusCode === "number") {
    return errorHandler(err, req, res, next);
  }
  console.error(err);
  res
    .status(err.status || 500)
    .json({ success: false, error: err.message || "Internal Server Error" });
});

// Wrapped (rather than a bare app.listen) so Socket.IO can attach to the same HTTP
// server/port — Render only exposes one port per service.
const httpServer = createServer(app);
const io = initSocketServer(httpServer);

// Graceful shutdown (SIGTERM/SIGINT) and fatal-error handling (uncaughtException / unhandledRejection).
// Fatal errors do NOT keep the process serving: it logs, does a short cleanup, and exits non-zero so the
// host restarts it; in-flight chats are recovered from database state by resumeAllActiveSessions().
installProcessHandlers(
  process,
  createShutdownController({
    exit: (code) => process.exit(code),
    steps: [
      {
        name: "stop background timers",
        run: () => {
          stopBillingTimers();
          stopDarshanRefreshLoop();
          clearPresenceTimers();
          stopReconciliationJob();
        },
      },
      {
        // Disconnects every socket, then stops accepting HTTP and waits for in-flight requests.
        name: "close socket.io and http server",
        run: () =>
          new Promise<void>((resolve) => {
            httpServer.closeIdleConnections?.();
            const force = setTimeout(() => httpServer.closeAllConnections?.(), 3_000);
            force.unref();
            io.close(() => {
              clearTimeout(force);
              resolve(); // an already-closed server reports an error here; either way it is closed
            });
          }),
      },
      { name: "disconnect database", run: () => prisma.$disconnect() },
    ],
  }),
);

// Start server
function startServer() {
  startDarshanRefreshLoop();
  // SINGLE-INSTANCE RULE: chat presence, billing ticks and the expiry sweep assume exactly ONE
  // backend process (see resumeAllActiveSessions in modules/chat/billing.ts). Do not scale this
  // service horizontally without first moving presence to a shared store and electing one scheduler.
  resumeAllActiveSessions().catch((err) => console.error("[chat.billing] failed to resume active sessions:", err));
  startReconciliationJob(); // daily read-only ledger/stale-hold sweep; first run ~5 min after boot

  httpServer.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
    console.log(`✓ Socket.IO ready on the same port`);
  });
}

startServer();

//normal
