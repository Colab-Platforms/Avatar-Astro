import { describe, it, expect } from "vitest";
import { numberInsight, NUMBER_THEMES } from "@/lib/numerology";

describe("numberInsight", () => {
  it("re-presents the fixed traditional theme: keywords become strengths, the shadow clause becomes the challenge", () => {
    const i = numberInsight(4);
    expect(i.strengths).toEqual(["Structure", "Discipline", "Practicality"]);
    expect(i.challenge).toBe("The shadow side is rigidity or resisting change.");
    expect(i.meaning).toBe("Traditionally linked with building steadily, reliability and attention to detail.");
    expect(i.tip.length).toBeGreaterThan(20);
  });
  it("covers every number the engine can produce, including master numbers, without inventing text", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      const i = numberInsight(n);
      expect(i.meaning.length).toBeGreaterThan(10);
      expect(i.strengths.length).toBeGreaterThan(0);
      expect(NUMBER_THEMES[n].text).toContain(i.meaning);
    }
  });
  it("a master number gets the tip of its root digit", () => {
    expect(numberInsight(11).tip).toBe(numberInsight(2).tip);
  });
});
