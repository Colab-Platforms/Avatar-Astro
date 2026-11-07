import { BABY_NAMES, type BabyName, type Style } from "./names";
import { sameSound } from "./devanagari";
import { NAKSHATRA_SYLLABLES, syllableFor, type PadaSyllable, type Syllable } from "./syllables";
import { syllables } from "@/lib/namePronunciation";
import type { NamePreference, PadaRef } from "./types";

/** Boy and Girl include gender-neutral names (each card says which it is); Gender-neutral shows only those. */
export const allows = (pref: NamePreference, n: BabyName): boolean =>
  pref === "all" || n.gender === "neutral" || (pref === "boy" && n.gender === "boy") || (pref === "girl" && n.gender === "girl");

/** Names whose opening sound is the syllable's sound, filtered by the parent's preference. */
export function namesForSyllable(s: Syllable, pref: NamePreference): BabyName[] {
  return BABY_NAMES.filter((n) => sameSound(n.sound, s.sound) && (pref === "neutral" ? n.gender === "neutral" : allows(pref, n)));
}

export const isShort = (n: BabyName): boolean => n.name.length <= 5;

export type KindFilter = "all" | Style | "short";
export const KIND_LABEL: Record<KindFilter, string> = {
  all: "All styles", modern: "Modern", traditional: "Traditional", spiritual: "Spiritual", short: "Short names", unique: "Unique", nature: "Nature-inspired", mythology: "Mythology",
};
export const filterKind = (names: BabyName[], kind: KindFilter): BabyName[] =>
  kind === "all" ? names : kind === "short" ? names.filter(isShort) : names.filter((n) => n.styles.includes(kind));

/** Case-insensitive search over the name, its Devanagari spelling and its meaning. */
export const searchNames = (names: BabyName[], query: string): BabyName[] => {
  const q = query.trim().toLowerCase();
  return q ? names.filter((n) => n.name.toLowerCase().includes(q) || n.deva.includes(q) || n.meaning.toLowerCase().includes(q)) : names;
};

/**
 * Ranking, in priority order (each tier outweighs the one after it):
 *   1. Exact syllable match: guaranteed, because only names whose Devanagari opens with the calculated sound are ever ranked.
 *   2. Verification: source-listed or web-checked beats editorial.
 *   3. Modern usability: a Modern style, a short spelling, at most three syllables, no hard aspirated opening.
 *   4. Cultural appropriateness: Sanskrit and Indian-language names first, Persian-Arabic names used in India after them.
 *   5. The parent's gender preference: an exact match first, a gender-neutral name next.
 *   6. Variety: a name that repeats the stem, style or length of one already chosen is moved down, so ten near-identical
 *      names (Tej, Tejas, Tejasvi ...) never fill the page.
 * Ties break alphabetically, so the same input always gives the same order.
 */
const HARD_OPEN = /^(kh|gh|chh|jh|ng)/i;
const baseScore = (n: BabyName, pref: NamePreference): number => {
  let s = 0;
  s += n.verification.status === "editorial" ? 0 : 300;
  s += n.popularity === "Modern" ? 60 : 0;
  s += n.name.length <= 6 ? 30 : n.name.length <= 8 ? 10 : 0;
  s += syllables(n.name).length <= 3 ? 20 : 0;
  s += HARD_OPEN.test(n.name) ? 0 : 10;
  s += /^(Sanskrit|Hindi|Marathi|Gujarati|Bengali|Punjabi)/.test(n.origin) ? 12 : 4;
  s += pref === "all" ? 0 : n.gender === pref ? 8 : n.gender === "neutral" ? 4 : 0;
  return s;
};

export function rankNames(names: BabyName[], pref: NamePreference = "all"): BabyName[] {
  const left = names.map((n) => ({ n, s: baseScore(n, pref) })).sort((a, b) => b.s - a.s || a.n.name.localeCompare(b.n.name));
  const out: BabyName[] = [];
  const stems = new Map<string, number>();
  const lens = new Map<number, number>();
  const styles = new Map<string, number>();
  while (left.length) {
    let bi = 0;
    let best = -Infinity;
    left.forEach((c, i) => {
      const stem = c.n.name.toLowerCase().slice(0, 4);
      // Capped, so variety (last priority) can never lift an editorial name above a checked one.
      const adj = c.s - Math.min(40 * (stems.get(stem) ?? 0), 150) - Math.min(6 * (lens.get(c.n.name.length) ?? 0) + 5 * (styles.get(c.n.styles[0]) ?? 0), 60);
      if (adj > best) { best = adj; bi = i; }
    });
    const [pick] = left.splice(bi, 1);
    out.push(pick.n);
    const stem = pick.n.name.toLowerCase().slice(0, 4);
    stems.set(stem, (stems.get(stem) ?? 0) + 1);
    lens.set(pick.n.name.length, (lens.get(pick.n.name.length) ?? 0) + 1);
    styles.set(pick.n.styles[0], (styles.get(pick.n.styles[0]) ?? 0) + 1);
  }
  return out;
}

/** Up to four names that match the sound, have a checked meaning, are modern, short and easy to say. Fewer (or none) when fewer qualify. */
export function modernPicks(names: BabyName[], pref: NamePreference = "all", max = 4): BabyName[] {
  return rankNames(names, pref)
    .filter((n) => n.verification.status !== "editorial" && n.popularity === "Modern" && n.name.length <= 7 && syllables(n.name).length <= 3 && !HARD_OPEN.test(n.name))
    .slice(0, max);
}

export interface SyllableGroup {
  label: string;
  syllable: Syllable;
  names: BabyName[];
}

export interface Suggestions {
  principal: PadaSyllable;
  /** Names for the calculated syllable. */
  primary: BabyName[];
  /** Names for syllables other traditions give for the same pada. */
  alternates: SyllableGroup[];
  /** Used only when the calculated syllable has fewer than 3 names: the other padas of the same Nakshatra, as tradition allows. */
  otherPadas: SyllableGroup[];
}

/** Parents are shown at least this many names where the dataset allows: when the calculated sound has fewer, names from the
 *  other padas of the same Nakshatra are added, clearly labelled (families often choose from them when a syllable has few names). */
export const MIN_NAMES = 10;
export const FEW_NAMES = MIN_NAMES;

export function suggestionsFor(nakshatra: string, pada: number, pref: NamePreference): Suggestions | null {
  const principal = syllableFor(nakshatra, pada);
  if (!principal) return null;
  const primary = rankNames(namesForSyllable(principal.syllable, pref), pref);
  const alternates = principal.alternates
    .map((s) => ({ label: `${s.roman} (${s.deva})`, syllable: s, names: rankNames(namesForSyllable(s, pref), pref) }))
    .filter((g) => g.names.length > 0);
  const otherPadas: SyllableGroup[] = [];
  if (primary.length < FEW_NAMES) {
    // Names already on the page are never repeated in a later group.
    const seen = new Set([...primary, ...alternates.flatMap((g) => g.names)].map((n) => n.name));
    NAKSHATRA_SYLLABLES[nakshatra].forEach((p, i) => {
      if (i + 1 === pada) return;
      for (const [k, s] of [p.syllable, ...p.alternates].entries()) {
        const names = rankNames(namesForSyllable(s, pref), pref).filter((n) => !seen.has(n.name));
        if (!names.length) continue;
        names.forEach((n) => seen.add(n.name));
        otherPadas.push({ label: `Pada ${i + 1}: ${s.roman} (${s.deva})${k > 0 ? ", the syllable some traditions give" : ""}`, syllable: s, names });
      }
    });
  }
  return { principal, primary, alternates, otherPadas };
}

/** The syllable for each pada the Moon may be in (more than one when the birth time is close to a boundary or approximate). */
export function possibleSyllables(padas: PadaRef[]): { ref: PadaRef; entry: PadaSyllable | null }[] {
  return padas.map((ref) => ({ ref, entry: syllableFor(ref.nakshatra, ref.pada) }));
}

/** Spellings of a syllable's opening that an English-letter name may use (Mi: mi, mee; Ku: ku, koo; Va: va, vaa). */
export function romanStarts(roman: string): string[] {
  const r = roman.toLowerCase();
  const stem = r.slice(0, -1);
  const out = new Set([r]);
  if (r.endsWith("i")) { out.add(`${stem}ee`); out.add(`${stem}ii`); }
  if (r.endsWith("u")) { out.add(`${stem}oo`); out.add(`${stem}uu`); }
  if (r.endsWith("a")) out.add(`${stem}aa`);
  if (r.endsWith("e")) out.add(`${stem}ee`);
  return [...out];
}

/**
 * Whether a parent's preferred name, written in English letters, begins with the calculated syllable (or one of its alternates).
 * This is a check on the letters only: the name has no Devanagari to read the sound from, so the page says so.
 */
export function preferredNameFit(name: string, principal: PadaSyllable): { fits: boolean; matched: Syllable | null } {
  const n = name.trim().toLowerCase();
  for (const s of [principal.syllable, ...principal.alternates]) {
    if (romanStarts(s.roman).some((p) => n.startsWith(p))) return { fits: true, matched: s };
  }
  return { fits: false, matched: null };
}
