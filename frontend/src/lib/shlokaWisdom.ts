import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";
import i18n from "@/i18n";
import { chosenLanguage, isInLanguage } from "@/i18n/aiLanguage";
import { localeInfo, type LocaleCode } from "@/i18n/languages";
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

/** `language` is the chosen language, when the visitor chose one: the reflection is then written in it (the server adds the exact instruction). */
export function buildPrompt(scripture: string, language?: LocaleCode): string {
  const list = catalogFor(scripture)
    .map((s) => `- id: ${s.id} | ${s.source} ${s.reference} | themes: ${s.themes.join(", ")} | ${s.meaning}`)
    .join("\n");
  return `You help a person reflect on a situation using one verse from a fixed list. You do NOT write or recall Sanskrit yourself: choose exactly one verse by its id from the list below, then write the reflection.

Verses:
${list}

Rules:
- Pick the verse whose meaning genuinely fits what the person describes. Do not force a fit; choose the closest and be honest about how it applies.
- Explain how the verse's actual meaning (as given above) relates to their situation. Do not attribute ideas to the verse that it does not contain.
- ${language ? "Write in the chosen language." : "Write in the language the person used (English, Hindi in Roman script, or Hinglish)."} Be specific, warm and concise; no fear, no guaranteed outcomes, no medical, legal or financial advice.

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
  const language = chosenLanguage(); // the reflection is written in the language the visitor chose (nothing is sent if they never chose one)
  const first = await askOnce(situation, scripture, language, "");
  if (!language || inChosenLanguage(first, language)) return first;
  // The model answered in another language: ask once more, firmly; if it still does not comply the reflection is not shown.
  const name = localeInfo(language).english;
  const second = await askOnce(situation, scripture, language,
    `Your previous reply was not written in ${name}. Write the whole reflection again, entirely in ${name} (${localeInfo(language).native}), in its own script.`);
  if (inChosenLanguage(second, language)) return second;
  throw new ShlokaError(i18n.t("guru.errors.wrongLanguage", { lng: language }));
}

/** Only the model's own words are judged (the verse text comes from the catalog). */
function inChosenLanguage(r: WisdomResult, language: LocaleCode): boolean {
  return isInLanguage([r.application, r.deeperWisdom, r.action, r.reflectionQuestion].filter(Boolean).join(String.fromCharCode(10)), language);
}

async function askOnce(situation: string, scripture: string, language: LocaleCode | undefined, retryNote: string): Promise<WisdomResult> {
  let res: Response;
  try {
    res = await aiChat({
      temperature: 0.5,
      max_tokens: 900,
      json: true,
      library: { feature: "shloka" },
      language,
      messages: [
        { role: "system", content: buildPrompt(scripture, language) },
        ...(retryNote ? [{ role: "system" as const, content: retryNote }] : []),
        { role: "user", content: `My situation: ${situation.trim().slice(0, MAX_SITUATION_CHARS)}` },
      ],
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw new ShlokaError(i18n.t("karma.shloka.signIn"));
    throw new ShlokaError(i18n.t("karma.shloka.network"));
  }
  if (res.status === 429) throw new ShlokaError(i18n.t("karma.shloka.rate"));
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new ShlokaError(i18n.t("karma.shloka.unavailable"));
  const result = parseWisdom(data?.choices?.[0]?.message?.content ?? "");
  if (!result) throw new ShlokaError(i18n.t("karma.shloka.noMatch"));
  return result;
}
