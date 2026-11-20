import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUserProfile, PROFILE_QUERY_PREFIX } from "./useUserProfile";
import { useAccountEpoch, useRemountOnAccountSwitch } from "./accountEpoch";
import type { CentralProfile } from "./profile";

const api = vi.hoisted(() => ({ get: vi.fn(), saveBirth: vi.fn(), saveAccount: vi.fn() }));
vi.mock("./api", () => ({ profileApi: api }));

const prof = (name: string, dob: string): CentralProfile => ({ fullName: name, firstName: name, lastName: null, email: `${name}@example.test`, phone: null, gender: null, dateOfBirth: dob, birthTime: null, birthTimeUnknown: false, birthPlace: null, preferredLanguage: null, birthDetailsUpdatedAt: null });
const signIn = (id: string) => useAuthStore.setState({ user: { id } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

beforeEach(() => {
  vi.clearAllMocks(); signOut(); useAccountEpoch.setState({ epoch: 0 });
  api.get.mockImplementation(async () => { const id = useAuthStore.getState().user?.id; return id === "A" ? prof("Asha", "1990-05-17") : prof("Bina", "1985-01-02"); });
});

describe("saved details are never shared between accounts", () => {
  it("signed out: no request and no profile", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useUserProfile(), { wrapper: wrap(qc) });
    expect(result.current.profile).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("switching accounts loads the NEW account's profile and never shows the old one", async () => {
    signIn("A");
    const qc = new QueryClient();
    const { result } = renderHook(() => useUserProfile(), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.profile?.fullName).toBe("Asha"));
    act(() => signIn("B"));
    // The very next render must not still hold A's profile.
    expect(result.current.profile?.fullName).not.toBe("Asha");
    await waitFor(() => expect(result.current.profile?.fullName).toBe("Bina"));
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("the cache is keyed per user: going back to A does not leak B's data", async () => {
    signIn("A");
    const qc = new QueryClient();
    const { result } = renderHook(() => useUserProfile(), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.profile?.fullName).toBe("Asha"));
    act(() => signIn("B"));
    await waitFor(() => expect(result.current.profile?.fullName).toBe("Bina"));
    act(() => signIn("A"));
    await waitFor(() => expect(result.current.profile?.fullName).toBe("Asha"));
  });

  it("removing the profile cache on logout leaves nothing behind", async () => {
    signIn("A");
    const qc = new QueryClient();
    const { result } = renderHook(() => useUserProfile(), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    act(() => { qc.removeQueries({ queryKey: PROFILE_QUERY_PREFIX }); signOut(); });
    expect(qc.getQueryCache().findAll({ queryKey: PROFILE_QUERY_PREFIX }).filter((q) => q.state.data !== undefined)).toHaveLength(0); // no saved data left in memory
    expect(result.current.profile).toBeNull();
  });
});

describe("pages restart when the person changes (so a filled form cannot outlive its owner)", () => {
  function Probe() { const e = useRemountOnAccountSwitch(); return <div data-testid="epoch">{e}</div>; }

  it("goes up when one account replaces another, and on logout", () => {
    signIn("A");
    render(<Probe />);
    expect(screen.getByTestId("epoch")).toHaveTextContent("0");
    act(() => signIn("B"));
    expect(screen.getByTestId("epoch")).toHaveTextContent("1");
    act(() => useAccountEpoch.getState().bump()); // what the logout mutation does
    expect(screen.getByTestId("epoch")).toHaveTextContent("2");
  });

  it("does NOT change for an expired session, the same user signing back in, or a first sign-in (typed text is kept)", () => {
    render(<Probe />);
    act(() => signIn("A"));            // first sign-in from signed-out
    expect(screen.getByTestId("epoch")).toHaveTextContent("0");
    act(() => signOut());              // session expired
    act(() => signIn("A"));            // same person signs back in
    expect(screen.getByTestId("epoch")).toHaveTextContent("0");
  });
});
