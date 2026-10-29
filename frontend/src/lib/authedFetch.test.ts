import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/authClient", () => ({ refreshAccessToken: vi.fn() }));
import { refreshAccessToken } from "@/lib/authClient";
import { useAuthStore, clearPersonalLocalData } from "@/store/authStore";
import { authedFetch, requireSignIn, SignInRequiredError, useSignInPrompt } from "./authedFetch";

// fetch is MOCKED; no network is used.
const signIn = (token = "access-1") =>
  useAuthStore.setState({ user: { id: "u1" } as never, accessToken: token, refreshToken: "r1", isAuthenticated: true });
const signOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const res = (status: number) => ({ status, ok: status < 400 }) as Response;

describe("authedFetch / requireSignIn", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.mocked(refreshAccessToken).mockReset();
    useSignInPrompt.setState({ open: false });
    signOut();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("signed out: opens the prompt, throws, and never calls the network", async () => {
    await expect(authedFetch("/x")).rejects.toBeInstanceOf(SignInRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useSignInPrompt.getState().open).toBe(true);
  });

  it("requireSignIn reports false (and prompts) only when signed out", () => {
    expect(requireSignIn()).toBe(false);
    expect(useSignInPrompt.getState().open).toBe(true);
    useSignInPrompt.setState({ open: false });
    signIn();
    expect(requireSignIn()).toBe(true);
    expect(useSignInPrompt.getState().open).toBe(false);
  });

  it("signed in: sends the bearer token and keeps caller headers", async () => {
    signIn("tok");
    fetchMock.mockResolvedValue(res(200));
    await authedFetch("/x", { method: "POST", headers: { "Content-Type": "application/json" } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("401 then successful refresh: retries once with the new token", async () => {
    signIn("old");
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));
    vi.mocked(refreshAccessToken).mockResolvedValue("new");
    const r = await authedFetch("/x");
    expect(r.status).toBe(200);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer new");
  });

  it("401 and refresh fails: signs the user out and prompts", async () => {
    signIn("old");
    fetchMock.mockResolvedValue(res(401));
    vi.mocked(refreshAccessToken).mockResolvedValue(null);
    await expect(authedFetch("/x")).rejects.toBeInstanceOf(SignInRequiredError);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useSignInPrompt.getState().open).toBe(true);
  });
});

describe("sign-out clears personal data", () => {
  it("removes iv_* keys but not unrelated ones", () => {
    localStorage.setItem("iv_karma_v2", "[1]");
    localStorage.setItem("iv_shlokas", "[2]");
    localStorage.setItem("theme", "dark");
    useAuthStore.getState().logout();
    expect(localStorage.getItem("iv_karma_v2")).toBeNull();
    expect(localStorage.getItem("iv_shlokas")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("dark");
    clearPersonalLocalData();
  });
});
