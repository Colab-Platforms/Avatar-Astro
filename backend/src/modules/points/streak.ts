import { REWARD_TIME_ZONE, type MilestoneTable } from "@/config/rewards.js";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: REWARD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** The Asia/Kolkata calendar date of an instant, as YYYY-MM-DD. Never uses the server's own timezone or UTC. */
export const kolkataDate = (now: Date = new Date()): string => fmt.format(now);

/** A YYYY-MM-DD key as a Date at 00:00 UTC, the form a Postgres DATE column is read and written in. */
export const dateKeyToDate = (key: string): Date => new Date(`${key}T00:00:00.000Z`);
export const dateToKey = (d: Date): string => d.toISOString().slice(0, 10);

const DAY = 86_400_000;
/** Whole calendar days from `a` to `b` (positive when b is later). */
export const dayDiff = (a: string, b: string): number => Math.round((dateKeyToDate(b).getTime() - dateKeyToDate(a).getTime()) / DAY);
export const addDays = (key: string, n: number): string => dateToKey(new Date(dateKeyToDate(key).getTime() + n * DAY));

export interface StreakState { currentStreak: number; bestStreak: number; totalDays: number; lastDate: string | null }
export const EMPTY_STREAK: StreakState = { currentStreak: 0, bestStreak: 0, totalDays: 0, lastDate: null };

/**
 * The streak after completing `today`. First day starts at 1; the next calendar day adds 1; a gap of a full day or more
 * restarts at 1; the same day changes nothing. Best and total never go down.
 */
export function advanceStreak(prev: StreakState, today: string): StreakState {
  if (prev.lastDate === today) return prev;
  // A date earlier than the last completion can only come from a stale or out-of-order request: never move the streak backwards.
  if (prev.lastDate !== null && dayDiff(prev.lastDate, today) < 0) return prev;
  const consecutive = prev.lastDate !== null && dayDiff(prev.lastDate, today) === 1;
  const current = consecutive ? prev.currentStreak + 1 : 1;
  return { currentStreak: current, bestStreak: Math.max(prev.bestStreak, current), totalDays: prev.totalDays + 1, lastDate: today };
}

/** The streak as it stands on `today` for display: a streak whose last day is before yesterday has already lapsed. */
export const liveStreak = (s: StreakState, today: string): number =>
  s.lastDate && (s.lastDate === today || dayDiff(s.lastDate, today) === 1) ? s.currentStreak : 0;

/** The milestone reached exactly by this streak length, if any. */
export const milestoneAt = (table: MilestoneTable, streak: number) => table.find((m) => m.days === streak) ?? null;

/** The next milestone above the streak, or null once all are done. */
export const nextMilestone = (table: MilestoneTable, streak: number) => table.find((m) => m.days > streak) ?? null;

/** Current and best streak from a set of distinct completed dates (used for Karma, whose days come from the ledger). */
export function streaksFromDates(dates: Iterable<string>, today: string): { current: number; best: number; total: number; lastDate: string | null } {
  const days = [...new Set(dates)].sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) { run = prev && dayDiff(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  const last = days.length ? days[days.length - 1] : null;
  // `run` is the length of the final run, i.e. the streak ending on the last completed day.
  const current = last && (last === today || dayDiff(last, today) === 1) ? run : 0;
  return { current, best, total: days.length, lastDate: last };
}
