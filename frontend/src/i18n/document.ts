import { localeInfo, type LocaleCode, type ScriptName } from "./languages";

/** Noto families per script: Sans for text, Serif for the headings that use the site's serif. */
export const SCRIPT_FONTS: Record<Exclude<ScriptName, "latin">, { sans: string; serif: string; family: string }> = {
  devanagari: { sans: "Noto Sans Devanagari", serif: "Noto Serif Devanagari", family: "Devanagari" },
  tamil: { sans: "Noto Sans Tamil", serif: "Noto Serif Tamil", family: "Tamil" },
  telugu: { sans: "Noto Sans Telugu", serif: "Noto Serif Telugu", family: "Telugu" },
  gujarati: { sans: "Noto Sans Gujarati", serif: "Noto Serif Gujarati", family: "Gujarati" },
  bengali: { sans: "Noto Sans Bengali", serif: "Noto Serif Bengali", family: "Bengali" },
  kannada: { sans: "Noto Sans Kannada", serif: "Noto Serif Kannada", family: "Kannada" },
  malayalam: { sans: "Noto Sans Malayalam", serif: "Noto Serif Malayalam", family: "Malayalam" },
  gurmukhi: { sans: "Noto Sans Gurmukhi", serif: "Noto Serif Gurmukhi", family: "Gurmukhi" },
};

/** The stylesheet that loads a script's fonts. Google serves only the glyph ranges a page uses, and only once a language needs them. */
export const fontHref = (script: Exclude<ScriptName, "latin">): string => {
  const f = SCRIPT_FONTS[script];
  const enc = (n: string) => n.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${enc(f.sans)}:wght@400;500;600;700&family=${enc(f.serif)}:wght@400;600;700&display=swap`;
};

const ensureFont = (script: ScriptName): void => {
  if (script === "latin" || typeof document === "undefined") return;
  const id = `font-${script}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = fontHref(script);
  document.head.appendChild(link);
};

/**
 * Sets the page's language: the lang attribute (for screen readers, hyphenation and search engines), the script (which selects the
 * font and typography rules in indic.css), and loads that script's fonts.
 */
export function applyDocumentLanguage(code: LocaleCode): void {
  if (typeof document === "undefined") return;
  const info = localeInfo(code);
  const root = document.documentElement;
  root.lang = info.tag.split("-")[0];
  root.dataset.script = info.script;
  if (info.script === "latin") root.removeAttribute("data-indic");
  else root.setAttribute("data-indic", "true");
  ensureFont(info.script);
}
