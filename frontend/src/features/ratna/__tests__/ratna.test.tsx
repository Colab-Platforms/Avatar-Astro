import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RatnaJyotish from "@/pages/RatnaJyotish";
import RatnaJyotishResult from "@/pages/RatnaJyotishResult";
import { ratnaApi } from "../api";
import { loadResult, saveResult } from "../storage";
import type { PlaceResult, RatnaResult, ShopMatches } from "../types";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
const api = vi.mocked(ratnaApi);

const delhi: PlaceResult = {
  id: "1",
  name: "New Delhi",
  admin1: "Delhi",
  country: "India",
  latitude: 28.6,
  longitude: 77.2,
  timezone: "Asia/Kolkata",
  label: "New Delhi, Delhi, India",
};

const stone = {
  key: "diamond",
  planet: "Venus",
  name: "Diamond or White Sapphire",
  sanskrit: "Heera",
  colour: "#dfe9f5",
  weekday: "Friday",
  customs: { metal: "Platinum", finger: "Middle finger" },
  significance: ["Traditionally associated with Venus."],
};

const complete: RatnaResult = {
  status: "complete",
  method: {
    name: "Parashari Lagna-lord method",
    zodiac: "Sidereal",
    ayanamsa: "Lahiri",
    houses: "Whole sign",
    nodes: "Mean",
    engine: "astronomy-engine",
    summary: "Summary text.",
    limitations: ["One school of Vedic astrology."],
  },
  birth: { dateOfBirth: "1990-05-05", timeOfBirth: "10:00", place: "New Delhi, Delhi, India", timeZone: "Asia/Kolkata", utcOffsetMinutes: 330, ambiguousLocalTime: false },
  chart: { ascendant: { sign: "Taurus", degree: 5 }, planets: [{ planet: "Venus", sign: "Cancer", degree: 3, house: 3 }] },
  stableSigns: [],
  recommendation: {
    stone,
    lagnaLord: "Venus",
    lagnaLordSign: "Cancer",
    lagnaLordHouse: 3,
    factors: [{ label: "Lagna lord", value: "Venus" }],
    secondary: [],
    excluded: [],
    cautions: [],
  },
  wearing: {
    weekday: "Friday",
    metal: "Platinum",
    finger: "Middle finger",
    customNote: "Customs vary.",
    sunrise: { iso: "x", local: "Friday, 6 Nov 2026, 06:30", timeZone: "Asia/Kolkata", locationLabel: "New Delhi (your birthplace)" },
    sunriseNote: "Sunrise note.",
  },
  explanation: { text: "Rule based explanation text.", source: "rules" },
  notice: null,
};

const limited: RatnaResult = {
  ...complete,
  status: "limited",
  chart: null,
  recommendation: null,
  wearing: null,
  stableSigns: [{ planet: "Sun", sign: "Taurus" }],
  explanation: { text: "No recommendation without a birth time.", source: "rules" },
  notice: "Only stable signs shown.",
};

const emptyShop: ShopMatches = { stone: { key: "diamond", name: stone.name, planet: "Venus" }, gemstones: [], jewellery: [], chartLinked: [], complementary: [] };

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
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1990-05-05" } });
  fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
  const box = screen.getByRole("combobox");
  fireEvent.change(box, { target: { value: "Delhi" } });
  const option = await screen.findByRole("option", { name: delhi.label });
  fireEvent.mouseDown(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.searchLocations.mockResolvedValue([delhi]);
  api.products.mockResolvedValue(emptyShop);
});

describe("Ratna Jyotish form", () => {
  it("shows only the four primary inputs, the emblem and the CTA", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "Ratna Jyotish" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ratna Jyotish gemstone emblem" })).toBeInTheDocument();
    expect(screen.getByText("Discover the gemstone traditionally associated with your birth chart.")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toBeInTheDocument();
    expect(screen.getByLabelText("Exact birth time")).toBeInTheDocument();
    expect(screen.getByLabelText("I don't know my exact birth time")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" })).toBeInTheDocument();
    expect(screen.queryByText(/preferred name|area of interest|current city|method/i)).toBeNull();
    expect(document.querySelectorAll("input").length).toBe(4);
  });

  it("disables the time input when the birth time is unknown", () => {
    renderApp();
    fireEvent.click(screen.getByLabelText("I don't know my exact birth time"));
    expect(screen.getByLabelText("Exact birth time")).toBeDisabled();
  });

  it("validates required fields without calling the API", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    expect(await screen.findByText("Please enter your date of birth.")).toBeInTheDocument();
    expect(screen.getByText(/exact birth time/i, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Please choose your birthplace from the suggestions.")).toBeInTheDocument();
    expect(api.calculate).not.toHaveBeenCalled();
  });

  it("does not accept typed text as a confirmed birthplace", async () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1990-05-05" } });
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Delhi" } });
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    expect(await screen.findByText("Please choose your birthplace from the suggestions.")).toBeInTheDocument();
    expect(api.calculate).not.toHaveBeenCalled();
  });

  it("shows the loader while calculating, then opens the dedicated results page", async () => {
    let resolve!: (r: RatnaResult) => void;
    api.calculate.mockReturnValue(new Promise((r) => (resolve = r)));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));

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
    const btn = screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await screen.findByTestId("ratna-loader");
    expect(api.calculate).toHaveBeenCalledTimes(1);
  });

  it("returns to the form with values preserved when the API fails", async () => {
    api.calculate.mockRejectedValue(new Error("Birthplaces beyond 66° latitude are not supported"));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    expect(await screen.findByText(/66° latitude/)).toBeInTheDocument();
    expect(screen.queryByTestId("ratna-loader")).toBeNull();
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-05-05");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("10:00");
    expect(screen.getByRole("combobox")).toHaveValue(delhi.label);
    expect(loadResult()).toBeNull();
    // retry works
    api.calculate.mockResolvedValue(complete);
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    expect(await screen.findByTestId("recommended-stone")).toBeInTheDocument();
  });

  it("sends no time when the birth time is unknown and shows the limited result", async () => {
    api.calculate.mockResolvedValue(limited);
    renderApp();
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1990-05-05" } });
    fireEvent.click(screen.getByLabelText("I don't know my exact birth time"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    expect(await screen.findByText("No recommendation without a birth time.")).toBeInTheDocument();
    expect(api.calculate.mock.calls[0][0]).toMatchObject({ timeOfBirth: null, timeUnknown: true });
    expect(screen.queryByTestId("recommended-stone")).toBeNull();
    expect(screen.getByText("Sun in Taurus")).toBeInTheDocument();
    expect(api.products).not.toHaveBeenCalled();
  });

  it("clears a stale stored result when a new calculation starts", async () => {
    saveResult(complete);
    api.calculate.mockReturnValue(new Promise(() => {}));
    renderApp();
    await fillAndSelectPlace();
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY GEMSTONE" }));
    await screen.findByTestId("ratna-loader");
    expect(loadResult()).toBeNull();
  });
});

describe("Ratna Jyotish results page", () => {
  it("shows a friendly empty state with no stored result", () => {
    renderApp("/ratna-jyotish/result");
    expect(screen.getByTestId("ratna-empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calculate My Gemstone" })).toHaveAttribute("href", "/ratna-jyotish");
    expect(screen.queryByTestId("recommended-stone")).toBeNull();
  });

  it("recovers the result after a refresh from session storage", async () => {
    saveResult(complete);
    renderApp("/ratna-jyotish/result");
    expect(await screen.findByTestId("recommended-stone")).toBeInTheDocument();
    expect(screen.getByText("How this was calculated")).toBeInTheDocument();
    expect(screen.getByText(/Location used: New Delhi \(your birthplace\)/)).toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: "CALCULATE MY GEMSTONE" })).toBeInTheDocument();
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
    expect(screen.getByText(/do not substitute a different gemstone/)).toBeInTheDocument();
    expect(screen.queryByText("Complementary Spiritual Accessories")).toBeNull();
    expect(screen.getByText(/Purchasing a gemstone or spiritual accessory is optional/)).toBeInTheDocument();
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
    expect(screen.getByText("Common convention reason")).toBeInTheDocument();
    expect(screen.getByText("Complementary Spiritual Accessories")).toBeInTheDocument();
    expect(screen.getByText("These are general spiritual accessories and have not been individually selected from your birth chart.")).toBeInTheDocument();
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
