import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/guruChat", async (orig) => ({ ...(await orig<object>()), askGuru: vi.fn() }));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import InnerVoiceChat from "@/pages/InnerVoiceChat";
import SignInPrompt from "@/components/SignInPrompt";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { askGuru } from "@/lib/guruChat";
import { useAuthStore } from "@/store/authStore";
import { useSignInPrompt } from "@/lib/authedFetch";
import { saveHandoff, takeHandoff } from "@/lib/guruHandoff";
import { ASTROLOGERS } from "@/data/astrologers";
import { assignPersona, eligibleProfiles, personaInstruction } from "@/lib/guruPersona";

beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  Element.prototype.scrollIntoView = () => {};
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => ({}), set: () => true })) as never;
});

const signIn = () => useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "tok", refreshToken: "ref", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const reply = { type: "gathering" as const, message: "Here is a thoughtful reply." };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  useSignInPrompt.setState({ open: false, pending: null });
  signOut();
  vi.mocked(askGuru).mockResolvedValue(reply);
});

describe("persona assignment", () => {
  it("matches expertise to the question and the feature the user came from", () => {
    const tarot = assignPersona(ASTROLOGERS, "What does my card mean?", "tarot", [], () => 0);
    expect(tarot?.profile.expertise).toContain("Tarot Reading");
    const palm = assignPersona(ASTROLOGERS, "Tell me about my hand", "palm", [], () => 0);
    expect(palm?.profile.expertise.some((e) => e === "Palmistry" || e === "Face Reading")).toBe(true);
  });

  it("does not hand every conversation to the same profile", () => {
    const first = assignPersona(ASTROLOGERS, "hello", undefined, [], () => 0)!;
    const next = assignPersona(ASTROLOGERS, "hello", undefined, [first.profile.id], () => 0)!;
    expect(next.profile.id).not.toBe(first.profile.id);
  });

  it("returns null for an empty list and ignores the invented online flag of placeholder profiles only", () => {
    expect(assignPersona([], "hi")).toBeNull();
    const real = { ...ASTROLOGERS[0], demo: false, online: false };
    const sample = { ...ASTROLOGERS[1], demo: true, online: false };
    expect(eligibleProfiles([real])).toEqual([]); // a real profile that is offline is skipped
    expect(eligibleProfiles([sample])).toEqual([sample]); // availability of a placeholder is not real data
  });

  it("frames the answer as AI-guided and never as a human", () => {
    const text = personaInstruction(assignPersona(ASTROLOGERS, "career", undefined, [], () => 0));
    expect(text).toMatch(/You are an AI/);
    expect(text).toMatch(/Never say or imply that you are a human/);
    expect(personaInstruction(null)).toBe("");
  });
});

describe("handoff storage", () => {
  it("is read once, only for the same user, and not after it expires", () => {
    signIn();
    saveHandoff({ question: "q?", feature: "tarot", featureName: "Tarot Drishti", context: "ctx" });
    expect(takeHandoff()?.question).toBe("q?");
    expect(takeHandoff()).toBeNull(); // consumed

    saveHandoff({ question: "q?", feature: "tarot", featureName: "Tarot Drishti", context: "ctx" });
    useAuthStore.setState({ user: { id: "someone-else" } as never });
    expect(takeHandoff()).toBeNull(); // another account never sees it

    useAuthStore.setState({ user: { id: "u1" } as never });
    saveHandoff({ question: "old", feature: "x", featureName: "X", context: "" });
    const stored = JSON.parse(sessionStorage.getItem("guru:handoff")!);
    sessionStorage.setItem("guru:handoff", JSON.stringify({ ...stored, at: Date.now() - 31 * 60 * 1000 }));
    expect(takeHandoff()).toBeNull();
  });
});

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;
const mountAsk = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/birth-chart"]}>
        <SignInPrompt />
        <Where />
        <Routes>
          <Route path="/birth-chart" element={<AskDivyaSection feature="birthChart" context="Chandra Rashi: Karka" />} />
          <Route path="/inner-voice/chat" element={<div>chat page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Need More Guidance? box", () => {
  it("shows the approved wording", () => {
    mountAsk();
    expect(screen.getByRole("heading", { name: "Need More Guidance?" })).toBeInTheDocument();
    expect(screen.getByText("Have more questions about your reading? Connect with Divya Margdarshak for deeper guidance.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask a question about your result...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask Divya" })).toBeInTheDocument();
  });

  it("validates an empty question", () => {
    signIn();
    mountAsk();
    fireEvent.click(screen.getByRole("button", { name: "Ask Divya" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please write your question first.");
    expect(screen.getByTestId("where")).toHaveTextContent("/birth-chart");
  });

  it("signed in: goes to Divya Margdarshak carrying the question and result summary", () => {
    signIn();
    mountAsk();
    fireEvent.change(screen.getByPlaceholderText("Ask a question about your result..."), { target: { value: "What does my Moon sign mean?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask Divya" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/inner-voice/chat");
    expect(window.location.search).toBe(""); // nothing in the URL
    expect(takeHandoff()).toMatchObject({ question: "What does my Moon sign mean?", feature: "birthChart", context: "Chandra Rashi: Karka" });
  });

  it("signed out: opens the central sign-in gate, keeps the question, and continues after login", async () => {
    mountAsk();
    fireEvent.change(screen.getByPlaceholderText("Ask a question about your result..."), { target: { value: "What does my Moon sign mean?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask Divya" }));
    expect(await screen.findByTestId("signin-gate")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/birth-chart");
    expect(sessionStorage.getItem("guru:handoff")).toBeNull(); // nothing carried over before login
    expect(screen.getByPlaceholderText("Ask a question about your result...")).toHaveValue("What does my Moon sign mean?");

    act(() => signIn());
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/inner-voice/chat"));
    expect(takeHandoff()?.question).toBe("What does my Moon sign mean?");
  });
});

const mountChat = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/inner-voice/chat"]}>
        <SignInPrompt />
        <InnerVoiceChat />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Divya Margdarshak conversation", () => {
  const handoff = { question: "Will Saturn affect my career?", feature: "birthChart", featureName: "Janma Kundali", context: "Chandra Rashi: Karka. Lagna: Vrishabha." };

  it("has no hardcoded human identity or invented statistics", () => {
    signIn();
    mountChat();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Rameshwar|Pandit Ji|40\+|120K|12K\+ Reviews|Online · Available/);
    expect(screen.getByTestId("persona-header")).toHaveTextContent("Divya Margdarshak");
  });

  it("signed in: searches, assigns a profile, answers once using the profile's expertise and the result context", async () => {
    signIn();
    saveHandoff(handoff);
    mountChat();

    expect(await screen.findByTestId("searching-guru")).toHaveTextContent("Searching for an available Guru...");
    expect(screen.getByTestId("searching-guru")).toHaveTextContent("Finding the right guidance for your question.");
    expect(screen.getByText("Will Saturn affect my career?")).toBeInTheDocument();

    expect(await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByTestId("searching-guru")).toBeNull();
    expect(askGuru).toHaveBeenCalledTimes(1);
    const [, sent, , , extra] = vi.mocked(askGuru).mock.calls[0];
    expect(sent).toBe("Will Saturn affect my career?");
    expect(extra).toContain("Lean your guidance toward this area of expertise");
    expect(extra).toContain("You are an AI guide");
    expect(extra).toContain("Chandra Rashi: Karka. Lagna: Vrishabha.");
    expect(extra).toContain("Janma Kundali");

    // The assigned profile comes from the astrologer data and is labelled AI-guided, with no online status.
    const card = screen.getByTestId("persona-card");
    expect(ASTROLOGERS.some((a) => card.textContent?.includes(a.name))).toBe(true);
    expect(within(card).getByTestId("ai-guided-label")).toHaveTextContent("AI-guided response based on this astrologer's area of expertise");
    expect(document.body.textContent).not.toMatch(/Online ·|Available for Consultation/);
    expect(screen.getByTestId("result-context-note")).toHaveTextContent("Janma Kundali");
  });

  it("a follow-up keeps the same profile, shows no new search, and still sends the context", async () => {
    signIn();
    saveHandoff(handoff);
    mountChat();
    await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 });
    const nameBefore = screen.getByTestId("persona-header").textContent;

    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "And what about relationships?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("searching-guru")).toBeNull();
    expect(screen.getByTestId("persona-header").textContent).toBe(nameBefore);
    expect(vi.mocked(askGuru).mock.calls[1][4]).toContain("Chandra Rashi: Karka");
    expect(vi.mocked(askGuru).mock.calls[1][0].length).toBeGreaterThan(0); // earlier messages are sent as history
  });

  it("signed out: nothing is sent before login; after login the question is answered once", async () => {
    saveHandoff(handoff);
    mountChat();
    expect(await screen.findByTestId("signin-gate")).toBeInTheDocument();
    expect(askGuru).not.toHaveBeenCalled();
    expect(screen.queryByText("Here is a thoughtful reply.")).toBeNull();

    act(() => signIn());
    expect(await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(askGuru).toHaveBeenCalledTimes(1);
  });

  it("without a handoff nothing is sent and the welcome screen shows the FAQ", () => {
    signIn();
    mountChat();
    expect(askGuru).not.toHaveBeenCalled();
    expect(screen.getByText("What kinds of questions can I ask?")).toBeInTheDocument();
  });
});
