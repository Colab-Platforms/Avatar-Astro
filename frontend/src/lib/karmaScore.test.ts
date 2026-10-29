import { describe, it, expect } from "vitest";
import { ACTIONS, MAX_POINTS, computeDailyScore, pointsFor, localDateKey, recentAverage, scoreMessage } from "./karmaScore";

describe("karma score (rule-based)", () => {
  it("is 0 with nothing done and 100 with everything done", () => {
    expect(computeDailyScore([])).toBe(0);
    expect(computeDailyScore(ACTIONS.map((a) => a.id))).toBe(100);
  });
  it("follows the documented formula", () => {
    expect(pointsFor(["mantra", "feed"])).toBe(18);
    expect(computeDailyScore(["mantra", "feed"])).toBe(Math.round((18 / MAX_POINTS) * 100));
  });
  it("ignores unknown ids and duplicates", () => {
    expect(computeDailyScore(["mantra", "mantra", "nope"])).toBe(computeDailyScore(["mantra"]));
  });
  it("uses the local calendar date", () => {
    expect(localDateKey(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
  it("averages only the last 7 days", () => {
    const today = new Date(2026, 9, 29);
    const h = [
      { date: "2026-10-29", composite: 80 },
      { date: "2026-10-25", composite: 40 },
      { date: "2026-10-01", composite: 0 },
    ];
    expect(recentAverage(h, 7, today)).toBe(60);
    expect(recentAverage([], 7, today)).toBeNull();
  });
  it("gives no praise when nothing is logged", () => {
    expect(scoreMessage(0, 0)).toMatch(/Nothing logged/);
  });
});
