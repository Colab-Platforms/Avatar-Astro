import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TermInfo from "@/components/astrology/TermInfo";
import { GLOSSARY, getTerm } from "@/lib/astroGlossary";
import { BirthChartDiagram } from "../BirthChartDiagram";
import GunaMilanPanel from "../GunaMilanPanel";
import { kundaliApi } from "../api";

vi.mock("@/features/ratna/LocationPicker", () => ({
  default: ({ onSelect }: { onSelect: (p: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ id: "1", name: "Delhi", admin1: null, country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", label: "Delhi" })}>pick place</button>
  ),
}));

describe("glossary", () => {
  it("has one definition per term and resolves aliases", () => {
    const names = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(getTerm("Moon sign")?.term).toBe("Chandra Rashi");
    expect(getTerm("ascendant")?.term).toBe("Lagna");
    for (const t of ["Rashi", "Sade Sati", "Nakshatra", "Lagna", "Dosha", "Guna Milan", "Rahu Kaal", "Tithi", "Dasha"]) expect(getTerm(t)).toBeTruthy();
  });
});

describe("TermInfo", () => {
  it("opens the explanation in place and closes it again", () => {
    render(<p><TermInfo term="Lagna">Lagna</TermInfo></p>);
    const btn = screen.getByRole("button", { name: /what does lagna mean/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(screen.getByTestId("term-info-lagna")).toHaveTextContent(/rising over the eastern horizon/);
    fireEvent.click(btn);
    expect(screen.queryByTestId("term-info-lagna")).toBeNull();
  });
  it("renders plain text for an unknown term", () => {
    render(<TermInfo term="Nonsense">Nonsense</TermInfo>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("BirthChartDiagram", () => {
  it("places grahas in their calculated houses and numbers signs from the Lagna", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Cancer" grahas={[{ planet: "Moon", sign: "Sagittarius", house: 6 }, { planet: "Sun", sign: "Aries", house: 10 }]} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", expect.stringContaining("Chandra (Moon) in house 6"));
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain("Chandra");
    expect(texts).toContain("Surya");
    expect(texts[0]).toBe("4"); // Cancer is sign 4, house 1
  });
});

describe("GunaMilanPanel", () => {
  const place = { id: "1", name: "Delhi", admin1: null, country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", label: "Delhi" };
  const mk = (over: object[] = [{}, {}]) =>
    [
      { name: "Asha", gender: "Female", day: "15", month: "8", year: "1992", time: "", place: null, ...over[0] },
      { name: "Ravi", gender: "Male", day: "22", month: "11", year: "1991", time: "", place: null, ...over[1] },
    ] as never;
  const kootas = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"].map((koota, i) => ({ koota, max: [1, 2, 3, 4, 5, 6, 7, 8][i], score: i % 2 ? 0 : [1, 2, 3, 4, 5, 6, 7, 8][i], a: "x", b: "y", note: "n" }));
  const ok = {
    a: { lagna: null, planets: null, navamsa: null } as never, b: { lagna: null, planets: null, navamsa: null } as never,
    ashtakoota: { total: 21, max: 36, kootas, doshas: [{ name: "Nadi Dosha", present: false, cancelled: false, note: "ok" }], band: "Acceptable (18 to 24)", method: ["m"], moons: { a: { sign: "Leo", nakshatra: "Magha", pada: 1 }, b: { sign: "Aries", nakshatra: "Bharani", pada: 2 } } },
    mangal: { a: { present: false, marsHouse: 3, note: "a" }, b: { present: false, marsHouse: 5, note: "b" }, verdict: "Neither chart shows Mangal Dosha." },
  };
  beforeEach(() => vi.restoreAllMocks());

  it("makes no request and shows no score when birth time and place are missing, and offers a way back to enter them", () => {
    const spy = vi.spyOn(kundaliApi, "match");
    const back = vi.fn();
    render(<GunaMilanPanel people={mk()} onAddDetails={back} />);
    expect(screen.getByTestId("guna-needs-details")).toHaveTextContent(/birth time and birth place of both people/);
    fireEvent.click(screen.getByRole("button", { name: /add birth time and place/i }));
    expect(back).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("guna-result")).toBeNull();
  });

  it("a time without a place (or a place without a time) never triggers a calculation or a score", () => {
    const spy = vi.spyOn(kundaliApi, "match");
    const { unmount } = render(<GunaMilanPanel people={mk([{ time: "10:30", place }, { time: "18:15", place: null }])} onAddDetails={() => {}} />);
    expect(screen.queryByTestId("guna-result")).toBeNull();
    unmount();
    render(<GunaMilanPanel people={mk([{ time: "10:30", place }, { time: "", place }])} onAddDetails={() => {}} />);
    expect(screen.queryByTestId("guna-result")).toBeNull();
    expect(screen.queryByText(/\/ 36 Guna/)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("needs both people: one person's details alone does not trigger a calculation", () => {
    const spy = vi.spyOn(kundaliApi, "match");
    render(<GunaMilanPanel people={mk([{ time: "10:30", place }, {}])} onAddDetails={() => {}} />);
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows an unavailable state with retry, not a score, when the calculation fails", async () => {
    vi.spyOn(kundaliApi, "match").mockRejectedValue(new Error("Ashtakoota is down."));
    render(<GunaMilanPanel people={mk([{ time: "10:30", place }, { time: "18:15", place }])} onAddDetails={() => {}} />);
    expect(await screen.findByTestId("guna-unavailable")).toHaveTextContent(/Ashtakoota is down/);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByTestId("guna-result")).toBeNull();
  });

  it("calculates automatically with both people's details, male first, and renders all eight Kootas", async () => {
    const spy = vi.spyOn(kundaliApi, "match").mockResolvedValue(ok as never);
    render(<GunaMilanPanel people={mk([{ time: "18:15", place }, { time: "10:30", place }])} onAddDetails={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("guna-result")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ dateOfBirth: "1991-11-22", timeOfBirth: "10:30" }); // Ravi (male) first, with his own time
    expect(spy.mock.calls[0][1]).toMatchObject({ dateOfBirth: "1992-08-15", timeOfBirth: "18:15" });
    expect(screen.getByTestId("guna-table").querySelectorAll("tbody tr")).toHaveLength(8);
    expect(screen.getByText(/21 \/ 36 Guna/)).toBeInTheDocument();
  });
});
