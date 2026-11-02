import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));

import AstrologyAudioPage from "../pages/AstrologyAudioPage";

const EN = "About Tarot Drishti.\n\nWhat Is Tarot Reading?\n\nTarot is a deck of illustrated cards used for reflection and storytelling.";
const asset = (over: object = {}) => ({
  id: "a1", language: "en", contentVersion: 1, contentHash: "h1", modelId: "eleven_multilingual_v2", voiceId: "enVoice00001",
  cloudinaryUrl: "https://res.cloudinary.com/demo/video/upload/x.mp3", cloudinaryPublicId: "mybhagya/astrology/tarot/en/v1-a1", durationSeconds: 30,
  status: "READY", isPublished: false, publishedAt: null, errorMessage: null, createdAt: "2026-11-01T10:00:00.000Z", ...over,
});
const voices = [
  { id: "v1", languageCode: "en", languageName: "English", voiceId: "enVoice00001", voiceName: "English Voice", modelId: "eleven_multilingual_v2", isActive: true },
  { id: "v2", languageCode: "hi", languageName: "Hindi", voiceId: "hiVoice00001", voiceName: "Hindi Voice", modelId: "eleven_v3", isActive: true },
];
const models = [
  { id: "eleven_v3", label: "Eleven v3", languages: ["en", "hi", "mr"] },
  { id: "eleven_multilingual_v2", label: "Multilingual v2", languages: ["en", "hi"] },
  { id: "eleven_turbo_v2", label: "Turbo v2 (English only)", languages: ["en"] },
];
let assets: object[] = [];
const detail = () => ({
  slug: "tarot", label: "Tarot Drishti", voices, models, elevenLabsConfigured: true,
  languages: [
    { code: "en", name: "English", translationStatus: "SOURCE", narration: { title: "About Tarot Drishti", text: EN, version: 1, contentHash: "h1", updatedAt: null }, published: null, assets },
    { code: "hi", name: "Hindi", translationStatus: "MISSING", narration: null, published: null, assets: [] },
    { code: "mr", name: "Marathi", translationStatus: "MISSING", narration: null, published: null, assets: [] },
  ],
});
const toolsList = () => ({
  tools: [
    { slug: "tarot", label: "Tarot Drishti", languages: ["en", "hi", "mr"].map((c) => ({ code: c, name: { en: "English", hi: "Hindi", mr: "Marathi" }[c], translationStatus: c === "en" ? "SOURCE" : "MISSING", version: c === "en" ? 1 : null, published: false, generating: false })) },
    { slug: "zodiac", label: "Rashi Chakra", languages: [] },
  ],
});

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><AstrologyAudioPage /></MemoryRouter></QueryClientProvider>);
}
type Opts = { method?: string; body?: unknown } | undefined;
const posts = () => authRequest.mock.calls.filter((c) => ["POST", "PUT"].includes((c[1] as Opts)?.method ?? ""));

beforeEach(() => {
  assets = [];
  authRequest.mockReset();
  authRequest.mockImplementation(async (url: string, opts?: { method?: string }) => {
    if (opts?.method) return { asset: {}, queued: [], skipped: [], verified: true };
    if (url.endsWith("/astrology/audio/tools")) return toolsList();
    if (url.includes("/astrology/audio/tarot")) return detail();
    throw new Error("unexpected " + url);
  });
});
afterEach(() => vi.restoreAllMocks());

describe("Astrology Audio Manager", () => {
  it("loads the tool's existing About text and shows language, voice ID and model before generating", async () => {
    mount();
    const text = (await screen.findByLabelText("Narration text")) as HTMLTextAreaElement;
    expect(text.value).toBe(EN);
    expect(screen.getByDisplayValue("About Tarot Drishti")).toBeInTheDocument();
    const settings = screen.getByLabelText("Generation settings");
    expect(settings).toHaveTextContent("English (en)");
    expect(settings).toHaveTextContent("enVoice00001");
    expect(settings).toHaveTextContent("eleven_multilingual_v2");
  });

  it("marks Hindi as untranslated, never offers English text for it, and blocks generation", async () => {
    mount();
    await screen.findByLabelText("Narration text");
    fireEvent.click(screen.getByRole("tab", { name: /Hindi/ }));
    expect(await screen.findByText(/English is never sent to a Hindi voice/)).toBeInTheDocument();
    expect((screen.getByLabelText("Narration text") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Generate audio" })).toBeDisabled();
    expect(screen.getByText(/Enter and save the Hindi translation first/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Hindi translation" })).toBeDisabled(); // nothing typed yet
    fireEvent.change(screen.getByLabelText("Narration text"), { target: { value: "टैरो चित्रित पत्तों का एक समूह है।" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Hindi translation" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("/admin/astrology/audio/tarot/content");
    expect((posts()[0][1] as { body: unknown }).body).toMatchObject({ language: "hi", text: "टैरो चित्रित पत्तों का एक समूह है।" });
  });

  it("only offers models that support the language", async () => {
    mount();
    await screen.findByLabelText("Narration text");
    const options = Array.from((screen.getByLabelText("Model", { selector: "select#aa-model" }) as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain("eleven_turbo_v2"); // English
    fireEvent.click(screen.getByRole("tab", { name: /Hindi/ }));
    await waitFor(() => {
      const o = Array.from((screen.getByLabelText("Model", { selector: "select#aa-model" }) as HTMLSelectElement).options).map((x) => x.value);
      expect(o).not.toContain("eleven_turbo_v2");
      expect(o).toContain("eleven_v3");
    });
  });

  it("requires saving edits before generating, then generates with the chosen voice and model", async () => {
    mount();
    const text = await screen.findByLabelText("Narration text");
    const gen = screen.getByRole("button", { name: "Generate audio" });
    expect(gen).toBeEnabled();
    fireEvent.change(text, { target: { value: EN + " Edited." } });
    expect(screen.getByRole("button", { name: "Generate audio" })).toBeDisabled();
    expect(screen.getByText(/Save your changes before generating/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate audio" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("/admin/astrology/audio/generate");
    expect((posts()[0][1] as { body: unknown }).body).toEqual({ toolSlug: "tarot", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  });

  it("asks for confirmation before generating all missing languages", async () => {
    mount();
    await screen.findByLabelText("Narration text");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Generate all missing languages" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Tarot Drishti"));
    expect(posts()).toHaveLength(0);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Generate all missing languages" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("/admin/astrology/audio/generate-missing");
    expect((posts()[0][1] as { body: unknown }).body).toEqual({ toolSlug: "tarot", confirm: true });
  });

  it("shows generation progress, failures with Retry, and Publish only for finished audio", async () => {
    assets = [
      asset({ id: "g", status: "GENERATING", cloudinaryUrl: null, cloudinaryPublicId: null }),
      asset({ id: "f", status: "FAILED", cloudinaryUrl: null, errorMessage: "ElevenLabs account has insufficient credits." }),
      asset({ id: "r", status: "READY" }),
      asset({ id: "o", status: "OUTDATED" }),
    ];
    mount();
    expect(await screen.findByText(/Generating with ElevenLabs and uploading to Cloudinary/)).toBeInTheDocument();
    expect(screen.getByText("ElevenLabs account has insufficient credits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled(); // a generation is already running
    expect(screen.getAllByRole("button", { name: /^Publish/ })).toHaveLength(1); // READY only, not OUTDATED/FAILED/GENERATING
    expect(screen.getByText(/Generate new audio before publishing/)).toBeInTheDocument();
  });

  it("publishes a ready asset", async () => {
    assets = [asset({ id: "r", status: "READY" })];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("/admin/astrology/audio/publish");
    expect((posts()[0][1] as { body: unknown }).body).toEqual({ assetId: "r" });
  });

  it("surfaces server errors to the admin", async () => {
    assets = [asset({ id: "r", status: "READY" })];
    authRequest.mockImplementation(async (url: string, opts?: { method?: string }) => {
      if (opts?.method) throw new Error("The narration text changed after this audio was made.");
      if (url.endsWith("/astrology/audio/tools")) return toolsList();
      return detail();
    });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
    expect(await screen.findByText(/narration text changed/)).toBeInTheDocument();
  });
});
