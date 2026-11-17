import { describe, expect, it } from "vitest";
import { MAX_RANGE_DAYS, rangeFromParams, resolveRange, validateCustomRange } from "./dateRange";
import { bucketLabel, fmtPercent, fmtRupees } from "./format";

const NOW = new Date("2026-11-16T09:30:00.000Z");

describe("resolveRange", () => {
  it("Today is the current UTC day only", () => {
    expect(resolveRange("today", {}, NOW)).toMatchObject({ from: "2026-11-16", to: "2026-11-16", days: 1, label: "Today" });
  });
  it("Last 7 / 30 / 90 days end today and include today", () => {
    expect(resolveRange("7d", {}, NOW)).toMatchObject({ from: "2026-11-10", to: "2026-11-16", days: 7 });
    expect(resolveRange("30d", {}, NOW)).toMatchObject({ from: "2026-10-18", to: "2026-11-16", days: 30 });
    expect(resolveRange("90d", {}, NOW)).toMatchObject({ from: "2026-08-19", to: "2026-11-16", days: 90 });
  });
  it("uses the UTC date, not the local one, near midnight", () => {
    expect(resolveRange("today", {}, new Date("2026-11-16T23:59:59.000Z")).to).toBe("2026-11-16");
    expect(resolveRange("today", {}, new Date("2026-11-17T00:00:00.000Z")).to).toBe("2026-11-17");
  });
  it("accepts a valid custom range", () => {
    expect(resolveRange("custom", { from: "2026-11-01", to: "2026-11-05" }, NOW)).toMatchObject({ preset: "custom", from: "2026-11-01", to: "2026-11-05", days: 5, label: "2026-11-01 to 2026-11-05" });
    expect(resolveRange("custom", { from: "2026-11-05", to: "2026-11-05" }, NOW).days).toBe(1);
  });
  it("falls back to the last 30 days, with the reason, when a custom range is unusable", () => {
    const r = resolveRange("custom", { from: "2026-11-09", to: "2026-11-01" }, NOW);
    expect(r).toMatchObject({ preset: "30d", to: "2026-11-16" });
    expect(r.error).toMatch(/not be after/);
  });
});

describe("validateCustomRange", () => {
  it("rejects missing, reversed, future, impossible and over-long ranges", () => {
    expect(validateCustomRange("", "", NOW)).toMatch(/both/);
    expect(validateCustomRange("2026-11-10", "2026-11-01", NOW)).toMatch(/not be after/);
    expect(validateCustomRange("2026-11-10", "2026-11-17", NOW)).toMatch(/future/);
    expect(validateCustomRange("2026-02-30", "2026-03-02", NOW)).toMatch(/both/);
    expect(validateCustomRange("2025-01-01", "2026-11-16", NOW)).toMatch(String(MAX_RANGE_DAYS));
  });
  it("accepts exactly the longest allowed range", () => {
    expect(validateCustomRange("2025-11-16", "2026-11-16", NOW)).toBeNull(); // 366 days, counting both ends
    expect(validateCustomRange("2025-11-15", "2026-11-16", NOW)).toMatch(String(MAX_RANGE_DAYS)); // 367
  });
});

describe("rangeFromParams", () => {
  it("defaults to the last 30 days", () => {
    expect(rangeFromParams(new URLSearchParams(""), NOW)).toMatchObject({ preset: "30d", days: 30 });
  });
  it("reads a preset or a custom range from the address bar and ignores junk", () => {
    expect(rangeFromParams(new URLSearchParams("range=7d"), NOW).days).toBe(7);
    expect(rangeFromParams(new URLSearchParams("range=custom&from=2026-11-01&to=2026-11-03"), NOW)).toMatchObject({ preset: "custom", days: 3 });
    expect(rangeFromParams(new URLSearchParams("range=bogus"), NOW).preset).toBe("30d");
    expect(rangeFromParams(new URLSearchParams("range=custom&from=nope&to=2026-11-03"), NOW).error).toBeTruthy();
  });
});

describe("formatters", () => {
  it("shows whole paise as rupees with Indian grouping and no invented rounding", () => {
    expect(fmtRupees(0)).toBe("₹0");
    expect(fmtRupees(4900)).toBe("₹49");
    expect(fmtRupees(123456)).toBe("₹1,234.56");
    expect(fmtRupees(12345600)).toBe("₹1,23,456");
  });
  it("shows a dash instead of dividing by zero", () => {
    expect(fmtPercent(0, 0)).toBe("—");
    expect(fmtPercent(1, 4)).toBe("25.0%");
    expect(fmtPercent(1, 400)).toBe("0.25%");
  });
  it("labels hourly and daily buckets", () => {
    expect(bucketLabel("2026-11-16T14", "hour")).toBe("14:00");
    expect(bucketLabel("2026-11-06", "day")).toBe("6 Nov");
  });
});
