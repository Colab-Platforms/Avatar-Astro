/**
 * Baby Name Jyotish, Muhurat Finder and the shared Panchang engine must agree for the same date, time and place.
 * There is one engine (gemstone/panchang.ts); these tests make sure neither feature drifts from it, and that the local-date and
 * sunrise boundary is handled the same way everywhere.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePanchang, limbsAt, tithiName } from "../../gemstone/panchang.js";
import { buildBabyName, parseBabyNameInput } from "../../gemstone/babyName.js";
import { searchMuhurat, type MuhuratPlace } from "../search.js";

const MUMBAI: MuhuratPlace = { name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.0728, longitude: 72.8825, timezone: "Asia/Kolkata" };
const DELHI: MuhuratPlace = { name: "New Delhi", admin1: null, country: "India", latitude: 28.6356, longitude: 77.2244, timezone: "Asia/Kolkata" };

const baby = (dateOfBirth: string, timeOfBirth: string, p: MuhuratPlace) =>
  buildBabyName(parseBabyNameInput({ dateOfBirth, timeOfBirth, place: { name: p.name, admin1: p.admin1, country: p.country, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone } }));
const IST = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);

describe("Baby Name Jyotish agrees with the shared Panchang engine", () => {
  const CASES: [string, string, MuhuratPlace][] = [
    ["2024-03-10", "10:30", MUMBAI], ["2023-11-14", "23:45", DELHI], ["2025-01-05", "02:10", MUMBAI], ["2022-08-19", "06:15", DELHI], ["2020-12-31", "23:59", MUMBAI],
  ];
  for (const [date, time, place] of CASES) {
    it(`${date} ${time} ${place.name}: tithi, paksha, nakshatra and pada match the engine at that instant`, () => {
      const r = baby(date, time, place);
      const l = limbsAt(IST(date, time));
      assert.equal(r.panchang.nakshatra.name, l.nakshatra.name);
      assert.equal(r.panchang.nakshatra.pada, l.nakshatra.pada);
      assert.equal(r.panchang.moonRashi, l.moonSign);
      assert.equal(r.panchang.paksha, l.paksha);
      assert.equal(r.panchang.tithi.name, tithiName(l.paksha, ((l.tithiNumber - 1) % 15) + 1).name);
    });
  }
});

describe("the Vedic weekday changes at local sunrise, in Baby Name and in Muhurat alike", () => {
  it("a birth before sunrise belongs to the previous weekday; after sunrise, to the civil weekday", () => {
    // 5 Jan 2025 was a Sunday. Sunrise in Mumbai that day is about 07:10.
    assert.equal(baby("2025-01-05", "02:10", MUMBAI).panchang.vara.name, "Saturday");
    assert.equal(baby("2025-01-05", "09:00", MUMBAI).panchang.vara.name, "Sunday");
  });
  it("Muhurat windows lie after sunrise, so their weekday is the civil weekday and equals the engine's Vara at the window start", () => {
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28" });
    let checked = 0;
    for (const d of r.days) for (const w of d.windows) {
      const p = computePanchang({ localDate: w.date, time: { hour: Number(w.startLocal.slice(0, 2)), minute: Number(w.startLocal.slice(3)) }, place: MUMBAI, allowFuture: true });
      assert.equal(p.vara.name, w.weekday, `${w.date} ${w.startLocal}`);
      checked++;
    }
    assert.ok(checked > 10);
  });
});

describe("Muhurat Finder's Panchang values equal the engine's for the same instant and place", () => {
  for (const place of [MUMBAI, DELHI]) {
    it(`${place.name}: every window's tithi, paksha, nakshatra, pada, yoga and karana equal computePanchang at its start`, () => {
      const r = searchMuhurat({ event: "griha-pravesh", place, startDate: "2026-12-01", endDate: "2027-03-31" });
      let checked = 0;
      for (const d of r.days) for (const w of d.windows) {
        const p = computePanchang({ localDate: w.date, time: { hour: Number(w.startLocal.slice(0, 2)), minute: Number(w.startLocal.slice(3)) }, place, allowFuture: true });
        assert.equal(w.panchang.tithi, p.tithi.name, w.date);
        assert.equal(w.panchang.paksha.toLowerCase(), p.paksha, w.date);
        assert.equal(w.panchang.nakshatra, p.nakshatra.name, w.date);
        assert.equal(w.panchang.pada, p.nakshatra.pada, w.date);
        assert.equal(w.panchang.yoga, p.yoga, w.date);
        assert.equal(w.panchang.karana, p.karana, w.date);
        checked++;
      }
      assert.ok(checked > 5);
    });
  }
  it("sunrise and sunset in Muhurat Finder equal the Panchang engine's for that date and place", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-18", endDate: "2026-12-20" });
    for (const d of r.days) {
      const p = computePanchang({ localDate: d.date, time: null, place: MUMBAI, allowFuture: true });
      assert.equal(d.sunrise, p.sunrise, d.date);
      assert.equal(d.sunset, p.sunset, d.date);
    }
  });
});

describe("one place, two features, no contradiction", () => {
  it("a baby born at the start of a Muhurat window's calendar date and time shares its Nakshatra and Tithi (same engine, same instant)", () => {
    // Use a PAST day so Baby Name accepts it: search a past range directly through the engine-level function.
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2024-03-01", endDate: "2024-05-31" });
    const w = r.days.flatMap((d) => d.windows)[0];
    assert.ok(w, "expected at least one window in a three-month span");
    const b = baby(w.date, w.startLocal, MUMBAI);
    assert.equal(b.panchang.nakshatra.name, w.panchang.nakshatra);
    assert.equal(b.panchang.nakshatra.pada, w.panchang.pada);
    assert.equal(b.panchang.tithi.name, w.panchang.tithi);
    assert.equal(b.panchang.paksha === "shukla" ? "Shukla" : "Krishna", w.panchang.paksha);
    assert.equal(b.panchang.vara.name, w.weekday);
  });
});
