/**
 * Chart analysis for Ratna Jyotish: nakshatra and pada, sign dignity,
 * retrograde and combustion, conjunctions, Parashari (graha drishti) aspects
 * and the Vimshottari dasha. Everything here is derived deterministically from
 * the sidereal positions produced by `chart.engine.ts`; nothing is estimated
 * or invented.
 *
 * Deliberately NOT calculated (so the UI shows "Not calculated"):
 *  - Shadbala, Ashtakavarga or any numeric planetary-strength score.
 *  - Divisional charts (Navamsa etc.), temporal friendships, neecha-bhanga.
 *  - Aspects cast by Rahu and Ketu (schools disagree about them).
 */
import { computePlanets, wholeSignHouse, type BirthChart, type PlanetPosition } from "./chart.engine.js";
import {
  DEBILITATION_SIGN,
  EXALTATION_SIGN,
  PLANETS,
  SIGNS,
  SIGN_LORD,
  type Planet,
  type Sign,
} from "./gemstone.catalogue.js";

/* ---------------- Nakshatra ---------------- */

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
] as const;

/** Vimshottari order and years. */
export const DASHA_ORDER: readonly Planet[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];
export const DASHA_YEARS: Record<Planet, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const NAK_SPAN = 360 / 27;

export interface NakshatraInfo {
  name: string;
  pada: number; // 1-4
  lord: Planet;
  index: number;
  /** Fraction of the nakshatra already traversed, [0, 1). */
  fraction: number;
}

export const nakshatraOf = (longitude: number): NakshatraInfo => {
  const lon = ((longitude % 360) + 360) % 360;
  const index = Math.min(26, Math.floor(lon / NAK_SPAN));
  const within = lon - index * NAK_SPAN;
  return {
    name: NAKSHATRAS[index],
    pada: Math.min(4, Math.floor(within / (NAK_SPAN / 4)) + 1),
    lord: DASHA_ORDER[index % 9],
    index,
    fraction: within / NAK_SPAN,
  };
};

/* ---------------- Dignity ---------------- */

export type Dignity =
  | "exalted"
  | "mooltrikona"
  | "own sign"
  | "friendly sign"
  | "neutral sign"
  | "enemy sign"
  | "debilitated"
  | "not assessed";

const FRIENDS: Record<string, Planet[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<string, Planet[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

/** Mooltrikona sign and degree range (Parashari). */
const MOOLTRIKONA: Partial<Record<Planet, { sign: Sign; from: number; to: number }>> = {
  Sun: { sign: "Leo", from: 0, to: 20 },
  Moon: { sign: "Taurus", from: 4, to: 30 },
  Mars: { sign: "Aries", from: 0, to: 12 },
  Mercury: { sign: "Virgo", from: 16, to: 20 },
  Jupiter: { sign: "Sagittarius", from: 0, to: 10 },
  Venus: { sign: "Libra", from: 0, to: 15 },
  Saturn: { sign: "Aquarius", from: 0, to: 20 },
};

/** Natural (permanent) friendship only; temporal friendship is not applied. */
export const dignityOf = (planet: Planet, sign: Sign, degreeInSign: number): Dignity => {
  if (planet === "Rahu" || planet === "Ketu") return "not assessed";
  if (EXALTATION_SIGN[planet] === sign) return "exalted";
  if (DEBILITATION_SIGN[planet] === sign) return "debilitated";
  const mt = MOOLTRIKONA[planet];
  if (mt && mt.sign === sign && degreeInSign >= mt.from && degreeInSign < mt.to) return "mooltrikona";
  const lord = SIGN_LORD[sign];
  if (lord === planet) return "own sign";
  if (FRIENDS[planet].includes(lord)) return "friendly sign";
  if (ENEMIES[planet].includes(lord)) return "enemy sign";
  return "neutral sign";
};

/* ---------------- Retrograde, combustion ---------------- */

const HALF_DAY_MS = 12 * 3_600_000;

/** Retrograde when the sidereal longitude decreases across the surrounding day. Mean nodes are always retrograde. */
export const retrogradeSet = (date: Date): Set<Planet> => {
  const before = computePlanets(new Date(date.getTime() - HALF_DAY_MS));
  const after = computePlanets(new Date(date.getTime() + HALF_DAY_MS));
  const out = new Set<Planet>(["Rahu", "Ketu"]);
  for (const p of ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as Planet[]) {
    let d = after[p].longitude - before[p].longitude;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    if (d < 0) out.add(p);
  }
  return out;
};

const COMBUST_ORB: Partial<Record<Planet, { direct: number; retro?: number }>> = {
  Moon: { direct: 12 },
  Mars: { direct: 17 },
  Mercury: { direct: 14, retro: 12 },
  Jupiter: { direct: 11 },
  Venus: { direct: 10, retro: 8 },
  Saturn: { direct: 15 },
};

const sep = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Traditional combustion orbs from the Sun (degrees of longitude). */
export const isCombust = (planet: Planet, chart: BirthChart, retro: boolean): boolean => {
  const orb = COMBUST_ORB[planet];
  if (!orb) return false;
  return sep(chart.planets[planet].longitude, chart.planets.Sun.longitude) <= (retro && orb.retro ? orb.retro : orb.direct);
};

/* ---------------- Aspects and conjunctions ---------------- */

/** Houses counted from the aspecting planet (7 for all; Mars 4/8, Jupiter 5/9, Saturn 3/10). */
const ASPECTS: Partial<Record<Planet, number[]>> = {
  Sun: [7], Moon: [7], Mercury: [7], Venus: [7],
  Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10],
};

export const conjunctionsOf = (planet: Planet, chart: BirthChart): Planet[] =>
  PLANETS.filter((p) => p !== planet && chart.planets[p].signIndex === chart.planets[planet].signIndex);

/** Planets (excluding the nodes) whose whole-sign aspect falls on this planet's sign. */
export const aspectedBy = (planet: Planet, chart: BirthChart): Planet[] => {
  const target = chart.planets[planet].signIndex;
  return PLANETS.filter((q) => {
    if (q === planet) return false;
    const set = ASPECTS[q];
    if (!set) return false;
    const dist = ((target - chart.planets[q].signIndex + 12) % 12) + 1;
    return dist !== 1 && set.includes(dist);
  });
};

/* ---------------- House ownership and functional nature ---------------- */

export const housesOwnedBy = (planet: Planet, lagnaSignIndex: number): number[] => {
  const houses: number[] = [];
  for (let i = 0; i < 12; i++) if (SIGN_LORD[SIGNS[i]] === planet) houses.push(wholeSignHouse(lagnaSignIndex, i));
  return houses.sort((a, b) => a - b);
};

export const KENDRA = [1, 4, 7, 10];
export const TRIKONA = [1, 5, 9];
export const DUSTHANA = [6, 8, 12];

export type Functional = "yogakaraka" | "benefic" | "malefic" | "mixed" | "neutral" | "node";

/**
 * Parashari functional nature for a given Lagna, from house lordship alone:
 *  - owns a kendra AND a (non-Lagna) trikona: yogakaraka;
 *  - owns the Lagna or a trikona and no dusthana: benefic;
 *  - owns only dusthana (6/8/12): malefic (Sun and Moon owning the 8th alone are
 *    treated as neutral, the traditional exemption);
 *  - owns trikona/Lagna together with a dusthana: mixed;
 *  - owns only the 3rd and/or 11th: mildly malefic; recorded as "malefic" with that reason;
 *  - otherwise neutral (only 2nd, 4th, 7th, 10th).
 */
export const functionalNature = (
  planet: Planet,
  lagnaSignIndex: number,
): { nature: Functional; houses: number[]; reason: string } => {
  const houses = housesOwnedBy(planet, lagnaSignIndex);
  if (houses.length === 0) {
    return { nature: "node", houses, reason: `${planet} owns no sign, so it has no house lordship.` };
  }
  const list = houses.map(ord).join(" and ");
  const hasKendra = houses.some((h) => KENDRA.includes(h) && h !== 1);
  const hasTrikona = houses.some((h) => (h === 5 || h === 9));
  const hasLagna = houses.includes(1);
  const dust = houses.filter((h) => DUSTHANA.includes(h));
  const goodHouse = hasTrikona || hasLagna;

  if (hasKendra && hasTrikona && dust.length === 0) {
    return { nature: "yogakaraka", houses, reason: `${planet} rules the ${list} houses, a kendra and a trikona together (yogakaraka).` };
  }
  if (goodHouse && dust.length === 0) {
    return { nature: "benefic", houses, reason: `${planet} rules the ${list} house${houses.length > 1 ? "s" : ""}, with no 6th, 8th or 12th lordship.` };
  }
  if (goodHouse && dust.length > 0) {
    return { nature: "mixed", houses, reason: `${planet} rules the ${list} houses: a Lagna/trikona lordship together with the ${dust.map(ord).join(" and ")} house.` };
  }
  if (dust.length > 0) {
    if ((planet === "Sun" || planet === "Moon") && houses.length === 1 && houses[0] === 8) {
      return { nature: "neutral", houses, reason: `${planet} rules only the 8th house, which many Parashari teachers treat as no fault for the Sun and Moon.` };
    }
    return { nature: "malefic", houses, reason: `${planet} rules the ${list} house${houses.length > 1 ? "s" : ""}; the ${dust.map(ord).join(" and ")} ${dust.length > 1 ? "are dusthanas" : "is a dusthana"} (6th, 8th or 12th).` };
  }
  if (houses.every((h) => h === 3 || h === 11)) {
    return { nature: "malefic", houses, reason: `${planet} rules only the ${list} house, which is classed as mildly unfavourable.` };
  }
  return { nature: "neutral", houses, reason: `${planet} rules the ${list} house${houses.length > 1 ? "s" : ""} (kendra or maraka only), which gives no clear benefic or malefic character.` };
};

const ord = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
export const ordinalHouse = ord;

/* ---------------- Planet profile ---------------- */

export interface PlanetProfile {
  planet: Planet;
  sign: Sign;
  house: number;
  degree: number;
  nakshatra: string;
  pada: number;
  nakshatraLord: Planet;
  dignity: Dignity;
  retrograde: boolean;
  combust: boolean;
  housesOwned: number[];
  conjunctions: Planet[];
  aspectedBy: Planet[];
}

/** `birthInstant` is null only for hand-built charts; retrograde motion is then not determined. */
export const buildProfiles = (chart: BirthChart, birthInstant: Date | null): Record<Planet, PlanetProfile> => {
  const retro = birthInstant ? retrogradeSet(birthInstant) : new Set<Planet>();
  const out = {} as Record<Planet, PlanetProfile>;
  for (const p of PLANETS) {
    const pos: PlanetPosition = chart.planets[p];
    const nak = nakshatraOf(pos.longitude);
    const isRetro = retro.has(p);
    out[p] = {
      planet: p,
      sign: pos.sign,
      house: wholeSignHouse(chart.ascendant.signIndex, pos.signIndex),
      degree: Math.round(pos.degreeInSign * 10) / 10,
      nakshatra: nak.name,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      dignity: dignityOf(p, pos.sign, pos.degreeInSign),
      retrograde: isRetro,
      combust: isCombust(p, chart, isRetro),
      housesOwned: housesOwnedBy(p, chart.ascendant.signIndex),
      conjunctions: conjunctionsOf(p, chart),
      aspectedBy: aspectedBy(p, chart),
    };
  }
  return out;
};

/* ---------------- Vimshottari dasha ---------------- */

export interface DashaPeriod {
  lord: Planet;
  start: string; // ISO date (UTC)
  end: string;
}

export interface DashaResult {
  asOf: string;
  moonNakshatra: string;
  mahadasha: DashaPeriod;
  antardasha: DashaPeriod;
}

const YEAR_MS = 365.25 * 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Vimshottari mahadasha and antardasha running at `now`, from the Moon's sidereal longitude at birth. */
export const vimshottari = (moonLongitude: number, birth: Date, now: Date): DashaResult | null => {
  const nak = nakshatraOf(moonLongitude);
  const startIdx = DASHA_ORDER.indexOf(nak.lord);
  // The first mahadasha began before birth by the elapsed share of its period.
  let cursor = birth.getTime() - nak.fraction * DASHA_YEARS[nak.lord] * YEAR_MS;
  const t = now.getTime();
  if (t < birth.getTime()) return null;
  for (let i = 0; i < 18; i++) {
    const md = DASHA_ORDER[(startIdx + i) % 9];
    const mdMs = DASHA_YEARS[md] * YEAR_MS;
    if (t < cursor + mdMs) {
      let ad = cursor;
      const mdIdx = DASHA_ORDER.indexOf(md);
      for (let j = 0; j < 9; j++) {
        const adLord = DASHA_ORDER[(mdIdx + j) % 9];
        const adMs = (mdMs * DASHA_YEARS[adLord]) / 120;
        if (t < ad + adMs) {
          return {
            asOf: iso(t),
            moonNakshatra: nak.name,
            mahadasha: { lord: md, start: iso(cursor), end: iso(cursor + mdMs) },
            antardasha: { lord: adLord, start: iso(ad), end: iso(ad + adMs) },
          };
        }
        ad += adMs;
      }
    }
    cursor += mdMs;
  }
  return null; // older than two full cycles: not calculated
};
