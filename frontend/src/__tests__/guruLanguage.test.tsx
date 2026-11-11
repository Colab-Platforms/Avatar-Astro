/**
 * Divya Margdarshak follows the ONE Bhagya language selector.
 *
 * MOCKED vs REAL: everything here is mocked at the network edge (aiChat, screening and the daily-session gate), so these tests prove
 * the wiring: what the page shows in each language and what it sends. They cannot prove how well a real model writes Tamil. That is
 * checked separately by backend/scripts/guruLiveLanguageCheck.ts, which calls the real provider (see the report).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/guruChat", async (orig) => ({ ...(await orig<object>()), askGuru: vi.fn() }));
vi.mock("@/lib/chatScreen", () => ({ screenChatMessage: vi.fn() }));
vi.mock("@/lib/dailyChatLimit", async (orig) => ({ ...(await orig<object>()), fetchDailyChatStatus: vi.fn(), consumeDailyChatSession: vi.fn() }));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import InnerVoiceChat from "@/pages/InnerVoiceChat";
import SignInPrompt from "@/components/SignInPrompt";
import { GuruUnavailable, SearchingGuru } from "@/components/ai-guru/PersonaCard";
import { askGuru, GuruChatError } from "@/lib/guruChat";
import { screenChatMessage } from "@/lib/chatScreen";
import { fetchDailyChatStatus, consumeDailyChatSession } from "@/lib/dailyChatLimit";
import { useDailyChatLimitStore } from "@/store/dailyChatLimitStore";
import { useAuthStore } from "@/store/authStore";
import { useSignInPrompt } from "@/lib/authedFetch";
import { guruTiming } from "@/lib/guruTiming";
import { ASTROLOGERS } from "@/data/astrologers";
import i18n, { loadLocale, setLanguage } from "@/i18n";
import { LOCALES, STORAGE_KEY, type LocaleCode } from "@/i18n/languages";
import { detectInputLanguage, isInLanguage, replyLanguage, scriptShare } from "@/i18n/aiLanguage";
import en from "@/i18n/locales/en.json";

// Each page test mounts the whole chat; under a busy full run that can exceed the 5 s default.
vi.setConfig({ testTimeout: 30_000 });

const SRC = join(process.cwd(), "src");
const dict = (code: string) => JSON.parse(readFileSync(join(SRC, "i18n", "locales", `${code}.json`), "utf8"));
const NON_EN = LOCALES.filter((l) => l.code !== "en");
const ALL = LOCALES.map((l) => l.code);

/** A real sentence in each language, taken from that language's own dictionary (long enough to judge by script). */
const sample = (code: string): string => dict(code).guru.errors.network as string;
const ENGLISH_PARAGRAPH = "Take a slow breath and think about what matters most to you today. Small honest steps can help you feel steadier.";

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  Element.prototype.scrollIntoView = () => {};
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => ({}), set: () => true })) as never;
});

const REAL_TIMING = { ...guruTiming };
const signIn = () => useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "tok", refreshToken: "ref", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const idle = { status: "NOT_STARTED" as const, allowed: true, remainingSeconds: 0, startedAt: null, expiresAt: null, nextAvailableAt: null };

beforeEach(async () => {
  Object.assign(guruTiming, { searchMinMs: 0, typingMinMs: 0, typingPerCharMs: 0, typingMaxMs: 0 });
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  useSignInPrompt.setState({ open: false, pending: null });
  signOut();
  vi.mocked(askGuru).mockResolvedValue({ type: "gathering", message: "A reply." });
  vi.mocked(screenChatMessage).mockResolvedValue({ action: "ALLOW" });
  vi.mocked(fetchDailyChatStatus).mockResolvedValue(idle);
  vi.mocked(consumeDailyChatSession).mockResolvedValue({ ...idle, status: "ACTIVE", remainingSeconds: 300, startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300_000).toISOString() });
  useDailyChatLimitStore.getState().setSession(idle);
  await act(async () => { await setLanguage("en"); });
  localStorage.removeItem(STORAGE_KEY);
});
afterEach(() => Object.assign(guruTiming, REAL_TIMING));

const mountChat = async () => {
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/inner-voice/chat"]}>
        <SignInPrompt />
        <InnerVoiceChat />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.queryByTestId("guru-restoring")).toBeNull());
  return view;
};
const mountReady = async () => { await mountChat(); await screen.findByTestId("persona-header", {}, { timeout: 4000 }); };
const composer = () => document.querySelector("textarea") as HTMLTextAreaElement;
const typeAndSend = async (text: string) => {
  fireEvent.change(composer(), { target: { value: text } });
  fireEvent.keyDown(composer(), { key: "Enter" });
};

// ── language utilities ──────────────────────────────────────────────────────────────────────────────────────────────
describe("is the reply in the chosen language", () => {
  it.each(ALL)("%s: a real sentence in the language passes, and its script share is high", (code) => {
    const text = code === "en" ? ENGLISH_PARAGRAPH : sample(code);
    expect(isInLanguage(text, code as LocaleCode)).toBe(true);
    expect(scriptShare(text, code as LocaleCode)).toBeGreaterThan(0.85);
  });

  it.each(NON_EN.map((l) => l.code))("%s: an English reply is refused, and so is a reply with an English paragraph", (code) => {
    expect(isInLanguage(ENGLISH_PARAGRAPH, code)).toBe(false);
    expect(isInLanguage(`${sample(code)}\n\n${ENGLISH_PARAGRAPH}`, code)).toBe(false);
  });

  it("names, numbers and a short English term inside a regional-language reply are allowed", () => {
    expect(isInLanguage(`${sample("hi")} (Rohini, 108)`, "hi")).toBe(true);
  });

  it("a regional reply is refused when English was chosen", () => {
    for (const l of NON_EN) expect(isInLanguage(sample(l.code), "en")).toBe(false);
  });

  it("typing language is detected for every script, so users can write in the language they are comfortable with", () => {
    for (const l of NON_EN) {
      const typed = dict(l.code).guru.composer.hint as string;
      const expected = l.code === "mr" ? "hi" : l.code; // Devanagari reads as Hindi/Marathi
      expect(detectInputLanguage(typed.replace(/Enter|Shift|Chrome|Edge/g, ""))).toBe(expected);
    }
    expect(detectInputLanguage("How do I find peace of mind?")).toBe("en");
    expect(detectInputLanguage("mujhe kya karna chahiye")).toBe("hinglish");
  });

  it("the reply language is the explicit selector choice, English if none", async () => {
    expect(replyLanguage()).toBe("en");
    await act(async () => { await setLanguage("kn"); });
    expect(replyLanguage()).toBe("kn");
  });
});

// ── askGuru: language sent, enforced, retried (aiChat mocked) ───────────────────────────────────────────────────────
describe("askGuru enforces the chosen language (aiChat mocked)", () => {
  const real = async () => (await vi.importActual<typeof import("@/lib/guruChat")>("@/lib/guruChat")).askGuru;
  const ok = (message: string) => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: JSON.stringify({ message }) } }] }) }) as Response;
  let aiChatMock: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    const mod = await import("@/lib/aiClient");
    aiChatMock = vi.spyOn(mod, "aiChat") as unknown as ReturnType<typeof vi.fn>;
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(ALL)("%s: sends the language with the request and accepts a reply in that language, in one call", async (code) => {
    const ask = await real();
    aiChatMock.mockResolvedValue(ok(code === "en" ? ENGLISH_PARAGRAPH : sample(code)));
    const turn = await ask([], "How do I find peace?", "typed in English", undefined, "", [], code as LocaleCode);
    expect(turn.message.length).toBeGreaterThan(10);
    expect(aiChatMock).toHaveBeenCalledTimes(1);
    expect(aiChatMock.mock.calls[0][0].language).toBe(code);
  });

  it.each(NON_EN.map((l) => l.code))("%s: an English answer is not shown; the model is asked once more, and a correct second answer is used", async (code) => {
    const ask = await real();
    aiChatMock.mockResolvedValueOnce(ok(ENGLISH_PARAGRAPH)).mockResolvedValueOnce(ok(sample(code)));
    const turn = await ask([], "How do I find peace?", "", undefined, "", [], code);
    expect(turn.message).toBe(sample(code));
    expect(aiChatMock).toHaveBeenCalledTimes(2);
    const second = aiChatMock.mock.calls[1][0].messages.map((m: { content: string }) => m.content).join("\n");
    expect(second).toMatch(/not written in/);
  });

  it.each(NON_EN.map((l) => l.code))("%s: if the model still answers in English, nothing English is shown, only the translated error", async (code) => {
    await loadLocale(code); // the app always has the active language loaded
    const ask = await real();
    aiChatMock.mockResolvedValue(ok(ENGLISH_PARAGRAPH));
    await expect(ask([], "q", "", undefined, "", [], code)).rejects.toThrow(dict(code).guru.errors.wrongLanguage);
    expect(aiChatMock).toHaveBeenCalledTimes(2);
  });

  it("the system prompt no longer pins the reply to English, Hindi or Hinglish", async () => {
    const { GURU_CONSULTATION_SYSTEM } = await import("@/lib/guruChat");
    expect(GURU_CONSULTATION_SYSTEM).not.toMatch(/Hinglish|Roman script/);
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/language instruction/);
    // Scripture and calendar safeguards are untouched.
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/Never invent or guess a verse, chapter number, story, tithi/);
  });

  it("errors are shown in the chosen language", async () => {
    const ask = await real();
    await act(async () => { await setLanguage("ta"); });
    aiChatMock.mockRejectedValue(new Error("offline"));
    await expect(ask([], "q", "", undefined, "", [], "ta")).rejects.toThrow(dict("ta").guru.errors.network);
    aiChatMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);
    await expect(ask([], "q", "", undefined, "", [], "ta")).rejects.toThrow(dict("ta").guru.errors.tooMany);
  });
});

// ── the real page in every language (network edge mocked) ───────────────────────────────────────────────────────────
const ENGLISH_UI = ["What would you like guidance on?", "Ask Divya Margdarshak anything", "Career & Finance", "Spiritual Growth", "Life Path", "Press Enter to send", "Start a conversation", "Open menu", "New Consultation", "Recent Chats", "Saved Remedies", "Remedies Library", "Guided response based on", "You type in", "Guru Ji replies in", "Auto Detect", "Hinglish"];

describe("the chat page follows the central selector in all 10 languages", () => {
  it.each(ALL)("%s: every visible word is in the chosen language and the old language dropdowns are gone", async (code) => {
    signIn();
    await act(async () => { await setLanguage(code as LocaleCode); });
    await mountReady();
    const d = dict(code).guru;
    const t = (k: string, o?: Record<string, string>) => i18n.t(k, o);

    expect(screen.getByTestId("guru-welcome")).toHaveTextContent(t("guru.welcome.greeting", { name: t("guru.sidebar.seeker") }));
    expect(screen.getByTestId("guru-quote")).toHaveTextContent(d.welcome.quote);
    expect(screen.getByText(d.welcome.prompt)).toBeInTheDocument();
    for (const k of ["career", "relationships", "health", "spiritual", "lifePath"]) expect(screen.getByRole("radio", { name: d.topic[k].title })).toBeInTheDocument();
    expect(composer().placeholder).toBe(d.composer.placeholder);
    expect(screen.getByLabelText(d.composer.inputLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(d.composer.voiceStart)).toBeInTheDocument();
    expect(screen.getByLabelText(d.composer.send)).toBeInTheDocument();
    expect(screen.getAllByText(d.sidebar.newConsultation).length).toBeGreaterThan(0);
    expect(screen.getAllByText(d.sidebar.recentChats).length).toBeGreaterThan(0);

    // The assigned Guru keeps their own name, expertise and image.
    const card = screen.getByTestId("persona-card");
    expect(ASTROLOGERS.some((a) => card.textContent?.includes(a.name))).toBe(true);
    expect(screen.getByTestId("ai-guided-label")).toHaveTextContent(d.persona.guidedLabel);

    // Topic starters are the suggested questions.
    fireEvent.click(screen.getByRole("radio", { name: d.topic.career.title }));
    expect(screen.getByRole("button", { name: d.topic.career.s1 })).toBeInTheDocument();

    // No English UI is left, and no separate language controls exist.
    if (code !== "en") for (const phrase of ENGLISH_UI) expect(document.body.textContent).not.toContain(phrase);
    expect(screen.queryByText(/you type in|guru ji replies in/i)).toBeNull();
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it.each(ALL)("%s: the searching screen, the 'no Guru' screen and Retry are translated, and Retry works", async (code) => {
    await act(async () => { await setLanguage(code as LocaleCode); });
    const d = dict(code).guru;
    const s = render(<SearchingGuru />);
    expect(screen.getByTestId("searching-guru")).toHaveTextContent(d.search.title);
    expect(screen.getByTestId("searching-status")).toHaveTextContent(d.search.status1);
    s.unmount();
    const retry = vi.fn();
    render(<GuruUnavailable onRetry={retry} />);
    expect(screen.getByTestId("no-guru")).toHaveTextContent(d.search.none);
    expect(screen.getByTestId("no-guru")).toHaveTextContent(d.search.noneBody);
    fireEvent.click(screen.getByRole("button", { name: dict(code).common.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each(NON_EN.map((l) => l.code))("%s: a question typed in English is sent with this language as the reply language, and the typing indicator is translated", async (code) => {
    signIn();
    await act(async () => { await setLanguage(code); });
    let finish: (v: { type: "gathering"; message: string }) => void = () => {};
    vi.mocked(askGuru).mockImplementation(() => new Promise((r) => { finish = r; }));
    await mountReady();
    await typeAndSend("How can I find peace of mind?");

    const typing = await screen.findByTestId("guru-typing");
    const name = screen.getByTestId("persona-header").textContent!;
    expect(ASTROLOGERS.some((a) => typing.textContent?.includes(a.name) && name.includes(a.name))).toBe(true);
    expect(typing.textContent).toContain(i18n.t("guru.chat.typingNamed", { name: "" }).replace(/\s+$/, "").trim().split(" ").pop() as string);

    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1));
    const args = vi.mocked(askGuru).mock.calls[0];
    expect(args[1]).toBe("How can I find peace of mind?");
    expect(args[2]).toMatch(/appears to be written in English/); // detection kept, as a hint only
    expect(args[2]).toContain(LOCALES.find((l) => l.code === code)!.english); // the reply language is named
    expect(args[6]).toBe(code); // THE SELECTOR'S language, not the typed one

    act(() => finish({ type: "gathering", message: sample(code) }));
    expect(await screen.findByText(sample(code))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("guru-typing")).toBeNull());
  });

  it("with nothing chosen, English is the reply language", async () => {
    signIn();
    await mountReady();
    await typeAndSend("Mujhe shanti chahiye");
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1));
    expect(vi.mocked(askGuru).mock.calls[0][6]).toBe("en");
    expect(vi.mocked(askGuru).mock.calls[0][2]).toMatch(/Hinglish/);
  });

  it("a failed reply offers Retry in the chosen language, and Retry asks again with the same text and language", async () => {
    signIn();
    await act(async () => { await setLanguage("te"); });
    vi.mocked(askGuru).mockRejectedValueOnce(new GuruChatError(dict("te").guru.errors.unavailable));
    await mountReady();
    await typeAndSend("What is dharma?");
    expect(await screen.findByText(dict("te").guru.errors.unavailable)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: dict("te").common.retry }));
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(2));
    expect(vi.mocked(askGuru).mock.calls[1][1]).toBe("What is dharma?");
    expect(vi.mocked(askGuru).mock.calls[1][6]).toBe("te");
  });

  it("a screened message (contact request or off-topic) gets the fixed reply in the chosen language", async () => {
    signIn();
    await act(async () => { await setLanguage("bn"); });
    vi.mocked(screenChatMessage).mockResolvedValue({ action: "ESCALATED", reply: "English server reply" });
    await mountReady();
    await typeAndSend("Please call me");
    expect(await screen.findByText(dict("bn").guru.screen.escalated)).toBeInTheDocument();
    expect(screen.queryByText("English server reply")).toBeNull();
    expect(askGuru).not.toHaveBeenCalled();
  });

  it("when today's free session has ended, the notice and the disabled composer are translated", async () => {
    signIn();
    await act(async () => { await setLanguage("pa"); });
    useDailyChatLimitStore.getState().setSession({ status: "EXPIRED", allowed: false, remainingSeconds: 0, startedAt: null, expiresAt: null, nextAvailableAt: new Date(Date.now() + 3_600_000).toISOString() });
    vi.mocked(fetchDailyChatStatus).mockResolvedValue({ status: "EXPIRED", allowed: false, remainingSeconds: 0, startedAt: null, expiresAt: null, nextAvailableAt: new Date(Date.now() + 3_600_000).toISOString() });
    await mountChat();
    expect(await screen.findByText(new RegExp(dict("pa").guru.limit.ended))).toBeInTheDocument();
    expect(composer().placeholder).toBe(dict("pa").guru.composer.sessionEnded);
  });
});

// ── switching language during an active chat ────────────────────────────────────────────────────────────────────────
describe("changing the language during a chat", () => {
  it("updates the interface at once, keeps every earlier message untouched, and the next reply uses the new language", async () => {
    signIn();
    await act(async () => { await setLanguage("mr"); });
    vi.mocked(askGuru).mockResolvedValueOnce({ type: "gathering", message: sample("mr") });
    await mountReady();
    await typeAndSend("How do I find peace?");
    expect(await screen.findByText(sample("mr"))).toBeInTheDocument();
    expect(composer().placeholder).toBe(dict("mr").guru.composer.placeholder);
    expect(screen.getAllByText(dict("mr").sidebar === undefined ? "" : dict("mr").guru.sidebar.newConsultation).length).toBeGreaterThan(0);

    // The visitor switches to Tamil in the central selector, in the middle of the conversation.
    await act(async () => { await setLanguage("ta"); });
    expect(composer().placeholder).toBe(dict("ta").guru.composer.placeholder); // interface follows immediately
    expect(screen.getByText("How do I find peace?")).toBeInTheDocument(); // earlier messages are not deleted...
    expect(screen.getByText(sample("mr"))).toBeInTheDocument(); // ...nor rewritten or silently translated
    expect(screen.getByTestId("persona-header")).toBeInTheDocument(); // same Guru, same conversation

    vi.mocked(askGuru).mockResolvedValueOnce({ type: "gathering", message: sample("ta") });
    await typeAndSend("And what about my family?");
    expect(await screen.findByText(sample("ta"))).toBeInTheDocument();
    expect(askGuru).toHaveBeenCalledTimes(2);
    const [history, sent, , , , , language] = vi.mocked(askGuru).mock.calls[1];
    expect(language).toBe("ta");
    expect(sent).toBe("And what about my family?");
    expect(history.map((h) => h.content)).toEqual(["How do I find peace?", sample("mr")]); // context preserved, original wording
    expect(screen.getByText(sample("mr"))).toBeInTheDocument();
  });

  it("an existing English reply stays English when the language changes", async () => {
    signIn();
    vi.mocked(askGuru).mockResolvedValueOnce({ type: "gathering", message: "An English answer from earlier." });
    await mountReady();
    await typeAndSend("Hello");
    expect(await screen.findByText("An English answer from earlier.")).toBeInTheDocument();
    await act(async () => { await setLanguage("gu"); });
    expect(screen.getByText("An English answer from earlier.")).toBeInTheDocument();
  });
});

// ── nothing is left hard-coded ──────────────────────────────────────────────────────────────────────────────────────
describe("no hard-coded English in the chat, and the old language system is gone", () => {
  const files = [
    ...readdirSync(join(SRC, "components", "ai-guru")).filter((f) => /\.tsx$/.test(f) && !/^(HeroWelcome|CategoryCards|SuggestedQuestions|AnalysisTimeline|GuruTabs)\./.test(f)).map((f) => join(SRC, "components", "ai-guru", f)),
  ];
  const BANNED = ["Press Enter to send", "Open menu", "Go back", "Recent Chats", "New Consultation", "Saved Remedies", "Remedies Library", "Searching for an available Guru", "No Guru is currently available", "Try again", "Send message", "Ask Divya Margdarshak anything", "is typing", "Vedic Guidance", "years of experience", "Spiritual Assessment Progress", "Generate Diagnosis Report", "Close sidebar"];

  it.each(files.map((f) => [f.replace(SRC, "src"), f] as const))("%s has none of the chat's English texts as literals", (_n, f) => {
    const text = readFileSync(f, "utf8");
    for (const phrase of BANNED) expect(text, phrase).not.toContain(phrase);
  });

  it("the page uses the central language only: no input/reply language state, no dropdowns, no Hinglish default", () => {
    const page = readFileSync(join(SRC, "pages", "InnerVoiceChat.tsx"), "utf8");
    expect(page).not.toMatch(/LanguageControls|setReplyLanguage|setInputLanguage|ReplyLanguageChoice|buildLanguageDirective/);
    expect(page).toMatch(/replyLanguage\(\)/);
    for (const gone of ["LanguageControls.tsx", "LanguageSelector.tsx", "languages.ts"]) {
      expect(existsSync(join(SRC, "components", "ai-guru", gone))).toBe(false);
    }
  });

  it("every dictionary key the chat uses exists in English", () => {
    const keys = new Set<string>();
    const walk = (o: Record<string, unknown>, p = "") => Object.entries(o).forEach(([k, v]) => (typeof v === "string" ? keys.add(p + k) : walk(v as Record<string, unknown>, p + k + ".")));
    walk(en as Record<string, unknown>);
    const used = new Set<string>();
    for (const f of [...files, join(SRC, "pages", "InnerVoiceChat.tsx"), join(SRC, "lib", "guruChat.ts"), join(SRC, "lib", "chatScreen.ts"), join(SRC, "lib", "dailyChatLimit.ts")]) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*["'`]([A-Za-z][\w-]*(?:\.[\w-]+)+)["'`]/g)) used.add(m[1]);
      for (const m of readFileSync(f, "utf8").matchAll(/i18n\.t\(\s*["'`]([A-Za-z][\w-]*(?:\.[\w-]+)+)["'`]/g)) used.add(m[1]);
    }
    // Keys built in code (topic title/starters, search status) are checked explicitly.
    for (const k of ["career", "relationships", "health", "spiritual", "lifePath"]) for (const p of ["title", "s1", "s2"]) used.add(`guru.topic.${k}.${p}`);
    for (const i of [1, 2, 3]) used.add(`guru.search.status${i}`);
    expect([...used].filter((k) => !keys.has(k))).toEqual([]);
    expect(used.size).toBeGreaterThan(40);
  });
});

// ── the in-chat language selector, language requests typed in the chat, and what each Guru can really speak ──────────────────────
import LanguageSelector from "@/components/LanguageSelector";
import { detectLanguageRequest } from "@/i18n/languageRequest";
import { guruLanguages, VERIFIED_GURU_LANGUAGES } from "@/lib/guruLanguages";

const shownLanguages = () => screen.getAllByTestId("language-current").map((e) => e.textContent);
const nativeOf = (code: string) => LOCALES.find((l) => l.code === code)!.native;

describe("the visible language selector in the chat header", () => {
  it("is in the header (no scrolling), shows the current language, lists all ten in their own script, and is the only language control", async () => {
    signIn();
    await mountReady();
    const slot = screen.getByTestId("guru-language");
    expect(slot.closest("header")).not.toBeNull();
    expect(slot).toHaveTextContent("English");
    fireEvent.click(slot.querySelector("button")!);
    for (const l of LOCALES) expect(screen.getByTestId(`language-option-${l.code}`)).toHaveTextContent(l.native);
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it.each(["hi", "ta", "gu"] as const)("choosing %s here changes the one central language, is saved under the one storage key, and the site selector follows", async (code) => {
    signIn();
    render(<LanguageSelector variant="desktop" />); // stands in for the selector in the main navbar
    await mountReady();
    expect(shownLanguages()).toEqual(["English", "English"]);
    const chatSlot = screen.getByTestId("guru-language");
    fireEvent.click(chatSlot.querySelector("button")!);
    await act(async () => { fireEvent.click(chatSlot.querySelector(`[data-testid="language-option-${code}"]`)!); });
    await waitFor(() => expect(i18n.language).toBe(code));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(code);
    expect(shownLanguages()).toEqual([nativeOf(code), nativeOf(code)]);
    const keys = Object.keys(localStorage).filter((k) => /lang/i.test(k));
    expect(keys).toEqual([STORAGE_KEY]); // no separate chat-language storage
  });

  it("and the other way round: changing the language elsewhere updates the chat's selector", async () => {
    signIn();
    await mountReady();
    await act(async () => { await setLanguage("te"); });
    expect(screen.getByTestId("guru-language")).toHaveTextContent(nativeOf("te"));
  });
});

describe("a language request typed in the chat is a preference change, not a topic", () => {
  const REQUESTS: [string, LocaleCode][] = [
    ["Talk in Hindi.", "hi"],
    ["Please reply in Marathi.", "mr"],
    ["Can you speak in Tamil?", "ta"],
    ["Talk in Gujarati.", "gu"],
    ["Please speak in Telugu.", "te"],
    ["हिंदी में जवाब दो।", "hi"],
    ["मराठीत बोला.", "mr"],
    ["தமிழில் பேசுங்கள்.", "ta"],
  ];

  it.each(REQUESTS)("%s -> %s (detected)", (text, code) => {
    expect(detectLanguageRequest(text)).toBe(code);
  });

  it.each(REQUESTS)("%s: the chat switches the central language and the selector, confirms in that language, and never reaches screening, the timer or the model", async (text, code) => {
    signIn();
    await mountReady();
    await typeAndSend(text);
    await waitFor(() => expect(i18n.language).toBe(code));
    const confirmation = i18n.t("voice.languageChanged", { lng: code, language: nativeOf(code) });
    expect(await screen.findByText(confirmation)).toBeInTheDocument();
    expect(screen.getByTestId("guru-language")).toHaveTextContent(nativeOf(code));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(code);
    expect(screenChatMessage).not.toHaveBeenCalled(); // bypasses topic validation
    expect(consumeDailyChatSession).not.toHaveBeenCalled(); // does not use up the free session
    expect(askGuru).not.toHaveBeenCalled();
    expect(screen.queryByTestId("guru-welcome")).toBeNull(); // the welcome is not shown again
    expect(screen.queryByText(en.guru.screen.offTopic)).toBeNull();
  });

  it("a message that only mentions a language or a place is an ordinary message", async () => {
    for (const m of ["I live in Tamil Nadu and feel stressed.", "My friend speaks Hindi at home.", "What is the Marathi calendar year?", "I can't speak English well.", "Gujarati food is my comfort."]) {
      expect(detectLanguageRequest(m), m).toBeNull();
    }
    signIn();
    await mountReady();
    await typeAndSend("My friend speaks Hindi at home and I feel left out.");
    await waitFor(() => expect(askGuru).toHaveBeenCalledTimes(1));
    expect(i18n.language).toBe("en");
  });

  it.each(["hi", "ta", "gu"] as const)("the exact sequence: 'ok', then a request for %s, then a career question is answered in that language, not with the welcome", async (code) => {
    signIn();
    vi.mocked(askGuru).mockResolvedValueOnce({ type: "gathering", message: "An English answer to ok." });
    await mountReady();
    await typeAndSend("ok");
    expect(await screen.findByText("An English answer to ok.")).toBeInTheDocument();
    expect(vi.mocked(askGuru).mock.calls[0][6]).toBe("en");

    await typeAndSend(code === "hi" ? "talk in hindi" : code === "ta" ? "talk in tamil" : "talk in gujarati");
    await waitFor(() => expect(i18n.language).toBe(code));
    expect(await screen.findByText(i18n.t("voice.languageChanged", { lng: code, language: nativeOf(code) }))).toBeInTheDocument();
    expect(askGuru).toHaveBeenCalledTimes(1); // the request itself was not sent to the model
    expect(screen.getByTestId("guru-language")).toHaveTextContent(nativeOf(code));

    vi.mocked(askGuru).mockResolvedValueOnce({ type: "gathering", message: sample(code) });
    await typeAndSend("What is my career outlook?");
    expect(await screen.findByText(sample(code))).toBeInTheDocument();
    const call = vi.mocked(askGuru).mock.calls[1];
    expect(call[1]).toBe("What is my career outlook?");
    expect(call[6]).toBe(code); // the language reaches the model request
    expect(call[2]).toContain(LOCALES.find((l) => l.code === code)!.english);
    expect(screen.getByText("An English answer to ok.")).toBeInTheDocument(); // earlier messages are not rewritten
    expect(screen.queryByTestId("guru-welcome")).toBeNull();
    expect(screenChatMessage).toHaveBeenCalledTimes(2); // 'ok' and the career question were screened; the language request was not
  });
});

describe("what each Guru can really speak", () => {
  it("no profile advertises a language the Guru cannot reply in (Sanskrit is not offered), and every profile still lists at least two", () => {
    for (const a of ASTROLOGERS) {
      const shown = guruLanguages(a);
      expect(shown.length, a.name).toBeGreaterThanOrEqual(2);
      for (const l of shown) expect(VERIFIED_GURU_LANGUAGES, `${a.name}: ${l}`).toContain(l);
      expect(shown).not.toContain("Sanskrit");
    }
    expect(VERIFIED_GURU_LANGUAGES).toEqual(LOCALES.map((l) => l.english));
  });

  it("the Guru card in the chat shows only the verified languages", async () => {
    signIn();
    await mountReady();
    const card = screen.getByTestId("persona-card");
    expect(card.textContent).not.toContain("Sanskrit");
    const persona = ASTROLOGERS.find((a) => card.textContent?.includes(a.name))!;
    expect(card.textContent).toContain(guruLanguages(persona).join(" · "));
  });
});
