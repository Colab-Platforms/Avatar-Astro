import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import InnerVoiceDashboard from "@/pages/InnerVoiceDashboard";
import { useAuthStore } from "@/store/authStore";
import { ACTIONS, MAX_POINTS, localDateKey } from "@/lib/karmaScore";

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => ({}), set: () => true })) as never;
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
});

const mount = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><InnerVoiceDashboard /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("iv_profile", JSON.stringify({ name: "Asha" }));
  useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
});

describe("Karma Sankhya page", () => {
  it("shows the starting level, a concrete goal and suggestions, and nothing is invented", () => {
    mount();
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    const goal = screen.getByTestId("karma-goal");
    expect(goal).toHaveTextContent("To reach Steady (30+) today");
    expect(within(screen.getByTestId("karma-advice")).getAllByRole("button", { name: /Mark done/ })).toHaveLength(3);
    expect(screen.getByText(/Start with one small practice/)).toBeInTheDocument();
  });

  it("ticking a practice updates the score by exactly its points, and the advice follows", () => {
    mount();
    const feed = ACTIONS.find((a) => a.id === "feed")!;
    fireEvent.click(screen.getByRole("checkbox", { name: feed.name }));
    const expected = Math.round((feed.pts / MAX_POINTS) * 100);
    expect(screen.getByRole("img", { name: `Today's score ${expected} out of 100` })).toBeInTheDocument();
    expect(screen.getByText(`${feed.pts} of ${MAX_POINTS} points · 1 of ${ACTIONS.length} practices`)).toBeInTheDocument();
    // the ticked practice is no longer suggested
    expect(within(screen.getByTestId("karma-advice")).queryByRole("button", { name: `Mark done: ${feed.name}` })).toBeNull();
  });

  it("a suggestion's Mark as done button ticks that practice", () => {
    mount();
    const btn = within(screen.getByTestId("karma-advice")).getAllByRole("button", { name: /Mark done/ })[0];
    const name = btn.getAttribute("aria-label")!.replace("Mark done: ", "");
    fireEvent.click(btn);
    expect(screen.getByRole("checkbox", { name })).toHaveAttribute("aria-checked", "true");
  });

  it("saving adds today to the history, starts a streak and clears the unsaved note", () => {
    mount();
    fireEvent.click(screen.getByRole("checkbox", { name: ACTIONS[0].name }));
    expect(screen.getByText(/Not saved yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Save Today's Score/ }));
    const saved = JSON.parse(localStorage.getItem("iv_karma_v2") || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ date: localDateKey(), actionsCompleted: 1 });
    expect(screen.getByText(/^Saved: \d+\/100$/)).toBeInTheDocument();
    expect(screen.getByText("Day Streak").previousElementSibling).toHaveTextContent("1");
  });

  it("with everything done there is no goal to chase, only a steadiness note", () => {
    mount();
    for (const a of ACTIONS) fireEvent.click(screen.getByRole("checkbox", { name: a.name }));
    expect(screen.queryByTestId("karma-goal")).toBeNull();
    expect(screen.getByText("Full practice")).toBeInTheDocument();
    expect(screen.getByText(/highest level today/)).toBeInTheDocument();
  });
});

describe("Karma Sankhya profile (input) page", () => {
  it("asks for name, date of birth, place of birth and the reason on first use, and saves them", () => {
    localStorage.clear();
    mount();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByPlaceholderText("City, country"), { target: { value: "Pune, India" } });
    fireEvent.change(screen.getByPlaceholderText(/stay consistent/), { target: { value: "Daily steadiness" } });
    fireEvent.click(screen.getByRole("button", { name: /Start Tracking/ }));
    expect(JSON.parse(localStorage.getItem("iv_profile")!)).toMatchObject({ name: "Asha", pob: "Pune, India", reason: "Daily steadiness" });
    expect(screen.getByText("Intention: Daily steadiness")).toBeInTheDocument();
  });

  it("Edit profile brings the form back with the saved values, and Cancel returns to the tracker", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect((screen.getByPlaceholderText("Enter your name") as HTMLInputElement).value).toBe("Asha");
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Asha V" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/ }));
    expect(JSON.parse(localStorage.getItem("iv_profile")!).name).toBe("Asha V");
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Today's Practice Score")).toBeInTheDocument();
  });
});
