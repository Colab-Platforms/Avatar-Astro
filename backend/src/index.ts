import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
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
import { createRateLimiter } from "./utils/rateLimit.js";
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
import { startDarshanRefreshLoop } from "./modules/darshan/darshan.refresh.js";
import { createWalletRouter } from "./modules/payment/wallet.route.js";
import { createChatRouter } from "./modules/chat/chat.route.js";
import { createAstrologerChatRouter } from "./modules/chat/chat.astrologer.route.js";
import { resumeAllActiveSessions } from "./modules/chat/billing.js";
import { initSocketServer } from "./realtime/socketServer.js";
import { isOriginAllowed } from "./utils/corsOrigins.js";
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from "./modules/payment/toolBilling.service.js";
import { TOOL_KEYS } from "./modules/payment/toolKeys.js";
import { ApiError } from "./utils/ApiError.js";

dotenv.config();

installAiUsageCapture();
const app = express();

// Loud (non-fatal) startup report of missing configuration. Names only, never values.
{
  const critical = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (critical.length) console.error(`✗ MISSING REQUIRED ENV: ${critical.join(", ")} — sign-in and most features will fail`);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) console.warn("! JWT_SECRET is shorter than 32 characters");
  if ((process.env.OTP_HMAC_SECRET ?? "").trim().length < 32) console.error("✗ OTP_HMAC_SECRET is missing or shorter than 32 characters — e-mail OTPs cannot be issued or verified (registration / unverified login will fail closed)");
  const optional = ["OPENROUTER_API_KEY", "GROQ_API_KEY", "RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL", "YOUTUBE_API_KEY", "CORS_ORIGIN", "CLAMAV_HOST", "CLAMAV_PORT"].filter((k) => !process.env[k]);
  if (optional.length) console.warn(`! Optional env not set (related features disabled or degraded): ${optional.join(", ")}`);
}
// Render (and most hosts) terminate TLS at one proxy hop. Without this, req.ip is the proxy for every visitor,
// so the per-IP rate limits would be shared by all users at once.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5001;

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
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Server is running" });
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
  const langCode = String(language ?? "").startsWith("en") ? "en-IN" : "hi-IN";
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
// Note: the current Palm Reading page analyses the photo in the browser and does not call this endpoint.
// It is kept (and locked down) because it forwards an image to a paid vision model.
// /check carries no image and does no analysis: the page calls it first purely to consume one use of the
// admin's per-24h "palm-reading" limit before running the (free, client-side) analysis.
app.post("/api/palm-reading/check", ...feature("palm-reading"), auth("USER"), (_req: Request, res: Response) => {
  res.json({ success: true });
});
const PALM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PALM_MAX_BASE64_CHARS = 8_000_000; // ~6 MB of image data
app.post("/api/palm-reading", ...feature("palm-reading"), auth("USER"), createRateLimiter({ windowMs: 60_000, max: 5 }), async (req: Request, res: Response) => {
  const { imageBase64, imageType, fingerprint } = req.body;
  if (!imageBase64 || !imageType) {
    return res.status(400).json({
      success: false,
      error: "imageBase64 and imageType are required",
    });
  }
  if (typeof imageType !== "string" || !PALM_IMAGE_TYPES.has(imageType)) {
    return res.status(400).json({ success: false, error: "Unsupported image type" });
  }
  if (typeof imageBase64 !== "string" || imageBase64.length > PALM_MAX_BASE64_CHARS || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return res.status(400).json({ success: false, error: "Invalid or too large image" });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return res
      .status(500)
      .json({ success: false, error: "The reading service is not configured" });
  }

  const seedNum = fingerprint
    ? parseInt(fingerprint) % 1000
    : Math.floor(Math.random() * 1000);
  const prompt = `You are a master Vedic palmistry expert with 40+ years of experience. Carefully analyze this palm image.

Look at the actual lines, mounts, and hand shape visible in the image. Use seed number ${seedNum} to ensure this user always gets the same consistent reading.

Return ONLY valid JSON, no markdown fences, no extra text. Use this exact structure:
{
  "handType": "Earth Hand",
  "element": "Earth 🌍",
  "palmScore": 8.4,
  "confidence": 93,
  "dominance": "Right (Active)",
  "lines": {
    "heart": { "quality": "Long & deeply curved", "depth": "Deep", "headline": "Your Heart — Emotions & Love", "reading": "3-4 detailed sentences about emotional nature, love life, relationships.", "strengths": ["Deep emotional loyalty","Strong empathy","Passionate connections","Intuitive heart"], "challenges": ["Tendency to over-give","Difficulty letting go","Emotional sensitivity"], "advice": "One sentence of personalized practical advice." },
    "head":  { "quality": "Long, sweeping across palm", "depth": "Moderate", "headline": "Your Mind — Intelligence & Clarity", "reading": "3-4 detailed sentences about intellect, decision-making, mental strengths.", "strengths": ["Strategic thinking","Creative problem solving","Strong focus","Intellectual curiosity"], "challenges": ["Overthinking","Analysis paralysis","Difficulty with quick decisions"], "advice": "One sentence of personalized practical advice." },
    "life":  { "quality": "Strong sweeping arc", "depth": "Deep", "headline": "Your Life — Vitality & Path", "reading": "3-4 detailed sentences about vitality, energy, life transitions.", "strengths": ["High vitality","Resilience","Strong adaptability","Personal growth"], "challenges": ["Taking on too much","Need for rest","Restless energy"], "advice": "One sentence of personalized practical advice." },
    "fate":  { "quality": "Clear vertical line", "depth": "Strong", "headline": "Your Destiny — Career & Purpose", "reading": "3-4 detailed sentences about career path, life purpose, destiny markers.", "strengths": ["Clear life direction","Career focus","Natural leadership","Purpose-driven"], "challenges": ["Rigidity in plans","Difficulty pivoting","External pressure sensitivity"], "advice": "One sentence of personalized practical advice." }
  },
  "mounts": [
    {"name":"Mount of Jupiter","planet":"Jupiter","strength":82,"symbol":"♃","reading":"Two sentences about ambition and leadership."},
    {"name":"Mount of Saturn","planet":"Saturn","strength":71,"symbol":"♄","reading":"Two sentences about discipline and karma."},
    {"name":"Mount of Sun (Apollo)","planet":"Sun","strength":88,"symbol":"☉","reading":"Two sentences about creative power and charisma."},
    {"name":"Mount of Mercury","planet":"Mercury","strength":75,"symbol":"☿","reading":"Two sentences about communication and business acumen."},
    {"name":"Mount of Venus","planet":"Venus","strength":79,"symbol":"♀","reading":"Two sentences about love and sensuality."},
    {"name":"Mount of Moon (Luna)","planet":"Moon","strength":69,"symbol":"☽","reading":"Two sentences about intuition and imagination."}
  ],
  "personality": [
    {"trait":"Leadership","score":81,"description":"One sentence insight."},
    {"trait":"Emotional Depth","score":88,"description":"One sentence insight."},
    {"trait":"Creative Power","score":76,"description":"One sentence insight."},
    {"trait":"Intellectual Force","score":83,"description":"One sentence insight."},
    {"trait":"Spiritual Sensitivity","score":72,"description":"One sentence insight."},
    {"trait":"Willpower","score":79,"description":"One sentence insight."}
  ],
  "love": { "style": "Devoted & Passionate", "summary": "2-3 sentence love life overview.", "soulmate": "Describe ideal partner qualities.", "warning": "One sentence about the main relationship pitfall." },
  "career": { "path": "The Visionary Creator", "summary": "2-3 sentence career overview.", "bestRoles": ["Role 1","Role 2","Role 3","Role 4"], "wealthLine": "One sentence about wealth potential." },
  "timeline": [
    {"phase":"Foundation Years","years":"Age 0–20","theme":"Learning & Self-Discovery","insight":"Two sentences for this phase."},
    {"phase":"Rise & Ambition","years":"Age 21–35","theme":"Growth & Bold Choices","insight":"Two sentences for this phase."},
    {"phase":"Mastery Period","years":"Age 36–55","theme":"Achievement & Impact","insight":"Two sentences for this phase."},
    {"phase":"Legacy Years","years":"Age 56+","theme":"Wisdom & Fulfillment","insight":"Two sentences for this phase."}
  ],
  "hiddenGifts": ["Hidden gift 1","Hidden gift 2","Hidden gift 3","Hidden gift 4","Hidden gift 5"],
  "luckyElements": {"number":"7","color":"Deep Indigo","day":"Thursday","gem":"Amethyst","direction":"Northeast"},
  "summary": "A powerful 3-4 sentence master summary of the entire palm reading."
}`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-3.5-sonnet",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageType};base64,${imageBase64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:8081",
          "X-Title": "Spiritual AI Palm Reading",
        },
      },
    );

    const text = response.data.choices[0].message.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from AI response");
    const result = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("Palm reading error:", err.message);
    res.status(502).json({
      success: false,
      error: "The reading service is unavailable right now",
    });
  }
});

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
initSocketServer(httpServer);

// Start server
function startServer() {
  startDarshanRefreshLoop();
  resumeAllActiveSessions().catch((err) => console.error("[chat.billing] failed to resume active sessions:", err));

  httpServer.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
    console.log(`✓ Socket.IO ready on the same port`);
  });
}

startServer();

//normal
