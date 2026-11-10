/**
 * MyBhagya's translation system: i18next + react-i18next.
 *
 *  - English is bundled and is the source of truth and the fallback. Every other language is a separate chunk, loaded on demand.
 *  - A key missing or empty in the chosen language falls back to English (an empty string counts as missing). A key missing in
 *    English too shows nothing, never the raw key; a test checks that every key used in the code exists in English.
 *  - The chosen language is kept in localStorage and restored on the next visit. Switching re-renders in place: no page reload.
 *  - Calculated values are never translated here. Only their displayed names are looked up (see glossary.ts).
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { DEFAULT_LOCALE, isLocale, loadSavedLocale, localeInfo, saveLocale, type LocaleCode } from "./languages";
import { applyDocumentLanguage } from "./document";
import "./indic.css";

type Bundle = Record<string, unknown>;

const LOADERS: Record<Exclude<LocaleCode, "en">, () => Promise<{ default: Bundle }>> = {
  hi: () => import("./locales/hi.json"),
  mr: () => import("./locales/mr.json"),
  ta: () => import("./locales/ta.json"),
  te: () => import("./locales/te.json"),
  gu: () => import("./locales/gu.json"),
  bn: () => import("./locales/bn.json"),
  kn: () => import("./locales/kn.json"),
  ml: () => import("./locales/ml.json"),
  pa: () => import("./locales/pa.json"),
};

/** Loads a language's dictionary once. English is already bundled. */
export async function loadLocale(code: LocaleCode): Promise<void> {
  if (code === DEFAULT_LOCALE || i18n.hasResourceBundle(code, "translation")) return;
  const mod = await LOADERS[code]();
  i18n.addResourceBundle(code, "translation", mod.default, true, true);
}

/** Switches the whole app to a language, in place. If its dictionary cannot be loaded the app stays in the current language. */
export async function setLanguage(code: LocaleCode): Promise<boolean> {
  if (!isLocale(code)) return false;
  try {
    await loadLocale(code);
  } catch {
    return false;
  }
  await i18n.changeLanguage(code);
  saveLocale(code);
  applyDocumentLanguage(code);
  return true;
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en as Bundle } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ["en", "hi", "mr", "ta", "te", "gu", "bn", "kn", "ml", "pa"],
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
  returnEmptyString: false, // "" in a draft dictionary means "not translated yet": fall back to English
  react: { useSuspense: false, bindI18n: "languageChanged loaded" },
  // A key that exists nowhere must never reach the screen as raw text.
  // A caller-supplied defaultValue (Tx's `def`, the glossary's English name) is honoured; otherwise nothing is shown.
  parseMissingKeyHandler: (key, defaultValue) => {
    if (typeof defaultValue === "string" && defaultValue && defaultValue !== key) return defaultValue;
    if (import.meta.env?.DEV) console.warn(`[i18n] missing translation key: ${key}`);
    return "";
  },
});

/** Resolves when the saved language (if any) has been loaded, so the first paint is already in it. */
export const i18nReady: Promise<void> = (async () => {
  const saved = loadSavedLocale();
  if (saved !== DEFAULT_LOCALE) {
    try { await loadLocale(saved); await i18n.changeLanguage(saved); } catch { /* stay in English */ }
  }
  applyDocumentLanguage(i18n.language && isLocale(i18n.language) ? (i18n.language as LocaleCode) : DEFAULT_LOCALE);
})();

export { localeInfo };
export default i18n;
