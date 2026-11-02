import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
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
import { guruTiming } from "@/lib/guruTiming";
import * as karmaCalendar from "@/lib/karmaCalendar";

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

// The tests run without the visual waits; the timing tests below set their own values.
const REAL_TIMING = { ...guruTiming };
const fastTiming = () => Object.assign(guruTiming, { searchMinMs: 0, typingMinMs: 0, typingPerCharMs: 0, typingMaxMs: 0 });

beforeEach(() => {
  fastTiming();
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

/** Mounts the chat and waits for the guru search to finish and a profile to be assigned. */
const mountReady = async () => {
  mountChat();
  await screen.findByTestId("persona-header", {}, { timeout: 4000 });
};

describe("Divya Margdarshak conversation", () => {
  const handoff = { question: "Will Saturn affect my career?", feature: "birthChart", featureName: "Janma Kundali", context: "Chandra Rashi: Karka. Lagna: Vrishabha." };

  it("has no hardcoded human identity or invented statistics", () => {
    signIn();
    mountChat();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Rameshwar|Pandit Ji|40\+|120K|12K\+ Reviews|Online · Available/);
    // The product name appears once (sidebar); no profile card or header before a guru is assigned.
    expect(screen.queryByTestId("persona-header")).toBeNull();
    expect(screen.queryByTestId("persona-card")).toBeNull();
    expect(screen.getAllByText("Divya Margdarshak").length).toBeLessThanOrEqual(2); // sidebar name and the composer label
  });

  it("signed in: searches, assigns a profile, answers once using the profile's expertise and the result context", async () => {
    signIn();
    guruTiming.searchMinMs = 800; // long enough to see the searching screen
    saveHandoff(handoff);
    mountChat();

    const searching = await screen.findByTestId("searching-guru");
    expect(searching).toHaveTextContent("Searching for an available Guru...");
    expect(screen.getByTestId("searching-status")).toHaveTextContent("Finding an available Guru...");
    expect(askGuru).not.toHaveBeenCalled(); // nothing is asked until a profile is assigned

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
    expect(within(card).getByTestId("ai-guided-label")).toHaveTextContent("Guided response based on this astrologer's area of expertise");
    expect(document.body.textContent).not.toMatch(/Online ·|Available for Consultation/);
    expect(screen.getByText("Will Saturn affect my career?")).toBeInTheDocument();
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

  it("without a handoff nothing is sent and the welcome screen has no FAQ", async () => {
    signIn();
    await mountReady();
    expect(askGuru).not.toHaveBeenCalled();
    expect(screen.queryByText("What kinds of questions can I ask?")).toBeNull();
    expect(screen.queryByText(/frequently asked/i)).toBeNull();
  });
});

describe("redesigned welcome screen", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u1", firstName: "Asha", lastName: "Verma" } as never, accessToken: "tok", refreshToken: "ref", isAuthenticated: true });
  });

  it("greets the signed-in user by name with the quote, and shows one frame with five topics and the composer", async () => {
    await mountReady();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Namaste, Asha Verma");
    expect(screen.getByTestId("guru-quote")).toHaveTextContent("Trust the universe. Your karma guides you, and your inner voice shows the way.");
    const frame = screen.getByTestId("guru-frame");
    const topics = within(frame).getAllByRole("radio").map((r) => r.textContent);
    expect(topics).toEqual(["Career & Finance", "Relationships", "Health", "Spiritual Growth", "Life Path"]);
    expect(within(frame).getByPlaceholderText("Ask Divya Margdarshak anything...")).toBeInTheDocument();
    expect(within(frame).getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("removes the feature pills, the three tabs, and ordinary emoji", async () => {
    await mountReady();
    for (const t of ["Vedic Astrology", "Palm Reading", "Kundli", "Numerology", "Consultation Mode", "Voice Consultation Mode"]) {
      expect(screen.queryByRole("button", { name: t })).toBeNull();
    }
    expect(screen.queryByRole("tab")).toBeNull();
    expect(document.body.textContent).not.toMatch(/bAIb/);
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  }, 20000);

  it("a topic has a clear selected state, offers starters, and steers the answer without adding facts", async () => {
    await mountReady();
    const career = screen.getByRole("radio", { name: "Career & Finance" });
    expect(career).toHaveAttribute("aria-checked", "false");
    fireEvent.click(career);
    expect(career).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(screen.getByTestId("topic-starters")).getAllByRole("button")[0]);
    const box = screen.getByLabelText("Message Divya Margdarshak") as HTMLTextAreaElement;
    expect(box.value).toMatch(/career/i);

    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(vi.mocked(askGuru).mock.calls[0][4]).toContain("Topic chosen by the user: Career & Finance");
    expect(vi.mocked(askGuru).mock.calls[0][4]).toContain("Do not give financial, investment or legal advice");
  });

  it("clicking the selected topic again clears it", async () => {
    await mountReady();
    const rel = screen.getByRole("radio", { name: "Relationships" });
    fireEvent.click(rel);
    fireEvent.click(rel);
    expect(rel).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByTestId("topic-starters")).toBeNull();
  });
});

describe("active guru search on entry", () => {
  beforeEach(() => signIn());

  it("starts searching on entry, then opens with the assigned profile's real name and avatar, without sending anything", async () => {
    mountChat();
    expect(screen.getByTestId("searching-guru")).toHaveTextContent("Searching for an available Guru...");
    const header = await screen.findByTestId("persona-header", {}, { timeout: 4000 });
    expect(screen.queryByTestId("searching-guru")).toBeNull();
    expect(ASTROLOGERS.some((a) => header.textContent?.includes(a.name))).toBe(true);
    expect(within(header).getByRole("img", { hidden: true }) ?? header).toBeTruthy();
    expect(screen.getByLabelText("Message Divya Margdarshak")).toBeInTheDocument();
    expect(askGuru).not.toHaveBeenCalled();
  });

  it("keeps the same assigned profile for the whole conversation", async () => {
    await mountReady();
    const name = screen.getByTestId("persona-header").textContent;
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 });
    expect(screen.getByTestId("persona-header").textContent).toBe(name);
    expect(screen.getAllByTestId("persona-header")).toHaveLength(1);
  });

  it("never assigns an offline profile", () => {
    const pool = ASTROLOGERS.map((a) => ({ ...a, demo: false, online: a.id === "a2" }));
    for (let i = 0; i < 20; i++) expect(assignPersona(pool, "hello", undefined, [], Math.random)?.profile.id).toBe("a2");
    expect(assignPersona(pool.map((a) => ({ ...a, online: false })), "hello")).toBeNull();
  });

  it("shows a friendly message with a retry, and no chat, when no profile is available", async () => {
    const mod = await import("@/data/astrologers");
    const saved = mod.ASTROLOGERS.splice(0, mod.ASTROLOGERS.length);
    try {
      mountChat();
      const none = await screen.findByTestId("no-guru", {}, { timeout: 4000 });
      expect(none).toHaveTextContent("No Guru is currently available.");
      expect(none).toHaveTextContent("Please try again shortly.");
      expect(screen.queryByTestId("persona-header")).toBeNull();
      expect(screen.queryByLabelText("Message Divya Margdarshak")).toBeNull();
      expect(askGuru).not.toHaveBeenCalled();
      mod.ASTROLOGERS.push(...saved); // a profile comes online
      fireEvent.click(within(none).getByRole("button", { name: "Try again" }));
      expect(await screen.findByTestId("persona-header", {}, { timeout: 4000 })).toBeInTheDocument();
    } finally {
      if (mod.ASTROLOGERS.length === 0) mod.ASTROLOGERS.push(...saved);
    }
  });

  it("a handoff question waits for the assignment, then is sent once", async () => {
    saveHandoff({ question: "Will Saturn affect my career?", feature: "birthChart", featureName: "Janma Kundali", context: "ctx" });
    mountChat();
    await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 });
    expect(askGuru).toHaveBeenCalledTimes(1);
  });
});

describe("back button", () => {
  beforeEach(() => signIn());

  it("is on the header and returns to the parent page when there is no earlier page", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/inner-voice/chat"]}>
          <Routes>
            <Route path="/inner-voice/chat" element={<InnerVoiceChat />} />
            <Route path="/inner-voice" element={<div>Know Your Karma page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(await screen.findByText("Know Your Karma page")).toBeInTheDocument();
  });
});

describe("typing indicator", () => {
  it("shows '<Guru> is typing' after a message is sent, and the reply only arrives after a short moment", async () => {
    signIn();
    await mountReady();
    Object.assign(guruTiming, { typingMinMs: 600, typingPerCharMs: 0, typingMaxMs: 600 });
    const name = ASTROLOGERS.find((a) => screen.getByTestId("persona-header").textContent?.includes(a.name))!.name;
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    const typing = await screen.findByTestId("guru-typing");
    expect(typing).toHaveTextContent(`${name} is typing`);
    expect(screen.queryByText("Here is a thoughtful reply.")).toBeNull(); // the answer is held back although it is ready
    expect(await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByTestId("guru-typing")).toBeNull();
  });
});

describe("Guru search and typing timing", () => {
  beforeEach(() => signIn());
  afterAll(() => Object.assign(guruTiming, REAL_TIMING));

  it("the real defaults are about 5 seconds of searching and 1 to 5 seconds of typing", () => {
    expect(REAL_TIMING.searchMinMs).toBe(5000);
    expect(REAL_TIMING.typingMinMs).toBe(1000);
    expect(REAL_TIMING.typingMaxMs).toBe(5000);
  });

  it("shows 'Searching for an available Guru...' straight away and keeps it up for at least the minimum time, then opens with the real Guru", async () => {
    guruTiming.searchMinMs = 700;
    const t0 = Date.now();
    mountChat();
    expect(screen.getByTestId("searching-guru")).toHaveTextContent("Searching for an available Guru...");
    await new Promise((r) => setTimeout(r, 350));
    expect(screen.queryByTestId("persona-header")).toBeNull(); // still searching, although a Guru was found at once
    const header = await screen.findByTestId("persona-header", {}, { timeout: 3000 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(650);
    expect(ASTROLOGERS.some((a) => header.textContent?.includes(a.name))).toBe(true);
    expect(screen.queryByTestId("searching-guru")).toBeNull();
  });

  it("when no Guru is available the message shows at once, without waiting out the minimum", async () => {
    guruTiming.searchMinMs = 5000;
    const mod = await import("@/data/astrologers");
    const saved = mod.ASTROLOGERS.splice(0, mod.ASTROLOGERS.length);
    try {
      mountChat();
      const none = await screen.findByTestId("no-guru", {}, { timeout: 1500 });
      expect(none).toHaveTextContent("No Guru is currently available.");
      guruTiming.searchMinMs = 0;
      mod.ASTROLOGERS.push(...saved);
      fireEvent.click(within(none).getByRole("button", { name: "Try again" }));
      expect(await screen.findByTestId("persona-header", {}, { timeout: 2000 })).toBeInTheDocument();
    } finally {
      if (mod.ASTROLOGERS.length === 0) mod.ASTROLOGERS.push(...saved);
    }
  });

  it("only one search runs, and the same Guru stays for the whole conversation", async () => {
    guruTiming.searchMinMs = 300;
    mountChat();
    const found = await screen.findByTestId("persona-header", {}, { timeout: 3000 });
    const name = found.textContent;
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 3000 });
    expect(screen.getAllByTestId("persona-header")).toHaveLength(1);
    expect(screen.getByTestId("persona-header").textContent).toBe(name);
  });

  it("the reply waits for the typing time, but the request itself is sent immediately", async () => {
    await mountReady();
    Object.assign(guruTiming, { typingMinMs: 700, typingPerCharMs: 0, typingMaxMs: 700 });
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    const t0 = Date.now();
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1), { timeout: 300 }); // sent at once, not after the animation
    expect(await screen.findByTestId("guru-typing")).toBeInTheDocument();
    expect(screen.queryByText("Here is a thoughtful reply.")).toBeNull(); // ready, but held until the typing time is over
    await screen.findByText("Here is a thoughtful reply.", {}, { timeout: 3000 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(650);
    expect(screen.queryByTestId("guru-typing")).toBeNull();
  });

  it("a slow reply is shown as soon as it arrives, with no extra wait added", async () => {
    await mountReady();
    Object.assign(guruTiming, { typingMinMs: 200, typingPerCharMs: 0, typingMaxMs: 200 });
    vi.mocked(askGuru).mockImplementation(() => new Promise((r) => setTimeout(() => r({ type: "gathering", message: "Slow but real answer." }), 900)));
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    const t0 = Date.now();
    fireEvent.keyDown(box, { key: "Enter" });
    await screen.findByText("Slow but real answer.", {}, { timeout: 3000 });
    expect(Date.now() - t0).toBeLessThan(1500); // about 900 ms, not 900 + 200
  });

  it("an API failure clears the typing indicator at once and offers Try again, with no invented answer", async () => {
    await mountReady();
    Object.assign(guruTiming, { typingMinMs: 3000, typingPerCharMs: 0, typingMaxMs: 3000 });
    vi.mocked(askGuru).mockRejectedValueOnce(new (await import("@/lib/guruChat")).GuruChatError("Divya Margdarshak is unavailable right now. Please try again in a moment."));
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    const t0 = Date.now();
    fireEvent.keyDown(box, { key: "Enter" });
    await screen.findByText(/unavailable right now/, {}, { timeout: 1500 });
    expect(Date.now() - t0).toBeLessThan(1500); // did not wait for the 3 s typing time
    expect(screen.queryByTestId("guru-typing")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("Here is a thoughtful reply.")).toBeNull();
  });
});

describe("verified sources in the answer", () => {
  beforeEach(() => signIn());
  const send = async (text: string) => {
    await mountReady();
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: text } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1), { timeout: 3000 });
    return vi.mocked(askGuru).mock.calls[0];
  };
  const cal = { date: "2026-11-02", place: "New Delhi, India", timezone: "Asia/Kolkata", reckonedAtLocal: "x", vara: "Monday", paksha: "Krishna" as const, masa: "Ashvina", tithi: { name: "Navami", numberInPaksha: 9, endsAtLocal: "x" }, nakshatra: { name: "Ashlesha", pada: 3 }, yoga: "Shukla", karana: "Taitila", sunrise: null, sunset: null, festivals: null, notes: [] };

  it("a Bhagavad Gita style question is given the verified verse and its allowed reference", async () => {
    const [, , , , extra, allowed] = await send("I am very anxious about my exam results and the outcome");
    expect(extra).toContain("Bhagavad Gita, Chapter 2, Verse 47");
    expect(allowed).toEqual(["2.47"]);
  });

  it("a fear question is given the Prahlada story, with no verse or canto number", async () => {
    const [, , , , extra, allowed] = await send("I am afraid and scared of my boss");
    expect(extra).toContain("Prahlada");
    expect(extra).toMatch(/do not give any verse or canto number/);
    expect(allowed).toEqual([]);
  });

  it("a calendar question fetches the verified Panchang and passes only those facts", async () => {
    const spy = vi.spyOn(karmaCalendar, "fetchTodayCalendar").mockResolvedValue(cal);
    const [, , , , extra] = await send("What is today's tithi?");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(extra).toContain("- Tithi: Navami");
    expect(extra).toContain("- Nakshatra: Ashlesha");
    expect(extra).toMatch(/Festivals and auspicious timings are NOT available/);
  });

  it("a calendar question with the calendar down says so, and states no calendar value", async () => {
    vi.spyOn(karmaCalendar, "fetchTodayCalendar").mockResolvedValue(null);
    const [, , , , extra] = await send("Is today a good day, which nakshatra?");
    expect(extra).toMatch(/calendar service is not available right now/);
    expect(extra).not.toContain("- Tithi:");
  });

  it("an unrelated question does not fetch the calendar or mention it", async () => {
    const spy = vi.spyOn(karmaCalendar, "fetchTodayCalendar").mockResolvedValue(cal);
    const [, , , , extra] = await send("How can I be more patient with my children?");
    expect(spy).not.toHaveBeenCalled();
    expect(extra).toMatch(/Do not mention any tithi, nakshatra/);
    expect(extra).not.toContain("- Tithi:");
  });
});

describe("answer formatting", () => {
  it("shows **bold** section headings as bold text, not as asterisks", async () => {
    signIn();
    vi.mocked(askGuru).mockResolvedValue({ type: "gathering", message: "**What this means**\nWe can only do our best.\n\n**Remember**\nEvery honest effort counts." });
    await mountReady();
    const box = screen.getByLabelText("Message Divya Margdarshak");
    fireEvent.change(box, { target: { value: "Hello" } });
    fireEvent.keyDown(box, { key: "Enter" });
    const heading = await screen.findByText("What this means", {}, { timeout: 3000 });
    expect(heading.tagName).toBe("STRONG");
    expect(document.body.textContent).not.toContain("**");
  });
});
