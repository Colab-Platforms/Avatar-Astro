import { computeBirthChart, wholeSignHouse } from "./chart.engine.js";
import { BirthTimeError, resolveBirthInstant } from "./birth.time.js";
import { recommend } from "./recommendation.js";
import { stableSignsForDate } from "./limited.chart.js";
import { buildWearingGuidance } from "./wearing.js";
import {
  generateExplanation,
  type Explanation,
  type ExplainOptions,
} from "./explanation.service.js";
import { GEMSTONES, PLANETS, type Planet, type Sign } from "./gemstone.catalogue.js";

export interface CalculateInput {
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:mm, null when unknown
  timeUnknown: boolean;
  place: {
    name: string;
    admin1?: string | null;
    country?: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export const METHOD = {
  name: "Parashari Lagna-lord method",
  zodiac: "Sidereal",
  ayanamsa: "Lahiri (Chitrapaksha)",
  houses: "Whole sign",
  nodes: "Mean lunar node",
  engine: "astronomy-engine ephemeris, computed for the exact birth instant",
  summary:
    "The Ascendant is calculated from your birth date, time and place. Its ruling planet (the Lagna lord) gives the primary traditional gemstone. The 5th and 9th house rulers are noted as optional secondary perspectives unless they also rule the 6th, 8th or 12th house. Rahu and Ketu own no sign, so Hessonite and Cat's Eye are not produced by this method.",
  limitations: [
    "This is one school of Vedic astrology; other methods (Moon-sign, dasha-based, planetary-strength) can give different results.",
    "Gemstone associations are traditional beliefs. There is no scientific evidence that a gemstone changes life outcomes.",
    "Planetary positions are geocentric; the Ascendant changes about 1° every 4 minutes, so an inaccurate birth time can change the result.",
  ],
} as const;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ValidationError extends Error {}

export const parseInput = (body: any): CalculateInput => {
  if (!body || typeof body !== "object") throw new ValidationError("Request body is required.");
  const dm = typeof body.dateOfBirth === "string" ? DATE_RE.exec(body.dateOfBirth) : null;
  if (!dm) throw new ValidationError("Date of birth must be in YYYY-MM-DD format.");
  const timeUnknown = body.timeUnknown === true;
  let timeOfBirth: string | null = null;
  if (!timeUnknown) {
    if (typeof body.timeOfBirth !== "string" || !TIME_RE.test(body.timeOfBirth)) {
      throw new ValidationError("Birth time must be in HH:mm format, or mark the time as unknown.");
    }
    timeOfBirth = body.timeOfBirth;
  }
  const p = body.place;
  if (
    !p ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 120 ||
    typeof p.timezone !== "string" ||
    typeof p.latitude !== "number" ||
    typeof p.longitude !== "number"
  ) {
    throw new ValidationError("Please select your birthplace from the suggestions.");
  }
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : null);
  return {
    dateOfBirth: body.dateOfBirth,
    timeOfBirth,
    timeUnknown,
    place: {
      name: p.name.trim(),
      admin1: str(p.admin1),
      country: str(p.country),
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.timezone,
    },
  };
};

const placeLabel = (p: CalculateInput["place"]) =>
  [p.name, p.admin1, p.country].filter(Boolean).join(", ");

export interface RatnaResult {
  status: "complete" | "limited";
  method: typeof METHOD;
  birth: {
    dateOfBirth: string;
    timeOfBirth: string | null;
    place: string;
    timeZone: string;
    utcOffsetMinutes: number | null;
    ambiguousLocalTime: boolean;
  };
  chart: null | {
    ascendant: { sign: Sign; degree: number };
    planets: { planet: Planet; sign: Sign; degree: number; house: number }[];
  };
  stableSigns: { planet: Planet; sign: Sign }[];
  recommendation: null | {
    stone: (typeof GEMSTONES)[string];
    lagnaLord: Planet;
    lagnaLordSign: Sign;
    lagnaLordHouse: number;
    factors: { label: string; value: string }[];
    secondary: {
      house: number;
      planet: Planet;
      sign: Sign;
      stone: (typeof GEMSTONES)[string];
      reason: string;
    }[];
    excluded: { house: number; planet: Planet; reason: string }[];
    cautions: string[];
  };
  wearing: ReturnType<typeof buildWearingGuidance> | null;
  explanation: Explanation;
  notice: string | null;
}

export interface CalculateDeps {
  explain?: ExplainOptions;
  now?: Date;
}

export const calculateRatna = async (
  input: CalculateInput,
  deps: CalculateDeps = {},
): Promise<RatnaResult> => {
  const [y, m, d] = input.dateOfBirth.split("-").map(Number);
  const label = placeLabel(input.place);
  const { latitude, longitude, timezone } = input.place;

  const baseBirth = {
    dateOfBirth: input.dateOfBirth,
    timeOfBirth: input.timeOfBirth,
    place: label,
    timeZone: timezone,
  };

  if (input.timeUnknown || !input.timeOfBirth) {
    // Validate the date/zone even though no time is available.
    resolveBirthInstant({ year: y, month: m, day: d, hour: 12, minute: 0 }, timezone);
    const stableSigns = stableSignsForDate({ year: y, month: m, day: d }, timezone);
    return {
      status: "limited",
      method: METHOD,
      birth: { ...baseBirth, utcOffsetMinutes: null, ambiguousLocalTime: false },
      chart: null,
      stableSigns,
      recommendation: null,
      wearing: null,
      explanation: {
        source: "rules",
        text: "Without an exact birth time, your Ascendant (Lagna) and houses cannot be calculated, and the Lagna-lord method cannot reliably identify a personalised gemstone. No recommendation is made. If you can find your birth time (for example on a birth certificate), you can calculate again.",
      },
      notice:
        stableSigns.length > 0
          ? "Only planetary signs that stay the same throughout your birth date are shown below."
          : null,
    };
  }

  const [hh, mm] = input.timeOfBirth.split(":").map(Number);
  const instant = resolveBirthInstant(
    { year: y, month: m, day: d, hour: hh, minute: mm },
    timezone,
  );
  const chart = computeBirthChart(instant.utc, latitude, longitude);
  const rec = recommend(chart);

  const planetSigns: Partial<Record<Planet, Sign>> = {};
  for (const p of PLANETS) planetSigns[p] = chart.planets[p].sign;
  const explanation = await generateExplanation(
    { recommendation: rec, planetSigns },
    deps.explain,
  );

  return {
    status: "complete",
    method: METHOD,
    birth: {
      ...baseBirth,
      utcOffsetMinutes: instant.offsetMinutes,
      ambiguousLocalTime: instant.ambiguous,
    },
    chart: {
      ascendant: { sign: chart.ascendant.sign, degree: round1(chart.ascendant.degreeInSign) },
      planets: PLANETS.map((p) => ({
        planet: p,
        sign: chart.planets[p].sign,
        degree: round1(chart.planets[p].degreeInSign),
        house: wholeSignHouse(chart.ascendant.signIndex, chart.planets[p].signIndex),
      })),
    },
    stableSigns: [],
    recommendation: {
      stone: rec.primary,
      lagnaLord: rec.lagnaLord,
      lagnaLordSign: rec.lagnaLordSign,
      lagnaLordHouse: rec.lagnaLordHouse,
      factors: rec.factors,
      secondary: rec.secondary.map((s) => ({
        house: s.house,
        planet: s.planet,
        sign: s.sign,
        stone: s.stone,
        reason: s.reason,
      })),
      excluded: rec.excluded,
      cautions: rec.cautions,
    },
    wearing: buildWearingGuidance(
      rec.primary,
      { label, latitude, longitude, timeZone: timezone },
      deps.now,
    ),
    explanation,
    notice: instant.ambiguous
      ? "Your local birth time occurred twice at your birthplace because of a clock change; the earlier occurrence was used."
      : null,
  };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export { BirthTimeError };
