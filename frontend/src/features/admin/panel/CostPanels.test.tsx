import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED (authRequest). These tests check what the cost screens ask for, what they show, and where figures lead.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
const authedFetch = vi.fn();
vi.mock("@/lib/authedFetch", () => ({ authedFetch: (...a: unknown[]) => authedFetch(...a) }));
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div data-testid="chart">{children}</div>;
  return { ResponsiveContainer: Box, BarChart: Box, Bar: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null };
});

import ActivityPage from "./pages/ActivityPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import { CostAnalytics } from "./CostAnalytics";
import { fmtUsd } from "./money";

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
function mount(ui: React.ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="*" element={<>{ui}<Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const calls = () => authRequest.mock.calls.map((c) => String(c[0]));

describe("money formatting", () => {
  it("never turns unknown into zero, and keeps tiny costs visible", () => {
    expect(fmtUsd(null)).toBe("—");
    expect(fmtUsd(undefined)).toBe("—");
    expect(fmtUsd(0)).toBe("$0.00");
    expect(fmtUsd(0.000123)).toBe("$0.000123");
    expect(fmtUsd(0.0123)).toBe("$0.0123");
    expect(fmtUsd(12.5)).toBe("$12.50");
  });
});

const item = (over: object = {}) => ({
  id: "e1", at: "2026-10-30T10:00:00.000Z", eventType: "feature.request", label: "Feature request", feature: "tarot", status: "success", statusCode: 200, durationMs: 840,
  metadata: { method: "POST", route: "/api/tarot" }, servedFromCache: false,
  customer: { id: "u1", email: "asha@example.com", name: "Asha Rao", removed: false },
  ai: { provider: "openrouter", model: "google/gemma-3-27b-it", calls: 1, inputTokens: 100, outputTokens: 50, totalTokens: 150, costUsd: 0.0123, costBasis: "actual" },
  ...over,
});
const facets = { eventTypes: [], features: [{ value: "tarot", label: "Tarot" }], statuses: ["success", "error"], providers: ["openrouter", "groq", "sarvam"] };

describe("Activity page cost columns", () => {
  beforeEach(() => {
    authRequest.mockReset();
    authRequest.mockImplementation(async () => ({
      items: [
        item(),
        item({ id: "e2", feature: "ai-chat", ai: { provider: "groq", model: "g", calls: 1, inputTokens: 5, outputTokens: 5, totalTokens: 10, costUsd: 0.5, costBasis: "estimated" } }),
        item({ id: "e3", feature: "karma", ai: { provider: "groq", model: null, calls: 1, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null, costBasis: null } }),
        item({ id: "e4", feature: "zodiac", ai: null }),
        item({ id: "e5", feature: "palm-reading", ai: null, servedFromCache: true, statusCode: 304 }),
      ],
      page: 1, pageSize: 25, total: 5, totalPages: 1, facets,
    }));
  });

  it("shows Provider / Model and Cost, distinguishes actual / estimated / not known / non-AI / cached", async () => {
    mount(<ActivityPage />);
    const table = await screen.findByRole("table");
    for (const h of ["When", "Customer", "Activity", "Feature", "Provider / Model", "Cost", "Result", "Details"]) expect(within(table).getByRole("columnheader", { name: h })).toBeInTheDocument();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("openrouter");
    expect(rows[0]).toHaveTextContent("$0.0123");
    expect(rows[0]).toHaveTextContent("Actual");
    expect(rows[1]).toHaveTextContent("$0.5000");
    expect(rows[1]).toHaveTextContent("Estimated");
    expect(rows[2]).toHaveTextContent("Not known");
    expect(rows[2]).not.toHaveTextContent("$0");
    expect(rows[3]).not.toHaveTextContent("$");
    expect(rows[4]).toHaveTextContent("Cached");
  });

  it("opens a detail panel with tokens and cost type when a row is clicked", async () => {
    mount(<ActivityPage />);
    const table = await screen.findByRole("table");
    fireEvent.click(within(table).getAllByRole("row")[1]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Input tokens");
    expect(dialog).toHaveTextContent("100");
    expect(dialog).toHaveTextContent("$0.0123 USD");
    expect(dialog).toHaveTextContent("Actual (reported by the provider)");
  });

  it("says plainly that a non-AI row has no AI cost", async () => {
    mount(<ActivityPage />);
    const table = await screen.findByRole("table");
    fireEvent.click(within(table).getAllByRole("row")[4]);
    expect(await screen.findByRole("dialog")).toHaveTextContent("No AI provider was called");
  });

  it("sends the provider and cost-type filters to the API", async () => {
    mount(<ActivityPage />, "/?provider=groq&costBasis=estimated");
    await screen.findByRole("table");
    await waitFor(() => expect(calls().some((c) => c.includes("provider=groq") && c.includes("costBasis=estimated"))).toBe(true));
    fireEvent.change(screen.getByLabelText("Cost type"), { target: { value: "nonai" } });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toContain("ai=no"));
    expect(screen.getByTestId("where").textContent).not.toContain("costBasis");
  });
});

const costs = (over: object = {}) => ({
  from: "2026-10-01", to: "2026-10-30", currency: "USD", inrRate: null, trackingSince: "2026-10-20T00:00:00.000Z", note: "Only requests that actually called an AI provider are counted.",
  kpis: { totalCostUsd: 0.85, actualCostUsd: 0.75, estimatedCostUsd: 0.1, costTodayUsd: 0.85, costThisWeekUsd: 0.85, costThisMonthUsd: 0.85, totalAiRequests: 4, failedAiRequests: 1, unpricedRequests: 1, pricedRequests: 3, totalTokens: 250, inputTokens: 130, outputTokens: 120, averageCostUsd: 0.2833, customers: 2 },
  byFeature: [{ key: "tarot", label: "Tarot", requests: 2, tokens: 40, costUsd: 0.75, actualUsd: 0.75, estimatedUsd: null, unpricedRequests: 0, failedRequests: 0 }],
  byProvider: [{ key: "openrouter", label: "openrouter", requests: 2, tokens: 40, costUsd: 0.75, actualUsd: 0.75, estimatedUsd: null, unpricedRequests: 0, failedRequests: 0 }],
  byModel: [{ key: "m1", label: "m1", requests: 2, tokens: 40, costUsd: 0.75, actualUsd: 0.75, estimatedUsd: null, unpricedRequests: 0, failedRequests: 0 }],
  topCustomers: [{ userId: "u1", email: "asha@example.com", name: "Asha Rao", removed: false, requests: 3, tokens: 220, costUsd: 0.6 }],
  daily: [{ day: "2026-10-30", requests: 4, tokens: 250, costUsd: 0.85, actualUsd: 0.75, estimatedUsd: 0.1 }],
  ...over,
});

describe("Feature cost analytics", () => {
  beforeEach(() => { authRequest.mockReset(); authedFetch.mockReset(); });

  it("shows KPIs from the API and each leads to the underlying records", async () => {
    authRequest.mockResolvedValue(costs());
    mount(<CostAnalytics from="2026-10-01" to="2026-10-30" />);
    expect((await screen.findAllByText("$0.8500")).length).toBeGreaterThan(0);
    expect(calls()).toContain("/admin/costs/summary?from=2026-10-01&to=2026-10-30");
    const link = (name: RegExp) => screen.getByRole("link", { name });
    expect(link(/^AI requests/)).toHaveAttribute("href", "/admin/activity?ai=yes&from=2026-10-01&to=2026-10-30");
    expect(link(/^Failed AI requests/)).toHaveAttribute("href", expect.stringContaining("status=error"));
    expect(link(/^Actual cost/)).toHaveAttribute("href", expect.stringContaining("costBasis=actual"));
    expect(link(/^Estimated cost/)).toHaveAttribute("href", expect.stringContaining("costBasis=estimated"));
    expect(link(/^Requests with no cost/)).toHaveAttribute("href", expect.stringContaining("costBasis=none"));
    expect(screen.getByRole("link", { name: "Tarot" })).toHaveAttribute("href", expect.stringContaining("feature=tarot"));
    expect(screen.getByRole("link", { name: /Asha Rao/ })).toHaveAttribute("href", expect.stringContaining("userId=u1"));
  });

  it("explains unpriced requests instead of counting them as zero", async () => {
    authRequest.mockResolvedValue(costs());
    mount(<CostAnalytics from="2026-10-01" to="2026-10-30" />);
    expect(await screen.findByText(/not counted as \$0/)).toBeInTheDocument();
  });

  it("shows an honest empty state when nothing has been recorded", async () => {
    authRequest.mockResolvedValue(costs({ kpis: { ...costs().kpis, totalAiRequests: 0, totalCostUsd: null } }));
    mount(<CostAnalytics from="2026-10-01" to="2026-10-30" />);
    expect(await screen.findByText(/No AI requests with recorded usage/)).toBeInTheDocument();
    expect(screen.getByText(/never back-filled|Nothing is back-filled/)).toBeInTheDocument();
  });

  it("exports the CSV for the chosen range through the authenticated client", async () => {
    authRequest.mockResolvedValue(costs());
    authedFetch.mockResolvedValue({ ok: true, headers: new Headers(), blob: async () => new Blob(["x"]) });
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    mount(<CostAnalytics from="2026-10-01" to="2026-10-30" />);
    fireEvent.click(await screen.findByRole("button", { name: "Export cost CSV" }));
    await waitFor(() => expect(authedFetch).toHaveBeenCalled());
    expect(String(authedFetch.mock.calls[0][0])).toContain("/admin/reports/export?kind=costs&from=2026-10-01&to=2026-10-30");
  });

  it("shows a load failure without breaking", async () => {
    authRequest.mockRejectedValue(new Error("Boom"));
    mount(<CostAnalytics from="2026-10-01" to="2026-10-30" />);
    expect(await screen.findByText("Boom", {}, { timeout: 4000 })).toBeInTheDocument();
  });
});

const prov = (over: object) => ({
  id: "openrouter", name: "OpenRouter", connection: "connected",
  balance: { state: "available", remainingUsd: 7, unlimited: false, scope: "key", note: "" },
  usage: { totalUsd: 3, dailyUsd: 0.1, weeklyUsd: 0.5, monthlyUsd: 2, note: null },
  lastCheckedAt: "2026-10-30T09:00:00.000Z", lastSuccessAt: "2026-10-30T09:00:00.000Z", error: null, ...over,
});
const diagnostics = {
  captureInstalled: true, accountingEnabled: true, startedAt: "2026-10-30T08:00:00.000Z", pricingEntries: 1,
  counters: { providerCallsSeen: 5, providerCallsWithoutRequestContext: 0, providerCallsWithoutTokens: 1, providerCallsWithoutCost: 2, aiRowsPersisted: 5, aiRowsPersistFailed: 0 },
  providersConfigured: { openrouter: false, groq: true, sarvam: false }, windowDays: 7, recent: [],
  features: [{ feature: "tarot", requests: 9, withAiUsage: 0, succeededWithoutAi: 0, notSuccessful: 9 }], note: "Per-process view.", openRouterPriceList: 456, lastProviderCallAt: "2026-10-30T09:00:00.000Z",
};
const integrations = { windowDays: 30, database: { name: "PostgreSQL", ok: true, latencyMs: 3, kind: "remote", host: "x" }, providers: [], security: { jwtSecretConfigured: true, jwtSecretStrong: true, mainAdminEmailPinned: true }, note: "n" };

describe("Provider balance", () => {
  beforeEach(() => { authRequest.mockReset(); });
  const answer = (snapshot: object, onRefresh?: () => object) =>
    authRequest.mockImplementation(async (url: string, opts?: any) => {
      if (url === "/admin/integrations") return integrations;
      if (url === "/admin/providers/balance/refresh" && opts?.method === "POST") return onRefresh ? onRefresh() : snapshot;
      if (url === "/admin/providers/balance") return snapshot;
      if (url === "/admin/costs/diagnostics") return diagnostics;
      throw new Error("unexpected " + url);
    });

  it("before any check says so and does not call a provider on load", async () => {
    answer({ providers: [], refreshedAt: null });
    mount(<IntegrationsPage />);
    expect(await screen.findByText(/No check has been run yet/)).toBeInTheDocument();
    expect(authRequest.mock.calls.some((c) => c[0] === "/admin/providers/balance/refresh")).toBe(false);
  });

  it("distinguishes available, unsupported, unlimited and rejected states", async () => {
    answer({
      refreshedAt: "2026-10-30T09:00:00.000Z",
      providers: [
        prov({}),
        prov({ id: "groq", name: "Groq", balance: { state: "unsupported", remainingUsd: null, unlimited: false, scope: null, note: "Not available through API. Groq does not publish a balance endpoint." }, usage: { totalUsd: null, dailyUsd: null, weeklyUsd: null, monthlyUsd: null, note: "Not available through API." } }),
        prov({ id: "sarvam", name: "Sarvam", connection: "unverified", balance: { state: "unsupported", remainingUsd: null, unlimited: false, scope: null, note: "Not available through API." }, lastCheckedAt: null, lastSuccessAt: null }),
        prov({ id: "x", name: "Unlimited", balance: { state: "unavailable", remainingUsd: null, unlimited: true, scope: "key", note: "no limit" } }),
        prov({ id: "y", name: "Broken", connection: "rejected", error: "OpenRouter rejected the configured API key.", balance: { state: "unavailable", remainingUsd: null, unlimited: false, scope: "key", note: "Key rejected." }, lastSuccessAt: "2026-10-01T00:00:00.000Z" }),
      ],
    });
    mount(<IntegrationsPage />);
    const row = (name: string) => screen.getByRole("cell", { name }).closest("tr")!;
    await screen.findByRole("cell", { name: "OpenRouter" });
    expect(row("OpenRouter")).toHaveTextContent("$7.00");
    expect(row("OpenRouter")).toHaveTextContent("Remaining on this API key");
    expect(row("Groq")).toHaveTextContent("Not available through API");
    expect(row("Groq")).not.toHaveTextContent("$0");
    expect(row("Sarvam")).toHaveTextContent("Key set, not verifiable");
    expect(row("Sarvam")).toHaveTextContent("Never");
    expect(row("Unlimited")).toHaveTextContent("No limit set");
    expect(row("Unlimited")).not.toHaveTextContent("$0");
    expect(row("Broken")).toHaveTextContent("Key rejected");
    expect(row("Broken")).toHaveTextContent("Last success");
  });

  it("Refresh calls the refresh endpoint once and shows the result", async () => {
    answer({ providers: [], refreshedAt: null }, () => ({ refreshedAt: "2026-10-30T10:00:00.000Z", throttled: false, providers: [prov({})] }));
    mount(<IntegrationsPage />);
    await screen.findByText(/No check has been run yet/);
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(await screen.findByText("Provider balances refreshed.")).toBeInTheDocument();
    expect(authRequest.mock.calls.filter((c) => c[0] === "/admin/providers/balance/refresh")).toHaveLength(1);
    expect(screen.getByRole("cell", { name: "OpenRouter" })).toBeInTheDocument();
  });

  it("shows a refresh failure clearly and keeps the page working", async () => {
    answer({ providers: [prov({})], refreshedAt: "2026-10-30T09:00:00.000Z" }, () => { throw new Error("Too many refreshes. Please wait a minute."); });
    mount(<IntegrationsPage />);
    await screen.findByRole("cell", { name: "OpenRouter" });
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(await screen.findByText("Too many refreshes. Please wait a minute.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "OpenRouter" })).toBeInTheDocument();
  });
});

describe("AI usage capture status", () => {
  beforeEach(() => { authRequest.mockReset(); });

  it("shows whether capture is active, which provider keys this server has, and where requests ended without AI usage", async () => {
    authRequest.mockImplementation(async (url: string) => (url === "/admin/integrations" ? integrations : url === "/admin/costs/diagnostics" ? diagnostics : { providers: [], refreshedAt: null }));
    mount(<IntegrationsPage />);
    expect(await screen.findByText("Capture active")).toBeInTheDocument();
    expect(screen.getByText("openrouter: not set")).toBeInTheDocument();
    expect(screen.getByText("groq: set")).toBeInTheDocument();
    const row = screen.getByRole("cell", { name: "tarot" }).closest("tr")!;
    expect(row).toHaveTextContent("9");
  });

  it("says plainly that nothing can be shown yet when no AI request has run since the server started", async () => {
    const idle = { ...diagnostics, counters: { ...diagnostics.counters, providerCallsSeen: 0, aiRowsPersisted: 0 }, lastProviderCallAt: null, features: [] };
    authRequest.mockImplementation(async (url: string) => (url === "/admin/integrations" ? integrations : url === "/admin/costs/diagnostics" ? idle : { providers: [], refreshedAt: null }));
    mount(<IntegrationsPage />);
    expect(await screen.findByText(/No AI request has run on this server since it started/)).toHaveTextContent(/never back-filled/);
    expect(screen.getByText(/OpenRouter price list: 456 models/)).toBeInTheDocument();
  });

  it("tells the admin to restart when the server has no diagnostics (an older backend process)", async () => {
    authRequest.mockImplementation(async (url: string) => {
      if (url === "/admin/integrations") return integrations;
      if (url === "/admin/costs/diagnostics") throw new Error("Not found");
      return { providers: [], refreshedAt: null };
    });
    mount(<IntegrationsPage />);
    expect(await screen.findByText(/Diagnostics are not available from this server/, {}, { timeout: 4000 })).toHaveTextContent(/restart or redeploy/);
  });
});

describe("Activity detail explains a failed request with no AI usage", () => {
  it("says the request failed before a provider call instead of implying a free AI call", async () => {
    authRequest.mockReset();
    authRequest.mockImplementation(async () => ({ items: [item({ id: "f1", status: "error", statusCode: 503, ai: null })], page: 1, pageSize: 25, total: 1, totalPages: 1, facets }));
    mount(<ActivityPage />);
    const table = await screen.findByRole("table");
    fireEvent.click(within(table).getAllByRole("row")[1]);
    expect(await screen.findByRole("dialog")).toHaveTextContent(/failed before one was made/);
  });
});
