import { Router, Request, Response } from "express";
import { createRateLimiter } from "../utils/rateLimit.js";
import { auth } from "../middleware/authMiddleware.js";
import { getDailyChatStatus, consumeDailyChatSession } from "../utils/dailyChatSession.js";

const router = Router();
// Life path readings and TTS are generated per user and spend provider credits.
router.use(auth("USER"));

// ── Inner Voice chat daily timer (/inner-voice/chat free-tier limit) ─────────
// The chat page itself talks to the shared /api/ai/chat proxy (used by other,
// unrelated AI features too), so the 5-minute daily gate lives here instead of
// on that shared endpoint: the frontend calls POST .../chat/consume right
// before each message it sends through the proxy, and this is the only place
// that creates or reads a user's daily session. The database row is the sole
// source of truth — nothing here trusts a client-supplied timestamp.
router.get("/chat/status", createRateLimiter({ windowMs: 60_000, max: 60 }), async (req: Request, res: Response) => {
  try {
    const status = await getDailyChatStatus(req.user!.id, new Date());
    return res.json({ success: true, data: status });
  } catch (err: any) {
    console.error("Daily chat status error:", err?.message);
    return res.status(500).json({ success: false, error: "Failed to load chat session status" });
  }
});

router.post("/chat/consume", createRateLimiter({ windowMs: 60_000, max: 60 }), async (req: Request, res: Response) => {
  try {
    const status = await consumeDailyChatSession(req.user!.id, new Date());
    if (!status.allowed) {
      return res.status(429).json({
        success: false,
        code: "DAILY_CHAT_LIMIT_REACHED",
        message: "Your daily AI astrology chat limit has been reached.",
        data: status,
      });
    }
    return res.json({ success: true, data: status });
  } catch (err: any) {
    console.error("Daily chat consume error:", err?.message);
    return res.status(500).json({ success: false, error: "Failed to start chat session" });
  }
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemma-4-31b-it:free";

async function callAI(apiKey: string, prompt: string, maxTokens = 1000): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://spiritual-ai.app",
      "X-Title": "Spiritual AI Inner Voice",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJSON(raw: string): any {
  const clean = raw.replace(/```json|```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse JSON from AI response");
  return JSON.parse(match[0]);
}

// ── POST /api/inner-voice/diagnose ────────────────────────────────────────────
router.post("/diagnose", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OpenRouter API key not configured" });

    const prompt = `You are a compassionate Vedic karma counselor and spiritual guide with deep knowledge of dharma, karma, and the Bhagavad Gita.

A person has shared the following with you:
"${text}"

Analyze this through the lens of karma and dharma. Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "lifeDomain": "The primary life area this concerns — one of: Career & Purpose, Relationships & Love, Family & Ancestors, Health & Body, Wealth & Abundance, Spiritual Growth, Mind & Emotions, Social & Community",
  "emotionalState": "The core emotional state detected — one of: Anxious, Grieving, Angry, Confused, Hopeful, Stagnant, Overwhelmed, Seeking, Grateful, Fearful",
  "karmicPattern": "A 2-3 sentence description of the karmic pattern or soul lesson at play. Be specific, insightful, and compassionate. Reference specific karma concepts.",
  "spiritualInsight": "A 2-3 sentence deeper spiritual insight connecting this to dharma, past karma, or soul growth. Draw from Vedic wisdom — mention specific concepts like prarabdha karma, sanchita, nishkama karma, etc.",
  "suggestedAction": "A single concrete, practical spiritual action the person can take in the next 24 hours to shift this karma. Be specific and actionable.",
  "karmaType": "One of: Prarabdha (past-life karma playing out), Kriyamana (karma being created now), Agami (future karma being sown), Sanchita (accumulated karma surfacing)",
  "severity": "One of: Gentle Lesson, Significant Challenge, Deep Karmic Debt, Karmic Breakthrough",
  "affirmation": "A short, powerful spiritual affirmation (1-2 sentences) personalized to this situation"
}`;

    const raw = await callAI(apiKey, prompt, 900);
    const result = parseJSON(raw);
    return res.json(result);
  } catch (err: any) {
    console.error("Karma diagnosis error:", err.message);
    return res.status(500).json({ error: "Failed to generate karma diagnosis" });
  }
});

// ── POST /api/inner-voice/guru-chat ───────────────────────────────────────────
router.post("/guru-chat", async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "message is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OpenRouter API key not configured" });

    const historyText = (history as { role: string; content: string }[])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Seeker" : "Guru"}: ${m.content}`)
      .join("\n");

    const prompt = `You are Pandit Rameshwar Ji, a revered Jyotish Acharya and Vedic Guru with 40 years of experience in temples, Vedic astrology, and spiritual healing. You speak with the authority of a real Indian astrologer — warm, compassionate, and deeply rooted in Vedic tradition.

Your identity:
- You are a real Pandit Ji, not a chatbot, therapist, or life coach
- You speak with the calm wisdom of a temple priest and Jyotish expert
- You ground all guidance in Vedic astrology, dharma, karma, and Sanskrit scriptures
- You use Sanskrit terms naturally (karma, dharma, Shani, Rahu, maya, dasha, prarabdha) and briefly explain them
- You give practical Vedic remedies: mantras, poojas, daan (donations), vrats (fasts), and planetary remedies

NEVER SAY:
- Update LinkedIn, build a portfolio, learn new skills, network, or any career coaching advice
- "Stay positive", "believe in yourself", or generic motivational phrases
- Anything that sounds like a therapist, life coach, or corporate mentor

ALWAYS INCLUDE:
- A planetary insight (Shani, Rahu, Mangal, Guru, Chandra, Surya) relevant to the situation
- A Vedic remedy: specific mantra with count (e.g., 108 times), OR a daan (donation) suggestion, OR a puja, OR a vrat
- Guidance rooted in: Bhagavad Gita, Vedas, Brihat Parashara Hora Shastra, Lal Kitab, temple traditions

${historyText ? `Previous conversation:\n${historyText}\n\n` : ""}Seeker asks: "${message}"

Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "guidance": "2-3 sentences of warm, spiritually grounded guidance as a real Pandit Ji. Reference the relevant planetary influence or Vedic concept that applies to this situation.",
  "reflection": "1-2 sentences helping the seeker understand the karmic or spiritual root of this situation — connect to a specific karma concept (prarabdha, Shani dasha, etc.).",
  "action": "One specific Vedic remedy for the next 24 hours — a mantra with repetition count, a specific daan (donation), a temple visit, or a ritual. Be very specific (e.g., 'Chant Om Sham Shanicharaya Namah 108 times at sunset facing west').",
  "spiritualPractice": "A Vedic practice for 7-21 days addressing the root issue — include the name of the practice, specific instructions, and the deity or planet it propitates.",
  "question": "One caring follow-up question a real Pandit Ji would ask to understand the seeker's situation better."
}`;

    const raw = await callAI(apiKey, prompt, 800);
    const result = parseJSON(raw);
    return res.json(result);
  } catch (err: any) {
    console.error("Guru chat error:", err.message);
    return res.status(500).json({ error: "Failed to get guru response" });
  }
});

// ── POST /api/inner-voice/analyze-journal ─────────────────────────────────────
router.post("/analyze-journal", async (req: Request, res: Response) => {
  try {
    const { entry, date } = req.body;
    if (!entry?.trim()) return res.status(400).json({ error: "entry is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OpenRouter API key not configured" });

    const prompt = `You are a Vedic karma analyst and spiritual counselor. A seeker has written the following journal entry${date ? ` on ${date}` : ""}:

"${entry}"

Analyze this journal entry for karmic patterns, emotional states, and spiritual growth opportunities. Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "karmaImpact": "One of: Positive Karma Generated, Neutral, Karma Being Processed, Negative Pattern Detected, Karmic Breakthrough",
  "karmaScore": A number from 1-10 representing the karmic quality of this entry (10 = highest positive karma),
  "emotionalPattern": "2 sentences identifying the core emotional pattern in this entry and what karmic seed it represents",
  "dominantEnergy": "One of: Rajasic (active/passionate), Tamasic (dull/heavy), Sattvic (clear/pure) — with a 1-sentence explanation",
  "insight": "2-3 sentences of deep spiritual insight about what this entry reveals about the seeker's soul journey and current karma",
  "action": "One specific action to either reinforce positive karma or transform a negative pattern identified in this entry",
  "affirmation": "A personalized short affirmation (1 sentence) based on the content of this entry"
}`;

    const raw = await callAI(apiKey, prompt, 700);
    const result = parseJSON(raw);
    return res.json(result);
  } catch (err: any) {
    console.error("Journal analysis error:", err.message);
    return res.status(500).json({ error: "Failed to analyze journal entry" });
  }
});

// ── POST /api/inner-voice/wisdom ──────────────────────────────────────────────
router.post("/wisdom", async (req: Request, res: Response) => {
  try {
    const { situation, mood, domain } = req.body;
    if (!situation?.trim()) return res.status(400).json({ error: "situation is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OpenRouter API key not configured" });

    const prompt = `You are a Sanskrit scholar and Vedic wisdom keeper with mastery of the Bhagavad Gita, Upanishads, Vedas, Yoga Sutras of Patanjali, and Dharmashastra.

A seeker is facing this situation: "${situation}"
${mood ? `Their current mood: ${mood}` : ""}
${domain ? `Life domain: ${domain}` : ""}

Select the most relevant Sanskrit shloka (verse) from authentic scriptures that speaks directly to this situation. Choose from: Bhagavad Gita, Upanishads (Kena, Katha, Isha, Mundaka, Mandukya), Yoga Sutras, Rig Veda, Arthashastra, Chanakya Niti, or Thirukkural.

Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "shloka": "The exact Sanskrit shloka/verse in Devanagari script",
  "transliteration": "The romanized transliteration with diacritical marks",
  "source": "Source text and chapter/verse number (e.g., Bhagavad Gita 2.47, Katha Upanishad 1.2.23)",
  "wordByWord": "Brief word-by-word breakdown of key Sanskrit terms (3-5 key words)",
  "meaning": "The complete, beautiful English meaning of the shloka — 2-3 sentences",
  "application": "2-3 sentences explaining exactly how this shloka applies to the seeker's specific situation",
  "action": "One concrete action the seeker can take today inspired by this verse's teaching",
  "mantra": "A short mantra or phrase from this verse the seeker can repeat for contemplation"
}`;

    const raw = await callAI(apiKey, prompt, 900);
    const result = parseJSON(raw);
    return res.json(result);
  } catch (err: any) {
    console.error("Wisdom/shloka error:", err.message);
    return res.status(500).json({ error: "Failed to fetch shloka wisdom" });
  }
});

// ── POST /api/inner-voice/life-path ───────────────────────────────────────────
// Birth details are used only to build the prompt for this request; nothing is
// stored or logged. No ephemeris is computed here: the reading is an AI-written
// interpretation, and the prompt forbids inventing exact planetary positions.
const LIFE_PATH_FOCUS = ["general", "career", "relationships", "personal-growth", "finance"] as const;

router.post("/life-path", createRateLimiter({ windowMs: 60_000, max: 10 }), async (req: Request, res: Response) => {
  try {
    const { dob, tob, pob, focus = "general" } = req.body ?? {};

    const dobStr = typeof dob === "string" ? dob.trim() : "";
    const dobDate = new Date(dobStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr) || isNaN(dobDate.getTime())) {
      return res.status(400).json({ error: "A valid date of birth (YYYY-MM-DD) is required" });
    }
    if (dobDate > new Date() || dobDate.getFullYear() < 1900) {
      return res.status(400).json({ error: "Date of birth is out of range" });
    }
    if (!LIFE_PATH_FOCUS.includes(focus)) {
      return res.status(400).json({ error: "Invalid focus area" });
    }
    const tobStr = typeof tob === "string" && /^\d{2}:\d{2}$/.test(tob.trim()) ? tob.trim() : "";
    // Place is interpolated into the prompt, so keep it to plain place-name characters.
    const pobStr = typeof pob === "string" ? pob.trim() : "";
    if (pobStr && (pobStr.length > 100 || !/^[\p{L}\p{M}\d\s,.'’-]+$/u.test(pobStr))) {
      return res.status(400).json({ error: "Place of birth contains invalid characters" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not configured");
      return res.status(503).json({ error: "The reading service is not configured" });
    }

    const prompt = `You are a thoughtful Vedic astrology guide. Write an interpretive life-path reading for a person with these details:
- Date of birth: ${dobStr}
- Time of birth: ${tobStr || "not provided"}
- Place of birth: ${pobStr || "not provided"}
- Area of interest: ${focus}
- Today's date: ${new Date().toISOString().slice(0, 10)}

Rules:
- This is interpretive guidance for reflection, not certain knowledge of the future. Use soft language ("may", "tends to", "could").
- Do NOT state exact planetary degrees, house positions, or dasha dates; you have not computed a chart. If time/place are missing, do not pretend to know the ascendant.
- Only give broad time-based themes if you can ground them in general astrological ideas; otherwise set "upcomingPeriods" to an empty array.
- Never give medical, legal, or financial-product advice. No fear-based or fatalistic statements.
- Present future-oriented statements as possibilities to reflect on, never as events that will happen. Keep each section specific and non-repetitive; avoid generic filler.
- "nextSteps" must be practical, realistic actions the person can take in the next few weeks.

Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "lifePathOverview": "3-4 sentences on the person's general journey and temperament",
  "careerAndGrowth": "2-3 sentences on work, skills, and opportunities",
  "relationships": "2-3 sentences of reflective insight on relationships and communication",
  "personalDevelopment": "2-3 sentences on areas for self-improvement",
  "focusInsight": "2-3 sentences specific to the area of interest (${focus})",
  "upcomingPeriods": [{"period": "a broad timeframe label", "theme": "1-2 sentence theme"}],
  "nextSteps": ["a practical action for the next few weeks", "another", "another"],
  "reflectionQuestions": ["a question for self-reflection", "another question"]
}`;

    let raw: string;
    try {
      raw = await callAI(apiKey, prompt, 1200);
    } catch (err: any) {
      const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
      console.error("Life path provider error:", timedOut ? "timeout" : err?.name);
      return res
        .status(timedOut ? 504 : 502)
        .json({ error: timedOut ? "The reading service timed out" : "The reading service is unavailable" });
    }

    let result: any;
    try {
      result = parseJSON(raw);
    } catch {
      return res.status(502).json({ error: "The reading service returned an unreadable response" });
    }
    if (!result || typeof result.lifePathOverview !== "string" || !result.lifePathOverview.trim()) {
      return res.status(502).json({ error: "The reading service returned an incomplete response" });
    }
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    return res.json({
      lifePathOverview: result.lifePathOverview,
      careerAndGrowth: str(result.careerAndGrowth),
      relationships: str(result.relationships),
      personalDevelopment: str(result.personalDevelopment),
      focusInsight: str(result.focusInsight),
      upcomingPeriods: Array.isArray(result.upcomingPeriods)
        ? result.upcomingPeriods
            .filter((p: any) => p && typeof p.period === "string" && typeof p.theme === "string")
            .slice(0, 6)
        : [],
      nextSteps: Array.isArray(result.nextSteps)
        ? result.nextSteps.filter((q: unknown) => typeof q === "string" && q.trim()).slice(0, 4)
        : [],
      reflectionQuestions: Array.isArray(result.reflectionQuestions)
        ? result.reflectionQuestions.filter((q: unknown) => typeof q === "string").slice(0, 5)
        : [],
    });
  } catch (err: any) {
    console.error("Life path error:", err?.name);
    return res.status(500).json({ error: "Failed to generate life path reading" });
  }
});

// ── POST /api/inner-voice/tts ─────────────────────────────────────────────────
router.post("/tts", async (req: Request, res: Response) => {
  try {
    const { text, language } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "SARVAM_API_KEY not configured" });

    const langCode = (language as string)?.startsWith("en") ? "en-IN" : "hi-IN";
    console.log("[Sarvam TTS] Request — model: bulbul:v3, speaker: manan, lang:", langCode, "chars:", text.trim().length);

    const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        inputs: [text.slice(0, 500)],
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
      return res.status(502).json({ error: "Sarvam TTS request failed" });
    }

    const data = await sarvamRes.json() as any;
    const audio = data.audios?.[0];
    if (!audio) return res.status(502).json({ error: "No audio in Sarvam response" });

    return res.json({ audio });
  } catch (err: any) {
    console.error("TTS proxy error:", err.message);
    return res.status(500).json({ error: "TTS proxy failed" });
  }
});

export default router;
