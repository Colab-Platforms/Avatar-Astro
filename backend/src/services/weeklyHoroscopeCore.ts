// Pure helpers for the weekly horoscope (no database, no network) so they can be tested on their own.
export const HOROSCOPE_SYSTEM = "western-tropical-sun-sign" as const;

export interface WeeklySections {
  overview: string; career: string; love: string; finance: string; health: string; family: string; advice: string;
  lucky?: { color?: string; number?: string };
}

export interface WeeklyHoroscope {
  sign: string;
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string;   // Sunday, YYYY-MM-DD
  timezone: string;
  system: typeof HOROSCOPE_SYSTEM;
  sections: WeeklySections;
  cached: boolean;
}

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday and Sunday (YYYY-MM-DD) of the week containing the given calendar date. Weeks run Monday to Sunday. */
export function weekRangeOf(dateKey: string): { start: string; end: string } {
  const ms = new Date(`${dateKey}T00:00:00Z`).getTime();
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const start = ms - sinceMonday * DAY;
  return { start: iso(start), end: iso(start + 6 * DAY) };
}

const MAX = 700;
const str = (v: unknown, max = MAX): string | undefined => (typeof v === "string" && v.trim() ? v.replace(/\u0000/g, "").trim().slice(0, max) : undefined);

/** Accepts only a complete reading; lucky details are kept only if the provider actually gave them. */
export function sanitizeWeekly(raw: any): WeeklySections | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {
    overview: str(raw.overview), career: str(raw.career), love: str(raw.love), finance: str(raw.finance),
    health: str(raw.health), family: str(raw.family), advice: str(raw.advice),
  };
  if (Object.values(out).some((v) => !v)) return null;
  const color = str(raw.lucky?.color, 30);
  const number = str(typeof raw.lucky?.number === "number" ? String(raw.lucky.number) : raw.lucky?.number, 12);
  return { ...(out as Omit<WeeklySections, "lucky">), ...(color || number ? { lucky: { ...(color ? { color } : {}), ...(number ? { number } : {}) } } : {}) };
}

