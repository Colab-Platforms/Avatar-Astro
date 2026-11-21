import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildHouseInfo, type HouseInfo, type HousePlacement } from "../houses.js";
import { buildKundali, parseKundaliInput } from "../kundali.js";
import { aspectedBy } from "../analysis.js";
import { computeBirthChart } from "../chart.engine.js";
import { resolveBirthInstant } from "../birth.time.js";
import { PLANETS, SIGNS, SIGN_LORD, type Planet } from "../gemstone.catalogue.js";

// Sign indexes: Aries 0 … Pisces 11.
const at = (planet: Planet, signIndex: number): HousePlacement => ({ planet, signIndex });
const sorted = (xs: readonly string[]) => [...xs].sort();

describe("house mapping, lords and aspects on a chart worked out by hand", () => {
  // Lagna Taurus: house 1 Taurus, 2 Gemini, 3 Cancer, 4 Leo, 5 Virgo, 6 Libra, 7 Scorpio, 8 Sagittarius, 9 Capricorn, 10 Aquarius, 11 Pisces, 12 Aries.
  // Sun, Mercury, Ketu in 1; Moon in 3; Jupiter in 6; Rahu in 7; Mars in 9; Saturn in 10; Venus in 12.
  const houses = buildHouseInfo(1, [
    at("Sun", 1), at("Moon", 3), at("Mars", 9), at("Mercury", 1), at("Jupiter", 6), at("Venus", 0), at("Saturn", 10), at("Rahu", 7), at("Ketu", 1),
  ]);
  const h = (n: number) => houses[n - 1];

  test("twelve houses numbered 1-12 with signs running on from the Lagna sign", () => {
    assert.deepEqual(houses.map((x) => x.house), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.deepEqual(houses.map((x) => x.sign), ["Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries"]);
  });

  test("occupants are exactly the planets standing in that house", () => {
    assert.deepEqual(sorted(h(1).planets), ["Ketu", "Mercury", "Sun"]);
    assert.deepEqual(h(3).planets, ["Moon"]);
    assert.deepEqual(h(7).planets, ["Rahu"]);
    assert.deepEqual(h(2).planets, []);
    assert.equal(houses.flatMap((x) => x.planets).length, 9); // every planet appears once
  });

  test("the lord is the sign's ruler and its placement is where that planet really stands", () => {
    assert.equal(h(7).lord, "Mars");
    assert.deepEqual(h(7).lordPlacement, { house: 9, sign: "Capricorn" }); // Mars (lord of Scorpio) is in house 9
    assert.equal(h(1).lord, "Venus");
    assert.deepEqual(h(1).lordPlacement, { house: 12, sign: "Aries" });
    for (const x of houses) assert.equal(x.lord, SIGN_LORD[x.sign]);
  });

  test("house 7 receives the 7th aspect of the planets in house 1 and Saturn's 10th aspect, and nothing else", () => {
    assert.deepEqual(
      sorted(h(7).aspectedBy.map((a) => `${a.planet}:${a.fromHouse}:${a.aspect}`)),
      ["Mercury:1:7", "Saturn:10:10", "Sun:1:7"],
    );
  });

  test("house 12 receives Mars's 4th, Jupiter's 7th and Saturn's 3rd", () => {
    assert.deepEqual(
      sorted(h(12).aspectedBy.map((a) => `${a.planet}:${a.fromHouse}:${a.aspect}`)),
      ["Jupiter:6:7", "Mars:9:4", "Saturn:10:3"],
    );
  });

  test("a planet's own house is not an aspect, and a position is not confused with an aspect", () => {
    assert.ok(!h(1).aspectedBy.some((a) => a.fromHouse === 1)); // house 1 is occupied by Sun/Mercury but they do not aspect it
    assert.ok(!h(10).aspectedBy.some((a) => a.planet === "Saturn"));
  });

  test("Rahu and Ketu are shown as occupants but never as aspecting planets", () => {
    for (const x of houses) assert.ok(!x.aspectedBy.some((a) => a.planet === "Rahu" || a.planet === "Ketu"));
  });
});

describe("houses from the real calculation engine", () => {
  const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
  const cases: [string, string][] = [["1947-08-15", "00:00"], ["1990-05-17", "06:45"], ["2001-12-03", "23:10"]];

  for (const [dob, time] of cases) {
    const k = buildKundali(parseKundaliInput({ dateOfBirth: dob, timeOfBirth: time, timeUnknown: false, place: delhi }), new Date("2026-10-30T00:00:00Z"));

    test(`${dob} ${time}: D1 houses agree with the engine's own planet houses and signs`, () => {
      assert.ok(k.houses && k.planets && k.lagna);
      const lagnaIdx = SIGNS.indexOf(k.lagna!.rashi.sign as (typeof SIGNS)[number]);
      for (const hs of k.houses!.d1) assert.equal(hs.sign, SIGNS[(lagnaIdx + hs.house - 1) % 12]);
      for (const p of k.planets!) {
        const home: HouseInfo = k.houses!.d1.find((x: HouseInfo) => x.planets.includes(p.planet as Planet))!;
        assert.equal(home.house, p.house, `${p.planet} house`);
        assert.equal(home.sign, p.rashi.sign, `${p.planet} sign`);
      }
    });

    test(`${dob} ${time}: D9 houses use the Navamsa placements, not the D1 ones`, () => {
      assert.ok(k.houses && k.navamsa);
      const lagnaIdx = SIGNS.indexOf(k.navamsa!.lagna.sign as (typeof SIGNS)[number]);
      for (const hs of k.houses!.d9) assert.equal(hs.sign, SIGNS[(lagnaIdx + hs.house - 1) % 12]);
      for (const p of k.navamsa!.planets) {
        const home: HouseInfo = k.houses!.d9.find((x: HouseInfo) => x.planets.includes(p.planet as Planet))!;
        assert.equal(home.house, p.house, `${p.planet} D9 house`);
        assert.equal(home.sign, p.rashi.sign, `${p.planet} D9 sign`);
      }
    });

    test(`${dob} ${time}: aspects received match the engine's existing planet-level aspectedBy`, () => {
      const [y, m, d] = dob.split("-").map(Number);
      const [hh, mm] = time.split(":").map(Number);
      const chart = computeBirthChart(resolveBirthInstant({ year: y, month: m, day: d, hour: hh, minute: mm }, delhi.timezone).utc, delhi.latitude, delhi.longitude);
      for (const planet of PLANETS) {
        // aspectedBy() answers "who aspects the sign this planet stands in", which is the same question as "who aspects its house".
        const home = k.houses!.d1.find((x) => x.planets.includes(planet))!;
        assert.deepEqual(sorted(home.aspectedBy.map((a) => a.planet)), sorted(aspectedBy(planet, chart)), `${planet} in house ${home.house}`);
      }
    });
  }

  test("an unknown birth time has no houses at all (nothing is assumed)", () => {
    const k = buildKundali(parseKundaliInput({ dateOfBirth: "1990-05-17", timeOfBirth: null, timeUnknown: true, place: delhi }), new Date("2026-10-30T00:00:00Z"));
    assert.equal(k.houses, null);
  });
});
