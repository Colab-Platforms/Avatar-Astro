// No database: week boundaries and reading validation for the weekly horoscope.
import test from "node:test";
import assert from "node:assert/strict";
import { weekRangeOf, sanitizeWeekly } from "../weeklyHoroscopeCore.js";

const full = { overview: "a", career: "b", love: "c", finance: "d", health: "e", family: "f", advice: "g" };

test("a Monday starts its own week and the week ends the following Sunday", () => {
  assert.deepEqual(weekRangeOf("2026-11-16"), { start: "2026-11-16", end: "2026-11-22" }); // Monday
});

test("a Sunday belongs to the week that began the previous Monday", () => {
  assert.deepEqual(weekRangeOf("2026-11-22"), { start: "2026-11-16", end: "2026-11-22" });
});

test("midweek dates map to the same week", () => {
  for (const d of ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]) {
    assert.deepEqual(weekRangeOf(d), { start: "2026-11-16", end: "2026-11-22" }, d);
  }
});

test("the next Monday starts a new week (week transition)", () => {
  assert.deepEqual(weekRangeOf("2026-11-23"), { start: "2026-11-23", end: "2026-11-29" });
});

test("weeks crossing a month and a year boundary are correct", () => {
  assert.deepEqual(weekRangeOf("2026-12-31"), { start: "2026-12-28", end: "2027-01-03" });
  assert.deepEqual(weekRangeOf("2026-03-01"), { start: "2026-02-23", end: "2026-03-01" });
});

test("a complete reading is accepted and lucky details are optional", () => {
  assert.deepEqual(sanitizeWeekly(full), full);
  assert.deepEqual(sanitizeWeekly({ ...full, lucky: { color: "Gold", number: 7 } })?.lucky, { color: "Gold", number: "7" });
});

test("an incomplete or malformed reading is rejected, never padded", () => {
  assert.equal(sanitizeWeekly({ ...full, finance: "" }), null);
  const { advice, ...missing } = full; void advice;
  assert.equal(sanitizeWeekly(missing), null);
  assert.equal(sanitizeWeekly(null), null);
  assert.equal(sanitizeWeekly("text"), null);
});

test("a daily-shaped reading is not accepted as a weekly one", () => {
  assert.equal(sanitizeWeekly({ overview: "a", career: "b", love: "c", health: "e", mood: "m", opportunities: "o", mindful: "x", guidance: "g" }), null);
});
