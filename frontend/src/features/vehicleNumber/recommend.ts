/**
 * Lucky Vehicle Number: recommendations. Pure functions, no UI.
 *
 * WHAT IS RECOMMENDED: ordinary four-digit registration numbers (0001 to 9999) of the kind most people are allotted in the normal
 * course. Premium or "fancy" numbers (7777, 1234, 1212, 1001, 0786, 2000 ...) are often sold at a higher fee or need a special
 * allotment, so they are never recommended. FANCY_RULES below says exactly which patterns count; it is a plain list that can be
 * changed. A number is never removed merely for repeating a digit: 2655, 3118 or 4833 are ordinary.
 *
 * HOW: (1) every ordinary number is a candidate; (2) each is run through the SAME evaluation and scoring used to check an existing
 * number (vehicleNumerology.ts); (3) they are ranked by compatibility points; (4) a diverse set is picked from the top.
 *
 * DIVERSITY: compatibility always comes first, so a lower-scoring number is only chosen when diversity rules rule out every
 * higher-scoring one. Within a score, the pick prefers a reduced number not yet used, and no two numbers share a digit total
 * (relaxed only if there are too few). No more than two numbers share a reduced number (relaxed only if there are too few).
 *
 * TIE-BREAKS (consistent and repeatable): where it came from (preferred, birth date, range, everyday), then more distinct digits
 * (they read as ordinary), then a fixed shuffle seeded by the person's date of birth, so the list is stable for the same person
 * and different between people.
 *
 * Whether a number can be registered depends on the RTO: nothing here checks availability.
 */
import { evaluateDigits, compatibility, type Compatibility, type Evaluation, type PersonNumbers } from "./vehicleNumerology";
import { isValidNumber } from "./registration";

export type Source = "preferred" | "birth-date" | "range" | "everyday";

export const SOURCE_LABEL: Record<Source, string> = {
  preferred: "Your preferred number",
  "birth-date": "From your date of birth",
  range: "In your preferred range",
  everyday: "Everyday number",
};
const SOURCE_RANK: Record<Source, number> = { preferred: 0, "birth-date": 1, range: 2, everyday: 3 };

/** Numbers widely recognised as special, so usually treated as premium. Edit this list to change what counts. */
export const SPECIAL_NUMBERS: readonly string[] = ["0786", "0108", "1008", "0143"];

export interface FancyRule {
  id: string;
  /** Short name shown to the user. */
  label: string;
  /** One line, with examples. */
  description: string;
  test: (n: string) => boolean;
}

const digitsOf = (n: string) => n.split("").map(Number);

/** The rules that mark a four-digit number as premium or fancy. A number matching any rule is left out of recommendations. */
export const FANCY_RULES: FancyRule[] = [
  { id: "repeated-digit", label: "Same digit four times", description: "such as 1111, 7777, 8888", test: (n) => /^(\d)\1{3}$/.test(n) },
  { id: "triple-digit", label: "One digit three times", description: "such as 0007, 1311, 2220", test: (n) => digitsOf(n).some((d, _, a) => a.filter((x) => x === d).length >= 3) },
  { id: "repeated-pairs", label: "Repeated pairs", description: "such as 1122, 7788, 1212, 2020", test: (n) => (n[0] === n[1] && n[2] === n[3]) || (n[0] === n[2] && n[1] === n[3]) },
  { id: "mirror", label: "Mirror number", description: "such as 1001, 0770, 1221", test: (n) => n === [...n].reverse().join("") },
  {
    id: "sequence",
    label: "Easy sequence",
    description: "such as 1234, 4321, 5678, 2468",
    test: (n) => { const d = digitsOf(n); const step = d[1] - d[0]; return step !== 0 && Math.abs(step) <= 3 && d.every((x, i) => i === 0 || x - d[i - 1] === step); },
  },
  { id: "round", label: "Round number", description: "such as 2000, 1500, 0100", test: (n) => n.endsWith("00") },
  { id: "low", label: "Very low number", description: "0001 to 0099", test: (n) => Number(n) < 100 },
  { id: "special", label: "Widely recognised special number", description: "such as 0786, 0108, 1008, or any number containing 786", test: (n) => SPECIAL_NUMBERS.includes(n) || n.includes("786") },
];

/** The labels of every fancy rule a number matches (empty for an ordinary number). */
export const fancyReasons = (n: string, rules: FancyRule[] = FANCY_RULES): string[] => rules.filter((r) => r.test(n)).map((r) => r.label);
export const isFancy = (n: string, rules: FancyRule[] = FANCY_RULES): boolean => rules.some((r) => r.test(n));

export interface Candidate {
  number: string;
  source: Source;
  evaluation: Evaluation;
  compat: Compatibility;
}

export interface RecommendOptions {
  person: PersonNumbers;
  /** YYYY-MM-DD. */
  dob: string;
  /** A four-digit number the user prefers. It is used when it is an ordinary number. */
  preferred?: string;
  /** An inclusive range of registration numbers, 1 to 9999. Recommendations come from inside it. */
  range?: { min: number; max: number };
  /** How many to return (default 8). */
  limit?: number;
  /** Override the exclusion rules. */
  fancyRules?: FancyRule[];
}

export interface Recommendations {
  items: Candidate[];
  /** True when the preferred range held no ordinary numbers, so all four-digit numbers were searched instead. */
  rangeFallback: boolean;
  /** Why the preferred number was not used, when it is a premium-style number. Empty otherwise. */
  preferredFancy: string[];
}

const pad = (v: number | string, w = 2) => String(v).padStart(w, "0");

/** Four-digit numbers made from a date of birth (YYYY-MM-DD). */
export function birthDateNumbers(dob: string): string[] {
  const [y, m, d] = dob.split("-");
  if (!y || !m || !d) return [];
  return [...new Set([`00${pad(d)}`, `${pad(d)}${pad(m)}`, `${pad(m)}${pad(d)}`, y.padStart(4, "0").slice(-4)])].filter(isValidNumber);
}

/** A fixed, repeatable shuffle: the same inputs always give the same value. */
const mix = (n: number, seed: number): number => {
  let x = (n ^ seed) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};

export function recommendWithInfo(opts: RecommendOptions): Recommendations {
  const rules = opts.fancyRules ?? FANCY_RULES;
  const ordinary = (n: string) => isValidNumber(n) && !isFancy(n, rules);
  const range = opts.range ? { lo: Math.max(1, Math.min(opts.range.min, opts.range.max)), hi: Math.min(9999, Math.max(opts.range.min, opts.range.max)) } : null;
  const inRange = (n: string) => !range || (Number(n) >= range.lo && Number(n) <= range.hi);

  let rangeFallback = false;
  const useRange = range && Array.from({ length: range.hi - range.lo + 1 }, (_, i) => pad(range.lo + i, 4)).some(ordinary);
  if (range && !useRange) rangeFallback = true;
  const restrict = (n: string) => (useRange ? inRange(n) : true);

  const pool = new Map<string, Source>();
  const add = (n: string, source: Source) => {
    if (!ordinary(n) || !restrict(n)) return;
    const have = pool.get(n);
    if (!have || SOURCE_RANK[source] < SOURCE_RANK[have]) pool.set(n, source);
  };
  const preferred = opts.preferred ? opts.preferred.padStart(4, "0") : "";
  if (preferred) add(preferred, "preferred");
  for (const n of birthDateNumbers(opts.dob)) add(n, "birth-date");
  const lo = useRange ? range!.lo : 1;
  const hi = useRange ? range!.hi : 9999;
  for (let i = lo; i <= hi; i++) add(pad(i, 4), useRange ? "range" : "everyday");

  const seed = Number(opts.dob.replace(/\D/g, "")) >>> 0;
  const all = [...pool].flatMap(([number, source]) => {
    const evaluation = evaluateDigits(number);
    return evaluation ? [{ number, source, evaluation, compat: compatibility(evaluation, opts.person), distinct: new Set(number).size, order: mix(Number(number), seed) }] : [];
  });
  all.sort((a, b) => b.compat.points - a.compat.points || SOURCE_RANK[a.source] - SOURCE_RANK[b.source] || b.distinct - a.distinct || a.order - b.order);

  const limit = opts.limit ?? 8;
  const picked: typeof all = [];
  const roots = new Map<number, number>();
  const totals = new Map<number, number>();
  // Level 0: one number per digit total and two per reduced number. Level 1: two per total, three per reduced number. Level 2: no limits.
  // Levels 1 and 2 are only reached when the pool is too small (for example a very narrow range).
  for (let level = 0; level < 3 && picked.length < limit; level++) {
    const perTotal = level === 0 ? 1 : level === 1 ? 2 : Infinity;
    while (picked.length < limit) {
      const rootCap = level === 0 ? 2 : level === 1 ? 3 : Infinity;
      let best: (typeof all)[number] | null = null;
      for (const c of all) {
        if (picked.includes(c)) continue;
        if ((totals.get(c.evaluation.total) ?? 0) >= perTotal) continue;
        if ((roots.get(c.evaluation.root) ?? 0) >= rootCap) continue;
        if (!best) best = c;
        else if (c.compat.points < best.compat.points) break; // compatibility always comes first
        else if ((roots.get(c.evaluation.root) ?? 0) < (roots.get(best.evaluation.root) ?? 0)) best = c; // same score: use a reduced number not yet used
      }
      if (!best) break;
      picked.push(best);
      roots.set(best.evaluation.root, (roots.get(best.evaluation.root) ?? 0) + 1);
      totals.set(best.evaluation.total, (totals.get(best.evaluation.total) ?? 0) + 1);
    }
  }

  picked.sort((a, b) => b.compat.points - a.compat.points); // best first; a stable sort, so equal scores keep the order they were picked in
  const items: Candidate[] = picked.map(({ number, source, evaluation, compat }) => ({ number, source, evaluation, compat }));
  return { items, rangeFallback, preferredFancy: preferred && !isValidNumber(preferred) ? [] : preferred ? fancyReasons(preferred, rules) : [] };
}

export const recommend = (opts: RecommendOptions): Candidate[] => recommendWithInfo(opts).items;
