// The horoscope week: Monday to Sunday in Asia/Kolkata, the same "today" the server uses for the daily horoscope.
// Keep this in step with weekRangeOf in backend/src/services/weeklyHoroscopeCore.ts.
const TZ = "Asia/Kolkata";
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Today's calendar date (YYYY-MM-DD) in the horoscope timezone. */
export const todayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** Monday and Sunday (YYYY-MM-DD) of the week containing a calendar date. */
export function weekRangeOf(dateKey: string): { start: string; end: string } {
  const ms = new Date(`${dateKey}T00:00:00Z`).getTime();
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  const start = ms - sinceMonday * DAY;
  return { start: iso(start), end: iso(start + 6 * DAY) };
}

export const currentWeek = (now: Date = new Date()) => weekRangeOf(todayKey(now));

/** "16 Nov – 22 Nov 2026" in the reader's language (dates only; no time zone shifts). */
export function formatWeekRange(start: string, end: string, locale?: string): string {
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...o }).format(new Date(`${d}T00:00:00Z`));
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${fmt(start, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
}
