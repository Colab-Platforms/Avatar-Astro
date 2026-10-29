import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";
import { SHLOKAS, SHLOKA_BY_ID, type Shloka } from "@/data/shlokaCatalog";

export const MAX_SITUATION_CHARS = 600;

/** A verse from the curated catalog plus the AI-written personal reflection. */
export interface WisdomResult {
  verified: true;
  id: string;
  source: string;
  chapter: string;
  devanagari: string;
  transliteration: string;
  meaning: string;
  context: string;
  application: string;
  deeperWisdom: string;
  action: string;
  reflectionQuestion: string;
}

export class ShlokaError extends Error {}

function catalogFor(scripture: string): Shloka[] {
  const filtered = SHLOKAS.filter((s) => s.source === scripture);
  return filtered.length ? filtered : SHLOKAS;
}

export function buildPrompt(scripture: string): string {
  const list = catalogFor(scripture)
    .map((s) => `- id: ${s.id} | ${s.source} ${s.reference} | themes: ${s.themes.join(", ")} | ${s.meaning}`)
    .join("\n");
  return `You help a person reflect on a situation using one verse from a fixed list. You do NOT write or recall Sanskrit yourself: choose exactly one verse by its id from the list below, then write the reflection.

Verses:
${list}

Rules:
- Pick the verse whose meaning genuinely fits what the person describes. Do not force a fit; choose the closest and be honest about how it applies.
- Explain how the verse's actual meaning (as given above) relates to their situation. Do not attribute ideas to the verse that it does not contain.
- Write in the language the person used (English, Hindi in Roman script, or Hinglish). Be specific, warm and concise; no fear, no guaranteed outcomes, no medical, legal or financial advice.

Return ONLY a JSON object:
{
  "id": "one id from the list",
  "application": "2-3 sentences on how this verse speaks to their situation",
  "deeperWisdom": "1-2 sentences on the underlying idea",
  "action": "one concrete, realistic thing they can do today",
  "reflectionQuestion": "one question for journaling"
}`;
}

const str = (v: unknown, max = 700) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validate a model reply and merge it with the catalog verse. Returns null if the id is not a catalog verse. */
export function parseWisdom(raw: string): WisdomResult | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const verse = typeof obj.id === "string" ? SHLOKA_BY_ID[obj.id.trim()] : undefined;
  const application = str(obj.application);
  if (!verse || !application) return null;
  return {
    verified: true,
    id: verse.id,
    source: verse.source,
    chapter: verse.reference,
    devanagari: verse.devanagari,
    transliteration: verse.transliteration,
    meaning: verse.meaning,
    context: verse.context,
    application,
    deeperWisdom: str(obj.deeperWisdom),
    action: str(obj.action),
    reflectionQuestion: str(obj.reflectionQuestion, 300),
  };
}

export function shareText(r: { source?: string; chapter?: string; devanagari?: string; transliteration?: string; meaning?: string }): string {
  return [`${r.source ?? ""} ${r.chapter ?? ""}`.trim(), r.devanagari, r.transliteration, r.meaning].filter(Boolean).join("\n\n");
}

export async function fetchWisdom(situation: string, scripture: string): Promise<WisdomResult> {
  let res: Response;
  try {
    res = await aiChat({
      temperature: 0.5,
      max_tokens: 900,
      json: true,
      messages: [
        { role: "system", content: buildPrompt(scripture) },
        { role: "user", content: `My situation: ${situation.trim().slice(0, MAX_SITUATION_CHARS)}` },
      ],
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw new ShlokaError("Please sign in to continue.");
    throw new ShlokaError("We couldn't reach the service. Check your connection and try again.");
  }
  if (res.status === 429) throw new ShlokaError("Too many requests. Please wait a minute and try again.");
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new ShlokaError("The service is unavailable right now. Please try again in a moment.");
  const result = parseWisdom(data?.choices?.[0]?.message?.content ?? "");
  if (!result) throw new ShlokaError("We couldn't match a verse this time. Please try again.");
  return result;
}
