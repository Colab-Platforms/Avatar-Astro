import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aspectedBy,
  dignityOf,
  functionalNature,
  nakshatraOf,
  vimshottari,
} from "../analysis.js";
import { recommend } from "../recommendation.js";
import { calculateRatna, parseLegacyInput } from "../gemstone.service.js";
import { validateExplanation } from "../explanation.service.js";
import type { BirthChart, PlanetPosition } from "../chart.engine.js";
import { GEMSTONES, PLANETS, SIGNS, type Planet } from "../gemstone.catalogue.js";

const chartWith = (lagnaIndex: number, placements: Partial<Record<Planet, number>> = {}, deg = 10): BirthChart => {
  const planets = {} as Record<Planet, PlanetPosition>;
  for (const p of PLANETS) {
    const i = placements[p] ?? 0;
    planets[p] = { planet: p, longitude: i * 30 + deg, sign: SIGNS[i], signIndex: i, degreeInSign: deg };
  }
  return {
    ayanamsa: 24,
    ascendant: { longitude: lagnaIndex * 30 + 5, sign: SIGNS[lagnaIndex], signIndex: lagnaIndex, degreeInSign: 5 },
    planets,
  };
};

describe("nakshatra and pada", () => {
  test("boundaries", () => {
    assert.deepEqual(
      [nakshatraOf(0).name, nakshatraOf(0).pada, nakshatraOf(0).lord],
      ["Ashwini", 1, "Ketu"],
    );
    assert.equal(nakshatraOf(3.3).pada, 1);
    assert.equal(nakshatraOf(3.34).pada, 2);
    assert.equal(nakshatraOf(13.34).name, "Bharani");
    assert.equal(nakshatraOf(359.99).name, "Revati");
    assert.equal(nakshatraOf(359.99).pada, 4);
    assert.equal(nakshatraOf(120).name, "Magha"); // 0° Leo
    assert.equal(nakshatraOf(120).lord, "Ketu");
  });
  test("27 nakshatras cycle through the nine dasha lords three times", () => {
    const lords = Array.from({ length: 27 }, (_, i) => nakshatraOf(i * (360 / 27) + 0.01).lord);
    assert.deepEqual(lords.slice(0, 9), lords.slice(9, 18));
    assert.deepEqual(lords.slice(9, 18), lords.slice(18));
  });
});

describe("dignity", () => {
  test("exalted, debilitated, own, mooltrikona, friend, enemy", () => {
    assert.equal(dignityOf("Sun", "Aries", 10), "exalted");
    assert.equal(dignityOf("Saturn", "Aries", 10), "debilitated");
    assert.equal(dignityOf("Mars", "Aries", 5), "mooltrikona");
    assert.equal(dignityOf("Mars", "Aries", 15), "own sign");
    assert.equal(dignityOf("Mars", "Scorpio", 15), "own sign");
    assert.equal(dignityOf("Jupiter", "Leo", 3), "friendly sign");
    assert.equal(dignityOf("Venus", "Leo", 3), "enemy sign");
    assert.equal(dignityOf("Rahu", "Gemini", 3), "not assessed");
  });
});

describe("functional nature by Lagna", () => {
  test("yogakaraka planets", () => {
    assert.equal(functionalNature("Saturn", 1).nature, "yogakaraka"); // Taurus: 9th + 10th
    assert.equal(functionalNature("Saturn", 6).nature, "yogakaraka"); // Libra: 4th + 5th
    assert.equal(functionalNature("Mars", 3).nature, "yogakaraka"); // Cancer: 5th + 10th
    assert.equal(functionalNature("Mars", 4).nature, "yogakaraka"); // Leo: 4th + 9th
  });
  test("dusthana-only and mixed lordships", () => {
    assert.equal(functionalNature("Jupiter", 1).nature, "malefic"); // Taurus: 8th + 11th
    assert.equal(functionalNature("Venus", 1).nature, "mixed"); // Taurus Lagna lord also owns 6th
    assert.equal(functionalNature("Rahu", 1).nature, "node");
  });
  test("Sun/Moon owning only the 8th are not treated as malefic; 3rd/11th-only lords are", () => {
    assert.equal(functionalNature("Sun", 9).nature, "neutral"); // Capricorn Lagna: Leo is the 8th
    assert.equal(functionalNature("Moon", 8).nature, "neutral"); // Sagittarius Lagna: Cancer is the 8th
    assert.equal(functionalNature("Sun", 6).nature, "malefic"); // Libra Lagna: Leo is the 11th
  });
});

describe("aspects", () => {
  test("Jupiter aspects the 5th, 7th and 9th from itself; Saturn the 3rd, 7th and 10th", () => {
    // Jupiter in Aries; Moon in Leo (5th), Venus in Libra (7th), Mercury in Sagittarius (9th), Sun in Taurus (not aspected)
    const c = chartWith(0, { Jupiter: 0, Moon: 4, Venus: 6, Mercury: 8, Sun: 1, Saturn: 11, Mars: 11, Rahu: 11, Ketu: 11 });
    for (const p of ["Moon", "Venus", "Mercury"] as Planet[]) assert.ok(aspectedBy(p, c).includes("Jupiter"), p);
    assert.ok(!aspectedBy("Sun", c).includes("Jupiter"));
    // Saturn in Pisces aspects Taurus (3rd), Virgo (7th) and Sagittarius (10th)
    assert.ok(aspectedBy("Sun", c).includes("Saturn"));
    assert.ok(aspectedBy("Mercury", c).includes("Saturn"));
  });
  test("nodes cast no aspects in this engine", () => {
    const c = chartWith(0, { Rahu: 0, Sun: 6 });
    assert.ok(!aspectedBy("Sun", c).includes("Rahu"));
  });
});

describe("Vimshottari dasha", () => {
  test("Moon at 0° Ashwini at birth: Ketu mahadasha starts at birth, Venus follows after 7 years", () => {
    const birth = new Date("2000-01-01T00:00:00Z");
    const d0 = vimshottari(0, birth, new Date("2000-01-02T00:00:00Z"))!;
    assert.equal(d0.mahadasha.lord, "Ketu");
    assert.equal(d0.antardasha.lord, "Ketu");
    const d8 = vimshottari(0, birth, new Date("2008-01-02T00:00:00Z"))!;
    assert.equal(d8.mahadasha.lord, "Venus");
    assert.equal(d8.antardasha.lord, "Venus");
  });
  test("antardasha lengths are proportional: Ketu in Ketu lasts 7*7/120 years (~0.41y)", () => {
    const d = vimshottari(0, new Date("2000-01-01T00:00:00Z"), new Date("2000-02-01T00:00:00Z"))!;
    const days = (Date.parse(d.antardasha.end) - Date.parse(d.antardasha.start)) / 86_400_000;
    assert.ok(Math.abs(days - (49 / 120) * 365.25) < 2);
  });
  test("a Moon part-way through its nakshatra starts with the balance of the first period", () => {
    // Moon halfway through Ashwini: half of Ketu's 7 years already elapsed, so Venus begins ~3.5y after birth.
    const half = 360 / 27 / 2;
    const birth = new Date("2000-01-01T00:00:00Z");
    assert.equal(vimshottari(half, birth, new Date("2003-01-01T00:00:00Z"))!.mahadasha.lord, "Ketu");
    assert.equal(vimshottari(half, birth, new Date("2004-01-01T00:00:00Z"))!.mahadasha.lord, "Venus");
  });
  test("returns null before birth", () => {
    assert.equal(vimshottari(0, new Date("2000-01-01T00:00:00Z"), new Date("1999-01-01T00:00:00Z")), null);
  });
});

describe("recommendation analysis", () => {
  test("same Lagna, different placements give different assessments", () => {
    // Taurus Lagna (Venus lord). Case A: Venus exalted in Pisces, 12th house. Case B: Venus debilitated in Virgo, 5th house.
    const a = recommend(chartWith(1, { Venus: 11 })).analysis;
    const b = recommend(chartWith(1, { Venus: 5 })).analysis;
    assert.equal(a.primary.stone.key, b.primary.stone.key);
    assert.equal(a.primary.profile.dignity, "exalted");
    assert.equal(b.primary.profile.dignity, "debilitated");
    assert.notDeepEqual(a.primary.reasons, b.primary.reasons);
    assert.equal(a.primary.cautions.some((c) => /debilitation/.test(c)), false);
    assert.equal(b.primary.cautions.some((c) => /debilitation/.test(c)), true);
  });
  test("Taurus Lagna: Saturn (9th+10th yogakaraka) is an alternative, Jupiter (8th+11th) is cautioned", () => {
    const an = recommend(chartWith(1)).analysis;
    assert.ok(an.alternatives.some((x) => x.planet === "Saturn"));
    assert.ok(an.cautionedStones.some((x) => x.planet === "Jupiter"));
    assert.ok(an.cautionedStones.some((x) => x.planet === "Rahu"));
    // a planet is never both an alternative and a caution
    const alts = new Set(an.alternatives.map((x) => x.planet));
    for (const c of an.cautionedStones) assert.ok(!alts.has(c.planet));
    assert.ok(![an.primary.planet, ...alts].some((p) => an.cautionedStones.some((c) => c.planet === p)));
  });
  test("every planet is accounted for exactly once", () => {
    for (let i = 0; i < 12; i++) {
      const an = recommend(chartWith(i)).analysis;
      const all = [an.primary.planet, ...an.alternatives.map((x) => x.planet), ...an.cautionedStones.map((x) => x.planet), ...an.notIndicated];
      assert.equal(new Set(all).size, 9, SIGNS[i]);
      assert.equal(all.length, 9, SIGNS[i]);
    }
  });
  test("Ascendant near a sign boundary adds a caution", () => {
    const c = chartWith(0);
    c.ascendant = { ...c.ascendant, degreeInSign: 0.4, longitude: 0.4 };
    assert.ok(recommend(c).analysis.ascendantNearBoundary);
    assert.ok(recommend(c).cautions.some((x) => /sign boundary/.test(x)));
    assert.equal(recommend(chartWith(0)).analysis.ascendantNearBoundary, false);
  });
  test("no numeric strength is reported and missing factors are declared", () => {
    const an = recommend(chartWith(0)).analysis;
    assert.ok(an.notCalculated.some((x) => /Shadbala/.test(x)));
    assert.ok(!JSON.stringify(an).match(/shadbalaScore|strengthScore/));
  });
});

describe("real chart through the service", () => {
  const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
  const make = (dateOfBirth: string, timeOfBirth: string, place = delhi) =>
    calculateRatna(parseLegacyInput({ dateOfBirth, timeOfBirth, timeUnknown: false, place }), { now: new Date("2026-10-30T00:00:00Z") });

  test("1947-08-15 00:00 Delhi: Taurus Lagna, Moon in Pushya, calculated placements and dasha", async () => {
    const r = await make("1947-08-15", "00:00");
    const an = r.recommendation!.analysis;
    assert.equal(an.lagna.sign, "Taurus");
    assert.equal(an.moon.sign, "Cancer");
    assert.equal(an.moon.nakshatra, "Pushya");
    assert.equal(an.dasha?.mahadasha.lord, "Mars");
    assert.equal(an.dasha?.antardasha.lord, "Rahu");
    const venus = r.chart!.planets.find((p) => p.planet === "Venus")!;
    assert.equal(venus.combust, true); // ~5° from the Sun
    assert.equal(venus.nakshatra, "Ashlesha");
    const rahu = r.chart!.planets.find((p) => p.planet === "Rahu")!;
    assert.equal(rahu.retrograde, true);
    assert.equal(r.chart!.planets.length, 9);
  });

  test("recommendation is not fixed by Moon sign or Lagna: different times on the same day differ", async () => {
    const keys = new Set<string>();
    const alts = new Set<string>();
    for (const t of ["02:00", "06:00", "10:00", "14:00", "18:00", "22:00"]) {
      const r = await make("1990-05-05", t);
      keys.add(r.recommendation!.stone.key);
      alts.add(r.recommendation!.analysis.alternatives.map((a) => a.stone.key).join("+"));
      assert.equal(r.chart!.planets.find((p) => p.planet === "Moon")!.sign, r.recommendation!.analysis.moon.sign);
    }
    assert.ok(keys.size >= 4, `expected varied primaries, got ${[...keys]}`);
  });

  test("two people with the same Moon sign and Lagna but different dates get different reasoning", async () => {
    const a = await make("1990-05-05", "10:00");
    const b = await make("1992-08-20", "10:00");
    const an = a.recommendation!.analysis, bn = b.recommendation!.analysis;
    if (an.lagna.sign === bn.lagna.sign) assert.notDeepEqual(an.primary.reasons, bn.primary.reasons);
    assert.notEqual(JSON.stringify(a.chart!.planets), JSON.stringify(b.chart!.planets));
  });
});

describe("explanation guard rails for the new facts", () => {
  const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
  test("rejects invented strength figures, nakshatras and dashas", async () => {
    const r = await calculateRatna(parseLegacyInput({ dateOfBirth: "1947-08-15", timeOfBirth: "00:00", timeUnknown: false, place: delhi }), { now: new Date("2026-10-30T00:00:00Z") });
    const rec = (await import("../recommendation.js")).recommend;
    const { computeBirthChart } = await import("../chart.engine.js");
    const chart = computeBirthChart(new Date("1947-08-14T18:30:00Z"), delhi.latitude, delhi.longitude);
    const recommendation = rec(chart, new Date("2026-10-30T00:00:00Z"));
    const planetSigns = Object.fromEntries(PLANETS.map((p) => [p, chart.planets[p].sign]));
    const ctx = { recommendation, planetSigns } as Parameters<typeof validateExplanation>[1];
    const base = "Your Ascendant is Taurus and the Lagna lord Venus is traditionally associated with Diamond or White Sapphire. This is a traditional association, not a guarantee, and a qualified astrologer can say more.";
    assert.equal(validateExplanation(base, ctx), null);
    assert.match(validateExplanation(base + " Venus has 73% strength.", ctx) ?? "", /strength figure/);
    assert.match(validateExplanation(base + " Venus sits in Bharani nakshatra.", ctx) ?? "", /nakshatra/);
    assert.match(validateExplanation(base + " Jupiter Mahadasha is running now.", ctx) ?? "", /dasha/);
    assert.ok(r.explanation.text.length > 0);
    assert.ok(GEMSTONES.diamond.hindi === "हीरा");
  });
});
