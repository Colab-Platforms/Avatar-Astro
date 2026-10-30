/**
 * Janma Kundali profile (Vedic / Nirayana).
 *
 * Everything is calculated, nothing is looked up or assumed:
 *  - Zodiac: sidereal (Nirayana), Lahiri ayanamsa (see chart.engine.ts).
 *  - Surya Rashi: sidereal sign of the Sun. Chandra Rashi: sidereal sign of the Moon.
 *  - Nakshatra and pada from the Moon's sidereal longitude.
 *  - Lagna and whole-sign houses only when an exact birth time is given.
 *  - Panchang (Hindu month, paksha, tithi, ...) from `panchang.ts`.
 *
 * Unknown birth time: the Sun and Moon are sampled across the whole local date at the birthplace.
 * A sign that does not change that day is stated as certain; one that changes is returned as two
 * candidates and flagged uncertain. No Lagna, houses or house placements are produced.
 */
import { computeBirthChart, computePlanets, wholeSignHouse } from "./chart.engine.js";
import { nakshatraOf, vimshottari, type DashaResult } from "./analysis.js";
import { resolveBirthInstant } from "./birth.time.js";
import { computePanchang, type PanchangDetails } from "./panchang.js";
import { stableSignsForDate } from "./limited.chart.js";
import { PLANETS, SIGNS, type Planet, type Sign } from "./gemstone.catalogue.js";
import { parseLegacyInput, ValidationError, type CalculateInput } from "./gemstone.service.js";

export const RASHI_NAMES: Record<Sign, { name: string; hindi: string }> = {
  Aries: { name: "Mesha", hindi: "मेष" },
  Taurus: { name: "Vrishabha", hindi: "वृषभ" },
  Gemini: { name: "Mithuna", hindi: "मिथुन" },
  Cancer: { name: "Karka", hindi: "कर्क" },
  Leo: { name: "Simha", hindi: "सिंह" },
  Virgo: { name: "Kanya", hindi: "कन्या" },
  Libra: { name: "Tula", hindi: "तुला" },
  Scorpio: { name: "Vrischika", hindi: "वृश्चिक" },
  Sagittarius: { name: "Dhanu", hindi: "धनु" },
  Capricorn: { name: "Makara", hindi: "मकर" },
  Aquarius: { name: "Kumbha", hindi: "कुम्भ" },
  Pisces: { name: "Meena", hindi: "मीन" },
};

export interface RashiRef {
  /** Western name of the same sidereal sign, shown beside the Vedic name for clarity. */
  sign: Sign;
  name: string;
  hindi: string;
}

const rashi = (sign: Sign): RashiRef => ({ sign, ...RASHI_NAMES[sign] });

export interface LuminaryResult {
  /** The Rashi when it is known; null when it changes during an unknown-time birth date. */
  rashi: RashiRef | null;
  /** All possible Rashis during the birth date (one entry when certain). */
  candidates: RashiRef[];
  certain: boolean;
  degreeInSign: number | null;
  nakshatra: { name: string; pada: number | null; lord: Planet } | null;
}

export interface KundaliResult {
  birth: {
    dateOfBirth: string;
    timeOfBirth: string | null;
    place: string;
    timeZone: string;
    latitude: number;
    longitude: number;
    resolvedInstantUtc: string | null;
    utcOffsetMinutes: number | null;
  };
  method: {
    zodiac: string;
    ayanamsa: string;
    ayanamsaDegrees: number | null;
    houses: string;
    nodes: string;
    engine: string;
    dateOfBirthIsCivil: true;
  };
  sun: LuminaryResult;
  moon: LuminaryResult;
  lagna: null | { rashi: RashiRef; degreeInSign: number; nakshatra: { name: string; pada: number; lord: Planet } };
  planets:
    | null
    | {
        planet: Planet;
        rashi: RashiRef;
        degreeInSign: number;
        house: number;
        nakshatra: string;
        pada: number;
      }[];
  /** Signs that stay fixed across the whole birth date (unknown-time reading only). */
  stableSigns: { planet: Planet; rashi: RashiRef }[];
  dasha: DashaResult | null;
  panchang: PanchangDetails;
  timeKnown: boolean;
  limitations: string[];
  /** Plain-language basis of each result, so the user can see how it was produced. */
  basis: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const uniqueSigns = (signs: Sign[]): Sign[] => SIGNS.filter((s) => signs.includes(s));

export const buildKundali = (input: CalculateInput, now: Date = new Date()): KundaliResult => {
  const [y, m, d] = input.dateOfBirth.split("-").map(Number);
  const { latitude, longitude, timezone } = input.place;
  const known = !(input.timeUnknown || !input.timeOfBirth);
  const date = { year: y, month: m, day: d };
  const placeLabel = [input.place.name, input.place.admin1, input.place.country].filter(Boolean).join(", ");

  if (known) {
    const [hh, mm] = input.timeOfBirth!.split(":").map(Number);
    const inst = resolveBirthInstant({ ...date, hour: hh, minute: mm }, timezone);
    const chart = computeBirthChart(inst.utc, latitude, longitude);
    const nakOf = (lon: number) => {
      const n = nakshatraOf(lon);
      return { name: n.name, pada: n.pada, lord: n.lord };
    };
    const sun = chart.planets.Sun;
    const moon = chart.planets.Moon;
    const panchang = computePanchang({ localDate: input.dateOfBirth, time: { hour: hh, minute: mm }, place: input.place });
    return {
      birth: {
        dateOfBirth: input.dateOfBirth,
        timeOfBirth: input.timeOfBirth,
        place: placeLabel,
        timeZone: timezone,
        latitude,
        longitude,
        resolvedInstantUtc: inst.utc.toISOString(),
        utcOffsetMinutes: inst.offsetMinutes,
      },
      method: methodInfo(chart.ayanamsa, "Whole sign (Lagna sign = 1st house)"),
      sun: { rashi: rashi(sun.sign), candidates: [rashi(sun.sign)], certain: true, degreeInSign: round1(sun.degreeInSign), nakshatra: nakOf(sun.longitude) },
      moon: { rashi: rashi(moon.sign), candidates: [rashi(moon.sign)], certain: true, degreeInSign: round1(moon.degreeInSign), nakshatra: nakOf(moon.longitude) },
      lagna: {
        rashi: rashi(chart.ascendant.sign),
        degreeInSign: round1(chart.ascendant.degreeInSign),
        nakshatra: nakOf(chart.ascendant.longitude),
      },
      planets: PLANETS.map((p) => {
        const pos = chart.planets[p];
        const n = nakshatraOf(pos.longitude);
        return {
          planet: p,
          rashi: rashi(pos.sign),
          degreeInSign: round1(pos.degreeInSign),
          house: wholeSignHouse(chart.ascendant.signIndex, pos.signIndex),
          nakshatra: n.name,
          pada: n.pada,
        };
      }),
      stableSigns: [],
      dasha: vimshottari(moon.longitude, inst.utc, now),
      panchang,
      timeKnown: true,
      limitations: [
        "Rahu and Ketu are the mean lunar nodes.",
        "Divisional charts (such as Navamsa), Shadbala and Ashtakavarga are not calculated.",
        "An error of a few minutes in birth time can move the Lagna: it advances about 1° every 4 minutes.",
      ],
      basis: [
        `Sidereal (Nirayana) zodiac with the ${chart.ayanamsa.toFixed(2)}° Lahiri ayanamsa for your birth year.`,
        `Your birth time ${input.timeOfBirth} in ${timezone} (UTC${inst.offsetMinutes >= 0 ? "+" : "-"}${Math.abs(inst.offsetMinutes / 60)}) was converted to the UTC instant ${inst.utc.toISOString()}.`,
        "Planet positions come from a high-precision astronomical ephemeris; the Lagna from your birthplace's latitude and longitude.",
        "Houses are whole-sign: the Lagna sign is the 1st house.",
      ],
    };
  }

  // ---- Unknown birth time: sample the whole local date ----
  const start = resolveBirthInstant({ ...date, hour: 0, minute: 0 }, timezone).utc;
  const end = resolveBirthInstant({ ...date, hour: 23, minute: 59 }, timezone).utc;
  const a = computePlanets(start);
  const b = computePlanets(end);
  const luminary = (planet: "Sun" | "Moon"): LuminaryResult => {
    const signs = uniqueSigns([a[planet].sign, b[planet].sign]);
    const certain = signs.length === 1;
    const noon = resolveBirthInstant({ ...date, hour: 12, minute: 0 }, timezone).utc;
    const mid = computePlanets(noon)[planet];
    const n = nakshatraOf(mid.longitude);
    const nakStable = nakshatraOf(a[planet].longitude).name === nakshatraOf(b[planet].longitude).name;
    return {
      rashi: certain ? rashi(signs[0]) : null,
      candidates: signs.map(rashi),
      certain,
      degreeInSign: null,
      // The nakshatra is only reported when the Moon stays in it all day.
      nakshatra: nakStable && certain ? { name: n.name, pada: n.pada, lord: n.lord } : null,
    };
  };
  const moon = luminary("Moon");
  const sun = luminary("Sun");
  // The Moon can change nakshatra several times a day, so the pada is never certain without a time.
  if (moon.nakshatra) {
    const padaStable = nakshatraOf(a.Moon.longitude).pada === nakshatraOf(b.Moon.longitude).pada;
    if (!padaStable) moon.nakshatra = { ...moon.nakshatra, pada: null };
  }
  return {
    birth: {
      dateOfBirth: input.dateOfBirth,
      timeOfBirth: null,
      place: placeLabel,
      timeZone: timezone,
      latitude,
      longitude,
      resolvedInstantUtc: null,
      utcOffsetMinutes: null,
    },
    method: methodInfo(null, "Not calculated: houses need an exact birth time"),
    sun,
    moon,
    lagna: null,
    planets: null,
    stableSigns: stableSignsForDate(date, timezone).map((s) => ({ planet: s.planet, rashi: rashi(s.sign) })),
    dasha: null,
    panchang: computePanchang({ localDate: input.dateOfBirth, time: null, place: input.place }),
    timeKnown: false,
    limitations: [
      "Without an exact birth time the Lagna (ascendant), the twelve houses and planetary house placements are not calculated, and none is assumed.",
      moon.certain
        ? "The Moon stays in one sign on your birth date, so Chandra Rashi is certain, but the Moon's pada and the Vimshottari dasha start point need your birth time."
        : "The Moon changes sign on your birth date, so Chandra Rashi, nakshatra and the Vimshottari dasha cannot be determined without your birth time.",
      sun.certain ? "Surya Rashi is certain for this date." : "The Sun changes sign (Sankranti) on your birth date, so Surya Rashi depends on your birth time.",
    ],
    basis: [
      "Sidereal (Nirayana) zodiac with the Lahiri ayanamsa.",
      `The Sun and Moon were calculated at the start and end of ${input.dateOfBirth} at your birthplace (${timezone}); a sign is stated only if it is the same at both.`,
    ],
  };
};

const methodInfo = (ayanamsa: number | null, houses: string): KundaliResult["method"] => ({
  zodiac: "Sidereal (Nirayana)",
  ayanamsa: "Lahiri (Chitrapaksha), mean",
  ayanamsaDegrees: ayanamsa == null ? null : Math.round(ayanamsa * 10000) / 10000,
  houses,
  nodes: "Mean lunar node",
  engine: "astronomy-engine ephemeris",
  dateOfBirthIsCivil: true,
});

export const parseKundaliInput = (body: unknown): CalculateInput => {
  const input = parseLegacyInput(body);
  if (!input.place) throw new ValidationError("Please select your birthplace.");
  return input;
};
