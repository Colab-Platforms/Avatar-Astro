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
}

export const ACTIONS: KarmaAction[] = [
  { id: "mantra", name: "Chant a mantra of your choice", pts: 8, type: "mantra" },
  { id: "meditation", name: "15 minutes of quiet meditation", pts: 5, type: "seva" },
  { id: "truth", name: "Speak only truth today (Satya)", pts: 6, type: "seva" },
  { id: "feed", name: "Feed a cow, dog, or someone in need", pts: 10, type: "charity" },
  { id: "fast", name: "Keep a simple fast or eat mindfully", pts: 12, type: "fast" },
  { id: "pooja", name: "Morning prayer / aarti", pts: 9, type: "pooja" },
  { id: "anger", name: "Stayed patient and did not lose temper", pts: 7, type: "seva" },
  { id: "charity", name: "Gave a donation or time in seva", pts: 11, type: "charity" },
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
