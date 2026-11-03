import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/authedFetch", async (orig) => ({
  ...(await orig<object>()),
  authedFetch: vi.fn(),
  requireSignIn: () => true,
}));
vi.mock("@/features/ratna/api", () => ({ ratnaApi: { searchLocations: vi.fn() } }));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import FutureLifePath from "@/pages/FutureLifePath";
import { authedFetch } from "@/lib/authedFetch";
import { ratnaApi } from "@/features/ratna/api";

// The place list is MOCKED; no live location search is made.
const PUNE = { id: "p1", name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.52, longitude: 73.86, timezone: "Asia/Kolkata", label: "Pune, Maharashtra, India" };

beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});

const reading = {
  basis: {
    used: [{ label: "Date of birth", value: "1990-05-17" }, { label: "Area of interest", value: "career" }],
    notProvided: ["Time of birth"],
    calculated: [
      { label: "Day of the week you were born", value: "Thursday", how: "Calendar arithmetic on your date of birth." },
      { label: "Life path number (numerology)", value: "5", how: "Add every digit of your birth date: 1 + 9 + 9 + 0 + 5 + 1 + 7 = 32 → 5." },
    ],
    limits: ["No birth chart, ascendant, houses or planet positions were drawn. The Panchang uses only the Sun and Moon."],
  },
  panchang: {
    birth: {
      title: "Your birth Panchang",
      reckoned: "1990-05-17 at 06:30, Pune, Maharashtra, India",
      facts: [{ label: "Tithi", value: "Saptami" }, { label: "Paksha", value: "Krishna (dark half)" }, { label: "Nakshatra", value: "Shravana, pada 4" }],
      notes: [],
    },
    today: { title: "Today's Panchang", reckoned: "2026-11-03, New Delhi, India", facts: [{ label: "Day", value: "Tuesday" }, { label: "Tithi", value: "Chaturthi" }], notes: [] },
    birthNeedsPlace: false,
  },
  panchangBased: true,
  meaning: "Your birth day has a calm feel.",
  lifePathOverview: "A reflective path.",
  oneGoodStep: "Write down one goal.",
  thought: "Small steps matter.",
};
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FutureLifePath />
      </MemoryRouter>
    </QueryClientProvider>,
  );
const pickPlace = async () => {
  fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Pun" } });
  fireEvent.mouseDown(await screen.findByRole("option", { name: PUNE.label }));
};
const fill = async () => {
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-05-17" } });
  await pickPlace();
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: /generate|reveal|read|path/i }));
const bodyOf = () => JSON.parse((vi.mocked(authedFetch).mock.calls[0][1] as RequestInit).body as string);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(ratnaApi.searchLocations).mockResolvedValue([PUNE]);
});

describe("Future Life Path", () => {
  it("place of birth is a searchable drop-down of real places, and the chosen place is shown as selected", async () => {
    mount();
    const box = screen.getByRole("combobox", { name: "Birthplace" });
    fireEvent.change(box, { target: { value: "Pun" } });
    expect(await screen.findByRole("option", { name: PUNE.label })).toBeInTheDocument(); // the list fills after a short pause
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(ratnaApi.searchLocations).toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("option", { name: PUNE.label }));
    expect(screen.getByText(/Selected: Pune, Maharashtra, India/)).toBeInTheDocument();
  });

  it("text typed but not picked from the list is not sent as a place", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-05-17" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Vasai" } });
    submit();
    await screen.findByText("A reflective path.");
    expect(bodyOf()).toEqual({ dob: "1990-05-17", focus: "general" });
  });

  it("requires a date of birth and sends nothing without it", () => {
    mount();
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your date of birth.");
    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("sends only what was entered: no invented time, and the chosen area of interest", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    await fill();
    fireEvent.click(screen.getByRole("radio", { name: "Career" }));
    submit();
    await screen.findByText("A reflective path.");
    // tob is omitted, not guessed; the place carries the coordinates and time zone the birth Panchang needs
    expect(bodyOf()).toEqual({ dob: "1990-05-17", pob: "Pune, Maharashtra, India", place: { latitude: 18.52, longitude: 73.86, timezone: "Asia/Kolkata" }, focus: "career" });
  });

  it("does not show the How It Works block, the how-it-was-made panel, or the edit and regenerate buttons", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    expect(screen.queryByText("How It Works")).toBeNull();
    await fill();
    submit();
    await screen.findByTestId("flp-panchang");
    expect(screen.queryByText(/How this reading was made/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit Details/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Regenerate/i })).toBeNull();
    expect(screen.queryByText(/not a prediction of certain outcomes/)).toBeNull();
  });

  it("shows the result as short sections: Panchang, what it means, guidance, one good step, a thought", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    await fill();
    submit();
    const panchang = await screen.findByTestId("flp-panchang");
    expect(panchang).toHaveTextContent("Your Panchang");
    expect(panchang).toHaveTextContent("Saptami");
    expect(panchang).toHaveTextContent("Shravana, pada 4");
    expect(panchang).toHaveTextContent("Your birth Panchang");
    expect(panchang).toHaveTextContent("Today's Panchang");
    expect(panchang).toHaveTextContent("Chaturthi");
    expect(screen.getByText("What it means")).toBeInTheDocument();
    expect(screen.getByText("Your birth day has a calm feel.")).toBeInTheDocument();
    expect(screen.getByText(/Your Life Guidance/)).toBeInTheDocument();
    expect(screen.getByText("One Good Step")).toBeInTheDocument();
    expect(screen.getByText("Write down one goal.")).toBeInTheDocument();
    expect(screen.getByText("A Thought to Remember")).toBeInTheDocument();
    expect(screen.queryByText(/undefined|\[object/)).toBeNull();
  });

  it("without a birth Panchang it says so and never claims the reading is Panchang-based", async () => {
    const noBirth = { ...reading, panchang: { birth: null, today: reading.panchang.today, birthNeedsPlace: true }, panchangBased: false };
    vi.mocked(authedFetch).mockImplementation(() => respond(200, noBirth));
    mount();
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-05-17" } });
    submit();
    const note = await screen.findByTestId("flp-no-birth-panchang");
    expect(note).toHaveTextContent("needs your place of birth");
    expect(note).toHaveTextContent("not based on your birth Panchang");
    expect(screen.getByTestId("flp-panchang")).not.toHaveTextContent("Saptami");
  });

  it("a Panchang block with no facts is not drawn, and no empty fact is shown", async () => {
    const empty = { ...reading, panchang: { birth: { ...reading.panchang.birth, facts: [{ label: "Yoga", value: "  " }] }, today: null, birthNeedsPlace: false }, panchangBased: false };
    vi.mocked(authedFetch).mockImplementation(() => respond(200, empty));
    mount();
    await fill();
    submit();
    expect(await screen.findByTestId("flp-no-birth-panchang")).toHaveTextContent("could not be calculated");
    expect(screen.queryByText("Yoga")).toBeNull();
  });

  it("the Gita teaching comes from the verified catalog, labelled apart from the guidance, and matches the area of interest", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    await fill();
    fireEvent.click(screen.getByRole("radio", { name: "Career" }));
    submit();
    const card = await screen.findByTestId("flp-scripture");
    expect(card).toHaveTextContent("From the Bhagavad Gita");
    expect(card).toHaveTextContent("Bhagavad Gita, Chapter 2, Verse 47"); // the catalog's career verse
    expect(card).toHaveTextContent("It is not part of the calculation");
  });

  it("every area of interest has a verified verse from the catalog, never an invented one", async () => {
    const { scriptureForFocus } = await import("@/lib/lifePathScripture");
    const { SHLOKAS } = await import("@/data/shlokaCatalog");
    for (const f of ["general", "career", "personal-growth", "finance"]) {
      const v = scriptureForFocus(f);
      expect(v).not.toBeNull();
      expect(SHLOKAS.some((s) => s.reference === v!.reference && s.meaning === v!.meaning && s.source === "Bhagavad Gita")).toBe(true);
    }
    // No Gita verse in the catalog fits relationships, so none is forced.
    expect(scriptureForFocus("relationships")).toBeNull();
    expect(scriptureForFocus("unknown")).toBeNull();
  });

  it("the area of interest is a labelled group of choices and exactly one is selected", () => {
    mount();
    expect(screen.getByRole("radiogroup", { name: /Area of interest/ })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "General" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Money" }));
    expect(screen.getByRole("radio", { name: "Money" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "General" })).toHaveAttribute("aria-checked", "false");
  });

  it("a reading without a good step is treated as a failure, never shown", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, { ...reading, oneGoodStep: "" }));
    mount();
    await fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't generate your reading right now.");
    expect(screen.queryByTestId("flp-panchang")).toBeNull();
  });

  it("a busy provider shows a clear message, no reading, keeps the form, and Retry sends the same details", async () => {
    vi.mocked(authedFetch)
      .mockImplementationOnce(() => respond(503, { error: "busy", code: "provider_busy" }))
      .mockImplementationOnce(() => respond(200, reading));
    mount();
    await fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("The reading service is busy right now");
    expect(screen.queryByText("A reflective path.")).toBeNull();
    expect((screen.getByLabelText(/Date of birth/) as HTMLInputElement).value).toBe("1990-05-17");
    expect((screen.getByRole("combobox", { name: "Birthplace" }) as HTMLInputElement).value).toBe(PUNE.label);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("A reflective path.");
    expect(authedFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse((vi.mocked(authedFetch).mock.calls[1][1] as RequestInit).body as string)).toMatchObject({ dob: "1990-05-17", pob: PUNE.label });
  });

  it.each([
    ["a 502", () => respond(502, { error: "The reading service is unavailable" })],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["an empty response", () => respond(200, {})],
  ])("%s shows the error with Retry and never a reading", async (_n, impl) => {
    vi.mocked(authedFetch).mockImplementation(impl as never);
    mount();
    await fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't generate your reading right now.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByTestId("flp-basis")).toBeNull();
  });

  it("shows the server's message for invalid input", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(400, { error: "Time of birth must be a valid HH:MM time" }));
    mount();
    await fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Time of birth must be a valid HH:MM time");
  });

  it("does not send a second request while one is running", async () => {
    let release!: (r: Response) => void;
    vi.mocked(authedFetch).mockImplementation(() => new Promise<Response>((r) => { release = r; }));
    mount();
    await fill();
    submit();
    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    submit();
    fireEvent.submit(document.querySelector("form")!);
    expect(authedFetch).toHaveBeenCalledTimes(1);
    release(new Response(JSON.stringify(reading), { status: 200 }));
    await screen.findByText("A reflective path.");
  });
});
