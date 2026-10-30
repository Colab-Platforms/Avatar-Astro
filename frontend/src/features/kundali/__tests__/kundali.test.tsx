import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import KundaliPanels from "../KundaliPanels";
import type { KundaliResult } from "../types";
import type { PanchangDetails } from "@/features/ratna/types";

const panchang: PanchangDetails = {
  convention: { id: "amanta-chaitradi", label: "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal", note: "" },
  basis: "birth-time",
  reckonedAtUtc: "2025-04-06T07:00:00.000Z",
  vikramSamvat: 2082,
  masa: { name: "Chaitra", hindi: "चैत्र", adhika: false },
  purnimantaMasa: { name: "Chaitra", hindi: "चैत्र", adhika: false },
  paksha: "shukla",
  tithi: { number: 9, numberInPaksha: 9, name: "Navami", hindi: "नवमी", startLocal: "Sat, 5 Apr 2025, 19:26", endLocal: "Sun, 6 Apr 2025, 19:22", startUtc: "", endUtc: "" },
  nakshatra: { name: "Ashlesha", pada: 2, lord: "Mercury" },
  moonRashi: "Cancer",
  yoga: "Shula",
  karana: "Taitila",
  vara: { name: "Sunday", note: null },
  sunrise: "06:00",
  sunset: "18:40",
  uncertain: false,
  uncertainties: [],
  notes: [],
};

const rashi = (sign: string, name: string, hindi: string) => ({ sign, name, hindi });

const known: KundaliResult = {
  birth: { dateOfBirth: "2025-04-06", timeOfBirth: "12:30", place: "New Delhi", timeZone: "Asia/Kolkata", latitude: 28.6, longitude: 77.2, resolvedInstantUtc: "2025-04-06T07:00:00.000Z", utcOffsetMinutes: 330 },
  method: { zodiac: "Sidereal (Nirayana)", ayanamsa: "Lahiri", ayanamsaDegrees: 24.2, houses: "Whole sign", nodes: "Mean", engine: "ephemeris" },
  sun: { rashi: rashi("Pisces", "Meena", "मीन"), candidates: [rashi("Pisces", "Meena", "मीन")], certain: true, degreeInSign: 22.5, nakshatra: { name: "Revati", pada: 1, lord: "Mercury" } },
  moon: { rashi: rashi("Cancer", "Karka", "कर्क"), candidates: [rashi("Cancer", "Karka", "कर्क")], certain: true, degreeInSign: 14.2, nakshatra: { name: "Ashlesha", pada: 2, lord: "Mercury" } },
  lagna: { rashi: rashi("Gemini", "Mithuna", "मिथुन"), degreeInSign: 3.1, nakshatra: { name: "Mrigashira", pada: 3, lord: "Mars" } },
  planets: [{ planet: "Sun", rashi: rashi("Pisces", "Meena", "मीन"), degreeInSign: 22.5, house: 11, nakshatra: "Revati", pada: 1 }],
  stableSigns: [],
  dasha: { asOf: "2026-10-30", moonNakshatra: "Ashlesha", mahadasha: { lord: "Mercury", start: "", end: "" }, antardasha: { lord: "Venus", start: "", end: "" } },
  panchang,
  timeKnown: true,
  limitations: ["Rahu and Ketu are the mean lunar nodes."],
  basis: ["Sidereal (Nirayana) zodiac with the Lahiri ayanamsa."],
};

const unknown: KundaliResult = {
  ...known,
  birth: { ...known.birth, timeOfBirth: null, resolvedInstantUtc: null, utcOffsetMinutes: null },
  sun: { rashi: rashi("Pisces", "Meena", "मीन"), candidates: [rashi("Pisces", "Meena", "मीन")], certain: true, degreeInSign: null, nakshatra: null },
  moon: { rashi: null, candidates: [rashi("Cancer", "Karka", "कर्क"), rashi("Leo", "Simha", "सिंह")], certain: false, degreeInSign: null, nakshatra: null },
  lagna: null,
  planets: null,
  dasha: null,
  timeKnown: false,
  stableSigns: [{ planet: "Jupiter", rashi: rashi("Gemini", "Mithuna", "मिथुन") }],
  panchang: { ...panchang, basis: "sunrise", uncertain: true, uncertainties: ["Moon Rashi changes during this date (Cancer to Leo); the exact value needs your birth time."] },
  limitations: ["Without an exact birth time the Lagna (ascendant), the twelve houses and planetary house placements are not calculated, and none is assumed."],
};

describe("Janma Kundali panels", () => {
  it("shows the Vedic Rashis, Nakshatra, Lagna, grahas, dasha and Panchang from the calculation", () => {
    render(<KundaliPanels k={known} />);
    expect(screen.getByTestId("surya-rashi")).toHaveTextContent("Meena");
    expect(screen.getByTestId("chandra-rashi")).toHaveTextContent("Karka (कर्क)");
    expect(screen.getByTestId("janma-nakshatra")).toHaveTextContent("Ashlesha, pada 2");
    expect(screen.getByTestId("lagna")).toHaveTextContent("Mithuna");
    const p = screen.getByTestId("kundali-panchang");
    expect(within(p).getByText("2082")).toBeInTheDocument();
    expect(within(p).getByText(/Navami/)).toBeInTheDocument();
    expect(screen.getByTestId("kundali-planets")).toHaveTextContent("Mercury Mahadasha");
    expect(screen.queryByTestId("kundali-panchang-uncertain")).toBeNull();
  });

  it("does not invent a Lagna, houses or a single Moon sign when the birth time is unknown", () => {
    render(<KundaliPanels k={unknown} />);
    expect(screen.getByTestId("lagna")).toHaveTextContent("Not calculated");
    expect(screen.queryByTestId("kundali-planets")).toBeNull();
    const moon = screen.getByTestId("chandra-rashi");
    expect(moon).toHaveTextContent("Karka (Cancer) or Simha (Leo)");
    expect(moon).toHaveTextContent(/birth time decides/);
    expect(screen.getByTestId("janma-nakshatra")).toHaveTextContent("Needs your exact birth time");
    expect(screen.getByTestId("kundali-panchang-uncertain")).toHaveTextContent("Moon Rashi changes");
    expect(screen.getByTestId("kundali-basis")).toHaveTextContent(/none is assumed/);
  });
});

describe("Janma Kundali page source", () => {
  const src = readFileSync(join(__dirname, "..", "..", "..", "pages", "BirthChart.tsx"), "utf8");
  const results = src.slice(src.indexOf("const resultsCss=`"), src.indexOf("function BcDivider"));

  it("has no white or near-white text left on the beige results page", () => {
    expect(results).not.toMatch(/rgba\(255,\s?255,\s?255/);
    expect(results.toLowerCase()).not.toContain("#f8f8f8");
  });

  it("calls the Vedic backend instead of the Western date lookup", () => {
    const generate = src.slice(src.lastIndexOf("const generate=useCallback"), src.lastIndexOf("return(\n    <div className=\"bc-app\">"));
    expect(generate).toContain("kundaliApi.calculate");
    expect(generate).not.toContain("getZodiac(");
    expect(generate).toContain("timezone");
  });
});
