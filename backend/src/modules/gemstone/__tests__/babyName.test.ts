import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePanchang } from "../panchang.js";
import { buildBabyName, parseBabyNameInput } from "../babyName.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const body = (over: Record<string, unknown> = {}) => ({ dateOfBirth: "2024-03-10", timeOfBirth: "09:30", place: delhi, ...over });
const padaAt = (date: string, h: number, m: number) => {
  const p = computePanchang({ localDate: date, time: { hour: h, minute: m }, place: delhi });
  return `${p.nakshatra.name}/${p.nakshatra.pada}`;
};

describe("Baby Name Jyotish: uses the one shared Panchang engine", () => {
  test("Nakshatra, pada, Rashi, tithi, masa and vara equal computePanchang for the same moment", () => {
    const r = buildBabyName(parseBabyNameInput(body()));
    const p = computePanchang({ localDate: "2024-03-10", time: { hour: 9, minute: 30 }, place: delhi });
    assert.deepEqual(r.panchang.nakshatra, p.nakshatra);
    assert.equal(r.panchang.moonRashi, p.moonRashi);
    assert.equal(r.panchang.tithi.name, p.tithi.name);
    assert.equal(r.panchang.paksha, p.paksha);
    assert.equal(r.panchang.masa.name, p.masa.name);
    assert.equal(r.panchang.vara.name, p.vara.name);
    assert.match(r.method, /Lahiri/);
    assert.equal(r.birth.timeZone, "Asia/Kolkata");
  });

  test("a different birth time or place can give a different Nakshatra pada", () => {
    const seen = new Set<string>();
    for (const h of [0, 4, 8, 12, 16, 20]) seen.add(buildBabyName(parseBabyNameInput(body({ timeOfBirth: `${String(h).padStart(2, "0")}:00` }))).panchang.nakshatra.pada + "");
    assert.ok(seen.size >= 2, "pada should change across a day");
  });
});

describe("pada boundary detection", () => {
  test("flags a birth time on a pada boundary and not one far from it", () => {
    // Find a real boundary on this date by scanning minute by minute.
    let boundary: { h: number; m: number } | null = null;
    let calm: { h: number; m: number } | null = null;
    let prev = padaAt("2024-03-10", 0, 0);
    const changes: number[] = [];
    for (let t = 1; t < 24 * 60; t += 1) {
      const cur = padaAt("2024-03-10", Math.floor(t / 60), t % 60);
      if (cur !== prev) { changes.push(t); if (!boundary) boundary = { h: Math.floor(t / 60), m: t % 60 }; }
      prev = cur;
    }
    assert.ok(boundary, "expected the Moon to cross a pada boundary during the day");
    const r = buildBabyName(parseBabyNameInput(body({ timeOfBirth: `${String(boundary!.h).padStart(2, "0")}:${String(boundary!.m).padStart(2, "0")}` })));
    assert.equal(r.nearPadaBoundary, true);
    assert.ok(r.window.padas.length >= 2);
    // Midpoint between the first two changes (or from the day's start) is far from any boundary.
    const mid = changes.length >= 2 ? Math.floor((changes[0] + changes[1]) / 2) : Math.floor(changes[0] / 2);
    const far = changes.every((c) => Math.abs(c - mid) > 30);
    if (far) {
      calm = { h: Math.floor(mid / 60), m: mid % 60 };
      const q = buildBabyName(parseBabyNameInput(body({ timeOfBirth: `${String(calm.h).padStart(2, "0")}:${String(calm.m).padStart(2, "0")}` })));
      assert.equal(q.nearPadaBoundary, false);
      assert.equal(q.window.padas.length, 1);
    }
  });

  test("an approximate birth time checks a wider window", () => {
    const exact = buildBabyName(parseBabyNameInput(body()));
    const loose = buildBabyName(parseBabyNameInput(body({ timeApproximate: true })));
    assert.equal(exact.window.minutesEitherSide, 10);
    assert.equal(loose.window.minutesEitherSide, 60);
    assert.equal(loose.timeApproximate, true);
    assert.ok(loose.window.padas.length >= exact.window.padas.length);
  });
});

describe("validation", () => {
  test("requires a date, an exact time and a selected birthplace; assumes nothing", () => {
    assert.throws(() => parseBabyNameInput(body({ dateOfBirth: "" })), /date of birth/);
    assert.throws(() => parseBabyNameInput(body({ timeOfBirth: "" })), /exact time/);
    assert.throws(() => parseBabyNameInput(body({ timeOfBirth: "25:00" })), /exact time/);
    assert.throws(() => parseBabyNameInput(body({ place: undefined })), /birthplace/);
    assert.throws(() => parseBabyNameInput(body({ place: { ...delhi, timezone: "Not/AZone" } })), /birthplace/);
    assert.throws(() => parseBabyNameInput(body({ place: { ...delhi, latitude: 123 } })), /birthplace/);
  });
  test("rejects a future or impossible date", () => {
    assert.throws(() => buildBabyName(parseBabyNameInput(body({ dateOfBirth: "2999-01-01" }))), /year|future/i);
    assert.throws(() => buildBabyName(parseBabyNameInput(body({ dateOfBirth: "2024-02-31" }))), /does not exist|Invalid/i);
  });
});
