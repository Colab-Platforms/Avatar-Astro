import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePanchang } from "../panchang.js";
import { buildVehicleProfile, parseVehicleProfileInput } from "../vehicleNumber.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const nyc = { name: "New York", admin1: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" };
const body = (over: Record<string, unknown> = {}) => ({ dateOfBirth: "1990-07-14", timeOfBirth: "06:45", place: delhi, ...over });

describe("Lucky Vehicle Number: birth profile uses the one shared Panchang engine", () => {
  test("Nakshatra, pada, Rashi, tithi, paksha, month and weekday equal computePanchang for the same moment", () => {
    const r = buildVehicleProfile(parseVehicleProfileInput(body()));
    const p = computePanchang({ localDate: "1990-07-14", time: { hour: 6, minute: 45 }, place: delhi });
    assert.deepEqual(r.panchang.nakshatra, p.nakshatra);
    assert.equal(r.panchang.moonRashi, p.moonRashi);
    assert.equal(r.panchang.tithi.name, p.tithi.name);
    assert.equal(r.panchang.paksha, p.paksha);
    assert.equal(r.panchang.masa.name, p.masa.name);
    assert.equal(r.panchang.vara.name, p.vara.name);
    assert.match(r.method, /Lahiri/);
  });

  test("the birthplace's time zone is applied: the same wall-clock time in two places is two different moments", () => {
    const a = buildVehicleProfile(parseVehicleProfileInput(body()));
    const b = buildVehicleProfile(parseVehicleProfileInput(body({ place: nyc })));
    assert.equal(a.birth.timeZone, "Asia/Kolkata");
    assert.equal(b.birth.timeZone, "America/New_York");
    const pn = computePanchang({ localDate: "1990-07-14", time: { hour: 6, minute: 45 }, place: nyc });
    assert.deepEqual(b.panchang.nakshatra, pn.nakshatra);
    // 9.5 hours apart on the clock is far more than the Moon needs to change pada (about 6 hours), so they must differ.
    assert.notDeepEqual(a.panchang.nakshatra, b.panchang.nakshatra);
  });
});

describe("validation: nothing is assumed", () => {
  test("requires a date, an exact time and a selected birthplace", () => {
    assert.throws(() => parseVehicleProfileInput(body({ dateOfBirth: "" })), /date of birth/);
    assert.throws(() => parseVehicleProfileInput(body({ timeOfBirth: "" })), /exact time/);
    assert.throws(() => parseVehicleProfileInput(body({ timeOfBirth: "7:5" })), /exact time/);
    assert.throws(() => parseVehicleProfileInput(body({ place: undefined })), /birthplace/);
    assert.throws(() => parseVehicleProfileInput(body({ place: { ...delhi, timezone: "Nowhere/Land" } })), /birthplace/);
    assert.throws(() => parseVehicleProfileInput(body({ place: { ...delhi, longitude: 400 } })), /birthplace/);
  });
  test("rejects a future, impossible or non-existent date", () => {
    assert.throws(() => buildVehicleProfile(parseVehicleProfileInput(body({ dateOfBirth: "2999-01-01" }))), /year|future/i);
    assert.throws(() => buildVehicleProfile(parseVehicleProfileInput(body({ dateOfBirth: "1990-02-30" }))), /does not exist|Invalid/i);
  });
});
