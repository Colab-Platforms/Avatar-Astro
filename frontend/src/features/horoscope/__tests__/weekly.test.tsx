import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { currentWeek, formatWeekRange, weekRangeOf } from "../week";

const daily = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("gsap", () => {
  const gsap = { registerPlugin: vi.fn(), context: () => ({ revert: vi.fn() }), fromTo: vi.fn() };
  return { default: gsap, gsap };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
vi.mock("@/hooks/useInterpretation", () => ({
  useAIDailyHoroscope: (sign: string) => ({ data: sign ? { horoscope: `DAILY TEXT for ${sign}` } : null, loading: false, error: null, fetch: () => daily.fetch(sign) }),
}));
vi.mock("@/features/profile/usePrefill", () => ({ usePrefill: () => ({ profile: null, saveNew: vi.fn() }) }));

import DailyHoroscopes from "@/pages/DailyHoroscopes";

const sections = (sign: string) => ({
  overview: `${sign} overview`, career: `${sign} career`, love: `${sign} love`, finance: `${sign} finance`, health: `${sign} health`, family: `${sign} family`,
  advice: `${sign} advice`, lucky: { color: "Gold", number: "7" },
});
const weeklyUrls = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0])).filter((u) => u.includes("/horoscope/weekly/"));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><DailyHoroscopes /></MemoryRouter>
    </QueryClientProvider>,
  );
const pick = (name: string) => {
  fireEvent.click(screen.getByText(/choose your zodiac sign|^Aries$|^Leo$|^Virgo$/i, { selector: "span, div" }).closest("button")!);
  const list = document.querySelector(".max-h-80") as HTMLElement;
  fireEvent.click(within(list).getByText(name).closest("button")!);
};

describe("week range", () => {
  it("runs Monday to Sunday", () => {
    expect(weekRangeOf("2026-11-16")).toEqual({ start: "2026-11-16", end: "2026-11-22" });
    expect(weekRangeOf("2026-11-22")).toEqual({ start: "2026-11-16", end: "2026-11-22" });
    expect(weekRangeOf("2026-11-23")).toEqual({ start: "2026-11-23", end: "2026-11-29" });
  });
  it("uses India time for 'today': Sunday late evening UTC is already Monday in India", () => {
    expect(currentWeek(new Date("2026-11-22T12:00:00Z"))).toEqual({ start: "2026-11-16", end: "2026-11-22" }); // Sunday 17:30 IST
    expect(currentWeek(new Date("2026-11-22T19:00:00Z"))).toEqual({ start: "2026-11-23", end: "2026-11-29" }); // Monday 00:30 IST
  });
  it("formats a range across months and years", () => {
    expect(formatWeekRange("2026-11-16", "2026-11-22", "en-GB")).toBe("16 Nov – 22 Nov 2026");
    expect(formatWeekRange("2026-12-28", "2027-01-03", "en-GB")).toBe("28 Dec 2026 – 3 Jan 2027");
  });
});

describe("Daily / Weekly tabs on the horoscope page", () => {
  beforeEach(() => {
    daily.fetch.mockReset();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const sign = String(url).split("/").pop()!;
      return { ok: true, json: async () => ({ success: true, data: { sign, weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "x", cached: false, sections: sections(sign) } }) };
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens on the Daily tab", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: /daily horoscope/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /weekly horoscope/i })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByTestId("weekly-panel")).toBeNull();
  });

  it("daily keeps working: choosing a sign requests only the daily reading", async () => {
    renderPage();
    pick("Leo");
    await waitFor(() => expect(daily.fetch).toHaveBeenCalledWith("leo"));
    expect(screen.getByText("DAILY TEXT for leo")).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(0);
  });

  it("Weekly shows the week range and the weekly sections for the chosen sign, with no daily text", async () => {
    renderPage();
    pick("Leo");
    daily.fetch.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    expect(await screen.findByTestId("weekly-overview")).toHaveTextContent("leo overview");
    for (const k of ["career", "love", "finance", "health", "family"]) expect(screen.getByTestId(`weekly-${k}`)).toHaveTextContent(`leo ${k}`);
    expect(screen.getByTestId("weekly-advice")).toHaveTextContent("leo advice");
    expect(screen.getByTestId("weekly-lucky")).toHaveTextContent(/gold/i);
    expect(screen.getByTestId("week-range")).toHaveTextContent("16 Nov – 22 Nov 2026");
    expect(screen.queryByText(/DAILY TEXT/)).toBeNull();
    expect(daily.fetch).not.toHaveBeenCalled(); // the daily reading is not re-requested while on Weekly
    expect(weeklyUrls()).toHaveLength(1);
    expect(weeklyUrls()[0]).toMatch(/\/interpretation\/horoscope\/weekly\/leo$/);
  });

  it("choosing another sign on Weekly updates the prediction", async () => {
    renderPage();
    pick("Leo");
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    await screen.findByText("leo overview");
    pick("Virgo");
    expect(await screen.findByText("virgo overview")).toBeInTheDocument();
    expect(screen.queryByText("leo overview")).toBeNull();
  });

  it("switching tabs back and forth does not repeat the weekly request", async () => {
    renderPage();
    pick("Leo");
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    await screen.findByText("leo overview");
    fireEvent.click(screen.getByRole("tab", { name: /daily horoscope/i }));
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    expect(await screen.findByText("leo overview")).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(1);
  });

  const failWith = (status: number, code?: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status, json: async () => ({ success: false, ...(code ? { code } : {}) }) })));
  const open = () => { renderPage(); pick("Leo"); fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i })); };

  it.each([
    ["the table is missing (migration not applied)", 503, "WEEKLY_NOT_READY", "notReady", /being set up/i],
    ["the AI provider is unavailable", 503, "HOROSCOPE_UNAVAILABLE", "providerDown", /not available right now/i],
    ["the provider's answer was incomplete", 502, "HOROSCOPE_INVALID", "invalid", /could not be completed/i],
    ["the session is not valid", 401, undefined, "auth", /sign in again/i],
    ["the server does not have the weekly route", 404, undefined, "notDeployed", /not available on this server yet/i],
    ["the server fails unexpectedly", 500, "WEEKLY_FAILED", "generic", /something went wrong/i],
  ])("says what is wrong when %s, and offers a retry, never daily text", async (_n, status, code, kind, text) => {
    failWith(status as number, code as string | undefined);
    open();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(text as RegExp);
    expect(alert.querySelector("[data-error-kind]")).toHaveAttribute("data-error-kind", kind as string);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/DAILY TEXT/)).toBeNull();
  });

  it("a network failure says the service could not be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the horoscope service/i);
  });

  it("an answer with a missing section, or for a different sign, is rejected rather than shown", async () => {
    const good = (sign: string) => ({ sign, weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "x", cached: false, sections: sections(sign) });
    const { finance, ...partial } = sections("leo"); void finance;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { ...good("leo"), sections: partial } }) })));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be completed/i);
    expect(screen.queryByTestId("weekly-overview")).toBeNull();
  });

  it("a reading for another sign is not shown under this sign", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { sign: "aries", weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "x", cached: true, sections: sections("aries") } }) })));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be completed/i);
    expect(screen.queryByText("aries overview")).toBeNull();
  });

  it("Try again asks the server once more and shows the reading when it works; a stored reading is not asked for twice", async () => {
    const ok = { ok: true, json: async () => ({ success: true, data: { sign: "leo", weekStart: "2026-11-16", weekEnd: "2026-11-22", timezone: "Asia/Kolkata", system: "x", cached: true, sections: sections("leo") } }) };
    const f = vi.fn().mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: "WEEKLY_NOT_READY" }) }).mockResolvedValue(ok);
    vi.stubGlobal("fetch", f);
    open();
    fireEvent.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByText("leo overview")).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(2); // the failure, then one retry
    fireEvent.click(screen.getByRole("tab", { name: /daily horoscope/i }));
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    expect(await screen.findByText("leo overview")).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(2); // no further request
  });

  it("Weekly with no sign chosen asks for one and calls nothing", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /weekly horoscope/i }));
    expect(screen.getByText(/choose your zodiac sign to see this week/i)).toBeInTheDocument();
    expect(weeklyUrls()).toHaveLength(0);
  });
});
