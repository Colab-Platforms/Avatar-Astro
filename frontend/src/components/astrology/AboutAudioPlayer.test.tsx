import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AboutAudioPlayer from "./AboutAudioPlayer";

const published: Record<string, object> = {
  en: { available: true, url: "https://res.cloudinary.com/demo/video/upload/en.mp3", durationSeconds: 62, version: 1 },
  hi: { available: true, url: "https://res.cloudinary.com/demo/video/upload/hi.mp3", durationSeconds: 70, version: 2 },
  mr: { available: false },
};

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = ""; preload = ""; playbackRate = 1; paused = true; currentTime = 0; duration = 62;
  listeners: Record<string, (() => void)[]> = {};
  play = vi.fn(async () => { this.paused = false; this.emit("playing"); });
  pause = vi.fn(() => { this.paused = true; this.emit("pause"); });
  load = vi.fn();
  removeAttribute = vi.fn((a: string) => { if (a === "src") this.src = ""; });
  constructor() { FakeAudio.instances.push(this); }
  addEventListener(n: string, f: () => void) { (this.listeners[n] ??= []).push(f); }
  emit(n: string) { this.listeners[n]?.forEach((f) => f()); }
}

const fetchMock = vi.fn();
function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AboutAudioPlayer toolSlug="tarot" /></QueryClientProvider>);
}

beforeEach(() => {
  FakeAudio.instances = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    const lang = new URL(url).searchParams.get("language") as string;
    return new Response(JSON.stringify({ status: true, data: { toolSlug: "tarot", language: lang, ...published[lang] } }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => vi.unstubAllGlobals());

describe("AboutAudioPlayer", () => {
  it("asks the API for the current tool's published audio but downloads nothing until Play", async () => {
    mount();
    await screen.findByRole("button", { name: "Play audio" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/astrology/tools/tarot/audio?language=en");
    expect(FakeAudio.instances).toHaveLength(0); // no HTMLAudioElement, so no MP3 request
    expect(fetchMock.mock.calls.every((c) => !String(c[0]).includes(".mp3"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    expect(FakeAudio.instances[0].src).toBe("https://res.cloudinary.com/demo/video/upload/en.mp3");
    expect(FakeAudio.instances[0].play).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Pause audio" })).toBeInTheDocument();
  });

  it("shows the duration and supports playback speed", async () => {
    mount();
    await screen.findByRole("button", { name: "Play audio" });
    expect(screen.getByText("1:02")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    fireEvent.change(screen.getByLabelText("Playback speed", { selector: "select" }), { target: { value: "1.5" } });
    expect(FakeAudio.instances[0].playbackRate).toBe(1.5);
  });

  it("pauses the previous audio when the language changes and loads the new language's audio", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const en = FakeAudio.instances[0];

    fireEvent.click(screen.getByRole("radio", { name: "हिन्दी" }));
    await waitFor(() => expect(en.pause).toHaveBeenCalled());
    expect(en.src).toBe("");
    await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("language=hi"));
    fireEvent.click(await screen.findByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(2));
    expect(FakeAudio.instances[1].src).toContain("hi.mp3");
  });

  it("says so when no audio is published for the language, and offers no Play button", async () => {
    mount();
    fireEvent.click(await screen.findByRole("radio", { name: "मराठी" }));
    expect(await screen.findByTestId("audio-unavailable")).toHaveTextContent("not available in मराठी");
    expect(screen.queryByRole("button", { name: /Play audio/ })).toBeNull();
  });

  it("handles a failed lookup with a retry, and a playback error with a message", async () => {
    // the hook retries once, so two failures are needed to reach the error state
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 })).mockResolvedValueOnce(new Response("{}", { status: 500 }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }, { timeout: 3000 }));
    fireEvent.click(await screen.findByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    FakeAudio.instances[0].emit("error");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be played");
  });

  it("never accepts a non-https audio URL from the API", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: true, data: { available: true, url: "javascript:alert(1)", version: 1 } }), { status: 200 }));
    mount();
    expect(await screen.findByTestId("audio-unavailable")).toBeInTheDocument();
  });

  it("stops playing on unmount", async () => {
    const { unmount } = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    unmount();
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
  });
});
