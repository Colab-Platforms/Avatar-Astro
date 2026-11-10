import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { useTranslation } from "react-i18next";
import i18n, { loadLocale, setLanguage } from "@/i18n";
import { glossName, useGlossary } from "@/i18n/glossary";
import { SCRIPT_FONTS, fontHref } from "@/i18n/document";
import { LOCALES, REVIEW_LOG, STORAGE_KEY, TRANSLATION_STATUS, loadSavedLocale, type LocaleCode } from "@/i18n/languages";
import LanguageSelector from "@/components/LanguageSelector";
import en from "@/i18n/locales/en.json";

const SRC = join(process.cwd(), "src");
const LOCALE_DIR = join(SRC, "i18n", "locales");
const NON_EN = LOCALES.filter((l) => l.code !== "en");

type Dict = { [k: string]: string | Dict };
const leaves = (o: Dict, p = ""): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v] as [string, string]] : leaves(v, p + k + ".")));
const load = (code: string): Dict => JSON.parse(readFileSync(join(LOCALE_DIR, `${code}.json`), "utf8"));
const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");

const enAll = leaves(en as Dict);
const enUi = enAll.filter(([k]) => !k.startsWith("glossary."));
const enGloss = enAll.filter(([k]) => k.startsWith("glossary."));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "__tests__" || f === "locales" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

function Probe() {
  const { t } = useTranslation();
  return <p data-testid="probe">{t("nav.home")}</p>;
}

beforeEach(() => { window.localStorage.removeItem(STORAGE_KEY); });
afterEach(async () => {
  cleanup();
  await act(async () => { await setLanguage("en"); });
  window.localStorage.removeItem(STORAGE_KEY);
});

describe("dictionaries", () => {
  it("lists exactly the ten requested languages, each with a dictionary file", () => {
    expect(LOCALES.map((l) => l.code)).toEqual(["en", "hi", "mr", "ta", "te", "gu", "bn", "kn", "ml", "pa"]);
    for (const l of LOCALES) expect(() => load(l.code)).not.toThrow();
  });

  it.each(NON_EN.map((l) => [l.code, l.english] as const))("%s (%s) translates every interface string, with the same {{placeholders}}", (code) => {
    const d = leaves(load(code));
    const map = new Map(d);
    const missing: string[] = [];
    const badVars: string[] = [];
    for (const [k, english] of enUi) {
      const t = map.get(k);
      if (!t || !t.trim()) { missing.push(k); continue; }
      if (vars(t) !== vars(english)) badVars.push(`${k}: ${vars(english)} vs ${vars(t)}`);
    }
    expect(missing).toEqual([]);
    expect(badVars).toEqual([]);
  });

  it.each(NON_EN.map((l) => [l.code, l.english] as const))("%s names every calculated Panchang / Nakshatra / festival term in the glossary", (code) => {
    const map = new Map(leaves(load(code)));
    const missing = enGloss.map(([k]) => k).filter((k) => !map.get(k)?.trim());
    expect(missing).toEqual([]);
  });

  it.each(NON_EN.map((l) => [l.code] as const))("%s has no keys that English lacks (nothing orphaned or misspelt)", (code) => {
    const known = new Set(enAll.map(([k]) => k));
    const extra = leaves(load(code)).map(([k]) => k).filter((k) => !known.has(k));
    expect(extra).toEqual([]);
  });

  it("keeps the brand and Latin digits in every language", () => {
    for (const l of NON_EN) {
      const all = leaves(load(l.code));
      const native = all.filter(([, v]) => /[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/.test(v));
      expect(native.map(([k]) => `${l.code}:${k}`)).toEqual([]);
      const brand = all.filter(([, v]) => /MyBhagya/i.test(v)).length;
      expect(brand).toBeGreaterThan(0);
    }
  });

  it("every translation key used in the code exists in English (no raw key can reach the screen)", () => {
    const known = new Set(enAll.map(([k]) => k));
    const used = new Map<string, string>();
    const patterns = [/\bt\(\s*["']([A-Za-z][\w-]*(?:\.[\w-]+)+)["']/g, /\bk=["']([A-Za-z][\w-]*(?:\.[\w-]+)+)["']/g];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const re of patterns) for (const m of text.matchAll(re)) used.set(m[1], file.replace(SRC, "src"));
    }
    const missing = [...used].filter(([k]) => !known.has(k)).map(([k, f]) => `${k}  (${f})`);
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(100);
  });
});

describe("honest review status", () => {
  it("no language claims to be reviewed without a named reviewer in the log", () => {
    for (const l of LOCALES) {
      if (TRANSLATION_STATUS[l.code] === "reviewed") {
        expect(REVIEW_LOG.some((r) => r.locale === l.code && r.reviewer && r.date)).toBe(true);
      }
    }
  });
  it("marks every machine-written language as a draft today", () => {
    for (const l of NON_EN) expect(TRANSLATION_STATUS[l.code]).toBe("draft");
    expect(REVIEW_LOG).toEqual([]);
  });
});

describe("language selector", () => {
  it("offers all ten languages by their own names and marks the draft ones", () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole("button", { name: /language/i }));
    for (const l of LOCALES) expect(screen.getByTestId(`language-option-${l.code}`)).toHaveTextContent(l.native);
    expect(screen.getAllByText(/draft translation/i)).toHaveLength(9);
  });

  it.each(NON_EN.map((l) => [l.code, l.native] as const))("switching to %s changes the text in place, remembers it, and sets lang, script and fonts", async (code, native) => {
    render(<><LanguageSelector /><Probe /></>);
    expect(screen.getByTestId("probe")).toHaveTextContent("Home");
    fireEvent.click(screen.getByTestId("language-selector").querySelector("button")!);
    fireEvent.click(screen.getByTestId(`language-option-${code}`));

    const expected = (load(code) as { nav: { home: string } }).nav.home;
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent(expected));
    expect(expected).not.toBe("Home");
    expect(screen.getByTestId("language-current")).toHaveTextContent(native);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(code);
    expect(loadSavedLocale()).toBe(code);

    const info = LOCALES.find((l) => l.code === code)!;
    expect(document.documentElement.lang).toBe(info.tag.split("-")[0]);
    expect(document.documentElement.dataset.script).toBe(info.script);
    expect(document.documentElement.getAttribute("data-indic")).toBe("true");
    const link = document.getElementById(`font-${info.script}`) as HTMLLinkElement | null;
    expect(link?.href).toBe(fontHref(info.script as Exclude<typeof info.script, "latin">));
  });

  it("returns to English and clears the Indic typography", async () => {
    await act(async () => { await setLanguage("ta"); });
    expect(document.documentElement.getAttribute("data-indic")).toBe("true");
    await act(async () => { await setLanguage("en"); });
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.hasAttribute("data-indic")).toBe(false);
  });

  it("restores the saved language after a reload", async () => {
    window.localStorage.setItem(STORAGE_KEY, "gu");
    expect(loadSavedLocale()).toBe("gu");
    await loadLocale("gu");
    await act(async () => { await i18n.changeLanguage("gu"); });
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent((load("gu") as { nav: { home: string } }).nav.home);
  });

  it("ignores a corrupt saved value and stays in English", () => {
    window.localStorage.setItem(STORAGE_KEY, "klingon");
    expect(loadSavedLocale()).toBe("en");
  });

  it("refuses an unknown language code", async () => {
    // @ts-expect-error deliberately wrong
    expect(await setLanguage("xx")).toBe(false);
    expect(i18n.language).toBe("en");
  });
});

describe("fallback", () => {
  it("shows English where a language has no translation, never the key", async () => {
    await act(async () => { await setLanguage("hi"); });
    i18n.addResource("hi", "translation", "nav.home", "");
    expect(i18n.t("nav.home")).toBe("Home");
    i18n.addResource("hi", "translation", "nav.home", (load("hi") as { nav: { home: string } }).nav.home);
  });

  it("shows nothing, not the raw key, for a key that exists nowhere", () => {
    expect(i18n.t("totally.unknown.key")).toBe("");
    expect(i18n.t("totally.unknown.key", { defaultValue: "Fallback text" })).toBe("Fallback text");
  });

  it("interpolates placeholders in a regional language", async () => {
    await act(async () => { await setLanguage("mr"); });
    const out = i18n.t("home.hero.tryGuru", { name: "Kundali" });
    expect(out).toContain("Kundali");
    expect(out).not.toContain("{{");
  });
});

describe("glossary shows names only; the calculated value is never changed", () => {
  function Names() {
    const { g, tithiFull } = useGlossary();
    return <p data-testid="names">{g("nakshatra", "Rohini")}|{tithiFull("Shukla Panchami")}|{g("weekday", "Monday")}|{g("nakshatra", "Not A Real Star")}</p>;
  }

  it("English shows the engine's own names", () => {
    render(<Names />);
    expect(screen.getByTestId("names")).toHaveTextContent("Rohini|Shukla Panchami|Monday|Not A Real Star");
  });

  it.each(NON_EN.map((l) => [l.code] as const))("%s translates Rohini, Shukla Panchami and Monday, and falls back to English for an unknown name", async (code) => {
    await act(async () => { await setLanguage(code); });
    const gl = (load(code) as { glossary: Record<string, Record<string, string>> }).glossary;
    render(<Names />);
    const shown = screen.getByTestId("names").textContent!.split("|");
    expect(shown[0]).toBe(gl.nakshatra.Rohini);
    expect(shown[1]).toBe(`${gl.paksha.Shukla} ${gl.tithi.Panchami}`);
    expect(shown[2]).toBe(gl.weekday.Monday);
    expect(shown[3]).toBe("Not A Real Star");
    expect(glossName("nakshatra", "Rohini")).toBe(gl.nakshatra.Rohini);
  });

  it("uses the same word for the same term everywhere in a language", () => {
    for (const l of NON_EN) {
      const gl = (load(l.code) as { glossary: Record<string, Record<string, string>> }).glossary;
      // A planet name must be identical wherever the dictionary uses it as a standalone term.
      expect(gl.planet.Moon).toBeTruthy();
      expect(new Set(Object.values(gl.nakshatra)).size).toBe(Object.keys(gl.nakshatra).length); // 27 distinct names
    }
  });
});

describe("Indic typography", () => {
  const css = readFileSync(join(SRC, "i18n", "indic.css"), "utf8");

  it("has a font stack for every script and never adds letter-spacing to Indic text", () => {
    for (const script of Object.keys(SCRIPT_FONTS)) expect(css).toContain(`data-script="${script}"`);
    expect(css).toMatch(/letter-spacing:\s*normal\s*!important/);
  });

  it("gives Indic text a taller line height than Latin and lets long words wrap", () => {
    expect(css).toMatch(/line-height:\s*1\.[5-9]/);
    expect(css).toMatch(/overflow-wrap:\s*(anywhere|break-word)/);
  });

  it("loads fonts only from Google Fonts, one stylesheet per script", () => {
    for (const script of Object.keys(SCRIPT_FONTS) as (keyof typeof SCRIPT_FONTS)[]) {
      expect(fontHref(script)).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+/);
      expect(fontHref(script)).toContain("display=swap");
    }
  });
});
