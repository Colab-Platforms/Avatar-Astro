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
    notProvided: ["Time of birth", "Place of birth"],
    calculated: [
      { label: "Day of the week you were born", value: "Thursday", how: "Calendar arithmetic on your date of birth." },
      { label: "Life path number (numerology)", value: "5", how: "Add every digit of your birth date: 1 + 9 + 9 + 0 + 5 + 1 + 7 = 32 → 5." },
    ],
    limits: ["No birth chart, planetary position, ascendant or house was calculated."],
  },
  lifePathOverview: "A reflective path.",
  nextSteps: ["Write down one goal."],
  reflectionQuestions: ["What matters most?"],
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
    fireEvent.change(screen.getByLabelText(/Area of interest|focus/i), { target: { value: "career" } });
    submit();
    await screen.findByText("A reflective path.");
    expect(bodyOf()).toEqual({ dob: "1990-05-17", pob: "Pune, Maharashtra, India", focus: "career" }); // tob omitted, not guessed
  });

  it("shows how the reading was made: what was used, what was calculated, what was not provided", async () => {
    vi.mocked(authedFetch).mockImplementation(() => respond(200, reading));
    mount();
    await fill();
    submit();
    const basis = await screen.findByTestId("flp-basis");
    expect(basis).toHaveTextContent("Date of birth: 1990-05-17");
    expect(basis).toHaveTextContent("Not provided: Time of birth, Place of birth. Nothing was assumed in their place.");
    expect(basis).toHaveTextContent("Life path number (numerology): 5.");
    expect(basis).toHaveTextContent("1 + 9 + 9 + 0 + 5 + 1 + 7 = 32 → 5");
    expect(basis).toHaveTextContent("No birth chart, planetary position, ascendant or house was calculated.");
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
