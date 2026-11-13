import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@/i18n/languages";
import { setLanguage } from "@/i18n";
import { MANTRA_CATALOG, MANTRA_CATEGORIES, matchRecords } from "@/data/mantraCatalog";

const rec = (id: string, title: string, over: Record<string, unknown> = {}) => ({ id, slug: id, title, deity: null, category: "Mantra", lyricsText: null, meaning: null, audioUrl: null, durationSeconds: null, coverImageUrl: null, ...over });
const RECORDS = [
  rec("r1", "Gayatri Mantra", { audioUrl: "https://cdn.example/gayatri.mp3", lyricsText: "Om Bhur Bhuvah Svah", meaning: "A prayer to the Sun" }),
  rec("r2", "Om Namah Shivaya", { audioUrl: "https://cdn.example/shiva.mp3" }),
  rec("r3", "Maha Mrityunjaya Mantra"), // uploaded record with no audio yet
  rec("r4", "Hanuman Chalisa", { audioUrl: "https://cdn.example/chalisa.mp3", category: "Chalisa" }),
  rec("r5", "Evening Peace Chant", { category: "Something new" }),
];
const state = { data: RECORDS as unknown[], isLoading: false, isError: false };
vi.mock("@/features/devotionLibrary/hooks", () => ({ useMantrasChants: () => state, useSpiritualBooks: () => ({ data: [], isLoading: false, isError: false }) }));
const registerMantraPlay = vi.fn(() => Promise.resolve(null));
vi.mock("@/features/devotionLibrary/api", () => ({
  devotionLibraryApi: { registerMantraPlay: (...a: unknown[]) => (registerMantraPlay as unknown as (...x: unknown[]) => Promise<null>)(...a), mantraDownloadUrl: (id: string) => `http://api.test/devotion-library/mantras/${id}/download` },
}));

import MantrasChantsPage from "@/pages/devotion/MantrasChants";

let playImpl: () => Promise<void>;
beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: function (this: HTMLMediaElement) { Object.defineProperty(this, "paused", { value: false, configurable: true }); return playImpl(); } });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: function (this: HTMLMediaElement) { Object.defineProperty(this, "paused", { value: true, configurable: true }); this.dispatchEvent(new Event("pause")); } });
});
beforeEach(async () => { state.data = RECORDS; state.isLoading = false; state.isError = false; registerMantraPlay.mockClear(); playImpl = () => Promise.resolve(); await act(async () => { await setLanguage("en"); }); });

const mount = () => render(<MemoryRouter><MantrasChantsPage /></MemoryRouter>);
const names = () => screen.queryAllByTestId("mantra-card").map((c) => within(c).getByRole("heading").textContent);
const pill = (label: string) => within(screen.getByTestId("mantra-filters")).getByRole("button", { name: label });
const card = (id: string) => screen.getAllByTestId("mantra-card").find((c) => c.getAttribute("data-mantra") === id)!;
const TEN = ["Gayatri Mantra", "Maha Mrityunjaya Mantra", "Om Namah Shivaya", "Hare Krishna Mahamantra", "Om Gam Ganapataye Namah", "Hanuman Mantra", "Mahalakshmi Mantra", "Saraswati Vandana", "Vishnu Mantra", "Shri Ram Jai Ram"];

describe("Mantras & Chants page", () => {
  it("shows the heading, the subtitle and all ten mantras (plus other uploaded records after them)", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mantras & Chants");
    expect(screen.getByText("Explore sacred Hindu mantras, prayers and chants for peace, devotion and positivity.")).toBeInTheDocument();
    expect(names().slice(0, 10)).toEqual(TEN);
    expect(names().slice(10)).toEqual(["Hanuman Chalisa", "Evening Peace Chant"]);
    expect(MANTRA_CATALOG).toHaveLength(10);
  });

  it("offers All and all eleven categories as pill buttons", () => {
    mount();
    const labels = within(screen.getByTestId("mantra-filters")).getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["All", "Vedic Mantras", "Shiva Mantras", "Ganesha Mantras", "Krishna Mantras", "Hanuman Mantras", "Devi Mantras", "Morning Prayers", "Meditation Chants", "Aarti", "Stotras", "Chalisa"]);
    expect(MANTRA_CATEGORIES).toHaveLength(11);
    expect(pill("All")).toHaveAttribute("aria-pressed", "true");
  });

  it("filters by category, highlights the selected one, and All resets", () => {
    mount();
    fireEvent.click(pill("Shiva Mantras"));
    expect(names()).toEqual(["Maha Mrityunjaya Mantra", "Om Namah Shivaya"]);
    expect(pill("Shiva Mantras")).toHaveAttribute("aria-pressed", "true");
    expect(pill("All")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pill("Ganesha Mantras")); expect(names()).toEqual(["Om Gam Ganapataye Namah"]);
    fireEvent.click(pill("Krishna Mantras")); expect(names()).toEqual(["Hare Krishna Mahamantra"]);
    fireEvent.click(pill("Hanuman Mantras")); expect(names()).toEqual(["Hanuman Mantra"]);
    fireEvent.click(pill("Devi Mantras")); expect(names()).toEqual(["Mahalakshmi Mantra", "Saraswati Vandana"]);
    fireEvent.click(pill("Vedic Mantras")); expect(names()).toEqual(["Gayatri Mantra", "Maha Mrityunjaya Mantra"]);
    fireEvent.click(pill("Morning Prayers")); expect(names()).toEqual(["Gayatri Mantra", "Om Gam Ganapataye Namah", "Saraswati Vandana"]);
    fireEvent.click(pill("Stotras")); expect(names()).toEqual(["Saraswati Vandana", "Vishnu Mantra"]);
    fireEvent.click(pill("Chalisa")); expect(names()).toEqual(["Hanuman Chalisa"]); // an uploaded record joins the category it belongs to
    fireEvent.click(pill("Aarti")); expect(screen.getByTestId("mantra-empty")).toHaveTextContent("No mantras in this category yet.");
    fireEvent.click(pill("All"));
    expect(names()).toHaveLength(12);
  });

  it("plays only a mantra that has an uploaded audio file; the rest say Audio coming soon", () => {
    mount();
    expect(within(card("gayatri")).getByTestId("mantra-play")).toBeInTheDocument();
    expect(within(card("omnamahshivaya")).getByTestId("mantra-play")).toBeInTheDocument();
    for (const id of ["mahamrityunjaya", "harekrishna", "gamganapataye", "hanuman", "mahalakshmi", "saraswati", "vishnu", "shriramjairam"]) {
      expect(within(card(id)).queryByTestId("mantra-play"), id).toBeNull();
      expect(within(card(id)).getByTestId("mantra-soon"), id).toHaveTextContent("Audio coming soon");
    }
  });

  it("Play loads that mantra's real upload, only one plays at a time, pressing again pauses, and a play is counted once", () => {
    const { container } = mount();
    const el = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.click(within(card("gayatri")).getByTestId("mantra-play"));
    expect(el.getAttribute("src")).toBe("https://cdn.example/gayatri.mp3");
    expect(within(card("gayatri")).getByTestId("mantra-play")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(card("omnamahshivaya")).getByTestId("mantra-play"));
    expect(el.getAttribute("src")).toBe("https://cdn.example/shiva.mp3");
    expect(within(card("omnamahshivaya")).getByTestId("mantra-play")).toHaveAttribute("aria-pressed", "true");
    expect(within(card("gayatri")).getByTestId("mantra-play")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("mantra-play").filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    fireEvent.click(within(card("omnamahshivaya")).getByTestId("mantra-play")); // pause
    expect(within(card("omnamahshivaya")).getByTestId("mantra-play")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(card("gayatri")).getByTestId("mantra-play")); // replay: not counted again
    expect(registerMantraPlay).toHaveBeenCalledTimes(2);
    expect(registerMantraPlay.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["r1", "r2"]);
  });

  it("a file that cannot be played shows a message instead of pretending", async () => {
    playImpl = () => Promise.reject(new Error("404"));
    mount();
    await act(async () => { fireEvent.click(within(card("gayatri")).getByTestId("mantra-play")); });
    expect(within(card("gayatri")).getByRole("alert")).toHaveTextContent("This audio could not be played.");
    expect(within(card("gayatri")).getByTestId("mantra-play")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a Lyrics option only for a mantra whose record has lyrics or a meaning, and opens it", () => {
    mount();
    expect(within(card("omnamahshivaya")).queryByRole("button", { name: /Lyrics/ })).toBeNull();
    expect(within(card("hanuman")).queryByRole("button", { name: /Lyrics/ })).toBeNull();
    fireEvent.click(within(card("gayatri")).getByRole("button", { name: /Lyrics/ }));
    expect(within(card("gayatri")).getByText("Om Bhur Bhuvah Svah")).toBeInTheDocument();
    expect(within(card("gayatri")).getByText("A prayer to the Sun")).toBeInTheDocument();
    expect(within(card("gayatri")).getByRole("button", { name: /Hide lyrics/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("with no uploads at all, all ten still show, each with Audio coming soon and nothing playable", () => {
    state.data = [];
    mount();
    expect(names()).toEqual(TEN);
    expect(screen.queryAllByTestId("mantra-play")).toHaveLength(0);
    expect(screen.getAllByTestId("mantra-soon")).toHaveLength(10);
  });

  it("a load failure shows an error, not ten cards that claim to have no audio", () => {
    state.isError = true;
    mount();
    expect(screen.getByText(/Could not load mantras right now/)).toBeInTheDocument();
    expect(screen.queryAllByTestId("mantra-card")).toHaveLength(0);
  });

  it("uploaded records are matched to the right mantra: a Hanuman Chalisa is not the Hanuman Mantra", () => {
    const { matched, extras } = matchRecords(RECORDS);
    expect([...matched].map(([k, r]) => [k, r.id])).toEqual([["gayatri", "r1"], ["mahamrityunjaya", "r3"], ["omnamahshivaya", "r2"]]);
    expect(extras.map((r) => r.id)).toEqual(["r4", "r5"]);
  });

  it("every text exists in all ten languages with no raw keys, and the names are translated", async () => {
    const dict = (c: string) => JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "locales", `${c}.json`), "utf8")).mantras;
    const en = dict("en");
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join();
    for (const l of LOCALES) {
      const d = dict(l.code);
      for (const [k, v] of Object.entries(en)) if (typeof v === "string") { expect(d[k], `${l.code}.${k}`).toBeTruthy(); expect(ph(d[k]), `${l.code}.${k}`).toBe(ph(v)); }
      for (const k of MANTRA_CATEGORIES) expect(d.categories[k], `${l.code}.categories.${k}`).toBeTruthy();
      for (const c of MANTRA_CATALOG) expect(d.items[c.id], `${l.code}.items.${c.id}`).toBeTruthy();
    }
    await act(async () => { await setLanguage("ta"); });
    const { container } = mount();
    expect(container.textContent).not.toMatch(/mantras\.[a-zA-Z]+/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(dict("ta").title);
    expect(names()[0]).toBe(dict("ta").items.gayatri);
    expect(within(screen.getByTestId("mantra-filters")).getAllByRole("button")).toHaveLength(12);
  });

  it("the category bar hides its scrollbar", () => {
    mount();
    const cls = screen.getByTestId("mantra-filters").className;
    expect(cls).toContain("[scrollbar-width:none]");
    expect(cls).toContain("[&::-webkit-scrollbar]:hidden");
  });
});
