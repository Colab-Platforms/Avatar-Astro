import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  LocationProviderError,
  clearLocationCache,
  searchLocations,
  toPlaceResult,
  type HttpGet,
} from "../locations.js";
import { calculateRatna, parseLegacyInput } from "../gemstone.service.js";

const vasai = {
  id: 1253372, name: "Vasai", latitude: 19.36071, longitude: 72.79558,
  timezone: "Asia/Kolkata", country: "India", admin1: "Maharashtra", admin2: "Palghar",
};
const vasaiGujarat = { ...vasai, id: 6417917, admin1: "Gujarat", latitude: 22.43, longitude: 69.93 };
const mumbai = { id: 1275339, name: "Mumbai", latitude: 19.07283, longitude: 72.88261, timezone: "Asia/Kolkata", country: "India", admin1: "Maharashtra" };

const ok = (results?: unknown[]): HttpGet => async () => ({ status: 200, data: results === undefined ? {} : { results } });
const status = (s: number): HttpGet => async () => ({ status: s, data: { reason: "x" } });
const dev = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

const kindOf = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return e instanceof LocationProviderError ? e.kind : "other"; }
  return "none";
};

beforeEach(() => clearLocationCache());

describe("location search", () => {
  test("Vasai returns distinguishable suggestions with region and country", async () => {
    const r = await searchLocations("Vasai", { get: ok([vasai, vasaiGujarat]), env: dev });
    assert.deepEqual(r.map((p) => p.label), ["Vasai, Maharashtra, India", "Vasai, Gujarat, India"]);
    assert.equal(r[0].timezone, "Asia/Kolkata");
    assert.equal(r[0].latitude, 19.36071);
  });

  test("Mumbai", async () => {
    const r = await searchLocations("Mumbai", { get: ok([mumbai]), env: dev });
    assert.equal(r[0].label, "Mumbai, Maharashtra, India");
  });

  test("no matches (provider omits results) is an empty list, not an error", async () => {
    assert.deepEqual(await searchLocations("Zzzzqq", { get: ok(undefined), env: dev }), []);
    assert.deepEqual(await searchLocations("Zzzzqq2", { get: ok([]), env: dev }), []);
  });

  test("queries under two characters never call the provider", async () => {
    let calls = 0;
    const get: HttpGet = async () => { calls++; return { status: 200, data: {} }; };
    assert.deepEqual(await searchLocations("V", { get, env: dev }), []);
    assert.equal(calls, 0);
  });

  test("distinct failure kinds", async () => {
    assert.equal(await kindOf(searchLocations("a1", { get: status(429), env: dev })), "rate_limited");
    assert.equal(await kindOf(searchLocations("a2", { get: status(401), env: dev })), "auth");
    assert.equal(await kindOf(searchLocations("a3", { get: status(403), env: dev })), "auth");
    assert.equal(await kindOf(searchLocations("a4", { get: status(500), env: dev })), "http");
    const timeout: HttpGet = async () => { throw Object.assign(new Error("t"), { code: "ECONNABORTED" }); };
    assert.equal(await kindOf(searchLocations("a5", { get: timeout, env: dev })), "timeout");
    const dns: HttpGet = async () => { throw Object.assign(new Error("d"), { code: "ENOTFOUND" }); };
    assert.equal(await kindOf(searchLocations("a6", { get: dns, env: dev })), "network");
  });

  test("malformed provider responses", async () => {
    const bad = (data: unknown): HttpGet => async () => ({ status: 200, data });
    assert.equal(await kindOf(searchLocations("b1", { get: bad("<html>"), env: dev })), "bad_format");
    assert.equal(await kindOf(searchLocations("b2", { get: bad({ results: "x" }), env: dev })), "bad_format");
    assert.equal(await kindOf(searchLocations("b3", { get: ok([{ name: "NoCoords" }]), env: dev })), "bad_format");
    // one bad entry among good ones is dropped, not fatal
    const r = await searchLocations("b4", { get: ok([{ name: "X" }, vasai]), env: dev });
    assert.equal(r.length, 1);
  });

  test("production refuses the unlicensed free API unless configured", async () => {
    let calls = 0;
    const get: HttpGet = async () => { calls++; return { status: 200, data: { results: [vasai] } }; };
    const prod = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    assert.equal(await kindOf(searchLocations("Vasai", { get, env: prod })), "not_configured");
    assert.equal(calls, 0);
    assert.equal((await searchLocations("Vasai", { get, env: { ...prod, GEOCODER_ALLOW_FREE: "true" } })).length, 1);
  });

  test("a configured key uses the commercial endpoint and stays out of errors", async () => {
    let seen = "";
    const get: HttpGet = async (url, params) => { seen = `${url}|${params.apikey}`; return { status: 401, data: {} }; };
    const env = { NODE_ENV: "production", OPEN_METEO_API_KEY: "SECRET123" } as NodeJS.ProcessEnv;
    try { await searchLocations("Vasai", { get, env }); assert.fail("should throw"); }
    catch (e: any) {
      assert.equal(e.kind, "auth");
      assert.ok(!String(e.message).includes("SECRET123"));
    }
    assert.match(seen, /^https:\/\/customer-geocoding-api\.open-meteo\.com/);
  });

  test("results are cached", async () => {
    let calls = 0;
    const get: HttpGet = async () => { calls++; return { status: 200, data: { results: [vasai] } }; };
    await searchLocations("Vasai", { get, env: dev });
    await searchLocations("vasai ", { get, env: dev });
    assert.equal(calls, 1);
  });
});

describe("selected location reaches the calculation intact", () => {
  test("rejects unselected / invalid location objects", () => {
    const base = { dateOfBirth: "1990-05-05", timeOfBirth: "10:30", timeUnknown: false };
    assert.throws(() => parseLegacyInput({ ...base, place: { name: "Vasai" } }), /select your birthplace/);
    assert.equal(toPlaceResult({ name: "Vasai", latitude: 999, longitude: 1, timezone: "Asia/Kolkata" }), null);
    assert.equal(toPlaceResult({ name: "Vasai", latitude: 1, longitude: 1, timezone: "Bad/Zone" }), null);
  });

  test("Vasai coordinates and timezone drive the chart", async () => {
    const place = toPlaceResult(vasai)!;
    const r = await calculateRatna(parseLegacyInput({
      dateOfBirth: "1990-05-05", timeOfBirth: "10:30", timeUnknown: false,
      place: { name: place.name, admin1: place.admin1, country: place.country, latitude: place.latitude, longitude: place.longitude, timezone: place.timezone },
    }));
    assert.equal(r.status, "complete");
    assert.equal(r.birth.place, "Vasai, Maharashtra, India");
    assert.equal(r.birth.timeZone, "Asia/Kolkata");
    assert.equal(r.birth.utcOffsetMinutes, 330);
    assert.ok(r.recommendation);
  });
});

describe("duplicate place names", () => {
  test("identical labels gain the district; unique ones stay short", async () => {
    clearLocationCache();
    const a = { ...vasai, id: 1, admin2: "Palghar" };
    const b = { ...vasai, id: 2, admin2: "Thane" };
    const c = { ...vasaiGujarat, id: 3, admin2: "Jamnagar" };
    const r = await searchLocations("Vasai", { get: ok([a, b, c]), env: dev });
    assert.deepEqual(r.map((p) => p.label), [
      "Vasai, Palghar, Maharashtra, India",
      "Vasai, Thane, Maharashtra, India",
      "Vasai, Gujarat, India",
    ]);
    assert.ok(!("district" in r[0]));
  });
});
