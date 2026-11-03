import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import KundaliPanels from "../KundaliPanels";
import KundaliGuide from "../KundaliGuide";
import GunaMilanPanel from "../GunaMilanPanel";
import { kundaliApi } from "../api";
import { findTerms, getTerm, GLOSSARY } from "@/lib/astroGlossary";
import type { KundaliResult, MatchResult } from "../types";
import type { PanchangDetails } from "@/features/ratna/types";
import knownJson from "../__fixtures__/kundali-known.json";
import unknownJson from "../__fixtures__/kundali-unknown.json";
import matchJson from "../__fixtures__/match.json";

// Coverage audit: every glossary term that appears in the visible text of a result must have an in-place "What does X mean?"
// button somewhere in that same view (the first-appearance rule). The audit renders the real components.

const rashi = (sign: string, name: string, hindi = "x") => ({ sign, name, hindi });
const panchang = {
  convention: { id: "a", label: "Amanta months", note: "" }, basis: "birth-time", reckonedAtUtc: "", vikramSamvat: 2082,
  masa: { name: "Chaitra", hindi: "x", adhika: false }, purnimantaMasa: { name: "Chaitra", hindi: "x", adhika: false }, paksha: "shukla",
  tithi: { number: 9, numberInPaksha: 9, name: "Navami", hindi: "x", startLocal: "a", endLocal: "b", startUtc: "", endUtc: "" },
  nakshatra: { name: "Ashlesha", pada: 2, lord: "Mercury" }, moonRashi: "Cancer", yoga: "Shula", karana: "Taitila", vara: { name: "Sunday", note: null },
  sunrise: "06:00", sunset: "18:40", uncertain: false, uncertainties: [], notes: [],
} as unknown as PanchangDetails;
const grahas = [
  ["Sun", "Pisces", 11], ["Moon", "Cancer", 2], ["Mars", "Capricorn", 8], ["Mercury", "Aries", 10], ["Jupiter", "Capricorn", 8],
  ["Venus", "Pisces", 11], ["Saturn", "Libra", 5], ["Rahu", "Taurus", 12], ["Ketu", "Scorpio", 6],
] as const;
const chart: KundaliResult = {
  birth: { dateOfBirth: "1990-05-15", timeOfBirth: "10:30", place: "Pune", timeZone: "Asia/Kolkata", latitude: 18.5, longitude: 73.8, resolvedInstantUtc: null, utcOffsetMinutes: 330 },
  method: { zodiac: "sidereal", ayanamsa: "Lahiri", ayanamsaDegrees: 23.7, houses: "whole-sign", nodes: "mean", engine: "x" },
  sun: { rashi: rashi("Aries", "Mesha"), candidates: [], certain: true, degreeInSign: 1, nakshatra: null },
  moon: { rashi: rashi("Sagittarius", "Dhanu"), candidates: [], certain: true, degreeInSign: 5, nakshatra: { name: "Uttara Ashadha", pada: 1, lord: "Sun" } },
  lagna: { rashi: rashi("Cancer", "Karka"), degreeInSign: 3.1, nakshatra: { name: "Punarvasu", pada: 4, lord: "Jupiter" } },
  planets: grahas.map(([planet, sign, house]) => ({ planet, rashi: rashi(sign, sign), degreeInSign: 5, house, nakshatra: "x", pada: 1 })),
  navamsa: { lagna: rashi("Leo", "Simha"), planets: grahas.map(([planet, , house]) => ({ planet, rashi: rashi("Leo", "Simha"), house })) },
  stableSigns: [],
  dasha: { asOf: "2026-11-02", moonNakshatra: "Uttara Ashadha", mahadasha: { lord: "Venus", start: "2020-01-01", end: "2040-01-01" }, antardasha: { lord: "Saturn", start: "2026-01-01", end: "2028-01-01" } },
  panchang, timeKnown: true, limitations: ["Rahu and Ketu are the mean lunar nodes."], basis: ["Sidereal (Nirayana) zodiac with the Lahiri ayanamsa."],
};

/** Terms visible in `container` text that lack an explainer button in the same container. */
const unexplained = (container: HTMLElement): string[] => {
  // the (i) glyph of each explainer button is not result text: drop it so "Maitri" + "i" does not read as "Maitrii"
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("button").forEach((b) => b.remove());
  // join text nodes with spaces so neighbouring table cells ("Maitri" and "0 / 5") never fuse into one word
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  const text = parts.join(" ");
  const explained = new Set(
    Array.from(container.querySelectorAll("button[aria-label^='What does ']")).map((b) => (b.getAttribute("aria-label") ?? "").replace(/^What does (.*) mean\?$/, "$1")),
  );
  // Lagna lord etc. are explained when their own button exists; generic words are never matched by findTerms.
  return findTerms(text).filter((t) => !explained.has(t));
};

const expectCovered = (container: HTMLElement) => {
  const u = unexplained(container);
  if (u.length) console.log("MISSING>>", u.join(" | "));
  expect(u).toEqual([]);
};

describe("every technical term in a result has an in-place explanation", () => {
  it("Janma Kundali: calculation panels", () => {
    const { container } = render(<KundaliPanels k={chart} />);
    { const u = unexplained(container); if (u.length) console.log("MISSING>>", u.join(" | ")); expect(u).toEqual([]); }
  });

  it("Janma Kundali: plain-words guide (all sections)", () => {
    const { container } = render(<KundaliGuide k={chart} />);
    // the "Terms explained simply" list is collapsed text of definitions, not result text: it is excluded
    container.querySelector("[data-testid='kundali-terms']")?.remove();
    { const u = unexplained(container); if (u.length) console.log("MISSING>>", u.join(" | ")); expect(u).toEqual([]); }
  });

  it("Jodi Jyotish: Guna Milan result", async () => {
    const kootas = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"].map((koota, i) => ({ koota, max: [1, 2, 3, 4, 5, 6, 7, 8][i], score: i % 3 ? 0 : [1, 2, 3, 4, 5, 6, 7, 8][i], a: "x", b: "y", note: "Moon signs differ." }));
    const res = {
      a: chart, b: chart,
      ashtakoota: {
        total: 20, max: 36, kootas, band: "Acceptable (18 to 24)", method: ["Scored from each person's Moon sign and Nakshatra."],
        doshas: [{ name: "Nadi Dosha", present: true, cancelled: false, note: "Both share the same Nadi." }, { name: "Bhakoot Dosha", present: false, cancelled: false, note: "Not present." }],
        moons: { a: { sign: "Leo", nakshatra: "Magha", pada: 1 }, b: { sign: "Aries", nakshatra: "Bharani", pada: 2 } },
      },
      mangal: { a: { present: true, marsHouse: 8, note: "Mars is in house 8 from the Lagna." }, b: { present: false, marsHouse: 3, note: "Mars is in house 3 from the Lagna." }, verdict: "Only one chart shows Mangal Dosha." },
    } as unknown as MatchResult;
    vi.spyOn(kundaliApi, "match").mockResolvedValue(res);
    const place = { id: "1", name: "Delhi", admin1: null, country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", label: "Delhi" };
    const people = [
      { name: "Ravi", gender: "Male", day: "22", month: "11", year: "1991", time: "10:30", place },
      { name: "Asha", gender: "Female", day: "15", month: "8", year: "1992", time: "18:15", place },
    ] as never;
    const { container } = render(<GunaMilanPanel people={people} onAddDetails={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("guna-result")).toBeInTheDocument());
    { const u = unexplained(container); if (u.length) console.log("MISSING>>", u.join(" | ")); expect(u).toEqual([]); }
  });

  it("Jodi Jyotish: the 'no details' state also explains its terms", () => {
    const people = [
      { name: "Ravi", gender: "Male", day: "22", month: "11", year: "1991", time: "", place: null },
      { name: "Asha", gender: "Female", day: "15", month: "8", year: "1992", time: "", place: null },
    ] as never;
    const { container } = render(<GunaMilanPanel people={people} onAddDetails={() => {}} />);
    { const u = unexplained(container); if (u.length) console.log("MISSING>>", u.join(" | ")); expect(u).toEqual([]); }
  });
});

describe("real server output (generated by the backend engine) has an explanation for every technical term", () => {
  const known = knownJson as unknown as KundaliResult;
  const unknown = unknownJson as unknown as KundaliResult;
  const place = { id: "1", name: "Delhi", admin1: null, country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", label: "Delhi" };
  const people = [
    { name: "Ravi", gender: "Male", day: "22", month: "11", year: "1991", time: "18:15", place },
    { name: "Asha", gender: "Female", day: "15", month: "8", year: "1992", time: "10:30", place },
  ] as never;

  it("Kundali panels, known birth time", () => {
    const { container } = render(<KundaliPanels k={known} />);
    expectCovered(container);
  });
  it("Kundali panels, unknown birth time", () => {
    const { container } = render(<KundaliPanels k={unknown} />);
    expectCovered(container);
  });
  it("Kundali guide, known and unknown birth time", () => {
    for (const k of [known, unknown]) {
      const { container, unmount } = render(<KundaliGuide k={k} />);
      container.querySelector("[data-testid='kundali-terms']")?.remove();
      expectCovered(container);
      unmount();
    }
  });
  it("Guna Milan with a real engine result", async () => {
    vi.spyOn(kundaliApi, "match").mockResolvedValue(matchJson as unknown as MatchResult);
    const { container } = render(<GunaMilanPanel people={people} onAddDetails={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("guna-result")).toBeInTheDocument());
    container.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    expectCovered(container);
  });
});

describe("glossary quality", () => {
  it("every entry has a plain meaning, and the Koota entry explains the eight factors and 36 points", () => {
    for (const e of GLOSSARY) {
      expect(e.meaning.length, e.term).toBeGreaterThan(20);
      expect(e.short.length, e.term).toBeGreaterThan(5);
    }
    const k = getTerm("Koota")!;
    expect(k.meaning).toMatch(/eight Kootas/);
    expect(k.meaning).toMatch(/36/);
    expect(getTerm("Kootas")?.term).toBe("Koota");
  });

  it("the Koota explainer opens in place from the score table", async () => {
    const kootas = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"].map((koota, i) => ({ koota, max: i + 1, score: 1, a: "x", b: "y", note: "n" }));
    vi.spyOn(kundaliApi, "match").mockResolvedValue({ a: chart, b: chart, ashtakoota: { total: 1, max: 36, kootas, band: "b", method: [], doshas: [], moons: { a: { sign: "Leo", nakshatra: "M", pada: 1 }, b: { sign: "Leo", nakshatra: "M", pada: 1 } } }, mangal: { a: { present: false, marsHouse: 1, note: "" }, b: { present: false, marsHouse: 1, note: "" }, verdict: "" } } as unknown as MatchResult);
    const place = { id: "1", name: "Delhi", admin1: null, country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", label: "Delhi" };
    const p = (name: string) => ({ name, gender: "", day: "1", month: "1", year: "1990", time: "10:00", place });
    render(<GunaMilanPanel people={[p("A"), p("B")] as never} onAddDetails={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("guna-table")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /what does koota mean/i })[0]);
    expect(screen.getByTestId("term-info-koota")).toHaveTextContent(/factor or group/);
  });
});
