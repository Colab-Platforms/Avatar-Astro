/**
 * Sunrise and sunset for a local calendar date at a place, from the one shared engine (gemstone/date.based.ts and panchang.ts).
 * Memoised, because Muhurat search, the day timeline and the festival rules all need the same values for the same dates.
 */
import { sunriseOnLocalDate } from "../gemstone/date.based.js";
import { sunsetOnLocalDate } from "../gemstone/panchang.js";

export interface SunPlace { latitude: number; longitude: number; timezone: string }
export interface SunTimes { rise: Date; set: Date }

const cache = new Map<string, SunTimes | null>();

export const parseYmd = (s: string) => { const [year, month, day] = s.split("-").map(Number); return { year, month, day }; };
const pad = (n: number) => String(n).padStart(2, "0");
export const addDays = (s: string, n: number): string => {
  const { year, month, day } = parseYmd(s);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Local sunrise and sunset on `date` at the place, or null where the Sun does not rise or set (polar latitudes). */
export const sunTimes = (place: SunPlace, date: string): SunTimes | null => {
  const key = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)},${place.timezone},${date}`;
  if (cache.has(key)) return cache.get(key)!;
  const ymd = parseYmd(date);
  const rise = sunriseOnLocalDate(ymd, place.latitude, place.longitude, place.timezone, true);
  const set = sunsetOnLocalDate(ymd, place.latitude, place.longitude, place.timezone, true);
  const v = rise && set && set > rise ? { rise, set } : null;
  if (cache.size > 4000) cache.clear();
  cache.set(key, v);
  return v;
};
