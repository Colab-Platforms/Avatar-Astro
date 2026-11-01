import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RatnaJyotish from "@/pages/RatnaJyotish";
import RatnaJyotishResult from "@/pages/RatnaJyotishResult";
import { ratnaApi } from "../api";
import { loadResult, saveResult } from "../storage";
import type { RatnaResult } from "../types";
import { complete, dateBased, delhi, diamond as stone, emptyShop, fillPersonalAndPanchang, signInForTests } from "./fixtures";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
// The 5 s minimum is covered in loader-duration.test.tsx; keep these fast.
vi.mock("../loaderTiming", () => ({ MIN_LOADER_MS: 0 }));
const api = vi.mocked(ratnaApi);

const limited = dateBased; // unknown birth time -> date-based result

const renderApp = (initial = "/ratna-jyotish") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/ratna-jyotish" element={<RatnaJyotish />} />
          <Route path="/ratna-jyotish/result" element={<RatnaJyotishResult />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const fillAndSelectPlace = async () => {
  fillPersonalAndPanchang();
  fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
  const box = screen.getByRole("combobox", { name: "Birthplace" });
  fireEvent.change(box, { target: { value: "Delhi" } });
  const option = await screen.findByRole("option", { name: delhi.label });
  fireEvent.mouseDown(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  signInForTests();
  api.searchLocations.mockResolvedValue([delhi]);
  api.products.mockResolvedValue(emptyShop);
});

describe("Ratna Jyotish form: personal details, no Panchang input", () => {
  it("validates name, weight and the Samvat range", async () => {
    renderApp();
    fillPersonalAndPanchang();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "R2D2" } });
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "-4" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1700-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByText(/letters, spaces, dots/)).toBeInTheDocument();
    expect(screen.getByText("Enter a weight between 2 and 300 kg.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a year from 1800 onwards.")).toBeInTheDocument();
    expect(api.calculate).not.toHaveBeenCalled();
  });

  it("explains what is lost when the birth time is unknown", () => {
    renderApp();
    fireEvent.click(screen.getByLabelText("I don't know my exact birth time"));
    expect(screen.getByTestId("unknown-time-note")).toHaveTextContent(/Lagna .* houses .* dasha/);
  });
});

describe("Ratna Jyotish form", () => {
  it("shows only the four primary inputs, the emblem and the CTA", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "Ratna Jyotish" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ratna Jyotish emblem" })).toBeInTheDocument();
    expect(screen.getByText("Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toHaveAttribute("type", "date");
    // Panchang details are calculated for the report, never asked for.
    for (const label of [/calendar convention/i, /month system/i, /year begins/i, /vikram samvat/i, /hindu month/i, /adhika/i, /paksha/i, /^tithi$/i]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(screen.queryByTestId("panchang-picker")).toBeNull();
    expect(screen.getByLabelText("Exact birth time")).toBeInTheDocument();
    expect(screen.getByLabelText("I don't know my exact birth time")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Birthplace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CALCULATE MY RATNA" })).toBeInTheDocument();
    expect(screen.queryByText(/preferred name|area of interest|current city|method/i)).toBeNull();
  });

  it("disables the time input when the birth time is unknown", () => {
    renderApp();
    fireEvent.click(screen.getByLabelText("I don't know my exact birth time"));
    expect(screen.getByLabelText("Exact birth time")).toBeDisabled();
  });

  it("validates required fields without calling the API", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByText("Please enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Please select an option.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your date of birth.")).toBeInTheDocument();
    expect(screen.getByText(/exact birth time/i, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Please choose your birthplace from the suggestions.")).toBeInTheDocument();
    expect(api.calculate).not.toHaveBeenCalled();
  });

  it("does not accept typed text as a confirmed birthplace", async () => {
    renderApp();
    fillPersonalAndPanchang();
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByText("Please choose your birthplace from the suggestions.")).toBeInTheDocument();
    expect(api.calculate).not.toHaveBeenCalled();
  });

  it("shows the loader while calculating, then opens the dedicated results page", async () => {
    let resolve!: (r: RatnaResult) => void;
    api.calculate.mockReturnValue(new Promise((r) => (resolve = r)));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));

    const loader = await screen.findByTestId("ratna-loader");
    expect(within(loader).getByText("Reading Your Birth Chart")).toBeInTheDocument();
    expect(within(loader).getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("recommended-stone")).toBeNull(); // no inline result

    resolve(complete);
    expect(await screen.findByTestId("recommended-stone")).toHaveTextContent("Diamond or White Sapphire");
    expect(screen.queryByTestId("ratna-loader")).toBeNull();
    expect(loadResult()?.recommendation?.stone.key).toBe("diamond");
    expect(api.calculate).toHaveBeenCalledTimes(1);
    expect(api.calculate.mock.calls[0][0]).toMatchObject({
      fullName: "Asha Verma",
      gender: "Female",
      weightKg: 58,
      dateOfBirth: "1990-05-05",
      timeOfBirth: "10:00",
      timeUnknown: false,
      place: { timezone: "Asia/Kolkata", latitude: 28.6 },
    });
  });

  it("prevents duplicate submissions", async () => {
    api.calculate.mockReturnValue(new Promise(() => {}));
    renderApp();
    await fillAndSelectPlace();
    const btn = screen.getByRole("button", { name: "CALCULATE MY RATNA" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await screen.findByTestId("ratna-loader");
    expect(api.calculate).toHaveBeenCalledTimes(1);
  });

  it("returns to the form with values preserved when the API fails", async () => {
    api.calculate.mockRejectedValue(new Error("Birthplaces beyond 66° latitude are not supported"));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByText(/66° latitude/)).toBeInTheDocument();
    expect(screen.queryByTestId("ratna-loader")).toBeNull();
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Verma");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("10:00");
    expect(screen.getByRole("combobox", { name: "Birthplace" })).toHaveValue(delhi.label);
    expect(loadResult()).toBeNull();
    // retry works
    api.calculate.mockResolvedValue(complete);
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByTestId("recommended-stone")).toBeInTheDocument();
  });

  it("sends no time when the birth time is unknown and shows a gemstone-led date-based result", async () => {
    api.calculate.mockResolvedValue(limited);
    renderApp();
    fillPersonalAndPanchang();
    fireEvent.click(screen.getByLabelText("I don't know my exact birth time"));
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByTestId("recommended-stone")).toHaveTextContent("Emerald");
    expect(api.calculate.mock.calls[0][0]).toMatchObject({ timeOfBirth: null, timeUnknown: true });
    expect(screen.getByTestId("method-label")).toHaveTextContent("Method: Birth-Date & Place Ratna Method");
    expect(screen.queryByText(/No recommendation/i)).toBeNull();
    await waitFor(() => expect(api.products).toHaveBeenCalledWith("emerald"));
  });

  it("clears a stale stored result when a new calculation starts", async () => {
    saveResult(complete);
    api.calculate.mockReturnValue(new Promise(() => {}));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    await screen.findByTestId("ratna-loader");
    expect(loadResult()).toBeNull();
  });
});

describe("Ratna Jyotish results page", () => {
  it("shows a friendly empty state with no stored result", () => {
    renderApp("/ratna-jyotish/result");
    expect(screen.getByTestId("ratna-empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calculate My Ratna" })).toHaveAttribute("href", "/ratna-jyotish");
    expect(screen.queryByTestId("recommended-stone")).toBeNull();
  });

  it("recovers the result after a refresh from session storage", async () => {
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    expect(await screen.findByTestId("recommended-stone")).toBeInTheDocument();
    expect(screen.getByText("How this was calculated")).toBeInTheDocument();
    expect(screen.getByText(/New Delhi \(your birthplace\) · Asia\/Kolkata/)).toBeInTheDocument();
  });

  it("ignores a result saved by the older build (no primary gemstone)", () => {
    sessionStorage.setItem("ratna-jyotish:result", JSON.stringify({ ...complete, status: "limited", primary: undefined }));
    renderApp("/ratna-jyotish/result");
    expect(screen.getByTestId("ratna-empty")).toBeInTheDocument();
  });

  it("ignores corrupt stored data", () => {
    sessionStorage.setItem("ratna-jyotish:result", '{"status":"complete"}');
    renderApp("/ratna-jyotish/result");
    expect(screen.getByTestId("ratna-empty")).toBeInTheDocument();
  });

  it("Calculate Again clears the result and returns to the form", async () => {
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    fireEvent.click(await screen.findByRole("button", { name: "Calculate Again" }));
    expect(await screen.findByRole("button", { name: "CALCULATE MY RATNA" })).toBeInTheDocument();
    expect(loadResult()).toBeNull();
  });

  it("Back to Birth Details links to the form", async () => {
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    expect(await screen.findByRole("link", { name: "Back to Birth Details" })).toHaveAttribute("href", "/ratna-jyotish");
  });

  it("shows an honest empty state when the stone is not in the shop", async () => {
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    expect(await screen.findByText(/is currently listed in the shop/)).toBeInTheDocument();
    expect(screen.getByText(/do not substitute a different Ratna/)).toBeInTheDocument();
    expect(screen.queryByText("Complementary Spiritual Accessories")).toBeNull();
    expect(screen.getByText(/Buying is optional/)).toBeInTheDocument();
  });

  it("renders real products with real prices and links, separating general accessories", async () => {
    const p = (id: string, name: string, price: number, extra = {}) => ({
      id, slug: id, name, price, originalPrice: null, image: "https://img/x.jpg",
      categoryName: "Cat", categorySlug: "cat", url: `/shop/${id}`, sellerDescription: "d", ...extra,
    });
    api.products.mockResolvedValue({
      ...emptyShop,
      gemstones: [p("diamond-1", "Natural Diamond", 45000)],
      chartLinked: [p("r6", "6 Mukhi Rudraksha", 500, { reason: "Common convention reason" })],
      complementary: [p("b1", "Tiger Eye Bracelet", 899)],
    });
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    const link = await screen.findByRole("link", { name: "Natural Diamond" });
    expect(link).toHaveAttribute("href", "/shop/diamond-1");
    expect(screen.getByText("₹45,000")).toBeInTheDocument();
    expect(screen.getByText(/Linked by convention to Venus/)).toBeInTheDocument();
    expect(screen.getByText("Complementary Spiritual Accessories")).toBeInTheDocument();
    expect(screen.getByText("General accessories, not selected from your birth details.")).toBeInTheDocument();
    expect(screen.getByText("Planet-Linked Accessories")).toBeInTheDocument();
    expect(screen.getByText("Your Matching Ratna")).toBeInTheDocument();
    expect(screen.queryByText(/left in stock|only \d+ left/i)).toBeNull();
  });

  it("shows an error with retry when the shop API fails, keeping the result", async () => {
    api.products.mockRejectedValue(new Error("boom"));
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    expect(await screen.findByText(/could not load shop products/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByTestId("recommended-stone")).toBeInTheDocument();
    api.products.mockResolvedValue(emptyShop);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText(/could not load shop products/)).toBeNull());
  });
});
