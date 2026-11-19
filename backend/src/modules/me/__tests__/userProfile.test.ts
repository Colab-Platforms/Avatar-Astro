// No database: pure validation + mapping rules for the central profile.
import test from "node:test";
import assert from "node:assert/strict";
import { toCentralProfile, validateBirthProfileUpdate, type CentralProfileRow } from "../userProfile.js";

const today = new Date("2026-11-20T10:00:00.000Z");
const place = { name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };
const ok = (body: unknown) => { const r = validateBirthProfileUpdate(body, today); assert.ok(r.ok, JSON.stringify(r)); return r.ok ? r : (undefined as never); };
const bad = (body: unknown) => { const r = validateBirthProfileUpdate(body, today); assert.equal(r.ok, false); return r.ok ? {} : r.errors; };

test("accepts a full, valid birth profile and stores the date as UTC midnight", () => {
  const r = ok({ dateOfBirth: "1990-05-17", birthTime: "06:45", birthPlace: place, preferredLanguage: "hi" });
  assert.equal(r.data.dateOfBirth?.toISOString(), "1990-05-17T00:00:00.000Z");
  assert.equal(r.data.birthTime, "06:45");
  assert.equal(r.data.birthTimeUnknown, false);
  assert.equal(r.data.birthLatitude, 18.5204);
  assert.equal(r.data.birthTimezone, "Asia/Kolkata");
  assert.equal(r.data.preferredLanguage, "hi");
});

test("only the fields that were sent are written (a partial update leaves the rest alone)", () => {
  const r = ok({ birthTime: "23:59" });
  assert.deepEqual(Object.keys(r.data).sort(), ["birthTime", "birthTimeUnknown"]);
});

test("rejects invalid, impossible, future and pre-1900 dates", () => {
  for (const d of ["17-05-1990", "1990-13-01", "1990-02-30", "2026-11-21", "1899-12-31", "abc", 19900517]) assert.ok(bad({ dateOfBirth: d }).dateOfBirth, String(d));
  assert.equal(validateBirthProfileUpdate({ dateOfBirth: "2026-11-20" }, today).ok, true);
});

test("rejects bad times and accepts the 24-hour edges", () => {
  for (const t of ["24:00", "6:45", "06:60", "6.45", "noon"]) assert.ok(bad({ birthTime: t }).birthTime, t);
  for (const t of ["00:00", "23:59"]) ok({ birthTime: t });
});

test("time unknown always clears the stored time, and a given time clears 'unknown'", () => {
  const u = ok({ birthTimeUnknown: true, birthTime: "10:10" });
  assert.equal(u.data.birthTime, null);
  assert.equal(u.data.birthTimeUnknown, true);
  assert.equal(ok({ birthTime: "10:10" }).data.birthTimeUnknown, false);
});

test("a partial birthplace is rejected, never half-saved", () => {
  assert.ok(bad({ birthPlace: { name: "Pune" } }).birthPlace);
  assert.ok(bad({ birthPlace: { ...place, timezone: "" } }).birthPlace);
  assert.ok(bad({ birthPlace: { ...place, latitude: "18.5" } }).birthPlace);
  assert.ok(bad({ birthPlace: "Pune" }).birthPlace);
});

test("rejects out-of-range coordinates and unknown time zones", () => {
  assert.ok(bad({ birthPlace: { ...place, latitude: 91 } }).birthPlace);
  assert.ok(bad({ birthPlace: { ...place, longitude: -181 } }).birthPlace);
  assert.ok(bad({ birthPlace: { ...place, timezone: "Mars/Olympus" } }).birthPlace);
});

test("null clears optional values", () => {
  const r = ok({ dateOfBirth: null, birthTime: null, birthPlace: null, preferredLanguage: null });
  assert.equal(r.data.dateOfBirth, null);
  assert.equal(r.data.birthPlaceName, null);
  assert.equal(r.data.birthLatitude, null);
  assert.equal(r.data.preferredLanguage, null);
});

test("preferred language must be a supported locale", () => {
  assert.ok(bad({ preferredLanguage: "xx" }).preferredLanguage);
  ok({ preferredLanguage: "ta" });
});

test("an empty or non-object body is rejected", () => {
  assert.ok(bad({})._);
  assert.ok(bad(null)._);
  assert.ok(bad("x")._);
});

test("control characters are stripped from place names; unknown keys are ignored (no mass assignment)", () => {
  const r = ok({ birthPlace: { ...place, name: "Pu\u0000ne\n" }, isActive: false, email: "x@y.z", password: "p" });
  assert.equal(r.data.birthPlaceName, "Pune");
  assert.deepEqual(Object.keys(r.data).sort(), ["birthLatitude", "birthLongitude", "birthPlaceCountry", "birthPlaceName", "birthPlaceRegion", "birthTimezone"]);
});

const row = (o: Partial<CentralProfileRow> = {}): CentralProfileRow => ({
  id: "u1", firstName: "Asha", lastName: "Rao", email: "asha@example.test", phoneNo: null, gender: "Female",
  dateOfBirth: new Date("1990-05-17T00:00:00.000Z"), birthTime: "06:45", birthTimeUnknown: false,
  birthPlaceName: "Pune", birthPlaceRegion: "Maharashtra", birthPlaceCountry: "India", birthLatitude: 18.5204, birthLongitude: 73.8567, birthTimezone: "Asia/Kolkata",
  preferredLanguage: "en", birthDetailsUpdatedAt: new Date("2026-11-01T00:00:00.000Z"), ...o,
});

test("maps a stored row to the profile the client sees", () => {
  const p = toCentralProfile(row());
  assert.equal(p.fullName, "Asha Rao");
  assert.equal(p.dateOfBirth, "1990-05-17");
  assert.equal(p.birthPlace?.timezone, "Asia/Kolkata");
});

test("a place with any missing part is reported as no birthplace (nothing is assumed)", () => {
  assert.equal(toCentralProfile(row({ birthLatitude: null })).birthPlace, null);
  assert.equal(toCentralProfile(row({ birthTimezone: null })).birthPlace, null);
  const empty = toCentralProfile(row({ dateOfBirth: null, birthTime: null, birthPlaceName: null, birthLatitude: null, birthLongitude: null, birthTimezone: null, firstName: null, lastName: null }));
  assert.equal(empty.dateOfBirth, null);
  assert.equal(empty.fullName, "");
});
