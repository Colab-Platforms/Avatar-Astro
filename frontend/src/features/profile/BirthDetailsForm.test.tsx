import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BirthDetailsForm from "./BirthDetailsForm";
import type { CentralProfile } from "./profile";

const hook = vi.hoisted(() => ({ profile: null as unknown, isLoading: false, error: null as Error | null, save: vi.fn(), refetch: vi.fn() }));
vi.mock("./useUserProfile", () => ({
  useUserProfile: () => ({ profile: hook.profile, isLoading: hook.isLoading, error: hook.error, signedIn: true, save: hook.save, isSaving: false, saveError: null, missing: () => [], has: () => false, refetch: hook.refetch }),
}));
vi.mock("@/features/ratna/api", () => ({ ratnaApi: { searchLocations: vi.fn().mockResolvedValue([]) } }));

const pune = { name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };
const saved = (o: Partial<CentralProfile> = {}): CentralProfile => ({
  fullName: "Asha Rao", firstName: "Asha", lastName: "Rao", email: "a@example.test", phone: null, gender: "Female",
  dateOfBirth: "1990-05-17", birthTime: "06:45", birthTimeUnknown: false, birthPlace: pune, preferredLanguage: "hi", birthDetailsUpdatedAt: null, ...o,
});
const saveBtn = () => screen.getByRole("button", { name: /save birth details|saving/i });

beforeEach(() => {
  vi.clearAllMocks();
  hook.profile = saved();
  hook.isLoading = false;
  hook.error = null;
  hook.save.mockResolvedValue(undefined);
});

describe("BirthDetailsForm", () => {
  it("shows the saved values and keeps Save disabled until something changes", () => {
    render(<BirthDetailsForm />);
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-05-17");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("06:45");
    expect(screen.getByRole("combobox", { name: /birthplace/i })).toHaveValue("Pune, Maharashtra, India");
    expect(screen.getByLabelText("Preferred language")).toHaveValue("hi");
    expect(saveBtn()).toBeDisabled();
  });

  it("saves only the field that changed", async () => {
    render(<BirthDetailsForm />);
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "07:30" } });
    expect(saveBtn()).toBeEnabled();
    fireEvent.click(saveBtn());
    await waitFor(() => expect(hook.save).toHaveBeenCalledTimes(1));
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { birthTimeUnknown: false, birthTime: "07:30" } });
    expect(await screen.findByText(/birth details saved/i)).toBeInTheDocument();
  });

  it("'I don't know my birth time' clears the time and is saved as unknown", async () => {
    render(<BirthDetailsForm />);
    fireEvent.click(screen.getByLabelText(/i don't know my exact birth time/i));
    expect(screen.getByLabelText("Exact birth time")).toBeDisabled();
    fireEvent.click(saveBtn());
    await waitFor(() => expect(hook.save).toHaveBeenCalled());
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { birthTimeUnknown: true, birthTime: null } });
  });

  it("rejects a future date of birth without calling the server", async () => {
    render(<BirthDetailsForm />);
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "2999-01-01" } });
    fireEvent.click(saveBtn());
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be in the future/i);
    expect(hook.save).not.toHaveBeenCalled();
  });

  it("shows the server's reason when saving fails, and keeps the typed value", async () => {
    hook.save.mockRejectedValue(new Error("Enter a valid date of birth (YYYY-MM-DD)."));
    render(<BirthDetailsForm />);
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "08:00" } });
    fireEvent.click(saveBtn());
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid date of birth/i);
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("08:00");
  });

  it("a language change alone is saved, and 'No preference' clears it", async () => {
    render(<BirthDetailsForm />);
    fireEvent.change(screen.getByLabelText("Preferred language"), { target: { value: "" } });
    fireEvent.click(saveBtn());
    await waitFor(() => expect(hook.save).toHaveBeenCalled());
    expect(hook.save.mock.calls[0][0]).toEqual({ birth: { preferredLanguage: null } });
  });

  it("an empty profile shows empty fields and does not invent values", () => {
    hook.profile = saved({ dateOfBirth: null, birthTime: null, birthPlace: null, preferredLanguage: null });
    render(<BirthDetailsForm />);
    expect(screen.getByLabelText("Date of birth")).toHaveValue("");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /birthplace/i })).toHaveValue("");
    expect(saveBtn()).toBeDisabled();
  });

  it("explains privacy and that birthplace is not the current location", () => {
    render(<BirthDetailsForm />);
    expect(screen.getByText(/never shown to other users/i)).toBeInTheDocument();
    expect(screen.getByText(/not where you live now/i)).toBeInTheDocument();
  });

  it("shows a loading note, then an error with retry when the profile cannot be loaded", () => {
    hook.isLoading = true;
    const { unmount } = render(<BirthDetailsForm />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading your birth details/i);
    unmount();
    hook.isLoading = false; hook.profile = null; hook.error = new Error("Not available until the latest database migration has been applied.");
    render(<BirthDetailsForm />);
    expect(screen.getByRole("alert")).toHaveTextContent(/database migration/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(hook.refetch).toHaveBeenCalled();
  });
});
