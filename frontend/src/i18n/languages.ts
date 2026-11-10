/**
 * The languages MyBhagya is offered in. One list drives the selector, the fonts, the page's lang attribute, the AI reply language
 * sent to the server, and the review status of each translation.
 */
export type LocaleCode = "en" | "hi" | "mr" | "ta" | "te" | "gu" | "bn" | "kn" | "ml" | "pa";

export type ScriptName = "latin" | "devanagari" | "tamil" | "telugu" | "gujarati" | "bengali" | "kannada" | "malayalam" | "gurmukhi";

export interface LocaleInfo {
  code: LocaleCode;
  /** The language written in its own script: what the selector shows. */
  native: string;
  english: string;
  script: ScriptName;
  /** BCP 47 tag for the lang attribute and Intl formatting. */
  tag: string;
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: "en", native: "English", english: "English", script: "latin", tag: "en-IN" },
  { code: "hi", native: "हिन्दी", english: "Hindi", script: "devanagari", tag: "hi-IN" },
  { code: "mr", native: "मराठी", english: "Marathi", script: "devanagari", tag: "mr-IN" },
  { code: "ta", native: "தமிழ்", english: "Tamil", script: "tamil", tag: "ta-IN" },
  { code: "te", native: "తెలుగు", english: "Telugu", script: "telugu", tag: "te-IN" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", script: "gujarati", tag: "gu-IN" },
  { code: "bn", native: "বাংলা", english: "Bengali", script: "bengali", tag: "bn-IN" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", script: "kannada", tag: "kn-IN" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", script: "malayalam", tag: "ml-IN" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", script: "gurmukhi", tag: "pa-IN" },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const STORAGE_KEY = "mybhagya_lang";

export const isLocale = (v: unknown): v is LocaleCode => LOCALES.some((l) => l.code === v);
export const localeInfo = (code: string): LocaleInfo => LOCALES.find((l) => l.code === code) ?? LOCALES[0];

/**
 * Review status of each translation. English is the source text. Every other language was drafted by an AI model and has NOT been
 * checked by a native speaker or a professional translator. Change an entry to "reviewed" only when a named reviewer has signed it
 * off (record who and when in REVIEW_LOG below). A test fails if a language claims to be reviewed without a log entry.
 */
export type TranslationStatus = "source" | "draft" | "reviewed";

export const TRANSLATION_STATUS: Record<LocaleCode, TranslationStatus> = {
  en: "source", hi: "draft", mr: "draft", ta: "draft", te: "draft", gu: "draft", bn: "draft", kn: "draft", ml: "draft", pa: "draft",
};

export interface ReviewEntry { locale: LocaleCode; reviewer: string; date: string; scope: string }
/** Add an entry here when a reviewer signs off a language (or part of one). Empty today: nothing has been reviewed. */
export const REVIEW_LOG: ReviewEntry[] = [];

export const loadSavedLocale = (): LocaleCode => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(v)) return v;
  } catch { /* storage unavailable (private mode): English */ }
  return DEFAULT_LOCALE;
};

export const saveLocale = (code: LocaleCode): void => {
  try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* the choice lasts for this visit only */ }
};
