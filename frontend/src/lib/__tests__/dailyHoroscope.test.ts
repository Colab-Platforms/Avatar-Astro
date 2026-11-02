import { describe, it, expect } from "vitest";
import { formatDateLabel, todayKey, msUntilNextDay } from "@/lib/dailyHoroscope";

describe("daily horoscope date handling (Asia/Kolkata)", () => {
  it("formats the weekday and date the way the page shows them", () => {
    expect(formatDateLabel("2026-11-02")).toBe("Monday, 2 November 2026");
    expect(formatDateLabel("2026-12-31")).toBe("Thursday, 31 December 2026");
  });
  it("uses the Indian calendar day, not the browser's or UTC's", () => {
    // 20:00 UTC on 1 Nov is already 01:30 on 2 Nov in India
    expect(todayKey(new Date("2026-11-01T20:00:00Z"))).toBe("2026-11-02");
    // 18:00 UTC on 1 Nov is 23:30 on 1 Nov in India
    expect(todayKey(new Date("2026-11-01T18:00:00Z"))).toBe("2026-11-01");
  });
  it("rolls over at Indian midnight", () => {
    // 23:30 IST -> ~30 minutes (plus the 1s margin) until the new day
    expect(msUntilNextDay(new Date("2026-11-01T18:00:00Z"))).toBe(30 * 60_000 + 1000);
    const next = new Date(new Date("2026-11-01T18:00:00Z").getTime() + msUntilNextDay(new Date("2026-11-01T18:00:00Z")));
    expect(todayKey(next)).toBe("2026-11-02");
  });
});
