import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => {
  class AuthApiError extends Error { status = 0; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { authRequest: (...a: unknown[]) => authRequest(...a), AUTH_API_BASE_URL: "http://x/api", AuthApiError };
});
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));

import ToolsPage from "./pages/ToolsPage";

const tool = (key: string, over: object = {}) => ({ key, label: key, group: "astrology", mount: `/api/${key}`, provider: "openrouter", enabled: true, limitSupported: true, limit: null, endpoints: [`POST /api/${key}`], usage: { total: 0, errors: 0, rejected: 0, blocked: 0, lastAt: null }, ...over });
const tools = {
  windowDays: 30, limitWindowHours: 24, countingRule: "A request counts once admitted.",
  tools: [tool("tarot", { limit: 3, usage: { total: 12, errors: 2, rejected: 4, blocked: 3, lastAt: "2026-11-02T10:00:00Z" } }), tool("zodiac", { limitSupported: false, endpoints: ["/api/zodiac"] }), tool("ai-chat", { group: "inner-voice" })],
  unsupported: [],
};
const snap = (keyUsage: object | undefined) => ({ providers: [{ id: "openrouter", name: "OpenRouter", connection: "connected", balance: { state: "unavailable", remainingUsd: null, unlimited: false, scope: null, note: "" }, usage: { monthlyUsd: null, totalUsd: null, dailyUsd: null, weeklyUsd: null, note: null }, lastCheckedAt: null, lastSuccessAt: null, error: null, keyUsage }], refreshedAt: null });

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

const ku = (status: string, over: object = {}) => ({ status, label: null, usage: null, limit: null, unlimited: false, remaining: null, usageDaily: null, usageWeekly: null, usageMonthly: null, limitReset: null, fetchedAt: null, stale: false, error: null, retryAt: null, ...over });
const okKu = (over: object = {}) => ku("ok", { label: "Production backend", usage: 4.2, limit: 10, remaining: 5.8, usageDaily: 0.1, usageWeekly: 0.7, usageMonthly: 2.5, limitReset: "monthly", fetchedAt: "2026-11-02T10:00:00Z", ...over });

describe("OpenRouter API Usage card (configured API key only)", () => {
  it("shows the key name, usage, limit, remaining, period and last update", async () => {
    setup(snap(okKu()));
    expect(await screen.findByTestId("openrouter-status")).toHaveTextContent("Connected");
    expect(screen.getByTestId("openrouter-key-name")).toHaveTextContent("Production backend");
    expect(screen.getByTestId("stat-usage")).toHaveTextContent("4.2");
    expect(screen.getByTestId("stat-limit")).toHaveTextContent("10");
    expect(screen.getByTestId("stat-remaining")).toHaveTextContent("5.8");
    expect(screen.getByTestId("openrouter-period")).toHaveTextContent(/today.*this week.*this month/);
    expect(screen.getByTestId("openrouter-refreshed")).not.toHaveTextContent("Never");
  });

  it("shows Unlimited, not an invented balance, when the key has no spending limit", async () => {
    setup(snap(okKu({ limit: null, unlimited: true, remaining: null })));
    await screen.findByTestId("openrouter-numbers");
    expect(screen.getByTestId("stat-limit")).toHaveTextContent("Unlimited");
    expect(screen.getByTestId("stat-remaining")).toHaveTextContent("Unlimited");
  });

  it("never shows account-wide credits and omits the key name when it is not safe", async () => {
    setup(snap(okKu({ label: null })));
    await screen.findByTestId("openrouter-numbers");
    expect(screen.queryByTestId("openrouter-key-name")).toBeNull();
    expect(screen.getByTestId("openrouter-card")).not.toHaveTextContent(/credits purchased|OPENROUTER_MANAGEMENT_KEY/i);
  });

  it("says Not Configured and points at OPENROUTER_API_KEY, with no numbers", async () => {
    setup(snap(ku("not_configured")));
    expect(await screen.findByTestId("openrouter-status")).toHaveTextContent("Not Configured");
    expect(screen.getByTestId("openrouter-card")).toHaveTextContent("OPENROUTER_API_KEY");
    expect(screen.queryByTestId("openrouter-numbers")).toBeNull();
    expect(screen.getByTestId("openrouter-refreshed")).toHaveTextContent("Never");
  });

  it.each([
    ["unauthorized", "Unauthorized"],
    ["rate_limited", "Rate limited"],
    ["unavailable", "Temporarily unavailable"],
  ])("%s shows %s and 'Unable to fetch key usage', never account credits", async (status, label) => {
    setup(snap(ku(status, { error: "msg" })));
    const el = await screen.findByTestId("openrouter-status");
    expect(el).toHaveTextContent(label);
    expect(screen.getByRole("alert")).toHaveTextContent(/Unable to fetch key usage.*No earlier snapshot/);
    expect(screen.queryByTestId("openrouter-numbers")).toBeNull();
  });

  it("keeps the last successful snapshot, marked stale, when a refresh fails, and says when a rate-limited check retries", async () => {
    setup(snap(okKu({ status: "rate_limited", stale: true, error: "OpenRouter is rate limiting usage checks (429).", retryAt: "2026-11-02T10:05:00Z" })));
    expect(await screen.findByTestId("openrouter-numbers")).toHaveTextContent("4.2");
    expect(screen.getByRole("alert")).toHaveTextContent(/asked again after.*last successful snapshot/);
    expect(screen.getByTestId("openrouter-refreshed")).toHaveTextContent(/stale/);
  });

  it("Refresh Usage calls the backend only (the key never reaches the browser)", async () => {
    setup(snap(okKu()));
    fireEvent.click(await screen.findByRole("button", { name: /Refresh Usage/ }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/admin/providers/balance/refresh", { method: "POST", body: undefined }));
    expect(JSON.stringify(authRequest.mock.calls)).not.toMatch(/sk-or|Bearer/);
  });

  it("the dashboard's own refresh limit (429) shows a clear message and a cooldown, keeping Connected", async () => {
    const { AuthApiError } = await import("@/lib/authClient");
    setup(snap(okKu()));
    const base = authRequest.getMockImplementation()!;
    authRequest.mockImplementation(async (url: string, opts?: { method?: string }) => {
      if (url === "/admin/providers/balance/refresh") throw new AuthApiError("Too many refreshes.", 429);
      return base(url, opts);
    });
    fireEvent.click(await screen.findByRole("button", { name: /Refresh Usage/ }));
    expect(await screen.findByText(/dashboard's own limit, not OpenRouter/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry in \d+s/ })).toBeDisabled();
    expect(screen.getByTestId("openrouter-status")).toHaveTextContent("Connected");
  });
});
