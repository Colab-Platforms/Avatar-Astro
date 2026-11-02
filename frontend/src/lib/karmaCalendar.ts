import { API_BASE_URL } from "@/lib/api";
import { authedFetch } from "@/lib/authedFetch";

/**
 * Today's Hindu calendar for Know Your Karma. The values are CALCULATED on the server from the real Sun and
 * Moon positions (the same engine as the Kundali). This file only fetches them, checks their shape and lists
 * the ones that are present. Nothing is guessed, and a missing value is simply left out.
 */
export interface TodayCalendar {
  date: string;
  place: string;
  timezone: string;
  reckonedAtLocal: string;
  vara: string;
  paksha: "Shukla" | "Krishna";
  masa: string;
  tithi: { name: string; numberInPaksha: number; endsAtLocal: string };
  nakshatra: { name: string; pada: number };
  yoga: string;
  karana: string;
  sunrise: string | null;
  sunset: string | null;
  festivals: null;
  notes: string[];
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Accept the server reply only when the fields the guide relies on are really there. */
export function parseCalendar(raw: unknown): TodayCalendar | null {
  const p = raw as Partial<TodayCalendar> | null;
  if (!p || typeof p !== "object") return null;
  if (!nonEmpty(p.date) || !nonEmpty(p.vara) || (p.paksha !== "Shukla" && p.paksha !== "Krishna")) return null;
  if (!nonEmpty(p.tithi?.name) || !(Number(p.tithi?.numberInPaksha) >= 1 && Number(p.tithi?.numberInPaksha) <= 15)) return null;
  if (!nonEmpty(p.nakshatra?.name)) return null;
  return p as TodayCalendar;
}

export async function fetchTodayCalendar(): Promise<TodayCalendar | null> {
  const res = await authedFetch(`${API_BASE_URL}/inner-voice/panchang`);
  if (!res.ok) return null;
  return parseCalendar(await res.json().catch(() => null));
}

/** The facts to show, as label/value pairs. A value that is not there is not listed. */
export function calendarFacts(c: TodayCalendar): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [
    { label: "Tithi", value: c.tithi.name },
    { label: "Paksha", value: c.paksha },
    { label: "Nakshatra", value: c.nakshatra.name },
    { label: "Day", value: c.vara },
  ];
  if (nonEmpty(c.masa)) facts.push({ label: "Month", value: c.masa });
  if (nonEmpty(c.yoga)) facts.push({ label: "Yoga", value: c.yoga });
  if (nonEmpty(c.karana)) facts.push({ label: "Karana", value: c.karana });
  return facts;
}

const TITHIS = ["Pratipada", "Dwitiya", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

/**
 * True when a model reply names a tithi or nakshatra that is not today's verified one. Used to refuse such a
 * reply: the model must not state calendar facts of its own.
 */
export function namesOtherCalendarFacts(text: string, c: TodayCalendar | null): boolean {
  const t = text.toLowerCase();
  const own = c ? [c.tithi.name.toLowerCase(), c.nakshatra.name.toLowerCase()] : [];
  return [...TITHIS, ...NAKSHATRAS].some((n) => {
    const k = n.toLowerCase();
    return new RegExp(`\\b${k}\\b`).test(t) && !own.some((o) => o === k || o.startsWith(k) || k.startsWith(o));
  });
}
