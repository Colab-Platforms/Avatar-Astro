import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runReference, endOfSegment, END_TOLERANCE_MIN } from "./panchang.reference.js";
import { REFERENCE_CASES } from "./panchang.reference.data.js";

const { ends, days } = runReference();

describe("independent reference: Drik Panchang (see panchang.reference.data.ts for source, date and location)", () => {
  test("the set covers several Indian cities, midnight crossings, Adhika months and Vikram Samvat transitions", () => {
    const cities = new Set(REFERENCE_CASES.map((c) => c.city));
    for (const c of ["New Delhi", "Mumbai", "Chennai", "Kolkata", "Bengaluru"]) assert.ok(cities.has(c), c);
    assert.ok(REFERENCE_CASES.some((c) => c.amanta.adhika), "an Adhika month");
    assert.ok(REFERENCE_CASES.filter((c) => c.amanta.adhika).length >= 2);
    assert.ok(REFERENCE_CASES.some((c) => c.vikramSamvat === 2082 && /Samvat/.test(c.covers)), "VS 2081 to 2082");
    assert.ok(REFERENCE_CASES.some((c) => /Sankranti/.test(c.covers)), "a Sankranti day");
    const afterMidnight = ends.filter((r) => r.refEnd.slice(0, 10) !== r.date).length;
    assert.ok(afterMidnight >= 10, `end times after midnight: ${afterMidnight}`);
    assert.ok(ends.length >= 80);
  });

  test(`every tithi, nakshatra, yoga and karana end time is within ${END_TOLERANCE_MIN} minutes, and the names agree`, () => {
    const bad = ends.filter((r) => !r.pass);
    assert.deepEqual(bad, []);
    assert.equal(new Set(ends.map((r) => r.element)).size, 4);
  });

  test("the differences are small and not erratic: all within 2 minutes", () => {
    for (const r of ends) assert.ok(Math.abs(r.diffMinutes) <= 2, `${r.caseId} ${r.element} ${r.diffMinutes}`);
  });

  test("Hindu month (Amanta and Purnimanta), Adhika flag, Paksha and sunrise/sunset match, except one documented Vikram Samvat convention difference", () => {
    const failed = days.flatMap((d) => d.checks.filter((c) => !c.pass).map((c) => ({ id: d.caseId, field: c.field, reference: c.reference, engine: c.engine })));
    assert.deepEqual(failed, [{ id: "mumbai-2026-03-19", field: "Vikram Samvat", reference: "2083", engine: "2082" }]);
  });

  test("the one difference is the sunrise convention: Pratipada starts 06:52, eight minutes after the 06:44 sunrise", () => {
    // Drik shows the new year for the day on which Chaitra Shukla Pratipada begins; this engine reckons the
    // Panchang at sunrise, when it is still Amavasya, and so reports the old year until the next sunrise.
    const c = REFERENCE_CASES.find((x) => x.id === "mumbai-2026-03-19")!;
    assert.equal(c.sunrise, "06:44");
    const pratipadaStart = ends.find((r) => r.caseId === c.id && r.refName === "Amavasya")!;
    assert.equal(pratipadaStart.refEnd.slice(11), "06:52");
  });

  test("the root finder behaves: the next segment end is after the starting instant and stable", () => {
    const t = new Date("2025-04-06T08:00:00Z");
    for (const e of ["tithi", "nakshatra", "yoga", "karana"] as const) {
      const end = endOfSegment(e, t);
      assert.ok(end.getTime() > t.getTime());
      assert.ok(end.getTime() - t.getTime() < 3 * 86_400_000);
    }
  });
});
