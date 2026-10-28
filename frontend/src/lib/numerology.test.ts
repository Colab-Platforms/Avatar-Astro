import { describe, expect, it } from "vitest";
import {
  CHALDEAN_MAP,
  PYTHAGOREAN_MAP,
  buildProfile,
  chaldeanWorking,
  checkName,
  datesForNumber,
  destinyWorking,
  lifePathWorking,
  personalityWorking,
  planetForNumber,
  reduceNumber,
  reductionChain,
  soulUrgeWorking,
  zodiacFromDob,
  birthNumberWorking,
} from "./numerology";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

describe("letter tables", () => {
  it("Pythagorean follows the standard A=1…I=9 cycle for every letter", () => {
    ALPHABET.forEach((ch, i) => expect(PYTHAGOREAN_MAP[ch], ch).toBe((i % 9) + 1));
  });

  it("Chaldean matches the standard table for every letter", () => {
    const standard: Record<number, string> = { 1: "AIJQY", 2: "BKR", 3: "CGLS", 4: "DMT", 5: "EHNX", 6: "UVW", 7: "OZ", 8: "FP" };
    const expected: Record<string, number> = {};
    for (const [v, letters] of Object.entries(standard)) letters.split("").forEach((l) => (expected[l] = Number(v)));
    expect(Object.keys(expected).sort().join("")).toBe(ALPHABET.join("")); // the reference itself covers A–Z once
    expect(CHALDEAN_MAP).toEqual(expected);
  });

  it("Chaldean never assigns 9 to a letter", () => {
    expect(Object.values(CHALDEAN_MAP).includes(9)).toBe(false);
  });
});

describe("reduction", () => {
  it("reduces to a single digit and keeps 11, 22, 33 when asked", () => {
    expect(reduceNumber(44)).toBe(8);
    expect(reduceNumber(29)).toBe(11);
    expect(reduceNumber(29, false)).toBe(2);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(22, false)).toBe(4);
    expect(reduceNumber(33)).toBe(33);
    expect(reduceNumber(33, false)).toBe(6);
    expect(reduceNumber(0)).toBe(0);
  });

  it("reports the chain of totals", () => {
    expect(reductionChain(44)).toEqual([44, 8]);
    expect(reductionChain(29)).toEqual([29, 11]);
    expect(reductionChain(29, false)).toEqual([29, 11, 2]);
    expect(reductionChain(7)).toEqual([7]);
  });
});

describe("worked example: JOHN SMITH", () => {
  const c = checkName("John Smith");
  if (!c.ok) throw new Error("fixture");
  it("Destiny (Pythagorean, all letters): 20 + 24 = 44 → 8", () => {
    const w = destinyWorking(c.letters);
    expect(w.total).toBe(44);
    expect(w.chain).toEqual([44, 8]);
    expect(w.result).toBe(8);
  });
  it("Soul Urge (O, I): 6 + 9 = 15 → 6", () => {
    const w = soulUrgeWorking(c.letters);
    expect(w.letters.map((l) => l.ch).join("")).toBe("OI");
    expect(w.total).toBe(15);
    expect(w.result).toBe(6);
  });
  it("Personality (consonants): 29 → 11, a master number that is kept", () => {
    const w = personalityWorking(c.letters);
    expect(w.letters.map((l) => l.ch).join("")).toBe("JHNSMTH");
    expect(w.total).toBe(29);
    expect(w.chain).toEqual([29, 11]);
    expect(w.result).toBe(11);
  });
  it("Chaldean: 18 + 17 = 35 → 8 (masters are not special in Chaldean)", () => {
    const w = chaldeanWorking(c.letters);
    expect(w.total).toBe(35);
    expect(w.result).toBe(8);
  });
});

describe("date numbers", () => {
  it("Life Path for 1990-05-17: 1+9+9+0+0+5+1+7 = 32 → 5", () => {
    const w = lifePathWorking("1990-05-17");
    expect(w.digits).toEqual([1, 9, 9, 0, 0, 5, 1, 7]);
    expect(w.total).toBe(32);
    expect(w.result).toBe(5);
  });
  it("keeps the master Life Paths 11, 22 and 33 when the digit total reaches them", () => {
    const eleven = lifePathWorking("1960-03-19"); // 1+9+6+0+0+3+1+9 = 29 -> 2+9 = 11
    expect(eleven.total).toBe(29);
    expect(eleven.chain).toEqual([29, 11]);
    expect(eleven.result).toBe(11);
    const twentyTwo = lifePathWorking("1960-01-05"); // total is 22 itself
    expect(twentyTwo.total).toBe(22);
    expect(twentyTwo.result).toBe(22);
    const thirtyThree = lifePathWorking("1960-07-19"); // total is 33 itself
    expect(thirtyThree.total).toBe(33);
    expect(thirtyThree.result).toBe(33);
  });
  it("reduces ordinary totals to a single digit", () => {
    expect(lifePathWorking("1987-04-23").total).toBe(34);
    expect(lifePathWorking("1987-04-23").result).toBe(7);
    expect(lifePathWorking("1980-12-28").total).toBe(31);
    expect(lifePathWorking("1980-12-28").result).toBe(4);
  });
  it("Birth Number is the reduced day of month, keeping 11 and 22", () => {
    expect(birthNumberWorking("1990-05-17").result).toBe(8);
    expect(birthNumberWorking("1990-05-29").result).toBe(11); // 29 → 11
    expect(birthNumberWorking("1990-05-22").result).toBe(22);
    expect(birthNumberWorking("1990-05-11").result).toBe(11);
  });
});

describe("name checking", () => {
  it("accepts accents and strips them", () => {
    const c = checkName("José Núñez");
    expect(c.ok && c.letters).toBe("JOSENUNEZ");
  });
  it("is case-insensitive and ignores spaces, hyphens, apostrophes and full stops", () => {
    const a = checkName("mary-jane o'neil jr.");
    const b = checkName("MARY JANE ONEIL JR");
    expect(a.ok && b.ok && a.letters === b.letters).toBe(true);
  });
  it("repeated letters are all counted", () => {
    const c = checkName("Anna");
    expect(c.ok && destinyWorking(c.letters).total).toBe(1 + 5 + 5 + 1);
  });
  it.each([
    ["", /enter a name/i],
    ["   ", /enter a name/i],
    ["A", /at least two letters/i],
    ["राहुल", /English letters/i],
    ["John3", /English letters/i],
    ["John<script>", /English letters/i],
    ["x".repeat(61), /60 characters/i],
  ])("rejects %j", (input, message) => {
    const c = checkName(input);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.error).toMatch(message);
  });
});

describe("correspondences", () => {
  it("maps digits to the traditional planets and master numbers via their root", () => {
    expect(planetForNumber(1).planet).toBe("Sun");
    expect(planetForNumber(2).planet).toBe("Moon");
    expect(planetForNumber(4).planet).toBe("Rahu");
    expect(planetForNumber(9).planet).toBe("Mars");
    expect(planetForNumber(11).planet).toBe("Moon"); // 11 → 2
    expect(planetForNumber(22).planet).toBe("Rahu"); // 22 → 4
    expect(planetForNumber(33).planet).toBe("Venus"); // 33 → 6
  });
  it("lists the days of the month that reduce to the same digit", () => {
    expect(datesForNumber(5)).toEqual([5, 14, 23]);
    expect(datesForNumber(1)).toEqual([1, 10, 19, 28]);
    expect(datesForNumber(9)).toEqual([9, 18, 27]);
    expect(datesForNumber(11)).toEqual([2, 11, 20, 29]);
  });
  it("Sun sign boundaries", () => {
    expect(zodiacFromDob("1990-01-19")).toBe("Capricorn");
    expect(zodiacFromDob("1990-01-20")).toBe("Aquarius");
    expect(zodiacFromDob("1990-12-21")).toBe("Sagittarius");
    expect(zodiacFromDob("1990-12-22")).toBe("Capricorn");
  });
});

describe("buildProfile", () => {
  it("returns every number for a valid input", () => {
    const p = buildProfile("John Smith", "1990-05-17");
    if ("error" in p) throw new Error(p.error);
    expect(p.destiny.result).toBe(8);
    expect(p.lifePath.result).toBe(5);
    expect(p.zodiac).toBe("Taurus");
  });
  it("returns an error object for an invalid name", () => {
    expect(buildProfile("1234", "1990-05-17")).toHaveProperty("error");
  });
  it("is stable: the same input always gives the same profile", () => {
    expect(buildProfile("Asha Rao", "1992-08-03")).toEqual(buildProfile("Asha Rao", "1992-08-03"));
  });
});
