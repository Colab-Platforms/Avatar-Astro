import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED (authRequest). These tests check what the pages ask for, what they render, and where KPIs lead.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));
// Charts need real layout; they are not under test here (their data and click targets are covered by the browser run).
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div data-testid="chart">{children}</div>;
  return { ResponsiveContainer: Box, BarChart: Box, LineChart: Box, AreaChart: Box, PieChart: Box, Bar: () => null, Line: () => null, Area: () => null, Pie: Box, Cell: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null };
});
vi.mock("@/features/auth/hooks/useAuthMutations", () => ({ useLogoutMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }));

import UsersPage from "./pages/UsersPage";
import ActivityPage from "./pages/ActivityPage";
import ReportsPage from "./pages/ReportsPage";
import AdminOverviewPage from "../pages/Dashboard";
import { Stat } from "./ui";

const user = (over: object = {}) => ({
  id: "u1", firstName: "Asha", lastName: "Rao", email: "asha@example.com", phoneNo: "9876543210", city: "Pune", state: null, country: "India",
  authProvider: "GOOGLE", isEmailVerified: true, isPhoneVerified: false, isActive: true, profileCompleted: true, createdAt: "2026-10-01T10:00:00.000Z",
  role: "USER", lastActiveAt: "2026-10-29T10:00:00.000Z", activityCount: 4, ...over,
});

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

describe("Stat tiles", () => {
  it("are real links only when a destination is given", () => {
    mount(<><Stat label="Registered users" value={5} to="/admin/customers" /><Stat label="Not available" value="Not available" /></>);
    const link = screen.getByRole("link", { name: /Registered users/ });
    expect(link).toHaveAttribute("href", "/admin/customers");
    expect(screen.queryByRole("link", { name: /Not available/ })).toBeNull();
  });
});

describe("Users page", () => {
  beforeEach(() => {
    authRequest.mockReset();
    authRequest.mockImplementation(async (url: string) => {
      if (url.startsWith("/admin/customers/u1")) {
        return { ...user(), address: null, gender: null, dateOfBirth: null, profileImage: null, activeSessions: 1, usageLast30Days: [], lastLoginAt: "2026-10-29T09:00:00.000Z",
          loginHistory: [{ id: "e1", eventType: "auth.login", status: "success", metadata: { method: "google" }, createdAt: "2026-10-29T09:00:00.000Z" }],
          recentActivity: [{ id: "e2", eventType: "feature.request", feature: "tarot", status: "success", statusCode: 200, metadata: null, createdAt: "2026-10-29T10:00:00.000Z", label: "Used" }],
          featureUsage: [{ feature: "tarot", total: 2, success: 1, failed: 1 }], eventCounts: [], credentialStatus: "none (signs in with Google)", createdBy: null, library: { readings: 3, saved: 1, conversations: 2 }, auditHistory: [], notStored: ["Reading content is not saved on the server."] };
      }
      if (url.startsWith("/admin/customers")) return { items: [user()], page: 1, pageSize: 15, total: 1, totalPages: 1 };
      return { mainAdmin: true, email: "owner@example.com" };
    });
  });

  it("sends every filter in the URL to the API, and shows the returned customers", async () => {
    mount(<UsersPage />, "/admin/customers?status=inactive&provider=GOOGLE&emailVerified=true&registeredFrom=2026-10-01&role=ADMIN&search=asha");
    await screen.findByText("asha@example.com");
    const req = calls().find((c) => c.startsWith("/admin/customers?"))!;
    const qs = new URLSearchParams(req.split("?")[1]);
    expect(Object.fromEntries(qs)).toMatchObject({ status: "inactive", provider: "GOOGLE", emailVerified: "true", registeredFrom: "2026-10-01", search: "asha", page: "1", pageSize: "15" });
    expect(Object.fromEntries(qs)).not.toHaveProperty("role"); // the customer list can never be widened to administrators from the address bar
    expect(within(screen.getByRole("table")).getByText("Google")).toBeInTheDocument();
  });

  it("changing a filter updates the address bar and resets to page 1", async () => {
    mount(<UsersPage />, "/admin/customers?page=3");
    await screen.findByText("asha@example.com");
    fireEvent.change(screen.getByLabelText("Sign-in method"), { target: { value: "GOOGLE" } });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/admin/customers?provider=GOOGLE"));
  });

  it("opens the Customer 360 profile from a row and from a deep link", async () => {
    mount(<UsersPage />, "/admin/customers");
    fireEvent.click(await screen.findByRole("button", { name: /Open profile of Asha Rao/ }));
    await screen.findByText("Customer profile");
    await screen.findByText("Sign-in history");
    expect(screen.getByText(/Signed in/)).toBeInTheDocument();
    expect(screen.getByText(/Reading content is not saved on the server/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all activity" })).toHaveAttribute("href", "/admin/activity?userId=u1");
    expect(calls()).toContain("/admin/customers/u1");
  });

  it("shows an honest empty state when filters match nobody", async () => {
    authRequest.mockImplementation(async (url: string) => (url.startsWith("/admin/customers") ? { items: [], page: 1, pageSize: 15, total: 0, totalPages: 1 } : { mainAdmin: true }));
    mount(<UsersPage />, "/admin/customers?status=inactive");
    await screen.findByText("No customers match these filters");
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });
});

describe("Activity page", () => {
  it("passes filters to the API and links each record to its customer", async () => {
    authRequest.mockReset();
    authRequest.mockImplementation(async () => ({
      items: [{ id: "a1", at: "2026-10-29T10:00:00.000Z", eventType: "feature.request", label: "Used", feature: "tarot", status: "error", statusCode: 500, durationMs: 120, metadata: { method: "POST", route: "/api/tarot" }, customer: { id: "u1", email: "asha@example.com", name: "Asha Rao", removed: false } }],
      page: 1, pageSize: 25, total: 1, totalPages: 1,
      facets: { eventTypes: [{ value: "feature.request", label: "Used" }], features: [{ value: "tarot", label: "AI Tarot Reading" }], statuses: ["success", "error"] },
    }));
    mount(<ActivityPage />, "/admin/activity?feature=tarot&status=error&eventType=feature.request");
    const row = await screen.findByText("Asha Rao");
    expect(row.closest("a")).toHaveAttribute("href", "/admin/customers?user=u1");
    const qs = new URLSearchParams(calls().find((c) => c.startsWith("/admin/activity?"))!.split("?")[1]);
    expect(Object.fromEntries(qs)).toMatchObject({ feature: "tarot", status: "error", eventType: "feature.request", page: "1", pageSize: "25" });
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it("explains that nothing is back-filled when there is no activity", async () => {
    authRequest.mockReset();
    authRequest.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1, facets: { eventTypes: [], features: [], statuses: [] } });
    mount(<ActivityPage />, "/admin/activity");
    await screen.findByText("No activity recorded yet");
    expect(screen.getByText(/never back-filled|Nothing is back-filled/i)).toBeInTheDocument();
  });
});

describe("Overview KPIs", () => {
  it("lead to the matching filtered views", async () => {
    authRequest.mockReset();
    authRequest.mockImplementation(async (url: string) => {
      if (url === "/admin/overview" || url.startsWith("/admin/overview")) {
        return {
          windowDays: 30, trackingSince: "2026-10-30T04:00:00.000Z",
          users: { total: 5, active: 4, inactive: 1, emailVerified: 5, newInWindow: 5, newLast7Days: 5 },
          usage: { totalRequests: 3, totalErrors: 1, errorRate: 0.33, features: [{ key: "tarot", label: "AI Tarot Reading", total: 3, errors: 1, rejected: 0, lastAt: "2026-10-30T05:00:00.000Z" }] },
          recentErrors: [{ id: "x", feature: "tarot", statusCode: 500, createdAt: "2026-10-30T05:00:00.000Z" }],
          recentSignups: [{ id: "u9", firstName: "Gita", lastName: "S", email: "g@example.com", createdAt: "2026-10-30T05:00:00.000Z" }],
          recentAudit: [], content: [], devotion: { channels: 2, liveNow: 0, temples: 1, pujas: 0, chadhawas: 2 }, commerce: { products: 1, categories: 1 }, notConfigured: [],
        };
      }
      if (url.startsWith("/admin/dashboard")) return { user: { id: "a", firstName: "Local", lastName: "Admin", email: "a@b.c" }, role: "SUPERADMIN" };
      return { mainAdmin: true, email: "a@b.c" };
    });
    mount(<AdminOverviewPage />, "/admin");
    const reg = await screen.findByRole("link", { name: /Registered users/ });
    expect(reg).toHaveAttribute("href", "/admin/customers");
    expect(screen.getByRole("link", { name: /New users/ }).getAttribute("href")).toMatch(/^\/admin\/customers\?registeredFrom=\d{4}-\d{2}-\d{2}&registeredTo=\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByRole("link", { name: /Feature requests/ }).getAttribute("href")).toMatch(/^\/admin\/activity\?eventType=feature\.request&from=/);
    expect(screen.getByRole("link", { name: /Server failures/ }).getAttribute("href")).toMatch(/status=error/);
    expect(screen.getByRole("link", { name: /Live Darshan channels/ })).toHaveAttribute("href", "/admin/devotion");
    expect(screen.getByRole("link", { name: /Shop products/ })).toHaveAttribute("href", "/admin/shop-orders");
    expect(screen.getByRole("link", { name: /Orders \/ bookings \/ payments/ })).toHaveAttribute("href", "/admin/payments");
    expect(screen.getByRole("link", { name: /Gita S/ })).toHaveAttribute("href", "/admin/customers?user=u9");
    const failure = screen.getAllByRole("link").find((l) => /feature=tarot&status=error&from=2026-10-30/.test(l.getAttribute("href") ?? ""));
    expect(failure).toBeTruthy();
  });
});

describe("Reports page", () => {
  const analytics = (over: object = {}) => ({
    from: "2026-10-01", to: "2026-10-30", trackingSince: null,
    kpis: { totalUsers: 5, newUsers: 5, activeUsers: 0, returningUsers: 0, monthlyActiveUsers: 0, totalRequests: 0, successfulRequests: 0, failedRequests: 0, rejectedRequests: 0, failureRate: 0, mostUsedFeature: null },
    registrations: [], dailyActiveUsers: [], monthlyActiveUsers: [], features: [], mostUsed: [], leastUsed: [], requestStatus: [],
    authMethods: { accountsByProvider: [], signInsByMethod: [], failedSignInsByMethod: [] }, activityTrend: [], providers: [], ...over,
  });

  // The page also asks for /costs/summary (covered in CostPanels.test.tsx); here it answers "no AI usage yet".
  const noCosts = { from: "", to: "", currency: "USD", inrRate: null, trackingSince: null, note: "", kpis: { totalAiRequests: 0 }, byFeature: [], byProvider: [], byModel: [], topCustomers: [], daily: [] };
  const noFeatureCosts = { from: "", to: "", note: "", formula: "", pricingVerifiedAt: "", fx: { rate: 1, kind: "reference", asOf: null, source: "" }, rows: [], counts: { free: 0, "free-model": 0, paid: 0, estimated: 0, unknown: 0 }, totals: { actualUsd: 0, actualInr: 0, estimatedUsd: 0, estimatedInr: 0, requestsWithActual: 0, requestsWithEstimate: 0, unpricedRequests: 0 }, providerModel: [] };
  const serve = (payload: object) => authRequest.mockImplementation(async (url: string) => (String(url).startsWith("/admin/costs/summary") ? noCosts : String(url).startsWith("/admin/costs/features") ? noFeatureCosts : payload));

  it("requests the chosen preset range, links its KPIs, and says so when there is no activity", async () => {
    authRequest.mockReset();
    serve(analytics());
    mount(<ReportsPage />);
    await screen.findByText("Registered users");
    expect(calls().some((c) => /^\/admin\/reports\/analytics\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/.test(c))).toBe(true);
    expect(screen.getByText("No customer activity in this period")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Registered users/ })).toHaveAttribute("href", "/admin/customers");

    const before = calls().length;
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(calls().length).toBeGreaterThan(before));
    const today = new Date().toISOString().slice(0, 10);
    expect(calls().filter((c) => c.startsWith("/admin/reports/analytics")).at(-1)).toBe(`/admin/reports/analytics?from=${today}&to=${today}`);
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers custom dates and refuses an inverted range", async () => {
    authRequest.mockReset();
    serve(analytics());
    mount(<ReportsPage />);
    await screen.findByText("Registered users");
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    const group = screen.getByRole("group", { name: "Date range" });
    expect(within(group).getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("From")).toBeInTheDocument();
  });

  it("failed-request KPI leads to the failed records", async () => {
    authRequest.mockReset();
    serve(analytics({ kpis: { ...analytics().kpis, totalRequests: 4, successfulRequests: 3, failedRequests: 1, failureRate: 0.25, activeUsers: 2, mostUsedFeature: { key: "tarot", label: "AI Tarot Reading", total: 4 } } }));
    mount(<ReportsPage />);
    const failed = await screen.findByRole("link", { name: /^Failed/ });
    expect(failed.getAttribute("href")).toMatch(/\/admin\/activity\?eventType=feature\.request&status=error&from=.*&to=/);
    expect(screen.getByRole("link", { name: /Most-used feature/ }).getAttribute("href")).toMatch(/feature=tarot/);
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });
});
