import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { digitsFor, isValidNumber, parseRegistration } from "../registration";
import { ENEMIES, FRIENDS, compatibility, evaluateDigits, explain, labelFor, relationBetween } from "../vehicleNumerology";
import { birthDateNumbers, fancyReasons, FANCY_RULES, isFancy, recommend, recommendWithInfo, SPECIAL_NUMBERS } from "../recommend";
import { birthNumberWorking, lifePathWorking, PLANET_BY_DIGIT } from "@/lib/numerology";

const ok = (raw: string) => {
  const r = parseRegistration(raw);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const ev = (d: string) => evaluateDigits(d)!;

describe("registration parsing", () => {
  it("reads full registrations in any spacing and keeps leading zeros", () => {
    for (const raw of ["MH12AB0007", "mh 12 ab 0007", "MH-12-AB-0007", "MH 12 AB 0007"]) {
      const v = ok(raw);
      expect(v).toMatchObject({ kind: "standard", state: "MH", rto: "12", series: "AB", number: "0007", padded: false, display: "MH 12 AB 0007" });
    }
    expect(ok("DL3CAB1234")).toMatchObject({ state: "DL", rto: "3", series: "CAB", number: "1234" });
    expect(ok("KA01 0786").number).toBe("0786");
    expect(ok("MH12AB0007").number).not.toBe("7");
  });

  it("reads the Bharat series and a bare number", () => {
    expect(ok("22 BH 0007 AB")).toMatchObject({ kind: "bh", bhYear: "22", number: "0007", series: "AB", display: "22 BH 0007 AB" });
    expect(ok("0007")).toMatchObject({ kind: "number", number: "0007", padded: false });
  });

  it("pads a short number to four digits and says it was padded", () => {
    expect(ok("7")).toMatchObject({ number: "0007", padded: true });
    expect(ok("MH12AB7")).toMatchObject({ number: "0007", padded: true, display: "MH 12 AB 0007" });
    expect(ok("786").number).toBe("0786");
  });

  it("rejects what it cannot read, and 0000", () => {
    for (const bad of ["", "   ", "MH12AB", "12345", "MH 12 AB 00007", "A", "M@12AB0007", "MH12AB0000", "0000"]) expect(parseRegistration(bad).ok, bad).toBe(false);
    const r = parseRegistration("0000");
    expect(!r.ok && r.error).toMatch(/0001 to 9999/);
    const g = parseRegistration("nonsense!");
    expect(!g.ok && g.error).toMatch(/Examples/);
  });

  it("chooses which digits are evaluated: the number by default, or with the RTO code, or every digit", () => {
    const v = ok("MH 12 AB 0007");
    expect(digitsFor(v, "number").digits).toBe("0007");
    expect(digitsFor(v, "rto-number").digits).toBe("120007");
    expect(digitsFor(v, "all").digits).toBe("120007");
    const bh = ok("22 BH 0007 AB");
    expect(digitsFor(bh, "all").digits).toBe("220007");
    expect(digitsFor(bh, "rto-number")).toMatchObject({ digits: "0007", note: expect.stringMatching(/No RTO code/) });
    expect(digitsFor(ok("0007"), "all")).toMatchObject({ digits: "0007", note: expect.stringMatching(/Only the registration number/) });
  });

  it("isValidNumber accepts 0001 to 9999 only", () => {
    expect(["0001", "0007", "9999"].every(isValidNumber)).toBe(true);
    expect(["0000", "007", "12345", "abcd", ""].some(isValidNumber)).toBe(false);
  });
});

describe("digit sum and reduction (the existing numerology routine)", () => {
  it("0007 keeps its leading zeros, totals 7 and reads as 7 (Ketu)", () => {
    const e = ev("0007");
    expect(e.digits).toBe("0007");
    expect(e).toMatchObject({ total: 7, reduced: 7, root: 7, master: null, planet: "Ketu" });
    expect(e.chain).toEqual([7]);
    expect(e.theme.keywords).toMatch(/Reflection/);
  });

  it("reduces step by step", () => {
    expect(ev("1234")).toMatchObject({ total: 10, reduced: 1, root: 1, planet: "Sun" });
    expect(ev("1234").chain).toEqual([10, 1]);
    expect(ev("9999")).toMatchObject({ total: 36, reduced: 9, planet: "Mars" });
    expect(ev("0786")).toMatchObject({ total: 21, reduced: 3, planet: "Jupiter" });
    expect(ev("0021")).toMatchObject({ total: 3, reduced: 3 });
  });

  it("keeps master numbers 11, 22 and 33 and reads them as their root for the planet", () => {
    expect(ev("2900")).toMatchObject({ total: 11, reduced: 11, root: 2, master: 11, planet: "Moon" });
    expect(ev("9992")).toMatchObject({ total: 29, reduced: 11, root: 2, master: 11 });
    expect(ev("9993")).toMatchObject({ total: 30, reduced: 3, master: null });
    expect(ev("6699")).toMatchObject({ total: 30 });
    expect(ev("8995")).toMatchObject({ total: 31 });
    expect(ev("9994").total).toBe(31);
    expect(ev("9995").total).toBe(32);
    expect(ev("9996")).toMatchObject({ total: 33, reduced: 33, root: 6, master: 33 });
  });

  it("returns nothing for no digits or a zero total", () => {
    expect(evaluateDigits("0000")).toBeNull();
    expect(evaluateDigits("")).toBeNull();
    expect(evaluateDigits("12a4")).toBeNull();
  });

  it("uses the same Birth Number and Life Path routines as the rest of the app", () => {
    expect(birthNumberWorking("1990-07-14").result).toBe(5);
    expect(lifePathWorking("1990-07-14").result).toBe(4);
    expect(PLANET_BY_DIGIT[7].planet).toBe("Ketu");
  });
});

describe("planetary relations", () => {
  it("the friendship table is the one the Janma Kundali analysis uses (backend analysis.ts)", () => {
    const src = readFileSync(join(__dirname, "../../../../../backend/src/modules/gemstone/analysis.ts"), "utf8");
    const grab = (name: string) => {
      const block = src.slice(src.indexOf(`const ${name}`), src.indexOf("};", src.indexOf(`const ${name}`)));
      const out: Record<string, string[]> = {};
      for (const m of block.matchAll(/(\w+): \[([^\]]*)\]/g)) out[m[1]] = [...m[2].matchAll(/"(\w+)"/g)].map((x) => x[1]);
      return out;
    };
    expect(grab("FRIENDS")).toEqual(FRIENDS);
    expect(grab("ENEMIES")).toEqual(ENEMIES);
  });

  it("same number, friend, neutral and enemy", () => {
    expect(relationBetween(5, 5)).toEqual({ relation: "same", byConvention: false });
    expect(relationBetween(1, 2)).toEqual({ relation: "friend", byConvention: false }); // Sun regards Moon as a friend
    expect(relationBetween(1, 5)).toEqual({ relation: "neutral", byConvention: false }); // Sun, Mercury
    expect(relationBetween(1, 6)).toEqual({ relation: "enemy", byConvention: false }); // Sun, Venus
  });

  it("is read from the person's planet towards the vehicle's (Mercury regards the Sun as a friend; the Sun is neutral to Mercury)", () => {
    expect(relationBetween(5, 1).relation).toBe("friend");
    expect(relationBetween(1, 5).relation).toBe("neutral");
  });

  it("Rahu and Ketu are read by convention (like Saturn and Mars) and flagged", () => {
    expect(relationBetween(4, 8)).toEqual({ relation: "friend", byConvention: true }); // Rahu read as Saturn
    expect(relationBetween(4, 1)).toEqual({ relation: "enemy", byConvention: true }); // Saturn regards the Sun as an enemy
    expect(relationBetween(7, 9)).toEqual({ relation: "friend", byConvention: true }); // Ketu read as Mars
    expect(relationBetween(5, 4).byConvention).toBe(true);
    expect(relationBetween(5, 6).byConvention).toBe(false);
  });
});

describe("compatibility scoring", () => {
  it("labels follow the documented points", () => {
    expect([4, 3, 2, 1, 0, -1, -2].map(labelFor)).toEqual(["Strong match", "Strong match", "Good match", "Neutral match", "Neutral match", "Less aligned", "Less aligned"]);
  });

  it("scores the Birth Number and the Life Path separately and adds them", () => {
    // Birth 5 (Mercury), Life Path 6 (Venus). Vehicle 5: same as Birth (+2); Venus regards Mercury as a friend (+1).
    const c = compatibility(ev("0005"), { birth: 5, lifePath: 6 });
    expect(c.lines.map((l) => [l.ref, l.relation, l.points])).toEqual([["Birth Number", "same", 2], ["Life Path", "friend", 1]]);
    expect(c).toMatchObject({ points: 3, label: "Strong match" });
  });

  it("covers the other combinations", () => {
    expect(compatibility(ev("0005"), { birth: 5, lifePath: 5 })).toMatchObject({ points: 4, label: "Strong match" });
    expect(compatibility(ev("0002"), { birth: 1, lifePath: 5 })).toMatchObject({ points: 0, label: "Neutral match" }); // Sun regards the Moon as a friend (+1); Mercury regards the Moon as not a friend (-1)
  });

  it("an enemy relation lowers the score and the label says Less aligned without calling the number bad", () => {
    const c = compatibility(ev("0006"), { birth: 1, lifePath: 3 }); // the Sun and Jupiter both regard Venus as not a friend
    expect(c.points).toBe(-2);
    expect(c.label).toBe("Less aligned");
    expect(JSON.stringify(c)).not.toMatch(/unlucky|bad|inauspicious/i);
  });

  it("master numbers in the person's numbers are read as their root, and the line says so", () => {
    const c = compatibility(ev("0004"), { birth: 22, lifePath: 4 });
    expect(c.lines[0]).toMatchObject({ refNumber: 22, refRoot: 4, relation: "same" });
    expect(explain(ev("0004"), c)[0]).toMatch(/a master number, read as 4/);
  });

  it("explains each line with the real calculation and gives no percentages", () => {
    const e = ev("0007");
    const lines = explain(e, compatibility(e, { birth: 5, lifePath: 3 }));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/Birth Number 5 is ruled by Mercury\. Mercury regards Ketu as/);
    expect(lines.join(" ")).not.toMatch(/%/);
  });
});

const PEOPLE = [
  { person: { birth: 5, lifePath: 4 }, dob: "1990-07-14" },
  { person: { birth: 1, lifePath: 3 }, dob: "1990-01-01" },
  { person: { birth: 9, lifePath: 2 }, dob: "1985-03-09" },
  { person: { birth: 22, lifePath: 11 }, dob: "2001-04-22" },
  { person: { birth: 7, lifePath: 8 }, dob: "1978-12-07" },
  { person: { birth: 6, lifePath: 33 }, dob: "1996-02-15" },
];

describe("premium and fancy numbers are recognised by rules, not a short list", () => {
  it("catches every kind of number the product should not recommend", () => {
    const fancy = [
      "1111", "2222", "3333", "7777", "8888", "9999", // the same digit four times
      "0786", "3786", "7860", // 786, alone or inside a number
      "1122", "7788", "8899", // repeated pairs
      "1234", "2345", "5678", "4321", "9876", "2468", // easy and reverse sequences
      "1212", "2020", "1001", "0770", "0550", "1221", // patterns and mirrors
      "2000", "1500", "0100", // round numbers
      "0007", "0021", "0099", "0001", // very low numbers
      "1311", "2220", // one digit three times
      "0108", "1008", "0143", // widely recognised numbers
    ];
    for (const n of fancy) expect(isFancy(n), n).toBe(true);
  });

  it("keeps ordinary numbers eligible, including ones that repeat a digit and ones that start with zero", () => {
    const ordinary = ["1427", "2634", "3518", "4126", "5203", "2655", "3118", "4833", "1990", "0427", "0714", "1407", "9253", "6048"];
    for (const n of ordinary) expect(isFancy(n), n).toBe(false);
  });

  it("reports which rule matched, in plain words", () => {
    expect(fancyReasons("7777")).toContain("Same digit four times");
    expect(fancyReasons("0770")).toContain("Mirror number");
    expect(fancyReasons("2000")).toContain("Round number");
    expect(fancyReasons("0007")).toContain("Very low number");
    expect(fancyReasons("2468")).toContain("Easy sequence");
    expect(fancyReasons("1122")).toContain("Repeated pairs");
    expect(fancyReasons("0786")).toContain("Widely recognised special number");
    expect(fancyReasons("1427")).toEqual([]);
  });

  it("the rules are data: each has an id, a label and an example, and the list can be replaced", () => {
    expect(FANCY_RULES.length).toBeGreaterThanOrEqual(8);
    for (const r of FANCY_RULES) { expect(r.id).toBeTruthy(); expect(r.label).toBeTruthy(); expect(r.description).toBeTruthy(); }
    expect(SPECIAL_NUMBERS).toContain("0786");
    expect(isFancy("7777", [])).toBe(false);
    // With no rules, a premium-style number can come back, which shows the rules are what keep them out.
    const open = recommend({ person: { birth: 5, lifePath: 4 }, dob: "1990-07-14", fancyRules: [], limit: 8 });
    expect(open.some((c) => isFancy(c.number))).toBe(true);
  });
});

describe("recommendations are ordinary, scored by the existing rule, and diverse", () => {
  it("no recommendation is a premium or fancy number, for every kind of person", () => {
    for (const { person, dob } of PEOPLE) {
      for (const c of recommend({ person, dob, limit: 60 })) {
        expect(isFancy(c.number), `${c.number} for ${dob}`).toBe(false);
        expect(c.number).not.toMatch(/^(\d)\1{3}$/);
      }
    }
  });

  it("returns five to eight numbers: four digits, leading zeros kept, never below 0100, never 0000", () => {
    for (const { person, dob } of PEOPLE) {
      const r = recommend({ person, dob });
      expect(r.length, dob).toBeGreaterThanOrEqual(5);
      expect(r.length, dob).toBeLessThanOrEqual(8);
      for (const c of r) { expect(c.number).toMatch(/^\d{4}$/); expect(Number(c.number)).toBeGreaterThanOrEqual(100); }
    }
    const all = new Set(PEOPLE.flatMap(({ person, dob }) => recommend({ person, dob, limit: 200 }).map((c) => c.number)));
    expect([...all].some((n) => n.startsWith("0"))).toBe(true); // ordinary numbers such as 0427 appear with their zero
  });

  it("every number is scored with exactly the rule used to check an existing number", () => {
    for (const { person, dob } of PEOPLE) {
      for (const c of recommend({ person, dob })) {
        expect(c.evaluation).toEqual(evaluateDigits(c.number));
        expect(c.compat).toEqual(compatibility(evaluateDigits(c.number)!, person));
        const sum = c.number.split("").reduce((a, d) => a + Number(d), 0);
        expect(c.evaluation.total).toBe(sum);
      }
    }
  });

  it("is ranked best first and compatibility is never given up for variety", () => {
    for (const { person, dob } of PEOPLE) {
      const r = recommend({ person, dob });
      const pts = r.map((c) => c.compat.points);
      expect(pts).toEqual([...pts].sort((x, y) => y - x));
      // No ordinary number of a higher score exists that the list skipped while a lower one was shown ... unless diversity rules forbade it:
      // the very best score on offer must be present.
      const best = Math.max(...recommend({ person, dob, limit: 400 }).map((c) => c.compat.points));
      expect(pts[0]).toBe(best);
    }
  });

  it("avoids repeating one digit total, and one numerology number, across the list", () => {
    for (const { person, dob } of PEOPLE) {
      const r = recommend({ person, dob });
      const totals = r.map((c) => c.evaluation.total);
      expect(new Set(totals).size, `totals for ${dob}: ${totals}`).toBe(totals.length);
      const roots = new Map<number, number>();
      for (const c of r) roots.set(c.evaluation.root, (roots.get(c.evaluation.root) ?? 0) + 1);
      expect(Math.max(...roots.values())).toBeLessThanOrEqual(3);
      const firstFive = new Map<number, number>();
      for (const c of r.slice(0, 5)) firstFive.set(c.evaluation.root, (firstFive.get(c.evaluation.root) ?? 0) + 1);
      expect(Math.max(...firstFive.values())).toBeLessThanOrEqual(2);
      expect(new Set(r.map((c) => c.evaluation.root)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it("is repeatable for one person and different between people", () => {
    const a = PEOPLE[0];
    expect(recommend(a).map((c) => c.number)).toEqual(recommend(a).map((c) => c.number));
    const lists = PEOPLE.map((p) => recommend(p).map((c) => c.number).join());
    expect(new Set(lists).size).toBe(PEOPLE.length);
  });

  it("uses a number from the date of birth only when it is an ordinary number", () => {
    expect(birthDateNumbers("1990-07-14")).toEqual(["0014", "1407", "0714", "1990"]);
    expect(isFancy("0014")).toBe(true); // very low, so never recommended
    expect(isFancy("1407")).toBe(false);
    // For someone whose Birth Number and Life Path are both 3, a number from their birth date (1407 and 0714 both total 12, which reads as 3) scores best.
    const r = recommend({ person: { birth: 3, lifePath: 3 }, dob: "1990-07-14" });
    expect(r.some((c) => c.source === "birth-date" && ["1407", "0714"].includes(c.number))).toBe(true);
    expect(r.some((c) => c.number === "0014")).toBe(false);
  });

  it("takes an ordinary preferred number, and explains why a premium-style one is not recommended", () => {
    const ok = recommendWithInfo({ person: { birth: 5, lifePath: 4 }, dob: "1990-07-14", preferred: "1427" });
    expect(ok.items.find((c) => c.number === "1427")?.source).toBe("preferred");
    expect(ok.preferredFancy).toEqual([]);
    const fancy = recommendWithInfo({ person: { birth: 5, lifePath: 4 }, dob: "1990-07-14", preferred: "7777", limit: 400 });
    expect(fancy.items.some((c) => c.number === "7777")).toBe(false);
    expect(fancy.preferredFancy).toContain("Same digit four times");
  });

  it("keeps to the preferred range, and says so when the range holds no ordinary number", () => {
    const r = recommendWithInfo({ person: { birth: 5, lifePath: 4 }, dob: "1990-07-14", range: { min: 2000, max: 2999 } });
    expect(r.rangeFallback).toBe(false);
    for (const c of r.items) { const n = Number(c.number); expect(n >= 2000 && n <= 2999).toBe(true); expect(isFancy(c.number)).toBe(false); }
    const none = recommendWithInfo({ person: { birth: 5, lifePath: 4 }, dob: "1990-07-14", range: { min: 1111, max: 1111 } });
    expect(none.rangeFallback).toBe(true);
    expect(none.items.length).toBeGreaterThanOrEqual(5);
  });

  it("never claims a number is available or will be allotted", () => {
    const json = JSON.stringify(recommend(PEOPLE[0])) + JSON.stringify(recommend(PEOPLE[0]).map((c) => explain(c.evaluation, c.compat)));
    expect(json).not.toMatch(/available|allot|guarantee|lucky number for sure/i);
  });

  it("checking an existing number is not affected: premium-style numbers can still be evaluated", () => {
    for (const n of ["7777", "0786", "1234", "0007", "2000"]) {
      const e = evaluateDigits(n);
      expect(e, n).not.toBeNull();
      expect(compatibility(e!, { birth: 5, lifePath: 4 }).lines).toHaveLength(2);
    }
    expect(parseRegistration("MH 12 AB 7777").ok).toBe(true);
  });
});
