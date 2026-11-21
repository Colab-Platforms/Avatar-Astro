// MOCKED: every test here replaces fetch. They prove the page's behaviour, not the real backend (that is checked separately).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DailySignExperience from "../DailySignExperience";
import { zodiacSigns } from "@/data/zodiacData";
import { todayKey } from "@/lib/dailyHoroscope";

const dailyBody = (sign: string) => ({ sign, date: todayKey(), weekday: "x", timezone: "Asia/Kolkata", system: "w", cached: false, sections: { overview: `${sign} DAILY overview`, career: "c", love: "l", health: "h", mood: "m", opportunities: "o", mindful: "x", guidance: "g" } });
const weeklyBody = (sign: string) => ({ sign: sign.toLowerCase(), weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "w", cached: false, sections: { overview: `${sign} WEEKLY overview`, career: `${sign} wc`, love: `${sign} wl`, finance: `${sign} wf`, health: `${sign} wh`, family: `${sign} wfam`, advice: `${sign} wadvice`, lucky: { color: "Gold", number: "7" } } });
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
const fail = (status: number, code: string) => ({ ok: false, status, json: async () => ({ success: false, code }) });
const lastSegment = (u: string) => u.split("/").pop()!;

let fetchMock: ReturnType<typeof vi.fn>;
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));
const weeklyUrls = () => urls().filter((u) => u.includes("/horoscope/weekly/"));
const dailyUrls = () => urls().filter((u) => /\/interpretation\/horoscope\/[a-z]+$/.test(u) && !u.includes("/weekly/"));

/** Default network: a daily or weekly reading for whichever sign is asked for. */
const happyNetwork = () => fetchMock.mockImplementation(async (url: string) => {
  const u = String(url);
  const sign = lastSegment(u);
  const name = zodiacSigns.find((s) => s.name.toLowerCase() === sign)!.name;
  return u.includes("/horoscope/weekly/") ? ok(weeklyBody(name)) : ok(dailyBody(name));
});

const Where = () => <output data-testid="where">{useLocation().search}</output>;
const mount = (name: string, entry = `/zodiac/${name.toLowerCase()}`) => {
  const sign = () => zodiacSigns.find((s) => s.name === name)!;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (n = name) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <DailySignExperience sign={zodiacSigns.find((s) => s.name === n) ?? sign()} />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, rerenderAs: (n: string) => view.rerender(tree(n)) };
};
const tab = (n: "daily" | "weekly") => screen.getByRole("tab", { name: n === "daily" ? /daily horoscope/i : /weekly horoscope/i });
const goWeekly = () => fireEvent.click(tab("weekly"));
const goDaily = () => fireEvent.click(tab("daily"));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
afterEach(() => vi.unstubAllGlobals());

describe("Daily / Weekly tabs on /zodiac/:sign", () => {
  it("opens on Daily: tab selected, date and tarot deck showing, nothing weekly requested", async () => {
    happyNetwork();
    mount("Aries");
    expect(tab("daily")).toHaveAttribute("aria-selected", "true");
    expect(tab("weekly")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Daily Horoscope – Aries");
    expect(screen.getByTestId("reading-date")).toBeVisible();
    expect(screen.getByTestId("shuffle-cards")).toBeVisible();
    expect(screen.getAllByTestId(/^daily-card-/)).toHaveLength(5);
    expect(screen.queryByTestId("weekly-panel")).toBeNull();
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    expect(weeklyUrls()).toHaveLength(0); // opening a sign never asks for the weekly reading
  });

  it("the tabs sit below the sign heading and date, above the deck", () => {
    happyNetwork();
    mount("Aries");
    const order = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(order(screen.getByRole("heading", { level: 1 }), screen.getByTestId("horoscope-tabs"))).toBe(true);
    expect(order(screen.getByTestId("reading-date"), screen.getByTestId("horoscope-tabs"))).toBe(true);
    expect(order(screen.getByTestId("horoscope-tabs"), screen.getByTestId("shuffle-cards"))).toBe(true);
  });

  it("Weekly asks for this sign's weekly reading, shows the week and its sections, and hides the daily experience", async () => {
    happyNetwork();
    mount("Leo");
    goWeekly();
    expect(await screen.findByText("Leo WEEKLY overview")).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(1);
    expect(weeklyUrls()[0]).toMatch(/\/interpretation\/horoscope\/weekly\/leo$/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Weekly Horoscope – Leo");
    expect(screen.getByTestId("week-range")).toHaveTextContent("16 Nov – 22 Nov 2026");
    for (const k of ["career", "love", "finance", "health", "family"]) expect(screen.getByTestId(`weekly-${k}`)).toHaveTextContent(`Leo w`);
    expect(screen.getByTestId("weekly-advice")).toHaveTextContent("Leo wadvice");
    expect(screen.getByTestId("weekly-lucky")).toHaveTextContent(/gold/i);
    expect(screen.getByTestId("daily-tab-content")).not.toBeVisible();
    expect(screen.queryByTestId("reading-date")).toBeNull();
    for (const el of screen.queryAllByText(/DAILY overview/)) expect(el).not.toBeVisible(); // any daily text still in the page is hidden
  });

  it("switching back to Daily shows the daily experience again without repeating either request", async () => {
    happyNetwork();
    mount("Virgo");
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    const dailyBase = dailyUrls().length; // the page remembers each sign's daily reading for the day, so compare against a baseline
    goWeekly();
    await screen.findByText("Virgo WEEKLY overview");
    goDaily();
    expect(screen.getByTestId("daily-tab-content")).toBeVisible();
    expect(screen.getByTestId("shuffle-cards")).toBeVisible();
    expect(screen.queryByTestId("weekly-panel")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Daily Horoscope – Virgo");
    goWeekly();
    expect(await screen.findByText("Virgo WEEKLY overview")).toBeInTheDocument();
    expect(dailyUrls()).toHaveLength(dailyBase);
    expect(weeklyUrls()).toHaveLength(1); // cached for the sign and week
  });

  it("the card you picked is still there after a trip to Weekly and back", async () => {
    happyNetwork();
    mount("Gemini");
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    fireEvent.click(screen.getByTestId("daily-card-2"));
    expect(await screen.findByTestId("daily-reading")).toBeVisible();
    goWeekly();
    await screen.findByText("Gemini WEEKLY overview");
    expect(screen.getByTestId("daily-reading")).not.toBeVisible();
    goDaily();
    expect(screen.getByTestId("daily-reading")).toBeVisible();
    expect(screen.getByTestId("daily-reading")).toHaveTextContent("Gemini DAILY overview");
  });

  it("the choice is kept in the address, so a refresh or shared link lands on the same tab", () => {
    happyNetwork();
    const first = mount("Cancer");
    expect(screen.getByTestId("where")).toHaveTextContent("");
    goWeekly();
    expect(screen.getByTestId("where")).toHaveTextContent("?view=weekly");
    goDaily();
    expect(screen.getByTestId("where")).toHaveTextContent("");
    first.unmount();
    mount("Cancer", "/zodiac/cancer?view=weekly");
    expect(tab("weekly")).toHaveAttribute("aria-selected", "true");
  });

  it("arrow keys move between the tabs", () => {
    happyNetwork();
    mount("Aries");
    fireEvent.keyDown(tab("daily"), { key: "ArrowRight" });
    expect(tab("weekly")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tab("weekly"), { key: "ArrowLeft" });
    expect(tab("daily")).toHaveAttribute("aria-selected", "true");
  });

  it("moving to another sign while on Weekly keeps Weekly and shows only the new sign's reading", async () => {
    happyNetwork();
    const m = mount("Aries");
    goWeekly();
    await screen.findByText("Aries WEEKLY overview");
    m.rerenderAs("Leo");
    expect(await screen.findByText("Leo WEEKLY overview")).toBeInTheDocument();
    expect(screen.queryByText("Aries WEEKLY overview")).toBeNull();
    expect(tab("weekly")).toHaveAttribute("aria-selected", "true");
    expect(weeklyUrls().map(lastSegment)).toEqual(["aries", "leo"]);
  });

  it.each(zodiacSigns.map((s) => s.name))("%s: the toggle is there, and Weekly requests and shows only %s's own reading", async (name) => {
    happyNetwork();
    mount(name);
    expect(screen.getByTestId("horoscope-tabs")).toBeVisible();
    goWeekly();
    expect(await screen.findByText(`${name} WEEKLY overview`)).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(1);
    expect(lastSegment(weeklyUrls()[0])).toBe(name.toLowerCase());
    expect(screen.getByTestId("weekly-advice")).toHaveTextContent(`${name} wadvice`);
    for (const other of zodiacSigns.filter((s) => s.name !== name)) expect(screen.queryByText(`${other.name} WEEKLY overview`)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`Weekly Horoscope – ${name}`);
  });

  it("shows a loading state while the weekly reading is being fetched", async () => {
    fetchMock.mockImplementation((url: string) => (String(url).includes("/weekly/") ? new Promise(() => {}) : Promise.resolve(ok(dailyBody("Aries")))));
    mount("Aries");
    goWeekly();
    expect(within(await screen.findByTestId("weekly-panel")).getByRole("status")).toHaveTextContent(/reading this week/i);
  });

  it("an API failure says why, offers Try again, and Try again fetches just once more then shows the reading", async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes("/weekly/") ? (fetchMock.mock.calls.filter((c) => String(c[0]).includes("/weekly/")).length === 1 ? fail(503, "WEEKLY_NOT_READY") : ok(weeklyBody("Libra"))) : ok(dailyBody("Libra"))));
    mount("Libra");
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    const dailyBase = dailyUrls().length;
    goWeekly();
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/being set up/i)).toBeInTheDocument();
    expect(screen.queryByText(/WEEKLY overview/)).toBeNull();
    fireEvent.click(within(alert).getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Libra WEEKLY overview")).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(2);
    expect(dailyUrls()).toHaveLength(dailyBase); // retrying Weekly never re-requests Daily
  });

  it("a network failure is reported plainly on Weekly and does not disturb Daily", async () => {
    fetchMock.mockImplementation(async (url: string) => { if (String(url).includes("/weekly/")) throw new TypeError("Failed to fetch"); return ok(dailyBody("Pisces")); });
    mount("Pisces");
    goWeekly();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the horoscope service/i);
    goDaily();
    expect(screen.getByTestId("shuffle-cards")).toBeVisible();
  });

  it("a weekly answer for a different sign is refused, not shown", async () => {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes("/weekly/") ? ok(weeklyBody("Aries")) : ok(dailyBody("Leo"))));
    mount("Leo");
    goWeekly();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be completed/i);
    expect(screen.queryByText("Aries WEEKLY overview")).toBeNull();
  });
});

describe("layout contract (class-level: jsdom has no layout engine; real widths are checked in a browser)", () => {
  it("tabs are full-width up to a comfortable maximum, centred, with touch-sized targets that scale text at the sm breakpoint", () => {
    happyNetwork();
    mount("Aries");
    const list = screen.getByTestId("horoscope-tabs");
    expect(list.className).toMatch(/\bw-full\b/);
    expect(list.className).toMatch(/\bmax-w-md\b/);
    expect(list.className).toMatch(/\bmx-auto\b/);
    for (const k of ["daily", "weekly"] as const) {
      expect(tab(k).className).toMatch(/min-h-\[44px\]/);
      expect(tab(k).className).toMatch(/\bflex-1\b/);
      expect(tab(k).className).toMatch(/\bsm:text-base\b/);
    }
  });
});
