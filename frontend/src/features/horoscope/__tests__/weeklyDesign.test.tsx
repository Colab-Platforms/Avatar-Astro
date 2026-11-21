// MOCKED: fetch is replaced. These prove the design contract of the weekly section, not the backend.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WeeklyHoroscopePanel from "../WeeklyHoroscopePanel";
import HoroscopeTabs from "../HoroscopeTabs";

const body = (sign: string, lucky: object | null = { color: "Gold", number: "7" }) => ({ success: true, data: { sign, weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "w", cached: false, sections: { overview: "O text", career: "C text", love: "L text", finance: "F text", health: "H text", family: "Fam text", advice: "A text", ...(lucky ? { lucky } : {}) } } });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><WeeklyHoroscopePanel sign="leo" /></QueryClientProvider>);
beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => body("leo") }))));
afterEach(() => vi.unstubAllGlobals());

describe("weekly horoscope design", () => {
  it("the heading has a small 'This week' line, the date range as the main line, and a gold divider", async () => {
    mount();
    const header = screen.getByTestId("week-range");
    expect(within(header).getByText("This week")).toBeInTheDocument();
    expect(header).toHaveTextContent("16 Nov – 22 Nov 2026");
    expect(header.querySelectorAll("span.rotate-45").length).toBe(1); // the diamond of the divider
    expect(header.className).toMatch(/text-center/);
    await screen.findByTestId("weekly-overview");
  });

  it("every category is a card of its own with its own icon, and the words are the existing ones", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    const expected = { overview: "O text", career: "C text", love: "L text", finance: "F text", health: "H text", family: "Fam text" };
    for (const [k, text] of Object.entries(expected)) {
      const card = screen.getByTestId(`weekly-${k}`);
      expect(card).toHaveTextContent(text);
      expect(card).toHaveAttribute("data-icon", k);
      expect(card.querySelector("h3 ~ p, p")).not.toBeNull();
      expect(within(card).getByRole("heading", { level: 3 })).toBeInTheDocument();
      // the category badge holds exactly one icon, drawn as an SVG and hidden from screen readers
      const badge = card.querySelector("span.rounded-full svg");
      expect(badge).not.toBeNull();
      expect(badge).toHaveAttribute("aria-hidden", "true");
    }
    // the six icons are all different shapes
    const shapes = Object.keys(expected).map((k) => screen.getByTestId(`weekly-${k}`).querySelector("span.rounded-full svg")!.getAttribute("class"));
    expect(new Set(shapes).size).toBe(6);
  });

  it("Overall This Week is the prominent card: full width, dark brown-to-primary gradient, larger text", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    const o = screen.getByTestId("weekly-overview");
    expect(o.className).toMatch(/md:col-span-2/);
    expect(o.className).toMatch(/from-\[#54230F\]/);
    expect(o.className).toMatch(/to-\[#803003\]/);
    expect(o.querySelector("p")!.className).toMatch(/md:text-lg/);
    const career = screen.getByTestId("weekly-career");
    expect(career.className).not.toMatch(/md:col-span-2/);
    expect(career.className).toMatch(/from-\[#FFFCF6\]/); // the others are the light cream cards
  });

  it("all cards share the same styling and stretch to equal heights", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    for (const k of ["career", "love", "finance", "health", "family"]) {
      const c = screen.getByTestId(`weekly-${k}`);
      expect(c.className).toMatch(/\bh-full\b/);
      expect(c.className).toMatch(/rounded-2xl/);
      expect(c.className).toMatch(/border-\[#C18A3D\]\/60/);
      expect(c.className).toMatch(/hover:-translate-y-1/);
      expect(c.className).toMatch(/motion-reduce:hover:translate-y-0/);
      expect(c.querySelectorAll("svg").length).toBeGreaterThanOrEqual(5); // 4 corner flourishes + the category icon
    }
    expect(screen.getByTestId("weekly-career").parentElement!.className).toMatch(/auto-rows-fr/);
  });

  it("with an odd number of small cards, Family spans the full width so no slot is left empty", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    expect(screen.getByTestId("weekly-family").className).toMatch(/md:col-span-2/);
    for (const k of ["career", "love", "finance", "health"]) expect(screen.getByTestId(`weekly-${k}`).className).not.toMatch(/md:col-span-2/);
  });

  it("lucky colour and number are badges with icons; advice is its own ornamented banner", async () => {
    mount();
    const lucky = await screen.findByTestId("weekly-lucky");
    expect(lucky).toHaveTextContent(/lucky colour: gold/i);
    expect(lucky).toHaveTextContent(/lucky number: 7/i);
    expect(lucky.querySelectorAll("svg").length).toBe(2);
    const advice = screen.getByTestId("weekly-advice");
    expect(advice).toHaveTextContent("A text");
    expect(advice).toHaveAttribute("data-icon", "advice");
    expect(advice.querySelectorAll("svg").length).toBeGreaterThanOrEqual(5);
  });

  it("no lucky badges when the reading has none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => body("leo", null) })));
    mount();
    await screen.findByTestId("weekly-overview");
    expect(screen.queryByTestId("weekly-lucky")).toBeNull();
  });

  it("loading shows six skeleton cards in the same layout, with the loading text for screen readers", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    mount();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/reading this week/i);
    expect(status.querySelectorAll(".animate-pulse.rounded-2xl")).toHaveLength(6);
  });

  it("the error state is a styled card with a Try again button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ code: "WEEKLY_NOT_READY" }) })));
    mount();
    const alert = await screen.findByRole("alert");
    expect(alert.className).toMatch(/rounded-2xl/);
    expect(alert.querySelectorAll("svg").length).toBeGreaterThanOrEqual(5);
    expect(within(alert).getByRole("button", { name: /try again/i })).toHaveClass("min-h-[44px]");
  });

  it("card text stays readable: dark brown on cream, light cream on the dark overview card", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    expect(screen.getByTestId("weekly-career").querySelector("p")!.className).toMatch(/text-\[#33251D\]/);
    expect(screen.getByTestId("weekly-overview").querySelector("p")!.className).toMatch(/text-\[#F5E9D6\]/);
  });

  it("responsive grid: one column on phones, two from the md breakpoint", async () => {
    mount();
    await screen.findByTestId("weekly-overview");
    const grid = screen.getByTestId("weekly-career").parentElement!;
    expect(grid.className).toMatch(/\bgrid\b/);
    expect(grid.className).toMatch(/md:grid-cols-2/);
    expect(grid.className).not.toMatch(/(^|\s)grid-cols-2/);
  });
});

describe("tabs design", () => {
  it("a gliding highlight sits under the chosen tab and moves when the tab changes", () => {
    const { rerender } = render(<HoroscopeTabs tab="daily" onChange={() => {}} />);
    const ind = screen.getByTestId("tab-indicator");
    expect(ind.style.transform).toBe("translateX(0)");
    expect(ind.className).toMatch(/transition-transform/);
    expect(ind.className).toMatch(/motion-reduce:transition-none/);
    rerender(<HoroscopeTabs tab="weekly" onChange={() => {}} />);
    expect(screen.getByTestId("tab-indicator").style.transform).toMatch(/translateX\(calc\(100% \+ 4px\)\)/);
  });

  it("the selected label is cream on the brown highlight; the other is brown; both have an icon", () => {
    render(<HoroscopeTabs tab="weekly" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /weekly horoscope/i }).className).toMatch(/text-\[#F5E9D6\]/);
    expect(screen.getByRole("tab", { name: /daily horoscope/i }).className).toMatch(/text-\[#54230F\]/);
    for (const t of screen.getAllByRole("tab")) expect(t.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("still switches by click and keyboard", () => {
    const seen: string[] = [];
    render(<HoroscopeTabs tab="daily" onChange={(t) => seen.push(t)} />);
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    fireEvent.keyDown(screen.getByRole("tab", { name: /daily horoscope/i }), { key: "ArrowRight" });
    expect(seen).toEqual(["weekly", "weekly"]);
  });
});
