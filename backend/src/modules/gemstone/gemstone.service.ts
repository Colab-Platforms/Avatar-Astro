import { computeBirthChart, wholeSignHouse } from "./chart.engine.js";
import { BirthTimeError, resolveBirthInstant } from "./birth.time.js";
import { recommend } from "./recommendation.js";
import { selectByBirthDate, WEEKDAY_TABLE, type WeekdayRow } from "./date.based.js";
import { buildWearingGuidance } from "./wearing.js";
import {
  generateDateExplanation,
  generateExplanation,
  type Explanation,
  type ExplainOptions,
} from "./explanation.service.js";
import { GEMSTONES, PLANETS, type GemstoneInfo, type Planet, type Sign } from "./gemstone.catalogue.js";

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

export interface MethodInfo {
  id: "lagna-lord" | "birth-date-place";
  name: string;
  zodiac: string;
  ayanamsa: string;
  houses: string;
  nodes: string;
  engine: string;
  summary: string;
  limitations: string[];
}

export const METHOD: MethodInfo = {
  id: "lagna-lord",
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
};

/** Used only when the exact birth time is unknown. */
export const DATE_METHOD: MethodInfo = {
  id: "birth-date-place",
  name: "Birth-Date & Place Gemstone Method",
  zodiac: "Sidereal (used only for the planetary context shown)",
  ayanamsa: "Lahiri (Chitrapaksha)",
  houses: "Not calculated: the Ascendant and houses need an exact birth time",
  nodes: "Mean lunar node (context only)",
  engine: "astronomy-engine ephemeris, sampled across the whole local birth date at your birthplace",
  summary:
    "Without a birth time the Ascendant cannot be found, so this method uses the traditional weekday-ruler convention instead. The local calendar weekday at your birthplace is taken from your birth date; the planet that rules that weekday gives the gemstone traditionally associated with it (Sunday: Sun, Ruby; Monday: Moon, Pearl; Tuesday: Mars, Red Coral; Wednesday: Mercury, Emerald; Thursday: Jupiter, Yellow Sapphire; Friday: Venus, Diamond or White Sapphire; Saturday: Saturn, Blue Sapphire). Real planetary positions across that date are checked, and any planet that stays in one sign all day is noted as context. No Ascendant, houses or Lagna lord are claimed.",
  limitations: [
    "This is a date-based interpretation. It is less specific than a full birth-chart reading, which needs your exact birth time.",
    "The local calendar weekday is used. Classical reckoning starts a weekday at sunrise, so a birth shortly after midnight but before sunrise can belong to the previous weekday.",
    "The weekday-ruler gemstone is one traditional convention; other methods (Lagna-lord, Moon-sign, dasha-based) can suggest a different stone.",
    "Gemstone associations are traditional beliefs. There is no scientific evidence that a gemstone changes life outcomes.",
  ],
};

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
  status: "complete" | "date_based";
  method: MethodInfo;
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
  /** The one gemstone this result is about, whichever method chose it. */
  primary: {
    stone: GemstoneInfo;
    planet: Planet;
    basis: "lagna-lord" | "birth-weekday";
    summary: string;
    factors: { label: string; value: string }[];
  };
  /** Present only for the unknown-birth-time method. */
  dateBased: null | {
    localDate: string;
    weekday: string;
    weekdayLord: Planet;
    rule: string;
    weekdayLordSign: Sign | null;
    sunrise: { local: string; timeZone: string } | null;
    classicalNote: string;
    table: WeekdayRow[];
  };
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
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new ValidationError("Invalid geographic coordinates.");
    }
    // Unlike the Ascendant, nothing here is unreliable at high latitudes.
    const sel = selectByBirthDate({ year: y, month: m, day: d }, input.place);
    const explanation = await generateDateExplanation(
      {
        stone: sel.stone,
        weekday: sel.weekday,
        weekdayLord: sel.weekdayLord,
        weekdayLordSign: sel.weekdayLordSign,
        stableSigns: sel.stableSigns,
        place: label,
        localDate: sel.localDate,
      },
      deps.explain,
    );
    const factors = [
      { label: "Local birth date", value: sel.localDate },
      { label: "Birthplace and time zone", value: `${label} (${timezone})` },
      { label: "Weekday ruler", value: `${sel.weekday}: ${sel.weekdayLord}` },
      { label: "Traditional gemstone", value: sel.stone.name },
      ...(sel.weekdayLordSign
        ? [{ label: `${sel.weekdayLord} on that date`, value: `In ${sel.weekdayLordSign} all day (sidereal)` }]
        : []),
      { label: "Birth time", value: "Not used (unknown)" },
    ];
    return {
      status: "date_based",
      method: DATE_METHOD,
      birth: { ...baseBirth, utcOffsetMinutes: null, ambiguousLocalTime: false },
      chart: null,
      stableSigns: sel.stableSigns,
      primary: {
        stone: sel.stone,
        planet: sel.weekdayLord,
        basis: "birth-weekday",
        summary: `Using your local birth date (a ${sel.weekday}) and birthplace, the Birth-Date & Place Gemstone Method identifies ${sel.stone.name}, traditionally associated with ${sel.weekdayLord}, as your gemstone association.`,
        factors,
      },
      dateBased: {
        localDate: sel.localDate,
        weekday: sel.weekday,
        weekdayLord: sel.weekdayLord,
        rule: sel.rule,
        weekdayLordSign: sel.weekdayLordSign,
        sunrise: sel.sunrise,
        classicalNote: sel.classicalNote,
        table: WEEKDAY_TABLE,
      },
      recommendation: null,
      wearing: buildWearingGuidance(
        sel.stone,
        { label, latitude, longitude, timeZone: timezone },
        deps.now,
      ),
      explanation,
      notice: null,
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
    primary: {
      stone: rec.primary,
      planet: rec.primary.planet,
      basis: "lagna-lord",
      summary: `Your Ascendant is ${rec.lagnaSign}; its ruler ${rec.lagnaLord} is traditionally associated with ${rec.primary.name} under the Parashari Lagna-lord method.`,
      factors: rec.factors,
    },
    dateBased: null,
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
