import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateRatna, parseInput, ValidationError } from "../gemstone.service.js";
import { buildWeightGuidance } from "../wearing.js";
import { getGemstone } from "../gemstone.catalogue.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const body = {
  fullName: "Asha Verma",
  gender: "Female",
  weightKg: 58.26,
  dateOfBirth: "2025-04-06",
  timeOfBirth: "12:30",
  timeUnknown: false,
  place: delhi,
};
const now = new Date("2026-10-30T00:00:00Z");

describe("personal details validation", () => {
  test("accepts a valid profile and rounds weight", () => {
    const i = parseInput(body);
    assert.equal(i.profile?.fullName, "Asha Verma");
    assert.equal(i.profile?.weightKg, 58.3);
    assert.equal(i.dateOfBirth, "2025-04-06");
  });
  test("requires full name and a gender option", () => {
    assert.throws(() => parseInput({ ...body, fullName: " " }), /full name/);
    assert.throws(() => parseInput({ ...body, fullName: "R2D2<script>" }), /letters/);
    assert.throws(() => parseInput({ ...body, gender: "x" }), /gender/);
    assert.ok(parseInput({ ...body, gender: "Prefer not to say" }));
    assert.ok(parseInput({ ...body, fullName: "रमा देवी" }));
  });
  test("weight is optional but range-checked", () => {
    assert.equal(parseInput({ ...body, weightKg: undefined }).profile?.weightKg, null);
    for (const w of [0, -5, 1, 301, "abc", NaN]) {
      assert.throws(() => parseInput({ ...body, weightKg: w }), ValidationError);
    }
  });
  test("a plain date of birth is required; no Panchang input is accepted or needed", () => {
    assert.throws(() => parseInput({ ...body, dateOfBirth: undefined }), /YYYY-MM-DD/);
    assert.throws(() => parseInput({ ...body, dateOfBirth: "06/04/2025" }), /YYYY-MM-DD/);
    assert.equal("panchang" in parseInput({ ...body, panchang: { month: 3 } }), false);
  });
});

describe("end to end: Panchang is calculated and reported", () => {
  test("calculates the Panchang, records the audit trail and echoes the profile", async () => {
    const r = await calculateRatna(parseInput(body), { now });
    assert.equal(r.status, "complete");
    assert.equal(r.birth.dateOfBirth, "2025-04-06");
    assert.equal(r.panchang.tithi.name, "Navami");
    assert.equal(r.panchang.vikramSamvat, 2082);
    assert.equal(r.panchang.masa.name, "Chaitra");
    assert.equal(r.panchang.paksha, "shukla");
    assert.equal(r.panchang.nakshatra.name, r.recommendation?.analysis.moon.nakshatra);
    assert.equal(r.panchang.moonRashi, r.recommendation?.analysis.moon.sign);
    assert.equal(r.panchang.uncertain, false);
    assert.equal(r.profile?.weightKg, 58.3);
    assert.equal(r.audit.localDate, "2025-04-06");
    assert.equal(r.audit.resolvedInstantUtc, "2025-04-06T07:00:00.000Z"); // 12:30 IST
    assert.equal(r.audit.utcOffsetMinutes, 330);
    assert.equal(r.audit.latitude, delhi.latitude);
    assert.ok(r.chart && r.recommendation);
  });
  test("unknown time: date-based, no chart, no instant, panchang still present", async () => {
    const r = await calculateRatna(parseInput({ ...body, timeOfBirth: null, timeUnknown: true }), { now });
    assert.equal(r.status, "date_based");
    assert.equal(r.chart, null);
    assert.equal(r.audit.resolvedInstantUtc, null);
    assert.equal(r.panchang.basis, "sunrise");
    assert.equal(r.panchang.uncertain, true);
    assert.ok(r.panchang.uncertainties.length > 0);
    assert.equal(r.panchang.masa.name, "Chaitra"); // still calculated, never invented
  });
  test("different birthplaces give different instants for the same Panchang input", async () => {
    const ny = { name: "New York", admin1: "NY", country: "US", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" };
    const a = await calculateRatna(parseInput({ ...body, timeOfBirth: "22:00", place: ny }), { now });
    assert.equal(a.audit.utcOffsetMinutes, -240);
    assert.equal(a.audit.resolvedInstantUtc, "2025-04-07T02:00:00.000Z");
    assert.equal(a.panchang.tithi.name, "Dashami"); // 22:00 EDT is already Dashami; Delhi noon was Navami
  });
});

describe("weight guidance", () => {
  test("labelled traditional, no health claim, absent without weight", async () => {
    const g = buildWeightGuidance(getGemstone("ruby")!, 60);
    assert.equal(g.rattiApprox, 6);
    assert.match(g.disclaimer, /not a scientific formula/);
    assert.doesNotMatch(g.text + g.disclaimer, /cure| heals? |guarantee/i);
    const r = await calculateRatna(parseInput({ ...body, weightKg: undefined }), { now });
    assert.equal(r.wearing?.weight, null);
    const r2 = await calculateRatna(parseInput(body), { now });
    assert.equal(r2.wearing?.weight?.weightKg, 58.3);
  });
  test("weight does not change the chosen Ratna", async () => {
    const a = await calculateRatna(parseInput({ ...body, weightKg: 45 }), { now });
    const b = await calculateRatna(parseInput({ ...body, weightKg: 110 }), { now });
    assert.equal(a.primary.stone.key, b.primary.stone.key);
  });
});
