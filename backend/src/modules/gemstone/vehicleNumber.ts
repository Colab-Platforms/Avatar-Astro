/**
 * Lucky Vehicle Number: the birth Panchang shown on the user's birth profile.
 *
 * This module adds NO astronomy of its own. Every value comes from `computePanchang` (panchang.ts), the same engine and the same
 * sidereal Lahiri settings as the Janma Kundali and Baby Name Jyotish. The vehicle-number evaluation itself (digit sum, reduced
 * number, planet relations) is plain arithmetic on the front end and does NOT use the Panchang: no verified traditional rule links a
 * Nakshatra to registration digits, so none is invented here. The Panchang is returned so the birth profile can be shown.
 */
import { resolveBirthInstant } from "./birth.time.js";
import { computePanchang } from "./panchang.js";
import { parseBirthPlace, type BirthPlace } from "./panchang.birth.js";
import { ValidationError } from "./gemstone.service.js";

export interface VehicleProfileInput {
  dateOfBirth: string;
  /** Local birth time, HH:mm. Required: the Nakshatra, Pada and Rashi depend on it. */
  timeOfBirth: string;
  place: BirthPlace;
  placeLabel: string;
}

export interface VehicleProfileResult {
  birth: { dateOfBirth: string; timeOfBirth: string; place: string; timeZone: string; latitude: number; longitude: number };
  panchang: {
    nakshatra: { name: string; pada: number; lord: string };
    moonRashi: string;
    tithi: { name: string; hindi: string; numberInPaksha: number };
    paksha: "shukla" | "krishna";
    masa: { name: string; hindi: string; adhika: boolean };
    vara: { name: string; note: string | null };
    vikramSamvat: number;
    basis: "birth-time" | "sunrise";
  };
  method: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseVehicleProfileInput = (body: unknown): VehicleProfileInput => {
  const b = (body ?? {}) as Record<string, unknown>;
  const dateOfBirth = typeof b.dateOfBirth === "string" ? b.dateOfBirth : "";
  if (!DATE_RE.test(dateOfBirth)) throw new ValidationError("Please enter your date of birth.");
  const timeOfBirth = typeof b.timeOfBirth === "string" ? b.timeOfBirth : "";
  if (!TIME_RE.test(timeOfBirth)) throw new ValidationError("Please enter your exact time of birth. Your Nakshatra and Pada depend on it.");
  const rawPlace = (b.place ?? {}) as Record<string, unknown>;
  const place = parseBirthPlace(rawPlace);
  if (!place) throw new ValidationError("Please select your birthplace from the list.");
  const parts = [rawPlace.name, rawPlace.admin1, rawPlace.country].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return { dateOfBirth, timeOfBirth, place, placeLabel: (parts.join(", ") || "Selected birthplace").slice(0, 120) };
};

export const buildVehicleProfile = (input: VehicleProfileInput): VehicleProfileResult => {
  const [hour, minute] = input.timeOfBirth.split(":").map(Number);
  const [year, month, day] = input.dateOfBirth.split("-").map(Number);
  resolveBirthInstant({ year, month, day, hour, minute }, input.place.timezone); // rejects impossible, future and non-existent local times
  const p = computePanchang({ localDate: input.dateOfBirth, time: { hour, minute }, place: input.place });
  return {
    birth: {
      dateOfBirth: input.dateOfBirth,
      timeOfBirth: input.timeOfBirth,
      place: input.placeLabel,
      timeZone: input.place.timezone,
      latitude: input.place.latitude,
      longitude: input.place.longitude,
    },
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
    method: p.convention.label,
  };
};
