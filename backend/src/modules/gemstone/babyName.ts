/**
 * Baby Name Jyotish: the birth Panchang that decides the traditional naming syllable.
 *
 * This module adds NO astronomy of its own. Every value comes from `computePanchang` (panchang.ts), the same engine and the
 * same sidereal Lahiri settings as the Janma Kundali. It only (1) validates the request, (2) calls that engine, and
 * (3) re-runs it a few minutes either side of the birth time to tell the parent honestly when the Nakshatra pada is close
 * to a boundary, so an exact birth time matters. The Nakshatra-pada to syllable table lives with the front end data.
 */
import { BirthTimeError, resolveBirthInstant } from "./birth.time.js";
import { computePanchang, type PanchangDetails } from "./panchang.js";
import { parseBirthPlace, type BirthPlace } from "./panchang.birth.js";
import { ValidationError } from "./gemstone.service.js";

export interface BabyNameInput {
  dateOfBirth: string;
  /** Local birth time, HH:mm. Required: the naming syllable depends on it. */
  timeOfBirth: string;
  /** The parent says the time is only approximate. The result then lists every pada the Moon crosses in the window. */
  timeApproximate: boolean;
  place: BirthPlace;
  placeLabel: string;
}

export interface PadaRef { nakshatra: string; pada: number }

export interface BabyNameResult {
  birth: { dateOfBirth: string; timeOfBirth: string; place: string; timeZone: string; latitude: number; longitude: number };
  timeApproximate: boolean;
  panchang: {
    nakshatra: { name: string; pada: number; lord: string };
    moonRashi: string;
    tithi: { name: string; hindi: string; numberInPaksha: number };
    paksha: "shukla" | "krishna";
    masa: { name: string; hindi: string; adhika: boolean };
    vara: { name: string; note: string | null };
    vikramSamvat: number;
    basis: PanchangDetails["basis"];
  };
  /** Padas the Moon is in during the checked window. More than one means the syllable depends on the exact minute. */
  window: { minutesEitherSide: number; padas: PadaRef[] };
  nearPadaBoundary: boolean;
  method: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseBabyNameInput = (body: unknown): BabyNameInput => {
  const b = (body ?? {}) as Record<string, unknown>;
  const dateOfBirth = typeof b.dateOfBirth === "string" ? b.dateOfBirth : "";
  if (!DATE_RE.test(dateOfBirth)) throw new ValidationError("Please enter the baby's date of birth.");
  const timeOfBirth = typeof b.timeOfBirth === "string" ? b.timeOfBirth : "";
  if (!TIME_RE.test(timeOfBirth)) throw new ValidationError("Please enter the baby's exact time of birth. The naming syllable depends on it.");
  const rawPlace = (b.place ?? {}) as Record<string, unknown>;
  const place = parseBirthPlace(rawPlace);
  if (!place) throw new ValidationError("Please select the birthplace from the list.");
  const parts = [rawPlace.name, rawPlace.admin1, rawPlace.country].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return {
    dateOfBirth,
    timeOfBirth,
    timeApproximate: b.timeApproximate === true,
    place,
    placeLabel: (parts.join(", ") || "Selected birthplace").slice(0, 120),
  };
};

/** Local wall-clock parts of an instant in a time zone. */
const localParts = (at: Date, tz: string) => {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return { localDate: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
};

export const buildBabyName = (input: BabyNameInput): BabyNameResult => {
  const [hour, minute] = input.timeOfBirth.split(":").map(Number);
  const [year, month, day] = input.dateOfBirth.split("-").map(Number);
  const tz = input.place.timezone;
  const birth = resolveBirthInstant({ year, month, day, hour, minute }, tz).utc; // rejects impossible / future times
  const p = computePanchang({ localDate: input.dateOfBirth, time: { hour, minute }, place: input.place });

  // Re-run the same engine around the birth time. 10 minutes either side when exact, 60 when the parent is unsure.
  const span = input.timeApproximate ? 60 : 10;
  const step = input.timeApproximate ? 10 : 5;
  const seen = new Map<string, PadaRef>();
  for (let m = -span; m <= span; m += step) {
    const lp = localParts(new Date(birth.getTime() + m * 60_000), tz);
    const s = computePanchang({ localDate: lp.localDate, time: { hour: lp.hour, minute: lp.minute }, place: input.place });
    const ref = { nakshatra: s.nakshatra.name, pada: s.nakshatra.pada };
    seen.set(`${ref.nakshatra}/${ref.pada}`, ref);
  }
  const padas = [...seen.values()];

  return {
    birth: {
      dateOfBirth: input.dateOfBirth,
      timeOfBirth: input.timeOfBirth,
      place: input.placeLabel,
      timeZone: tz,
      latitude: input.place.latitude,
      longitude: input.place.longitude,
    },
    timeApproximate: input.timeApproximate,
    panchang: {
      nakshatra: p.nakshatra,
      moonRashi: p.moonRashi,
      tithi: { name: p.tithi.name, hindi: p.tithi.hindi, numberInPaksha: p.tithi.numberInPaksha },
      paksha: p.paksha,
      masa: p.masa,
      vara: p.vara,
      vikramSamvat: p.vikramSamvat,
      basis: p.basis,
    },
    window: { minutesEitherSide: span, padas },
    nearPadaBoundary: padas.length > 1,
    method: p.convention.label,
  };
};

export { BirthTimeError };
