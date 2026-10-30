import { Link } from "react-router-dom";
import { usePanel, useMainAdmin } from "../panel/api";
import { QueryView } from "../panel/QueryView";
import { Badge, Card, daysAgo, Empty, fmtDate, fmtPct, isoDay, NotConfigured, PageHeader, personName, Stat, Table } from "../panel/ui";
import { useAdminDashboard } from "../hooks/useAdminDashboard";

interface FeatureUsage { key: string; label: string; total: number; errors: number; rejected: number; lastAt: string | null }
interface Overview {
  windowDays: number;
  trackingSince: string | null;
  users: { total: number; active: number; inactive: number; emailVerified: number; newInWindow: number; newLast7Days: number };
  usage: { totalRequests: number; totalErrors: number; errorRate: number; features: FeatureUsage[] };
  recentErrors: { id: string; feature: string; statusCode: number; createdAt: string }[];
  recentSignups: { id: string; firstName: string | null; lastName: string | null; email: string; createdAt: string }[];
  recentAudit: { id: string; actorEmail: string; action: string; summary: string; createdAt: string }[];
  content: { type: string; status: "DRAFT" | "PUBLISHED"; count: number }[];
  devotion: { channels: number; liveNow: number; temples: number; pujas: number; chadhawas: number };
  commerce: { products: number; categories: number };
  notConfigured: { key: string; label: string; reason: string }[];
}

export default function AdminOverviewPage() {
  const { isMain } = useMainAdmin();
  const { data: me } = useAdminDashboard();
  const q = usePanel<Overview>("/overview", { enabled: isMain });
  const name = [me?.user.firstName, me?.user.lastName].filter(Boolean).join(" ") || me?.user.email || "Admin";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={`Welcome, ${name}`} subtitle="Every number comes from the live database or from requests the API actually served. Select any figure to see the records behind it." />

      {isMain && (
        <QueryView q={q}>
          {(o) => {
            const range = `from=${daysAgo(o.windowDays - 1)}&to=${isoDay(new Date())}`;
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="Registered users" value={o.users.total} hint={`${o.users.active} active · ${o.users.inactive} deactivated · ${o.users.emailVerified} email-verified`} to="/admin/users" />
                  <Stat label={`New users (${o.windowDays} days)`} value={o.users.newInWindow} hint={`${o.users.newLast7Days} in the last 7 days`} to={`/admin/users?registeredFrom=${daysAgo(o.windowDays - 1)}&registeredTo=${isoDay(new Date())}`} />
                  <Stat label={`Feature requests (${o.windowDays}d)`} value={o.usage.totalRequests} hint={o.trackingSince ? `Tracked since ${fmtDate(o.trackingSince)}` : "Tracking starts with the first request"} to={`/admin/activity?eventType=feature.request&${range}`} />
                  <Stat label="Server failures" value={o.usage.totalErrors} hint={`${fmtPct(o.usage.errorRate)} of requests`} tone={o.usage.totalErrors ? "bad" : "default"} to={`/admin/activity?eventType=feature.request&status=error&${range}`} />
                </div>

                <Card title="Feature usage" description={`Requests in the last ${o.windowDays} days. Failures are 5xx responses; rejected are 4xx (sign-in, validation, rate limits). Select a feature to see its records.`} actions={<Link className="text-sm font-medium text-[#803003] hover:underline" to="/admin/reports">Open reports</Link>}>
                  {o.usage.totalRequests === 0 ? (
                    <Empty title="No usage recorded yet" hint="Usage is recorded from the moment tracking was deployed. Earlier activity was never logged, so it cannot be shown." />
                  ) : (
                    <Table head={["Feature", "Requests", "Failures", "Rejected", "Last used"]}>
                      {o.usage.features.filter((f) => f.total > 0).sort((a, b) => b.total - a.total).map((f) => (
                        <tr key={f.key}>
                          <td className="px-3 py-2"><Link className="font-medium text-[#1F1B16] hover:text-[#803003]" to={`/admin/activity?feature=${f.key}&eventType=feature.request&${range}`}>{f.label}</Link></td>
                          <td className="px-3 py-2">{f.total}</td>
                          <td className="px-3 py-2">{f.errors ? <Link to={`/admin/activity?feature=${f.key}&status=error&${range}`}><Badge tone="bad">{f.errors}</Badge></Link> : 0}</td>
                          <td className="px-3 py-2">{f.rejected}</td>
                          <td className="px-3 py-2">{fmtDate(f.lastAt)}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card title="Recent failures" actions={<Link to={`/admin/activity?status=error&${range}`} className="text-sm font-medium text-[#803003] hover:underline">All failures</Link>}>
                    {o.recentErrors.length === 0 ? (
                      <Empty title="No failures recorded" />
                    ) : (
                      <ul className="divide-y divide-[#EEE9E2] text-sm">
                        {o.recentErrors.map((e) => (
                          <li key={e.id}>
                            <Link className="flex items-center justify-between gap-3 py-2 hover:text-[#803003]" to={`/admin/activity?feature=${e.feature}&status=error&from=${e.createdAt.slice(0, 10)}&to=${e.createdAt.slice(0, 10)}`}>
                              <span>{o.usage.features.find((f) => f.key === e.feature)?.label ?? e.feature}</span>
                              <span className="flex items-center gap-2"><Badge tone="bad">{e.statusCode}</Badge><span className="text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span></span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card title="Recent sign-ups" actions={<Link to="/admin/users" className="text-sm font-medium text-[#803003] hover:underline">All users</Link>}>
                    {o.recentSignups.length === 0 ? (
                      <Empty title="No users yet" />
                    ) : (
                      <ul className="divide-y divide-[#EEE9E2] text-sm">
                        {o.recentSignups.map((u) => (
                          <li key={u.id}>
                            <Link className="flex items-center justify-between gap-3 py-2 hover:text-[#803003]" to={`/admin/users?user=${u.id}`}>
                              <span className="min-w-0 truncate">{personName(u)}</span>
                              <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(u.createdAt)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Live Darshan channels" value={`${o.devotion.liveNow} / ${o.devotion.channels}`} hint="live now / tracked" to="/admin/devotion" />
                  <Stat label="Temples · pujas · chadhawas" value={`${o.devotion.temples} · ${o.devotion.pujas} · ${o.devotion.chadhawas}`} hint="catalogue entries" to="/admin/devotion" />
                  <Stat label="Shop products" value={o.commerce.products} hint={`${o.commerce.categories} categories`} to="/admin/shop-orders" />
                  <Stat label="Orders / bookings / payments" value="Not available" hint="No such records exist yet" to="/admin/payments" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card title="Recent admin actions" actions={<Link to="/admin/settings" className="text-sm font-medium text-[#803003] hover:underline">Audit log</Link>}>
                    {o.recentAudit.length === 0 ? (
                      <Empty title="No admin actions recorded yet" />
                    ) : (
                      <ul className="divide-y divide-[#EEE9E2] text-sm">
                        {o.recentAudit.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span className="min-w-0"><Badge tone="warn">{a.action}</Badge> <span className="ml-1">{a.summary}</span></span>
                            <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(a.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card title="Content" actions={<Link to="/admin/content" className="text-sm font-medium text-[#803003] hover:underline">Manage</Link>}>
                    {o.content.length === 0 ? (
                      <Empty title="No content created yet" hint="Banners, announcements, FAQs and articles appear here once created." />
                    ) : (
                      <Table head={["Type", "Published", "Draft"]}>
                        {["BANNER", "ANNOUNCEMENT", "FAQ", "ARTICLE"].map((t) => (
                          <tr key={t}>
                            <td className="px-3 py-2">{t[0] + t.slice(1).toLowerCase()}</td>
                            <td className="px-3 py-2">{o.content.find((c) => c.type === t && c.status === "PUBLISHED")?.count ?? 0}</td>
                            <td className="px-3 py-2">{o.content.find((c) => c.type === t && c.status === "DRAFT")?.count ?? 0}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                </div>

                <Card title="Not connected yet" description="These are intentionally blank rather than simulated.">
                  <ul className="grid gap-3 sm:grid-cols-3">
                    {o.notConfigured.map((n) => (
                      <li key={n.key}><NotConfigured title={n.label} reason={n.reason} /></li>
                    ))}
                  </ul>
                </Card>
              </div>
            );
          }}
        </QueryView>
      )}
    </div>
  );
}
