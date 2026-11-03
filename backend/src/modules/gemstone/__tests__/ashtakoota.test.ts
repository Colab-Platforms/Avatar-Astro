import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { koota } from "../ashtakoota.js";
import { buildMatch } from "../match.js";
import { ValidationError } from "../gemstone.service.js";

const delhi = { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const person = (dateOfBirth: string, timeOfBirth: string | null) => ({ dateOfBirth, timeOfBirth, timeUnknown: timeOfBirth === null, place: delhi });

describe("Ashtakoota", () => {
  test("the eight Kootas sum to the total and never exceed their maxima (total max 36)", () => {
    for (let a = 5; a < 360; a += 37) {
      for (let b = 3; b < 360; b += 41) {
        const r = koota(a, b);
        assert.equal(r.kootas.length, 8);
        assert.equal(r.kootas.reduce((s, k) => s + k.max, 0), 36);
        assert.equal(r.total, r.kootas.reduce((s, k) => s + k.score, 0));
        for (const k of r.kootas) assert.ok(k.score >= 0 && k.score <= k.max, `${k.koota} ${k.score}`);
      }
    }
  });

  test("same Moon position for both scores 0 for Nadi (same Nadi) and 7 for Bhakoot, 6 Gana, 4 Yoni", () => {
    const r = koota(100, 100); // Pushya, Cancer
    const by = Object.fromEntries(r.kootas.map((k) => [k.koota, k.score]));
    assert.equal(by.Nadi, 0);
    assert.equal(by.Bhakoot, 7);
    assert.equal(by.Gana, 6);
    assert.equal(by.Yoni, 4);
    assert.equal(r.doshas.find((d) => d.name === "Nadi Dosha")?.present, true);
  });

  test("Aries Moon vs Virgo Moon is 6/8 apart: Bhakoot 0 and Bhakoot Dosha present", () => {
    const r = koota(5, 5 + 30 * 5); // Aries and Virgo are 6 signs apart (1 -> 6)
    const bh = r.kootas.find((k) => k.koota === "Bhakoot")!;
    assert.equal(bh.score, 0);
  });

  test("Nadi differs for Ashwini (Adi) and Bharani (Madhya): full 8", () => {
    const r = koota(1, 14);
    assert.equal(r.kootas.find((k) => k.koota === "Nadi")!.score, 8);
  });
});

describe("Koota tables (published tables and classical rules; see docs/ashtakoota-validation.md)", () => {
  const by = (a: number, b: number) => Object.fromEntries(koota(a, b).kootas.map((k) => [k.koota, k.score]));
  // Nakshatra n (1-27), pada p: mid-pada longitude
  const lon = (n: number, p: number) => (n - 1) * (360 / 27) + (p - 1) * (360 / 108) + 360 / 216;
  test("Yoni uses the full grid: Ashwini (Horse) with Hasta (Buffalo) is 0, Horse with Bharani (Elephant) is 2, Ashwini with Rohini (Serpent) is 3", () => {
    assert.equal(by(lon(1, 1), lon(13, 1)).Yoni, 0);
    assert.equal(by(lon(1, 1), lon(2, 1)).Yoni, 2);
    assert.equal(by(lon(1, 1), lon(4, 1)).Yoni, 3);
  });
  test("Tara: same Nakshatra counts 1 (favourable, 3 points); counts of 3, 5, 7 in a direction score 0 for that direction", () => {
    assert.equal(by(lon(1, 1), lon(1, 3)).Tara, 3);
    // Ashwini -> Krittika is count 3 and Krittika -> Ashwini is count 26 (remainder 8): only one direction is unfavourable
    assert.equal(by(lon(1, 1), lon(3, 1)).Tara, 1.5);
  });
  test("Varna: water Brahmin >= earth Vaishya scores 1, the reverse 0", () => {
    assert.equal(by(100, 40).Varna, 1); // Cancer (Brahmin) with Taurus (Vaishya)
    assert.equal(by(40, 100).Varna, 0);
  });
  test("Bhakoot is symmetric for every pair of signs, Cancer and Aquarius (6/8) included", () => {
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) assert.equal(by(i * 30 + 5, j * 30 + 5).Bhakoot, by(j * 30 + 5, i * 30 + 5).Bhakoot);
    assert.equal(by(3 * 30 + 5, 10 * 30 + 5).Bhakoot, 0);
  });
});

describe("buildMatch", () => {
  test("calculates both charts and a score from real Moon positions", () => {
    const m = buildMatch(person("1992-08-15", "10:30"), person("1991-11-22", "18:15"));
    assert.ok(m.ashtakoota.total >= 0 && m.ashtakoota.total <= 36);
    assert.ok(m.a.planets && m.b.planets);
    assert.equal(m.ashtakoota.moons.a.sign, m.a.moon.rashi?.sign);
    assert.equal(m.ashtakoota.moons.b.sign, m.b.moon.rashi?.sign);
  });
  test("refuses to score without both birth times", () => {
    assert.throws(() => buildMatch(person("1992-08-15", null), person("1991-11-22", "18:15")), ValidationError);
  });

  test("no score is produced for any missing or unusable birth detail (either person, time or place)", () => {
    const ok = person("1991-11-22", "18:15");
    const cases: [string, unknown, unknown][] = [
      ["first time missing", person("1992-08-15", null), ok],
      ["second time missing", ok, person("1992-08-15", null)],
      ["first time empty string", { ...person("1992-08-15", "10:30"), timeOfBirth: "" }, ok],
      ["first time unknown flag", { ...person("1992-08-15", "10:30"), timeUnknown: true }, ok],
      ["first place missing", { dateOfBirth: "1992-08-15", timeOfBirth: "10:30", timeUnknown: false }, ok],
      ["second place missing", ok, { dateOfBirth: "1992-08-15", timeOfBirth: "10:30", timeUnknown: false }],
      ["first time malformed", { ...person("1992-08-15", "10:30"), timeOfBirth: "25:99" }, ok],
      ["both missing", undefined, undefined],
      ["first place has no coordinates", { ...person("1992-08-15", "10:30"), place: { name: "X", timezone: "Asia/Kolkata" } }, ok],
    ];
    for (const [label, a, b] of cases) assert.throws(() => buildMatch(a, b), Error, label);
  });
});
