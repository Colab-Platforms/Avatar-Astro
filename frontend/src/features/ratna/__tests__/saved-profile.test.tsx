import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RatnaJyotish from "@/pages/RatnaJyotish";
import { ratnaApi } from "../api";
import type { CentralProfile } from "@/features/profile/profile";
import { complete, delhi, signInForTests } from "./fixtures";

// The hook is replaced by a controllable state so these tests exercise only how the form uses a saved profile.
const hook = vi.hoisted(() => ({ profile: null as unknown, isLoading: false, save: vi.fn() }));
vi.mock("@/features/profile/useUserProfile", () => ({
  useUserProfile: () => ({ profile: hook.profile, isLoading: hook.isLoading, error: null, signedIn: true, save: hook.save, isSaving: false, saveError: null, missing: () => [], has: () => false, refetch: vi.fn() }),
}));
vi.mock("../api", () => ({ ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() } }));
vi.mock("../loaderTiming", () => ({ MIN_LOADER_MS: 0 }));
const api = vi.mocked(ratnaApi);

const pune = { name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };
const saved = (o: Partial<CentralProfile> = {}): CentralProfile => ({
  fullName: "Asha Rao", firstName: "Asha", lastName: "Rao", email: "a@example.test", phone: null, gender: "Female",
  dateOfBirth: "1990-05-17", birthTime: "06:45", birthTimeUnknown: false, birthPlace: pune, preferredLanguage: null, birthDetailsUpdatedAt: null, ...o,
});

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/ratna-jyotish"]}>
        <Routes>
          <Route path="/ratna-jyotish" element={<RatnaJyotish />} />
          <Route path="/ratna-jyotish/result" element={<div>result page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
const calculate = () => fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  signInForTests();
  hook.profile = null;
  hook.isLoading = false;
  hook.save.mockResolvedValue(undefined);
  api.searchLocations.mockResolvedValue([delhi]);
  api.calculate.mockResolvedValue(complete);
});

describe("Ratna Jyotish with a complete saved profile", () => {
  it("does not ask again: shows the saved details, keeps only the optional weight, and calculates from them", async () => {
    hook.profile = saved();
    renderApp();
    expect(screen.getByTestId("saved-profile-card")).toHaveTextContent("Asha Rao");
    expect(screen.getByTestId("saved-profile-card")).toHaveTextContent("17 May 1990");
    expect(screen.getByTestId("saved-profile-card")).toHaveTextContent("Pune, Maharashtra, India");
    for (const label of ["Full name", "Gender", "Date of birth", "Exact birth time"]) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Birthplace" })).toBeNull();
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /save/i })).toBeNull(); // nothing new to save

    calculate();
    await waitFor(() => expect(api.calculate).toHaveBeenCalledTimes(1));
    expect(api.calculate.mock.calls[0][0]).toMatchObject({ fullName: "Asha Rao", gender: "Female", dateOfBirth: "1990-05-17", timeOfBirth: "06:45", timeUnknown: false, place: pune });
    expect(hook.save).not.toHaveBeenCalled();
  });

  it("a saved 'time unknown' is respected (no time is invented)", async () => {
    hook.profile = saved({ birthTime: null, birthTimeUnknown: true });
    renderApp();
    calculate();
    await waitFor(() => expect(api.calculate).toHaveBeenCalled());
    expect(api.calculate.mock.calls[0][0]).toMatchObject({ timeOfBirth: null, timeUnknown: true });
  });

  it("'Change' reveals every field, prefilled, so a wrong saved value can be corrected", () => {
    hook.profile = saved();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Rao");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-05-17");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("06:45");
    expect(screen.getByRole("combobox", { name: "Birthplace" })).toHaveValue("Pune, Maharashtra, India");
    expect(screen.queryByTestId("saved-profile-card")).toBeNull();
  });
});

describe("Ratna Jyotish when only some details are saved", () => {
  it("asks only for the missing birthplace, and offers (pre-ticked) to save it", async () => {
    hook.profile = saved({ birthPlace: null });
    renderApp();
    expect(screen.getByTestId("saved-profile-card")).toHaveTextContent("Asha Rao");
    expect(screen.queryByLabelText("Full name")).toBeNull();
    expect(screen.queryByLabelText("Exact birth time")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Birthplace" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /save/i })).toBeNull(); // nothing entered yet

    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
    const box = await screen.findByRole("checkbox", { name: /save these to my profile/i });
    expect(box).toBeChecked();

    calculate();
    await waitFor(() => expect(api.calculate).toHaveBeenCalled());
    expect(hook.save).toHaveBeenCalledTimes(1);
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { birthPlace: { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata" } }, account: {} });
  });

  it("does not save when the user unticks the box, but still calculates", async () => {
    hook.profile = saved({ birthPlace: null });
    renderApp();
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /save these to my profile/i }));
    calculate();
    await waitFor(() => expect(api.calculate).toHaveBeenCalled());
    expect(hook.save).not.toHaveBeenCalled();
  });

  it("a saved gender this form has no option for is asked again (and the rest stay hidden)", () => {
    hook.profile = saved({ gender: "Nonbinary" });
    renderApp();
    expect(screen.getByLabelText("Gender")).toHaveValue("");
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("an empty profile shows the whole form, as before", () => {
    hook.profile = saved({ fullName: "", firstName: null, lastName: null, gender: null, dateOfBirth: null, birthTime: null, birthPlace: null });
    renderApp();
    expect(screen.queryByTestId("saved-profile-card")).toBeNull();
    for (const label of ["Full name", "Gender", "Date of birth", "Exact birth time"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
  });
});

describe("never silently overwriting what is saved", () => {
  it("a changed value is NOT saved unless the user ticks the box (it is unticked by default)", async () => {
    hook.profile = saved();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "07:15" } });
    const box = await screen.findByRole("checkbox", { name: /replace my saved details/i });
    expect(box).not.toBeChecked();
    calculate();
    await waitFor(() => expect(api.calculate).toHaveBeenCalled());
    expect(api.calculate.mock.calls[0][0]).toMatchObject({ timeOfBirth: "07:15" }); // this calculation uses the new value
    expect(hook.save).not.toHaveBeenCalled(); // the saved profile is untouched
  });

  it("when the user ticks it, only the changed field is saved", async () => {
    hook.profile = saved();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "07:15" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: /replace my saved details/i }));
    calculate();
    await waitFor(() => expect(hook.save).toHaveBeenCalledTimes(1));
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { birthTimeUnknown: false, birthTime: "07:15" }, account: {} });
  });
});

describe("loading", () => {
  it("shows a loading note and keeps the button disabled until the profile arrives", () => {
    hook.isLoading = true;
    renderApp();
    expect(screen.getByRole("status")).toHaveTextContent(/loading your saved details/i);
    expect(screen.getByRole("button", { name: "CALCULATE MY RATNA" })).toBeDisabled();
  });
});
