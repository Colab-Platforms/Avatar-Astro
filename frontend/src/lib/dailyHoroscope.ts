import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// Daily Sun-sign horoscope client. The server owns "today" (Asia/Kolkata) and stores one reading per sign per day,
// so this module never generates or caches reading text for longer than the calendar day it belongs to.

export const HOROSCOPE_TIMEZONE = "Asia/Kolkata";

export interface HoroscopeSections {
  overview: string; career: string; love: string; health: string; mood: string; opportunities: string; mindful: string; guidance: string;
  lucky?: { color?: string; number?: string };
}

export interface DailyHoroscope {
  sign: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  weekday: string;
  timezone: string;
  system: string;
  sections: HoroscopeSections;
  cached: boolean;
}

/** "unavailable": the provider could not supply today's reading. "failed": network or server problem. */
export class HoroscopeError extends Error {
  kind: "unavailable" | "failed";
  constructor(kind: "unavailable" | "failed", message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Today's calendar date (YYYY-MM-DD) in the horoscope timezone. */
export const todayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: HOROSCOPE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** "Monday, 2 November 2026" for a YYYY-MM-DD key (the key is already the right calendar day, so no zone shift is applied). */
export const formatDateLabel = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(d);
  return `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })} ${part({ year: "numeric" })}`;
};

/** Milliseconds until the next midnight in the horoscope timezone (+1s so the new date is surely in effect). */
export const msUntilNextDay = (now: Date = new Date()): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: HOROSCOPE_TIMEZONE, hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(now).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const elapsed = ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000;
  return 86_400_000 - elapsed + 1000;
};

export async function fetchDailyHoroscope(sign: string, signal?: AbortSignal): Promise<DailyHoroscope> {
  const token = useAuthStore.getState().accessToken; // signed-in readers get it saved to their library, as before
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/interpretation/horoscope/${encodeURIComponent(sign.toLowerCase())}`, {
      signal,
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new HoroscopeError("failed", "We couldn't reach the server. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (res.status === 503 || body?.code === "HOROSCOPE_UNAVAILABLE") {
    throw new HoroscopeError("unavailable", "Today's horoscope is not available right now.");
  }
  const d = body?.data;
  const s = d?.sections;
  const complete = s && ["overview", "career", "love", "health", "mood", "opportunities", "mindful", "guidance"].every((k) => typeof s[k] === "string" && s[k].trim());
  if (!res.ok || !body?.success || !complete || typeof d.date !== "string") {
    throw new HoroscopeError(res.ok ? "unavailable" : "failed", res.ok ? "Today's horoscope is not available right now." : "Something went wrong while loading the horoscope.");
  }
  return d as DailyHoroscope;
}
