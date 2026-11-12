/**
 * Voice Consultation: chat behaviour, the shared language selector, and all ten languages.
 *
 * MOCKED vs REAL: the AI provider (aiChat) and speech output (authedFetch to /tts) are MOCKED here so the tests are deterministic.
 * They prove what the screen shows and what it sends. How well a real model writes each language is checked separately by
 * backend/scripts/voiceLiveLanguageCheck.ts (real provider), and real speech output by the script noted in the report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));

import VoiceConsultation from "@/components/VoiceConsultation";
import LanguageSelector from "@/components/LanguageSelector";
import { aiChat } from "@/lib/aiClient";
import { authedFetch } from "@/lib/authedFetch";
import i18n, { setLanguage } from "@/i18n";
import { LOCALES, STORAGE_KEY, type LocaleCode } from "@/i18n/languages";

vi.setConfig({ testTimeout: 30_000 });

const SRC = join(process.cwd(), "src");
const dict = (code: string) => JSON.parse(readFileSync(join(SRC, "i18n", "locales", `${code}.json`), "utf8"));
const ALL = LOCALES.map((l) => l.code);
const NON_EN = LOCALES.filter((l) => l.code !== "en").map((l) => l.code);
const EN_REPLY = "Namaste, I am glad you reached out. Tell me what is on your mind today.";
/** A real sentence in each language (from its own dictionary), long enough to be judged by script. */
const reply = (code: string) => (code === "en" ? EN_REPLY : (dict(code).guru.errors.network as string));
const english = (code: string) => LOCALES.find((l) => l.code === code)!.english;
const confirmation = (code: string) =>
  dict(code).voice.languageChanged.replace("{{language}}", LOCALES.find((l) => l.code === code)!.native);

const ok = (content: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) }) as Response;
const mockAi = vi.mocked(aiChat);

class FakeSR {
  static instances: FakeSR[] = [];
  lang = ""; continuous = false; interimResults = false;
  onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null;
  constructor() { FakeSR.instances.push(this); }
  start() {} stop() { this.onend?.(); } abort() {}
}

const input = () => screen.getByRole("textbox") as HTMLInputElement;
const send = (text: string) => {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.submit(input().closest("form")!);
};
const lastCall = () => mockAi.mock.calls[mockAi.mock.calls.length - 1][0];
const bubbles = (role: "user" | "pandit") => Array.from(document.querySelectorAll(`.vc-msg-${role} .vc-msg-text`)).map((n) => n.textContent);

beforeEach(async () => {
  localStorage.clear();
  FakeSR.instances = [];
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  mockAi.mockReset();
  mockAi.mockResolvedValue(ok(EN_REPLY));
  vi.mocked(authedFetch).mockReset();
  vi.mocked(authedFetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response); // no real speech in tests
  await act(async () => { await setLanguage("en"); });
  localStorage.removeItem(STORAGE_KEY);
});
afterEach(() => cleanup());

const mount = async (code: LocaleCode = "en") => {
  if (code !== "en") await act(async () => { await setLanguage(code); });
  return render(<VoiceConsultation />);
};

// ── chat behaviour ──────────────────────────────────────────────────────────────────────────────────────────────────
describe("chat behaviour", () => {
  it("shows the welcome once, when a consultation starts, and never again after a message", async () => {
    await mount();
    expect(screen.getAllByTestId("vc-welcome")).toHaveLength(1);
    send("hi");
    await screen.findByText(EN_REPLY);
    expect(screen.queryByTestId("vc-welcome")).toBeNull();
    send("I need some guidance about my family");
    await waitFor(() => expect(mockAi).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("vc-welcome")).toBeNull();
    expect(document.body.textContent).not.toContain(dict("en").voice.welcome.slice(0, 40));
  });

  it("'hi' reaches the AI (it used to be refused as 'too short') and gets a fresh reply, not the welcome", async () => {
    await mount();
    send("hi");
    await screen.findByText(EN_REPLY);
    expect(mockAi).toHaveBeenCalledTimes(1);
    const sent = lastCall().messages;
    expect(sent[sent.length - 1]).toEqual({ role: "user", content: "hi" });
    expect(bubbles("user")).toEqual(["hi"]);
    expect(document.body.textContent).not.toContain(dict("en").voice.offTopic);
  });

  it("several messages give separate replies and the whole history is sent each time", async () => {
    await mount();
    mockAi.mockResolvedValueOnce(ok("First reply from Pandit Ji about your worry.")).mockResolvedValueOnce(ok("Second reply, about the family question you asked."));
    send("hi");
    await screen.findByText("First reply from Pandit Ji about your worry.");
    send("I have a question about my family");
    await screen.findByText("Second reply, about the family question you asked.");
    expect(bubbles("pandit")).toEqual(["First reply from Pandit Ji about your worry.", "Second reply, about the family question you asked."]);
    expect(bubbles("user")).toEqual(["hi", "I have a question about my family"]);
    const msgs = lastCall().messages;
    expect(msgs[0].role).toBe("system");
    expect(msgs.slice(2)).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "First reply from Pandit Ji about your worry." },
      { role: "user", content: "I have a question about my family" },
    ]);
  });

  it("a failed reply shows an error with Retry, never the welcome or a made-up reply", async () => {
    await mount();
    mockAi.mockRejectedValueOnce(new Error("network"));
    send("hi");
    const failure = await screen.findByTestId("vc-failure");
    expect(failure).toHaveTextContent(dict("en").voice.replyFailed);
    expect(screen.getByRole("button", { name: dict("en").common.retry })).toBeInTheDocument();
    expect(screen.queryByTestId("vc-welcome")).toBeNull();
    expect(bubbles("pandit")).toEqual([]); // nothing was invented as Pandit Ji's reply
    expect(document.body.textContent).not.toMatch(/Kshama karein|technical samasya/);
  });

  it("an HTTP error is also a failure with Retry", async () => {
    await mount();
    mockAi.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ error: { message: "x" } }) } as Response);
    send("hi");
    expect(await screen.findByTestId("vc-failure")).toBeInTheDocument();
    expect(bubbles("pandit")).toEqual([]);
  });

  it("retries a reply in the selected language when the first model response is in English", async () => {
    await mount("ta");
    mockAi.mockResolvedValueOnce(ok(EN_REPLY)).mockResolvedValueOnce(ok(reply("ta")));
    send("I feel worried about my career.");
    await screen.findByText(reply("ta"));
    expect(mockAi).toHaveBeenCalledTimes(2);
    expect(mockAi.mock.calls.every(([body]) => body.language === "ta")).toBe(true);
    expect(lastCall().messages[1].content).toContain("Your previous reply was not written in Tamil");
    expect(screen.queryByText(EN_REPLY)).toBeNull();
  });

  it("does not show an English fallback when both language attempts are wrong", async () => {
    await mount("gu");
    mockAi.mockResolvedValueOnce(ok(EN_REPLY)).mockResolvedValueOnce(ok(EN_REPLY));
    send("I feel worried about my career.");
    const failure = await screen.findByTestId("vc-failure");
    expect(failure).toHaveTextContent(dict("gu").guru.errors.wrongLanguage);
    expect(screen.getByRole("button", { name: dict("gu").common.retry })).toBeInTheDocument();
    expect(bubbles("pandit")).toEqual([]);
    expect(mockAi.mock.calls.every(([body]) => body.language === "gu")).toBe(true);
  });

  it("Retry asks again with the same history, does not duplicate the user's message, and clears the error", async () => {
    await mount();
    mockAi.mockRejectedValueOnce(new Error("network"));
    send("hi");
    await screen.findByTestId("vc-failure");
    fireEvent.click(screen.getByRole("button", { name: dict("en").common.retry }));
    await screen.findByText(EN_REPLY);
    expect(mockAi).toHaveBeenCalledTimes(2);
    expect(bubbles("user")).toEqual(["hi"]); // still one
    expect(lastCall().messages.filter((m) => m.role === "user")).toEqual([{ role: "user", content: "hi" }]);
    expect(screen.queryByTestId("vc-failure")).toBeNull();
  });

  it("a double submit makes one request and one message", async () => {
    await mount();
    let finish: (r: Response) => void = () => {};
    mockAi.mockImplementation(() => new Promise<Response>((r) => { finish = r; }));
    const form = input().closest("form")!;
    fireEvent.change(input(), { target: { value: "hi" } });
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockAi).toHaveBeenCalledTimes(1);
    expect(bubbles("user")).toEqual(["hi"]);
    await act(async () => { finish(ok(EN_REPLY)); });
    await screen.findByText(EN_REPLY);
    expect(bubbles("pandit")).toEqual([EN_REPLY]);
  });

  it("shows a typing indicator while the reply is being written, and removes it when it arrives", async () => {
    await mount();
    let finish: (r: Response) => void = () => {};
    mockAi.mockImplementation(() => new Promise<Response>((r) => { finish = r; }));
    send("hi");
    expect(await screen.findByTestId("vc-typing")).toHaveTextContent(dict("en").voice.typing);
    expect(input()).toBeDisabled();
    await act(async () => { finish(ok(EN_REPLY)); });
    await screen.findByText(EN_REPLY);
    expect(screen.queryByTestId("vc-typing")).toBeNull();
    expect(input()).not.toBeDisabled();
  });

  it("clearly off-topic requests are still refused without calling the AI", async () => {
    await mount();
    send("write python code for a website");
    expect(await screen.findByText(dict("en").voice.offTopic)).toBeInTheDocument();
    expect(mockAi).not.toHaveBeenCalled();
  });

  it("an empty message is never sent", async () => {
    await mount();
    send("   ");
    expect(mockAi).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: dict("en").voice.send })).toBeDisabled();
  });

  it("New starts a fresh consultation and shows the welcome again", async () => {
    await mount();
    send("hi");
    await screen.findByText(EN_REPLY);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(dict("en").voice.newSession) }));
    expect(await screen.findByTestId("vc-welcome")).toBeInTheDocument();
    expect(bubbles("user")).toEqual([]);
  });
});

// ── the ONE central language preference ─────────────────────────────────────────────────────────────────────────────
describe("central language integration", () => {
  const currentNames = () => screen.getAllByTestId("language-current").map((n) => n.textContent);

  it("Scenario A: a language chosen elsewhere is already selected here, in the interface and in new replies", async () => {
    await act(async () => { await setLanguage("ta"); }); // chosen from the main selector before opening Voice Consultation
    render(<VoiceConsultation />);
    expect(currentNames()).toEqual(["தமிழ்"]);
    expect(screen.getByTestId("vc-welcome")).toHaveTextContent(dict("ta").voice.welcome.split("\n")[0]);
    expect(input().placeholder).toBe(dict("ta").voice.inputPlaceholder);
    mockAi.mockResolvedValue(ok(reply("ta")));
    send("hello");
    await screen.findByText(reply("ta"));
    expect(lastCall().language).toBe("ta");
  });

  it("Scenario B: changing the language inside Voice Consultation changes the whole site's language and survives navigation and reload", async () => {
    const { unmount } = render(<><LanguageSelector /><VoiceConsultation /></>); // the first is the site's main selector
    expect(currentNames()).toEqual(["English", "English"]);

    const vcSelector = screen.getAllByTestId("language-selector")[1];
    fireEvent.click(vcSelector.querySelector("button")!);
    fireEvent.click(vcSelector.querySelector("[data-testid=language-option-gu]")!);
    await waitFor(() => expect(i18n.language).toBe("gu"));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("gu"); // the central preference
    expect(currentNames()).toEqual(["ગુજરાતી", "ગુજરાતી"]); // the main selector shows it too
    expect(input().placeholder).toBe(dict("gu").voice.inputPlaceholder);

    unmount(); // navigate away
    render(<VoiceConsultation />); // and back (a reload reads the same stored value)
    expect(currentNames()).toEqual(["ગુજરાતી"]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("gu");
  });

  it("changing the language in the main selector updates Voice Consultation at once", async () => {
    render(<><LanguageSelector /><VoiceConsultation /></>);
    const main = screen.getAllByTestId("language-selector")[0];
    fireEvent.click(main.querySelector("button")!);
    fireEvent.click(main.querySelector("[data-testid=language-option-bn]")!);
    await waitFor(() => expect(input().placeholder).toBe(dict("bn").voice.inputPlaceholder));
    expect(screen.getByTestId("vc-welcome")).toHaveTextContent(dict("bn").voice.welcome.split("\n")[0]);
  });

  it("Scenario C: switching during a conversation keeps earlier messages untouched and new replies use the new language", async () => {
    await mount();
    send("hi");
    await screen.findByText(EN_REPLY);
    await act(async () => { await setLanguage("ta"); });
    expect(bubbles("pandit")).toEqual([EN_REPLY]); // not rewritten
    expect(bubbles("user")).toEqual(["hi"]);
    expect(input().placeholder).toBe(dict("ta").voice.inputPlaceholder);

    mockAi.mockResolvedValueOnce(ok(reply("ta")));
    send("tell me about peace");
    await screen.findByText(reply("ta"));
    expect(lastCall().language).toBe("ta");
    expect(lastCall().messages.slice(2).map((m) => m.content)).toEqual(["hi", EN_REPLY, "tell me about peace"]); // history kept
    expect(bubbles("pandit")).toEqual([EN_REPLY, reply("ta")]);
  });

  it("keeps the language selector visible in the header after a conversation starts", async () => {
    await mount();
    send("hi");
    await screen.findByText(EN_REPLY);
    const header = document.querySelector(".vc-topbar")!;
    expect(header.querySelector("[data-testid=language-selector]")).not.toBeNull();
    fireEvent.click(header.querySelector("[data-testid=language-selector] button")!);
    fireEvent.click(header.querySelector("[data-testid=language-option-gu]")!);
    await waitFor(() => expect(i18n.language).toBe("gu"));
    expect(header.querySelector("[data-testid=language-current]")).toHaveTextContent("ગુજરાતી");
    expect(bubbles("pandit")).toEqual([EN_REPLY]);
  });

  it("there is no language state or storage key of its own", async () => {
    const source = readFileSync(join(SRC, "components", "VoiceConsultation.tsx"), "utf8");
    expect(source).not.toMatch(/localStorage|sessionStorage|createContext|useLanguageDetection|translateText|displayLang|audioLang/);
    expect(source).not.toMatch(/<select/);
    await mount();
    send("talk in tamil");
    await waitFor(() => expect(i18n.language).toBe("ta"));
    expect(Object.keys(localStorage)).toEqual([STORAGE_KEY]); // the one central key, nothing else
  });

  it("an explicit request changes the central language and confirms it without asking the AI", async () => {
    await mount();
    send("talk in tamil");
    expect(await screen.findByText(confirmation("ta"))).toBeInTheDocument();
    expect(i18n.language).toBe("ta");
    expect(screen.getByTestId("language-current")).toHaveTextContent("தமிழ்"); // the selector shows it at once
    expect(mockAi).not.toHaveBeenCalled(); // language intent bypasses the topic guard and model

    await act(async () => { await setLanguage("en"); });
    mockAi.mockResolvedValue(ok(EN_REPLY));
    send("எனக்கு என் வேலை பற்றி கவலை"); // typed in Tamil, but no request to change language
    await screen.findByText(EN_REPLY);
    expect(mockAi).toHaveBeenCalledTimes(1);
    expect(i18n.language).toBe("en");
    expect(lastCall().language).toBe("en");
  });

  it.each([
    ["Can you speak in Tamil?", "ta"],
    ["Talk in Gujarati.", "gu"],
    ["Please reply in Telugu.", "te"],
    ["हिंदी में जवाब दो।", "hi"],
    ["मराठीत बोला.", "mr"],
    ["தமிழில் பேசுங்கள்.", "ta"],
  ])("'%s' switches the whole site to %s and confirms in the selected language", async (text, code) => {
    await mount();
    send(text);
    expect(await screen.findByText(confirmation(code))).toBeInTheDocument();
    expect(i18n.language).toBe(code);
    expect(screen.getByTestId("language-current")).toHaveTextContent(LOCALES.find((l) => l.code === code)!.native);
    expect(mockAi).not.toHaveBeenCalled();
  });

  it.each([
    "My friend is from Tamil Nadu and I miss her",
    "I cannot speak English",
    "My horoscope says I should focus on my career",
  ])("does not mistake an ordinary message for a language request: %s", async (text) => {
    await mount();
    send(text);
    await screen.findByText(EN_REPLY);
    expect(i18n.language).toBe("en");
    expect(lastCall().language).toBe("en");
  });
});

// ── every language ──────────────────────────────────────────────────────────────────────────────────────────────────
describe("all ten languages", () => {
  it.each(ALL)("%s: the whole interface is in the language, with its native name selected", async (code) => {
    await mount(code as LocaleCode);
    const v = dict(code).voice;
    expect(screen.getByTestId("language-current")).toHaveTextContent(LOCALES.find((l) => l.code === code)!.native);
    expect(screen.getByText(v.title)).toBeInTheDocument();
    expect(screen.getByTestId("vc-welcome")).toHaveTextContent(v.welcome.split("\n")[0]);
    expect(screen.getByText(v.startWith)).toBeInTheDocument();
    for (const k of ["s1", "s2", "s3"]) expect(screen.getByRole("button", { name: v[k] })).toBeInTheDocument();
    expect(input().placeholder).toBe(v.inputPlaceholder);
    expect(input()).toHaveAttribute("aria-label", v.inputLabel);
    expect(screen.getByRole("button", { name: v.send })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(v.micIdle) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(v.voiceOn) })).toBeInTheDocument();
    if (code !== "en") {
      for (const e of ["Tap to Speak", "Type your message", "You can start with", "Voice Session", "Voice On", "Send"]) expect(document.body.textContent).not.toContain(e);
    }
  });

  it.each(ALL)("%s: the loading and error states are translated", async (code) => {
    await mount(code as LocaleCode);
    const v = dict(code).voice;
    let finish: (r: Response) => void = () => {};
    mockAi.mockImplementationOnce(() => new Promise<Response>((r) => { finish = r; }));
    send("hi");
    expect(await screen.findByTestId("vc-typing")).toHaveTextContent(v.typing);
    expect(screen.getByRole("button", { name: new RegExp(v.micProcessing) })).toBeInTheDocument();
    await act(async () => { finish({ ok: false, status: 500, json: async () => ({}) } as Response); });
    expect(await screen.findByTestId("vc-failure")).toHaveTextContent(v.replyFailed);
    expect(screen.getByRole("button", { name: dict(code).common.retry })).toBeInTheDocument();
  });

  it.each(ALL)("%s: the selected language is what is sent to the backend, and a reply in it is shown", async (code) => {
    await mount(code as LocaleCode);
    mockAi.mockResolvedValue(ok(reply(code)));
    send("How can I find peace of mind?"); // typed in English, whatever the selected language
    await screen.findByText(reply(code));
    expect(mockAi).toHaveBeenCalledTimes(1);
    expect(lastCall().language).toBe(code);
    expect(lastCall().messages[1].content).toContain(`Write your reply only in ${english(code)}`);
  });

  it.each(NON_EN)("%s: an English reply is not shown; the model is asked once more, then a translated error is shown", async (code) => {
    await mount(code as LocaleCode);
    mockAi.mockResolvedValue(ok(EN_REPLY));
    send("hi");
    expect(await screen.findByTestId("vc-failure")).toHaveTextContent(dict(code).guru.errors.wrongLanguage);
    expect(mockAi).toHaveBeenCalledTimes(2);
    expect(lastCall().messages[1].content).toContain("not written in");
    expect(screen.queryByText(EN_REPLY)).toBeNull();
    expect(bubbles("pandit")).toEqual([]);
  });

  it.each(NON_EN)("%s: if the first reply is in English but the second is right, the right one is shown", async (code) => {
    await mount(code as LocaleCode);
    mockAi.mockResolvedValueOnce(ok(EN_REPLY)).mockResolvedValueOnce(ok(reply(code)));
    send("hi");
    await screen.findByText(reply(code));
    expect(screen.queryByText(EN_REPLY)).toBeNull();
  });

  it("Hindi and Marathi are two languages: each is requested and named separately", async () => {
    await mount("hi");
    mockAi.mockResolvedValue(ok(reply("hi")));
    send("hello");
    await screen.findByText(reply("hi"));
    expect(lastCall().language).toBe("hi");
    expect(lastCall().messages[1].content).toContain("Hindi");
    expect(lastCall().messages[1].content).not.toContain("Marathi");
    cleanup();

    await mount("mr");
    mockAi.mockResolvedValue(ok(reply("mr")));
    send("hello");
    await screen.findByText(reply("mr"));
    expect(lastCall().language).toBe("mr");
    expect(lastCall().messages[1].content).toContain("Marathi");
    expect(lastCall().messages[1].content).not.toContain("Hindi");
    expect(dict("hi").voice.welcome).not.toBe(dict("mr").voice.welcome); // separate dictionaries, not one reused
    expect(dict("hi").voice.replyFailed).not.toBe(dict("mr").voice.replyFailed);
  });

  it("the system prompt no longer pins replies to Hinglish or Roman letters", () => {
    const source = readFileSync(join(SRC, "components", "VoiceConsultation.tsx"), "utf8");
    expect(source).not.toMatch(/always write in Roman letters|respond in Hinglish|Never use Devanagari/);
    expect(source).toMatch(/language instruction that follows/);
    expect(source).not.toContain("transliterateToRoman"); // replies are shown in the script they were written in
  });
});

// ── voice input and output ──────────────────────────────────────────────────────────────────────────────────────────
describe("voice input", () => {
  const withSR = () => { (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSR; };

  it.each([
    ["en", "en-IN"], ["hi", "hi-IN"], ["mr", "mr-IN"], ["ta", "ta-IN"], ["te", "te-IN"],
    ["gu", "gu-IN"], ["bn", "bn-IN"], ["kn", "kn-IN"], ["ml", "ml-IN"], ["pa", "pa-Guru-IN"],
  ])("%s: speech recognition listens in %s (it no longer always uses English or Hindi)", async (code, tag) => {
    withSR();
    await mount(code as LocaleCode);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(dict(code).voice.micIdle) }));
    expect(FakeSR.instances.at(-1)!.lang).toBe(tag);
  });

  it("a spoken message is sent in the written script, not converted to Roman letters", async () => {
    withSR();
    await mount("hi");
    mockAi.mockResolvedValue(ok(reply("hi")));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(dict("hi").voice.micIdle) }));
    const rec = FakeSR.instances.at(-1)!;
    act(() => rec.onresult?.({ results: [Object.assign([{ transcript: "मुझे शांति चाहिए" }], { isFinal: true })] }));
    act(() => rec.onend?.());
    await screen.findByText(reply("hi"));
    expect(lastCall().messages.at(-1)).toEqual({ role: "user", content: "मुझे शांति चाहिए" });
  });

  it("a browser that cannot recognise the language says so, in that language, and typing still works", async () => {
    withSR();
    await mount("ta");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(dict("ta").voice.micIdle) }));
    act(() => FakeSR.instances.at(-1)!.onerror?.({ error: "language-not-supported" }));
    expect(await screen.findByTestId("vc-notice")).toHaveTextContent(dict("ta").voice.speechLanguage.replace("{{language}}", "தமிழ்"));
    mockAi.mockResolvedValue(ok(reply("ta")));
    send("hello");
    await screen.findByText(reply("ta"));
  });

  it("with no speech recognition at all the notice is shown and the typed chat keeps working", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(dict("en").voice.micIdle) }));
    expect(await screen.findByTestId("vc-notice")).toHaveTextContent(dict("en").voice.speechUnsupported);
    send("hi");
    await screen.findByText(EN_REPLY);
  });
});

describe("voice output", () => {
  it.each(ALL)("%s: speech is requested in that language's own voice language", async (code) => {
    await mount(code as LocaleCode);
    mockAi.mockResolvedValue(ok(reply(code)));
    send("hello");
    await screen.findByText(reply(code));
    await waitFor(() => expect(authedFetch).toHaveBeenCalled());
    const body = JSON.parse((vi.mocked(authedFetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body.language).toBe(LOCALES.find((l) => l.code === code)!.tag);
  });

  it("when no voice can be played the text reply stays and a translated notice is shown (no invented voice)", async () => {
    await mount("ta");
    mockAi.mockResolvedValue(ok(reply("ta")));
    send("hello");
    await screen.findByText(reply("ta"));
    const notice = await screen.findByTestId("vc-notice");
    expect(notice).toHaveTextContent(dict("ta").voice.ttsUnavailable.replace("{{language}}", "தமிழ்"));
    expect(screen.getByText(reply("ta"))).toBeInTheDocument();
  });
});

// ── selector: placement, layout, keyboard ───────────────────────────────────────────────────────────────────────────
describe("the language selector in the header", () => {
  it("is in the header and offers the ten languages in their own scripts with the current one marked", async () => {
    await mount("kn");
    const header = document.querySelector(".vc-topbar")!;
    const selector = header.querySelector("[data-testid=language-selector]")!;
    expect(selector).not.toBeNull();
    fireEvent.click(selector.querySelector("button")!);
    for (const l of LOCALES) expect(selector.querySelector(`[data-testid=language-option-${l.code}]`)).toHaveTextContent(l.native);
    expect(selector.querySelector("[role=option][aria-selected=true]")).toHaveTextContent("ಕನ್ನಡ");
    expect(selector.querySelector("button")).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("works with the keyboard: arrows move between languages, Enter selects, Escape closes", async () => {
    await mount();
    const selector = screen.getByTestId("language-selector");
    fireEvent.click(selector.querySelector("button")!);
    const focused = () => document.activeElement?.getAttribute("data-testid");
    await waitFor(() => expect(focused()).toBe("language-option-en")); // opens on the current language
    fireEvent.keyDown(selector.querySelector("ul")!, { key: "ArrowDown" });
    expect(focused()).toBe("language-option-hi");
    fireEvent.keyDown(selector.querySelector("ul")!, { key: "End" });
    expect(focused()).toBe("language-option-pa");
    fireEvent.keyDown(selector.querySelector("ul")!, { key: "ArrowDown" }); // wraps round
    expect(focused()).toBe("language-option-en");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(selector.querySelector("ul")).toBeNull());
  });

  it("on a phone-width screen it sits on its own full-width row (still one selector) so it cannot overflow", async () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
    await mount();
    expect(screen.getAllByTestId("language-selector")).toHaveLength(1);
    expect(document.querySelector(".vc-lang-full [data-testid=language-selector]")).not.toBeNull();
  });

  it("remains accessible on a phone-width screen after chat starts", async () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
    await mount();
    send("hi");
    await screen.findByText(EN_REPLY);
    const selector = document.querySelector(".vc-topbar .vc-lang-full [data-testid=language-selector]")!;
    expect(selector).not.toBeNull();
    fireEvent.click(selector.querySelector("button")!);
    fireEvent.click(selector.querySelector("[data-testid=language-option-ta]")!);
    await waitFor(() => expect(i18n.language).toBe("ta"));
    expect(selector.querySelector("[data-testid=language-current]")).toHaveTextContent("தமிழ்");
    expect(bubbles("pandit")).toEqual([EN_REPLY]);
  });
});

// ── the guide is honest about what it is ────────────────────────────────────────────────────────────────────────────
describe("Pandit Ji's system prompt", () => {
  const source = readFileSync(join(SRC, "components", "VoiceConsultation.tsx"), "utf8");
  const prompt = /const VOICE_SYSTEM_PROMPT = `([\s\S]*?)`;/.exec(source)![1];

  it("no longer claims to be a human, or to have years of experience, or forbids saying it is an AI", () => {
    expect(prompt).not.toMatch(/real, wise, compassionate human|40 years|real Pandit Ji|Never say you are artificial|Never mention AI/i);
  });

  it("says it is an AI guide, answers honestly when asked, and cannot see a birth chart", () => {
    expect(prompt).toMatch(/AI guide, not a human pandit/);
    expect(prompt).toMatch(/if the seeker asks whether you are a real person, a human, a bot or an AI, say plainly/);
    expect(prompt).toMatch(/cannot see the seeker's birth chart/);
  });

  it("keeps the warm, caring Pandit Ji voice and the existing rules", () => {
    expect(prompt).toMatch(/warm, compassionate spiritual guide in the Vedic tradition/);
    expect(prompt).not.toMatch(/I can only reply in English|numerology, face reading, or horoscope analysis/i);
    expect(prompt).toMatch(/A request to change languages is handled by the interface/);
    expect(prompt).toMatch(/caring elder of the family/);
    expect(prompt).toMatch(/GREETING RULE/);
    expect(prompt).toMatch(/Hanuman Chalisa/);
    expect(prompt).toMatch(/Bhagavad Gita, Vedas/);
    expect(prompt).toMatch(/MAXIMUM 5 sentences/);
  });
});

describe("navigation and brand", () => {
  it("the brand name is Bhagya in the dictionaries, with no 'MyBhagya' left in visible text", () => {
    for (const code of ALL) {
      const text = JSON.stringify(dict(code));
      expect(text, code).not.toMatch(/MyBhagya|My Bhagya/);
    }
  });
});
