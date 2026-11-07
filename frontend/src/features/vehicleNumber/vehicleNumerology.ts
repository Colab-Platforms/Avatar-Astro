/**
 * Lucky Vehicle Number: the numerology method. Pure functions, no UI.
 *
 * THE METHOD (documented so it can be checked and challenged):
 *
 *  1. Take the evaluated digits of the registration (by default the four-digit number, leading zeros kept: 0007).
 *  2. Add them: the digit sum. 0007 -> 7, 1234 -> 10.
 *  3. Reduce with the same routine as the rest of MyBhagya numerology (reductionChain in lib/numerology.ts): keep adding digits until
 *     one remains, stopping at the master numbers 11, 22 and 33. 2900 -> 11 (a master number, read like 2); 1234 -> 10 -> 1.
 *  4. Planet: the single-digit root maps to its planet with the existing PLANET_BY_DIGIT table (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu,
 *     5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars).
 *  5. Compare that planet with the planet of the person's Birth Number and of their Life Path, using natural planetary friendship
 *     (naisargika maitri) from Brihat Parashara Hora Shastra, the same table the Janma Kundali analysis uses (backend analysis.ts).
 *     The relation is read FROM the person's planet TOWARDS the vehicle's planet.
 *        same number +2, natural friend +1, neutral 0, natural enemy -1   (once for the Birth Number, once for the Life Path)
 *  6. Total of the two lines: 3 or 4 Strong match, 2 Good match, 0 or 1 Neutral match, below 0 Less aligned.
 *
 * WHAT THE METHOD DOES NOT DO: it does not use the Panchang or the Nakshatra (no verified traditional rule links them to registration
 * digits), it gives no percentages, and "Less aligned" is a traditional reading of two planets, not a statement that a number is bad.
 * LIMITATIONS: Brihat Parashara defines friendships for the seven visible planets only. Rahu (4) and Ketu (7) are not in it; by a common
 * convention Rahu is read like Saturn and Ketu like Mars, and results that depend on that are flagged "by convention". Schools differ.
 */
import { PLANET_BY_DIGIT, reduceNumber, reductionChain, themeFor, type NumberTheme } from "@/lib/numerology";

export type Relation = "same" | "friend" | "neutral" | "enemy";
export type Label = "Strong match" | "Good match" | "Neutral match" | "Less aligned";

type Seven = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";

/** Natural friendship, Brihat Parashara Hora Shastra. A row reads: this planet regards the listed planets as friends / enemies. */
export const FRIENDS: Record<Seven, Seven[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
export const ENEMIES: Record<Seven, Seven[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

/** The convention for the two nodes: Rahu is read like Saturn, Ketu like Mars. */
const NODE_AS: Record<string, Seven> = { Rahu: "Saturn", Ketu: "Mars" };
const asSeven = (planet: string): { p: Seven; byConvention: boolean } =>
  planet in NODE_AS ? { p: NODE_AS[planet], byConvention: true } : { p: planet as Seven, byConvention: false };

export const POINTS: Record<Relation, number> = { same: 2, friend: 1, neutral: 0, enemy: -1 };
export const RELATION_WORD: Record<Relation, string> = {
  same: "the same number",
  friend: "a natural friend",
  neutral: "neutral",
  enemy: "not a natural friend",
};

export interface Evaluation {
  /** The digits that were evaluated, leading zeros kept. */
  digits: string;
  total: number;
  /** Every total reached while reducing, starting with the digit sum. */
  chain: number[];
  /** The reduced number, which can be a master number (11, 22, 33). */
  reduced: number;
  /** The single digit used for the planet (a master number reads as its root: 11 -> 2). */
  root: number;
  master: 11 | 22 | 33 | null;
  planet: string;
  symbol: string;
  theme: NumberTheme;
}

export function evaluateDigits(digits: string): Evaluation | null {
  if (!/^\d+$/.test(digits)) return null;
  const total = digits.split("").reduce((a, d) => a + Number(d), 0);
  if (total === 0) return null;
  const chain = reductionChain(total, true);
  const reduced = chain[chain.length - 1];
  const root = reduceNumber(total, false);
  const master = [11, 22, 33].includes(reduced) ? (reduced as 11 | 22 | 33) : null;
  const info = PLANET_BY_DIGIT[root];
  return { digits, total, chain, reduced, root, master, planet: info.planet, symbol: info.symbol, theme: themeFor(reduced) };
}

export interface PersonNumbers {
  /** Birth Number as the app calculates it (day of birth, reduced, master numbers kept). */
  birth: number;
  /** Life Path as the app calculates it (every digit of the date, reduced, master numbers kept). */
  lifePath: number;
}

export interface ScoreLine {
  ref: "Birth Number" | "Life Path";
  refNumber: number;
  refRoot: number;
  refPlanet: string;
  relation: Relation;
  points: number;
  byConvention: boolean;
}

export interface Compatibility {
  lines: ScoreLine[];
  points: number;
  label: Label;
}

export function relationBetween(refRoot: number, vehicleRoot: number): { relation: Relation; byConvention: boolean } {
  if (refRoot === vehicleRoot) return { relation: "same", byConvention: false };
  const a = asSeven(PLANET_BY_DIGIT[refRoot].planet);
  const b = asSeven(PLANET_BY_DIGIT[vehicleRoot].planet);
  const byConvention = a.byConvention || b.byConvention;
  if (a.p === b.p) return { relation: "friend", byConvention }; // a node and the planet it is read like
  if (FRIENDS[a.p].includes(b.p)) return { relation: "friend", byConvention };
  if (ENEMIES[a.p].includes(b.p)) return { relation: "enemy", byConvention };
  return { relation: "neutral", byConvention };
}

export const labelFor = (points: number): Label => (points >= 3 ? "Strong match" : points === 2 ? "Good match" : points >= 0 ? "Neutral match" : "Less aligned");

export function compatibility(ev: Evaluation, person: PersonNumbers): Compatibility {
  const line = (ref: ScoreLine["ref"], n: number): ScoreLine => {
    const root = reduceNumber(n, false);
    const r = relationBetween(root, ev.root);
    return { ref, refNumber: n, refRoot: root, refPlanet: PLANET_BY_DIGIT[root].planet, relation: r.relation, points: POINTS[r.relation], byConvention: r.byConvention };
  };
  const lines = [line("Birth Number", person.birth), line("Life Path", person.lifePath)];
  const points = lines.reduce((a, l) => a + l.points, 0);
  return { lines, points, label: labelFor(points) };
}

/** One plain sentence per scoring line: the actual calculation, in words. */
export function explain(ev: Evaluation, c: Compatibility): string[] {
  return c.lines.map((l) => {
    const sign = l.points > 0 ? `+${l.points}` : String(l.points);
    const master = l.refNumber !== l.refRoot ? ` (a master number, read as ${l.refRoot})` : "";
    const tail = l.relation === "same" ? `Both reduce to ${ev.root}` : `${l.refPlanet} regards ${ev.planet} as ${RELATION_WORD[l.relation]}`;
    return `${l.ref} ${l.refNumber}${master} is ruled by ${l.refPlanet}. ${tail}: ${sign}.${l.byConvention ? " (Rahu and Ketu are read by convention.)" : ""}`;
  });
}
