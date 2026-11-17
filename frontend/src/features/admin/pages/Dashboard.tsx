import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Coins, IndianRupee, ShieldCheck, Sparkles, UserPlus, Users, XCircle, BookOpen, Wrench } from "lucide-react";
import { usePanel, useMainAdmin } from "../panel/api";
import { QueryView } from "../panel/QueryView";
import { Badge, Empty, fmtDate, personName } from "../panel/ui";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { DateRangeFilter } from "../overview/DateRangeFilter";
import { rangeFromParams, type RangePreset } from "../overview/dateRange";
import { fmtCount, fmtPercent, fmtRupees } from "../overview/format";
import { ActivityLines, RevenueBars, ToolBars, TransactionBars, TrendArea } from "../overview/TrendCharts";
import { AlertList, Kpi, Panel, PanelEmpty, QuickActions, RecentRow, type AlertItem } from "../overview/OverviewParts";

type Person = { id: string; firstName: string | null; lastName: string | null; email: string };
interface Dashboard {
  from: string; to: string; bucket: "hour" | "day"; trackingSince: string | null;
  totals: {
    customers: { total: number; new: number; activeInRange: number; activeAccounts: number };
    revenue: { paise: number; currency: "INR" };
    transactions: { successful: number; failed: number; abandoned: number };
    readings: { generated: number; byFeature: { feature: string; label: string; count: number }[] };
    tools: { requests: number; errors: number; errorRate: number; features: { key: string; label: string; requests: number; errors: number }[] };
  };
  series: {
    registrations: { t: string; total: number }[];
    revenue: { t: string; paise: number; count: number }[];
    transactions: { t: string; success: number; failed: number }[];
    activity: { t: string; activeCustomers: number; events: number }[];
  };
  recent: {
    registrations: (Person & { createdAt: string })[];
    payments: { id: string; amountPaise: number; status: "CREATED" | "SUCCESS" | "FAILED" | "EXPIRED"; createdAt: string; completedAt: string | null; user: Person }[];
    readings: { id: string; feature: string; title: string; createdAt: string; user: Person }[];
    audit: { id: string; actorEmail: string; action: string; summary: string; createdAt: string }[];
  };
  alerts: { paymentFailures: number; systemErrors: number; failedReadingRuns: number; openRefunds: number };
}
interface Billing { toolExecutions?: { id: string; toolKey: string; userEmail: string; createdAt: string }[]; reservations?: { id: string; purpose: string; createdAt: string }[] }
interface Platform {
  content: { type: string; status: "DRAFT" | "PUBLISHED"; count: number }[];
  devotion: { channels: number; liveNow: number; temples: number; pujas: number; chadhawas: number };
  commerce: { products: number; categories: number };
  notConfigured: { key: string; label: string; reason: string }[];
}

const PAY_TONE = { SUCCESS: "good", FAILED: "bad", EXPIRED: "neutral", CREATED: "warn" } as const;
const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((s, r) => s + pick(r), 0);

export default function AdminOverviewPage() {
  const { isMain } = useMainAdmin();
  const { data: me } = useAdminDashboard();
  const [params, setParams] = useSearchParams();
  const range = useMemo(() => rangeFromParams(params), [params]);
  const name = [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ") || me?.user.email || "Admin";

  const q = usePanel<Dashboard>(`/overview/dashboard?from=${range.from}&to=${range.to}`, { enabled: isMain, placeholderData: (p) => p });
  // These three are independent of the date range, and each fails on its own without taking the page down.
  const billing = usePanel<Billing>("/billing-failures", { enabled: isMain, retry: false, refetchInterval: 60_000 });
  const escalations = usePanel<{ counts?: { PENDING?: number } }>("/chat-escalations?status=PENDING", { enabled: isMain, retry: false, refetchInterval: 60_000 });
  const platform = usePanel<Platform>("/overview", { enabled: isMain, retry: false });

  const onRange = (preset: RangePreset, custom?: { from: string; to: string }) => {
    const next = new URLSearchParams(params);
    next.set("range", preset);
    if (preset === "custom" && custom) { next.set("from", custom.from); next.set("to", custom.to); } else { next.delete("from"); next.delete("to"); }
    setParams(next, { replace: true });
  };

  const qs = `from=${range.from}&to=${range.to}`;
  const stuck = (billing.data?.toolExecutions?.length ?? 0) + (billing.data?.reservations?.length ?? 0);
  const pending = escalations.data?.counts?.PENDING ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[#33251D] sm:text-2xl">Welcome, {name}</h2>
          <p className="mt-0.5 text-[13px] text-[#6B6259]">
            {isMain ? <>Showing <strong className="font-semibold text-[#33251D]">{range.label}</strong>{range.days > 1 || range.preset !== "today" ? ` (${range.from} to ${range.to}, UTC)` : ` (${range.from}, UTC)`}.{q.isFetching && !q.isLoading ? " Updating…" : ""}</> : "Overview"}
          </p>
        </div>
        {isMain && <DateRangeFilter range={range} onChange={onRange} />}
      </div>

      {isMain && (
        <QueryView q={q}>
          {(d) => {
            const t = d.totals;
            const txTotal = t.transactions.successful + t.transactions.failed;
            const topReading = t.readings.byFeature[0];
            const trackedLate = d.trackingSince && d.from < d.trackingSince.slice(0, 10);

            const alerts: AlertItem[] = [
              { key: "pay", label: "Payment failures", count: d.alerts.paymentFailures, tone: "bad" as const, to: `/admin/payments?status=FAILED&${qs}`, when: "in this period" },
              { key: "err", label: "System errors (5xx)", count: d.alerts.systemErrors, tone: "bad" as const, to: `/admin/activity?eventType=feature.request&status=error&${qs}`, when: "in this period" },
              { key: "read", label: "Failed reading generations", count: d.alerts.failedReadingRuns, tone: "warn" as const, to: `/admin/activity?status=error&${qs}`, when: "in this period · coins released" },
              { key: "hold", label: "Stuck billing holds", count: stuck, tone: "warn" as const, to: "/admin/billing-failures", when: "open now" },
              { key: "esc", label: "Chat escalations waiting", count: pending, tone: "warn" as const, to: "/admin/chat-escalations", when: "open now" },
              { key: "ref", label: "Refunds / disputes to review", count: d.alerts.openRefunds, tone: "warn" as const, when: "open now" },
            ].filter((a) => a.count > 0);

            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Kpi icon={Users} label="Total customers" value={fmtCount(t.customers.total)} hint={`${fmtCount(t.customers.activeAccounts)} active accounts`} to="/admin/customers" />
                  <Kpi icon={UserPlus} label="New customers" value={fmtCount(t.customers.new)} hint={range.label} to={`/admin/customers?registeredFrom=${range.from}&registeredTo=${range.to}`} />
                  <Kpi icon={Activity} label="Active customers" value={fmtCount(t.customers.activeInRange)} hint="Signed in or used a feature" to={`/admin/activity?${qs}`} />
                  <Kpi icon={IndianRupee} label="Total revenue" value={fmtRupees(t.revenue.paise)} hint="Razorpay top-ups, gross" to={`/admin/payments?status=SUCCESS&${qs}`} />
                  <Kpi icon={CheckCircle2} label="Successful transactions" value={fmtCount(t.transactions.successful)} hint={txTotal ? `${fmtPercent(t.transactions.successful, txTotal)} success rate` : "No payments in this period"} to={`/admin/payments?status=SUCCESS&${qs}`} />
                  <Kpi icon={XCircle} label="Failed transactions" value={fmtCount(t.transactions.failed)} hint={`${fmtCount(t.transactions.abandoned)} abandoned (never paid)`} tone={t.transactions.failed ? "bad" : "default"} to={`/admin/payments?status=FAILED&${qs}`} />
                  <Kpi icon={BookOpen} label="Readings generated" value={fmtCount(t.readings.generated)} hint={topReading ? `Most: ${topReading.label} (${fmtCount(topReading.count)})` : "None in this period"} to="/admin/customer-library" />
                  <Kpi icon={Wrench} label="Tool usage" value={fmtCount(t.tools.requests)} hint={t.tools.requests ? `${fmtCount(t.tools.errors)} failed (${fmtPercent(t.tools.errors, t.tools.requests)})` : "No requests in this period"} tone={t.tools.errors ? "bad" : "default"} to={`/admin/activity?eventType=feature.request&${qs}`} />
                </div>

                <Panel title="Needs attention" note="Only items with something to act on are listed.">
                  {alerts.length ? <AlertList items={alerts} /> : <PanelEmpty><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[#2F7D5B]" aria-hidden="true" />No payment failures, system errors, stuck billing holds or waiting escalations right now.</PanelEmpty>}
                </Panel>

                <QuickActions items={[
                  { to: "/admin/customers", label: "View Customers", icon: Users },
                  { to: "/admin/reports", label: "View Reports", icon: BarChart3 },
                  { to: "/admin/tools", label: "Astrology Tools", icon: Sparkles },
                  { to: "/admin/tool-pricing", label: "Tool Pricing", icon: Coins },
                  { to: "/admin/billing-failures", label: "Billing Failures", icon: AlertTriangle },
                  { to: "/admin/admins", label: "Admin Management", icon: ShieldCheck },
                ]} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Customer registrations" note={`New customers per ${d.bucket} · ${fmtCount(t.customers.new)} in total`}>
                    {t.customers.new ? <TrendArea data={d.series.registrations} dataKey="total" name="New customers" bucket={d.bucket} summary={`New customers per ${d.bucket}, ${t.customers.new} in total`} /> : <PanelEmpty>No new customers in this period.</PanelEmpty>}
                  </Panel>
                  <Panel title="Revenue" note={`Successful Razorpay top-ups per ${d.bucket} · ${fmtRupees(t.revenue.paise)} in total`}>
                    {t.revenue.paise ? <RevenueBars data={d.series.revenue} bucket={d.bucket} summary={`Revenue per ${d.bucket}, ${fmtRupees(t.revenue.paise)} in total`} /> : <PanelEmpty>No successful payments in this period.</PanelEmpty>}
                  </Panel>
                  <Panel title="Transactions: success vs failure" note="Payment orders that completed or failed">
                    {txTotal ? <TransactionBars data={d.series.transactions} bucket={d.bucket} summary={`${t.transactions.successful} successful and ${t.transactions.failed} failed transactions`} /> : <PanelEmpty>No completed or failed payments in this period.</PanelEmpty>}
                  </Panel>
                  <Panel title="Customer activity" note={trackedLate ? `Activity is recorded from ${new Date(d.trackingSince!).toISOString().slice(0, 10)}; earlier days show zero.` : "Active customers and recorded actions"}>
                    {sum(d.series.activity, (r) => r.events) ? <ActivityLines data={d.series.activity} bucket={d.bucket} summary={`Active customers and recorded actions per ${d.bucket}`} /> : <PanelEmpty>No customer activity was recorded in this period.</PanelEmpty>}
                  </Panel>
                  <Panel className="lg:col-span-2" title="Astrology tool usage" note="Requests per tool in this period (failed = server errors)" to={`/admin/tools`} linkLabel="Manage tools">
                    {t.tools.requests ? <ToolBars data={t.tools.features.slice(0, 10)} summary={`${t.tools.requests} tool requests, ${t.tools.errors} failed`} /> : <PanelEmpty>No tool requests in this period.</PanelEmpty>}
                  </Panel>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Panel title="Recent customer registrations" to="/admin/customers">
                    {d.recent.registrations.length === 0 ? <PanelEmpty>No customers yet.</PanelEmpty> : (
                      <ul className="divide-y divide-[#F0EBE3]">{d.recent.registrations.map((u) => <RecentRow key={u.id} to={`/admin/customers/${u.id}`} primary={personName(u)} secondary={u.email} trailing={fmtDate(u.createdAt)} />)}</ul>
                    )}
                  </Panel>
                  <Panel title="Recent payments" to="/admin/payments">
                    {d.recent.payments.length === 0 ? <PanelEmpty>No payments yet.</PanelEmpty> : (
                      <ul className="divide-y divide-[#F0EBE3]">{d.recent.payments.map((p) => <RecentRow key={p.id} primary={<>{fmtRupees(p.amountPaise)} <Badge tone={PAY_TONE[p.status]}>{p.status.toLowerCase()}</Badge></>} secondary={personName(p.user)} trailing={fmtDate(p.completedAt ?? p.createdAt)} />)}</ul>
                    )}
                  </Panel>
                  <Panel title="Recent readings" to="/admin/customer-library">
                    {d.recent.readings.length === 0 ? <PanelEmpty>No readings yet.</PanelEmpty> : (
                      <ul className="divide-y divide-[#F0EBE3]">{d.recent.readings.map((r) => <RecentRow key={r.id} to={`/admin/customers/${r.user.id}`} primary={r.title} secondary={personName(r.user)} trailing={fmtDate(r.createdAt)} />)}</ul>
                    )}
                  </Panel>
                  <Panel title="Recent admin activity" to="/admin/settings?scope=admin">
                    {d.recent.audit.length === 0 ? <PanelEmpty>No admin actions recorded yet.</PanelEmpty> : (
                      <ul className="divide-y divide-[#F0EBE3]">{d.recent.audit.map((a) => <RecentRow key={a.id} primary={a.summary} secondary={<>{a.action} · {a.actorEmail}</>} trailing={fmtDate(a.createdAt)} />)}</ul>
                    )}
                  </Panel>
                  <Panel title="Recent billing failures" note="Holds that never settled or released" to="/admin/billing-failures" className="xl:col-span-2">
                    {billing.isLoading ? <PanelEmpty>Loading…</PanelEmpty> : billing.error ? <PanelEmpty tone="error">Could not load billing failures.</PanelEmpty> : stuck === 0 ? <PanelEmpty>No stuck billing holds.</PanelEmpty> : (
                      <ul className="divide-y divide-[#F0EBE3]">
                        {[
                          ...(billing.data?.toolExecutions ?? []).map((e) => ({ id: e.id, primary: `AI tool: ${e.toolKey}`, secondary: e.userEmail, at: e.createdAt })),
                          ...(billing.data?.reservations ?? []).map((r) => ({ id: r.id, primary: `Wallet hold: ${r.purpose}`, secondary: "Reservation never resolved", at: r.createdAt })),
                        ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((r) => <RecentRow key={r.id} to="/admin/billing-failures" primary={r.primary} secondary={r.secondary} trailing={fmtDate(r.at)} />)}
                      </ul>
                    )}
                  </Panel>
                </div>

                <Panel title="Platform" note="Catalogue and content totals. These are current counts, not filtered by date.">
                  {platform.isLoading ? <PanelEmpty>Loading…</PanelEmpty> : platform.error || !platform.data ? <PanelEmpty tone="error">Could not load the platform summary.</PanelEmpty> : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Kpi icon={Activity} label="Live Darshan channels" value={`${platform.data.devotion.liveNow} / ${platform.data.devotion.channels}`} hint="live now / tracked" to="/admin/devotion" />
                      <Kpi icon={Sparkles} label="Temples · pujas · chadhawas" value={`${platform.data.devotion.temples} · ${platform.data.devotion.pujas} · ${platform.data.devotion.chadhawas}`} hint="catalogue entries" to="/admin/devotion" />
                      <Kpi icon={Coins} label="Shop products" value={fmtCount(platform.data.commerce.products)} hint={`${platform.data.commerce.categories} categories`} to="/admin/shop-orders" />
                      <Kpi icon={BookOpen} label="Content published" value={fmtCount(sum(platform.data.content.filter((c) => c.status === "PUBLISHED"), (c) => c.count))} hint={`${fmtCount(sum(platform.data.content.filter((c) => c.status === "DRAFT"), (c) => c.count))} drafts`} to="/admin/content" />
                    </div>
                  )}
                  {platform.data?.notConfigured.length ? (
                    <p className="mt-3 text-[11px] text-[#6B6259]">Not connected yet (shown blank, never simulated): {platform.data.notConfigured.map((n) => n.label).join(", ")}.</p>
                  ) : null}
                </Panel>

                {!t.customers.total && !t.readings.generated && !t.tools.requests && (
                  <Empty title="Nothing recorded yet" hint="Figures appear here as customers register, pay and use the tools." />
                )}
              </div>
            );
          }}
        </QueryView>
      )}
      {isMain && q.isFetching && !q.isLoading && <span className="sr-only" role="status">Updating figures</span>}
    </div>
  );
}
