import { Router, Request, Response } from "express";
import { createRateLimiter } from "../utils/rateLimit.js";

const router = Router();

// This AI endpoint is not called by the current Compatibility page; keep it from being used as an open, uncapped AI relay.
router.use(createRateLimiter({ windowMs: 60_000, max: 10 }));

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { p1, p2, scores } = req.body;

    if (!p1?.name || !p2?.name) {
      return res.status(400).json({ error: "Missing person data" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    const prompt = `You are an expert astrologer and relationship counselor. Given:
Person 1: ${p1.name}, born ${p1.dob}, Zodiac: ${p1.zodiac}, Life Path: ${p1.lifePath}, Place: ${p1.place || "unknown"}
Person 2: ${p2.name}, born ${p2.dob}, Zodiac: ${p2.zodiac}, Life Path: ${p2.lifePath}, Place: ${p2.place || "unknown"}
Compatibility scores already computed: Overall ${scores.overall}%, Love ${scores.love}%, Marriage ${scores.marriage}%

Respond ONLY with valid JSON (no markdown, no explanation) in exactly this structure:
{
  "loveInsight": "2 sentence personalized love insight mentioning their names",
  "marriageWindow": "Most favorable marriage period (year range)",
  "greenFlags": ["flag1","flag2","flag3","flag4","flag5"],
  "redFlags": ["flag1","flag2","flag3"],
  "timeline": {
    "attraction": "1 sentence",
    "connection": "1 sentence",
    "growth": "1 sentence",
    "commitment": "1 sentence",
    "marriage": "1 sentence",
    "stability": "1 sentence"
  },
  "aiInsights": [
    {"title": "Relationship Strengths", "text": "2-3 sentences personalized"},
    {"title": "Communication Style", "text": "2-3 sentences personalized"},
    {"title": "Love Languages", "text": "2-3 sentences personalized"},
    {"title": "Growth Opportunities", "text": "2-3 sentences personalized"},
    {"title": "Conflict Resolution", "text": "2-3 sentences personalized"},
    {"title": "Long-Term Vision", "text": "2-3 sentences personalized"}
  ]
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://spiritual-ai.app",
        "X-Title": "Spiritual AI Compatibility",
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      console.error("Compatibility provider error");
      return res.status(502).json({ error: "The reading service is unavailable right now" });
    }

    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.json(parsed);
  } catch (err: any) {
    console.error("Compatibility route error:", err);
    return res.status(500).json({ error: "Failed to generate compatibility report" });
  }
});

export default router;