/**
 * The language an AI reply is written in.
 *
 * The browser tells the server which language the visitor chose (header "X-App-Language", or a `language` field in the body). The
 * value is checked against a fixed list of ten languages; anything else is ignored, so it can never carry text into a prompt.
 * The model is then asked to WRITE in that language directly. Nothing is machine-translated afterwards and no paid translation
 * service is used.
 *
 * When no language was chosen, `languageRule(undefined, fallback)` returns the caller's own existing rule, so features keep
 * behaving exactly as before for visitors who never picked a language.
 */
import type { Request } from "express";
import { CALENDAR_WORDS } from "./responseLanguage.terms.js";

export const RESPONSE_LANGUAGES = ["en", "hi", "mr", "ta", "te", "gu", "bn", "kn", "ml", "pa"] as const;
export type ResponseLanguage = (typeof RESPONSE_LANGUAGES)[number];

interface LanguageInfo {
  english: string;
  native: string;
  script: string;
  /** Matches one letter of the language's script. */
  letter: RegExp;
}

const INFO: Record<ResponseLanguage, LanguageInfo> = {
  en: { english: "English", native: "English", script: "Latin", letter: /[A-Za-z]/ },
  hi: { english: "Hindi", native: "हिन्दी", script: "Devanagari", letter: /[ऀ-ॿ]/ },
  mr: { english: "Marathi", native: "मराठी", script: "Devanagari", letter: /[ऀ-ॿ]/ },
  ta: { english: "Tamil", native: "தமிழ்", script: "Tamil", letter: /[஀-௿]/ },
  te: { english: "Telugu", native: "తెలుగు", script: "Telugu", letter: /[ఀ-౿]/ },
  gu: { english: "Gujarati", native: "ગુજરાતી", script: "Gujarati", letter: /[઀-૿]/ },
  bn: { english: "Bengali", native: "বাংলা", script: "Bengali", letter: /[ঀ-৿]/ },
  kn: { english: "Kannada", native: "ಕನ್ನಡ", script: "Kannada", letter: /[ಀ-೿]/ },
  ml: { english: "Malayalam", native: "മലയാളം", script: "Malayalam", letter: /[ഀ-ൿ]/ },
  pa: { english: "Punjabi", native: "ਪੰਜਾਬੀ", script: "Gurmukhi", letter: /[਀-੿]/ },
};

export const languageInfo = (lang: ResponseLanguage): LanguageInfo => INFO[lang];

/** "ta", "TA", "ta-IN" or "ta_IN" give "ta". Anything that is not one of the ten languages gives undefined. */
export function parseResponseLanguage(value: unknown): ResponseLanguage | undefined {
  if (typeof value !== "string") return undefined;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return (RESPONSE_LANGUAGES as readonly string[]).includes(base) ? (base as ResponseLanguage) : undefined;
}

/** The language the visitor chose: the X-App-Language header, else a `language` field in the body. Undefined if none was chosen. */
export function requestLanguage(req: Pick<Request, "headers" | "body">): ResponseLanguage | undefined {
  const header = req.headers?.["x-app-language"];
  return parseResponseLanguage(Array.isArray(header) ? header[0] : header) ?? parseResponseLanguage((req.body as any)?.language);
}

/**
 * The instruction added to a prompt. It is written in English (the models follow English instructions best) and asks for natural
 * writing in the chosen language and script, not a word-for-word translation.
 */
export function languageDirective(lang: ResponseLanguage): string {
  if (lang === "en") {
    return "Language: write every human-readable text value in clear, simple English. Keep JSON keys and fixed values exactly as specified. Do not mention these language instructions.";
  }
  const i = INFO[lang];
  return [
    `Language: write every human-readable text value in natural, simple ${i.english} (${i.native}), in ${i.script} script, the way an educated native speaker would say it. Write it directly in ${i.english}; do not translate word for word from English, and do not mix in English sentences.`,
    `Keep JSON keys, fixed/enumerated values and numbers exactly as specified, and write numbers with the digits 0-9. Keep names of people and places as they are.`,
    `Astrology and Hindu-calendar terms (tithi, nakshatra, rashi, dasha, yoga, karana, muhurat, Panchang and the like) use the standard ${i.english} term. Write every word in ${i.script} script: do not write words in Latin letters (only a person's name or a number may stay as it is), and if you add the Sanskrit term for clarity, write it in ${i.script} script too. Sanskrit verses and mantras stay in their original script, exactly as given.`,
    `Do not invent calculations, dates, planetary positions or scripture quotations: use only the facts provided. Do not promise guaranteed outcomes. Any headings, titles or labels you write are in ${i.english} too: translate them, never leave them in English. Do not mention these language instructions.`,
  ].join(" ");
}

/** What to append to a prompt: the chosen language's directive, or the caller's own default rule when no language was chosen. */
export function languageRule(lang: ResponseLanguage | undefined, fallbackRule: string): string {
  return lang ? `\n\n${languageDirective(lang)}` : fallbackRule;
}

/** Indic scripts use several times more tokens per word than English, so a budget sized for English would cut a reply off mid-JSON. */
export function tokenBudget(base: number, lang: ResponseLanguage | undefined, cap = 8000): number {
  return lang && lang !== "en" ? Math.min(Math.ceil(base * 2.5), Math.max(cap, base)) : base;
}

/** True when most of the letters in the text are in the language's script (names and a few Latin words are allowed). */
export function matchesResponseLanguage(text: string, lang: ResponseLanguage): boolean {
  const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length === 0) return true;
  const inScript = letters.filter((ch) => INFO[lang].letter.test(ch)).length;
  return inScript / letters.length >= (lang === "en" ? 0.85 : 0.6);
}

/** True when a text names a weekday, tithi or nakshatra, or the words tithi/nakshatra/panchang/karana, in a non-English language. */
export function namesCalendarTermIn(text: string, lang: Exclude<ResponseLanguage, "en">): boolean {
  const lower = text.toLowerCase();
  // A word counts only at the start of a word, so "उपयोग" (use) does not match "योग"; endings are free because these languages inflect.
  return CALENDAR_WORDS[lang].some((w) => new RegExp(`(?<![\\p{L}\\p{M}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase()}`, "u").test(lower));
}

/**
 * The Sarvam text-to-speech language code for a language the visitor chose. All ten were verified against the configured
 * model (bulbul:v3, speaker "manan"): each returned audio. Nothing else is accepted, so a language is never read out in the voice of
 * another one. An empty value keeps the old behaviour (Hindi) for callers that never sent a language.
 */
export function ttsLanguageCode(language: unknown): string | null {
  if (language === undefined || language === null || String(language).trim() === "") return "hi-IN";
  const code = parseResponseLanguage(language);
  return code ? `${code}-IN` : null;
}

// ── Verifying that a reply really is in the chosen language ─────────────────────────────────────────────────────────

/** Thrown when the model answered in the wrong language twice. Routes turn it into a 502 with a translatable code, never a made-up reply. */
export class WrongLanguageError extends Error {
  readonly code = "wrong_language";
  constructor(readonly language: ResponseLanguage) {
    super(`The reply was not written in ${INFO[language].english}`);
    this.name = "WrongLanguageError";
  }
}

/**
 * The human-readable text of a model reply. For JSON the VALUES are read (the keys are English by design and must not count);
 * anything that is not JSON is judged as it is.
 */
export function replyTextOf(raw: unknown): string {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
  const m = /\{[\s\S]*\}|\[[\s\S]*\]/.exec(text);
  if (!m) return text;
  try {
    const out: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
    };
    walk(JSON.parse(m[0]));
    return out.join("\n");
  } catch {
    return text;
  }
}

/**
 * True when a reply is written in the chosen language: most letters are in its script, no paragraph of real length is in another
 * script, and no markdown heading was left in English. Names, numbers and short fixed values (for example a category the prompt
 * required in English) are allowed. English is judged the same way against Latin.
 */
export function replyIsInLanguage(text: string, lang: ResponseLanguage): boolean {
  if (!matchesResponseLanguage(text, lang)) return false;
  if (lang === "en") return true;
  if (/\*\*[A-Za-z][A-Za-z ,&'’-]{4,}\*\*/.test(text)) return false; // an English heading such as **What this means**
  return text
    .split(/\n+/)
    .filter((p) => [...p].filter((c) => /\p{L}/u.test(c)).length >= 30)
    .every((p) => [...p].filter((c) => INFO[lang].letter.test(c)).length / [...p].filter((c) => /\p{L}/u.test(c)).length >= 0.35);
}

export function retryNoteFor(lang: ResponseLanguage): string {
  const i = INFO[lang];
  return `\n\nIMPORTANT: your previous reply was not written in ${i.english}. Write the whole reply again, entirely in ${i.english} (${i.native}), in ${i.script} script, with no English sentences or headings.`;
}

/**
 * Runs `ask` (one model call that returns the reply text), checks the language, and on a clearly wrong language asks ONCE more with a
 * firm note. If that is wrong too it throws WrongLanguageError. With no language chosen (or English requested and found) it returns
 * the first reply untouched, so a visitor who never chose a language sees exactly what they saw before.
 */
export async function generateInLanguage(
  lang: ResponseLanguage | undefined,
  ask: (retryNote: string) => Promise<string>,
): Promise<string> {
  const first = await ask("");
  if (!lang || replyIsInLanguage(replyTextOf(first), lang)) return first;
  const second = await ask(retryNoteFor(lang));
  if (replyIsInLanguage(replyTextOf(second), lang)) return second;
  throw new WrongLanguageError(lang);
}
