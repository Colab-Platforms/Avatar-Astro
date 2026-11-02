import { computePanchang, type PanchangDetails } from "./panchang.js";

/**
 * Today's Hindu calendar (Panchang) for the Know Your Karma guide.
 *
 * Every value comes from `computePanchang`, which calculates it from the real Sun and Moon positions
 * (astronomy-engine, Lahiri sidereal, Amanta months). Nothing is looked up from a model and nothing is
 * guessed. This file only picks the moment ("now" in the place's time zone), checks the result, and
 * returns the fields the guide needs. A field that cannot be fixed is left out, never filled in.
 *
 * Festivals and observances are NOT provided: this project has no festival calculator, so they are
 * reported as unavailable instead of being invented.
 */

/** Reference place used when the caller does not give one. It is named in the response so it is never hidden. */
export const DEFAULT_PLACE = {
  label: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
} as const;

export interface TodayPanchang {
  date: string;
  place: string;
  timezone: string;
  /** The moment the Panchang was reckoned for, in the place's local time. */
  reckonedAtLocal: string;
  convention: string;
  vara: string;
  paksha: "Shukla" | "Krishna";
  masa: string;
  tithi: { name: string; numberInPaksha: number; endsAtLocal: string };
  nakshatra: { name: string; pada: number };
  yoga: string;
  karana: string;
  sunrise: string | null;
  sunset: string | null;
  /** Festivals are not calculated by this service. */
  festivals: null;
  notes: string[];
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Local calendar date and clock time in an IANA time zone. */
export function localParts(now: Date, timeZone: string): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), minute: Number(get("minute")) };
}

/** Reject anything that is not internally consistent, so a broken calculation is never shown as fact. */
export function validatePanchang(p: PanchangDetails): string | null {
  if (!nonEmpty(p.tithi?.name) || !(p.tithi.number >= 1 && p.tithi.number <= 30)) return "tithi missing or out of range";
  if (p.paksha !== "shukla" && p.paksha !== "krishna") return "paksha missing";
  // Tithis 1-15 belong to the bright half, 16-30 to the dark half.
  if ((p.tithi.number <= 15) !== (p.paksha === "shukla")) return "tithi and paksha disagree";
  if (p.tithi.numberInPaksha !== ((p.tithi.number - 1) % 15) + 1) return "tithi number inconsistent";
  if (!nonEmpty(p.nakshatra?.name) || !(p.nakshatra.pada >= 1 && p.nakshatra.pada <= 4)) return "nakshatra missing or out of range";
  if (!nonEmpty(p.vara?.name)) return "vara missing";
  return null;
}

export function buildTodayPanchang(now: Date = new Date(), place: { label: string; latitude: number; longitude: number; timezone: string } = DEFAULT_PLACE): TodayPanchang {
  const local = localParts(now, place.timezone);
  const p = computePanchang({
    localDate: local.date,
    time: { hour: local.hour, minute: local.minute },
    place: { latitude: place.latitude, longitude: place.longitude, timezone: place.timezone },
  });
  const problem = validatePanchang(p);
  if (problem) throw new Error(`Panchang failed validation: ${problem}`);
  return {
    date: local.date,
    place: place.label,
    timezone: place.timezone,
    reckonedAtLocal: p.tithi.startLocal ? `${local.date} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}` : local.date,
    convention: p.convention.label,
    vara: p.vara.name,
    paksha: p.paksha === "shukla" ? "Shukla" : "Krishna",
    masa: p.masa.name,
    tithi: { name: p.tithi.name, numberInPaksha: p.tithi.numberInPaksha, endsAtLocal: p.tithi.endLocal },
    nakshatra: { name: p.nakshatra.name, pada: p.nakshatra.pada },
    yoga: nonEmpty(p.yoga) ? p.yoga : "",
    karana: nonEmpty(p.karana) ? p.karana : "",
    sunrise: p.sunrise,
    sunset: p.sunset,
    festivals: null,
    notes: [
      "Festivals and observances are not calculated here, so none are shown.",
      ...(p.uncertain ? p.uncertainties : []),
    ],
  };
}
