import { Router, Request, Response } from "express";
import { createRateLimiter } from "../utils/rateLimit.js";

const router = Router();

// The Cosmic Blueprint page now calculates everything in the browser and no longer calls this endpoint.
// It is kept (rate-limited) only so older clients do not break; it still falls back to canned text, so do not build on it.
router.use(createRateLimiter({ windowMs: 60_000, max: 10 }));

interface NarrativeRequest {
  name: string;
  dob: string;
  zodiac?: string;
  lifePath: number;
  destiny: number;
  soulUrge: number;
  personality: number;
  chaldean: number;
  lifePathPlanet: string;
  destinyPlanet: string;
  overallScore: number;
  topVariant?: { spelling: string; score: number; planet: string };
}

function mockNarrative(body: NarrativeRequest) {
  const { name, lifePath, destiny, lifePathPlanet, destinyPlanet, overallScore, topVariant } = body;
  return {
    frictionExplanation: `Your current name "${name}" resonates with Destiny Number ${destiny}, ruled by ${destinyPlanet}. Your Life Path Number is ${lifePath}, ruled by ${lifePathPlanet}. ${
      destinyPlanet === lifePathPlanet
        ? `Since both are ruled by ${destinyPlanet}, your name and birth energy tend to reinforce each other.`
        : `This creates a subtle interplay between the two energies — not a conflict, but a dynamic worth understanding as you grow.`
    } Your overall alignment score is ${overallScore}%.`,
    wealthPotential: `With a Destiny Number of ${destiny}, your name carries a vibration that may support steady financial growth when paired with consistent effort.`,
    relationshipEnergy: `Numbers linked to ${destinyPlanet} often bring warmth and depth in close relationships, though this varies with life experience.`,
    careerAlignment: `A ${destinyPlanet}-ruled Destiny Number ${destiny} tends to align with roles that reward clarity, structure, and communication.`,
    remedies: [
      "Chant your ruling planet's mantra on its corresponding weekday.",
      "Wear a gemstone associated with your Destiny Number after consulting a practitioner.",
      "Keep your lucky color visible in your workspace.",
      "Practice a short daily gratitude or meditation ritual.",
    ],
    signatureAnalysisNote: `A signature with an upward slant and a confident underline may help reinforce your Destiny Number ${destiny} energy.`,
    topVariantExplanation: topVariant
      ? `The spelling "${topVariant.spelling}" may tend to align more closely with your birth energy, shifting resonance toward ${topVariant.planet}, though this is a directional signal rather than a guarantee.`
      : "Exploring alternate spellings may reveal a stronger alignment with your birth energy.",
  };
}

router.post("/narrative", async (req: Request, res: Response) => {
  try {
    const body = req.body as NarrativeRequest;
    const { name, dob, lifePath, destiny } = body;

    if (!name || !dob || lifePath === undefined || destiny === undefined) {
      return res.status(400).json({ error: "Missing required numerology fields" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.json(mockNarrative(body));
    }

    const {
      zodiac,
      soulUrge,
      personality,
      chaldean,
      lifePathPlanet,
      destinyPlanet,
      overallScore,
      topVariant,
    } = body;

    const prompt = `You are a world-class numerologist and vedic astrologer writing a premium personalized name-analysis report for:

Name: ${name}
Date of Birth: ${dob}
Zodiac: ${zodiac || "unknown"}
Life Path Number: ${lifePath} (ruled by ${lifePathPlanet})
Destiny Number: ${destiny} (ruled by ${destinyPlanet})
Soul Urge Number: ${soulUrge}
Personality Number: ${personality}
Chaldean Name Number: ${chaldean}
Overall Alignment Score: ${overallScore}%
${topVariant ? `Top recommended spelling: "${topVariant.spelling}" (score ${topVariant.score}, ruled by ${topVariant.planet})` : ""}

Use ONLY the numbers and planets given above — do not invent new ones. Write in a warm, insightful, cinematic tone, similar to: "Your current name resonates with Number 8 which is ruled by Saturn. However your Life Path Number is 3 ruled by Jupiter. This creates friction between communication and opportunity."

IMPORTANT: Phrase any effect of changing the name spelling as a possibility, not a guarantee — use language like "may support", "tends to align with", "can help". Never claim a guaranteed real-world outcome.

Respond ONLY with valid JSON (no markdown, no code fences) in EXACTLY this structure:
{
  "frictionExplanation": "2-4 sentence explanation of the relationship between the Destiny Number/planet and Life Path Number/planet, referencing the actual numbers given",
  "wealthPotential": "1-2 sentence narrative on wealth/money vibration",
  "relationshipEnergy": "1-2 sentence narrative on relationship/marriage energy",
  "careerAlignment": "1-2 sentence narrative on career/industry alignment",
  "remedies": ["remedy 1", "remedy 2", "remedy 3", "remedy 4"],
  "signatureAnalysisNote": "1-2 sentence note on signature style/energy",
  "topVariantExplanation": "1-2 sentence explanation of why the recommended spelling may score higher, non-definitive phrasing"
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://spiritual-ai.app",
        "X-Title": "Spiritual AI Name Destiny Report",
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = (await response.json()) as any;
    if (data.error) {
      console.warn("Name analysis narrative: OpenRouter error, using fallback.", data.error?.message);
      return res.json(mockNarrative(body));
    }

    const raw = data.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return res.json(parsed);
    } catch {
      console.warn("Name analysis narrative: failed to parse AI JSON, using fallback.");
      return res.json(mockNarrative(body));
    }
  } catch (err: any) {
    console.error("Name analysis narrative error:", err);
    try {
      return res.json(mockNarrative(req.body as NarrativeRequest));
    } catch {
      return res.status(500).json({ error: "Failed to generate name analysis narrative" });
    }
  }
});

export default router;
