import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));

import PaymentsPage from "./pages/PaymentsPage";

const order = (over: object = {}) => ({
  id: "o1", amountPaise: 4900, provider: "RAZORPAY", status: "SUCCESS", providerPaymentId: "…ab12cd", createdAt: "2026-11-15T05:00:00.000Z", completedAt: "2026-11-15T05:01:00.000Z",
  user: { id: "u1", firstName: "Meera", lastName: "Rao", email: "meera@example.com" }, ...over,
});
const data = (items: unknown[], over: object = {}) => ({
  items, page: 1, pageSize: 25, total: items.length, totalPages: 1,
  summary: { razorpayRevenuePaise: 123400, razorpayByStatus: { SUCCESS: 3, FAILED: 1, EXPIRED: 11 } }, ...over,
});

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
function mount(path = "/admin/payments") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<><PaymentsPage /><Where /></>} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
}
const calls = () => authRequest.mock.calls.map((c) => String(c[0]));

describe("Payments page", () => {
  beforeEach(() => { authRequest.mockReset(); authRequest.mockResolvedValue(data([order(), order({ id: "o2", status: "FAILED", completedAt: null, amountPaise: 9900 }), order({ id: "o3", provider: "MOCK", amountPaise: 2000 })])); });

  it("lists real orders with rupee amounts, status and totals, and flags test orders", async () => {
    mount();
    expect(await screen.findByText("₹1,234")).toBeInTheDocument(); // all-time revenue from the API summary
    expect(screen.getByText("₹49")).toBeInTheDocument();
    expect(screen.getByText("₹99")).toBeInTheDocument();
    expect(screen.getByText("(test order)")).toBeInTheDocument();
    expect(screen.getAllByText("Successful").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("meera@example.com").length).toBe(3);
  });

  it("sends the status and date filters it was linked with (as the Overview links do)", async () => {
    mount("/admin/payments?status=FAILED&from=2026-11-10&to=2026-11-16");
    await screen.findByText("₹1,234");
    const qs = new URLSearchParams(calls()[0].split("?")[1]);
    expect(Object.fromEntries(qs)).toMatchObject({ status: "FAILED", from: "2026-11-10", to: "2026-11-16", page: "1", pageSize: "25" });
  });

  it("changing the status refilters, resets to page 1 and shows in the address bar", async () => {
    mount("/admin/payments?page=3");
    await screen.findByText("₹1,234");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "SUCCESS" } });
    await waitFor(() => expect(calls().some((c) => c.includes("status=SUCCESS") && c.includes("page=1"))).toBe(true));
    expect(screen.getByTestId("where")).toHaveTextContent("status=SUCCESS");
    expect(screen.getByTestId("where")).not.toHaveTextContent("page=3");
  });

  it("explains an empty result honestly", async () => {
    authRequest.mockResolvedValue(data([], { total: 0, summary: { razorpayRevenuePaise: 0, razorpayByStatus: {} } }));
    mount("/admin/payments?status=SUCCESS");
    expect(await screen.findByText("No payments match")).toBeInTheDocument();
    expect(screen.getByText("Try a different status or date range.")).toBeInTheDocument();
  });

  it("shows an error with a retry when the list cannot load", async () => {
    authRequest.mockRejectedValue(new Error("Payments unavailable"));
    mount();
    expect(await screen.findByText(/Payments unavailable/, undefined, { timeout: 4000 })).toBeInTheDocument();
  });
});
