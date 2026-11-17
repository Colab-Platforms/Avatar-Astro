import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED. These tests check what the page asks for, what it shows, and where each figure leads.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));
// Charts need real layout; their data is checked through the summaries and the browser run.
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div data-testid="chart">{children}</div>;
  return { ResponsiveContainer: Box, BarChart: Box, LineChart: Box, AreaChart: Box, Bar: () => null, Line: () => null, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null };
});

import AdminOverviewPage from "../pages/Dashboard";

const person = (id: string, first: string) => ({ id, firstName: first, lastName: "Rao", email: `${first.toLowerCase()}@example.com` });
const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);

function dash(over: Record<string, unknown> = {}, totals: Record<string, unknown> = {}) {
  return {
    from: "2026-10-18", to: "2026-11-16", bucket: "day", trackingSince: "2026-10-30T04:00:00.000Z",
    totals: {
      customers: { total: 11, new: 4, activeInRange: 6, activeAccounts: 10 },
      revenue: { paise: 123400, currency: "INR" },
      transactions: { successful: 3, failed: 1, abandoned: 2 },
      readings: { generated: 62, byFeature: [{ feature: "tarot", label: "AI Tarot Reading", count: 40 }, { feature: "horoscope", label: "Horoscope", count: 22 }] },
      tools: { requests: 800, errors: 8, errorRate: 0.01, features: [{ key: "tarot", label: "AI Tarot Reading", requests: 500, errors: 5 }, { key: "palm-reading", label: "Palm Reading", requests: 300, errors: 3 }] },
      ...totals,
    },
    series: {
      registrations: days(5).map((t, i) => ({ t, total: i === 2 ? 4 : 0 })),
      revenue: days(5).map((t, i) => ({ t, paise: i === 1 ? 123400 : 0, count: i === 1 ? 3 : 0 })),
      transactions: days(5).map((t, i) => ({ t, success: i === 1 ? 3 : 0, failed: i === 3 ? 1 : 0 })),
      activity: days(5).map((t) => ({ t, activeCustomers: 2, events: 9 })),
    },
    recent: {
      registrations: [{ ...person("u9", "Gita"), createdAt: "2026-11-15T05:00:00.000Z" }],
      payments: [{ id: "p1", amountPaise: 4900, status: "SUCCESS", createdAt: "2026-11-15T05:00:00.000Z", completedAt: "2026-11-15T05:01:00.000Z", user: person("u3", "Meera") }],
      readings: [{ id: "r1", feature: "tarot", title: "Career tarot spread", createdAt: "2026-11-15T05:00:00.000Z", user: person("u4", "Ravi") }],
      audit: [{ id: "a1", actorEmail: "admin@example.com", action: "feature.toggle", summary: "Disabled feature tarot", createdAt: "2026-11-15T05:00:00.000Z" }],
    },
    alerts: { paymentFailures: 1, systemErrors: 8, failedReadingRuns: 2, openRefunds: 0 },
    ...over,
  };
}
const platform = { content: [{ type: "BANNER", status: "PUBLISHED", count: 3 }, { type: "FAQ", status: "DRAFT", count: 2 }], devotion: { channels: 2, liveNow: 1, temples: 4, pujas: 5, chadhawas: 6 }, commerce: { products: 7, categories: 2 }, notConfigured: [{ key: "orders", label: "Orders", reason: "x" }] };

let state: { isMain: boolean; dashboard: unknown; billing: unknown; escalations: unknown; platform: unknown };
const freshState = () => ({ isMain: true, dashboard: dash(), billing: { stuckAfterMinutes: 10, toolExecutions: [], reservations: [] }, escalations: { items: [], counts: { PENDING: 0 } }, platform });

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
function mount(path = "/admin") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="*" element={<><AdminOverviewPage /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const calls = () => authRequest.mock.calls.map((c) => String(c[0]));
const dashboardCalls = () => calls().filter((c) => c.startsWith("/admin/overview/dashboard"));

beforeEach(() => {
  state = freshState();
  authRequest.mockReset();
  authRequest.mockImplementation(async (url: string) => {
    if (url.startsWith("/admin/access")) return { mainAdmin: state.isMain, email: "a@b.c" };
    if (url.startsWith("/admin/dashboard")) return { user: { id: "a", firstName: "Asha", lastName: "Admin", email: "a@b.c" }, role: "SUPERADMIN" };
    if (url.startsWith("/admin/overview/dashboard")) { if (state.dashboard instanceof Error) throw state.dashboard; return state.dashboard; }
    if (url.startsWith("/admin/billing-failures")) { if (state.billing instanceof Error) throw state.billing; return state.billing; }
    if (url.startsWith("/admin/chat-escalations")) return state.escalations;
    if (url === "/admin/overview") { if (state.platform instanceof Error) throw state.platform; return state.platform; }
    throw new Error("unexpected request " + url);
  });
});

describe("Overview dashboard: summary cards", () => {
  it("shows the eight metrics from the API, formatted, each linking to the records behind it", async () => {
    mount();
    expect(await screen.findByRole("link", { name: /Total customers: 11/ })).toHaveAttribute("href", "/admin/customers");
    const link = (name: RegExp) => screen.getByRole("link", { name });
    expect(link(/New customers: 4/).getAttribute("href")).toMatch(/^\/admin\/customers\?registeredFrom=\d{4}-\d{2}-\d{2}&registeredTo=\d{4}-\d{2}-\d{2}$/);
    expect(link(/Active customers: 6/).getAttribute("href")).toMatch(/^\/admin\/activity\?from=.*&to=/);
    expect(link(/Total revenue: ₹1,234/).getAttribute("href")).toMatch(/^\/admin\/payments\?status=SUCCESS&from=/);
    expect(link(/Successful transactions: 3/).getAttribute("href")).toMatch(/status=SUCCESS/);
    expect(link(/Failed transactions: 1/).getAttribute("href")).toMatch(/status=FAILED/);
    expect(link(/Readings generated: 62/)).toHaveAttribute("href", "/admin/customer-library");
    expect(link(/Tool usage: 800/).getAttribute("href")).toMatch(/eventType=feature\.request/);
    expect(screen.getByText("75.0% success rate")).toBeInTheDocument(); // 3 of (3 + 1), computed from the two counts
    expect(screen.getByText("2 abandoned (never paid)")).toBeInTheDocument();
    expect(screen.getByText("Most: AI Tarot Reading (40)")).toBeInTheDocument();
    expect(screen.getByText("8 failed (1.0%)")).toBeInTheDocument();
  });

  it("asks for the last 30 days by default, as dates the backend accepts", async () => {
    mount();
    await screen.findByRole("link", { name: /Total customers/ });
    expect(dashboardCalls()).toHaveLength(1);
    const qs = new URLSearchParams(dashboardCalls()[0].split("?")[1]);
    expect(qs.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(qs.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const span = (Date.parse(qs.get("to")!) - Date.parse(qs.get("from")!)) / 86_400_000 + 1;
    expect(span).toBe(30);
  });

  it("shows zeros and 'no data' text, not invented numbers, when nothing has happened", async () => {
    state.dashboard = dash({ alerts: { paymentFailures: 0, systemErrors: 0, failedReadingRuns: 0, openRefunds: 0 } }, {
      customers: { total: 0, new: 0, activeInRange: 0, activeAccounts: 0 }, revenue: { paise: 0, currency: "INR" },
      transactions: { successful: 0, failed: 0, abandoned: 0 }, readings: { generated: 0, byFeature: [] }, tools: { requests: 0, errors: 0, errorRate: 0, features: [] },
    });
    state.dashboard = { ...(state.dashboard as object), series: { registrations: [], revenue: [], transactions: [], activity: days(3).map((t) => ({ t, activeCustomers: 0, events: 0 })) } };
    mount();
    expect(await screen.findByRole("link", { name: /Total revenue: ₹0\./ })).toBeInTheDocument();
    expect(screen.getByText("No payments in this period")).toBeInTheDocument();
    expect(screen.getByText("No new customers in this period.")).toBeInTheDocument();
    expect(screen.getByText("No successful payments in this period.")).toBeInTheDocument();
    expect(screen.getByText("No completed or failed payments in this period.")).toBeInTheDocument();
    expect(screen.getByText("No tool requests in this period.")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0); // no chart is drawn without data
    expect(screen.getByText("Nothing recorded yet")).toBeInTheDocument();
  });
});

describe("Overview dashboard: charts", () => {
  it("draws the five charts, each with a text summary of its real total", async () => {
    mount();
    await screen.findByRole("link", { name: /Total customers/ });
    expect(screen.getAllByRole("img")).toHaveLength(5); // one framed chart per card
    expect(screen.getByRole("img", { name: "New customers per day, 4 in total" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Revenue per day, ₹1,234 in total" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 successful and 1 failed transactions" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "800 tool requests, 8 failed" })).toBeInTheDocument();
  });

  it("is hourly for Today", async () => {
    state.dashboard = dash({ bucket: "hour", from: "2026-11-16", to: "2026-11-16" });
    mount("/admin?range=today");
    expect(await screen.findByRole("img", { name: "New customers per hour, 4 in total" })).toBeInTheDocument();
    cleanupAndRemount();
    function cleanupAndRemount() { /* the note below is checked on a longer range */ }
    state.dashboard = dash({ from: "2026-08-01" });
    mount("/admin?range=90d");
    expect((await screen.findAllByText(/Activity is recorded from 2026-10-30; earlier days show zero\./)).length).toBeGreaterThan(0);
  });
});

describe("Overview dashboard: date filter", () => {
  it("re-queries with the chosen preset's dates and keeps it in the address bar", async () => {
    mount();
    await screen.findByRole("link", { name: /Total customers/ });
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(dashboardCalls()).toHaveLength(2));
    const qs = new URLSearchParams(dashboardCalls()[1].split("?")[1]);
    expect((Date.parse(qs.get("to")!) - Date.parse(qs.get("from")!)) / 86_400_000 + 1).toBe(7);
    expect(screen.getByTestId("where")).toHaveTextContent("range=7d");
    expect(screen.getByRole("button", { name: "Last 7 days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Last 30 days" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(dashboardCalls()).toHaveLength(3));
    const today = new URLSearchParams(dashboardCalls()[2].split("?")[1]);
    expect(today.get("from")).toBe(today.get("to"));

    fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
    await waitFor(() => expect(dashboardCalls()).toHaveLength(4));
    const q90 = new URLSearchParams(dashboardCalls()[3].split("?")[1]);
    expect((Date.parse(q90.get("to")!) - Date.parse(q90.get("from")!)) / 86_400_000 + 1).toBe(90);
  });

  it("passes the range into the links, so a figure leads to the same period", async () => {
    mount("/admin?range=7d");
    const rev = await screen.findByRole("link", { name: /Total revenue/ });
    const qs = new URLSearchParams(dashboardCalls()[0].split("?")[1]);
    expect(rev.getAttribute("href")).toBe(`/admin/payments?status=SUCCESS&from=${qs.get("from")}&to=${qs.get("to")}`);
  });

  it("takes a custom range, and refuses a reversed or future one without calling the API", async () => {
    mount();
    await screen.findByRole("link", { name: /Total customers/ });
    fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
    const from = screen.getByLabelText("From date"), to = screen.getByLabelText("To date");

    fireEvent.change(from, { target: { value: "2026-11-10" } });
    fireEvent.change(to, { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/start date must not be after/);
    expect(dashboardCalls()).toHaveLength(1);

    fireEvent.change(from, { target: { value: "2026-11-01" } });
    fireEvent.change(to, { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/future/);
    expect(dashboardCalls()).toHaveLength(1);

    fireEvent.change(to, { target: { value: "2026-11-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(dashboardCalls()).toHaveLength(2));
    expect(dashboardCalls()[1]).toBe("/admin/overview/dashboard?from=2026-11-01&to=2026-11-05");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("where")).toHaveTextContent("range=custom&from=2026-11-01&to=2026-11-05");
  });

  it("restores a shared custom range from the address bar", async () => {
    mount("/admin?range=custom&from=2026-11-01&to=2026-11-05");
    await screen.findByRole("link", { name: /Total customers/ });
    expect(dashboardCalls()[0]).toBe("/admin/overview/dashboard?from=2026-11-01&to=2026-11-05");
    expect(screen.getByLabelText("From date")).toHaveValue("2026-11-01");
  });
});

describe("Overview dashboard: alerts", () => {
  it("lists only alerts with a real count, each leading to the right page", async () => {
    state.billing = { stuckAfterMinutes: 10, toolExecutions: [{ id: "t1", toolKey: "tarot.reading", userEmail: "x@example.com", createdAt: "2026-11-15T05:00:00.000Z" }], reservations: [{ id: "r1", purpose: "CHAT", createdAt: "2026-11-14T05:00:00.000Z" }] };
    state.escalations = { items: [], counts: { PENDING: 3 } };
    mount();
    const region = (await screen.findByText("Needs attention")).closest("section") as HTMLElement;
    const names = within(region).getAllByRole("listitem").map((li) => li.textContent);
    expect(names.join("|")).toMatch(/1Payment failures/);
    expect(names.join("|")).toMatch(/8System errors \(5xx\)/);
    expect(names.join("|")).toMatch(/2Failed reading generations/);
    expect(names.join("|")).toMatch(/2Stuck billing holds/);
    expect(names.join("|")).toMatch(/3Chat escalations waiting/);
    expect(within(region).queryByText(/Refunds \/ disputes/)).toBeNull(); // count is 0, so not listed
    expect(within(region).getByRole("link", { name: /Stuck billing holds/ })).toHaveAttribute("href", "/admin/billing-failures");
    expect(within(region).getByRole("link", { name: /Chat escalations waiting/ })).toHaveAttribute("href", "/admin/chat-escalations");
    expect(within(region).getByRole("link", { name: /System errors/ }).getAttribute("href")).toMatch(/^\/admin\/activity\?eventType=feature\.request&status=error&from=/);
    expect(within(region).getByRole("link", { name: /Payment failures/ }).getAttribute("href")).toMatch(/^\/admin\/payments\?status=FAILED&from=/);
  });

  it("says all is well when every count is zero", async () => {
    state.dashboard = dash({ alerts: { paymentFailures: 0, systemErrors: 0, failedReadingRuns: 0, openRefunds: 0 } });
    mount();
    expect(await screen.findByText(/No payment failures, system errors, stuck billing holds or waiting escalations/)).toBeInTheDocument();
  });
});

describe("Overview dashboard: recent activity and shortcuts", () => {
  it("has a View all link for every recent section, to the existing page", async () => {
    state.billing = { stuckAfterMinutes: 10, toolExecutions: [{ id: "t1", toolKey: "tarot.reading", userEmail: "x@example.com", createdAt: "2026-11-15T05:00:00.000Z" }], reservations: [] };
    mount();
    await screen.findByText("Recent customer registrations");
    const viewAll = (title: string) => (screen.getByText(title).closest("section") as HTMLElement).querySelector('a[href]:not([href^="/admin/customers/"])') as HTMLAnchorElement;
    expect(viewAll("Recent customer registrations")).toHaveAttribute("href", "/admin/customers");
    expect(viewAll("Recent payments")).toHaveAttribute("href", "/admin/payments");
    expect(viewAll("Recent readings")).toHaveAttribute("href", "/admin/customer-library");
    expect(viewAll("Recent admin activity")).toHaveAttribute("href", "/admin/settings?scope=admin");
    expect(viewAll("Recent billing failures")).toHaveAttribute("href", "/admin/billing-failures");
    for (const t of ["Recent customer registrations", "Recent payments", "Recent readings", "Recent admin activity", "Recent billing failures"]) {
      expect(within(screen.getByText(t).closest("section") as HTMLElement).getByRole("link", { name: /View all/ })).toBeInTheDocument();
    }
  });

  it("shows the recent rows with real values", async () => {
    mount();
    expect(await screen.findByRole("link", { name: /Gita Rao/ })).toHaveAttribute("href", "/admin/customers/u9");
    expect(screen.getByText("₹49")).toBeInTheDocument();
    expect(screen.getByText("Career tarot spread")).toBeInTheDocument();
    expect(screen.getByText("Disabled feature tarot")).toBeInTheDocument();
  });

  it("has the six quick actions", async () => {
    mount();
    await screen.findByRole("link", { name: /Total customers/ });
    const nav = screen.getByRole("navigation", { name: "Quick actions" });
    const hrefs = within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["View Customers", "/admin/customers"], ["View Reports", "/admin/reports"], ["Astrology Tools", "/admin/tools"],
      ["Tool Pricing", "/admin/tool-pricing"], ["Billing Failures", "/admin/billing-failures"], ["Admin Management", "/admin/admins"],
    ]);
  });
});

describe("Overview dashboard: failure and access states", () => {
  it("shows an error with a retry when the dashboard cannot load, and recovers", async () => {
    state.dashboard = new Error("Server exploded");
    mount();
    expect(await screen.findByText(/Server exploded/, undefined, { timeout: 4000 })).toBeInTheDocument(); // the page retries once before giving up
    state.dashboard = dash();
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(await screen.findByRole("link", { name: /Total customers/ })).toBeInTheDocument();
  });

  it("keeps the page working when only billing failures cannot load", async () => {
    state.billing = new Error("billing down");
    mount();
    expect(await screen.findByText("Could not load billing failures.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Total customers/ })).toBeInTheDocument();
  });

  it("shows a note instead of figures if the platform summary cannot load", async () => {
    state.platform = new Error("nope");
    mount();
    expect(await screen.findByText("Could not load the platform summary.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Total revenue/ })).toBeInTheDocument();
  });

  it("asks for nothing and shows no figures to anyone who is not the main admin", async () => {
    state.isMain = false;
    mount();
    await waitFor(() => expect(calls().some((c) => c.startsWith("/admin/access"))).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(dashboardCalls()).toHaveLength(0);
    expect(calls().filter((c) => c.startsWith("/admin/billing-failures") || c.startsWith("/admin/chat-escalations") || c === "/admin/overview")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Total customers/ })).toBeNull();
  });

  it("greets the signed-in admin and states the period and time zone", async () => {
    mount("/admin?range=7d");
    expect(await screen.findByText(/Welcome, Asha Admin/)).toBeInTheDocument();
    const subtitle = screen.getByText(/Showing/);
    expect(subtitle).toHaveTextContent(/Last 7 days/);
    expect(subtitle).toHaveTextContent(/UTC/);
  });
});
