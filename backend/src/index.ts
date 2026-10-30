import express, { Request, Response, NextFunction } from "express";
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
import { createRateLimiter } from "./utils/rateLimit.js";
import { feature } from "./utils/usage.js";
import { installAiUsageCapture } from "./utils/aiUsageCapture.js";
import { createMeRouter } from "./modules/me/me.route.js";
import { createPublicContentRouter } from "./routes/publicContentRoutes.js";
import darshanRoutes from "./modules/darshan/darshan.public.route.js";
import authRoutes from "./modules/auth/auth.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import publicTempleRoutes from "./modules/puja/puja.public.route.js";
import publicChadhawaRoutes from "./modules/chadhawa/chadhawa.public.route.js";
import publicShopRoutes from "./modules/shop/shop.public.route.js";
import gemstoneRoutes from "./modules/gemstone/gemstone.route.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startDarshanRefreshLoop } from "./modules/darshan/darshan.refresh.js";

dotenv.config();

installAiUsageCapture();
const app = express();

// Loud (non-fatal) startup report of missing configuration. Names only, never values.
{
  const critical = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (critical.length) console.error(`✗ MISSING REQUIRED ENV: ${critical.join(", ")} — sign-in and most features will fail`);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) console.warn("! JWT_SECRET is shorter than 32 characters");
  const optional = ["OPENROUTER_API_KEY", "GROQ_API_KEY", "RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL", "YOUTUBE_API_KEY", "CORS_ORIGIN"].filter((k) => !process.env[k]);
  if (optional.length) console.warn(`! Optional env not set (related features disabled or degraded): ${optional.join(", ")}`);
}
// Render (and most hosts) terminate TLS at one proxy hop. Without this, req.ip is the proxy for every visitor,
// so the per-IP rate limits would be shared by all users at once.
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5001;

// Middleware
const EXPLICIT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",
  "http://192.168.1.126:8081",
  "https://avatar-astro.vercel.app",
];
// This project's actual Vite dev port (see frontend/vite.config.ts) — kept
// in addition to the explicit list above since that's what's really running.
// Also allows LAN IPs (192.168.x.x / 10.x.x.x / 172.16-31.x.x) so phones and
// other devices on the same WiFi can hit a locally-running backend during dev.
const LOCAL_DEV_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
// Optional production origin, set via env — unrelated to local dev, unchanged.
const PRODUCTION_ORIGIN = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server proxy, curl, mobile)
      if (!origin) return callback(null, true);
      if (EXPLICIT_ALLOWED_ORIGINS.includes(origin))
        return callback(null, true);
      if (LOCAL_DEV_ORIGIN_REGEX.test(origin)) return callback(null, true);
      if (PRODUCTION_ORIGIN && origin === PRODUCTION_ORIGIN)
        return callback(null, true);
      console.warn(`✗ CORS rejected origin: ${origin}`);
      callback(Object.assign(new Error("Not allowed by CORS"), { statusCode: 403 }));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Lets the browser read the dated filename of admin CSV exports.
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  }),
);
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

// Ratna Jyotish (stateless gemstone calculator)
// Public calculator: optionalAuth only identifies a signed-in caller for usage attribution; it never blocks or grants anything.
app.use("/api/gemstone-calculator", ...feature("gemstone"), optionalAuth(), gemstoneRoutes);

// AI routes
app.use("/api/interpretation", ...feature("interpretation"), interpretationRoutes);
app.use("/api/compatibility", ...feature("compatibility"), compatibilityRoutes);
app.use("/api/birthchart", ...feature("birth-chart"), birthChartRoutes);
app.use("/api/name-analysis", ...feature("name-analysis"), nameAnalysisRoutes);
app.use("/api/inner-voice", ...feature("inner-voice"), innerVoiceRoutes);

// Signed-in user dashboard data and what the main admin publishes (public, read-only).
app.use("/api/me", createMeRouter());
app.use("/api/public", createPublicContentRouter());
app.use("/api/darshan", darshanRoutes);

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
  try {
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
      return res.status(502).json({ error: "Sarvam TTS failed" });
    }
    const data = (await sarvamRes.json()) as any;
    const audio = data.audios?.[0];
    if (!audio)
      return res.status(502).json({ error: "No audio in Sarvam response" });
    return res.json({ audio });
  } catch (err: any) {
    console.error("TTS proxy error:", err.message);
    return res.status(500).json({ error: "TTS proxy failed" });
  }
});

// ── Palm Reading ────────────────────────────────────────────────────────────
// Note: the current Palm Reading page analyses the photo in the browser and does not call this endpoint.
// It is kept (and locked down) because it forwards an image to a paid vision model.
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

// Start server
function startServer() {
  startDarshanRefreshLoop();

  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ API available at http://localhost:${PORT}/api`);
  });
}

startServer();

//normal
