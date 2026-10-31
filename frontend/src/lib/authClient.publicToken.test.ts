import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authRequest } from "./authClient";
import { useAuthStore } from "@/store/authStore";

// Behaviour of the `sendTokenIfPresent` option used by public, tracked endpoints.
const ok = () => new Response(JSON.stringify({ status: true, data: { ok: 1 }, message: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); useAuthStore.setState({ accessToken: null } as never); });

const headersOf = (i = 0) => (fetchMock.mock.calls[i][1] as RequestInit).headers as Record<string, string>;

describe("authRequest sendTokenIfPresent", () => {
  it("sends the Authorization header for a signed-in visitor", async () => {
    useAuthStore.setState({ accessToken: "tok-123" } as never);
    fetchMock.mockResolvedValue(ok());
    await authRequest("/gemstone-calculator/locations?q=pune", { skipAuth: true, sendTokenIfPresent: true });
    expect(headersOf().Authorization).toBe("Bearer tok-123");
  });

  it("sends no Authorization header for an anonymous visitor", async () => {
    useAuthStore.setState({ accessToken: null } as never);
    fetchMock.mockResolvedValue(ok());
    await authRequest("/gemstone-calculator/locations?q=pune", { skipAuth: true, sendTokenIfPresent: true });
    expect(headersOf().Authorization).toBeUndefined();
  });

  it("with skipAuth alone (login etc.) still never sends the token", async () => {
    useAuthStore.setState({ accessToken: "tok-123" } as never);
    fetchMock.mockResolvedValue(ok());
    await authRequest("/auth/login", { skipAuth: true });
    expect(headersOf().Authorization).toBeUndefined();
  });

  it("a 401 on a public call does NOT trigger a token refresh or a retry", async () => {
    useAuthStore.setState({ accessToken: "tok-123" } as never);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "nope" }), { status: 401, headers: { "Content-Type": "application/json" } }));
    await expect(authRequest("/gemstone-calculator/calculate", { method: "POST", body: {}, skipAuth: true, sendTokenIfPresent: true })).rejects.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
