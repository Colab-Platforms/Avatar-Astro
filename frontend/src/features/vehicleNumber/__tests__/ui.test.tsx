import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VehicleForm, { validateVehicleForm } from "../VehicleForm";
import VehicleResults from "../VehicleResults";
import { compatibility, evaluateDigits } from "../vehicleNumerology";
import { FANCY_RULES, isFancy } from "../recommend";
import { birthNumberWorking, lifePathWorking } from "@/lib/numerology";
import type { VehicleProfileResult, VehicleQuery } from "../types";

const delhi = { id: "1", name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata", label: "New Delhi, Delhi, India" };

vi.mock("@/features/ratna/LocationPicker", () => ({
  default: ({ onSelect }: { onSelect: (p: unknown) => void }) => <button type="button" onClick={() => onSelect(delhi)}>Pick Delhi</button>,
}));
vi.mock("@/lib/authedFetch", () => ({ requireSignIn: () => true }));
const profileApi = vi.fn();
vi.mock("../api", () => ({ vehicleNumberApi: { profile: (...a: unknown[]) => profileApi(...a) } }));

const profile: VehicleProfileResult = {
  birth: { dateOfBirth: "1990-07-14", timeOfBirth: "06:45", place: "New Delhi, Delhi, India", timeZone: "Asia/Kolkata", latitude: 28.6, longitude: 77.2 },
  panchang: {
    nakshatra: { name: "Rohini", pada: 2, lord: "Moon" },
    moonRashi: "Vrishabha",
    tithi: { name: "Dwitiya", hindi: "", numberInPaksha: 2 },
    paksha: "krishna",
    masa: { name: "Ashadha", hindi: "", adhika: false },
    vara: { name: "Saturday", note: null },
    vikramSamvat: 2047,
    basis: "birth-time",
  },
  method: "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal",
};
const query = (over: Partial<VehicleQuery> = {}): VehicleQuery => ({
  name: "Asha Rao", dateOfBirth: "1990-07-14", vehicleType: "four-wheeler", mode: "find", scope: "number", existing: "", compare: [], preferred: "", range: null, ...over,
});

beforeEach(() => { localStorage.clear(); profileApi.mockReset(); window.scrollTo = vi.fn(); HTMLCanvasElement.prototype.getContext = (() => null) as never; });

const filled = { name: "", dateOfBirth: "1990-07-14", timeOfBirth: "06:45", place: delhi, mode: "find" as const, existing: "", compare: ["", "", ""], preferred: "", rangeMin: "", rangeMax: "" };

describe("form validation", () => {
  it("requires a date, an exact time and a chosen birthplace, and assumes nothing", () => {
    expect(validateVehicleForm(filled, "2025-01-01")).toEqual({});
    expect(validateVehicleForm({ ...filled, dateOfBirth: "" })).toHaveProperty("dateOfBirth");
    expect(validateVehicleForm({ ...filled, dateOfBirth: "2999-01-01" }, "2025-01-01")).toHaveProperty("dateOfBirth");
    expect(validateVehicleForm({ ...filled, dateOfBirth: "1800-01-01" })).toHaveProperty("dateOfBirth");
    expect(validateVehicleForm({ ...filled, timeOfBirth: "" })).toHaveProperty("timeOfBirth");
    expect(validateVehicleForm({ ...filled, place: null })).toHaveProperty("place");
  });

  it("the full name is optional but must be letters when given", () => {
    expect(validateVehicleForm({ ...filled, name: "Asha Rao" })).toEqual({});
    expect(validateVehicleForm({ ...filled, name: "R2D2" })).toHaveProperty("name");
  });

  it("checking an existing number needs a readable registration; comparing needs two readable numbers", () => {
    expect(validateVehicleForm({ ...filled, mode: "check", existing: "" })).toHaveProperty("existing");
    expect(validateVehicleForm({ ...filled, mode: "check", existing: "banana!" })).toHaveProperty("existing");
    expect(validateVehicleForm({ ...filled, mode: "check", existing: "MH 12 AB 0007" })).toEqual({});
    expect(validateVehicleForm({ ...filled, mode: "compare", compare: ["0007", "", ""] })).toHaveProperty("compare");
    expect(validateVehicleForm({ ...filled, mode: "compare", compare: ["0007", "0021", "0786"] })).toEqual({});
    expect(validateVehicleForm({ ...filled, mode: "compare", compare: ["0007", "zzzz", ""] })).toHaveProperty("compare");
  });

  it("the preferred number and range are checked", () => {
    expect(validateVehicleForm({ ...filled, preferred: "0007" })).toEqual({});
    expect(validateVehicleForm({ ...filled, preferred: "0000" })).toHaveProperty("preferred");
    expect(validateVehicleForm({ ...filled, rangeMin: "100", rangeMax: "900" })).toEqual({});
    expect(validateVehicleForm({ ...filled, rangeMin: "900", rangeMax: "100" })).toHaveProperty("range");
    expect(validateVehicleForm({ ...filled, rangeMin: "100", rangeMax: "" })).toHaveProperty("range");
  });

  it("an empty submit shows the three required errors and sends nothing", () => {
    const onSubmit = vi.fn();
    render(<VehicleForm onSubmit={onSubmit} busy={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Find My Lucky Numbers/ }));
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the existing-number field only when checking, and three number boxes only when comparing", () => {
    render(<VehicleForm onSubmit={vi.fn()} busy={false} />);
    expect(screen.queryByLabelText(/Existing registration number/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Check my existing vehicle number"));
    expect(screen.getByLabelText(/Existing registration number/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Compare multiple vehicle numbers"));
    expect(screen.getByLabelText("Number 1 to compare")).toBeInTheDocument();
    expect(screen.getByLabelText("Number 3 to compare")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Existing registration number/)).toBeNull();
  });

  it("a complete form submits what was entered; the preferred number keeps its leading zeros", () => {
    const onSubmit = vi.fn();
    render(<VehicleForm onSubmit={onSubmit} busy={false} />);
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "1990-07-14" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "06:45" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByLabelText("Two-wheeler"));
    fireEvent.change(screen.getByLabelText(/Preferred number/), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /Find My Lucky Numbers/ }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dateOfBirth: "1990-07-14", timeOfBirth: "06:45", place: delhi, vehicleType: "two-wheeler", mode: "find", scope: "number", preferred: "0007", range: null }));
  });

  it("offers the four vehicle types, the three goals and the digit scope", () => {
    render(<VehicleForm onSubmit={vi.fn()} busy={false} />);
    for (const l of ["Two-wheeler", "Four-wheeler", "Commercial vehicle", "Other", "Find a new lucky number", "Check my existing vehicle number", "Compare multiple vehicle numbers", "The registration number only (last four digits) (default)"]) {
      expect(screen.getByLabelText(l)).toBeInTheDocument();
    }
  });
});

describe("results: birth profile and method", () => {
  it("shows the calculated Panchang and the Birth Number and Life Path from the existing routines, with workings", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const birth = screen.getByRole("region", { name: /Your Birth Profile/ });
    for (const t of ["Rohini", "Pada 2", "Vrishabha", "Dwitiya", "Krishna Paksha", "Ashadha", "Saturday"]) expect(within(birth).getByText(t)).toBeInTheDocument();
    expect(birthNumberWorking("1990-07-14").result).toBe(5);
    expect(within(screen.getByTestId("birth-number")).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByTestId("life-path")).getByText("4")).toBeInTheDocument();
    expect(screen.getByTestId("life-path")).toHaveTextContent(`${lifePathWorking("1990-07-14").digits.join(" + ")} = 31 → 4`);
    expect(birth).toHaveTextContent(/not part of the number calculation/);
  });

  it("explains the method and the limits honestly, with no percentages", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const m = screen.getByTestId("method-summary");
    expect(m).toHaveTextContent("Brihat Parashara Hora Shastra");
    expect(m).toHaveTextContent("Numerology method, not a Panchang calculation");
    expect(m).toHaveTextContent(/common Indian numerology table/);
    expect(m).toHaveTextContent(/MyBhagya's own way of summarising/);
    expect(m).toHaveTextContent("+2");
    expect(m).toHaveTextContent("No percentages are used");
    expect(m).toHaveTextContent(/Rahu \(4\) and Ketu \(7\)/); // Life Path 4 involves Rahu, so the convention is disclosed
    expect(screen.getByTestId("vehicle-results").textContent).not.toMatch(/\d+\s?%/);
  });
});

describe("results: recommended numbers", () => {
  const cards = () => screen.getAllByTestId("number-card");
  const plate = (c: HTMLElement) => within(c).getByTestId("plate-number").textContent!;

  it("shows the best five first, then View More Numbers reveals up to eight", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    expect(cards()).toHaveLength(5);
    const more = screen.getByRole("button", { name: /View More Numbers \(3\)/ });
    fireEvent.click(more);
    expect(cards()).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: /Show Fewer Numbers/ }));
    expect(cards()).toHaveLength(5);
  });

  it("each card has the number, total, numerology number, interpretation, reasons and a label, all from the rule used for an existing number", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const person = { birth: 5, lifePath: 4 };
    for (const c of cards()) {
      const n = plate(c);
      expect(n).toMatch(/^\d{4}$/);
      const ev = evaluateDigits(n)!;
      const comp = compatibility(ev, person);
      expect(within(c).getByText("Number Total").nextSibling).toHaveTextContent(String(ev.total));
      expect(within(c).getByText("Numerology Number")).toBeInTheDocument();
      expect(within(c).getByText("Traditional Interpretation")).toBeInTheDocument();
      expect(within(c).getByText("Why It Matches Your Profile")).toBeInTheDocument();
      expect(within(c).getByTestId("compat-label")).toHaveTextContent(comp.label);
      expect(c.textContent).toContain(ev.theme.keywords);
      expect(c.textContent).not.toMatch(/\d+\s?%/);
    }
  });

  it("is ranked best first and never claims a number is available", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const rank = { "Strong match": 3, "Good match": 2, "Neutral match": 1, "Less aligned": 0 } as Record<string, number>;
    const labels = cards().map((c) => rank[within(c).getByTestId("compat-label").textContent!]);
    expect(labels).toEqual([...labels].sort((a, b) => b - a));
    expect(screen.getByTestId("availability-note")).toHaveTextContent("These are numerology-based suggestions. Actual registration-number availability and allocation depend on your RTO.");
    expect(screen.getByTestId("vehicle-results").textContent).not.toMatch(/\bis available\b|will be allotted|guaranteed/i);
  });

  it("depends on the person: another birth date gives other numbers", () => {
    const { unmount } = render(<VehicleResults profile={profile} query={query()} />);
    const a = cards().map(plate);
    unmount();
    render(<VehicleResults profile={profile} query={query({ dateOfBirth: "1985-03-09" })} />);
    expect(cards().map(plate)).not.toEqual(a);
  });

  it("every recommendation is an everyday number: labelled so, and never a premium or fancy pattern", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    fireEvent.click(screen.getByRole("button", { name: /View More Numbers/ }));
    for (const c of cards()) {
      expect(within(c).getByTestId("everyday-label")).toHaveTextContent("Everyday Number");
      expect(c).toHaveTextContent("Practical number");
      const n = plate(c);
      expect(isFancy(n), n).toBe(false);
      expect(n).not.toMatch(/^(\d)\1{3}$/);
    }
    const totals = cards().map((c) => within(c).getByText("Number Total").nextSibling!.textContent);
    expect(new Set(totals).size).toBe(totals.length); // no two numbers with the same digit total
  });

  it("lists which patterns are left out and why, and says a repeated digit alone is not one of them", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const d = screen.getByTestId("left-out");
    expect(d).toHaveTextContent("Which numbers are left out, and why?");
    for (const r of FANCY_RULES) expect(d).toHaveTextContent(r.label);
    expect(d).toHaveTextContent(/repeated digit, such as 2655 or 3118, is not left out/);
  });

  it("uses an ordinary preferred number and labels it", () => {
    // 1427 totals 14, which reads as 5: the same as this Birth Number, so it scores well.
    render(<VehicleResults profile={profile} query={query({ preferred: "1427" })} />);
    const c = screen.getAllByTestId("number-card").find((x) => plate(x) === "1427");
    expect(c).toBeDefined();
    expect(c).toHaveTextContent("Your preferred number");
    expect(screen.queryByTestId("preferred-note")).toBeNull();
  });

  it("explains why a premium-style preferred number is not recommended, and does not show it as a card", () => {
    render(<VehicleResults profile={profile} query={query({ preferred: "7777" })} />);
    expect(screen.getByTestId("preferred-note")).toHaveTextContent(/7777 is a special-pattern number/);
    expect(screen.getByTestId("preferred-note")).toHaveTextContent(/Check my existing vehicle number/);
    expect(cards().some((c) => plate(c) === "7777")).toBe(false);
  });

  it("keeps recommendations inside the preferred range, and says so when the range has no everyday number", () => {
    const { unmount } = render(<VehicleResults profile={profile} query={query({ range: { min: 2000, max: 2999 } })} />);
    for (const c of cards()) { const n = Number(plate(c)); expect(n >= 2000 && n <= 2999).toBe(true); }
    expect(screen.queryByTestId("range-note")).toBeNull();
    unmount();
    render(<VehicleResults profile={profile} query={query({ range: { min: 1111, max: 1111 } })} />);
    expect(screen.getByTestId("range-note")).toHaveTextContent(/no everyday numbers in your preferred range/);
  });
});

describe("results: existing number", () => {
  it("evaluates the entered registration and shows every step", () => {
    render(<VehicleResults profile={profile} query={query({ mode: "check", existing: "MH 12 AB 0007" })} />);
    const s = screen.getByTestId("existing-check");
    expect(within(s).getByTestId("plate-number")).toHaveTextContent("MH 12 AB 0007");
    expect(s).toHaveTextContent("Digits evaluated");
    expect(within(s).getByText("0007")).toBeInTheDocument(); // leading zeros kept
    expect(s).toHaveTextContent("0 + 0 + 0 + 7 = 7");
    expect(s).toHaveTextContent("Ketu");
    expect(s).toHaveTextContent(/Birth Number 5 is ruled by Mercury/);
    expect(s).toHaveTextContent(/Life Path 4 is ruled by Rahu/);
    const ev = evaluateDigits("0007")!;
    expect(within(s).getByTestId("compat-label")).toHaveTextContent(compatibility(ev, { birth: 5, lifePath: 4 }).label);
  });

  it("the scope changes the digits evaluated: with the RTO code, 120007 totals 10 and reads as 1", () => {
    render(<VehicleResults profile={profile} query={query({ mode: "check", existing: "MH 12 AB 0007", scope: "rto-number" })} />);
    const s = screen.getByTestId("existing-check");
    expect(s).toHaveTextContent("120007");
    expect(s).toHaveTextContent("1 + 2 + 0 + 0 + 0 + 7 = 10 → 1");
  });

  it("a Less aligned result is explained gently and never tells the user to change the number", () => {
    render(<VehicleResults profile={profile} query={query({ dateOfBirth: "1990-01-01", mode: "check", existing: "MH 12 AB 0006" })} />);
    const s = screen.getByTestId("existing-check");
    expect(within(s).getByTestId("compat-label")).toHaveTextContent("Less aligned");
    expect(within(s).getByTestId("existing-meaning")).toHaveTextContent(/nothing here suggests you should change your number/);
    expect(within(s).getByTestId("existing-meaning")).toHaveTextContent("your Birth Number 1 (Sun) does not regard Venus as a natural friend and your Life Path 3 (Jupiter) does not regard Venus as a natural friend");
    expect(s.textContent).not.toMatch(/(you must|need to|have to|must) change/i);
    expect(s.textContent).not.toMatch(/unlucky|inauspicious|bad luck/i);
  });
});

describe("results: existing number is not restricted by the exclusions", () => {
  it("evaluates a premium-style registration exactly like any other", () => {
    render(<VehicleResults profile={profile} query={query({ mode: "check", existing: "MH 12 AB 7777" })} />);
    const s = screen.getByTestId("existing-check");
    expect(within(s).getByTestId("plate-number")).toHaveTextContent("MH 12 AB 7777");
    expect(s).toHaveTextContent("7 + 7 + 7 + 7 = 28 → 10 → 1");
    expect(within(s).getByTestId("compat-label")).toHaveTextContent(compatibility(evaluateDigits("7777")!, { birth: 5, lifePath: 4 }).label);
  });
});

describe("results: comparison", () => {
  it("compares up to three typed numbers side by side with the same rules", () => {
    render(<VehicleResults profile={profile} query={query({ mode: "compare", compare: ["0007", "0021", "0786"] })} />);
    const cols = screen.getAllByTestId("compare-column");
    expect(cols).toHaveLength(3);
    const person = { birth: 5, lifePath: 4 };
    ["0007", "0021", "0786"].forEach((n, i) => {
      const ev = evaluateDigits(n)!;
      expect(cols[i]).toHaveTextContent(n);
      expect(within(cols[i]).getByTestId("compat-label")).toHaveTextContent(compatibility(ev, person).label);
      expect(cols[i]).toHaveTextContent(`Digit sum${ev.total}`.replace(/\s/g, "") === "" ? "" : String(ev.total));
    });
    expect(cols[2]).toHaveTextContent("21"); // 0786 totals 21
    expect(screen.queryByPlaceholderText(/Add a number/)).toBeNull(); // full at three
  });

  it("numbers can be added from the cards, up to three, and removed", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const buttons = screen.getAllByRole("button", { name: /^Compare \d{4}$/ });
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Compare \d{4}$/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Compare \d{4}$/ })[0]);
    expect(screen.getAllByTestId("compare-column")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /^Compare \d{4}$/ })[0]).toBeDisabled(); // a fourth cannot be added
    fireEvent.click(screen.getAllByRole("button", { name: /Remove \d{4} from comparison/ })[0]);
    expect(screen.getAllByTestId("compare-column")).toHaveLength(2);
  });

  it("a number can be typed into the comparison, and bad or repeated input is explained", () => {
    render(<VehicleResults profile={profile} query={query({ mode: "compare", compare: ["0007", "0021"] })} />);
    const box = screen.getByLabelText("Add a number to compare");
    fireEvent.change(box, { target: { value: "nonsense!" } });
    fireEvent.click(screen.getByRole("button", { name: /Add$/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/letters and digits only|could not read/);
    fireEvent.change(box, { target: { value: "0007" } });
    fireEvent.click(screen.getByRole("button", { name: /Add$/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/already in the comparison/);
    fireEvent.change(box, { target: { value: "MH 12 AB 0786" } });
    fireEvent.click(screen.getByRole("button", { name: /Add$/ }));
    expect(screen.getAllByTestId("compare-column")).toHaveLength(3);
  });
});

describe("saving, copying and sharing", () => {
  it("saves and removes favourites in this browser only, and says so", () => {
    const { unmount } = render(<VehicleResults profile={profile} query={query()} />);
    const first = screen.getAllByTestId("number-card")[0];
    const n = within(first).getByTestId("plate-number").textContent!;
    fireEvent.click(within(first).getByRole("button", { name: `Save ${n}` }));
    const saved = screen.getByTestId("saved-numbers");
    expect(saved).toHaveTextContent(n);
    expect(saved).toHaveTextContent(/browser only/);
    expect(saved).toHaveTextContent(/not attached to your MyBhagya account/);
    expect(JSON.parse(localStorage.getItem("lucky-vehicle-favourites-v1")!)).toEqual([n]);
    unmount();
    render(<VehicleResults profile={profile} query={query()} />);
    expect(screen.getByTestId("saved-numbers")).toHaveTextContent(n);
    fireEvent.click(within(screen.getByTestId("saved-numbers")).getByRole("button", { name: `Remove ${n} from saved numbers` }));
    expect(screen.queryByTestId("saved-numbers")).toBeNull();
  });

  it("a saved number can be added to the comparison", () => {
    render(<VehicleResults profile={profile} query={query()} />);
    const first = screen.getAllByTestId("number-card")[0];
    const n = within(first).getByTestId("plate-number").textContent!;
    fireEvent.click(within(first).getByRole("button", { name: `Save ${n}` }));
    fireEvent.click(within(screen.getByTestId("saved-numbers")).getByRole("button", { name: `Compare saved number ${n}` }));
    expect(screen.getAllByTestId("compare-column")).toHaveLength(1);
  });

  it("Copy puts the number, its totals and the label on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<VehicleResults profile={profile} query={query()} />);
    const first = screen.getAllByTestId("number-card")[0];
    const n = within(first).getByTestId("plate-number").textContent!;
    fireEvent.click(within(first).getByRole("button", { name: `Copy ${n}` }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`${n}: digit total`)));
    expect(writeText.mock.calls[0][0]).toMatch(/Traditional numerology, not a guarantee/);
  });

  it("Share uses the device share sheet when there is one, and copies the text otherwise", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const { unmount } = render(<VehicleResults profile={profile} query={query()} />);
    const first = screen.getAllByTestId("number-card")[0];
    const n = within(first).getByTestId("plate-number").textContent!;
    fireEvent.click(within(first).getByRole("button", { name: `Share ${n}` }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: `Lucky Vehicle Number ${n}` })));
    unmount();
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<VehicleResults profile={profile} query={query()} />);
    const c2 = screen.getAllByTestId("number-card")[0];
    fireEvent.click(within(c2).getByRole("button", { name: `Share ${within(c2).getByTestId("plate-number").textContent}` }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});

describe("page flow", () => {
  it("sends the birth details to the server, then shows what was calculated", async () => {
    profileApi.mockResolvedValue(profile);
    const { default: Page } = await import("@/pages/LuckyVehicleNumber");
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "1990-07-14" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "06:45" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByRole("button", { name: /Find My Lucky Numbers/ }));
    await waitFor(() => expect(screen.getByTestId("vehicle-results")).toBeInTheDocument());
    expect(profileApi).toHaveBeenCalledWith({
      dateOfBirth: "1990-07-14", timeOfBirth: "06:45",
      place: { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lucky Vehicle Number");
    expect(screen.getAllByTestId("number-card").length).toBeGreaterThan(0);
  });

  it("shows a server error and keeps the form", async () => {
    profileApi.mockRejectedValue(new Error("Please enter your exact time of birth."));
    const { default: Page } = await import("@/pages/LuckyVehicleNumber");
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Date of Birth/), { target: { value: "1990-07-14" } });
    fireEvent.change(screen.getByLabelText(/Exact Time of Birth/), { target: { value: "06:45" } });
    fireEvent.click(screen.getByRole("button", { name: "Pick Delhi" }));
    fireEvent.click(screen.getByRole("button", { name: /Find My Lucky Numbers/ }));
    expect(await screen.findByText(/exact time of birth/i)).toBeInTheDocument();
    expect(screen.queryByTestId("vehicle-results")).toBeNull();
    expect(screen.getByLabelText(/Date of Birth/)).toHaveValue("1990-07-14");
  });
});
