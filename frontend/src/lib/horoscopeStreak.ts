import { bestStreak, currentStreak, lastSevenDays, localDateKey, type ScoreEntry } from "./karmaScore";

/**
 * Daily Horoscope streak, kept in this browser exactly the way Karma Sankhya keeps its streak: a list of local calendar dates,
 * with the same current/best/week functions from karmaScore. There is no server, account storage or points behind it.
 * The key starts with "iv_" so signing out clears it with the other personal browser data.
 */
export const STREAK_STORAGE_KEY = "iv_horoscope_streak_v1";
export const MILESTONES = [3, 7, 14, 30, 60, 100] as const;

const isKey = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Completed dates, oldest first, without duplicates. Anything unreadable is treated as an empty history. */
export function loadDays(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? [...new Set(raw.filter(isKey))].sort() : [];
  } catch { return []; }
}

function saveDays(days: string[]): void {
  try { localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(days)); } catch { /* storage unavailable: the streak still shows for this visit */ }
}

/** Adds today's local date once. Completing again the same day changes nothing. Returns the new list. */
export function completeToday(days: string[], today: Date = new Date()): string[] {
  const key = localDateKey(today);
  if (days.includes(key)) return days;
  const next = [...days, key].sort();
  saveDays(next);
  return next;
}

const asHistory = (days: string[]): ScoreEntry[] => days.map((date) => ({ date, composite: 100 }));

export function nextMilestone(streak: number): { days: number; progress: number; remaining: number } | null {
  const m = MILESTONES.find((d) => d > streak);
  return m ? { days: m, progress: streak, remaining: m - streak } : null;
}

export interface StreakSummary {
  completedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  week: { date: string; completed: boolean; isToday: boolean }[];
  nextMilestone: ReturnType<typeof nextMilestone>;
}

/** Everything the panel shows, calculated from the saved dates. A streak is still alive until the end of the next day, as in Karma. */
export function summarize(days: string[], today: Date = new Date()): StreakSummary {
  const history = asHistory(days);
  const current = currentStreak(history, today);
  return {
    completedToday: days.includes(localDateKey(today)),
    currentStreak: current,
    bestStreak: bestStreak(history),
    totalDays: new Set(days).size,
    week: lastSevenDays(history, today).map((d) => ({ date: d.date, completed: (d.score ?? 0) > 0, isToday: d.isToday })),
    nextMilestone: nextMilestone(current),
  };
}
