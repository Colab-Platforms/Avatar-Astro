import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { recommend, housesOwnedBy } from "../recommendation.js";
import type { BirthChart, PlanetPosition } from "../chart.engine.js";
import { PLANETS, SIGNS, type Planet } from "../gemstone.catalogue.js";

const chartWithLagna = (lagnaIndex: number, placements: Partial<Record<Planet, number>> = {}): BirthChart => {
  const planets = {} as Record<Planet, PlanetPosition>;
  for (const p of PLANETS) {
    const i = placements[p] ?? 0;
    planets[p] = { planet: p, longitude: i * 30 + 10, sign: SIGNS[i], signIndex: i, degreeInSign: 10 };
  }
  return {
    ayanamsa: 24,
    ascendant: { longitude: lagnaIndex * 30 + 5, sign: SIGNS[lagnaIndex], signIndex: lagnaIndex, degreeInSign: 5 },
    planets,
  };
};

const EXPECTED: [number, string, string][] = [
  [0, "Mars", "red-coral"],
  [1, "Venus", "diamond"],
  [2, "Mercury", "emerald"],
  [3, "Moon", "pearl"],
  [4, "Sun", "ruby"],
  [5, "Mercury", "emerald"],
  [6, "Venus", "diamond"],
  [7, "Mars", "red-coral"],
  [8, "Jupiter", "yellow-sapphire"],
  [9, "Saturn", "blue-sapphire"],
  [10, "Saturn", "blue-sapphire"],
  [11, "Jupiter", "yellow-sapphire"],
];

describe("Lagna-lord primary rule", () => {
  for (const [i, lord, stone] of EXPECTED) {
    test(`${SIGNS[i]} Lagna -> ${lord} -> ${stone}`, () => {
      const r = recommend(chartWithLagna(i));
      assert.equal(r.lagnaLord, lord);
      assert.equal(r.primary.key, stone);
    });
  }

  test("never recommends Hessonite or Cat's Eye", () => {
    for (let i = 0; i < 12; i++) {
      const r = recommend(chartWithLagna(i));
      for (const s of [r.primary, ...r.secondary.map((x) => x.stone)]) {
        assert.ok(!["hessonite", "cats-eye"].includes(s.key));
      }
    }
  });

  test("the primary stone depends on the Ascendant, not the Sun sign", () => {
    const a = recommend(chartWithLagna(0, { Sun: 4 }));
    const b = recommend(chartWithLagna(1, { Sun: 4 }));
    assert.notEqual(a.primary.key, b.primary.key);
  });
});

describe("5th/9th secondary perspectives", () => {
  test("Aries: 5th lord Sun accepted, 9th lord Jupiter excluded (also owns 12th)", () => {
    const r = recommend(chartWithLagna(0));
    assert.deepEqual(r.secondary.map((s) => s.planet), ["Sun"]);
    assert.equal(r.excluded[0].planet, "Jupiter");
    assert.match(r.excluded[0].reason, /12th/);
  });

  test("Taurus: Mercury (5th) and Saturn (9th) accepted", () => {
    const r = recommend(chartWithLagna(1));
    assert.deepEqual(r.secondary.map((s) => s.planet), ["Mercury", "Saturn"]);
  });

  test("Cancer: 9th lord Jupiter excluded (owns 6th)", () => {
    const r = recommend(chartWithLagna(3));
    assert.deepEqual(r.secondary.map((s) => s.planet), ["Mars"]);
    assert.equal(r.excluded[0].planet, "Jupiter");
  });

  test("never repeats the primary planet", () => {
    for (let i = 0; i < 12; i++) {
      const r = recommend(chartWithLagna(i));
      assert.ok(r.secondary.every((s) => s.planet !== r.lagnaLord));
      assert.equal(new Set(r.secondary.map((s) => s.planet)).size, r.secondary.length);
    }
  });

  test("housesOwnedBy", () => {
    assert.deepEqual(housesOwnedBy("Mars", 0), [1, 8]);
    assert.deepEqual(housesOwnedBy("Jupiter", 3), [6, 9]);
  });
});

describe("transparent cautions", () => {
  test("flags a debilitated Lagna lord without changing the stone", () => {
    // Taurus Lagna, Venus in Virgo (index 5) = debilitated, 5th house
    const r = recommend(chartWithLagna(1, { Venus: 5 }));
    assert.equal(r.primary.key, "diamond");
    assert.ok(r.cautions.some((c) => /debilitation/.test(c)));
  });

  test("flags Lagna lord in a dusthana house", () => {
    const r = recommend(chartWithLagna(0, { Mars: 7 })); // Mars in Scorpio = 8th house
    assert.ok(r.cautions.some((c) => /8th house/.test(c)));
  });

  test("Saturn lagna carries the Blue Sapphire caution", () => {
    const r = recommend(chartWithLagna(9));
    assert.ok(r.cautions.some((c) => /Blue Sapphire/.test(c)));
  });
});
