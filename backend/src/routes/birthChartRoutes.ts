import { Router, Request, Response } from "express";
import { createRateLimiter } from "../utils/rateLimit.js";
import { auth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(auth("USER"));

// These AI endpoints are not called by the current Birth Chart page; keep them from being used as an open, uncapped AI relay.
router.use(createRateLimiter({ windowMs: 60_000, max: 10 }));

// ── POST /api/birthchart/analyze ─────────────────────────────────────────────
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { name, zodiac, lifePath, dob, place } = req.body;

    if (!name || !zodiac) {
      return res.status(400).json({ error: "Missing name or zodiac" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    const prompt = `You are a world-class vedic astrologer and spiritual life coach. Generate a deeply personalized birth chart reading for:

Name: ${name}
Zodiac: ${zodiac}
Life Path Number: ${lifePath}
Date of Birth: ${dob}
Birth Place: ${place || "unknown"}

Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "purpose": "A powerful, personal 1-2 sentence life mission statement for ${name}. Reference their zodiac and life path. Make it cinematic and inspiring.",
  "archetypes": [
    {"icon": "🦅", "name": "ArchetypeName", "desc": "Short description"},
    {"icon": "🎨", "name": "ArchetypeName2", "desc": "Short description"},
    {"icon": "👑", "name": "ArchetypeName3", "desc": "Short description"}
  ],
  "powers": [
    {"icon": "⚡", "name": "Power Name", "desc": "1-2 sentence personalized description"},
    {"icon": "🔮", "name": "Power Name", "desc": "1-2 sentence personalized description"},
    {"icon": "📚", "name": "Power Name", "desc": "1-2 sentence personalized description"},
    {"icon": "🗣", "name": "Power Name", "desc": "1-2 sentence personalized description"},
    {"icon": "🎯", "name": "Power Name", "desc": "1-2 sentence personalized description"}
  ],
  "shadows": [
    {"icon": "🌀", "name": "Challenge Name", "tip": "Growth suggestion specific to ${zodiac}"},
    {"icon": "⏳", "name": "Challenge Name", "tip": "Growth suggestion"},
    {"icon": "🛡", "name": "Challenge Name", "tip": "Growth suggestion"},
    {"icon": "💫", "name": "Challenge Name", "tip": "Growth suggestion"}
  ],
  "loveLanguage": "Primary love language",
  "relStyle": "Relationship style label",
  "attachment": "Attachment style",
  "idealPartner": "Ideal partner description",
  "emotionalNeed": "Core emotional need",
  "spiritMeaning": [
    "Trait 1 related to their spirit animal and zodiac",
    "Trait 2",
    "Trait 3",
    "Trait 4"
  ],
  "mustDo": [
    "Action 1 personalized for ${name}",
    "Action 2",
    "Action 3",
    "Action 4",
    "Action 5"
  ],
  "mustAvoid": [
    "Thing to avoid 1 personalized for ${zodiac}",
    "Thing to avoid 2",
    "Thing to avoid 3",
    "Thing to avoid 4",
    "Thing to avoid 5"
  ]
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://spiritual-ai.app",
        "X-Title": "Spiritual AI Birth Chart",
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 1800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json() as any;
    if (data.error) { console.error("Birth chart provider error"); return res.status(502).json({ error: "The reading service is unavailable right now" }); }

    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.json(parsed);
  } catch (err: any) {
    console.error("Birth chart analyze error:", err);
    return res.status(500).json({ error: "Failed to generate reading" });
  }
});

// ── POST /api/birthchart/chat ─────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { question, chartData } = req.body;

    if (!question) return res.status(400).json({ error: "Missing question" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OpenRouter API key not configured" });

    const prompt = `You are a gifted vedic astrologer and spiritual life coach. You have deeply studied the birth chart of:

Name: ${chartData?.name || "this person"}
Zodiac Sign: ${chartData?.zodiac || "unknown"}
Life Path Number: ${chartData?.lifePath || "unknown"}
Date of Birth: ${chartData?.dob || "unknown"}
Birth Place: ${chartData?.place || "unknown"}

Answer the following question with COMPLETE SPECIFICITY to this person's zodiac, life path, and name. 
- Mention their name (${chartData?.name}) at least once
- Reference their zodiac sign (${chartData?.zodiac}) and how it specifically shapes your answer
- Be warm, poetic, and insightful — but NEVER generic
- 4-6 sentences
- Do NOT start with "As your astrologer" or any preamble — start directly with the insight

Question: "${question}"`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://spiritual-ai.app",
        "X-Title": "Spiritual AI Chart Chat",
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json() as any;
    if (data.error) { console.error("Birth chart provider error"); return res.status(502).json({ error: "The reading service is unavailable right now" }); }

    const answer = data.choices?.[0]?.message?.content || "";
    return res.json({ answer });
  } catch (err: any) {
    console.error("Chart chat error:", err);
    return res.status(500).json({ error: "Failed to answer" });
  }
});

export default router;