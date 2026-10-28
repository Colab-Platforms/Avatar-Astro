import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RatnaJyotishResult from "@/pages/RatnaJyotishResult";
import { ratnaApi } from "../api";
import { saveResult } from "../storage";
import { SCIENCE_NOTICE } from "../format";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { complete, dateBased, emptyShop, emerald, product } from "./fixtures";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
const api = vi.mocked(ratnaApi);

// Read from disk: Vitest's CSS pipeline turns `?raw` stylesheet imports into empty strings.
const css = readFileSync(resolve(process.cwd(), "src/features/ratna/ratna.css"), "utf8");

const renderResult = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/ratna-jyotish/result"]}>
        <Routes>
          <Route path="/ratna-jyotish" element={<p>form</p>} />
          <Route path="/ratna-jyotish/result" element={<RatnaJyotishResult />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.scrollTo = vi.fn();
  api.products.mockResolvedValue(emptyShop);
});

describe("unknown birth time: gemstone-led result", () => {
  beforeEach(() => saveResult(dateBased));

  it("shows the primary gemstone, planet, method label and summary", () => {
    renderResult();
    expect(screen.getByTestId("recommended-stone")).toHaveTextContent("Emerald");
    expect(screen.getByText("Your Birth-Date Gemstone")).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Emerald" });
    expect(within(card).getByText(/Traditionally associated with Mercury/)).toBeInTheDocument();
    expect(screen.getByTestId("method-label")).toHaveTextContent("Method: Birth-Date & Place Gemstone Method");
    expect(within(card).getByText("Born on a Wednesday, a day ruled by Mercury.")).toBeInTheDocument();
    expect(within(card).getByText(/Based on your birth date and birthplace; exact birth time was not used\./)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Emerald illustration" })).toBeInTheDocument();
  });

  it("has the hero with eyebrow, heading and the real birth details", () => {
    renderResult();
    expect(screen.getByText("YOUR PERSONAL GEMSTONE")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Your Ratna Jyotish Reading" })).toBeInTheDocument();
    const meta = screen.getByRole("list", { name: "Birth details used" });
    expect(within(meta).getByText("Born 9 May 1990")).toBeInTheDocument();
    expect(within(meta).getByText("Birth time not provided")).toBeInTheDocument();
    expect(within(meta).getByText("Vasai, Palghar, Maharashtra, India")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ratna Jyotish gemstone emblem" })).toBeInTheDocument();
  });

  it("no longer shows the old no-recommendation panel or a planet-sign grid as the result", () => {
    renderResult();
    expect(screen.queryByText(/No recommendation is made/i)).toBeNull();
    expect(screen.queryByText(/cannot be calculated/i)).toBeNull();
    expect(screen.queryByText("Your Ratna Jyotish Result")).toBeNull();
    // Planet signs survive only as background chips inside the method disclosure.
    const primary = screen.getByRole("region", { name: "Emerald" });
    expect(within(primary).queryByText(/Sun in Aries/)).toBeNull();
    const chips = screen.getByRole("list", { name: "Planetary signs steady across the date" });
    expect(within(chips).getByText("Sun in Aries")).toBeInTheDocument();
    expect(screen.getByText(/Background only/)).toBeInTheDocument();
  });

  it("shows themes in hedged language, with no personal-problem claims", () => {
    renderResult();
    const section = screen.getByTestId("ratna-significance");
    expect(within(section).getByRole("heading", { name: "Traditional associations" })).toBeInTheDocument();
    expect(within(section).getByText(/Traditional interpretation in some Vedic astrology schools/)).toBeInTheDocument();
    expect(within(section).getByText("Communication")).toBeInTheDocument();
    expect(within(section).getByText("Learning and study")).toBeInTheDocument();
    expect(within(section).getByText(/not scientific evidence/)).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/you have|you will|will fix|guarantee(?!d?\b)|become wealthy/i);
  });

  it("explains what the reading means and is honest about its limits", () => {
    renderResult();
    expect(screen.queryByRole("heading", { name: "What This Means for You" })).toBeNull(); // folded into the card
    expect(screen.getByText(/You were born on a Wednesday, ruled by Mercury/)).toBeInTheDocument(); // inside "Why this gemstone?"
    expect(screen.getByRole("link", { name: "Calculate again with an exact birth time" })).toHaveAttribute("href", "/ratna-jyotish");
  });

  it("shows wearing guidance with the weekday, sunrise, location and time zone used", () => {
    renderResult();
    const w = screen.getByTestId("ratna-wearing");
    expect(within(w).getByRole("heading", { name: "How to wear" })).toBeInTheDocument();
    expect(within(w).getByText("Wednesday")).toBeInTheDocument();
    expect(within(w).getByText("Gold or silver")).toBeInTheDocument();
    expect(within(w).getByText("Little finger")).toBeInTheDocument();
    expect(within(w).getByText(/New Delhi \(your birthplace\) · Asia\/Kolkata/)).toBeInTheDocument();
    expect(within(w).getByText("Next Wednesday sunrise")).toBeInTheDocument();
  });

  it("says no exact time was calculated when sunrise is unavailable", () => {
    saveResult({ ...dateBased, wearing: { ...dateBased.wearing!, sunrise: null, sunriseNote: "No exact time was calculated; only the traditional weekday (Wednesday) is shown." } });
    renderResult();
    const w = screen.getByTestId("ratna-wearing");
    expect(within(w).getByText("Wednesday")).toBeInTheDocument(); // weekday still shown
    expect(within(w).queryByText(/sunrise/i)).toBeNull(); // no time card, no technical explanation
    expect(within(w).queryByText(/not calculated|No exact time/i)).toBeNull();
    expect(screen.getByText(/No exact time was calculated/)).toBeInTheDocument(); // kept in the collapsed details
  });

  it("the method disclosure documents the rule, the weekday table and the sunrise caveat", () => {
    renderResult();
    expect(screen.getAllByText(/Weekday-ruler rule/).length).toBeGreaterThan(0);
    const mine = screen.getByRole("row", { current: true });
    expect(mine).toHaveTextContent("WednesdayMercuryEmerald");
    expect(screen.getByText(/begins each weekday at local sunrise/)).toBeInTheDocument();
    expect(screen.getAllByText(/less specific than a full birth-chart reading/).length).toBeGreaterThan(0);
  });

  it("does not show secondary house-based perspectives it cannot calculate", () => {
    renderResult();
    expect(screen.queryByText("Other Traditional Perspectives")).toBeNull();
    expect(screen.queryByText(/house lord/)).toBeNull();
  });
});

describe("exact birth time: result is the same method with the new layout", () => {
  it("labels the Lagna-lord method and shows the chart table", () => {
    saveResult(complete);
    renderResult();
    expect(screen.getByTestId("method-label")).toHaveTextContent("Method: Parashari Lagna-lord method");
    expect(screen.getByText("Your Lagna-Lord Gemstone")).toBeInTheDocument();
    expect(screen.getByTestId("recommended-stone")).toHaveTextContent("Diamond or White Sapphire");
    const card = screen.getByRole("region", { name: "Diamond or White Sapphire" });
    expect(within(card).getByText(/Your Ascendant is Taurus; its ruler Venus/)).toBeInTheDocument();
    expect(screen.getByText("Born 5 May 1990")).toBeInTheDocument();
    expect(screen.getByText("at 10:00")).toBeInTheDocument();
    expect(screen.queryByText(/Your Birth-Date Gemstone/)).toBeNull();
  });

  it("still shows secondary perspectives and cautions when present", () => {
    saveResult({
      ...complete,
      recommendation: {
        ...complete.recommendation!,
        secondary: [{ house: 5, planet: "Mercury", sign: "Virgo", stone: emerald, reason: "5th lord, no conflict." }],
        cautions: ["Venus is debilitated in this chart."],
      },
    });
    renderResult();
    expect(screen.getByText("Other Traditional Perspectives")).toBeInTheDocument();
    expect(screen.getByText(/5th house lord \(Virgo\)/)).toBeInTheDocument();
    expect(screen.getByText("Venus is debilitated in this chart.")).toBeInTheDocument();
  });
});

describe("disclosures and notice", () => {
  beforeEach(() => saveResult(dateBased));

  it("'Why this gemstone?' expands and collapses with correct ARIA state", () => {
    renderResult();
    const btn = screen.getByRole("button", { name: "Why this gemstone?" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(panel).toHaveAttribute("data-open", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveAttribute("data-open", "true");
    expect(within(panel).getByText("Wednesday: Mercury")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("the method disclosure is a labelled region controlled by a button", () => {
    renderResult();
    const btn = screen.getByRole("button", { name: "How this was calculated" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).toHaveAttribute("aria-labelledby", btn.id);
  });

  it("the scientific and commercial notice is always visible and verbatim", () => {
    renderResult();
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(SCIENCE_NOTICE);
    // traditional interpretation, no guarantee, optional purchase, compact
    expect(SCIENCE_NOTICE).toMatch(/traditional astrological interpretations/);
    expect(SCIENCE_NOTICE).toMatch(/no outcome is guaranteed/);
    expect(SCIENCE_NOTICE).toMatch(/optional/);
    expect(SCIENCE_NOTICE.length).toBeLessThan(300);
  });
});

describe("compact, wide layout", () => {
  it("uses the wide responsive container, not a narrow column", () => {
    saveResult(dateBased);
    const { container } = renderResult();
    const wrap = container.querySelector("section.mx-auto")!;
    expect(wrap.className).toContain("w-[min(94vw,1800px)]");
    expect(wrap.className).not.toMatch(/max-w-(xl|2xl|3xl|4xl|5xl)/);
  });

  it("shows at most three traditional associations", () => {
    saveResult({
      ...dateBased,
      primary: {
        ...dateBased.primary,
        stone: {
          ...emerald,
          themes: ["A", "B", "C", "D", "E"].map((l) => ({ label: `Theme ${l}`, note: "note" })),
        },
      },
    });
    renderResult();
    const section = screen.getByTestId("ratna-significance");
    expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("keeps visible copy short: long explanations live in collapsed disclosures", () => {
    saveResult({ ...dateBased, explanation: { ...dateBased.explanation, text: "A long explanation. ".repeat(40) } });
    renderResult();
    const visible = [...document.querySelectorAll("p")].filter((p) => !p.closest(".ratna-acc-panel"));
    expect(visible.length).toBeGreaterThan(3);
    for (const p of visible) expect(p.textContent!.length, p.textContent!).toBeLessThan(260);
  });

  it("shows the exact-time note only for unknown-time results, and no top-of-page disclaimer", () => {
    saveResult(dateBased);
    const { unmount } = renderResult();
    expect(screen.getByText(/exact birth time was not used/)).toBeInTheDocument();
    expect(screen.queryByText(/cannot be calculated|No recommendation/i)).toBeNull();
    unmount();
    saveResult(complete);
    renderResult();
    expect(screen.queryByText(/exact birth time was not used/)).toBeNull();
  });

  it("product cards are compact: image, name, price and a View Product action only", async () => {
    saveResult(dateBased);
    api.products.mockResolvedValue({
      ...emptyShop,
      gemstones: [product({ id: "em-1", name: "Colombian Emerald", price: 3499, sellerDescription: "Long seller text" })],
    });
    renderResult();
    const card = (await screen.findByRole("link", { name: "Colombian Emerald" })).closest("li")!;
    expect(within(card).getByRole("img", { name: "Colombian Emerald" })).toBeInTheDocument();
    expect(within(card).getByText("₹3,499")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "View Product" })).toHaveAttribute("href", "/shop/em-1");
    expect(within(card).queryByText(/Long seller text/)).toBeNull();
  });
});

describe("rendering and motion", () => {
  it("renders all content synchronously: nothing waits on an animation or timer", () => {
    saveResult(dateBased);
    vi.useFakeTimers();
    try {
      renderResult();
      expect(screen.getByTestId("recommended-stone")).toBeInTheDocument();
      expect(screen.getByTestId("ratna-wearing")).toBeInTheDocument();
      expect(screen.getByTestId("ratna-notice")).toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(0); // no JS-driven reveal timers
    } finally {
      vi.useRealTimers();
    }
  });

  it("every decorative animation is switched off under prefers-reduced-motion", () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\r?\n\}/g;
    const reduced = [...css.matchAll(block)].map((m) => m[1]).join("\n");
    for (const cls of [".ratna-reveal", ".ratna-glow", ".ratna-float", ".ratna-ring", ".ratna-gem-card::after", ".ratna-star", ".ratna-acc-panel"]) {
      expect(reduced, cls).toContain(cls);
    }
    expect(reduced).toMatch(/animation: none/);
    expect(reduced).toMatch(/transition: none/);
  });

  it("animates only transform and opacity (no layout-thrashing properties)", () => {
    const frames = css
      .split("@keyframes ")
      .slice(1)
      .map((chunk) => {
        let depth = 0;
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === "{") depth++;
          if (chunk[i] === "}" && --depth === 0) return `@keyframes ${chunk.slice(0, i + 1)}`;
        }
        return "";
      })
      .join("\n");
    expect(css.length).toBeGreaterThan(1000);
    expect(frames).toContain("@keyframes ratna-rise");
    expect(frames).toContain("@keyframes ratna-shimmer");
    expect(frames).not.toMatch(/\b(width|height|top|left|margin|padding)\s*:/);
  });
});

describe("shop products for the date-based gemstone", () => {
  beforeEach(() => saveResult(dateBased));

  it("requests the actual selected gemstone and shows real data in the four groups", async () => {
    api.products.mockResolvedValue({
      stone: { key: "emerald", name: "Emerald", planet: "Mercury" },
      gemstones: [product({ id: "em-1", name: "Colombian Emerald", price: 3499 })],
      jewellery: [product({ id: "em-r", name: "Emerald Ring", price: 8999, categoryName: "Rings" })],
      chartLinked: [product({ id: "r4", name: "4 Mukhi Rudraksha", price: 500, reason: "One common convention links this to Mercury." })],
      complementary: [product({ id: "b1", name: "Tiger Eye Bracelet", price: 899 })],
    });
    renderResult();
    expect(await screen.findByRole("link", { name: "Colombian Emerald" })).toHaveAttribute("href", "/shop/em-1");
    expect(api.products).toHaveBeenCalledWith("emerald");
    expect(screen.getByText("₹3,499")).toBeInTheDocument();
    for (const t of ["Your Matching Gemstone", "Matching Gemstone Jewellery", "Planet-Linked Accessories", "Complementary Spiritual Accessories"]) {
      expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
    }
    // chart-linked is labelled as convention-based, general accessories as not personalised
    expect(screen.getByText("Linked by convention to Mercury, the planet of Emerald; not a prescription.")).toBeInTheDocument();
    expect(screen.getByText("General accessories, not selected from your birth details.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View Product" })).toHaveLength(4);
    expect(screen.queryByText(/prescribed for you|your remedy/i)).toBeNull();
  });

  it("does not substitute a different stone when the gemstone is not listed", async () => {
    renderResult();
    expect(await screen.findByText(/No Emerald is currently listed in the shop/)).toBeInTheDocument();
    expect(screen.getByText(/do not substitute a different gemstone/)).toBeInTheDocument();
    expect(screen.queryByText("Matching Gemstone Jewellery")).toBeNull();
  });

  it("keeps the result and offers a retry when the shop API fails", async () => {
    api.products.mockRejectedValue(new Error("down"));
    renderResult();
    expect(await screen.findByText(/could not load shop products/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByTestId("recommended-stone")).toHaveTextContent("Emerald");
    api.products.mockResolvedValue(emptyShop);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(/could not load shop products/)).toBeNull());
  });
});
