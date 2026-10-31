import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";

export const MIN_SITUATION_CHARS = 10;
export const MAX_SITUATION_CHARS = 1500;

export interface KarmaReading {
  lifeDomain: string;
  overview: string;
  meaning: string;
  insights: { title: string; text: string }[];
  soulLesson: string;
  guidance: string[];
  practice: string;
  reflectionQuestion: string;
  affirmation: string;
}

export const KARMA_SYSTEM_PROMPT = `You are a thoughtful guide in the Vedic tradition. A person shares a situation; you offer a reflective karma reading as one interpretive lens, never as fact.

Rules:
- Reply in the language the person wrote in (Hindi, English or Hinglish), in plain, warm, specific language. Refer to details they actually mention; do not give generic filler.
- You have NO birth details, so do not name planets, houses, dashas or past lives, and do not claim to know what caused their situation.
- Never predict guaranteed events, diagnose health conditions, or use fear, guilt or "karmic debt" framing. Emphasise agency: karma is shaped by present choices.
- For health, money or relationship distress, gently encourage appropriate professional or trusted human support inside "guidance".
- Keep each field short and non-repetitive. Do not repeat the same idea across fields.

Return ONLY a JSON object with exactly these keys:
{
  "lifeDomain": "one of: Career, Relationships, Health, Finance, Family, Mind, Spiritual, Other",
  "overview": "2-3 sentences summarising what they described and the theme of the reading",
  "meaning": "2-3 sentences: how this situation can be understood through the idea of karma (action and consequence, habits, intentions)",
  "insights": [{"title": "short title", "text": "1-2 sentences"}, ... 2 or 3 items],
  "soulLesson": "1-2 sentences on what this situation may be inviting them to learn",
  "guidance": ["3 or 4 specific, realistic actions they can take this week"],
  "practice": "one simple optional practice (e.g. a short mantra such as 'Om Namah Shivaya' with a count, or a few minutes of silence or service). Optional and gentle, not a purchase or ritual they must perform",
  "reflectionQuestion": "one open question for their journaling",
  "affirmation": "one short affirmation in English"
}`;

const str = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Pull a JSON object out of a model reply (tolerates code fences and surrounding prose). */
function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Validate a model reply into a KarmaReading, or return null if it is unusable. */
export function parseKarmaReading(raw: string): KarmaReading | null {
  const obj = extractJson(raw) as Record<string, unknown> | null;
  if (!obj || typeof obj !== "object") return null;

  const overview = str(obj.overview);
  const meaning = str(obj.meaning);
  const insights = (Array.isArray(obj.insights) ? obj.insights : [])
    .map((i) => ({ title: str((i as Record<string, unknown>)?.title, 80), text: str((i as Record<string, unknown>)?.text) }))
    .filter((i) => i.title && i.text)
    .slice(0, 3);
  const guidance = (Array.isArray(obj.guidance) ? obj.guidance : []).map((g) => str(g, 300)).filter(Boolean).slice(0, 4);

  // The reading is only useful if the core sections are present.
  if (!overview || !meaning || guidance.length === 0) return null;

  return {
    lifeDomain: str(obj.lifeDomain, 40),
    overview,
    meaning,
    insights,
    soulLesson: str(obj.soulLesson),
    guidance,
    practice: str(obj.practice, 300),
    reflectionQuestion: str(obj.reflectionQuestion, 300),
    affirmation: str(obj.affirmation, 200),
  };
}

export class KarmaReadingError extends Error {}

/** Request a karma reading. Throws KarmaReadingError with a user-safe message. */
export async function fetchKarmaReading(situation: string): Promise<KarmaReading> {
  const text = situation.trim().slice(0, MAX_SITUATION_CHARS);
  let res: Response;
  try {
    res = await aiChat({
      temperature: 0.6,
      max_tokens: 1500,
      json: true,
      library: { feature: "karma" },
      messages: [
        { role: "system", content: KARMA_SYSTEM_PROMPT },
        { role: "user", content: `My situation: ${text}` },
      ],
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw new KarmaReadingError("Please sign in to continue.");
    throw new KarmaReadingError("We couldn't reach the reading service. Check your connection and try again.");
  }
  if (res.status === 429) throw new KarmaReadingError("Too many requests. Please wait a minute and try again.");
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new KarmaReadingError("The reading service is unavailable right now. Please try again in a moment.");
  const reading = parseKarmaReading(data?.choices?.[0]?.message?.content ?? "");
  if (!reading) throw new KarmaReadingError("The reading came back incomplete. Please try again.");
  return reading;
}
