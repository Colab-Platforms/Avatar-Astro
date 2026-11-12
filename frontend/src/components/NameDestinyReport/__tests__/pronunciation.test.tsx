import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CelebrityCarousel from "../sections/CelebrityCarousel";
import RecommendedSpellings from "../sections/RecommendedSpellings";
import NameDestinyReportPage from "@/pages/NameDestinyReportPage";
import { CELEBRITY_NAME_CHANGES } from "../lib/celebrityData";
import { comparePronunciation, pronunciationOf, syllables } from "@/lib/namePronunciation";
import { candidateSpellings, isReadable } from "@/lib/nameSpelling";
import { buildProfile, type NameProfile } from "@/lib/numerology";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("syllables and pronunciation", () => {
  it("splits common names sensibly", () => {
    expect(syllables("Komal")).toEqual(["ko", "mal"]);
    expect(syllables("Sonar")).toEqual(["so", "nar"]);
    expect(syllables("Sonaar")).toEqual(["so", "naar"]);
    expect(syllables("Triptii")).toEqual(["trip", "tii"]);
    expect(syllables("Ayushmann")).toEqual(["ayush", "mann"]);
    expect(syllables("Shivani")).toEqual(["shi", "va", "ni"]);
  });
  it("respells only the clear cases", () => {
    expect(pronunciationOf("Sonaar").respelling).toBe("so-nahr");
    expect(pronunciationOf("Komal Sonar")).toEqual({ breakdown: "ko-mal  ·  so-nar", respelling: "ko-mal  ·  so-nar" });
  });
  it("says when the sound is unchanged and when it may change", () => {
    expect(comparePronunciation("Tripti Dimri", "Triptii Dimri").same).toBe(true);
    expect(comparePronunciation("Ekta Kapoor", "Ektaa Kapoor").same).toBe(true);
    expect(comparePronunciation("Rohan", "Rohit").same).toBe(false);
    expect(comparePronunciation("Rohan", "Rohit").text).toMatch(/may sound slightly different/);
  });
});

describe("readable candidates", () => {
  it("rejects tripled letters, odd doubles and unpronounceable runs", () => {
    expect(isReadable("Komaal")).toBe(true);
    expect(isReadable("Komaaal")).toBe(false);
    expect(isReadable("Kohmal")).toBe(true);
    expect(isReadable("Kommal")).toBe(true);
    expect(isReadable("Kwwal")).toBe(false);
    expect(isReadable("Rhhan")).toBe(false);
    expect(isReadable("Krzstn")).toBe(false);
  });
  it("keeps every other word as typed and returns only readable names", () => {
    const c = candidateSpellings("Komal Sonar");
    expect(c.length).toBeGreaterThan(0);
    for (const x of c) {
      const [a, b] = x.split(" ");
      expect(a === "Komal" || b === "Sonar").toBe(true); // one word at a time
      expect(isReadable(a) && isReadable(b)).toBe(true);
    }
    expect(c).toContain("Komal Sonnar");
  });
});

describe("recommendations section", () => {
  const profile = buildProfile("Vini Sonar", "1996-05-22") as NameProfile;

  it("generates cards from the submitted name with number, pronunciation, syllables, why and what changed", () => {
    render(<RecommendedSpellings profile={profile} />);
    expect(screen.getByRole("heading", { name: "Your Recommended Name Spellings" })).toBeInTheDocument();
    expect(screen.getByText("Discover spelling variations that align with your numerology profile.")).toBeInTheDocument();
    const cards = screen.getAllByTestId("recommendation");
    expect(cards).toHaveLength(3); // best three first
    for (const card of cards) {
      expect(within(card).getByTestId("recommendation-name").textContent).toMatch(/^[^ ]+ [^ ]+$/);
      expect(within(card).getByTestId("recommendation-number")).toHaveTextContent(/^[0-9]$/);
      expect(within(card).getByText("Pronunciation")).toBeInTheDocument();
      expect(within(card).getByText("Syllables")).toBeInTheDocument();
      expect(within(card).getByText("Why This Spelling?")).toBeInTheDocument();
      expect(within(card).getByText("What Changed?")).toBeInTheDocument();
      expect(within(card).getByTestId("recommendation-change").textContent).toMatch(/Adds|Removes|Replaces/);
      expect(within(card).getByTestId("recommendation-pronunciation")).toHaveTextContent(/pronunciation|sound/i);
      expect(within(card).getByText("Show the calculation")).toBeInTheDocument();
    }
    expect(within(cards[0]).getByText("Best match")).toBeInTheDocument();
    expect(screen.getByText(/not guarantees/)).toBeInTheDocument();
  });

  it("View More Suggestions reveals the rest and collapses again", () => {
    render(<RecommendedSpellings profile={profile} />);
    const btn = screen.getByRole("button", { name: /View More Suggestions/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(screen.getAllByTestId("recommendation").length).toBeGreaterThan(3);
    fireEvent.click(screen.getByRole("button", { name: /Show Fewer/ }));
    expect(screen.getAllByTestId("recommendation")).toHaveLength(3);
  });

  it("has no input, no old empty-state message and no 'try your own' section", () => {
    const { container } = render(<RecommendedSpellings profile={profile} />);
    expect(container.querySelector("input")).toBeNull();
    expect(container.textContent).not.toMatch(/Try your own|Spelling to compare|same spelling|No small spelling change|Calculated suggestions/i);
  });

  it("different submitted names give different recommendations", () => {
    const other = buildProfile("Asha Rao", "1996-05-22") as NameProfile;
    const names = (p: NameProfile) => { const { unmount } = render(<RecommendedSpellings profile={p} />); const t = screen.getAllByTestId("recommendation-name").map((e) => e.textContent); unmount(); return t; };
    expect(names(profile)).not.toEqual(names(other));
  });

  it("shows a Listen button only when the browser can speak", () => {
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    const { unmount } = render(<RecommendedSpellings profile={profile} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Listen/ })[0]);
    expect((window as unknown as { speechSynthesis: { speak: ReturnType<typeof vi.fn> } }).speechSynthesis.speak).toHaveBeenCalled();
    unmount();
    vi.unstubAllGlobals();
    render(<RecommendedSpellings profile={profile} />);
    expect(screen.queryByRole("button", { name: /Listen/ })).toBeNull();
  });
});

describe("carousel scrolls by itself", () => {
  it("advances automatically, pauses while hovered, and resumes", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    render(<CelebrityCarousel />);
    const n = CELEBRITY_NAME_CHANGES;
    // The pagination dot reflects the carousel state at once (the photo cross-fades a moment later).
    const shown = () => screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");
    expect(shown()).toBe(0);
    act(() => { vi.advanceTimersByTime(6100); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(shown()).toBe(1);
    const region = screen.getByRole("button", { name: "Next celebrity" }).parentElement!;
    fireEvent.mouseEnter(region);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(shown()).toBe(1);
    fireEvent.mouseLeave(region);
    act(() => { vi.advanceTimersByTime(7500); });
    expect(shown()).toBe(2);
  });

  it("does not auto-advance when the visitor prefers reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    render(<CelebrityCarousel />);
    act(() => { vi.advanceTimersByTime(30000); });
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
  });
});

describe("input page", () => {
  it("shows the carousel above the form, and the form values survive carousel changes", () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><NameDestinyReportPage /></MemoryRouter></QueryClientProvider>);
    const carousel = screen.getByTestId("celebrity-section");
    const form = document.getElementById("destiny-form")!;
    expect(carousel.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Komal" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Sonar" } });
    fireEvent.click(screen.getByRole("button", { name: "Next celebrity" }));
    fireEvent.click(screen.getByRole("tab", { name: `Go to ${CELEBRITY_NAME_CHANGES[3].currentName}` }));
    expect(screen.getByLabelText(/First Name/)).toHaveValue("Komal");
    expect(screen.getByLabelText(/Last Name/)).toHaveValue("Sonar");
    expect(screen.getByRole("button", { name: /Show My Namank Jyotish/ })).toHaveAttribute("type", "submit");
  });
});
