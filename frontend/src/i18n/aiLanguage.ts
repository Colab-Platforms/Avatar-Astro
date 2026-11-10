import { STORAGE_KEY, isLocale, type LocaleCode } from "./languages";

/** The request header that tells the server which language the visitor chose. The server checks it against its own list of ten. */
export const APP_LANGUAGE_HEADER = "X-App-Language";

/**
 * The language the visitor EXPLICITLY chose, or undefined if they never used the selector. Only an explicit choice is sent to the
 * server, so a visitor who never picked a language gets every AI feature exactly as it behaved before.
 */
export function chosenLanguage(): LocaleCode | undefined {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** The language Divya Margdarshak writes in: the visitor's explicit choice, or English if they never chose one. */
export function replyLanguage(): LocaleCode {
  return chosenLanguage() ?? "en";
}

const SCRIPT_RE: Record<LocaleCode, RegExp> = {
  en: /[A-Za-z]/,
  hi: /[\u0900-\u097F]/,
  mr: /[\u0900-\u097F]/,
  ta: /[\u0B80-\u0BFF]/,
  te: /[\u0C00-\u0C7F]/,
  gu: /[\u0A80-\u0AFF]/,
  bn: /[\u0980-\u09FF]/,
  kn: /[\u0C80-\u0CFF]/,
  ml: /[\u0D00-\u0D7F]/,
  pa: /[\u0A00-\u0A7F]/,
};

/** Roman-letter Hindi words: tells Hinglish from English when the text is in Latin letters. */
const HINGLISH_WORDS = new Set([
  "hai", "hain", "kya", "kyu", "kyun", "kaise", "kab", "nahi", "nahin", "haan", "mera", "meri", "mere", "tera", "teri", "aap", "aapka",
  "tum", "main", "mujhe", "acha", "accha", "theek", "bahut", "bohot", "karo", "karna", "raha", "rahi", "chahiye", "matlab", "kuch", "koi",
  "abhi", "phir", "bhi", "toh", "yaar", "beta", "ji",
]);

/**
 * Best-effort guess of the language the visitor TYPED, used only as a hint to the model. The reply language never follows it: it
 * follows the language chosen in the selector. Devanagari is reported as "hi" (Hindi and Marathi share the script).
 */
export function detectInputLanguage(text: string): LocaleCode | "hinglish" {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  const order: LocaleCode[] = ["hi", "ta", "te", "gu", "bn", "kn", "ml", "pa"];
  for (const code of order) {
    if (letters.filter((c) => SCRIPT_RE[code].test(c)).length > letters.length / 3) return code;
  }
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.some((w) => HINGLISH_WORDS.has(w)) ? "hinglish" : "en";
}

/** The share of a text's letters that are written in the language's own script (0 to 1; 1 when there are no letters to judge). */
export function scriptShare(text: string, lang: LocaleCode): number {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return 1;
  return letters.filter((c) => SCRIPT_RE[lang].test(c)).length / letters.length;
}

/**
 * True when a reply is written in the chosen language: most of it is in that script, and no paragraph of real length is in another.
 * Names, a few Latin words and numbers are allowed. This is how an English answer to a Tamil request is caught.
 */
export function isInLanguage(text: string, lang: LocaleCode): boolean {
  if (scriptShare(text, lang) < (lang === "en" ? 0.85 : 0.6)) return false;
  if (lang === "en") return true;
  return text
    .split(/\n+/)
    .filter((p) => [...p].filter((c) => /\p{L}/u.test(c)).length >= 30)
    .every((p) => scriptShare(p, lang) >= 0.35);
}
