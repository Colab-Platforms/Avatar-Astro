/**
 * Karma Score: a simple, transparent, SYMBOLIC measure of how many of today's
 * mindful practices a person completed. It is not calculated from a birth
 * chart, transits or any astrological computation, and has no scientific or
 * predictive meaning.
 *
 *   score = round(points of completed practices / total points * 100)
 */
export interface KarmaAction {
  id: string;
  name: string;
  pts: number;
  type: "mantra" | "seva" | "charity" | "fast" | "pooja";
  /** Rough time the practice takes. Used only to suggest the easiest next step; it never changes the points. */
  minutes: number;
}

export const ACTIONS: KarmaAction[] = [
  { id: "mantra", name: "Chant a mantra of your choice", pts: 8, type: "mantra", minutes: 5 },
  { id: "meditation", name: "15 minutes of quiet meditation", pts: 5, type: "seva", minutes: 15 },
  { id: "truth", name: "Speak only truth today (Satya)", pts: 6, type: "seva", minutes: 0 },
  { id: "feed", name: "Feed a cow, dog, or someone in need", pts: 10, type: "charity", minutes: 15 },
  { id: "fast", name: "Keep a simple fast or eat mindfully", pts: 12, type: "fast", minutes: 0 },
  { id: "pooja", name: "Morning prayer / aarti", pts: 9, type: "pooja", minutes: 10 },
  { id: "anger", name: "Stayed patient and did not lose temper", pts: 7, type: "seva", minutes: 0 },
  { id: "charity", name: "Gave a donation or time in seva", pts: 11, type: "charity", minutes: 20 },
];

export const MAX_POINTS = ACTIONS.reduce((s, a) => s + a.pts, 0);

/** Points earned from a list of completed action ids (unknown ids and duplicates are ignored). */
export function pointsFor(done: string[]): number {
  return ACTIONS.filter((a) => new Set(done).has(a.id)).reduce((s, a) => s + a.pts, 0);
}

export function computeDailyScore(done: string[]): number {
  return Math.round((pointsFor(done) / MAX_POINTS) * 100);
}

/** Local calendar date as YYYY-MM-DD (toISOString would use UTC and roll the day over at 5:30am in India). */
export function localDateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function scoreMessage(score: number, completed: number): string {
  if (completed === 0) return "Nothing logged yet today. Tick the practices you have done to see your score.";
  if (score < 30) return "A gentle start. Even one small practice is worth keeping up.";
  if (score < 60) return "Steady effort today. Consistency matters more than any single day.";
  if (score < 85) return "A strong day of practice. Notice how it feels, and carry that into tomorrow.";
  return "A full day of mindful practice. Remember that the aim is steadiness, not a perfect score.";
}

export interface ScoreEntry {
  date: string;
  composite: number;
  behaviorPts?: number;
  actionsCompleted?: number;
}

/** Average of the saved scores from the last `days` calendar days including today, or null if none. */
export function recentAverage(history: ScoreEntry[], days = 7, today: Date = new Date()): number | null {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const from = localDateKey(cutoff);
  const recent = history.filter((e) => e.date >= from && typeof e.composite === "number");
  if (recent.length === 0) return null;
  return Math.round(recent.reduce((s, e) => s + e.composite, 0) / recent.length);
}

// ── Tiers, streaks and suggestions ───────────────────────────────────────────

/** The same thresholds scoreMessage uses, so the label, the message and the "next level" always agree. */
export const TIERS = [
  { min: 0, label: "Getting started" },
  { min: 30, label: "Steady" },
  { min: 60, label: "Strong" },
  { min: 85, label: "Full practice" },
] as const;

export function tierFor(score: number): { label: string; min: number; next: { label: string; min: number } | null } {
  let i = 0;
  TIERS.forEach((t, idx) => { if (score >= t.min) i = idx; });
  const next = TIERS[i + 1];
  return { label: TIERS[i].label, min: TIERS[i].min, next: next ? { label: next.label, min: next.min } : null };
}

export interface Suggestion {
  id: string;
  name: string;
  /** Points this practice adds today. */
  gain: number;
  /** The score today if only this practice were added. */
  scoreAfter: number;
  minutes: number;
  /** Why it was picked, in plain words. */
  reason: string;
}

/** Practices not yet ticked, best first: the most points for the least time. Pure arithmetic on the fixed table. */
export function suggestNext(done: string[], limit = 3): Suggestion[] {
  const have = new Set(done);
  const base = pointsFor(done);
  return ACTIONS.filter((a) => !have.has(a.id))
    // Practices that need no extra time (a fast, truthfulness, patience) count as 1 minute so they are not divided by zero.
    .map((a) => ({ a, value: a.pts / Math.max(a.minutes, 1) }))
    .sort((x, y) => y.value - x.value || y.a.pts - x.a.pts)
    .slice(0, limit)
    .map(({ a }) => ({
      id: a.id,
      name: a.name,
      gain: a.pts,
      scoreAfter: Math.round(((base + a.pts) / MAX_POINTS) * 100),
      minutes: a.minutes,
      reason: a.minutes === 0 ? "Needs no extra time, only attention through the day" : `Takes about ${a.minutes} minutes`,
    }));
}

/**
 * The fewest extra practices (biggest first) that lift today's score to the next level, or null when already
 * at the top. It gives the user a concrete target instead of a vague "do more".
 */
export function pathToNextLevel(done: string[]): { target: { label: string; min: number }; steps: Suggestion[]; scoreAfter: number } | null {
  const tier = tierFor(computeDailyScore(done));
  if (!tier.next) return null;
  const have = new Set(done);
  let pts = pointsFor(done);
  const steps: Suggestion[] = [];
  const pool = ACTIONS.filter((a) => !have.has(a.id)).sort((x, y) => y.pts - x.pts);
  for (const a of pool) {
    if (Math.round((pts / MAX_POINTS) * 100) >= tier.next.min) break;
    pts += a.pts;
    steps.push({ id: a.id, name: a.name, gain: a.pts, scoreAfter: Math.round((pts / MAX_POINTS) * 100), minutes: a.minutes, reason: "" });
  }
  const scoreAfter = Math.round((pts / MAX_POINTS) * 100);
  if (scoreAfter < tier.next.min) return null;
  return { target: tier.next, steps, scoreAfter };
}

const dayBefore = (key: string): string => {
  const [y, m, d] = key.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d - 1));
};

/**
 * Days in a row with at least one practice saved, counting back from today (or from yesterday when today
 * has not been saved yet, so a streak is not shown as broken before the day is over).
 */
export function currentStreak(history: ScoreEntry[], today: Date = new Date()): number {
  const days = new Set(history.filter((e) => e.composite > 0).map((e) => e.date));
  let key = localDateKey(today);
  if (!days.has(key)) key = dayBefore(key);
  let n = 0;
  while (days.has(key)) { n++; key = dayBefore(key); }
  return n;
}

/** Longest run of consecutive saved days with at least one practice. */
export function bestStreak(history: ScoreEntry[]): number {
  const days = [...new Set(history.filter((e) => e.composite > 0).map((e) => e.date))].sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) {
    run = prev && dayBefore(d) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** The last 7 calendar days, oldest first, with the saved score for each (null when that day was not saved). */
export function lastSevenDays(history: ScoreEntry[], today: Date = new Date()): { date: string; score: number | null; isToday: boolean }[] {
  const byDate = new Map(history.map((e) => [e.date, e.composite]));
  const out: { date: string; score: number | null; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    out.push({ date: key, score: byDate.get(key) ?? null, isToday: i === 0 });
  }
  return out;
}

/** How many of the last 7 days have a saved score above zero. */
export const practicedDaysThisWeek = (history: ScoreEntry[], today: Date = new Date()): number =>
  lastSevenDays(history, today).filter((d) => (d.score ?? 0) > 0).length;
