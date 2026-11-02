import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authedFetch = vi.fn();
vi.mock("@/lib/authedFetch", () => ({
  authedFetch: (...a: unknown[]) => authedFetch(...a),
  requireSignIn: () => true,
  SignInRequiredError: class extends Error {},
}));
vi.mock("@/features/guru/AskDivyaSection", () => ({ default: () => null }));
vi.mock("@/components/Loader/FullScreenLoader", () => ({ default: () => <div data-testid="loader" /> }));

import FutureLifePath from "./FutureLifePath";

const json = (status: number, body: object) => ({ ok: status < 400, status, json: async () => body }) as Response;
const reading = { lifePathOverview: "A thoughtful overview.", nextSteps: [], reflectionQuestions: [], upcomingPeriods: [] };
const submit = () => fireEvent.click(screen.getByRole("button", { name: /Generate My Life Path Reading/ }));
const fillDob = () => fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1992-03-14" } });
const mount = () => render(<MemoryRouter><FutureLifePath /></MemoryRouter>);

beforeEach(() => { authedFetch.mockReset(); });

describe("Life Path Reading form", () => {
  it("sends only the filled fields (DOB only) and shows the reading", async () => {
    authedFetch.mockResolvedValue(json(200, reading));
    mount(); fillDob(); submit();
    expect(await screen.findByText("A thoughtful overview.")).toBeInTheDocument();
    expect(JSON.parse(authedFetch.mock.calls[0][1].body)).toEqual({ dob: "1992-03-14", focus: "general" });
  });

  it("sends time, place and area of interest when given", async () => {
    authedFetch.mockResolvedValue(json(200, reading));
    mount(); fillDob();
    fireEvent.change(screen.getByLabelText(/Time of birth/), { target: { value: "06:30" } });
    fireEvent.change(screen.getByLabelText(/Place of birth/), { target: { value: " Hyderabad, India " } });
    fireEvent.change(screen.getByLabelText(/Area of interest/), { target: { value: "career" } });
    submit();
    await screen.findByText("A thoughtful overview.");
    expect(JSON.parse(authedFetch.mock.calls[0][1].body)).toEqual({ dob: "1992-03-14", tob: "06:30", pob: "Hyderabad, India", focus: "career" });
  });

  it("a double click sends one request", async () => {
    let release!: (r: Response) => void;
    authedFetch.mockReturnValue(new Promise<Response>((r) => { release = r; }));
    mount(); fillDob();
    const btn = screen.getByRole("button", { name: /Generate My Life Path Reading/ });
    fireEvent.click(btn); fireEvent.click(btn); fireEvent.submit(btn.closest("form")!);
    expect(authedFetch).toHaveBeenCalledTimes(1);
    release(json(200, reading));
    await screen.findByText("A thoughtful overview.");
  });

  it.each([
    [429, "The reading service is very busy right now. Please wait a minute and try again."],
    [504, "The reading service took too long to respond. Please try again."],
    [502, "The reading service is unavailable right now. Please try again in a moment."],
  ])("HTTP %s shows the server's plain message, keeps the form, offers Retry, and never shows a made-up reading", async (status, text) => {
    authedFetch.mockResolvedValueOnce(json(status, { error: text })).mockResolvedValueOnce(json(200, reading));
    mount(); fillDob(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.queryByText("A thoughtful overview.")).toBeNull();
    expect(screen.getByLabelText(/Date of birth/)).toHaveValue("1992-03-14");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("A thoughtful overview.")).toBeInTheDocument();
    expect(authedFetch).toHaveBeenCalledTimes(2);
  });

  it("invalid input (400) shows the message without a Retry button", async () => {
    authedFetch.mockResolvedValue(json(400, { error: "Place of birth contains invalid characters" }));
    mount(); fillDob(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Place of birth contains invalid characters");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
  });
});
