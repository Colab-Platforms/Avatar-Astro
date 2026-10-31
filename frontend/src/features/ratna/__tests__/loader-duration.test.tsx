import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RatnaJyotish from "@/pages/RatnaJyotish";
import RatnaJyotishResult from "@/pages/RatnaJyotishResult";
import { ratnaApi } from "../api";
import { complete, delhi, emptyShop, fillPersonalAndPanchang, signInForTests } from "./fixtures";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
const api = vi.mocked(ratnaApi);

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/ratna-jyotish"]}>
        <Routes>
          <Route path="/ratna-jyotish" element={<RatnaJyotish />} />
          <Route path="/ratna-jyotish/result" element={<RatnaJyotishResult />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** Fill the form with real timers, then switch to fake ones for the timing part. */
const fillThenFreezeTime = async () => {
  fillPersonalAndPanchang();
  fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
  fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
  vi.useFakeTimers();
};

// hidden: the form is aria-hidden while the loader is up, but the button is still clickable in the DOM.
const submit = () => fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA", hidden: true }));
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const loaderUp = () => screen.queryByTestId("ratna-loader") !== null;
const resultUp = () => screen.queryByTestId("recommended-stone") !== null;

/** calculate() that settles after `ms` of (fake) time. */
const apiAfter = (ms: number, outcome: "ok" | Error = "ok") =>
  api.calculate.mockImplementation(
    () => new Promise((resolve, reject) =>
      setTimeout(() => (outcome === "ok" ? resolve(complete) : reject(outcome)), ms)),
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  signInForTests();
  api.searchLocations.mockResolvedValue([delhi]);
  api.products.mockResolvedValue(emptyShop);
});
afterEach(() => vi.useRealTimers());

describe("minimum 5-second loader", () => {
  it("API in 1 s: loader stays until 5 s, then navigates", async () => {
    renderApp();
    await fillThenFreezeTime();
    apiAfter(1000);
    submit();
    await advance(0);
    expect(loaderUp()).toBe(true);
    await advance(1000); // API has answered
    expect(api.calculate).toHaveBeenCalledTimes(1);
    expect(loaderUp()).toBe(true);
    await advance(3999); // 4999 ms in
    expect(loaderUp()).toBe(true);
    expect(resultUp()).toBe(false);
    await advance(1);
    expect(loaderUp()).toBe(false);
    expect(resultUp()).toBe(true);
  });

  it("API in 4 s: loader stays until 5 s", async () => {
    renderApp();
    await fillThenFreezeTime();
    apiAfter(4000);
    submit();
    await advance(4999);
    expect(loaderUp()).toBe(true);
    expect(resultUp()).toBe(false);
    await advance(1);
    expect(resultUp()).toBe(true);
  });

  it("API in 7 s: loader stays for the real response, then navigates promptly", async () => {
    renderApp();
    await fillThenFreezeTime();
    apiAfter(7000);
    submit();
    await advance(5000);
    expect(loaderUp()).toBe(true); // 5 s passed, response not here yet
    await advance(1999);
    expect(loaderUp()).toBe(true);
    expect(resultUp()).toBe(false);
    await advance(1); // 7 s: no extra delay added
    expect(resultUp()).toBe(true);
    expect(loaderUp()).toBe(false);
  });

  it("API failure: loader for at least 5 s, then the real error with details kept", async () => {
    renderApp();
    await fillThenFreezeTime();
    apiAfter(300, new Error("Birthplaces beyond 66° latitude are not supported"));
    submit();
    await advance(4999);
    expect(loaderUp()).toBe(true);
    expect(screen.queryByText(/66° latitude/)).toBeNull();
    await advance(1);
    expect(loaderUp()).toBe(false);
    expect(screen.getByText(/66° latitude/)).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Verma");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-05-05");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("10:00");
    expect(screen.getByRole("combobox", { name: "Birthplace" })).toHaveValue(delhi.label);

    // retry works and is subject to the same minimum
    apiAfter(100);
    submit();
    await advance(4999);
    expect(loaderUp()).toBe(true);
    await advance(1);
    expect(resultUp()).toBe(true);
  });

  it("duplicate clicks, even after the API answered, start one calculation", async () => {
    renderApp();
    await fillThenFreezeTime();
    apiAfter(500);
    submit();
    submit();
    await advance(1000);
    submit(); // still inside the minimum window
    await advance(4000);
    expect(api.calculate).toHaveBeenCalledTimes(1);
    expect(resultUp()).toBe(true);
  });

  it("leaves no timer behind when the page unmounts during the wait", async () => {
    const { unmount } = renderApp();
    await fillThenFreezeTime();
    apiAfter(100);
    submit();
    await advance(200);
    const before = vi.getTimerCount();
    expect(before).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
