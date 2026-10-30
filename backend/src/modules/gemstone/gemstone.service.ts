import { computeBirthChart, wholeSignHouse } from "./chart.engine.js";
import { BirthTimeError, resolveBirthInstant } from "./birth.time.js";
import { recommend, type ChartAnalysis } from "./recommendation.js";
import { type Dignity } from "./analysis.js";
import { selectByBirthDate, WEEKDAY_TABLE, type WeekdayRow } from "./date.based.js";
import { buildWearingGuidance } from "./wearing.js";
import {
  generateDateExplanation,
  generateExplanation,
  type Explanation,
  type ExplainOptions,
} from "./explanation.service.js";
import { computePanchang, type PanchangDetails } from "./panchang.js";
import { lahiriAyanamsa } from "./chart.engine.js";
import { GEMSTONES, PLANETS, type GemstoneInfo, type Planet, type Sign } from "./gemstone.catalogue.js";

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;
export type Gender = (typeof GENDERS)[number];

export interface PersonalProfile {
  fullName: string;
  gender: Gender;
  /** Kilograms, or null when not given. */
  weightKg: number | null;
}

export interface CalculateInput {
  /** Personal details; the API requires them, direct callers may omit them. */
  profile?: PersonalProfile;
  /** Civil date of birth at the birthplace, YYYY-MM-DD. */
  dateOfBirth: string;
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
    "The Ascendant, planetary signs, nakshatras and the Vimshottari dasha are calculated from your birth date, time and place. The Lagna lord's Ratna is the primary traditional recommendation. The 5th and 9th house rulers give alternatives unless they also rule the 6th, 8th or 12th house. Planets whose Ratna is cautioned are listed with chart-specific reasons. Rahu and Ketu own no sign, so Hessonite (Gomed) and Cat's Eye (Lehsunia) are shown only as cautions under this method.",
  limitations: [
    "This is one school of Vedic astrology; other methods (Moon-sign, dasha-led, Shadbala-based) can give different results.",
    "Numeric planetary strength (Shadbala, Ashtakavarga), divisional charts and the aspects of Rahu and Ketu are not calculated.",
    "Ratna associations are traditional beliefs. There is no scientific evidence that a Ratna changes life outcomes.",
    "Planetary positions are geocentric; the Ascendant changes about 1° every 4 minutes, so an inaccurate birth time can change the result.",
  ],
};

/** Used only when the exact birth time is unknown. */
export const DATE_METHOD: MethodInfo = {
  id: "birth-date-place",
  name: "Birth-Date & Place Ratna Method",
  zodiac: "Sidereal (used only for the planetary context shown)",
  ayanamsa: "Lahiri (Chitrapaksha)",
  houses: "Not calculated: the Ascendant and houses need an exact birth time",
  nodes: "Mean lunar node (context only)",
  engine: "astronomy-engine ephemeris, sampled across the whole local birth date at your birthplace",
  summary:
    "Without a birth time the Ascendant cannot be found, so this method uses the traditional weekday-ruler convention instead. The local calendar weekday at your birthplace is taken from your birth date; the planet that rules that weekday gives the Ratna traditionally associated with it (Sunday: Sun, Ruby; Monday: Moon, Pearl; Tuesday: Mars, Red Coral; Wednesday: Mercury, Emerald; Thursday: Jupiter, Yellow Sapphire; Friday: Venus, Diamond or White Sapphire; Saturday: Saturn, Blue Sapphire). Real planetary positions across that date are checked, and any planet that stays in one sign all day is noted as context. No Ascendant, houses or Lagna lord are claimed.",
  limitations: [
    "This is a date-based interpretation. It is less specific than a full birth-chart reading, which needs your exact birth time.",
    "The local calendar weekday is used. Classical reckoning starts a weekday at sunrise, so a birth shortly after midnight but before sunrise can belong to the previous weekday.",
    "The weekday-ruler Ratna is one traditional convention; other methods (Lagna-lord, Moon-sign, dasha-based) can suggest a different stone.",
    "Ratna associations are traditional beliefs. There is no scientific evidence that a Ratna changes life outcomes.",
  ],
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ValidationError extends Error {}

export const MIN_WEIGHT_KG = 2;
export const MAX_WEIGHT_KG = 300;

const parseProfile = (body: any): PersonalProfile => {
  const name = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) throw new ValidationError("Please enter your full name.");
  if (name.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(name)) {
    throw new ValidationError("Full name can contain letters, spaces, dots, hyphens and apostrophes only.");
  }
  if (!GENDERS.includes(body.gender)) throw new ValidationError("Please select a gender option.");
  let weightKg: number | null = null;
  if (body.weightKg !== undefined && body.weightKg !== null && body.weightKg !== "") {
    const w = Number(body.weightKg);
    if (!Number.isFinite(w) || w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG) {
      throw new ValidationError(`Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`);
    }
    weightKg = Math.round(w * 10) / 10;
  }
  return { fullName: name, gender: body.gender, weightKg };
};

export const parseInput = (body: any, opts: { requireProfile?: boolean } = {}): CalculateInput => {
  if (!body || typeof body !== "object") throw new ValidationError("Request body is required.");
  const dm = typeof body.dateOfBirth === "string" ? DATE_RE.exec(body.dateOfBirth) : null;
  if (!dm) throw new ValidationError("Date of birth must be in YYYY-MM-DD format.");
  const dateOfBirth: string = body.dateOfBirth;
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
  // Checked after the birth details so their errors keep their existing precedence.
  const profile = opts.requireProfile === false ? undefined : parseProfile(body);
  return {
    profile,
    dateOfBirth,
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

export interface CalculationAudit {
  /** The civil date entered, so the calculation can be reproduced. */
  localDate: string;
  /** The astronomical birth instant (UTC), or null when no birth time was given. */
  resolvedInstantUtc: string | null;
  utcOffsetMinutes: number | null;
  timeZone: string;
  latitude: number;
  longitude: number;
  ayanamsa: string;
  ayanamsaDegrees: number | null;
}

export interface RatnaResult {
  profile: PersonalProfile | null;
  /** Calculated from the birth date, time and place; never entered by the user. */
  panchang: PanchangDetails;
  audit: CalculationAudit;
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
    planets: {
      planet: Planet;
      sign: Sign;
      degree: number;
      house: number;
      nakshatra: string;
      pada: number;
      dignity: Dignity;
      retrograde: boolean;
      combust: boolean;
    }[];
  };
  stableSigns: { planet: Planet; sign: Sign }[];
  /** The one Ratna this result is about, whichever method chose it. */
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
    analysis: ChartAnalysis;
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
  const label = placeLabel(input.place);
  const { latitude, longitude, timezone } = input.place;
  const known = !(input.timeUnknown || !input.timeOfBirth);

  const dateOfBirth = input.dateOfBirth;
  // Computed after the birth data is validated, so existing validation errors keep their precedence.
  const buildPanchang = (): PanchangDetails => {
    const [th, tm] = known ? input.timeOfBirth!.split(":").map(Number) : [0, 0];
    return computePanchang({ localDate: dateOfBirth, time: known ? { hour: th, minute: tm } : null, place: input.place });
  };
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const profile = input.profile ?? null;
  const weightKg = profile?.weightKg ?? null;
  const audit = (instant: Date | null, offset: number | null): CalculationAudit => ({
    localDate: dateOfBirth,
    resolvedInstantUtc: instant ? instant.toISOString() : null,
    utcOffsetMinutes: offset,
    timeZone: timezone,
    latitude,
    longitude,
    ayanamsa: "Lahiri (Chitrapaksha), mean",
    ayanamsaDegrees: instant ? Math.round(lahiriAyanamsa(instant) * 10000) / 10000 : null,
  });

  const baseBirth = {
    dateOfBirth,
    timeOfBirth: input.timeOfBirth,
    place: label,
    timeZone: timezone,
  };

  if (!known) {
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
      { label: "Traditional Ratna", value: sel.stone.name },
      ...(sel.weekdayLordSign
        ? [{ label: `${sel.weekdayLord} on that date`, value: `In ${sel.weekdayLordSign} all day (sidereal)` }]
        : []),
      { label: "Birth time", value: "Not used (unknown)" },
    ];
    return {
      profile,
      panchang: buildPanchang(),
      audit: audit(null, null),
      status: "date_based",
      method: DATE_METHOD,
      birth: { ...baseBirth, utcOffsetMinutes: null, ambiguousLocalTime: false },
      chart: null,
      stableSigns: sel.stableSigns,
      primary: {
        stone: sel.stone,
        planet: sel.weekdayLord,
        basis: "birth-weekday",
        summary: `Using your local birth date (a ${sel.weekday}) and birthplace, the Birth-Date & Place Ratna Method identifies ${sel.stone.name}, traditionally associated with ${sel.weekdayLord}, as your Ratna association.`,
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
        weightKg,
      ),
      explanation,
      notice: null,
    };
  }

  const [hh, mm] = input.timeOfBirth!.split(":").map(Number);
  const instant = resolveBirthInstant(
    { year: y, month: m, day: d, hour: hh, minute: mm },
    timezone,
  );
  const chart = computeBirthChart(instant.utc, latitude, longitude);
  const rec = recommend(chart, deps.now ?? new Date());
  const profiles = rec.analysis.profiles;

  const planetSigns: Partial<Record<Planet, Sign>> = {};
  for (const p of PLANETS) planetSigns[p] = chart.planets[p].sign;
  const explanation = await generateExplanation(
    { recommendation: rec, planetSigns },
    deps.explain,
  );

  return {
    profile,
    panchang: buildPanchang(),
    audit: audit(instant.utc, instant.offsetMinutes),
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
        nakshatra: profiles[p].nakshatra,
        pada: profiles[p].pada,
        dignity: profiles[p].dignity,
        retrograde: profiles[p].retrograde,
        combust: profiles[p].combust,
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
      analysis: rec.analysis,
    },
    wearing: buildWearingGuidance(
      rec.primary,
      { label, latitude, longitude, timeZone: timezone },
      deps.now,
      weightKg,
    ),
    explanation,
    notice: instant.ambiguous
      ? "Your local birth time occurred twice at your birthplace because of a clock change; the earlier occurrence was used."
      : null,
  };
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export { BirthTimeError };

/** Pre-profile callers (and tests) that supply only birth details. The HTTP route never uses this. */
export const parseLegacyInput = (body: any): CalculateInput => parseInput(body, { requireProfile: false });
