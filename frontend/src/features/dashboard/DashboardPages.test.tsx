import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED (authRequest); these tests cover what each dashboard page renders and sends.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error {},
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/featureFlags", () => ({ useFeatureFlags: () => ({ status: "ready", disabled: [], isPathDisabled: () => false }) }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: { logoutAll: vi.fn() } }));

import { ProfileSettings } from "./DashboardPages";

const profile = {
  id: "u1", firstName: "Asha", lastName: "Rao", email: "asha@example.com", phoneNo: null, gender: null, city: "Pune", state: null, country: null,
  authProvider: "LOCAL", isEmailVerified: true, isPhoneVerified: false, profileCompleted: true, createdAt: "2026-01-02T00:00:00.000Z",
};
const dash = (over: object = {}) => ({
  profile, activeSessions: 1, usage: { windowDays: 30, byFeature: [] }, recentActivity: [], hasTrackedActivity: false,
  persistence: { savedReports: false, innerVoiceHistory: false, bookings: false, note: "Not stored on the server." }, ...over,
});

const mount = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
};

describe("dashboard pages", () => {
  beforeEach(() => { authRequest.mockReset(); });

  it("shows an error with retry when the API fails", async () => {
    authRequest.mockRejectedValue(new Error("Server exploded")); // the hook retries once before giving up
    mount(<ProfileSettings />);
    await screen.findByRole("alert", undefined, { timeout: 4000 });
    authRequest.mockResolvedValue(dash());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Profile & Settings");
  });

  it("profile: states honestly that there is no self-service deletion or notification setting", async () => {
    authRequest.mockResolvedValue(dash());
    mount(<ProfileSettings />);
    await screen.findByText(/no self-service deletion yet/);
    expect(screen.getByText(/does not send marketing messages/)).toBeInTheDocument();
  });

  it("profile: save is disabled until a field changes, then PATCHes only editable fields and confirms", async () => {
    authRequest.mockImplementation((url: string, opts?: { method?: string }) =>
      url === "/me/profile" && opts?.method === "PATCH" ? Promise.resolve({ ...profile, firstName: "Asha2" }) : Promise.resolve(dash()));
    mount(<ProfileSettings />);
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Asha2" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await screen.findByText("Profile updated.");
    const patch = authRequest.mock.calls.find((c) => c[0] === "/me/profile")!;
    expect(Object.keys(patch[1].body).sort()).toEqual(["city", "country", "firstName", "gender", "lastName", "state"]);
    expect(JSON.stringify(patch[1].body)).not.toMatch(/email|role|isActive/);
  });

  it("profile: shows the server's validation error and keeps the form", async () => {
    authRequest.mockImplementation((url: string, opts?: { method?: string }) =>
      url === "/me/profile" && opts?.method === "PATCH" ? Promise.reject(new Error("First name cannot be empty.")) : Promise.resolve(dash()));
    mount(<ProfileSettings />);
    const input = await screen.findByLabelText("First name");
    fireEvent.change(input, { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("First name cannot be empty.");
    expect(screen.getByLabelText("First name")).toHaveValue("X");
  });

  it("profile: clear-activity is disabled when nothing has been tracked", async () => {
    authRequest.mockResolvedValue(dash());
    mount(<ProfileSettings />);
    expect(await screen.findByRole("button", { name: "Clear my activity history" })).toBeDisabled();
  });
});
