import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The place list is MOCKED; no live location search is made.
vi.mock("@/features/ratna/api", () => ({ ratnaApi: { searchLocations: vi.fn() } }));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import InnerVoiceDashboard from "@/pages/InnerVoiceDashboard";
import { useAuthStore } from "@/store/authStore";
import { ratnaApi } from "@/features/ratna/api";
import { ACTIONS, ALL_ACTIONS, EXTRA_ACTIONS, MAX_POINTS, localDateKey } from "@/lib/karmaScore";

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

const VASAI = { id: "v1", name: "Vasai", admin1: "Maharashtra", country: "India", latitude: 19.39, longitude: 72.84, timezone: "Asia/Kolkata", label: "Vasai, Palghar, Maharashtra, India" };

beforeEach(() => {
  vi.mocked(ratnaApi.searchLocations).mockResolvedValue([VASAI]);
  localStorage.clear();
  localStorage.setItem("iv_profile", JSON.stringify({ name: "Asha" }));
  useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
});

describe("Karma Sankhya page", () => {
  it("shows the starting level and a concrete goal, and the goal's practices are tagged in the list, not repeated with buttons", () => {
    mount();
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    const goal = screen.getByTestId("karma-goal");
    expect(goal).toHaveTextContent("To reach Steady (30+) today");
    expect(screen.getByText(/Start with one small practice/)).toBeInTheDocument();
    // one place to tick: no second "Mark as done" buttons anywhere
    expect(screen.queryByRole("button", { name: /Mark (as )?done/i })).toBeNull();
    // the practices named in the goal carry a "Suggested" tag in Today's Practices
    expect(document.querySelectorAll(".ivd-chip.suggested")).toHaveLength(2);
    for (const id of ["fast", "charity"]) {
      const name = ACTIONS.find((a) => a.id === id)!.name;
      expect(goal).toHaveTextContent(name);
      expect(screen.getByRole("checkbox", { name }).closest(".ivd-action-row")).toHaveClass("suggested");
    }
  });

  it("ticking a practice updates the score by exactly its points, and the advice follows", () => {
    mount();
    const feed = ACTIONS.find((a) => a.id === "feed")!;
    fireEvent.click(screen.getByRole("checkbox", { name: feed.name }));
    const expected = Math.round((feed.pts / MAX_POINTS) * 100);
    expect(screen.getByRole("img", { name: `Today's score ${expected} out of 100` })).toBeInTheDocument();
    expect(screen.getByText(`${feed.pts} of ${MAX_POINTS} points for a full score · 1 practice done`)).toBeInTheDocument();
  });

  it("ticking a suggested practice removes its tag, and the goal moves on", () => {
    mount();
    const fast = ACTIONS.find((a) => a.id === "fast")!;
    const row = () => screen.getByRole("checkbox", { name: fast.name }).closest(".ivd-action-row")!;
    expect(row()).toHaveClass("suggested");
    fireEvent.click(screen.getByRole("checkbox", { name: fast.name }));
    expect(row()).not.toHaveClass("suggested");
    expect(row()).toHaveClass("done");
    expect(row().querySelector(".ivd-chip.suggested")).toBeNull();
  });

  it("Save appears once, with one status line, and the tips do not repeat it", () => {
    mount();
    fireEvent.click(screen.getByRole("checkbox", { name: ACTIONS[0].name }));
    expect(screen.getAllByText(/save today's score/i)).toHaveLength(1); // the button only
    expect(screen.getAllByText(/not saved yet/i)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Save Today's Score/ }));
    expect(screen.queryByText(/not saved yet/i)).toBeNull();
    expect(screen.getAllByText(/^Saved: \d+\/100$/)).toHaveLength(1);
  });

  it("more practices are hidden behind one button, add to the same score, and the score never passes 100", () => {
    mount();
    expect(screen.getByRole("button", { name: new RegExp(`Show ${EXTRA_ACTIONS.length} more practices`) })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("checkbox", { name: EXTRA_ACTIONS[0].name })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /more practices/ }));
    for (const a of EXTRA_ACTIONS) expect(screen.getByRole("checkbox", { name: a.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show fewer practices/ })).toHaveAttribute("aria-expanded", "true");

    const forgive = EXTRA_ACTIONS.find((a) => a.id === "forgive")!;
    fireEvent.click(screen.getByRole("checkbox", { name: forgive.name }));
    const expected = Math.round((forgive.pts / MAX_POINTS) * 100);
    expect(screen.getByRole("img", { name: `Today's score ${expected} out of 100` })).toBeInTheDocument();

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(ALL_ACTIONS.length);
    for (const box of boxes) if (box.getAttribute("aria-checked") !== "true") fireEvent.click(box);
    expect(screen.getByRole("img", { name: "Today's score 100 out of 100" })).toBeInTheDocument(); // capped, not 150
    fireEvent.click(screen.getByRole("button", { name: /Show fewer practices/ }));
    expect(screen.queryByRole("checkbox", { name: EXTRA_ACTIONS[0].name })).toBeNull();
    expect(screen.getByText(`${EXTRA_ACTIONS.length} done`)).toBeInTheDocument(); // the hidden ones that are ticked are still counted
  });

  it("an extra practice already ticked today opens the list on load", () => {
    localStorage.setItem(`iv_done_${localDateKey()}`, JSON.stringify(["gratitude"]));
    mount();
    expect(screen.getByRole("checkbox", { name: EXTRA_ACTIONS.find((a) => a.id === "gratitude")!.name })).toHaveAttribute("aria-checked", "true");
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
  it("asks for name, date of birth, place of birth and the reason on first use, and saves them", async () => {
    localStorage.clear();
    mount();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Vas" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: VASAI.label }));
    fireEvent.change(screen.getByPlaceholderText(/stay consistent/), { target: { value: "Daily steadiness" } });
    fireEvent.click(screen.getByRole("button", { name: /Start Tracking/ }));
    expect(JSON.parse(localStorage.getItem("iv_profile")!)).toMatchObject({ name: "Asha", pob: VASAI.label, reason: "Daily steadiness", place: { latitude: 19.39, longitude: 72.84, timezone: "Asia/Kolkata" } });
    expect(screen.getByText("Intention: Daily steadiness")).toBeInTheDocument();
  });

  it("place of birth is a searchable list of real places: typed text alone is not saved as a place", async () => {
    localStorage.clear();
    mount();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "vasai" } });
    expect(await screen.findByRole("option", { name: VASAI.label })).toBeInTheDocument(); // the list fills after a short pause
    fireEvent.click(screen.getByRole("button", { name: /Start Tracking/ }));
    const saved = JSON.parse(localStorage.getItem("iv_profile")!);
    expect(saved.place).toBeNull();
    expect(saved.pob).toBe(""); // not picked, so nothing is saved as the place
  });

  it("an older profile with typed text keeps it and says how to update it", () => {
    localStorage.setItem("iv_profile", JSON.stringify({ name: "Asha", pob: "vasai" }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByText(/Saved as: vasai/)).toBeInTheDocument();
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
