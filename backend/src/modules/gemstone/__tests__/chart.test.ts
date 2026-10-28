import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeBirthChart,
  computePlanets,
  lahiriAyanamsa,
  wholeSignHouse,
} from "../chart.engine.js";
import { resolveBirthInstant, BirthTimeError } from "../birth.time.js";
import { stableSignsForDate } from "../limited.chart.js";

describe("ayanamsa and planets (independent known values)", () => {
  test("Lahiri ayanamsa at J2000 is 23°51'11\"", () => {
    const a = lahiriAyanamsa(new Date("2000-01-01T12:00:00Z"));
    assert.ok(Math.abs(a - 23.853) < 0.002, String(a));
  });

  test("Lahiri ayanamsa for 2024 is about 24°11'", () => {
    const a = lahiriAyanamsa(new Date("2024-01-01T00:00:00Z"));
    assert.ok(Math.abs(a - 24.18) < 0.03, String(a));
  });

  test("Mesha Sankranti 2024 (Sun enters sidereal Aries ~15:33 UTC, 13 Apr)", () => {
    const before = computePlanets(new Date("2024-04-13T12:00:00Z")).Sun;
    const after = computePlanets(new Date("2024-04-14T00:00:00Z")).Sun;
    assert.equal(before.sign, "Pisces");
    assert.equal(after.sign, "Aries");
    const at = computePlanets(new Date("2024-04-13T15:33:00Z")).Sun.longitude;
    const dist = Math.min(at, 360 - at);
    assert.ok(dist < 0.35, `Sun at Sankranti: ${at}`); // ayanamsa-variant tolerance
  });

  test("1 Jan 2000 06:30 UTC regression values", () => {
    const p = computePlanets(new Date("2000-01-01T06:30:00Z"));
    assert.equal(p.Sun.sign, "Sagittarius");
    assert.ok(Math.abs(p.Sun.degreeInSign - 16.3) < 0.15);
    assert.equal(p.Moon.sign, "Libra");
    assert.equal(p.Rahu.sign, "Cancer");
    assert.equal(p.Ketu.sign, "Capricorn");
    assert.ok(Math.abs(p.Rahu.longitude - ((p.Ketu.longitude + 180) % 360)) < 1e-9);
  });
});

describe("known chart: India, 15 Aug 1947 00:00 IST, New Delhi", () => {
  const inst = resolveBirthInstant(
    { year: 1947, month: 8, day: 15, hour: 0, minute: 0 },
    "Asia/Kolkata",
  );
  const chart = computeBirthChart(inst.utc, 28.6139, 77.209);

  test("time zone is IST (+5:30)", () => {
    assert.equal(inst.offsetMinutes, 330);
    assert.equal(inst.utc.toISOString(), "1947-08-14T18:30:00.000Z");
  });

  test("Lagna is Taurus, Moon and Sun in Cancer (widely published chart)", () => {
    assert.equal(chart.ascendant.sign, "Taurus");
    assert.equal(chart.planets.Moon.sign, "Cancer");
    assert.equal(chart.planets.Sun.sign, "Cancer");
  });
});

describe("Ascendant behaviour", () => {
  const base = new Date("2000-01-01T06:30:00Z");
  test("Ascendant advances roughly 1° per 4 minutes of time", () => {
    const a = computeBirthChart(base, 28.6139, 77.209).ascendant.longitude;
    const b = computeBirthChart(new Date(base.getTime() + 60 * 60000), 28.6139, 77.209).ascendant.longitude;
    const delta = (b - a + 360) % 360;
    assert.ok(delta > 10 && delta < 40, `delta ${delta}`);
  });

  test("a full sidereal day returns to the same Ascendant", () => {
    const a = computeBirthChart(base, 19.076, 72.8777).ascendant.longitude;
    const b = computeBirthChart(new Date(base.getTime() + 86164.0905 * 1000), 19.076, 72.8777).ascendant.longitude;
    const diff = Math.abs(((a - b + 540) % 360) - 180);
    assert.ok(diff < 0.1, `diff ${diff}`);
  });

  test("rejects invalid or polar coordinates", () => {
    assert.throws(() => computeBirthChart(base, 95, 10), /Invalid geographic/);
    assert.throws(() => computeBirthChart(base, 10, 200), /Invalid geographic/);
    assert.throws(() => computeBirthChart(base, NaN, 10), /Invalid geographic/);
    assert.throws(() => computeBirthChart(base, 70, 20), /66°/);
  });

  test("whole-sign houses", () => {
    assert.equal(wholeSignHouse(0, 0), 1);
    assert.equal(wholeSignHouse(10, 1), 4);
    assert.equal(wholeSignHouse(11, 10), 12);
  });
});

describe("birth time to UTC", () => {
  test("historical offset: UK British Standard Time (+1 all year) in 1970", () => {
    const r = resolveBirthInstant({ year: 1970, month: 1, day: 15, hour: 12, minute: 0 }, "Europe/London");
    assert.equal(r.offsetMinutes, 60);
  });

  test("DST gap is rejected (New York 2024-03-10 02:30)", () => {
    assert.throws(
      () => resolveBirthInstant({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 }, "America/New_York"),
      BirthTimeError,
    );
  });

  test("DST overlap is flagged and resolves to the earlier instant", () => {
    const r = resolveBirthInstant({ year: 2024, month: 11, day: 3, hour: 1, minute: 30 }, "America/New_York");
    assert.equal(r.ambiguous, true);
    assert.equal(r.utc.toISOString(), "2024-11-03T05:30:00.000Z");
  });

  test("ordinary DST time", () => {
    const r = resolveBirthInstant({ year: 2024, month: 7, day: 1, hour: 12, minute: 0 }, "America/New_York");
    assert.equal(r.offsetMinutes, -240);
    assert.equal(r.ambiguous, false);
  });

  test("invalid inputs", () => {
    const ok = { year: 1990, month: 5, day: 5, hour: 5, minute: 5 };
    assert.throws(() => resolveBirthInstant({ ...ok, month: 2, day: 30 }, "Asia/Kolkata"), /does not exist/);
    assert.throws(() => resolveBirthInstant({ ...ok, hour: 24 }, "Asia/Kolkata"), /Invalid/);
    assert.throws(() => resolveBirthInstant({ ...ok, minute: 60 }, "Asia/Kolkata"), /Invalid/);
    assert.throws(() => resolveBirthInstant({ ...ok, year: 2999 }, "Asia/Kolkata"), /between 1800/);
    assert.throws(() => resolveBirthInstant(ok, "Not/AZone"), /time zone/);
  });
});

describe("unknown birth time", () => {
  test("only returns signs stable across the whole local day", () => {
    // 2 Jan 2000 (IST): the Moon crosses Libra -> Scorpio during this local day.
    const stable = stableSignsForDate({ year: 2000, month: 1, day: 2 }, "Asia/Kolkata");
    const planets = stable.map((s) => s.planet);
    assert.ok(planets.includes("Sun"));
    assert.ok(planets.includes("Saturn"));
    assert.ok(!planets.includes("Moon"));
    const sun = stable.find((s) => s.planet === "Sun");
    assert.equal(sun?.sign, "Sagittarius");
    // 1 Jan 2000: the Moon stays in Libra all day, so it is reported.
    const jan1 = stableSignsForDate({ year: 2000, month: 1, day: 1 }, "Asia/Kolkata");
    assert.equal(jan1.find((s) => s.planet === "Moon")?.sign, "Libra");
  });
});
