import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED (authRequest, authedFetch); this checks what the report asks for and how it separates actual from estimated.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
const authedFetch = vi.fn();
vi.mock("@/lib/authedFetch", () => ({ authedFetch: (...a: unknown[]) => authedFetch(...a) }));

import { FeatureCostBreakdown } from "./FeatureCostBreakdown";

const row = (o: object) => ({
  id: "x", feature: "tarot", label: "Tarot", operation: "Tarot reading", route: "/api/tarot/reading", provider: "openrouter", model: "google/gemma-3-27b-it", modelFrom: "code",
  classification: "paid", costBasis: "actual", reason: "r", requests: 4, avgCalls: 1, inputTokens: 1000, outputTokens: 500, totalTokens: 1500,
  costPerGenerationUsd: 0.001, costPerGenerationInr: 0.1, cost100Usd: 0.1, cost100Inr: 10, cost1000Usd: 1, cost1000Inr: 100, maxCostPerGenerationUsd: null,
  rate: { inputPerM: 0.08, outputPerM: 0.35, inrPer1kChars: null, source: "https://openrouter.ai/api/v1/models", verifiedAt: "2026-10-31" }, sharedEndpoint: false, note: null, ...o,
});
const report = () => ({
  from: "2026-10-01", to: "2026-10-30", note: "n", formula: "Cost = (input tokens x input price + output tokens x output price) / 1,000,000", pricingVerifiedAt: "2026-10-31",
  fx: { rate: 95.07, kind: "reference", asOf: "2026-10-31", source: "https://open.er-api.com/v6/latest/USD" },
  counts: { free: 1, "free-model": 1, paid: 1, estimated: 0, unknown: 1 },
  totals: { actualUsd: 0.004, actualInr: 0.38, estimatedUsd: 0, estimatedInr: 0, requestsWithActual: 4, requestsWithEstimate: 0, unpricedRequests: 2 },
  providerModel: [{ provider: "openrouter", model: "google/gemma-3-27b-it", operations: 1, requests: 4, actualUsd: 0.004, estimatedUsd: 0 }],
  rows: [
    row({ id: "a" }),
    row({ id: "b", feature: "inner-voice", label: "Inner Voice", operation: "Diagnose", model: "google/gemma-4-31b-it:free", classification: "free-model", costBasis: null, costPerGenerationUsd: 0, costPerGenerationInr: 0, cost100Usd: 0, cost100Inr: 0, cost1000Usd: 0, cost1000Inr: 0 }),
    row({ id: "c", feature: "palm-reading", label: "Palm Reading", operation: "Palm reading (image)", model: "anthropic/claude-3.5-sonnet", classification: "unknown", costBasis: null, reason: "No verified price for this model", costPerGenerationUsd: null, costPerGenerationInr: null, cost100Usd: null, cost100Inr: null, cost1000Usd: null, cost1000Inr: null, rate: null }),
    row({ id: "d", feature: "zodiac", label: "Zodiac Signs", operation: "Zodiac data", provider: null, model: null, classification: "free", costBasis: null, costPerGenerationUsd: 0, costPerGenerationInr: 0, cost100Usd: 0, cost100Inr: 0, cost1000Usd: 0, cost1000Inr: 0, rate: null }),
  ],
});

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><FeatureCostBreakdown from="2026-10-01" to="2026-10-30" /></MemoryRouter></QueryClientProvider>);
}
const calls = () => authRequest.mock.calls.map((c) => String(c[0]));

describe("AI feature cost breakdown", () => {
  beforeEach(() => { authRequest.mockReset(); authedFetch.mockReset(); authRequest.mockResolvedValue(report()); });

  it("groups operations by class, keeps unknown as a dash rather than $0, and states rate, formula and verification date", async () => {
    mount();
    expect(await screen.findByText("Paid (1)")).toBeInTheDocument();
    expect(screen.getByText("Free model (1)")).toBeInTheDocument();
    expect(screen.getByText("Unknown cost (1)")).toBeInTheDocument();
    expect(screen.getByText("Free (no AI) (1)")).toBeInTheDocument();
    const unknownRow = screen.getByText("Palm reading (image)").closest("tr")!;
    expect(unknownRow.textContent).toContain("—");
    expect(unknownRow.textContent).not.toContain("$0.00");
    expect(screen.getAllByText("Actual").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 USD = ₹95.07/)).toBeInTheDocument();
    expect(screen.getByText("Pricing last verified")).toBeInTheDocument();
    expect(screen.getAllByText(/2026-10-31/).length).toBeGreaterThan(1);
    expect(screen.getByText(/Cost = \(input tokens x input price/)).toBeInTheDocument();
    expect(screen.getByText("$0.001000")).toBeInTheDocument(); // per generation
    expect(screen.getByText("$1.00")).toBeInTheDocument(); // 1,000 generations
    expect(calls()).toContain("/admin/costs/features?from=2026-10-01&to=2026-10-30");
  });

  it("sends the chosen filters to the server", async () => {
    mount();
    await screen.findByText("Paid (1)");
    fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "openrouter" } });
    fireEvent.change(screen.getByLabelText("Model contains"), { target: { value: "gemma" } });
    await waitFor(() => expect(calls()).toContain("/admin/costs/features?from=2026-10-01&to=2026-10-30&provider=openrouter&model=gemma"));
  });

  it("exports the CSV with the same filters", async () => {
    authedFetch.mockResolvedValue({ ok: true, headers: new Headers({ "content-disposition": 'attachment; filename="x.csv"' }), blob: async () => new Blob(["a"]) });
    (URL as any).createObjectURL = vi.fn(() => "blob:x");
    (URL as any).revokeObjectURL = vi.fn();
    mount();
    await screen.findByText("Paid (1)");
    fireEvent.click(screen.getByRole("button", { name: "Export breakdown CSV" }));
    await waitFor(() => expect(authedFetch).toHaveBeenCalledWith("http://test/api/admin/costs/features/export?from=2026-10-01&to=2026-10-30"));
  });
});
