import { beforeEach, describe, expect, it } from "vitest";
import { completeToday, loadDays, MILESTONES, nextMilestone, STREAK_STORAGE_KEY, summarize } from "./horoscopeStreak";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);
beforeEach(() => localStorage.clear());

describe("horoscope streak (browser-kept, same functions as Karma Sankhya)", () => {
  it("starts empty", () => {
    const s = summarize([], at(2026, 11, 12));
    expect([s.currentStreak, s.bestStreak, s.totalDays, s.completedToday]).toEqual([0, 0, 0, false]);
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toMatchObject({ isToday: true, completed: false });
  });

  it("first day starts a streak of 1; the next day makes 2; completing again the same day changes nothing", () => {
    let d = completeToday([], at(2026, 11, 12));
    expect(summarize(d, at(2026, 11, 12)).currentStreak).toBe(1);
    expect(completeToday(d, at(2026, 11, 12, 20))).toBe(d); // same list, nothing written again
    d = completeToday(d, at(2026, 11, 13));
    const s = summarize(d, at(2026, 11, 13));
    expect([s.currentStreak, s.bestStreak, s.totalDays, s.completedToday]).toEqual([2, 2, 2, true]);
  });

  it("a missed full day restarts the streak, but best and total are kept", () => {
    let d: string[] = [];
    for (const day of [1, 2, 3]) d = completeToday(d, at(2026, 11, day));
    d = completeToday(d, at(2026, 11, 6));
    const s = summarize(d, at(2026, 11, 6));
    expect([s.currentStreak, s.bestStreak, s.totalDays]).toEqual([1, 3, 4]);
  });

  it("a streak is still alive on the day after the last completion, and has lapsed two days later (best is kept)", () => {
    const d = completeToday(completeToday([], at(2026, 11, 1)), at(2026, 11, 2));
    expect(summarize(d, at(2026, 11, 3)).currentStreak).toBe(2);
    const lapsed = summarize(d, at(2026, 11, 4));
    expect([lapsed.currentStreak, lapsed.bestStreak, lapsed.totalDays]).toEqual([0, 2, 2]);
  });

  it("crosses month and year boundaries", () => {
    let d = completeToday([], at(2026, 12, 31));
    d = completeToday(d, at(2027, 1, 1));
    expect(summarize(d, at(2027, 1, 1)).currentStreak).toBe(2);
  });

  it("the week tracker marks completed days and today, and has no future days", () => {
    let d: string[] = [];
    for (const day of [8, 10, 12]) d = completeToday(d, at(2026, 11, day));
    const s = summarize(d, at(2026, 11, 12));
    expect(s.week.map((x) => x.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(s.week.filter((x) => x.completed).map((x) => x.date)).toEqual(["2026-11-08", "2026-11-10", "2026-11-12"]);
  });

  it("next milestone shows days only: progress and what is left", () => {
    expect(MILESTONES).toEqual([3, 7, 14, 30, 60, 100]);
    expect(nextMilestone(0)).toEqual({ days: 3, progress: 0, remaining: 3 });
    expect(nextMilestone(5)).toEqual({ days: 7, progress: 5, remaining: 2 });
    expect(nextMilestone(7)).toEqual({ days: 14, progress: 7, remaining: 7 });
    expect(nextMilestone(100)).toBeNull();
    expect(Object.keys(nextMilestone(5)!)).not.toContain("bonus");
  });

  it("is saved under an iv_ key (cleared on sign-out) and reloads; unreadable storage is treated as empty", () => {
    expect(STREAK_STORAGE_KEY.startsWith("iv_")).toBe(true);
    completeToday([], at(2026, 11, 12));
    expect(loadDays()).toEqual(["2026-11-12"]);
    localStorage.setItem(STREAK_STORAGE_KEY, "not json");
    expect(loadDays()).toEqual([]);
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(["2026-11-12", "2026-11-12", "bad", 5, "2026-11-11"]));
    expect(loadDays()).toEqual(["2026-11-11", "2026-11-12"]);
  });
});
