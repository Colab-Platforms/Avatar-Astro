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

import { bestStreak, currentStreak, lastSevenDays, pathToNextLevel, practicedDaysThisWeek, suggestNext, tierFor } from "./karmaScore";

describe("levels, suggestions and streaks", () => {
  it("levels match the thresholds the message uses", () => {
    expect(tierFor(0).label).toBe("Getting started");
    expect(tierFor(29).label).toBe("Getting started");
    expect(tierFor(30).label).toBe("Steady");
    expect(tierFor(60).label).toBe("Strong");
    expect(tierFor(85)).toMatchObject({ label: "Full practice", next: null });
    expect(tierFor(45).next).toEqual({ label: "Strong", min: 60 });
  });

  it("suggests only practices that are not done, best value for time first, with the real resulting score", () => {
    const s = suggestNext(["mantra"], 3);
    expect(s.map((x) => x.id)).not.toContain("mantra");
    expect(s).toHaveLength(3);
    for (const x of s) {
      const a = ACTIONS.find((y) => y.id === x.id)!;
      expect(x.gain).toBe(a.pts);
      expect(x.scoreAfter).toBe(computeDailyScore(["mantra", x.id]));
    }
    expect(suggestNext(ACTIONS.map((a) => a.id))).toEqual([]);
  });

  it("the path to the next level really reaches it, using the fewest big practices", () => {
    const p = pathToNextLevel([])!;
    expect(p.target).toEqual({ label: "Steady", min: 30 });
    expect(computeDailyScore(p.steps.map((s) => s.id))).toBe(p.scoreAfter);
    expect(p.scoreAfter).toBeGreaterThanOrEqual(30);
    // one step fewer would not have been enough
    expect(computeDailyScore(p.steps.slice(0, -1).map((s) => s.id))).toBeLessThan(30);
    expect(pathToNextLevel(ACTIONS.map((a) => a.id))).toBeNull();
  });

  it("counts a streak of consecutive saved days, not breaking it before today is saved", () => {
    const today = new Date(2026, 10, 2);
    const h = [{ date: "2026-11-01", composite: 40 }, { date: "2026-10-31", composite: 20 }, { date: "2026-10-30", composite: 10 }, { date: "2026-10-27", composite: 70 }];
    expect(currentStreak(h, today)).toBe(3); // today unsaved: counted from yesterday
    expect(currentStreak([{ date: "2026-11-02", composite: 50 }, ...h], today)).toBe(4);
    expect(currentStreak([{ date: "2026-10-20", composite: 50 }], today)).toBe(0);
    expect(bestStreak(h)).toBe(3);
  });

  it("a saved day with score 0 does not count as practice", () => {
    const today = new Date(2026, 10, 2);
    expect(currentStreak([{ date: "2026-11-02", composite: 0 }], today)).toBe(0);
    expect(practicedDaysThisWeek([{ date: "2026-11-02", composite: 0 }, { date: "2026-11-01", composite: 30 }], today)).toBe(1);
  });

  it("lists the last seven days, oldest first, with null for unsaved days", () => {
    const w = lastSevenDays([{ date: "2026-11-01", composite: 40 }], new Date(2026, 10, 2));
    expect(w).toHaveLength(7);
    expect(w[0].date).toBe("2026-10-27");
    expect(w[6]).toMatchObject({ date: "2026-11-02", isToday: true, score: null });
    expect(w[5].score).toBe(40);
  });
});
