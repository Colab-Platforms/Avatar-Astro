import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import en from "@/i18n/locales/en.json";
import { STATIC_TEXT, TEMPLATES, OWN_NAMES, matchBackend, tb, tbCell, tbName, tbFactLabel, tbFactValue } from "../backendText";

const flat = (o: unknown, p = "", out: Record<string, string> = {}): Record<string, string> => {
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (typeof v === "string") out[p + k] = v;
    else flat(v, `${p}${k}.`, out);
  }
  return out;
};
const dict = flat(en);

// A stand-in for t(): it only knows keys that are really in the English dictionary and records any key that is not.
const missing: string[] = [];
const t = ((key: string, opts: Record<string, unknown> = {}) => {
  const raw = dict[key];
  if (raw === undefined) missing.push(key);
  return (raw ?? String(opts.defaultValue ?? key)).replace(/\{\{(\w+)\}\}/g, (_m, n) => String(opts[n]));
}) as unknown as TFunction;
const g = (_k: string, name: string) => name;

// Real sentences produced by the backend (ashtakoota.ts, match.ts, panchang.ts, panchang.birth.ts, panchang.today.ts).
const SAMPLES = [
  "Counting from the first person's star the relation is favourable; from the second's it is unfavourable.",
  "Counting from the first person's star the relation is unfavourable; from the second's it is favourable.",
  "Different animal symbols (2 of 4 in the traditional grid).",
  "Different animal symbols (3 of 4 in the traditional grid).",
  "Mars is in house 7 from the Lagna, one of the houses (1, 2, 4, 7, 8, 12) that tradition calls Mangal Dosha.",
  "Mars is in house 3 from the Lagna, which is not one of the Mangal Dosha houses (1, 2, 4, 7, 8, 12).",
  "Ashtakoota needs the exact birth time of both people. The first person's birth time is missing, so no Guna score was calculated.",
  "Ashtakoota needs the exact birth time of both people. The second person's birth time is missing, so no Guna score was calculated.",
  "Tithi changes during this date (shukla 5 to shukla 6); the exact value needs your birth time.",
  "Nakshatra changes during this date (Rohini to Mrigashira); the exact value needs your birth time.",
  "Moon Rashi changes during this date (Taurus to Gemini); the exact value needs your birth time.",
  "Yoga changes during this date (Siddhi to Vyatipata); the exact value needs your birth time.",
  "Karana changes during this date (Bava to Balava); the exact value needs your birth time.",
  "Born before local sunrise (06:12), so the Vedic weekday is Sunday, not Monday.",
  "Born before sunrise (06:12), so the Vedic weekday is Sunday.",
  "You were born in the bright half (Shukla Paksha), when the Moon grows bigger each night. Panchami is the 5th day of that half.",
  "At sunrise on your birth date it was the dark half (Krishna Paksha), when the Moon grows smaller each night. Dwitiya is the 2nd day of that half.",
  "You were born in the dark half (Krishna Paksha), when the Moon grows smaller each night. Trayodashi is the 13th day of that half.",
  "Today is Monday: Panchami, the 5th day of the bright half.",
  "Today is Friday: Navami, the 9th day of the dark half.",
  "1990-05-14 at 06:30, Mumbai, Maharashtra, India",
  "Sunrise on 1990-05-14, Mumbai, Maharashtra, India",
  "Tithi (at sunrise)",
  "Nakshatra (at sunrise)",
  "Rohini, pada 3",
  "Adhika Shravana",
  "Mars (lord of Aries)",
  "Venus (lord of Taurus)",
];

describe("backend sentence mapping", () => {
  it("every fixed sentence resolves to its own key and renders identically in English", () => {
    for (const [key, english] of Object.entries(STATIC_TEXT)) {
      const m = matchBackend(english);
      expect(m?.key, english).toBe(key);
      expect(tb(t, g, english)).toBe(english);
    }
  });

  it("every sample template output resolves to a key and renders identically in English", () => {
    for (const s of SAMPLES) {
      const m = matchBackend(s);
      expect(m, s).not.toBeNull();
      expect(dict[m!.key], m!.key).toBeTruthy();
      expect(tb(t, g, s)).toBe(s);
    }
    expect(TEMPLATES.every((tpl) => SAMPLES.some((s) => matchBackend(s)?.key === tpl.key))).toBe(true);
  });

  it("covers every Koota table cell and name", () => {
    const cells: [string, string][] = [
      ["Varna", "Brahmin"], ["Vashya", "Jalachara"], ["Tara", "Rohini"], ["Yoni", "Mongoose"], ["Graha Maitri", "Mars (lord of Aries)"],
      ["Gana", "Rakshasa"], ["Bhakoot", "Taurus"], ["Nadi", "Madhya"],
    ];
    for (const [k, v] of cells) expect(tbCell(t, g, k, v), `${k} ${v}`).toBe(v);
    for (const n of OWN_NAMES) expect(tbName(t, n)).toBe(n);
    expect(tbFactLabel(t, g, "Vedic weekday")).toBe("Vedic weekday");
    expect(tbFactValue(t, g, "Paksha", "Shukla (bright half)")).toBe("Shukla (bright half)");
    expect(tbFactValue(t, g, "Nakshatra (at sunrise)", "Rohini")).toBe("Rohini");
    expect(missing).toEqual([]);
  });

  it("re-renders extracted numbers and names through the key in another language", () => {
    const hi = ((key: string, opts: Record<string, unknown> = {}) => {
      const dictHi: Record<string, string> = { "gunaText.mangal.inHouse": "मंगल घर {{house}} में है", "panchangText.label.Tithi": "तिथि", "panchangText.uncertain.changes": "{{label}}: {{from}} -> {{to}}" };
      return (dictHi[key] ?? String(opts.defaultValue)).replace(/\{\{(\w+)\}\}/g, (_m, n) => String(opts[n]));
    }) as unknown as TFunction;
    const gh = (_k: string, name: string) => (name === "Rohini" ? "रोहिणी" : name);
    expect(tb(hi, gh, "Mars is in house 7 from the Lagna, one of the houses (1, 2, 4, 7, 8, 12) that tradition calls Mangal Dosha.")).toBe("मंगल घर 7 में है");
    expect(tb(hi, gh, "Tithi changes during this date (shukla 5 to shukla 6); the exact value needs your birth time.")).toBe("तिथि: shukla 5 -> shukla 6");
  });

  it("leaves unknown text unchanged", () => {
    expect(tb(t, g, "Something the server said that is not mapped.")).toBe("Something the server said that is not mapped.");
    expect(tbName(t, "Unknown")).toBe("Unknown");
  });
});
