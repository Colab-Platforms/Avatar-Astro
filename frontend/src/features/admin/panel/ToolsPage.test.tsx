import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AUTH_API_BASE_URL: "http://x/api",
  AuthApiError: class extends Error { status = 0; constructor(m: string, s: number) { super(m); this.status = s; } },
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));

import ToolsPage from "./pages/ToolsPage";

const tool = (key: string, over: object = {}) => ({ key, label: key, group: "astrology", mount: `/api/${key}`, provider: "openrouter", enabled: true, limitSupported: true, limit: null, endpoints: [`POST /api/${key}`], usage: { total: 0, errors: 0, rejected: 0, blocked: 0, lastAt: null }, ...over });
const tools = {
  windowDays: 30, limitWindowHours: 24, countingRule: "A request counts once admitted.",
  tools: [tool("tarot", { limit: 3, usage: { total: 12, errors: 2, rejected: 4, blocked: 3, lastAt: "2026-11-02T10:00:00Z" } }), tool("zodiac", { limitSupported: false, endpoints: ["/api/zodiac"] }), tool("ai-chat", { group: "inner-voice" })],
  unsupported: [],
};
const snap = (credits: object | undefined) => ({ providers: [{ id: "openrouter", name: "OpenRouter", connection: "connected", balance: { state: "unavailable", remainingUsd: null, unlimited: false, scope: null, note: "" }, usage: { monthlyUsd: null, totalUsd: null, dailyUsd: null, weeklyUsd: null, note: null }, lastCheckedAt: null, lastSuccessAt: null, error: null, credits }], refreshedAt: null });

function setup(snapshot: object) {
  authRequest.mockImplementation(async (url: string, opts?: { method?: string }) => {
    if (url === "/admin/tools" && !opts?.method) return tools;
    if (url === "/admin/providers/balance" && !opts?.method) return snapshot;
    if (url.startsWith("/admin/tools/")) return { ok: true };
    if (url === "/admin/providers/balance/refresh") return { ...snapshot, throttled: false };
    throw new Error("unexpected " + JSON.stringify([url, opts]));
  });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ToolsPage /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { authRequest.mockReset(); });

describe("Astrology Tools page", () => {
  it("shows the required columns, real usage numbers and each tool's endpoint", async () => {
    setup(snap({ status: "not_configured", totalCredits: null, totalUsage: null, remaining: null, fetchedAt: null, stale: false, error: null }));
    const row = await screen.findByTestId("tool-row-tarot");
    for (const h of ["Tool", "Switch", "Limit / User / 24h", "Requests (30d)", "Failures", "Rejected", "Last Used", "Endpoint"]) expect(screen.getByRole("columnheader", { name: h })).toBeInTheDocument();
    expect(within(row).getByText("12")).toBeInTheDocument();
    expect(within(row).getByText("POST /api/tarot")).toBeInTheDocument();
    expect(within(row).getByLabelText("tarot uses per user per 24 hours")).toHaveValue(3);
    expect(screen.getByTestId("counting-rule")).toHaveTextContent("counts once admitted");
    expect(screen.queryByTestId("tool-row-ai-chat")).toBeNull(); // inner-voice features are listed separately, switch only
    expect(within(screen.getByTestId("tool-row-zodiac")).getByText("Not limited")).toBeInTheDocument();
  });

  it("saves a new limit, and an empty box means unlimited; invalid values cannot be saved", async () => {
    setup(snap(undefined));
    const row = await screen.findByTestId("tool-row-tarot");
    const input = within(row).getByLabelText("tarot uses per user per 24 hours");
    const save = within(row).getByRole("button", { name: "Save tarot limit" });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: "0" } });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: "2.5" } });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.click(save);
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/admin/tools/tarot", { method: "PUT", body: { limit: 10 } }));
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(within(row).getByRole("button", { name: "Save tarot limit" }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/admin/tools/tarot", { method: "PUT", body: { limit: null } }));
  });

  it("the switch sends enabled, after confirming a disable", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    setup(snap(undefined));
    const row = await screen.findByTestId("tool-row-tarot");
    fireEvent.click(within(row).getByRole("switch", { name: "tarot enabled" }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/admin/tools/tarot", { method: "PUT", body: { enabled: false } }));
  });
});

describe("OpenRouter API Usage card", () => {
  it("shows purchased, used and remaining credits with the last successful refresh", async () => {
    setup(snap({ status: "ok", totalCredits: 100, totalUsage: 37.5, remaining: 62.5, fetchedAt: "2026-11-02T10:00:00Z", stale: false, error: null }));
    const nums = await screen.findByTestId("openrouter-numbers");
    expect(nums).toHaveTextContent("100");
    expect(nums).toHaveTextContent("37.5");
    expect(nums).toHaveTextContent("62.5");
    expect(screen.getByTestId("openrouter-status")).toHaveTextContent("Connected");
    expect(screen.getByTestId("openrouter-refreshed")).not.toHaveTextContent("Never");
  });

  it("says Not Configured and shows no balance when there is no management key", async () => {
    setup(snap({ status: "not_configured", totalCredits: null, totalUsage: null, remaining: null, fetchedAt: null, stale: false, error: null }));
    expect(await screen.findByTestId("openrouter-status")).toHaveTextContent("Not Configured");
    expect(screen.queryByTestId("openrouter-numbers")).toBeNull();
    expect(screen.getByTestId("openrouter-refreshed")).toHaveTextContent("Never");
  });

  it("says Unable to fetch balance on failure and keeps the last successful snapshot, marked stale", async () => {
    setup(snap({ status: "error", totalCredits: 100, totalUsage: 40, remaining: 60, fetchedAt: "2026-11-01T10:00:00Z", stale: true, error: "Could not reach the provider." }));
    expect(await screen.findByTestId("openrouter-status")).toHaveTextContent("Unable to fetch balance");
    expect(screen.getByRole("alert")).toHaveTextContent(/last successful snapshot/i);
    expect(screen.getByTestId("openrouter-numbers")).toHaveTextContent("60");
    expect(screen.getByTestId("openrouter-refreshed")).toHaveTextContent(/stale/);
  });

  it("Refresh Balance calls the backend refresh endpoint (keys never reach the browser)", async () => {
    setup(snap({ status: "ok", totalCredits: 1, totalUsage: 0, remaining: 1, fetchedAt: "2026-11-02T10:00:00Z", stale: false, error: null }));
    fireEvent.click(await screen.findByRole("button", { name: /Refresh Balance/ }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/admin/providers/balance/refresh", { method: "POST", body: undefined }));
    expect(JSON.stringify(authRequest.mock.calls)).not.toMatch(/sk-or|Bearer/);
  });
});
