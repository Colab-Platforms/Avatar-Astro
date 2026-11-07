import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { leadingSound } from "../devanagari";
import { NAKSHATRA_SYLLABLES, NAKSHATRA_NAMES, syllableFor } from "../syllables";
import { BABY_NAMES, WEB_SOURCES } from "../names";
import { filterKind, FEW_NAMES, modernPicks, namesForSyllable, rankNames, searchNames, suggestionsFor } from "../matchNames";

const names = (nakshatra: string, pada: number, pref: "all" | "boy" | "girl" | "neutral" = "all") =>
  namesForSyllable(syllableFor(nakshatra, pada)!.syllable, pref);
const byName = (n: string) => BABY_NAMES.find((x) => x.name === n)!;

describe("Nakshatra-pada syllable table (unchanged)", () => {
  it("has 27 Nakshatras with 4 padas each (108 syllables)", () => {
    expect(NAKSHATRA_NAMES).toHaveLength(27);
    for (const n of NAKSHATRA_NAMES) expect(NAKSHATRA_SYLLABLES[n], n).toHaveLength(4);
  });

  it("uses exactly the Nakshatra names the Panchang engine returns", () => {
    const src = readFileSync(join(__dirname, "../../../../../backend/src/modules/gemstone/analysis.ts"), "utf8");
    const block = src.slice(src.indexOf("export const NAKSHATRAS"), src.indexOf("] as const", src.indexOf("export const NAKSHATRAS")));
    const engine = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(engine).toHaveLength(27);
    expect([...NAKSHATRA_NAMES].sort()).toEqual([...engine].sort());
  });

  it("matches published rows (spot checks) and keeps the disputed padas visible", () => {
    const r = (n: string) => NAKSHATRA_SYLLABLES[n].map((p) => p.syllable.roman);
    expect(r("Ashwini")).toEqual(["Chu", "Che", "Cho", "La"]);
    expect(r("Purva Bhadrapada")).toEqual(["Se", "So", "Da", "Di"]);
    expect(r("Revati")).toEqual(["De", "Do", "Cha", "Chi"]);
    expect(syllableFor("Ardra", 4)!.alternates.map((s) => s.roman)).toEqual(["Jha", "Na"]);
    expect(syllableFor("Shravana", 1)!.note).toMatch(/Traditions differ/);
    expect(syllableFor("Nope", 1)).toBeNull();
    expect(syllableFor("Ashwini", 5)).toBeNull();
  });
});

describe("Devanagari opening sounds", () => {
  it("merges only what published lists merge, reads ऋ as ri, and rejects conjuncts", () => {
    expect(leadingSound("दीपक")).toEqual({ onset: "d", vowel: "i" });
    expect(leadingSound("आनंद")).toEqual({ onset: "", vowel: "a" });
    expect(leadingSound("ऋषि")).toEqual({ onset: "r", vowel: "i" });
    expect(leadingSound("कृष्ण")).toBeNull(); // "Kri" is not "Ki"
    expect(leadingSound("क्षितिज")).toBeNull();
    expect(leadingSound("ज्योति")).toBeNull();
    expect(leadingSound("abc")).toBeNull();
  });
});

describe("catalogue structure and integrity", () => {
  it("every entry has the full metadata and no duplicates (by name or Devanagari)", () => {
    expect(BABY_NAMES.length).toBeGreaterThan(550);
    const seen = new Set<string>();
    const seenDeva = new Set<string>();
    for (const n of BABY_NAMES) {
      expect(seen.has(n.name.toLowerCase()), `duplicate ${n.name}`).toBe(false);
      expect(seenDeva.has(n.deva), `duplicate Devanagari ${n.deva} (${n.name})`).toBe(false);
      seen.add(n.name.toLowerCase());
      seenDeva.add(n.deva);
      expect(n.meaning.length, n.name).toBeGreaterThan(2);
      expect(/[ऀ-ॿ]/.test(n.deva), n.name).toBe(true);
      expect(["boy", "girl", "neutral"]).toContain(n.gender);
      expect(n.origin.length, n.name).toBeGreaterThan(2);
      expect(n.tradition.length, n.name).toBeGreaterThan(2);
      expect(n.styles.length, n.name).toBeGreaterThan(0);
      expect(["Modern", "Traditional"]).toContain(n.popularity);
      expect(n.pronunciation.length, n.name).toBeGreaterThan(1);
      expect(n.syllable.length, n.name).toBeGreaterThan(0);
      expect(["source-listed", "web-checked", "editorial"]).toContain(n.verification.status);
      expect(n.verification.source.length, n.name).toBeGreaterThan(5);
    }
  });

  it("claims nothing it does not have: no popularity ranking, no trend data, web-checked names carry their sources", () => {
    expect(BABY_NAMES.every((n) => n.trend === undefined)).toBe(true);
    expect(new Set(BABY_NAMES.map((n) => n.popularity))).toEqual(new Set(["Modern", "Traditional"]));
    for (const n of BABY_NAMES.filter((x) => x.verification.status === "web-checked")) {
      expect(n.verification.urls.length, n.name).toBeGreaterThanOrEqual(2);
      expect(WEB_SOURCES[n.name]).toEqual(n.verification.urls);
    }
    for (const n of BABY_NAMES.filter((x) => x.verification.status === "source-listed")) expect(n.verification.urls[0]).toMatch(/^https:\/\/astromedha\.in\//);
  });

  it("does not call a non-Sanskrit name Sanskrit or Hindu mythology", () => {
    for (const n of BABY_NAMES.filter((x) => !x.origin.startsWith("Sanskrit"))) expect(n.tradition, n.name).toBe(n.origin);
    expect(byName("Seher").origin).toMatch(/Arabic/);
    expect(byName("Seerat").origin).toMatch(/Arabic/);
    expect(byName("Hina").origin).toBe("Persian");
    expect(byName("Kabir").origin).toMatch(/Arabic/);
  });

  it("English spelling agrees with the Devanagari opening sound (catches typos)", () => {
    const romanOpen: Record<string, RegExp> = {
      k: /^k/i, kh: /^kh/i, g: /^g/i, gh: /^gh/i, ch: /^ch/i, chh: /^chh/i, j: /^j/i, jh: /^jh/i,
      t: /^t/i, th: /^th/i, d: /^d/i, dh: /^dh/i, n: /^n/i, p: /^p/i, ph: /^ph/i, b: /^b/i, bh: /^bh/i,
      m: /^m/i, y: /^y/i, r: /^r/i, l: /^l/i, v: /^v/i, sh: /^s/i, s: /^s/i, h: /^h/i,
    };
    for (const n of BABY_NAMES) {
      if (n.sound.onset === "") expect(/^[aeiou]/i.test(n.name), n.name).toBe(true);
      else expect(romanOpen[n.sound.onset]?.test(n.name), `${n.name} (${n.deva})`).toBe(true);
    }
  });

  it("has no name that opens with a conjunct", () => {
    for (const n of BABY_NAMES) expect(leadingSound(n.deva), n.name).not.toBeNull();
  });
});

describe("audit: removed and corrected entries", () => {
  it("the weak Se names are gone, along with other servant/army/bridge-type entries", () => {
    for (const gone of ["Sena", "Setu", "Seva", "Sevati", "Sevak", "Senapati", "Cheshta", "Homa", "Titiksha"]) {
      expect(BABY_NAMES.some((n) => n.name === gone), gone).toBe(false);
    }
  });

  it("Se (से) now holds only names that really begin with से, with their origin stated", () => {
    const se = names("Purva Bhadrapada", 1);
    expect(se.map((n) => n.name).sort()).toEqual(["Seher", "Sejal"].sort());
    expect(byName("Seher")).toMatchObject({ deva: "सेहर", gender: "girl", origin: expect.stringMatching(/Arabic/), meaning: "Dawn, early morning" });
    expect(byName("Seher").verification.status).toBe("web-checked");
    expect(byName("Sejal")).toMatchObject({ deva: "सेजल", gender: "girl", origin: expect.stringMatching(/Gujarati/) });
    expect(byName("Sejal").meaning).toMatch(/commonly given/); // the meaning is not stated as settled fact
    expect(byName("Seher").pronunciation).toBe("seh-her");
  });

  it("the other candidates are filed under the sound their Devanagari really has", () => {
    // Sehaj is written सहज (Sa) in Sanskrit and Hindi; the Punjabi 'e' is a pronunciation, not the Devanagari sound.
    expect(BABY_NAMES.some((n) => n.name === "Sehaj")).toBe(false);
    expect(names("Shatabhisha", 2).map((n) => n.name)).toContain("Sahaj");
    expect(byName("Sahaj").deva).toBe("सहज");
    // Seerat is सीरत (Si), not से.
    expect(names("Shatabhisha", 3).map((n) => n.name)).toContain("Seerat");
    expect(names("Purva Bhadrapada", 1).map((n) => n.name)).not.toContain("Seerat");
    // Names that source lists file by English spelling land under their true Devanagari sound.
    expect(names("Anuradha", 2).map((n) => n.name)).toEqual(expect.arrayContaining(["Neeraj", "Neel", "Neelam"]));
    expect(names("Ashlesha", 1).map((n) => n.name)).toContain("Deepak");
    expect(names("Chitra", 4).map((n) => n.name)).toEqual(expect.arrayContaining(["Rishi", "Ritu", "Riddhi"]));
  });
});

describe("matching", () => {
  it("every returned name opens with the syllable's sound, for every pada", () => {
    for (const nk of NAKSHATRA_NAMES) NAKSHATRA_SYLLABLES[nk].forEach((p) => {
      for (const n of namesForSyllable(p.syllable, "all")) expect(n.sound, `${nk} ${p.syllable.roman} ${n.name}`).toEqual(p.syllable.sound);
    });
  });

  it("respects boy / girl / gender-neutral; boy and girl lists include gender-neutral names", () => {
    const boy = names("Magha", 1, "boy");
    const girl = names("Magha", 1, "girl");
    const neutral = names("Magha", 1, "neutral");
    expect(boy.every((n) => n.gender !== "girl")).toBe(true);
    expect(girl.every((n) => n.gender !== "boy")).toBe(true);
    expect(neutral.every((n) => n.gender === "neutral")).toBe(true);
    expect(names("Revati", 3, "neutral").map((n) => n.name)).toContain("Charu");
  });

  it("falls back to the other padas only when the syllable has few names, and labels them", () => {
    expect(suggestionsFor("Anuradha", 1, "all")!.otherPadas).toEqual([]);
    const thin = suggestionsFor("Ashwini", 3, "all")!; // Cho: no good names
    expect(thin.primary.length).toBeLessThan(FEW_NAMES);
    expect(thin.otherPadas.length).toBeGreaterThan(0);
    const se = suggestionsFor("Purva Bhadrapada", 1, "all")!;
    expect(se.primary.map((n) => n.name).sort()).toEqual(["Seher", "Sejal"]);
    expect(se.otherPadas.map((g) => g.label.split(":")[0]).sort()).toEqual(["Pada 2", "Pada 3", "Pada 4"]);
  });

  it("every pada returns only names that match its own sound, and has no invented padding", () => {
    for (const nk of NAKSHATRA_NAMES) for (let p = 1; p <= 4; p++) {
      const s = suggestionsFor(nk, p, "all")!;
      for (const n of s.primary) expect(n.sound).toEqual(s.principal.syllable.sound);
    }
  });
});

describe("ranking and Modern Picks", () => {
  it("is deterministic and ranks every checked name above every editorial one", () => {
    for (const [nk, p] of [["Shatabhisha", 4], ["Ashlesha", 3], ["Magha", 1], ["Krittika", 1]] as const) {
      const list = names(nk, p);
      const ranked = rankNames(list, "all");
      expect(ranked.map((n) => n.name)).toEqual(rankNames(list, "all").map((n) => n.name));
      expect(ranked).toHaveLength(list.length);
      const firstEditorial = ranked.findIndex((n) => n.verification.status === "editorial");
      if (firstEditorial >= 0) expect(ranked.slice(firstEditorial).every((n) => n.verification.status === "editorial"), `${nk} ${p}`).toBe(true);
    }
  });

  it("variety: near-identical names (Tejas, Tejal, Tejasvi, Tejaswini) do not crowd out different ones", () => {
    const sample = ["Tejas", "Tejal", "Tejasvi", "Tejaswini", "Pavan", "Sagar"].map(byName);
    expect(new Set(sample.map((n) => n.verification.status)).size).toBe(1); // same tier, so only variety decides
    const top3 = rankNames(sample, "all").slice(0, 3);
    expect(top3.filter((n) => n.name.startsWith("Teja"))).toHaveLength(1);
  });

  it("prefers the parent's gender, then gender-neutral names", () => {
    const g = rankNames(names("Magha", 1, "girl"), "girl");
    const firstBoyIdx = g.findIndex((n) => n.gender === "boy");
    expect(firstBoyIdx).toBe(-1); // girl list holds no boys
    const b = rankNames(names("Ashlesha", 3, "boy"), "boy");
    expect(b.slice(0, 3).every((n) => n.gender === "boy")).toBe(true);
  });

  it("Modern Picks: at most four, each matching the sound, checked, modern, short and easy; different for different syllables", () => {
    const picks = (nk: string, p: number) => modernPicks(suggestionsFor(nk, p, "all")!.primary, "all");
    const na = picks("Anuradha", 1);
    const ma = picks("Magha", 1);
    expect(na.length).toBeGreaterThan(0);
    expect(na.length).toBeLessThanOrEqual(4);
    for (const n of [...na, ...ma]) {
      expect(n.verification.status).not.toBe("editorial");
      expect(n.popularity).toBe("Modern");
      expect(n.name.length).toBeLessThanOrEqual(7);
    }
    for (const n of na) expect(n.sound).toEqual(syllableFor("Anuradha", 1)!.syllable.sound);
    expect(na.map((n) => n.name)).not.toEqual(ma.map((n) => n.name));
    // A syllable with no checked modern names shows none rather than a weaker one.
    expect(picks("Ashwini", 3)).toEqual([]);
  });
});

describe("filters and search", () => {
  const all = names("Shatabhisha", 4);
  it("style filters narrow the list and keep only matching names", () => {
    expect(filterKind(all, "short").every((n) => n.name.length <= 5)).toBe(true);
    expect(filterKind(all, "traditional").every((n) => n.styles.includes("traditional"))).toBe(true);
    expect(filterKind(all, "modern").every((n) => n.styles.includes("modern"))).toBe(true);
    expect(filterKind(all, "nature").every((n) => n.styles.includes("nature"))).toBe(true);
    expect(filterKind(all, "all")).toEqual(all);
  });
  it("search matches the name, the Devanagari and the meaning, and still respects the syllable", () => {
    const sun = searchNames(all, "sun");
    expect(sun.length).toBeGreaterThan(0);
    expect(sun.every((n) => /sun/i.test(`${n.name} ${n.meaning}`))).toBe(true);
    expect(searchNames(all, "सुरेश").map((n) => n.name)).toContain("Suresh");
    expect(searchNames(all, "zzzz")).toEqual([]);
    for (const n of searchNames(all, "a")) expect(n.sound).toEqual(syllableFor("Shatabhisha", 4)!.syllable.sound);
  });
});

describe("minimum choice", () => {
  it("every pada gets at least ten names (its own plus labelled names from its Nakshatra's other padas) wherever the data allows", () => {
    const short: string[] = [];
    for (const nk of NAKSHATRA_NAMES) for (let p = 1; p <= 4; p++) {
      const s = suggestionsFor(nk, p, "all")!;
      const total = s.primary.length + s.alternates.reduce((n, g) => n + g.names.length, 0) + s.otherPadas.reduce((n, g) => n + g.names.length, 0);
      if (total < 10) short.push(nk + " " + p + "=" + total);
    }
    // eslint-disable-next-line no-console
    console.log("UNDER10 " + short.length + ": " + short.join(", "));
    expect(short.length).toBeLessThanOrEqual(12);
    for (const [nk, p] of [["Ashwini", 1], ["Ashwini", 3], ["Purva Bhadrapada", 1], ["Shravana", 1], ["Hasta", 4]] as const) {
      const s = suggestionsFor(nk, p, "all")!;
      expect(s.primary.length + s.alternates.reduce((n, g) => n + g.names.length, 0) + s.otherPadas.reduce((n, g) => n + g.names.length, 0), nk + " " + p).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("coverage (informational)", () => {
  it("counts names per distinct naming sound", () => {
    const seen = new Map<string, number>();
    for (const nk of NAKSHATRA_NAMES) NAKSHATRA_SYLLABLES[nk].forEach((p) => seen.set(`${p.syllable.roman}:${p.syllable.sound.onset}${p.syllable.sound.vowel}`, namesForSyllable(p.syllable, "all").length));
    const vals = [...seen.values()];
    // eslint-disable-next-line no-console
    console.log(`COVERAGE sounds=${vals.length} none=${vals.filter((v) => v === 0).length} under8=${vals.filter((v) => v > 0 && v < 8).length} atLeast8=${vals.filter((v) => v >= 8).length}`);
    expect(vals.length).toBeGreaterThan(80);
  });
});
