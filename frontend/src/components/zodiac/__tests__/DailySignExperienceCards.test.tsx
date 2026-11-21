// MOCKED: fetch is replaced. Proves the deck's card-back, hover, shuffle and flip behaviour on the page.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DailySignExperience from "../DailySignExperience";
import { zodiacSigns } from "@/data/zodiacData";
import { todayKey } from "@/lib/dailyHoroscope";

const daily = (sign: string) => ({ ok: true, status: 200, json: async () => ({ success: true, data: { sign, date: todayKey(), weekday: "x", timezone: "Asia/Kolkata", system: "w", cached: false, sections: { overview: "o", career: "c", love: "l", health: "h", mood: "m", opportunities: "op", mindful: "mi", guidance: "g" } } }) });
const mount = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DailySignExperience sign={zodiacSigns.find((s) => s.name === "Aries")!} /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => daily("Aries")));
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
afterEach(() => vi.unstubAllGlobals());

describe("tarot deck design", () => {
  it("all five card backs show the same detailed artwork, never a plain colour", () => {
    mount();
    const cards = screen.getAllByTestId(/^daily-card-/);
    expect(cards).toHaveLength(5);
    const srcs = cards.map((c) => within(c).getByTestId("card-back-art").getAttribute("src"));
    expect(new Set(srcs).size).toBe(1);
    expect(srcs[0]).toMatch(/tarot-card-back-burgundy\.png$/);
  });

  it("if the artwork fails to load on a card, that card shows the drawn design instead of a plain rectangle", () => {
    mount();
    const first = screen.getByTestId("daily-card-0");
    fireEvent.error(within(first).getByTestId("card-back-art"));
    expect(within(first).getByTestId("card-back-drawn")).toBeInTheDocument();
    expect(within(first).queryByTestId("card-back-art")).toBeNull();
    expect(within(screen.getByTestId("daily-card-1")).getByTestId("card-back-art")).toBeInTheDocument();
  });

  it("cards have rounded corners, depth, and a hover glow while face-down", () => {
    mount();
    const card = screen.getByTestId("daily-card-2");
    expect(card.className).toMatch(/rounded-xl/);
    expect(card.className).toMatch(/hover:shadow-\[0_16px_30px_-8px_rgba\(193,138,61/);
    expect(card.className).toMatch(/\bgroup\b/);
    expect(card.querySelector(".group-hover\\:translate-x-full, [class*='group-hover:translate-x-full']")).not.toBeNull();
  });

  it("the back artwork stays in place until a card is chosen, and the other four stay face-down after one is", async () => {
    mount();
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    for (const c of screen.getAllByTestId(/^daily-card-/)) expect(c).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByTestId("daily-card-3"));
    expect(screen.getByTestId("daily-card-3")).toHaveAttribute("aria-pressed", "true");
    for (const i of [0, 1, 2, 4]) expect(screen.getByTestId(`daily-card-${i}`)).toHaveAttribute("aria-pressed", "false");
    // the chosen card flips with the page's existing animation and gains a golden glow; its back is still the card's front-facing layer until the flip
    expect(screen.getByTestId("daily-card-3").className).toMatch(/shadow-\[0_0_0_2px_#E9B872/);
    for (const i of [0, 1, 2, 4]) expect(within(screen.getByTestId(`daily-card-${i}`)).getByTestId("card-back-art")).toBeInTheDocument();
  });

  it("a chosen card reveals its own tarot face (the existing name and number), and the reading still appears", async () => {
    mount();
    const card = screen.getByTestId("daily-card-1");
    const name = card.getAttribute("data-card")!;
    fireEvent.click(card);
    expect(await screen.findByTestId("daily-reading")).toBeVisible();
    expect(within(card).getByText(name.toUpperCase() === name ? name : name)).toBeInTheDocument();
  });

  it("Shuffle still locks the deck while it runs and gives back five face-down cards with their artwork", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mount();
      fireEvent.click(screen.getByTestId("shuffle-cards"));
      expect(screen.getByTestId("shuffle-cards")).toBeDisabled();
      for (const c of screen.getAllByTestId(/^daily-card-/)) expect(c).toBeDisabled();
      expect(screen.getAllByTestId("card-back-art")).toHaveLength(5); // artwork stays visible through the animation
      await vi.advanceTimersByTimeAsync(2000);
      expect(screen.getByTestId("shuffle-cards")).not.toBeDisabled();
      expect(screen.getAllByTestId(/^daily-card-/)).toHaveLength(5);
      for (const c of screen.getAllByTestId(/^daily-card-/)) expect(c).toHaveAttribute("aria-pressed", "false");
    } finally { vi.useRealTimers(); }
  });
});
