import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { buildGrowthGuide } from "../growthGuide";
import KundaliGrowthGuide from "../KundaliGrowthGuide";
import type { KundaliResult } from "../types";
import knownJson from "../__fixtures__/kundali-known.json";
import unknownJson from "../__fixtures__/kundali-unknown.json";

// Real engine output: one chart with a birth time and one without (Moon sign uncertain, no Lagna, houses or Dasha).
const known = knownJson as unknown as KundaliResult;
const unknown = unknownJson as unknown as KundaliResult;
// The Moon changes sign on this birth date and there is no birth time: the Chandra Rashi is genuinely uncertain.
const moonUncertain: KundaliResult = {
  ...unknown,
  moon: { rashi: null, candidates: [{ sign: "Libra", name: "Tula", hindi: "x" }, { sign: "Scorpio", name: "Vrishchika", hindi: "x" }], certain: false, degreeInSign: null, nakshatra: null },
};
const sunOf = (k: KundaliResult) => (k.sun.rashi ?? k.sun.candidates[0]).sign;
const allText = (g: ReturnType<typeof buildGrowthGuide>) =>
  [...g.areas.flatMap((a) => [a.title, ...a.chart, ...a.strengths, ...a.improve, ...a.actions, a.basis]), ...g.plan.flatMap((p) => [p.label, p.text]), g.message, ...g.notices].join(" ");

describe("Personal Growth Guide: structure", () => {
  const g = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 11, name: "Asha Rao" });

  it("has the six areas, in order, each with strengths, things to improve and exactly three actions", () => {
    expect(g.areas.map((a) => a.title)).toEqual([
      "Personality & Self-Development", "Career & Professional Growth", "Love & Relationships",
      "Money & Financial Discipline", "Health & Well-being", "Spirituality & Inner Growth",
    ]);
    for (const a of g.areas) {
      expect(a.strengths.length, a.key).toBeGreaterThanOrEqual(1);
      expect(a.improve.length, a.key).toBeGreaterThanOrEqual(1);
      expect(a.actions, a.key).toHaveLength(3);
      expect(a.basis.length, a.key).toBeGreaterThan(10);
    }
  });

  it("does not repeat the same sentence across the six areas", () => {
    const lines = g.areas.flatMap((a) => [...a.strengths, ...a.improve, ...a.actions]);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("does not repeat the same advice: every action and every plan item is unique", () => {
    const actions = g.areas.flatMap((a) => a.actions);
    expect(new Set(actions).size).toBe(actions.length);
    expect(new Set(g.plan.map((p) => p.text)).size).toBe(g.plan.length);
  });

  it("has a 30-day plan of six items built from the actions generated for this person", () => {
    expect(g.plan.map((p) => p.label)).toEqual([
      "One daily habit", "One weekly goal", "One relationship improvement", "One career or learning goal", "One health habit", "One reflection practice",
    ]);
    const actions = new Set(g.areas.flatMap((a) => a.actions));
    for (const p of g.plan) expect(actions.has(p.text), p.label).toBe(true);
  });

  it("ends with a personal message that uses this person's own Rashi, Life Path and first action", () => {
    expect(g.message).toContain("Asha,");
    expect(g.message).toContain(`${known.moon.rashi!.name} Moon`);
    expect(g.message).toContain("Life Path 11");
    expect(g.message).toMatch(/Start with one good step today: /);
    expect(g.message).toMatch(/period/);
  });

  it("uses calculated chart facts when the birth time is known (houses, dignity, Dasha, Nakshatra)", () => {
    const career = g.areas.find((a) => a.key === "career")!;
    expect(career.chart.join(" ")).toMatch(/10th house/);
    expect(career.chart.join(" ")).toMatch(/Mahadasha/);
    expect(g.areas.find((a) => a.key === "love")!.chart.join(" ")).toMatch(/7th house/);
    expect(g.areas.find((a) => a.key === "money")!.chart.join(" ")).toMatch(/2nd and 11th/);
    expect(g.areas.find((a) => a.key === "spirit")!.chart.join(" ")).toMatch(/Janma Nakshatra/);
    expect(g.notices).toEqual([]);
  });
});

describe("Personal Growth Guide: personalisation", () => {
  it("gives different advice for different charts", () => {
    const a = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 11 });
    const b = buildGrowthGuide({ kundali: unknown, sunSign: sunOf(unknown), lifePath: 4 });
    const c = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 8 });
    expect(a.plan.map((p) => p.text)).not.toEqual(b.plan.map((p) => p.text));
    expect(a.message).not.toEqual(c.message); // same chart, different Life Path
    expect(a.areas[0].strengths.join()).not.toEqual(c.areas[0].strengths.join());
  });

  it("is repeatable: the same reading always gives the same guide", () => {
    const x = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 7 });
    const y = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 7 });
    expect(y).toEqual(x);
  });

  it("every Life Path the page can produce (1-9, 11, 22, 33) gives a complete guide", () => {
    for (const lp of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      const g = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: lp });
      expect(g.areas.every((a) => a.actions.length === 3), String(lp)).toBe(true);
      expect(g.message, String(lp)).toContain(`Life Path ${lp}`);
    }
  });
});

describe("Personal Growth Guide: missing birth time", () => {
  const g = buildGrowthGuide({ kundali: moonUncertain, sunSign: sunOf(moonUncertain), lifePath: 4 });

  it("says what it did not use, and leans on the confirmed Surya Rashi and Life Path", () => {
    expect(g.notices.join(" ")).toMatch(/did not enter a birth time/);
    expect(g.message).toContain("Sun (Surya Rashi)");
    expect(g.message).not.toContain("Moon (Chandra Rashi)");
  });

  it("invents no Lagna, houses, Dasha, Nakshatra pada or Moon sign", () => {
    const text = allText(g);
    expect(text).not.toMatch(/Lagna|Mahadasha|Antardasha|\b\d+(st|nd|rd|th) house|pada/);
    expect(text).not.toContain("Moon (Chandra Rashi)");
    for (const a of g.areas) expect(a.chart.join(" "), a.key).not.toMatch(/house|Dasha|Nakshatra/);
    for (const a of g.areas) expect(a.basis, a.key).not.toMatch(/10th house|7th house|2nd and 11th|Dasha/);
  });

  it("with no birth time but a Moon sign that does not change that day, it may use the Moon sign, still with no houses or Dasha", () => {
    const h = buildGrowthGuide({ kundali: unknown, sunSign: sunOf(unknown), lifePath: 4 });
    expect(h.notices.join(" ")).toMatch(/did not enter a birth time/);
    expect(allText(h)).not.toMatch(/Lagna|Mahadasha|Antardasha|d+(st|nd|rd|th) house|pada/);
  });

  it("still gives complete, practical advice for all six areas", () => {
    for (const a of g.areas) expect(a.actions).toHaveLength(3);
    expect(g.plan).toHaveLength(6);
  });
});

describe("Personal Growth Guide: safe wording", () => {
  it("makes no guarantees, diagnoses, fear or fixed predictions", () => {
    for (const [k, lp] of [[known, 11], [unknown, 4], [known, 22]] as const) {
      const text = allText(buildGrowthGuide({ kundali: k, sunSign: sunOf(k), lifePath: lp }));
      expect(text).not.toMatch(/guarantee|diagnos|\bcure\b|disease|illness will|will (become|get|marry|earn|be rich)|doomed|curse|danger|bad luck|inauspicious|you must|you will certainly|definitely/i);
    }
  });

  it("states that health, money, love and career advice is general and not a prediction", () => {
    const g = buildGrowthGuide({ kundali: known, sunSign: sunOf(known), lifePath: 3 });
    expect(g.areas.find((a) => a.key === "health")!.basis).toMatch(/not a medical/);
    expect(g.areas.find((a) => a.key === "money")!.basis).toMatch(/does not promise wealth/);
    expect(g.areas.find((a) => a.key === "love")!.basis).toMatch(/does not predict a partner or a marriage date/);
    expect(g.areas.find((a) => a.key === "career")!.basis).toMatch(/does not decide your profession/);
  });
});

describe("Personal Growth Guide: display", () => {
  it("shows six cards with Strengths / Areas to Improve / What You Can Do, the 30-day plan and the final message", () => {
    render(<KundaliGrowthGuide k={known} sunSign={sunOf(known)} lifePath={11} name="Asha Rao" />);
    expect(screen.getByRole("heading", { level: 2, name: "Your Personal Growth Guide" })).toBeInTheDocument();
    expect(screen.getByText(/Understand your strengths, work on your challenges/)).toBeInTheDocument();
    for (const key of ["personality", "career", "love", "money", "health", "spirit"]) {
      const card = screen.getByTestId(`growth-${key}`);
      expect(within(card).getByText("Your Strengths")).toBeInTheDocument();
      expect(within(card).getByText("Areas to Improve")).toBeInTheDocument();
      expect(within(card).getByText("What You Can Do")).toBeInTheDocument();
      expect(within(card).getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
    }
    expect(within(screen.getByTestId("growth-career")).getByText("From your chart")).toBeInTheDocument();
    expect(within(screen.getByTestId("growth-health")).queryByText("From your chart")).toBeNull();
    expect(within(screen.getByTestId("growth-plan")).getByRole("heading", { name: "Your Next 30 Days" })).toBeInTheDocument();
    expect(within(screen.getByTestId("growth-plan")).getAllByRole("listitem")).toHaveLength(6);
    expect(within(screen.getByTestId("growth-message")).getByRole("heading", { name: "A Message for Your Journey" })).toBeInTheDocument();
    expect(screen.queryByTestId("growth-notices")).toBeNull();
  });

  it("without a birth time it shows the notice and no chart-fact boxes that need one", () => {
    render(<KundaliGrowthGuide k={moonUncertain} sunSign={sunOf(moonUncertain)} lifePath={4} />);
    expect(screen.getByTestId("growth-notices")).toHaveTextContent(/did not enter a birth time/);
    expect(screen.queryByTestId("growth-career-chart")).toBeNull();
    expect(screen.queryByTestId("growth-love-chart")).toBeNull();
  });
});
