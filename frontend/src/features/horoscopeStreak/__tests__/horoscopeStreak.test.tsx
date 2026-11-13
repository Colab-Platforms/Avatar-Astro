import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@/i18n/languages";
import { setLanguage } from "@/i18n";
import { useAuthStore } from "@/store/authStore";
import { localDateKey } from "@/lib/karmaScore";
import { STREAK_STORAGE_KEY } from "@/lib/horoscopeStreak";
import HoroscopeStreakPanel from "../HoroscopeStreakPanel";

const ALL = { read: true, shuffled: true, revealed: true };
const signIn = () => useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const dayKey = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return localDateKey(d); };

beforeAll(() => { window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never; });
beforeEach(async () => { localStorage.clear(); signIn(); await act(async () => { await setLanguage("en"); }); });

describe("Horoscope streak panel", () => {
  it("shows an empty streak with a locked button until read, shuffled and revealed", () => {
    render(<HoroscopeStreakPanel steps={{ read: true, shuffled: false, revealed: false }} />);
    expect(screen.getByTestId("complete-horoscope")).toBeDisabled();
    expect(screen.getByTestId("streak-message")).toHaveTextContent("Complete today's horoscope to start your streak.");
    expect(screen.getByTestId("next-milestone")).toHaveTextContent("0 / 3 days");
    expect(screen.getByTestId("device-note")).toHaveTextContent("saved on this device");
  });

  it("has no points, rewards or wallet anywhere on it", () => {
    render(<HoroscopeStreakPanel steps={ALL} />);
    expect(screen.getByTestId("streak-panel").textContent).not.toMatch(/point|reward|wallet|bonus/i);
  });

  it("completing records today once, updates the numbers and removes the button", () => {
    render(<HoroscopeStreakPanel steps={ALL} />);
    fireEvent.click(screen.getByTestId("complete-horoscope"));
    expect(screen.getByTestId("completed-state")).toHaveTextContent("Today's Horoscope Completed");
    expect(screen.getByTestId("completed-state")).toHaveTextContent("Come back tomorrow to continue your streak.");
    expect(screen.queryByTestId("complete-horoscope")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)!)).toEqual([localDateKey()]);
    const states = within(screen.getByTestId("week-tracker")).getAllByRole("listitem").map((li) => li.getAttribute("data-state"));
    expect(states[6]).toBe("done");
    expect(screen.getByTestId("next-milestone")).toHaveTextContent("1 / 3 days");
  });

  it("builds on saved days: yesterday plus today is a streak of 2, with the week and milestone to match", () => {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify([dayKey(2), dayKey(1)]));
    render(<HoroscopeStreakPanel steps={ALL} />);
    fireEvent.click(screen.getByTestId("complete-horoscope"));
    const states = within(screen.getByTestId("week-tracker")).getAllByRole("listitem").map((li) => li.getAttribute("data-state"));
    expect(states.slice(4)).toEqual(["done", "done", "done"]);
    expect(screen.getByTestId("next-milestone")).toHaveTextContent("3 / 7 days"); // 3 in a row now heads for 7
    expect(screen.getByTestId("next-milestone")).toHaveTextContent("Days Remaining: 4");
  });

  it("already completed today: says so and offers no button", () => {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify([dayKey(0)]));
    render(<HoroscopeStreakPanel steps={{ read: false, shuffled: false, revealed: false }} />);
    expect(screen.getByTestId("completed-state")).toBeInTheDocument();
    expect(screen.queryByTestId("complete-horoscope")).toBeNull();
  });

  it("signed out: Complete opens the sign-in prompt and records nothing until signed in", async () => {
    signOut();
    const { useSignInPrompt } = await import("@/lib/authedFetch");
    useSignInPrompt.setState({ open: false, pending: null });
    render(<HoroscopeStreakPanel steps={ALL} />);
    fireEvent.click(screen.getByTestId("complete-horoscope"));
    expect(useSignInPrompt.getState().open).toBe(true);
    expect(localStorage.getItem(STREAK_STORAGE_KEY)).toBeNull();
    signIn();
    act(() => useSignInPrompt.getState().resume()); // the pending completion runs once after sign-in
    expect(JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)!)).toEqual([localDateKey()]);
  });

  it("makes no network request of any kind", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    render(<HoroscopeStreakPanel steps={ALL} />);
    fireEvent.click(screen.getByTestId("complete-horoscope"));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("translations", () => {
  const dict = (c: string) => JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "locales", `${c}.json`), "utf8"));
  it("every streak string exists in all ten languages with the same placeholders, and the old points section is gone", async () => {
    const en = dict("en").streak as Record<string, string>;
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join();
    for (const l of LOCALES) {
      const d = dict(l.code);
      expect(d.points, `${l.code}.points removed`).toBeUndefined();
      for (const [k, v] of Object.entries(en)) { expect(d.streak[k], `${l.code}.${k}`).toBeTruthy(); expect(ph(d.streak[k]), `${l.code}.${k}`).toBe(ph(v)); }
      expect(JSON.stringify(d.streak)).not.toMatch(/[०-९০-৯௦-௯౦-౯೦-೯൦-൯੦-੯૦-૯]/);
    }
    await act(async () => { await setLanguage("ta"); });
    const { container } = render(<HoroscopeStreakPanel steps={ALL} />);
    expect(container.textContent).not.toMatch(/streak\.[a-zA-Z]+/);
    expect(container.textContent).toContain(dict("ta").streak.dailyStreak);
  });
});
