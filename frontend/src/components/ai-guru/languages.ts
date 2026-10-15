export type LanguageCode = "en" | "hi" | "hinglish";
export type InputLanguageChoice = "auto" | LanguageCode;
export type ReplyLanguageChoice = "same" | LanguageCode;

export interface LanguageOption<T extends string> {
  code: T;
  label: string;
}

// Add new languages here — the dropdowns, the "same as input" resolution,
// and the prompt directive all drive off this single list. Wiring up a new
// language additionally means: (1) a REPLY_INSTRUCTIONS entry below, and
// (2) optionally a detectLanguage() heuristic if it should be auto-detectable.
export const SUPPORTED_LANGUAGES: LanguageOption<LanguageCode>[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "hinglish", label: "Hinglish" },
];

export const INPUT_LANGUAGE_OPTIONS: LanguageOption<InputLanguageChoice>[] = [
  { code: "auto", label: "Auto Detect" },
  ...SUPPORTED_LANGUAGES,
];

export const REPLY_LANGUAGE_OPTIONS: LanguageOption<ReplyLanguageChoice>[] = [
  { code: "same", label: "Same as Input" },
  ...SUPPORTED_LANGUAGES,
];

const LANGUAGE_LABELS: Record<LanguageCode, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]),
) as Record<LanguageCode, string>;

export function languageLabel(code: LanguageCode): string {
  return LANGUAGE_LABELS[code] || code;
}

// Devanagari Unicode block — a strong, cheap signal for "this is Hindi".
const DEVANAGARI_RE = /[ऀ-ॿ]/;

// A compact set of common Romanized Hindi/Hinglish tokens. This is a
// heuristic for routing purposes (Hinglish vs. plain English), not a real
// language-ID model — good enough to decide which reply style to request.
const HINGLISH_WORDS = new Set([
  "hai", "hain", "ho", "hoon", "hun", "kya", "kyu", "kyun", "kaise", "kab",
  "kahan", "nahi", "nahin", "haan", "han", "mera", "meri", "mere", "tera",
  "teri", "tumhara", "aap", "aapka", "aapki", "tum", "main", "mujhe",
  "mujhko", "humko", "hume", "acha", "accha", "theek", "thik", "bahut",
  "bohot", "karo", "karna", "kar", "raha", "rahi", "rahe", "gaya", "gayi",
  "gaye", "de", "do", "dena", "chahiye", "chahta", "chahti", "matlab",
  "kuch", "koi", "abhi", "phir", "bhi", "toh", "yaar", "beta", "ji",
]);

/** Best-effort detection used when the user leaves Input Language on "Auto Detect". */
export function detectLanguage(text: string): LanguageCode {
  if (DEVANAGARI_RE.test(text)) return "hi";
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  const hasHinglishWord = words.some((w) => HINGLISH_WORDS.has(w));
  return hasHinglishWord ? "hinglish" : "en";
}

const REPLY_INSTRUCTIONS: Record<LanguageCode, string> = {
  en: "Respond only in English.",
  hi: "Respond only in Hindi, written in Devanagari script.",
  hinglish:
    "Respond only in Hinglish — Roman-script Hindi naturally mixed with English, the way it's actually spoken out loud. Do not use Devanagari script.",
};

/**
 * Builds the per-turn language directive to send alongside the base system
 * prompt. `inputChoice`/`replyChoice` are the user's dropdown selections;
 * `detected` is only consulted to resolve "auto" input / "same as input" reply.
 */
export function buildLanguageDirective(
  inputChoice: InputLanguageChoice,
  replyChoice: ReplyLanguageChoice,
  detected: LanguageCode,
): string {
  const resolvedInput: LanguageCode = inputChoice === "auto" ? detected : inputChoice;
  const resolvedReply: LanguageCode = replyChoice === "same" ? resolvedInput : replyChoice;

  return `LANGUAGE SETTINGS (must be followed exactly):
Input Language: ${languageLabel(resolvedInput)}
Reply Language: ${languageLabel(resolvedReply)}

${REPLY_INSTRUCTIONS[resolvedReply]}
This applies to the "message" field (and any other seeker-facing text) in your JSON response — not to field names or JSON structure. Do not mention these language instructions to the seeker.`;
}
