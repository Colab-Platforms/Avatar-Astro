import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EventPicker from "../EventPicker";
import MuhuratForm, { presetRange, validateRange } from "../MuhuratForm";
import MuhuratResults from "../MuhuratResults";
import MuhuratCalendar from "../MuhuratCalendar";
import { EVENT_CARDS, GROUPS } from "../events";
import { addDays, addMonths, daysBetween, longDate, placeLabel, range12, time12, todayAt, windowText } from "../format";
import { buildIcs } from "../sharing";
import { savedId } from "../saved";
import type { DayResult, MuhuratPlace, MuhuratResult, MuhuratWindow } from "../types";

vi.mock("@/features/ratna/LocationPicker", () => ({
  default: ({ value, onSelect }: { value: unknown; onSelect: (p: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onSelect({ id: "1", name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata", label: "Mumbai, Maharashtra, India" })}>Pick Mumbai</button>
      <button type="button" onClick={() => onSelect({ id: "2", name: "Los Angeles", admin1: "California", country: "United States", latitude: 34.05, longitude: -118.24, timezone: "America/Los_Angeles", label: "Los Angeles" })}>Pick Los Angeles</button>
      {value ? <span>selected</span> : null}
    </div>
  ),
}));

const MUMBAI: MuhuratPlace = { name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" };

// A hand-written result in the server's shape. (The real calculations are tested in the backend against Drik Panchang.)
const win = (date: string, weekday: string, s: string, e: string, extra: Partial<MuhuratWindow> = {}): MuhuratWindow => ({
  date, weekday, startLocal: s, endLocal: e,
  startUtc: `${date}T${String(Number(s.slice(0, 2)) - 5).padStart(2, "0")}:${s.slice(3)}:00.000Z`, endUtc: `${date}T${String(Number(e.slice(0, 2)) - 5).padStart(2, "0")}:${e.slice(3)}:00.000Z`,
  durationMinutes: 100, score: 90, scoreParts: [{ label: "Meets every rule for this event", points: 32 }, { label: "Revati: a first-choice nakshatra", points: 30 }, { label: "Thursday: a first-choice weekday", points: 20 }, { label: "Length of the window", points: 8 }],
  panchang: { tithi: "Panchami", paksha: "Shukla", nakshatra: "Revati", pada: 2, yoga: "Sadhya", karana: "Bava" },
  changes: [], avoidedPeriods: [{ label: "Rahu Kalam", startLocal: "14:18", endLocal: "15:44" }, { label: "Yamaganda", startLocal: "07:09", endLocal: "08:34" }, { label: "Gulika Kalam", startLocal: "10:00", endLocal: "11:26" }],
  why: ["Nakshatra Revati is a first-choice nakshatra for griha pravesh.", "Shukla Panchami is one of the tithis this tradition accepts for it.", "Thursday is a first-choice weekday.", "Yoga Sadhya and the Bava karana are not among the avoided ones.", "The window lies outside Rahu Kalam, Yamaganda and Gulika Kalam for this place and date."],
  ...extra,
});
const day = (date: string, weekday: string, windows: MuhuratWindow[], blockers: string[] = []): DayResult => ({
  date, weekday, sunrise: "07:09", sunset: "18:05", windows, bestScore: windows[0]?.score ?? 0, blockers,
  avoidedPeriods: windows[0]?.avoidedPeriods ?? [], abhijit: { startLocal: "12:13", endLocal: "12:57" },
});
const best = win("2027-02-11", "Thursday", "11:27", "14:18", { score: 99 });
const o1 = win("2027-01-15", "Friday", "07:14", "08:37", { score: 94 });
const o2 = win("2027-02-22", "Monday", "15:47", "18:01", { score: 91 });
const second = win("2027-02-11", "Thursday", "08:40", "09:55", { score: 70 });

const result = (over: Partial<MuhuratResult> = {}): MuhuratResult => ({
  event: { id: "griha-pravesh", label: "Griha Pravesh Muhurat", confidence: "consensus", basis: "Fixed and gentle nakshatras rank first.", limitations: ["Rules differ for a newly built home."] },
  place: MUMBAI, startDate: "2027-01-10", endDate: "2027-03-10",
  method: { id: "m", label: "Drik Panchang · Lahiri sidereal · Amanta months · Muhurta Chintamani conventions", note: "Tithi, nakshatra, yoga and karana come from the real Sun and Moon positions." },
  evaluated: ["Tithi and paksha", "Nakshatra", "Yoga", "Karana", "Vedic weekday (Vara), from local sunrise", "Sunrise and sunset at the event location", "Rahu Kalam", "Yamaganda", "Gulika Kalam", "Kharmas (the Sun's sidereal sign)"],
  rules: ["Nakshatra, first choice: Rohini.", "Weekday, first choice: Monday, Thursday, Friday."],
  best: { ...best, windows: undefined } as unknown as MuhuratWindow, others: [o1, o2],
  days: [
    day("2027-01-14", "Thursday", [], ["Nakshatra Bharani is not among the suitable nakshatras"]),
    day("2027-01-15", "Friday", [o1]),
    day("2027-02-11", "Thursday", [best, second]),
    day("2027-02-22", "Monday", [o2]),
  ],
  totals: { days: 4, daysWithWindows: 3, windows: 4 }, notes: [],
  ...over,
});

const saver = () => { const s = { ids: new Set<string>(), toggle: vi.fn((e: { id: string }) => { s.ids.has(e.id) ? s.ids.delete(e.id) : s.ids.add(e.id); }), isSaved: (id: string) => s.ids.has(id) }; return s; };

beforeEach(() => { window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => null }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("format and dates", () => {
  it("12-hour clock", () => {
    expect(time12("00:05")).toBe("12:05 AM"); expect(time12("12:00")).toBe("12:00 PM"); expect(time12("13:05")).toBe("1:05 PM"); expect(time12("10:25")).toBe("10:25 AM");
    expect(range12("10:25", "12:10")).toBe("10:25 AM – 12:10 PM");
  });
  it("a calendar date never shifts with the viewer's zone", () => {
    expect(longDate("2026-12-18")).toBe("Friday, 18 December 2026");
    expect(longDate("2027-03-01")).toBe("Monday, 1 March 2027");
  });
  it("today is judged at the event place: the same instant is two different dates", () => {
    const now = new Date("2026-11-07T06:00:00Z");
    expect(todayAt("Asia/Kolkata", now)).toBe("2026-11-07");
    expect(todayAt("America/Los_Angeles", now)).toBe("2026-11-06");
    expect(todayAt("Pacific/Kiritimati", new Date("2026-11-07T11:00:00Z"))).toBe("2026-11-08"); // UTC+14
  });
  it("date arithmetic crosses month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
  it("windowText states the time, place, local-time basis and that it is not a guarantee", () => {
    const t = windowText(best, "Griha Pravesh Muhurat", MUMBAI);
    expect(t).toContain("Thursday, 11 February 2027"); expect(t).toContain("11:27 AM – 2:18 PM"); expect(t).toContain("Mumbai, Maharashtra, India"); expect(t).toMatch(/not a guarantee/);
  });
});

describe("event selection", () => {
  it("the page shows the supplied logo from its public path, near the heading, and hides it rather than substituting anything if the file is missing", async () => {
    vi.resetModules();
    vi.doMock("@/features/muhurat/api", () => ({ muhuratApi: { search: vi.fn() } }));
    const { default: Page } = await import("@/pages/MuhuratFinder");
    render(<MemoryRouter><Page /></MemoryRouter>);
    const logo = screen.getByTestId("muhurat-logo") as HTMLImageElement;
    expect(logo.getAttribute("src")).toBe("/images/muhurat-logo.png");
    expect(logo.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(logo.className).toContain("object-contain"); // never stretched
    fireEvent.error(logo);
    expect(logo.style.display).toBe("none");
    vi.doUnmock("@/features/muhurat/api");
  });

  it("has the fifteen events in four groups, each with an icon and a description", () => {
    expect(EVENT_CARDS).toHaveLength(15);
    expect(GROUPS.map((g) => g.label)).toEqual(["Personal & family", "Home & property", "Vehicle & travel", "Business & career"]);
    expect(EVENT_CARDS.filter((e) => e.group === "personal").map((e) => e.label)).toEqual(["Marriage Muhurat", "Engagement Muhurat", "Namkaran Muhurat", "Annaprashan Muhurat", "Mundan Muhurat"]);
    for (const e of EVENT_CARDS) { expect(e.Icon).toBeTruthy(); expect(e.summary.length).toBeGreaterThan(10); }
  });
  it("shows one group at a time (never all fifteen) and every event is reachable through the tabs", () => {
    const onPick = vi.fn();
    render(<EventPicker onPick={onPick} />);
    expect(screen.getAllByTestId("event-card")).toHaveLength(5);
    const seen: string[] = [];
    for (const g of GROUPS) {
      fireEvent.click(screen.getByRole("tab", { name: g.label }));
      expect(screen.getByRole("tab", { name: g.label })).toHaveAttribute("aria-selected", "true");
      for (const c of screen.getAllByTestId("event-card")) seen.push(within(c).getByText(/Muhurat$/).textContent!);
    }
    expect(seen).toHaveLength(15);
    expect(new Set(seen).size).toBe(15);
  });
  it("picking a card reports that event", () => {
    const onPick = vi.fn();
    render(<EventPicker onPick={onPick} />);
    fireEvent.click(screen.getByRole("tab", { name: "Home & property" }));
    fireEvent.click(screen.getByText("Griha Pravesh Muhurat"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "griha-pravesh" }));
  });
});

describe("form", () => {
  const event = EVENT_CARDS.find((e) => e.id === "griha-pravesh")!;
  it("asks for no birth details", () => {
    render(<MuhuratForm event={event} onBack={() => {}} onSubmit={() => {}} busy={false} />);
    expect(screen.queryByLabelText(/date of birth|time of birth|place of birth/i)).toBeNull();
    expect(document.querySelector("input[type=time]")).toBeNull();
    expect(screen.getByTestId("form-event")).toHaveTextContent("Griha Pravesh Muhurat");
  });
  it("needs the event location to be chosen", () => {
    const onSubmit = vi.fn();
    render(<MuhuratForm event={event} onBack={() => {}} onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/choose the event location/);
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("shows the chosen place's city, state, country, coordinates and time zone", () => {
    render(<MuhuratForm event={event} onBack={() => {}} onSubmit={() => {}} busy={false} />);
    fireEvent.click(screen.getByText("Pick Mumbai"));
    const d = screen.getByTestId("place-details");
    for (const t of ["Mumbai", "Maharashtra", "India", "19.0760", "72.8777", "Asia/Kolkata"]) expect(d).toHaveTextContent(t);
  });
  it("submits the place, a preset range from today at the event place, and the preferences", () => {
    const onSubmit = vi.fn();
    render(<MuhuratForm event={event} onBack={() => {}} onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByText("Pick Mumbai"));
    fireEvent.click(screen.getByLabelText("Next 30 days"));
    fireEvent.click(screen.getByText("Preferences"));
    fireEvent.click(screen.getByLabelText("Thu"));
    fireEvent.change(screen.getByLabelText("Time of day"), { target: { value: "morning" } });
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    const v = onSubmit.mock.calls[0][0];
    expect(v.place.name).toBe("Mumbai");
    expect(daysBetween(v.startDate, v.endDate)).toBe(29);
    expect(v.preferences).toEqual({ weekdays: [4], timeOfDay: "morning", direction: undefined });
  });
  it("presets count from today at the event place, so the same moment gives different starts in different cities", () => {
    const now = new Date("2026-11-07T06:00:00Z");
    expect(presetRange("30d", "Asia/Kolkata", now)).toEqual({ startDate: "2026-11-07", endDate: "2026-12-06" });
    expect(presetRange("30d", "America/Los_Angeles", now)).toEqual({ startDate: "2026-11-06", endDate: "2026-12-05" });
    expect(presetRange("3m", "Asia/Kolkata", now)).toEqual({ startDate: "2026-11-07", endDate: "2027-02-06" });
    expect(presetRange("6m", "Asia/Kolkata", now)).toEqual({ startDate: "2026-11-07", endDate: "2027-05-06" });
  });
  it("custom dates are validated: both set, not backwards, not in the past, at most 366 days", () => {
    expect(validateRange("", "2027-01-01", "2026-11-07")).toMatch(/both/);
    expect(validateRange("2027-02-01", "2027-01-01", "2026-11-07")).toMatch(/on or after/);
    expect(validateRange("2026-11-01", "2026-12-01", "2026-11-07")).toMatch(/past/);
    expect(validateRange("2026-11-07", "2027-11-08", "2026-11-07")).toMatch(/366/);
    expect(validateRange("2026-11-07", "2027-11-07", "2026-11-07")).toBeNull();
    expect(validateRange("2026-11-07", "2026-11-07", "2026-11-07")).toBeNull();
  });
  it("custom range shows date fields and reports an invalid range", () => {
    const onSubmit = vi.fn();
    render(<MuhuratForm event={event} onBack={() => {}} onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByText("Pick Mumbai"));
    fireEvent.click(screen.getByLabelText("Custom dates"));
    fireEvent.change(screen.getByLabelText("Start date *"), { target: { value: "2099-05-10" } });
    fireEvent.change(screen.getByLabelText("End date *"), { target: { value: "2099-05-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/on or after/);
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("only Travel asks for a direction", () => {
    const { unmount } = render(<MuhuratForm event={event} onBack={() => {}} onSubmit={() => {}} busy={false} />);
    fireEvent.click(screen.getByText("Preferences"));
    expect(screen.queryByLabelText("Direction of travel")).toBeNull();
    unmount();
    const onSubmit = vi.fn();
    render(<MuhuratForm event={EVENT_CARDS.find((e) => e.id === "travel")!} onBack={() => {}} onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByText("Pick Mumbai"));
    fireEvent.click(screen.getByText("Preferences"));
    fireEvent.change(screen.getByLabelText("Direction of travel"), { target: { value: "East" } });
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    expect(onSubmit.mock.calls[0][0].preferences.direction).toBe("East");
  });
});

describe("results", () => {
  it("summarises the search: event, location, dates and method", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    const s = screen.getByTestId("search-summary");
    expect(s).toHaveTextContent("Griha Pravesh Muhurat"); expect(s).toHaveTextContent("Mumbai, Maharashtra, India"); expect(s).toHaveTextContent("Asia/Kolkata");
    expect(s).toHaveTextContent("10 Jan 2027 to 10 Mar 2027"); expect(s).toHaveTextContent("Lahiri sidereal");
    expect(s).toHaveTextContent("4 suitable windows on 3 of 4 days");
  });
  it("shows the best Muhurat with the exact local window, Panchang, avoided periods and why", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    const b = screen.getByTestId("best-muhurat");
    expect(b).toHaveTextContent("Your Suitable Muhurat");
    expect(b).toHaveTextContent("Thursday, 11 February 2027");
    expect(within(b).getByTestId("window-time")).toHaveTextContent("11:27 AM – 2:18 PM");
    expect(b).toHaveTextContent("Mumbai, Maharashtra, India"); expect(b).toHaveTextContent(/local time/);
    for (const t of ["Shukla Panchami", "Revati", "Sadhya", "Bava"]) expect(b).toHaveTextContent(t);
    expect(b).toHaveTextContent("Rahu Kalam 2:18 PM – 3:44 PM"); expect(b).toHaveTextContent("Yamaganda 7:09 AM – 8:34 AM");
    expect(b).toHaveTextContent("Why this Muhurat?"); expect(b).toHaveTextContent("Nakshatra Revati is a first-choice nakshatra");
  });
  it("lists the other suitable dates, each with date, weekday, times and Panchang", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    const cards = screen.getAllByTestId("other-muhurat");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Friday, 15 January 2027"); expect(cards[0]).toHaveTextContent("7:14 AM – 8:37 AM"); expect(cards[0]).toHaveTextContent("Friday");
    expect(cards[1]).toHaveTextContent("3:47 PM – 6:01 PM");
  });
  it("has expandable calculation details with Panchang, avoided periods and the ranking", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    const b = screen.getByTestId("best-muhurat");
    const d = within(b).getByText("Calculation details").closest("details")!;
    expect(d).toHaveTextContent("Sunrise · Sunset"); expect(d).toHaveTextContent("7:09 AM · 6:05 PM"); expect(d).toHaveTextContent("Gulika Kalam: 10:00 AM – 11:26 AM"); expect(d).toHaveTextContent("ranked (");
    expect(d).toHaveTextContent("not a classical grade");
  });
  it("shows a short method label, what was evaluated, the rules, their basis and the limits, with no long disclaimer", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/agree across the Panchang references/);
    expect(screen.getByText("Rules differ for a newly built home.")).toBeInTheDocument();
    expect(screen.getByTestId("method-label")).toHaveTextContent("Drik Panchang · Lahiri sidereal · Amanta months");
    const ev = screen.getByTestId("evaluated");
    for (const t of ["Tithi and paksha", "Nakshatra", "Yoga", "Karana", "Rahu Kalam", "Yamaganda", "Gulika Kalam"]) expect(ev).toHaveTextContent(t);
    expect(screen.getByText("Limits and uncertainty")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/not scientifically proven|no guarantee|family priest|qualified jyotishi/i);
    expect(screen.getByTestId("muhurat-results").textContent).not.toMatch(/guaranteed|will bring|ensures|assured/i);
    cleanup();
    render(<MuhuratResults result={result({ event: { ...result().event, confidence: "general" } })} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/no extra event-specific rule has been added/);
  });
  it("shows a friendly no-result message with reasons, never a fabricated result, and can expand the range", () => {
    const onExpand = vi.fn();
    const r = result({ best: null, others: [], days: [day("2027-01-14", "Thursday", [], ["Chaturmas (Devshayani to Prabodhini Ekadashi) is avoided"]), day("2027-01-15", "Friday", [], ["Chaturmas (Devshayani to Prabodhini Ekadashi) is avoided"])], totals: { days: 2, daysWithWindows: 0, windows: 0 } });
    render(<MuhuratResults result={r} saver={saver()} onExpand={onExpand} onAgain={() => {}} />);
    expect(screen.queryByTestId("best-muhurat")).toBeNull(); expect(screen.queryByTestId("other-muhurat")).toBeNull();
    const n = screen.getByTestId("no-muhurat");
    expect(n).toHaveTextContent("No suitable window in this period"); expect(n).toHaveTextContent(/under the selected method/); expect(n).toHaveTextContent(/Chaturmas/); expect(n).toHaveTextContent("(2 days)");
    fireEvent.click(within(n).getByRole("button", { name: /Search until/ }));
    expect(onExpand).toHaveBeenCalledWith("2027-06-08"); // 90 days after 10 Mar 2027
  });
  it("does not offer to expand a search that is already a year long", () => {
    const r = result({ best: null, others: [], days: [], startDate: "2027-01-01", endDate: "2028-01-01", totals: { days: 366, daysWithWindows: 0, windows: 0 } });
    render(<MuhuratResults result={r} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    expect(screen.getByTestId("no-muhurat")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Search until/ })).toBeNull();
  });
});

describe("save, copy, share, calendar", () => {
  it("Save and Remove use the saver, keyed to event, place and start instant", () => {
    const s = saver();
    render(<MuhuratResults result={result()} saver={s} onExpand={() => {}} onAgain={() => {}} />);
    const b = screen.getByTestId("best-muhurat");
    fireEvent.click(within(b).getByRole("button", { name: /Save/ }));
    expect(s.toggle).toHaveBeenCalledWith(expect.objectContaining({ id: savedId("griha-pravesh", MUMBAI, best), eventLabel: "Griha Pravesh Muhurat" }));
    expect(within(b).getByRole("status")).toHaveTextContent("Saved in this browser.");
  });
  it("Copy writes the full timing line", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: write } });
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    fireEvent.click(within(screen.getByTestId("best-muhurat")).getByRole("button", { name: /Copy/ }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toContain("11:27 AM – 2:18 PM");
    expect(within(screen.getByTestId("best-muhurat")).getByRole("status")).toHaveTextContent("Timing copied.");
  });
  it("Share falls back to copying the text when the browser cannot share", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: write } });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    fireEvent.click(within(screen.getByTestId("best-muhurat")).getByRole("button", { name: /Share/ }));
    await waitFor(() => expect(within(screen.getByTestId("best-muhurat")).getByRole("status")).toHaveTextContent(/text was copied/));
  });
  it("Share uses the native share sheet when present", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    fireEvent.click(within(screen.getByTestId("best-muhurat")).getByRole("button", { name: /Share/ }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].text).toContain("Thursday, 11 February 2027");
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  it("Add to calendar downloads a file and says only that: it never claims the event was added", () => {
    const create = vi.fn(() => "blob:x");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    fireEvent.click(within(screen.getByTestId("best-muhurat")).getByRole("button", { name: /Add to calendar/ }));
    expect(create).toHaveBeenCalled();
    const status = within(screen.getByTestId("best-muhurat")).getByRole("status").textContent!;
    expect(status).toMatch(/downloaded/); expect(status).toMatch(/Open it to add/); expect(status).not.toMatch(/has been added|was added|added to your calendar\./);
  });
  it("the .ics file has the right instants, escapes text and carries a UID", () => {
    const ics = buildIcs("Griha Pravesh Muhurat", { ...MUMBAI, name: "Mumbai, MH" }, best, new Date("2026-11-07T00:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR"); expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("DTSTART:20270211T062700Z"); expect(ics).toContain("DTEND:20270211T091800Z"); expect(ics).toContain("DTSTAMP:20261107T000000Z");
    expect(ics).toContain("LOCATION:Mumbai\\, MH"); expect(ics).toContain("SUMMARY:Griha Pravesh Muhurat"); expect(ics).toMatch(/UID:.+@mybhagya/);
    expect(ics).toContain("\r\n");
  });
});

describe("calendar view", () => {
  const days: DayResult[] = [
    day("2027-01-28", "Thursday", []), day("2027-01-29", "Friday", [o1], []), day("2027-02-11", "Thursday", [best, second]),
    day("2027-02-12", "Friday", [], ["Tuesday is not a suitable weekday for this event"]), day("2027-03-02", "Tuesday", []),
  ];
  const cal = () => render(<MuhuratCalendar days={days} startDate="2027-01-28" endDate="2027-03-02" />);
  const cellFor = (n: number) => screen.getAllByTestId("calendar-day").find((c) => c.querySelector("span")?.textContent === String(n))!;

  it("starts at the first month and navigates within the search range only", () => {
    cal();
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("January 2027");
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("February 2027");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("March 2027");
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("February 2027");
  });
  it("marks each day: multiple windows, one window, none, or not calculated", () => {
    cal();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(cellFor(11)).toHaveAttribute("data-state", "multiple");
    expect(cellFor(12)).toHaveAttribute("data-state", "none");
    expect(cellFor(5)).toHaveAttribute("data-state", "not-calculated");
    expect(cellFor(5)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(cellFor(29)).toHaveAttribute("data-state", "available");
    expect(cellFor(28)).toHaveAttribute("data-state", "none");
    expect(cellFor(27)).toHaveAttribute("data-state", "not-calculated"); // before the range
  });
  it("describes each day for screen readers, and does not colour a whole date", () => {
    cal();
    expect(cellFor(29)).toHaveAttribute("aria-label", "Friday, 29 January 2027: 1 suitable window");
    expect(cellFor(28)).toHaveAttribute("aria-label", "Thursday, 28 January 2027: no qualifying window");
    // The marker is a bar showing only the window, between sunrise and sunset.
    const bar = cellFor(29).querySelector("span[aria-hidden]")!;
    expect(bar.children).toHaveLength(1);
    const style = (bar.children[0] as HTMLElement).style;
    expect(parseFloat(style.left)).toBeGreaterThan(0); expect(parseFloat(style.width)).toBeLessThan(50);
  });
  it("clicking a date lists its windows; a date without one says why", () => {
    cal();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(cellFor(11));
    const p = screen.getByTestId("calendar-day-panel");
    expect(p).toHaveTextContent("Thursday, 11 February 2027"); expect(p).toHaveTextContent("11:27 AM – 2:18 PM"); expect(p).toHaveTextContent("8:40 AM – 9:55 AM");
    fireEvent.click(cellFor(12));
    expect(p).toHaveTextContent("No qualifying window on this date"); expect(p).toHaveTextContent("Tuesday is not a suitable weekday");
  });
  it("the results page offers the calendar view and opens it on the best date", () => {
    render(<MuhuratResults result={result()} saver={saver()} onExpand={() => {}} onAgain={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Calendar view" }));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("February 2027");
    expect(screen.getByTestId("calendar-day-panel")).toHaveTextContent("11:27 AM – 2:18 PM");
    expect(screen.queryByTestId("other-muhurat")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Best dates" }));
    expect(screen.getAllByTestId("other-muhurat")).toHaveLength(2);
  });
});

describe("page flow", () => {
  it("event -> form -> loading -> results, sending the chosen event, place and dates", async () => {
    vi.resetModules();
    const search = vi.fn().mockResolvedValue(result());
    vi.doMock("@/features/muhurat/api", () => ({ muhuratApi: { search } }));
    vi.doMock("@/lib/authedFetch", () => ({ requireSignIn: () => true }));
    const { default: Page } = await import("@/pages/MuhuratFinder");
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Muhurat Finder");
    fireEvent.click(screen.getByRole("tab", { name: "Home & property" }));
    fireEvent.click(screen.getByText("Griha Pravesh Muhurat"));
    expect(screen.getByTestId("form-event")).toHaveTextContent("Griha Pravesh Muhurat");
    fireEvent.click(screen.getByText("Pick Mumbai"));
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    await waitFor(() => expect(screen.getByTestId("muhurat-results")).toBeInTheDocument());
    const sent = search.mock.calls[0][0];
    expect(sent.event).toBe("griha-pravesh");
    expect(sent.place).toEqual({ name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" });
    expect(sent.startDate).toBe(todayAt("Asia/Kolkata"));
    expect(placeLabel(sent.place)).toBe("Mumbai, Maharashtra, India");
    expect(screen.getByTestId("best-muhurat")).toHaveTextContent("11:27 AM – 2:18 PM");
    vi.doUnmock("@/features/muhurat/api"); vi.doUnmock("@/lib/authedFetch");
  });
  it("a server error keeps the form and shows the message", async () => {
    vi.resetModules();
    vi.doMock("@/features/muhurat/api", () => ({ muhuratApi: { search: vi.fn().mockRejectedValue(new Error("Please search at most 366 days at a time.")) } }));
    vi.doMock("@/lib/authedFetch", () => ({ requireSignIn: () => true }));
    const { default: Page } = await import("@/pages/MuhuratFinder");
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.click(screen.getByText("Marriage Muhurat"));
    fireEvent.click(screen.getByText("Pick Mumbai"));
    fireEvent.click(screen.getByRole("button", { name: /Find Muhurat/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Please search at most 366 days"));
    expect(screen.getByTestId("form-event")).toBeInTheDocument();
    vi.doUnmock("@/features/muhurat/api"); vi.doUnmock("@/lib/authedFetch");
  });
});

describe("Astro Seva placement", () => {
  it("is a card in the Astro Seva grid and an item in the Astrology Seva menu", async () => {
    const { tools } = await import("@/data/tools");
    const { ASTROLOGY_SEVA_NAV, MUHURAT_FEATURE } = await import("@/data/featureCatalog");
    const card = tools.find((t) => t.path === "/muhurat-finder")!;
    expect(card.title).toBe("Muhurat Finder");
    expect(card.description).toBe("Explore suitable dates and timings for important events based on Hindu Panchang.");
    expect(MUHURAT_FEATURE.subtitle).toBe("Find an auspicious time for life's important beginnings.");
    expect(card.image).toBe("/images/tools/muhurat-finder-card.png");
    expect(ASTROLOGY_SEVA_NAV.map((f) => f.path)).toContain("/muhurat-finder");
  });
});
