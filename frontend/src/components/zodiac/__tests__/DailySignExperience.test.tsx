import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailySignExperience from "../DailySignExperience";
import { zodiacSigns } from "@/data/zodiacData";
import { todayKey } from "@/lib/dailyHoroscope";

const sections = (tag: string) => ({ overview: `Overview ${tag}`, career: `Career ${tag}`, love: `Love ${tag}`, health: `Health ${tag}`, mood: `Mood ${tag}`, opportunities: `Opps ${tag}`, mindful: `Mindful ${tag}`, guidance: `Guidance ${tag}` });
const ok = (sign: string, extra: object = {}) => ({ ok: true, status: 200, json: async () => ({ success: true, data: { sign, date: todayKey(), weekday: "x", timezone: "Asia/Kolkata", system: "w", cached: false, sections: { ...sections(sign), ...extra } } }) });
const mount = (name: string) => render(<MemoryRouter><DailySignExperience sign={zodiacSigns.find((s) => s.name === name)!} /></MemoryRouter>);
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
afterEach(() => vi.unstubAllGlobals());

describe("daily sign experience", () => {
  it("shows today's date, a Shuffle Cards button and five face-down cards, and no horoscope text before a card is tapped", async () => {
    fetchMock.mockResolvedValue(ok("Aries"));
    mount("Aries");
    expect(screen.getByRole("heading", { name: /Daily Horoscope – Aries/ })).toBeInTheDocument();
    expect(screen.getByTestId("reading-date")).toHaveTextContent(/\d{4}$/);
    expect(screen.getByTestId("shuffle-cards")).toHaveTextContent("Shuffle Cards");
    expect(screen.getAllByTestId(/^daily-card-/)).toHaveLength(5);
    expect(screen.getByTestId("deck-instruction")).toHaveTextContent("Shuffle the cards, then tap one");
    expect(screen.queryByTestId("daily-reading")).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toMatch(/interpretation\/horoscope\/aries$/);
  });

  it("tapping a card flips it, shows that tarot card with the deck's own meaning, then the structured reading once and in order", async () => {
    fetchMock.mockResolvedValue(ok("Leo"));
    mount("Leo");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId("reading-loading")).toBeNull());
    const card = screen.getByTestId("daily-card-2");
    const name = card.getAttribute("data-card")!;
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByTestId("selected-card-name")).toHaveTextContent(name);
    expect(screen.getByTestId("card-text").textContent).not.toMatch(/Leo$/); // the card text is the deck meaning, never the horoscope
    const reading = await screen.findByTestId("daily-reading");
    const ids = ["section-overview", "section-career", "section-love", "section-health", "section-mood", "section-opportunities", "section-mindful", "section-guidance"];
    const els = ids.map((i) => within(reading).getByTestId(i));
    els.forEach((e, i) => { if (i) expect(els[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); });
    for (const t of ["Overview Leo", "Career Leo", "Love Leo", "Health Leo", "Mood Leo", "Opps Leo", "Mindful Leo", "Guidance Leo"]) expect(screen.getAllByText(t)).toHaveLength(1); // shown once
    expect(within(reading).queryByText("Lucky Details")).toBeNull(); // nothing invented
    expect(screen.getByTestId("system-note")).toHaveTextContent("Western (tropical) Sun sign Leo");
    expect(screen.getByRole("heading", { name: /Daily Horoscope – Leo/ })).toBeInTheDocument();
  });

  it("shuffle disables the cards while running, then draws a new face-down set", async () => {
    fetchMock.mockResolvedValue(ok("Virgo"));
    mount("Virgo");
    const names = () => screen.getAllByTestId(/^daily-card-/).map((c) => c.getAttribute("data-card"));
    const first = names();
    let changed = false;
    for (let i = 0; i < 6 && !changed; i++) {
      fireEvent.click(screen.getByTestId("shuffle-cards"));
      expect(screen.getByTestId("shuffle-cards")).toBeDisabled();
      expect(screen.getByTestId("shuffle-cards")).toHaveTextContent("Shuffling…");
      await waitFor(() => expect(screen.getByTestId("shuffle-cards")).toHaveTextContent("Shuffle Cards"), { timeout: 4000 });
      changed = JSON.stringify(names()) !== JSON.stringify(first);
    }
    expect(changed).toBe(true);
    expect(screen.getAllByTestId(/^daily-card-/).every((c) => c.getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("shows lucky details only when the source supplied them", async () => {
    fetchMock.mockResolvedValue(ok("Capricorn", { lucky: { color: "Red", number: "9" } }));
    mount("Capricorn");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("daily-card-0"));
    expect(await screen.findByTestId("lucky-details")).toHaveTextContent("Red");
  });

  it("unavailable provider: clear message, cards locked, no reading; retry recovers", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ success: false, code: "HOROSCOPE_UNAVAILABLE" }) });
    mount("Scorpio");
    expect(await screen.findByTestId("reading-unavailable")).toHaveTextContent("isn't available right now");
    expect(screen.getByTestId("daily-card-0")).toBeDisabled();
    expect(screen.queryByTestId("daily-reading")).toBeNull();
    fetchMock.mockResolvedValueOnce(ok("Scorpio"));
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    await waitFor(() => expect(screen.getByTestId("daily-card-0")).not.toBeDisabled());
  });

  it("network failure shows an error with retry", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    mount("Gemini");
    expect(await screen.findByTestId("reading-error")).toHaveTextContent("couldn't reach the server");
  });
});
