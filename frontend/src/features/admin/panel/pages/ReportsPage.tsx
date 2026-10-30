import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage, panelDownloadCsv, usePanel } from "../api";
import { QueryView } from "../QueryView";
import { CostAnalytics } from "../CostAnalytics";
import { Card, Empty, fmtDate, fmtPct, ghostBtn, inputClass, isoDay, PageHeader, Stat, Table } from "../ui";

interface FeatureRow { key: string; label: string; provider: string; total: number; success: number; failed: number; rejected: number }
interface Analytics {
  from: string; to: string; trackingSince: string | null;
  kpis: {
    totalUsers: number; newUsers: number; activeUsers: number; returningUsers: number; monthlyActiveUsers: number;
    totalRequests: number; successfulRequests: number; failedRequests: number; rejectedRequests: number; failureRate: number;
    mostUsedFeature: { key: string; label: string; total: number } | null;
  };
  registrations: { day: string; email: number; google: number }[];
  dailyActiveUsers: { day: string; users: number }[];
  monthlyActiveUsers: { month: string; users: number }[];
  features: FeatureRow[];
  mostUsed: FeatureRow[];
  leastUsed: FeatureRow[];
  requestStatus: { status: string; count: number }[];
  authMethods: {
    accountsByProvider: { provider: string; users: number }[];
    signInsByMethod: { method: string; count: number }[];
    failedSignInsByMethod: { method: string; count: number }[];
  };
  activityTrend: Record<string, number | string>[];
  providers: { provider: string; requests: number; failed: number }[];
}

type Preset = "today" | "7" | "30" | "90" | "custom";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" }, { id: "7", label: "Last 7 days" }, { id: "30", label: "Last 30 days" }, { id: "90", label: "Last 90 days" }, { id: "custom", label: "Custom" },
];
const rangeFor = (p: Preset) => { const to = isoDay(new Date()); const days = p === "today" ? 0 : Number(p) - 1; return { from: isoDay(new Date(Date.now() - days * 86_400_000)), to }; };

const C = { accent: "#803003", sand: "#C9855A", stone: "#8C8379", green: "#2F7D5B", red: "#B42318", amber: "#B7791F", blue: "#3B6EA5" };
const STATUS_COLOR: Record<string, string> = { success: C.green, failed: C.red, rejected: C.amber };
const PROVIDER_LABEL: Record<string, string> = { openrouter: "OpenRouter", groq: "Groq", sarvam: "Sarvam" };
const methodLabel = (m: string) => ({ password: "Email & password", google: "Google", otp: "Email code", phone_otp: "Phone code", unknown: "Unknown" } as Record<string, string>)[m] ?? m;

function ChartCard({ title, description, children, empty, label }: { title: string; description?: string; children: ReactNode; empty: boolean; label: string }) {
  return (
    <Card title={title} description={description}>
      {empty ? <Empty title="No data in this period" /> : <div role="img" aria-label={label} className="h-64 w-full">{children}</div>}
    </Card>
  );
}

const axis = { fontSize: 11, fill: "#6B6259" } as const;
const grid = <CartesianGrid stroke="#EEE9E2" vertical={false} />;
const tip = <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8E3DC", fontSize: 12 }} />;
const legendText = (v: string) => <span style={{ color: "#4A423A" }}>{v}</span>;
const shortDay = (d: string) => d.slice(5);

export default function ReportsPage() {
  const nav = useNavigate();
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState(rangeFor("30"));
  const { from, to } = preset === "custom" ? custom : rangeFor(preset);
  const valid = from <= to;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = usePanel<Analytics>(`/reports/analytics?from=${from}&to=${to}`, { enabled: valid });
  const rangeQs = `from=${from}&to=${to}`;
  const go = (path: string) => nav(path);

  const exportCsv = async (kind: "usage" | "signups" | "activity" | "audit") => {
    setBusy(kind); setMsg(null);
    try {
      await panelDownloadCsv(`/reports/export?kind=${kind}&${rangeQs}`, `mybhagya-${kind}.csv`);
      setMsg({ ok: true, text: `Exported ${from} to ${to}. Recorded in the audit log.` });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(null); }
  };

  const labelToKey = useMemo(() => new Map((q.data?.features ?? []).map((f) => [f.label, f.key])), [q.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Reports" subtitle="Analytics computed from recorded activity and registrations. Nothing is estimated; days with no activity show as zero. Click any figure or chart element to open the underlying records." />

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Date range" className="inline-flex overflow-hidden rounded-lg border border-[#DDD6CC] bg-white">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003] ${preset === p.id ? "bg-[#803003] text-white" : "text-[#1F1B16] hover:bg-[#F7F4EF]"}`}>{p.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <>
            <label className="text-xs text-[#6B6259]">From<input type="date" className={`${inputClass} mt-1 w-auto`} value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
            <label className="text-xs text-[#6B6259]">To<input type="date" className={`${inputClass} mt-1 w-auto`} value={custom.to} min={custom.from} max={isoDay(new Date())} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2" aria-label="Exports">
          {(["usage", "signups", "activity", "audit"] as const).map((k) => (
            <button key={k} className={ghostBtn} disabled={!valid || busy !== null} onClick={() => exportCsv(k)}>{busy === k ? "Preparing…" : `Export ${k} CSV`}</button>
          ))}
        </div>
      </div>
      {!valid && <p role="alert" className="text-sm text-red-800">“From” must not be after “To”.</p>}
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}

      {valid && (
        <QueryView q={q}>
          {(d) => {
            const k = d.kpis;
            const noActivity = k.totalRequests === 0 && k.activeUsers === 0;
            return (
              <>
                <p className="text-xs text-[#6B6259]">{d.from} to {d.to} (UTC){d.trackingSince ? ` · activity tracked since ${fmtDate(d.trackingSince)}; earlier history was never recorded` : " · no activity has been recorded yet"}</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <Stat label="Registered users" value={k.totalUsers.toLocaleString()} hint="All time" to="/admin/users" />
                  <Stat label="New users" value={k.newUsers.toLocaleString()} hint="Registered in this period" to={`/admin/users?registeredFrom=${d.from}&registeredTo=${d.to}`} />
                  <Stat label="Active users" value={k.activeUsers.toLocaleString()} hint="Signed in or used a feature" to={`/admin/activity?status=success&${rangeQs}`} />
                  <Stat label="Returning users" value={k.returningUsers.toLocaleString()} hint="Active now, registered earlier" to={`/admin/activity?status=success&${rangeQs}`} />
                  <Stat label="Monthly active users" value={k.monthlyActiveUsers.toLocaleString()} hint="30 days ending on the last day" />
                  <Stat label="Feature requests" value={k.totalRequests.toLocaleString()} to={`/admin/activity?eventType=feature.request&${rangeQs}`} />
                  <Stat label="Successful" value={k.successfulRequests.toLocaleString()} to={`/admin/activity?eventType=feature.request&status=success&${rangeQs}`} />
                  <Stat label="Failed" value={k.failedRequests.toLocaleString()} tone={k.failedRequests ? "bad" : "default"} to={`/admin/activity?eventType=feature.request&status=error&${rangeQs}`} />
                  <Stat label="Failure rate" value={fmtPct(k.failureRate)} hint={`${k.rejectedRequests} more were rejected (sign-in, validation, limits)`} tone={k.failureRate > 0.05 ? "bad" : "default"} />
                  <Stat label="Most-used feature" value={k.mostUsedFeature?.label ?? "—"} hint={k.mostUsedFeature ? `${k.mostUsedFeature.total} requests` : "No requests in this period"} to={k.mostUsedFeature ? `/admin/activity?feature=${k.mostUsedFeature.key}&${rangeQs}` : undefined} />
                </div>

                {noActivity && <Empty title="No customer activity in this period" hint="Registrations are shown below; usage charts fill in as customers use the site." />}

                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartCard title="User registrations" description="Click a bar to see that day's new customers." empty={d.registrations.every((r) => r.email + r.google === 0)} label="New registrations per day, split by email and Google">
                    <ResponsiveContainer><BarChart data={d.registrations} onClick={(s: any) => s?.activeLabel && go(`/admin/users?registeredFrom=${s.activeLabel}&registeredTo=${s.activeLabel}`)} style={{ cursor: "pointer" }}>
                      {grid}<XAxis dataKey="day" tickFormatter={shortDay} tick={axis} minTickGap={24} /><YAxis allowDecimals={false} tick={axis} width={32} />{tip}<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                      <Bar dataKey="email" name="Email" stackId="r" fill={C.accent} /><Bar dataKey="google" name="Google" stackId="r" fill={C.sand} radius={[3, 3, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Daily active users" description="Distinct customers with a successful event each day. Click a point for that day's activity." empty={d.dailyActiveUsers.every((r) => r.users === 0)} label="Daily active users">
                    <ResponsiveContainer><LineChart data={d.dailyActiveUsers} onClick={(s: any) => s?.activeLabel && go(`/admin/activity?status=success&from=${s.activeLabel}&to=${s.activeLabel}`)} style={{ cursor: "pointer" }}>
                      {grid}<XAxis dataKey="day" tickFormatter={shortDay} tick={axis} minTickGap={24} /><YAxis allowDecimals={false} tick={axis} width={32} />{tip}
                      <Line type="monotone" dataKey="users" name="Active users" stroke={C.accent} strokeWidth={2} dot={d.dailyActiveUsers.length < 40} activeDot={{ r: 5 }} />
                    </LineChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Feature usage" description="Requests per feature by outcome. Click a bar to open that feature's records." empty={d.features.every((f) => f.total === 0)} label="Requests per feature, split by success, failed and rejected">
                    <ResponsiveContainer><BarChart layout="vertical" data={[...d.features].filter((f) => f.total > 0).sort((a, b) => b.total - a.total)} margin={{ left: 8 }}
                      onClick={(s: any) => { const key = labelToKey.get(s?.activeLabel); if (key) go(`/admin/activity?feature=${key}&eventType=feature.request&${rangeQs}`); }} style={{ cursor: "pointer" }}>
                      {grid}<XAxis type="number" allowDecimals={false} tick={axis} /><YAxis type="category" dataKey="label" tick={axis} width={150} />{tip}<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                      <Bar dataKey="success" name="Succeeded" stackId="f" fill={C.green} /><Bar dataKey="failed" name="Failed" stackId="f" fill={C.red} /><Bar dataKey="rejected" name="Rejected" stackId="f" fill={C.amber} />
                    </BarChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Successful vs failed requests" description="Click a slice to open those requests." empty={k.totalRequests === 0} label="Share of successful, failed and rejected feature requests">
                    <ResponsiveContainer><PieChart>
                      <Pie data={d.requestStatus.filter((s) => s.count > 0)} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2} onClick={(s: any) => s?.status && go(`/admin/activity?eventType=feature.request&status=${s.status === "failed" ? "error" : s.status}&${rangeQs}`)} style={{ cursor: "pointer" }}>
                        {d.requestStatus.filter((s) => s.count > 0).map((s) => <Cell key={s.status} fill={STATUS_COLOR[s.status] ?? C.stone} />)}
                      </Pie>{tip}<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                    </PieChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="User activity trend" description="All recorded activity per day, by type." empty={d.activityTrend.every((r) => Object.keys(r).length <= 1)} label="Daily activity by event type">
                    <ResponsiveContainer><AreaChart data={d.activityTrend} onClick={(s: any) => s?.activeLabel && go(`/admin/activity?from=${s.activeLabel}&to=${s.activeLabel}`)} style={{ cursor: "pointer" }}>
                      {grid}<XAxis dataKey="day" tickFormatter={shortDay} tick={axis} minTickGap={24} /><YAxis allowDecimals={false} tick={axis} width={32} />{tip}<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                      <Area type="monotone" dataKey="feature.request" name="Feature requests" stackId="a" stroke={C.accent} fill={C.accent} fillOpacity={0.75} />
                      <Area type="monotone" dataKey="feature.opened" name="Pages opened" stackId="a" stroke={C.sand} fill={C.sand} fillOpacity={0.75} />
                      <Area type="monotone" dataKey="auth.login" name="Sign-ins" stackId="a" stroke={C.blue} fill={C.blue} fillOpacity={0.7} />
                      <Area type="monotone" dataKey="auth.register" name="Sign-ups" stackId="a" stroke={C.green} fill={C.green} fillOpacity={0.7} />
                    </AreaChart></ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Authentication methods" description="Accounts by sign-in method (all time). Click a slice to list those customers." empty={d.authMethods.accountsByProvider.length === 0} label="Registered accounts by authentication method">
                    <ResponsiveContainer><PieChart>
                      <Pie data={d.authMethods.accountsByProvider.map((a) => ({ name: a.provider === "GOOGLE" ? "Google" : "Email & password", provider: a.provider, users: a.users }))} dataKey="users" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} onClick={(s: any) => s?.provider && go(`/admin/users?provider=${s.provider}`)} style={{ cursor: "pointer" }}>
                        {d.authMethods.accountsByProvider.map((a) => <Cell key={a.provider} fill={a.provider === "GOOGLE" ? C.sand : C.accent} />)}
                      </Pie>{tip}<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                    </PieChart></ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title="Most-used features" description="Top five by requests in this period.">
                    {d.mostUsed.length === 0 ? <Empty title="No feature requests in this period" /> : (
                      <ul className="divide-y divide-[#EEE9E2] text-sm">
                        {d.mostUsed.map((f) => <li key={f.key}><Link className="flex items-center justify-between py-2 hover:text-[#803003]" to={`/admin/activity?feature=${f.key}&eventType=feature.request&${rangeQs}`}><span>{f.label}</span><span className="tabular-nums text-[#6B6259]">{f.total}</span></Link></li>)}
                      </ul>
                    )}
                  </Card>
                  <Card title="Least-used features" description="Including features with no requests at all in this period.">
                    <ul className="divide-y divide-[#EEE9E2] text-sm">
                      {d.leastUsed.map((f) => <li key={f.key}><Link className="flex items-center justify-between py-2 hover:text-[#803003]" to={`/admin/activity?feature=${f.key}&${rangeQs}`}><span>{f.label}</span><span className="tabular-nums text-[#6B6259]">{f.total}</span></Link></li>)}
                    </ul>
                  </Card>
                  <Card title="Provider usage and failures" description="Feature requests grouped by the AI provider behind them.">
                    {d.providers.length === 0 ? <Empty title="No provider-backed requests" /> : (
                      <Table head={["Provider", "Requests", "Failed", "Failure rate"]}>
                        {d.providers.map((p) => <tr key={p.provider}><td className="px-3 py-2">{PROVIDER_LABEL[p.provider] ?? p.provider}</td><td className="px-3 py-2">{p.requests}</td><td className="px-3 py-2">{p.failed}</td><td className="px-3 py-2">{p.requests ? fmtPct(p.failed / p.requests) : "—"}</td></tr>)}
                      </Table>
                    )}
                  </Card>
                  <Card title="Sign-ins by method" description="Recorded sign-in events in this period, and failed attempts.">
                    {d.authMethods.signInsByMethod.length + d.authMethods.failedSignInsByMethod.length === 0 ? <Empty title="No sign-ins recorded in this period" /> : (
                      <Table head={["Method", "Successful", "Failed"]}>
                        {[...new Set([...d.authMethods.signInsByMethod.map((m) => m.method), ...d.authMethods.failedSignInsByMethod.map((m) => m.method)])].map((m) => (
                          <tr key={m}><td className="px-3 py-2">{methodLabel(m)}</td><td className="px-3 py-2">{d.authMethods.signInsByMethod.find((x) => x.method === m)?.count ?? 0}</td><td className="px-3 py-2">{d.authMethods.failedSignInsByMethod.find((x) => x.method === m)?.count ?? 0}</td></tr>
                        ))}
                      </Table>
                    )}
                    {d.monthlyActiveUsers.length > 0 && <p className="mt-3 text-xs text-[#6B6259]">Active users by month: {d.monthlyActiveUsers.map((m) => `${m.month}: ${m.users}`).join(" · ")}</p>}
                  </Card>
                </div>
              </>
            );
          }}
        </QueryView>
      )}
      {valid && <CostAnalytics from={from} to={to} />}
    </div>
  );
}
