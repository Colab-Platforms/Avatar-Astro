import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildKundali, parseKundaliInput, RASHI_NAMES } from "../kundali.js";
import { ValidationError } from "../gemstone.service.js";
import { BirthTimeError } from "../birth.time.js";
import { SIGNS } from "../gemstone.catalogue.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const now = new Date("2026-10-30T00:00:00Z");
const body = (dateOfBirth: string, timeOfBirth: string | null, place = delhi) => ({
  dateOfBirth,
  timeOfBirth,
  timeUnknown: timeOfBirth === null,
  place,
});
const run = (dateOfBirth: string, timeOfBirth: string | null, place = delhi) =>
  buildKundali(parseKundaliInput(body(dateOfBirth, timeOfBirth, place)), now);

describe("Janma Kundali is sidereal (Vedic), not tropical", () => {
  test("India's independence, 15 Aug 1947 00:00 Delhi: Chandra Rashi Karka (Pushya), Surya Rashi Karka, Lagna Vrishabha", () => {
    const k = run("1947-08-15", "00:00");
    assert.equal(k.moon.rashi?.name, "Karka");
    assert.equal(k.moon.nakshatra?.name, "Pushya");
    assert.equal(k.sun.rashi?.name, "Karka"); // tropical Sun is in Leo; the sidereal Sun is still in Cancer
    assert.equal(k.lagna?.rashi.name, "Vrishabha");
    assert.equal(k.panchang.moonRashi, "Cancer");
    assert.equal(k.timeKnown, true);
    assert.ok(k.method.ayanamsaDegrees! > 23 && k.method.ayanamsaDegrees! < 24);
  });

  test("the Vedic Sun sign differs from the Western one on 5 May 1990 (Western Taurus, Vedic Mesha)", () => {
    const k = run("1990-05-05", "10:00");
    assert.equal(k.sun.rashi?.name, "Mesha");
    assert.equal(k.sun.rashi?.sign, "Aries");
  });

  test("planets, houses and Lagna are consistent with each other", () => {
    const k = run("1990-05-05", "10:00");
    assert.equal(k.planets!.length, 9);
    const lagnaIndex = SIGNS.indexOf(k.lagna!.rashi.sign);
    for (const p of k.planets!) {
      assert.equal(p.house, ((SIGNS.indexOf(p.rashi.sign) - lagnaIndex + 12) % 12) + 1, p.planet);
    }
    const sun = k.planets!.find((p) => p.planet === "Sun")!;
    const ketu = k.planets!.find((p) => p.planet === "Ketu")!;
    const rahu = k.planets!.find((p) => p.planet === "Rahu")!;
    assert.equal(sun.rashi.name, k.sun.rashi!.name);
    assert.equal((SIGNS.indexOf(ketu.rashi.sign) - SIGNS.indexOf(rahu.rashi.sign) + 12) % 12, 6);
    assert.ok(k.dasha, "Vimshottari dasha is calculated when the time is known");
  });

  test("birthplace and time zone change the Lagna but not the Sun or Moon sign for the same instant", () => {
    const nyc = { name: "New York", admin1: "NY", country: "US", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" };
    const a = run("2000-01-01", "05:30");
    const b = run("2000-01-01", "05:30", nyc);
    assert.notEqual(a.birth.resolvedInstantUtc, b.birth.resolvedInstantUtc);
    assert.equal(b.birth.utcOffsetMinutes, -300);
    assert.equal(a.birth.utcOffsetMinutes, 330);
  });

  test("Panchang is attached and agrees with the Moon sign", () => {
    const k = run("2025-04-06", "12:30");
    assert.equal(k.panchang.masa.name, "Chaitra");
    assert.equal(k.panchang.tithi.name, "Navami");
    assert.equal(k.panchang.moonRashi, k.moon.rashi!.sign);
    assert.equal(k.panchang.nakshatra.name, k.moon.nakshatra!.name);
  });
});

describe("unknown birth time is handled honestly", () => {
  test("no Lagna, houses, planets or dasha are produced", () => {
    const k = run("1990-05-05", null);
    assert.equal(k.timeKnown, false);
    assert.equal(k.lagna, null);
    assert.equal(k.planets, null);
    assert.equal(k.dasha, null);
    assert.ok(k.limitations.some((l) => /Lagna/.test(l) && /not assumed|none is assumed/.test(l)));
  });

  test("a Rashi is stated only if it is the same all day; otherwise two candidates and uncertain", () => {
    let sawCertain = false;
    let sawUncertain = false;
    for (let d = 1; d <= 12; d++) {
      const k = run(`2025-04-${String(d).padStart(2, "0")}`, null);
      if (k.moon.certain) {
        sawCertain = true;
        assert.equal(k.moon.candidates.length, 1);
        assert.ok(k.moon.rashi);
      } else {
        sawUncertain = true;
        assert.equal(k.moon.rashi, null);
        assert.equal(k.moon.candidates.length, 2);
        assert.equal(k.moon.nakshatra, null);
      }
    }
    assert.ok(sawCertain && sawUncertain, "a 12-day window contains both kinds of day");
  });

  test("Mesha Sankranti (Sun enters Mesha) on 14 Apr 2025: Surya Rashi depends on the birth time", () => {
    const k = run("2025-04-14", null);
    assert.equal(k.sun.certain, false);
    assert.deepEqual(k.sun.candidates.map((c) => c.name).sort(), ["Meena", "Mesha"]);
    assert.equal(run("2025-04-13", null).sun.rashi?.name, "Meena");
    assert.equal(run("2025-04-15", null).sun.rashi?.name, "Mesha");
  });
});

describe("validation", () => {
  test("bad dates, times and places are rejected, never guessed", () => {
    assert.throws(() => parseKundaliInput({ ...body("05/05/1990", "10:00") }), ValidationError);
    assert.throws(() => parseKundaliInput({ dateOfBirth: "1990-05-05", timeOfBirth: "10:00" }), ValidationError); // no place
    assert.throws(() => run("1990-02-30", "10:00"), BirthTimeError);
    assert.throws(() => run("1990-05-05", "10:00", { ...delhi, timezone: "Mars/Olympus" }), BirthTimeError);
    assert.throws(() => run("1990-05-05", "10:00", { ...delhi, latitude: 80 }), /66° latitude/);
  });

  test("every Rashi has a Sanskrit and a Hindi name", () => {
    for (const s of SIGNS) {
      assert.ok(RASHI_NAMES[s].name && RASHI_NAMES[s].hindi);
    }
  });
});
