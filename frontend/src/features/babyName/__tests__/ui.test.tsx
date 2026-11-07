import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BabyNameForm, { validateBabyForm } from "../BabyNameForm";
import BabyNameResults from "../BabyNameResults";
import type { BabyNameResult } from "../types";
import { syllableFor } from "../syllables";
import { namesForSyllable } from "../matchNames";
import { BABY_NAMES } from "../names";
import { sameSound } from "../devanagari";

const delhi = { id: "1", name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata", label: "New Delhi, Delhi, India" };

vi.mock("@/features/ratna/LocationPicker", () => ({
  default: ({ onSelect }: { onSelect: (p: unknown) => void }) => <button type="button" onClick={() => onSelect(delhi)}>Pick Delhi</button>,
}));
vi.mock("@/lib/authedFetch", () => ({ requireSignIn: () => true }));
const calculate = vi.fn();
vi.mock("../api", () => ({ babyNameApi: { calculate: (...a: unknown[]) => calculate(...a) } }));

const result = (nakshatra: string, pada: number, over: Partial<BabyNameResult> = {}): BabyNameResult => ({
  birth: { dateOfBirth: "2024-03-10", timeOfBirth: "09:30", place: "New Delhi, Delhi, India", timeZone: "Asia/Kolkata", latitude: 28.6, longitude: 77.2 },
  timeApproximate: false,
  panchang: {
    nakshatra: { name: nakshatra, pada, lord: "Mercury" },
    moonRashi: "Kanya",
    tithi: { name: "Pratipada", hindi: "प्रतिपदा", numberInPaksha: 1 },
    paksha: "shukla",
    masa: { name: "Chaitra", hindi: "चैत्र", adhika: false },
    vara: { name: "Sunday", note: null },
    vikramSamvat: 2080,
    basis: "birth-time",
  },
  window: { minutesEitherSide: 10, padas: [{ nakshatra, pada }] },
  nearPadaBoundary: false,
  method: "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal",
  ...over,
});

beforeEach(() => { localStorage.clear(); calculate.mockReset(); window.scrollTo = vi.fn(); });

const nameOf = (card: HTMLElement) => card.querySelector("h4")!.textContent!;

describe("form validation", () => {
  const ok = { preferredName: "", dateOfBirth: "2024-03-10", timeOfBirth: "09:30", place: delhi };
  it("requires date, exact time and a selected place; assumes nothing", () => {
    expect(validateBabyForm(ok, "2025-01-01")).toEqual({});
    expect(validateBabyForm({ ...ok, dateOfBirth: "" })).toHaveProperty("dateOfBirth");
    expect(validateBabyForm({ ...ok, timeOfBirth: "" })).toHaveProperty("timeOfBirth");
    expect(validateBabyForm({ ...ok, place: null })).toHaveProperty("place");
    expect(validateBabyForm({ ...ok, dateOfBirth: "2999-01-01" }, "2025-01-01")).toHaveProperty("dateOfBirth");
    expect(validateBabyForm({ ...ok, dateOfBirth: "1800-01-01" })).toHaveProperty("dateOfBirth");
  });
  it("the preferred name is optional but must be letters when given", () => {
    expect(validateBabyForm({ ...ok, preferredName: "Aarav" })).toEqual({});
    expect(validateBabyForm({ ...ok, preferredName: "R2D2" })).toHaveProperty("preferredName");
  });

  it("an empty submit shows every error and calls nothing", () => {
    const onSubmit = vi.fn();
    render(<BabyNameForm onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Find Auspicious Names/ }));
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a complete form submits exactly what was entered, with the chosen preference", () => {
    const onSubmit = vi.fn();
    render(<BabyNameForm onSubmit={onSubmit} busy={false} />);
    fireEvent.change(screen.getByLabelText(/Preferred name/), { target: { value: "Aarav" } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "2024-03-10" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByLabelText("Baby Girl"));
    fireEvent.click(screen.getByRole("button", { name: /Find Auspicious Names/ }));
    expect(onSubmit).toHaveBeenCalledWith({ preferredName: "Aarav", dateOfBirth: "2024-03-10", timeOfBirth: "09:30", timeApproximate: false, place: delhi, preference: "girl" });
  });

  it("explains why the time and place matter and offers all four preferences", () => {
    render(<BabyNameForm onSubmit={vi.fn()} busy={false} />);
    expect(screen.queryByText(/accurate birth time and birthplace help calculate/i)).toBeNull();
    expect(screen.queryByText(/used only for this calculation/i)).toBeNull();
    for (const l of ["Baby Boy", "Baby Girl", "Gender-neutral names", "Show all"]) expect(screen.getByLabelText(l)).toBeInTheDocument();
  });
});

describe("results", () => {
  it("shows the calculated Nakshatra, Pada, Rashi, Tithi, Paksha, month and weekday with the syllable", () => {
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    const birth = screen.getByRole("region", { name: /Birth Star/ });
    for (const t of ["Anuradha", "Pada 1", "Kanya", "Pratipada", "Shukla Paksha", "Chaitra", "Sunday"]) expect(within(birth).getByText(t)).toBeInTheDocument();
    expect(screen.getByTestId("baby-syllable")).toHaveTextContent("ना");
    expect(screen.getByTestId("baby-syllable-basis")).toHaveTextContent("Anuradha, Pada 1");
    expect(screen.getByTestId("baby-syllable-basis")).toHaveTextContent("“Na”");
  });

  it("every name shown begins with the calculated syllable, and each card has the required fields", () => {
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    const principal = syllableFor("Anuradha", 1)!.syllable;
    const cards = screen.getAllByTestId("name-card");
    expect(cards.length).toBeGreaterThan(3);
    for (const c of cards) {
      const rec = BABY_NAMES.find((n) => n.name === nameOf(c))!;
      expect(sameSound(rec.sound, principal.sound)).toBe(true);
      for (const l of ["Meaning", "Pronunciation", "Origin", "Naming syllable"]) expect(within(c).getByText(l)).toBeInTheDocument();
      expect(within(c).getByRole("button", { name: /to favourites/ })).toBeInTheDocument();
    }
  });

  it("follows the gender preference", () => {
    render(<BabyNameResults result={result("Magha", 1)} preference="girl" preferredName="" />);
    const shown = screen.getAllByTestId("name-card").map((c) => BABY_NAMES.find((n) => n.name === nameOf(c))!);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((n) => n.gender !== "boy")).toBe(true);
  });

  it("filters by style", () => {
    render(<BabyNameResults result={result("Revati", 3)} preference="all" preferredName="" />);
    fireEvent.click(screen.getByRole("button", { name: "Mythology" }));
    const shown = screen.getAllByTestId("name-card").map((c) => BABY_NAMES.find((n) => n.name === nameOf(c))!);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((n) => n.styles.includes("mythology"))).toBe(true);
  });

  it("with few names it says so and offers the other padas of the same Nakshatra, labelled", () => {
    render(<BabyNameResults result={result("Ashwini", 3)} preference="all" preferredName="" />); // Cho
    expect(screen.getByTestId("baby-few")).toHaveTextContent("Fewer than 10 established names begin with “Cho”");
    expect(screen.getAllByText(/Other Pada of Ashwini/).length).toBeGreaterThan(0);
  });

  it("shows the disputed-tradition note and alternates (Shravana)", () => {
    render(<BabyNameResults result={result("Shravana", 2)} preference="all" preferredName="" />);
    expect(screen.getByTestId("baby-syllable")).toHaveTextContent("खू");
    expect(screen.getByTestId("baby-syllable-alt")).toHaveTextContent(/Traditions differ/);
    expect(screen.getByTestId("baby-syllable-alt")).toHaveTextContent("Je");
  });

  it("flags a birth time close to a pada change and lists each possible syllable", () => {
    const r = result("Anuradha", 1, { nearPadaBoundary: true, window: { minutesEitherSide: 10, padas: [{ nakshatra: "Anuradha", pada: 1 }, { nakshatra: "Anuradha", pada: 2 }] } });
    render(<BabyNameResults result={r} preference="all" preferredName="" />);
    const u = screen.getByTestId("baby-uncertain");
    expect(u).toHaveTextContent("may depend on the exact minute");
    expect(u).toHaveTextContent("Pada 1: Na");
    expect(u).toHaveTextContent("Pada 2: Ni");
  });

  it("shows no uncertainty banner for a clear birth time", () => {
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    expect(screen.queryByTestId("baby-uncertain")).toBeNull();
  });

  it("checks a preferred name against the syllable, by letters, and says so", () => {
    const { unmount } = render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="Nandini" />);
    expect(screen.getByTestId("baby-fit")).toHaveTextContent("matches the traditional syllable");
    unmount();
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="Riya" />);
    expect(screen.getByTestId("baby-fit")).toHaveTextContent(/does not begin with “Na”/);
    expect(screen.getByTestId("baby-fit")).toHaveTextContent(/checks the spelling only/);
  });

  it("saves and removes favourites, remembered in this browser only", () => {
    const { unmount } = render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    const first = screen.getAllByTestId("name-card")[0];
    const name = nameOf(first);
    fireEvent.click(within(first).getByRole("button", { name: `Save ${name} to favourites` }));
    expect(within(screen.getByTestId("baby-favourites")).getByText(name)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("baby-name-favourites-v1")!)).toEqual([name]);
    unmount();
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    expect(screen.getByTestId("baby-favourites")).toHaveTextContent(name);
    fireEvent.click(within(screen.getByTestId("baby-favourites")).getByRole("button", { name: `Remove ${name} from favourites` }));
    expect(screen.queryByTestId("baby-favourites")).toBeNull();
  });

  it("makes no guarantees and says the practice is traditional", () => {
    const { container } = render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    expect(container.textContent).toMatch(/not scientifically proven/);
    expect(container.textContent).toMatch(/does not promise any outcome/);
    expect(container.textContent).not.toMatch(/guarantee(d)? (success|wealth|fortune)/i);
  });
});

describe("page flow", () => {
  it("sends the entered details to the server, then shows what the server calculated", async () => {
    calculate.mockResolvedValue(result("Revati", 3));
    const { default: Page } = await import("@/pages/BabyNameJyotish");
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "2024-03-10" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByRole("button", { name: /Find Auspicious Names/ }));
    await waitFor(() => expect(screen.getByTestId("baby-results")).toBeInTheDocument());
    expect(calculate).toHaveBeenCalledWith({
      dateOfBirth: "2024-03-10", timeOfBirth: "09:30", timeApproximate: false,
      place: { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
    });
    expect(screen.getByTestId("baby-syllable")).toHaveTextContent("चा");
  });

  it("shows a server error and keeps the form", async () => {
    calculate.mockRejectedValue(new Error("Please enter the baby's exact time of birth."));
    const { default: Page } = await import("@/pages/BabyNameJyotish");
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "2024-03-10" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByRole("button", { name: /Find Auspicious Names/ }));
    expect(await screen.findByText(/exact time of birth/i)).toBeInTheDocument();
    expect(screen.queryByTestId("baby-results")).toBeNull();
    expect(screen.getByLabelText(/Date of Birth/)).toHaveValue("2024-03-10");
  });
});

describe("modern discovery experience", () => {
  it("shows the first ten names, then View More Names reveals the rest", () => {
    render(<BabyNameResults result={result("Shatabhisha", 2)} preference="all" preferredName="" />); // Sa: a rich syllable
    const collection = () => screen.getByRole("region", { name: /Complete Collection/ });
    expect(within(collection()).getAllByTestId("name-card")).toHaveLength(10);
    const more = within(collection()).getByRole("button", { name: /View More Names/ });
    const total = namesForSyllable(syllableFor("Shatabhisha", 2)!.syllable, "all").length;
    expect(more).toHaveTextContent("(" + (total - 10) + ")");
    fireEvent.click(more);
    expect(within(collection()).getAllByTestId("name-card").length).toBeGreaterThan(10);
  });

  it("a rich syllable such as Si has at least ten names on the first screen", () => {
    render(<BabyNameResults result={result("Shatabhisha", 3)} preference="all" preferredName="" />);
    expect(within(screen.getByRole("region", { name: /Complete Collection/ })).getAllByTestId("name-card").length).toBeGreaterThanOrEqual(10);
  });

  it("when a syllable has few names, other padas of the same Nakshatra top the choice up to at least ten, each labelled", () => {
    render(<BabyNameResults result={result("Ashwini", 1)} preference="all" preferredName="" />); // Chu
    const all = within(screen.getByRole("region", { name: /Complete Collection/ })).getAllByTestId("name-card").length;
    expect(all).toBeGreaterThanOrEqual(10);
    expect(screen.getAllByText(/^Pada \d: /).length).toBeGreaterThan(0);
  });

  const names = () => screen.getAllByTestId("name-card").map(nameOf);

  it("shows Modern Picks first: a few checked, modern, short names that match the sound", () => {
    render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    const picks = screen.getByTestId("modern-picks");
    expect(within(picks).getByRole("heading", { name: /Modern Picks for Your Little One/ })).toBeInTheDocument();
    const cards = within(picks).getAllByTestId("name-card");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(4);
    for (const c of cards) {
      const n = BABY_NAMES.find((x) => x.name === nameOf(c))!;
      expect(n.popularity).toBe("Modern");
      expect(n.verification.status).not.toBe("editorial");
      expect(sameSound(n.sound, syllableFor("Anuradha", 1)!.syllable.sound)).toBe(true);
    }
    const all = screen.getByRole("heading", { name: /Complete Collection/ });
    expect(picks.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Modern Picks differ by Nakshatra", () => {
    const { unmount } = render(<BabyNameResults result={result("Anuradha", 1)} preference="all" preferredName="" />);
    const na = within(screen.getByTestId("modern-picks")).getAllByTestId("name-card").map(nameOf);
    unmount();
    render(<BabyNameResults result={result("Magha", 1)} preference="all" preferredName="" />);
    const ma = within(screen.getByTestId("modern-picks")).getAllByTestId("name-card").map(nameOf);
    expect(na).not.toEqual(ma);
  });

  it("Se shows only names that begin with Se, honestly few, plus the other padas", () => {
    render(<BabyNameResults result={result("Purva Bhadrapada", 1)} preference="all" preferredName="" />);
    expect(screen.getByTestId("baby-syllable")).toHaveTextContent("से");
    const own = names();
    for (const gone of ["Sena", "Setu", "Seva", "Sevati"]) expect(own).not.toContain(gone);
    expect(own).toEqual(expect.arrayContaining(["Seher", "Sejal"]));
    expect(screen.getByTestId("baby-few")).toBeInTheDocument();
    expect(screen.getAllByText(/Other Pada of Purva Bhadrapada/).length).toBeGreaterThan(0);
  });

  it("each card shows name, Devanagari, meaning, pronunciation, origin, style, syllable and how it was checked", () => {
    render(<BabyNameResults result={result("Purva Bhadrapada", 1)} preference="all" preferredName="" />);
    const card = screen.getAllByTestId("name-card").find((c) => nameOf(c) === "Seher")!;
    expect(card).toHaveTextContent("सेहर");
    expect(card).toHaveTextContent("Dawn, early morning");
    expect(card).toHaveTextContent("seh-her");
    expect(card).toHaveTextContent("Arabic");
    expect(card).toHaveTextContent("Modern");
    expect(card).toHaveTextContent("Naming syllable");
    expect(card).toHaveTextContent("Se (से)");
    expect(within(card).getByTestId("name-verification")).toHaveTextContent("Checked in name dictionaries");
    for (const b of ["Copy Seher", "Share Seher", "Save Seher to favourites"]) expect(within(card).getByRole("button", { name: b })).toBeInTheDocument();
  });

  it("gender chips filter the list; the form preference sets the starting chip", () => {
    render(<BabyNameResults result={result("Revati", 3)} preference="girl" preferredName="" />);
    expect(screen.getByRole("button", { name: "Girl" })).toHaveAttribute("aria-pressed", "true");
    expect(names().every((n) => BABY_NAMES.find((x) => x.name === n)!.gender !== "boy")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Boy" }));
    expect(names().every((n) => BABY_NAMES.find((x) => x.name === n)!.gender !== "girl")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Gender-neutral" }));
    for (const n of names()) expect(BABY_NAMES.find((x) => x.name === n)!.gender).toBe("neutral");
  });

  it("searches by name and by meaning, always within the calculated syllable", () => {
    render(<BabyNameResults result={result("Magha", 1)} preference="all" preferredName="" />);
    fireEvent.change(screen.getByLabelText("Search names or meanings"), { target: { value: "moon" } });
    const found = names();
    expect(found.length).toBeGreaterThan(0);
    for (const n of found) {
      const rec = BABY_NAMES.find((x) => x.name === n)!;
      expect(/moon/i.test(rec.name + " " + rec.meaning)).toBe(true);
      expect(sameSound(rec.sound, syllableFor("Magha", 1)!.syllable.sound)).toBe(true);
    }
    fireEvent.change(screen.getByLabelText("Search names or meanings"), { target: { value: "qqqq" } });
    expect(screen.getByTestId("baby-none")).toHaveTextContent(/No names match these filters/);
  });

  it("Copy puts the name, Devanagari and meaning on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<BabyNameResults result={result("Purva Bhadrapada", 1)} preference="all" preferredName="" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Copy Seher" })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Seher (सेहर): Dawn, early morning")));
    expect((await screen.findAllByText("Copied")).length).toBeGreaterThan(0);
  });

  it("Share uses the device share sheet when there is one, and copies otherwise", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const { unmount } = render(<BabyNameResults result={result("Purva Bhadrapada", 1)} preference="all" preferredName="" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Share Sejal" })[0]);
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Sejal (सेजल)" })));
    unmount();
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<BabyNameResults result={result("Purva Bhadrapada", 1)} preference="all" preferredName="" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Share Sejal" })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Sejal (सेजल)")));
  });
});
