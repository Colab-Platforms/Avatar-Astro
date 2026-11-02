import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { buildKundaliGuide } from "../kundaliInsights";
import KundaliGuide from "../KundaliGuide";
import type { KundaliResult } from "../types";

// Shaped like the server's real output (Pune, 15 May 1990 10:30 IST): Karka Lagna, Dhanu Moon, Venus exalted in Meena, Saturn in Makara.
const rashi = (sign: string, name: string, hindi = "x") => ({ sign, name, hindi });
const chart = (over: Partial<KundaliResult> = {}): KundaliResult => ({
  birth: { dateOfBirth: "1990-05-15", timeOfBirth: "10:30", place: "Pune", timeZone: "Asia/Kolkata", latitude: 18.5, longitude: 73.8, resolvedInstantUtc: null, utcOffsetMinutes: 330 },
  method: { zodiac: "sidereal", ayanamsa: "Lahiri", ayanamsaDegrees: 23.7, houses: "whole-sign", nodes: "mean", engine: "x" },
  sun: { rashi: rashi("Aries", "Mesha"), candidates: [], certain: true, degreeInSign: 1, nakshatra: null },
  moon: { rashi: rashi("Sagittarius", "Dhanu"), candidates: [], certain: true, degreeInSign: 5, nakshatra: { name: "Uttara Ashadha", pada: 1, lord: "Sun" } },
  lagna: { rashi: rashi("Cancer", "Karka"), degreeInSign: 3.1, nakshatra: { name: "Punarvasu", pada: 4, lord: "Jupiter" } },
  planets: [
    { planet: "Moon", rashi: rashi("Sagittarius", "Dhanu"), degreeInSign: 5, house: 6, nakshatra: "Uttara Ashadha", pada: 1 },
    { planet: "Mars", rashi: rashi("Aquarius", "Kumbha"), degreeInSign: 5, house: 8, nakshatra: "x", pada: 1 },
    { planet: "Mercury", rashi: rashi("Aries", "Mesha"), degreeInSign: 5, house: 10, nakshatra: "x", pada: 1 },
    { planet: "Venus", rashi: rashi("Pisces", "Meena"), degreeInSign: 5, house: 9, nakshatra: "x", pada: 1 },
    { planet: "Saturn", rashi: rashi("Capricorn", "Makara"), degreeInSign: 5, house: 7, nakshatra: "x", pada: 1 },
    { planet: "Jupiter", rashi: rashi("Capricorn", "Makara"), degreeInSign: 5, house: 7, nakshatra: "x", pada: 1 },
  ],
  stableSigns: [],
  dasha: { asOf: "2026-11-02", moonNakshatra: "Uttara Ashadha", mahadasha: { lord: "Venus", start: "2020-01-01", end: "2040-01-01" }, antardasha: { lord: "Saturn", start: "2026-01-01", end: "2028-01-01" } },
  panchang: {} as never,
  timeKnown: true, limitations: [], basis: [],
  ...over,
});

describe("Kundali guide", () => {
  it("derives houses and lords from the calculated Lagna (Karka: 10th = Mesha ruled by Mars, 7th = Makara ruled by Saturn)", () => {
    const g = buildKundaliGuide(chart());
    expect(g.houses).toBe(true);
    expect(g.career[0].fact).toMatch(/Falls in Aries; Mercury sits there/);
    expect(g.career[1].fact).toMatch(/Mars rules it and is placed in Kumbha in your 8th house/);
    expect(g.relationships[0].fact).toMatch(/Falls in Capricorn/);
    expect(g.relationships[1].fact).toMatch(/Saturn rules it/);
    expect(g.personality[1].fact).toMatch(/Moon rules your Lagna and sits in Dhanu in your 6th house/);
  });

  it("flags dignity only where the classical rule applies: Venus exalted in Pisces, Saturn and Jupiter in own/weak signs", () => {
    const g = buildKundaliGuide(chart());
    expect(g.strengths.map((s) => s.title)).toEqual(expect.arrayContaining(["Venus is exalted (Uchcha)", "Saturn is in its own sign (Swakshetra)"]));
    expect(g.challenges.map((s) => s.title)).toEqual(["Jupiter is in its weaker sign (Neecha)"]); // Jupiter debilitated in Capricorn
    expect(g.strengths.find((s) => s.title.startsWith("Mercury"))).toBeUndefined();
  });

  it("reads the running Dasha from the chart and never predicts events", () => {
    const g = buildKundaliGuide(chart());
    expect(g.important[0].fact).toMatch(/Venus Mahadasha \(2020-01-01 to 2040-01-01\) with Saturn Antardasha/);
    expect(g.important[0].meaning).toMatch(/not fixed events/);
  });

  it("without a birth time there is no Lagna, houses, career or relationship text, and the guide says why", () => {
    const g = buildKundaliGuide(chart({ lagna: null, planets: null, timeKnown: false, dasha: null }));
    expect(g.houses).toBe(false);
    expect(g.career).toEqual([]);
    expect(g.relationships).toEqual([]);
    expect(g.notes.join(" ")).toMatch(/need your exact birth time/);
    expect(g.personality.length).toBe(1); // the Moon sign is still shown
  });

  it("an uncertain Moon sign is stated as uncertain, not guessed", () => {
    const g = buildKundaliGuide(chart({ lagna: null, planets: null, moon: { rashi: null, candidates: [rashi("Sagittarius", "Dhanu"), rashi("Capricorn", "Makara")], certain: false, degreeInSign: null, nakshatra: null } }));
    expect(g.personality).toEqual([]);
    expect(g.notes.join(" ")).toMatch(/Dhanu or Makara/);
  });

  it("renders sections in order, each point with a calculated part and a traditional part", () => {
    render(<KundaliGuide k={chart()} />);
    const ids = ["kundali-personality", "kundali-career", "kundali-relationships", "kundali-strengths", "kundali-challenges", "kundali-important"];
    const els = ids.map((i) => screen.getByTestId(i));
    els.forEach((e, i) => { if (i) expect(els[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); });
    expect(within(screen.getByTestId("kundali-career")).getAllByText("In your chart").length).toBe(3);
    expect(within(screen.getByTestId("kundali-career")).getAllByText("Traditionally").length).toBe(3);
    expect(screen.getByTestId("kundali-terms")).toHaveTextContent("Chandra Rashi");
  });
});
