import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage, panelDownloadCsv, usePanel } from "./api";
import { QueryView } from "./QueryView";
import { Card, Empty, ghostBtn, Stat, Table } from "./ui";
import { fmtInr, fmtNum, fmtUsd } from "./money";

interface Group { key: string; label: string; requests: number; tokens: number | null; costUsd: number | null; actualUsd: number | null; estimatedUsd: number | null; unpricedRequests: number; failedRequests: number }
interface CostData {
  from: string; to: string; currency: string; inrRate: number | null; trackingSince: string | null; note: string;
  kpis: {
    totalCostUsd: number | null; actualCostUsd: number | null; estimatedCostUsd: number | null; costTodayUsd: number | null; costThisWeekUsd: number | null; costThisMonthUsd: number | null;
    totalAiRequests: number; failedAiRequests: number; unpricedRequests: number; pricedRequests: number; totalTokens: number | null; inputTokens: number | null; outputTokens: number | null;
    averageCostUsd: number | null; customers: number;
  };
  byFeature: Group[]; byProvider: Group[]; byModel: Group[];
  topCustomers: { userId: string | null; email: string | null; name: string | null; removed: boolean; requests: number; tokens: number | null; costUsd: number | null }[];
  daily: { day: string; requests: number; tokens: number; costUsd: number; actualUsd: number; estimatedUsd: number }[];
}

const axis = { fontSize: 11, fill: "#6B6259" } as const;
const legendText = (v: string) => <span style={{ color: "#4A423A" }}>{v}</span>;
const C = { actual: "#803003", estimated: "#C9855A" };

function Breakdown({ title, rows, linkKey, qs, unit }: { title: string; rows: Group[]; linkKey: "feature" | "provider" | "model"; qs: string; unit: string }) {
  return (
    <Card title={title} description="Click a row to open those requests.">
      {rows.length === 0 ? <Empty title="No AI requests in this period" /> : (
        <Table head={[unit, "Requests", "Tokens", "Cost", "Actual", "Estimated", "No cost"]}>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2">
                {linkKey === "model" ? r.label : <Link className="font-medium hover:text-[#803003]" to={`/admin/activity?ai=yes&${linkKey}=${encodeURIComponent(r.key)}&${qs}`}>{r.label}</Link>}
              </td>
              <td className="px-3 py-2 tabular-nums">{r.requests}</td>
              <td className="px-3 py-2 tabular-nums">{fmtNum(r.tokens)}</td>
              <td className="px-3 py-2 tabular-nums">{fmtUsd(r.costUsd)}</td>
              <td className="px-3 py-2 tabular-nums">{fmtUsd(r.actualUsd)}</td>
              <td className="px-3 py-2 tabular-nums">{fmtUsd(r.estimatedUsd)}</td>
              <td className="px-3 py-2 tabular-nums">{r.unpricedRequests || "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

/** Feature cost analytics. Every figure is a sum of stored per-request records; nothing is projected. */
export function CostAnalytics({ from, to }: { from: string; to: string }) {
  const nav = useNavigate();
  const q = usePanel<CostData>(`/costs/summary?from=${from}&to=${to}`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const qs = `from=${from}&to=${to}`;

  const exportCsv = async () => {
    setBusy(true); setMsg(null);
    try {
      await panelDownloadCsv(`/reports/export?kind=costs&${qs}`, "mybhagya-costs.csv");
      setMsg({ ok: true, text: `Exported AI request costs for ${from} to ${to}. Recorded in the audit log.` });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="cost-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="cost-heading" className="text-xl font-semibold tracking-tight text-[#1F1B16]">Feature cost analytics</h3>
          <p className="mt-1 max-w-2xl text-sm text-[#6B6259]">What AI features cost, from recorded requests. Costs are in USD; "Actual" is reported by the provider, "Estimated" is tokens times the configured price.</p>
        </div>
        <button className={ghostBtn} disabled={busy} onClick={exportCsv}>{busy ? "Preparing…" : "Export cost CSV"}</button>
      </div>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
      <QueryView q={q}>
        {(d) => {
          const k = d.kpis;
          const inr = (v: number | null) => fmtInr(v, d.inrRate);
          const hint = (v: number | null, extra?: string) => [inr(v), extra].filter(Boolean).join(" · ") || undefined;
          const activity = `/admin/activity?ai=yes&${qs}`;
          if (k.totalAiRequests === 0) {
            return (
              <Empty
                title="No AI requests with recorded usage in this period"
                hint={d.trackingSince ? `AI usage has been recorded since ${new Date(d.trackingSince).toLocaleDateString()}. Earlier activity is never back-filled with guessed costs.` : "AI usage is recorded from the moment this version is deployed. Nothing is back-filled or estimated for earlier activity."}
              />
            );
          }
          return (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Total AI cost" value={fmtUsd(k.totalCostUsd)} hint={hint(k.totalCostUsd, "In the selected period")} to={`${activity}`} />
                <Stat label="Cost today (UTC)" value={fmtUsd(k.costTodayUsd)} hint={hint(k.costTodayUsd)} to={`/admin/activity?ai=yes&from=${new Date().toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`} />
                <Stat label="Cost this week" value={fmtUsd(k.costThisWeekUsd)} hint={hint(k.costThisWeekUsd, "Since Monday (UTC)")} />
                <Stat label="Cost this month" value={fmtUsd(k.costThisMonthUsd)} hint={hint(k.costThisMonthUsd, "Calendar month (UTC)")} />
                <Stat label="AI requests" value={fmtNum(k.totalAiRequests)} hint={`${k.customers} customer${k.customers === 1 ? "" : "s"}`} to={activity} />
                <Stat label="Total tokens" value={fmtNum(k.totalTokens)} hint={k.inputTokens != null ? `${fmtNum(k.inputTokens)} in · ${fmtNum(k.outputTokens)} out` : "Not reported by providers"} to={activity} />
                <Stat label="Average cost per request" value={fmtUsd(k.averageCostUsd)} hint={k.pricedRequests ? `Over ${k.pricedRequests} request${k.pricedRequests === 1 ? "" : "s"} with a known cost` : "No request has a known cost"} />
                <Stat label="Failed AI requests" value={fmtNum(k.failedAiRequests)} tone={k.failedAiRequests ? "bad" : "default"} to={`${activity}&status=error`} />
                <Stat label="Actual cost" value={fmtUsd(k.actualCostUsd)} hint="Reported by the provider" to={`${activity}&costBasis=actual`} />
                <Stat label="Estimated cost" value={fmtUsd(k.estimatedCostUsd)} hint="Tokens x configured price" to={`${activity}&costBasis=estimated`} />
                <Stat label="Requests with no cost" value={fmtNum(k.unpricedRequests)} hint="Provider gave no cost and no price is configured; not counted as $0" tone={k.unpricedRequests ? "bad" : "default"} to={`${activity}&costBasis=none`} />
              </div>

              <Card title="Daily cost trend" description="Cost per day, split into actual and estimated. Click a day to open its requests.">
                <div role="img" aria-label="Daily AI cost in US dollars, actual and estimated" className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={d.daily} style={{ cursor: "pointer" }} onClick={(s: any) => s?.activeLabel && nav(`/admin/activity?ai=yes&from=${s.activeLabel}&to=${s.activeLabel}`)}>
                      <CartesianGrid stroke="#EEE9E2" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={(v: string) => v.slice(5)} tick={axis} minTickGap={24} />
                      <YAxis tick={axis} width={56} tickFormatter={(v: number) => fmtUsd(v)} />
                      <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E8E3DC", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                      <Bar dataKey="actualUsd" name="Actual" stackId="c" fill={C.actual} />
                      <Bar dataKey="estimatedUsd" name="Estimated" stackId="c" fill={C.estimated} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Breakdown title="Cost by feature" rows={d.byFeature} linkKey="feature" qs={qs} unit="Feature" />
                <Breakdown title="Cost by provider" rows={d.byProvider} linkKey="provider" qs={qs} unit="Provider" />
              </div>
              <Breakdown title="Cost by model" rows={d.byModel} linkKey="model" qs={qs} unit="Model" />

              <Card title="Highest-cost customers" description="Customers ranked by recorded AI cost in this period (requests with no known cost add nothing).">
                {d.topCustomers.length === 0 ? <Empty title="No customer has a known cost in this period" /> : (
                  <Table head={["Customer", "AI requests", "Tokens", "Cost"]}>
                    {d.topCustomers.map((c, i) => (
                      <tr key={c.userId ?? `anon-${i}`}>
                        <td className="px-3 py-2">
                          {!c.userId ? <span className="text-[#6B6259]">Not signed in</span> : c.removed ? <span className="text-[#6B6259]">Removed account</span> : (
                            <Link className="block hover:text-[#803003]" to={`/admin/activity?ai=yes&userId=${c.userId}&${qs}`}>
                              <span className="block font-medium">{c.name ?? c.email}</span>
                              {c.name && <span className="block text-xs text-[#6B6259]">{c.email}</span>}
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{c.requests}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtNum(c.tokens)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtUsd(c.costUsd)}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
              <p className="text-xs text-[#6B6259]">{d.note}{d.inrRate ? ` Rupee amounts use a fixed configured rate of ${d.inrRate} per USD and are for display only.` : ""}</p>
            </>
          );
        }}
      </QueryView>
    </section>
  );
}
