import { Router, Request, Response } from "express";
import { createRateLimiter } from "../utils/rateLimit.js";
import { auth } from "../middleware/authMiddleware.js";
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from "../modules/payment/toolBilling.service.js";
import { TOOL_KEYS } from "../modules/payment/toolKeys.js";
import { ApiError } from "../utils/ApiError.js";
import { WrongLanguageError, generateInLanguage, languageRule, requestLanguage, tokenBudget } from "../utils/responseLanguage.js";

class ProviderDown extends Error {}

const router = Router();
router.use(auth("USER"));

// This AI endpoint is not called by the current Compatibility page; keep it from being used as an open, uncapped AI relay.
router.use(createRateLimiter({ windowMs: 60_000, max: 10 }));

// The live Compatibility page compares signs in the browser and calls this first purely to consume one use of
// the admin's per-24h "compatibility" limit before showing a result.
router.post("/check", (_req: Request, res: Response) => {
  res.json({ success: true });
});

router.post("/analyze", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;

  try {
    const { p1, p2, scores } = req.body;

    if (!p1?.name || !p2?.name) {
      return res.status(400).json({ error: "Missing person data" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    if (userId) {
      billed = await reserveToolExecution(userId, TOOL_KEYS.COMPAT_ANALYZE, executionId);
      if (billed.alreadySettled) return res.json(billed.execution!.resultPayload);
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

    const lang = requestLanguage(req); // the visitor's chosen language, if any; otherwise the reading is in English as before
    let raw: string;
    try {
      raw = await generateInLanguage(lang, async (retryNote) => {
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
          max_tokens: tokenBudget(1200, lang),
          messages: [{ role: "user", content: prompt + languageRule(lang, "") + retryNote }],
        }),
      });

      const data = await response.json() as any;

      if (data.error) { console.error("AI provider error"); throw new ProviderDown(); }

              return data.choices?.[0]?.message?.content || "";
      });
    } catch (e) {
      if (userId && billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
      if (e instanceof WrongLanguageError) return res.status(502).json({ error: e.message, code: e.code, language: e.language });
      if (e instanceof ProviderDown) return res.status(502).json({ error: "The reading service is unavailable right now" });
      throw e;
    }
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (userId && billed && !billed.skip) await settleToolExecution(executionId, parsed);
    return res.json(parsed);
  } catch (err: any) {
    if (userId && billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (err instanceof ApiError) return res.status(err.statusCode).json({ error: err.message });
    console.error("Compatibility route error:", err);
    return res.status(500).json({ error: "Failed to generate compatibility report" });
  }
});

export default router;