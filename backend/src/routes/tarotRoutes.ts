import { Router, Request, Response } from "express";
import express from "express";
import { createRateLimiter } from "../utils/rateLimit.js";

/**
 * Tarot reading endpoint. The browser draws the cards (random draw from the 22
 * Major Arcana); this route validates them, asks the model to interpret exactly
 * those cards, and returns a sanitised reading. Card names and positions in the
 * response always come from the validated request, never from model output.
 */
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemma-3-27b-it";
const TIMEOUT_MS = 45_000;
const MAX_FIELD_CHARS = 1200;

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant",
  "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man",
  "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];
const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
export const VALID_CARD_NAMES = new Set<string>([
  ...MAJOR_ARCANA,
  ...SUITS.flatMap((s) => RANKS.map((r) => `${r} of ${s}`)),
]);

export const TIMELINE_POSITIONS = ["Past Energy", "Current Energy", "Hidden Influence", "Next 6 Months", "Future Potential"];
export const KARMA_POSITIONS = ["Current Karma", "Hidden Blockage", "Healing Path"];
export const CATEGORIES = ["Career", "Love", "Marriage", "Business", "Finance", "Health", "Life Purpose"];

const router = Router();
router.use(express.json({ limit: "20kb" }));
router.use(createRateLimiter({ windowMs: 60_000, max: 10 }));

const fail = (res: Response, status: number, error: string) => res.status(status).json({ success: false, error });

const text = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_FIELD_CHARS) : undefined;

const GUARDRAILS = `Rules:
- Interpret ONLY the cards listed, in the positions listed. Do not add, remove or rename cards.
- This is reflective guidance for personal interest, not prediction. Do not state guaranteed outcomes, specific dates, or that anything "will" happen.
- Do not give medical, legal, financial or relationship-ending advice, and do not make claims about death, illness or pregnancy.
- Do not mention planetary positions or astrological calculations; no chart has been computed.
- Do not include numeric scores or percentages.
- Write plain, warm, specific sentences. Do not repeat the same point across fields.`;

function buildPrompt(mode: "timeline" | "karma", cards: string[], category?: string): string {
  const spread = (mode === "timeline" ? TIMELINE_POSITIONS : KARMA_POSITIONS)
    .map((p, i) => `${i + 1}. ${p}: ${cards[i]}`)
    .join("\n");

  if (mode === "timeline") {
    return `You are a thoughtful tarot reader. The seeker's topic is: ${category ?? "their life path"}.

Their 5-card Life Timeline spread (each card is a Major Arcana card, upright):
${spread}

${GUARDRAILS}

Return ONLY valid JSON (no markdown, no fences) with exactly this structure:
{
  "currentLifeStage": "2-3 sentences on what the cards suggest about where the seeker is now, in the context of the topic",
  "mainOpportunity": "2-3 sentences on the strongest supportive theme in the spread",
  "hiddenChallenge": "2-3 sentences on a pattern or obstacle worth being honest about",
  "nextMajorTurningPoint": "2-3 sentences on a theme to prepare for, described as a possibility, with no dates",
  "recommendedAction": "1-2 sentences of one concrete, practical step the seeker could take",
  "spiritualGuidance": "2-3 sentences of reflective guidance for the coming week",
  "timelineNarrative": [
    {"insight": "2-3 sentences on the Past Energy card in the context of the topic"},
    {"insight": "2-3 sentences on the Current Energy card"},
    {"insight": "2-3 sentences on the Hidden Influence card"},
    {"insight": "2-3 sentences on the Next 6 Months card, as themes to prepare for rather than predictions"},
    {"insight": "2-3 sentences on the Future Potential card, as one possible direction"}
  ],
  "overallMessage": "3-4 sentences that bring the whole reading together"
}`;
  }

  return `You are a thoughtful tarot reader helping a seeker reflect on recurring patterns. They drew these 3 Karma Mirror cards (Major Arcana, upright):
${spread}

${GUARDRAILS}
- "Karma" here means a reflective lens on recurring patterns, not a claim about past lives or fate.

Return ONLY valid JSON (no markdown, no fences) with exactly this structure:
{
  "currentKarmaTheme": "2-3 sentences naming the central pattern the cards point to",
  "rootCause": "2-3 sentences on where such a pattern might come from (habits, beliefs, experiences)",
  "lifeAreasAffected": ["up to 4 short life areas, for example Career"],
  "dailyAction": "One specific daily practice",
  "weeklyAction": "One deeper weekly action",
  "spiritualPractice": "A simple meditation, journaling prompt or ritual linked to the Healing Path card",
  "recommendedHabit": "One habit to build over time",
  "reflectionQuestion": "One introspective question",
  "positiveAffirmation": "One affirmation based on the Healing Path card",
  "cardInsights": [
    {"insight": "2-3 sentences on the Current Karma card"},
    {"insight": "2-3 sentences on the Hidden Blockage card"},
    {"insight": "2-3 sentences on the Healing Path card"}
  ]
}`;
}

const pickInsights = (raw: unknown, positions: string[], cards: string[]) => {
  if (!Array.isArray(raw) || raw.length < positions.length) return null;
  const out = [];
  for (let i = 0; i < positions.length; i++) {
    const insight = text((raw[i] as { insight?: unknown } | undefined)?.insight);
    if (!insight) return null;
    out.push({ position: positions[i], card: cards[i], insight });
  }
  return out;
};

export function sanitizeReading(mode: "timeline" | "karma", parsed: any, cards: string[]) {
  if (!parsed || typeof parsed !== "object") return null;
  if (mode === "timeline") {
    const timelineNarrative = pickInsights(parsed.timelineNarrative, TIMELINE_POSITIONS, cards);
    const currentLifeStage = text(parsed.currentLifeStage);
    const overallMessage = text(parsed.overallMessage);
    if (!timelineNarrative || !currentLifeStage || !overallMessage) return null;
    return {
      currentLifeStage,
      mainOpportunity: text(parsed.mainOpportunity),
      hiddenChallenge: text(parsed.hiddenChallenge),
      nextMajorTurningPoint: text(parsed.nextMajorTurningPoint),
      recommendedAction: text(parsed.recommendedAction),
      spiritualGuidance: text(parsed.spiritualGuidance),
      timelineNarrative,
      overallMessage,
    };
  }
  const cardInsights = pickInsights(parsed.cardInsights, KARMA_POSITIONS, cards);
  const currentKarmaTheme = text(parsed.currentKarmaTheme);
  if (!cardInsights || !currentKarmaTheme) return null;
  return {
    currentKarmaTheme,
    rootCause: text(parsed.rootCause),
    lifeAreasAffected: Array.isArray(parsed.lifeAreasAffected)
      ? parsed.lifeAreasAffected.map((a: unknown) => text(a)?.slice(0, 40)).filter(Boolean).slice(0, 4)
      : [],
    dailyAction: text(parsed.dailyAction),
    weeklyAction: text(parsed.weeklyAction),
    spiritualPractice: text(parsed.spiritualPractice),
    recommendedHabit: text(parsed.recommendedHabit),
    reflectionQuestion: text(parsed.reflectionQuestion),
    positiveAffirmation: text(parsed.positiveAffirmation),
    cardInsights,
  };
}

router.post("/reading", async (req: Request, res: Response) => {
  const { mode, question, cards } = req.body ?? {};

  if (mode !== "timeline" && mode !== "karma") return fail(res, 400, "mode must be 'timeline' or 'karma'");
  const expected = mode === "timeline" ? 5 : 3;
  if (!Array.isArray(cards) || cards.length !== expected) {
    return fail(res, 400, `A ${mode} reading needs exactly ${expected} cards`);
  }
  const names: string[] = cards.map((c: unknown) => (typeof c === "string" ? c : (c as { name?: unknown } | null)?.name) as string);
  if (names.some((n) => typeof n !== "string" || !VALID_CARD_NAMES.has(n))) return fail(res, 400, "Unknown tarot card in request");
  if (new Set(names).size !== names.length) return fail(res, 400, "Cards must be different from each other");

  let category: string | undefined;
  if (mode === "timeline") {
    if (question !== undefined && question !== "" && !CATEGORIES.includes(question)) return fail(res, 400, "Unknown question category");
    category = question || undefined;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not configured");
    return fail(res, 503, "The reading service is not configured");
  }

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "MyBhagya Astro Tarot",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: buildPrompt(mode, names, category) }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!upstream.ok) {
      console.error("Tarot provider error status:", upstream.status);
      return fail(res, 502, "The reading service is unavailable right now");
    }
    const body = (await upstream.json().catch(() => null)) as any;
    const content: string = body?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    let parsed: unknown = null;
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
    const reading = sanitizeReading(mode, parsed, names);
    if (!reading) {
      console.error("Tarot provider returned an unusable reading");
      return fail(res, 502, "The reading came back incomplete. Please try again");
    }
    return res.json({ success: true, data: reading });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") return fail(res, 504, "The reading took too long. Please try again");
    console.error("Tarot reading error:", (err as Error)?.message);
    return fail(res, 502, "The reading service is unavailable right now");
  }
});

export default router;
