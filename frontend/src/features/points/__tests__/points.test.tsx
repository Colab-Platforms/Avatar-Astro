import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@/i18n/languages";
import { setLanguage } from "@/i18n";
import { AuthApiError } from "@/lib/authClient";
import { useAuthStore } from "@/store/authStore";

vi.mock("../api", async (orig) => {
  const real = await orig<typeof import("../api")>();
  return { ...real, pointsApi: { horoscope: vi.fn(), completeHoroscope: vi.fn(), karma: vi.fn(), karmaPractices: vi.fn(), rewards: vi.fn(), transactions: vi.fn() } };
});
import { pointsApi, type HoroscopeSummary, type KarmaSummary } from "../api";
import HoroscopeStreakPanel from "../HoroscopeStreakPanel";
import KarmaRewardsSummary from "../KarmaRewardsSummary";
import RewardsPage from "../RewardsPage";
import { useKarmaRewards } from "../hooks";

const api = vi.mocked(pointsApi);
const ALL = { read: true, shuffled: true, revealed: true };

const week = (doneDates: string[], today = "2026-11-12") => Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 10, 6 + i)).toISOString().slice(0, 10);
  return { date: d, completed: doneDates.includes(d), isToday: d === today };
});
const SUMMARY: HoroscopeSummary = {
  today: "2026-11-12", completedToday: false, currentStreak: 5, bestStreak: 9, totalDays: 21, lastDate: "2026-11-11", todayPoints: 0, totalPoints: 310,
  week: week(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"]), nextMilestone: { days: 7, bonus: 30, progress: 5, remaining: 2 }, rewards: { dailyPoints: 10, milestones: [] },
};

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
const signIn = () => useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });

beforeAll(() => { window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never; });
beforeEach(async () => { vi.clearAllMocks(); signIn(); await act(async () => { await setLanguage("en"); }); });

describe("Horoscope streak panel", () => {
  it("shows a sign-in prompt and calls nothing when signed out", () => {
    signOut();
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    expect(screen.getByTestId("streak-signin")).toBeInTheDocument();
    expect(api.horoscope).not.toHaveBeenCalled();
  });

  it("shows the server's numbers, the week, and the next milestone with real remaining days and bonus", async () => {
    api.horoscope.mockResolvedValue(SUMMARY);
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    const panel = await screen.findByTestId("streak-panel");
    for (const text of ["Current Streak", "Best Streak", "Total Completed Days", "Points Earned Today", "Weekly Progress", "Next Milestone"]) expect(panel).toHaveTextContent(text);
    expect(screen.getByTestId("total-points")).toHaveTextContent("310");
    expect(screen.getByTestId("tz-note")).toHaveTextContent(/midnight IST/);
    const states = within(screen.getByTestId("week-tracker")).getAllByRole("listitem").map((li) => li.getAttribute("data-state"));
    expect(states).toEqual(["missed", "missed", "done", "done", "done", "done", "today"]);
    const nm = screen.getByTestId("next-milestone");
    expect(nm).toHaveTextContent("5 / 7 days");
    expect(nm).toHaveTextContent("Days Remaining: 2");
    expect(nm).toHaveTextContent("Bonus Points: 30");
  });

  it("the button stays disabled until read, shuffled and revealed", async () => {
    api.horoscope.mockResolvedValue(SUMMARY);
    const { rerender } = wrap(<HoroscopeStreakPanel sign="Aries" steps={{ read: true, shuffled: false, revealed: false }} />);
    const btn = await screen.findByTestId("complete-horoscope");
    expect(btn).toBeDisabled();
    expect(api.completeHoroscope).not.toHaveBeenCalled();
    void rerender;
  });

  it("completing sends only the sign, date and steps (never points), then shows daily points and the milestone bonus separately", async () => {
    api.horoscope.mockResolvedValue({ ...SUMMARY, currentStreak: 6, nextMilestone: { days: 7, bonus: 30, progress: 6, remaining: 1 } });
    api.completeHoroscope.mockResolvedValue({
      alreadyCompleted: false, awarded: { daily: 10, milestone: { days: 7, bonus: 30 } }, balance: 350,
      summary: { ...SUMMARY, completedToday: true, currentStreak: 7, totalDays: 22, todayPoints: 40, totalPoints: 350, nextMilestone: { days: 14, bonus: 50, progress: 7, remaining: 7 } },
    });
    wrap(<HoroscopeStreakPanel sign="Aries" readingDate="2026-11-12" steps={ALL} />);
    fireEvent.click(await screen.findByTestId("complete-horoscope"));
    await screen.findByTestId("completed-state");
    expect(api.completeHoroscope).toHaveBeenCalledTimes(1);
    expect(api.completeHoroscope).toHaveBeenCalledWith({ sign: "aries", horoscopeDate: "2026-11-12", steps: ALL });
    expect(screen.getByText("Today's Horoscope Completed")).toBeInTheDocument();
    expect(screen.getByTestId("earned")).toHaveTextContent("Daily points: +10");
    expect(screen.getByTestId("earned-bonus")).toHaveTextContent("7-day streak bonus: +30");
    expect(screen.getByTestId("total-points")).toHaveTextContent("350"); // refreshed from the server
    expect(screen.queryByTestId("complete-horoscope")).toBeNull(); // no second completion today
    expect(screen.getByTestId("completed-state")).toHaveTextContent(/Come back tomorrow to continue your streak/);
  });

  it("when already completed today it says so and offers no button", async () => {
    api.horoscope.mockResolvedValue({ ...SUMMARY, completedToday: true });
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    await screen.findByTestId("completed-state");
    expect(screen.queryByTestId("complete-horoscope")).toBeNull();
    expect(screen.queryByTestId("earned")).toBeNull();
  });

  it("an API failure shows an error, no success and no points; the button remains for a retry", async () => {
    api.horoscope.mockResolvedValue(SUMMARY);
    api.completeHoroscope.mockRejectedValueOnce(new AuthApiError("boom", 500));
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    fireEvent.click(await screen.findByTestId("complete-horoscope"));
    expect(await screen.findByTestId("complete-error")).toHaveTextContent(/no points were added/);
    expect(screen.queryByTestId("completed-state")).toBeNull();
    expect(screen.getByTestId("total-points")).toHaveTextContent("310");
    api.completeHoroscope.mockResolvedValueOnce({ alreadyCompleted: false, awarded: { daily: 10, milestone: null }, balance: 320, summary: { ...SUMMARY, completedToday: true, totalPoints: 320, todayPoints: 10 } });
    fireEvent.click(screen.getByTestId("complete-horoscope"));
    await screen.findByTestId("completed-state");
    expect(api.completeHoroscope).toHaveBeenCalledTimes(2);
  });

  it("a date change (409) gets its own message", async () => {
    api.horoscope.mockResolvedValue(SUMMARY);
    api.completeHoroscope.mockRejectedValueOnce(new AuthApiError("changed", 409));
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    fireEvent.click(await screen.findByTestId("complete-horoscope"));
    expect(await screen.findByTestId("complete-error")).toHaveTextContent(/date has changed/);
  });

  it("a failed load shows an error with Try again", async () => {
    api.horoscope.mockRejectedValue(new AuthApiError("x", 500));
    wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    expect(await screen.findByTestId("streak-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

const KSUM: KarmaSummary = { today: "2026-11-12", todayPoints: 13, totalPoints: 120, currentStreak: 4, bestStreak: 6, totalDays: 10, awardedToday: ["mantra"], nextMilestone: { days: 7, bonus: 25, progress: 4, remaining: 3 } };

describe("Karma Reward Points summary", () => {
  it("shows points, streaks and the next milestone, and explains score vs Reward Points", () => {
    render(<MemoryRouter><KarmaRewardsSummary summary={KSUM} signedIn isError={false} last={null} onRetry={() => {}} /></MemoryRouter>);
    const el = screen.getByTestId("karma-rewards");
    for (const x of ["Reward Points", "Points Earned Today", "Total Karma Points", "Current Karma Streak", "Best Karma Streak", "Practice Score is your daily progress out of 100. Reward Points are what you earn for practising"]) expect(el).toHaveTextContent(x);
    expect(el).toHaveTextContent("120");
    expect(screen.getByTestId("karma-next")).toHaveTextContent("4 / 7 days");
    expect(screen.getByTestId("tz-note")).toHaveTextContent("India Standard Time (IST)");
  });
  it("signed out: a prompt, and an error state with retry", () => {
    const { rerender } = render(<MemoryRouter><KarmaRewardsSummary signedIn={false} isError={false} last={null} onRetry={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("karma-rewards-signin")).toBeInTheDocument();
    const retry = vi.fn();
    rerender(<MemoryRouter><KarmaRewardsSummary signedIn isError last={null} onRetry={retry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });
  it("announces points just earned and a milestone", () => {
    render(<MemoryRouter><KarmaRewardsSummary summary={KSUM} signedIn isError={false} last={{ practices: ["mantra"], points: 8, milestone: { days: 7, bonus: 25 } }} onRetry={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("karma-just-earned")).toHaveTextContent("+8 Reward Points");
    expect(screen.getByTestId("karma-just-earned")).toHaveTextContent("7-day streak bonus: +25");
  });
});

describe("useKarmaRewards", () => {
  const Probe = ({ id }: { id: string }) => { const w = useKarmaRewards(); return <button onClick={() => void w.award(id)}>tick</button>; };
  it("sends only the practice id, and a failed call is swallowed (the score is unaffected)", async () => {
    api.karma.mockResolvedValue(KSUM);
    api.karmaPractices.mockRejectedValueOnce(new Error("down"));
    wrap(<Probe id="mantra" />);
    fireEvent.click(screen.getByText("tick"));
    await waitFor(() => expect(api.karmaPractices).toHaveBeenCalledWith(["mantra"]));
  });
  it("does nothing when signed out", () => {
    signOut();
    wrap(<Probe id="mantra" />);
    fireEvent.click(screen.getByText("tick"));
    expect(api.karmaPractices).not.toHaveBeenCalled();
  });
});

describe("Reward Points page", () => {
  it("shows total, horoscope and karma points and the transactions with source and date", async () => {
    api.rewards.mockResolvedValue({ balance: 40, bySource: [{ source: "horoscope_daily", points: 10, count: 1 }, { source: "karma_practice", points: 8, count: 1 }, { source: "karma_milestone", points: 22, count: 1 }] });
    api.transactions.mockResolvedValue({ items: [{ id: "a", source: "horoscope_daily", refKey: "2026-11-12", points: 10, createdAt: "2026-11-12T05:00:00.000Z" }, { id: "b", source: "mystery", refKey: "x", points: 5, createdAt: "2026-11-11T05:00:00.000Z" }], page: 1, pageSize: 20, total: 2, totalPages: 1 });
    wrap(<RewardsPage />);
    const page = await screen.findByTestId("rewards-page");
    await screen.findByTestId("rewards-table");
    expect(page).toHaveTextContent("My Reward Points");
    expect(page).toHaveTextContent("40");
    const rows = within(screen.getByTestId("rewards-table")).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Daily Horoscope"); expect(rows[0]).toHaveTextContent("+10"); expect(rows[0]).toHaveTextContent("2026");
    expect(rows[1]).toHaveTextContent("Other"); // an unknown future source still renders
    expect(page).toHaveTextContent(/can't be redeemed or spent/);
  });
  it("empty state and load failure", async () => {
    api.rewards.mockResolvedValue({ balance: 0, bySource: [] });
    api.transactions.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
    const first = wrap(<RewardsPage />);
    expect(await screen.findByTestId("rewards-empty")).toBeInTheDocument();
    first.unmount();
    api.rewards.mockRejectedValue(new Error("x"));
    wrap(<RewardsPage />);
    expect(await screen.findByTestId("rewards-error")).toBeInTheDocument();
  });
});

describe("translations", () => {
  const dict = (c: string) => JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "locales", `${c}.json`), "utf8")).points;
  it("every points string exists in all ten languages with the same placeholders and no raw keys on screen", async () => {
    const flat = (o: Record<string, unknown>, p = ""): [string, string][] => Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v] as [string, string]] : flat(v as Record<string, unknown>, `${p}${k}.`)));
    const en = flat(dict("en"));
    expect(en.length).toBeGreaterThan(60);
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join();
    for (const l of LOCALES) {
      const d = new Map(flat(dict(l.code)));
      for (const [k, v] of en) { expect(d.get(k), `${l.code}.${k}`).toBeTruthy(); expect(ph(d.get(k)!), `${l.code}.${k}`).toBe(ph(v)); expect(d.get(k)!, `${l.code}.${k} digits`).not.toMatch(/[०-९০-৯௦-௯౦-౯೦-೯൦-൯੦-੯૦-૯]/); }
    }
    api.horoscope.mockResolvedValue(SUMMARY);
    await act(async () => { await setLanguage("ta"); });
    const { container } = wrap(<HoroscopeStreakPanel sign="Aries" steps={ALL} />);
    await screen.findByTestId("streak-panel");
    expect(container.textContent).not.toMatch(/points\.[a-z]+\./);
    expect(container.textContent).toContain(dict("ta").horoscope.dailyStreak);
  });
});

describe("routes and sidebar keep Reward Points apart from the Coins Wallet", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");
  it("Reward Points live at /dashboard/rewards and never claim /dashboard/wallet", () => {
    const app = src("App.tsx");
    expect(app).toMatch(/<Route path="rewards" element=\{.*<RewardPoints \/>/);
    expect(app).not.toMatch(/<Route path="wallet".*<RewardPoints/);
    const layout = src("features/dashboard/DashboardLayout.tsx");
    expect(layout).toContain('{ to: "/dashboard/rewards", label: "Reward Points"');
    expect(layout).toContain('"/dashboard/rewards": "Reward Points"');
    expect(layout).not.toMatch(/to: "\/dashboard\/wallet", label: "(Points Wallet|Reward Points)"/);
  });
  it("every link in the points UI goes to /dashboard/rewards, and the API client uses /me/rewards, not /me/wallet", () => {
    for (const f of ["features/points/HoroscopeStreakPanel.tsx", "features/points/KarmaRewardsSummary.tsx", "features/points/RewardsPage.tsx", "features/points/api.ts"]) expect(src(f), f).not.toMatch(/dashboard\/wallet|\/me\/wallet|\/api\/wallet/);
    const api = src("features/points/api.ts");
    expect(api).toContain('"/me/rewards"');
    expect(api).toContain("/me/rewards/transactions");
  });
});
