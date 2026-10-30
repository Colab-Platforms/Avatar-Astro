import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage, panelDownloadCsv, usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BASIS_LABEL, fmtNum, fmtUsd } from "../money";
import { Badge, Empty, fmtDate, ghostBtn, inputClass, isoDay, PageHeader, Pager, Table } from "../ui";

interface Item {
  id: string; at: string; eventType: string; label: string; feature: string; status: string; statusCode: number; durationMs: number;
  metadata: Record<string, unknown> | null;
  ai: { provider: string | null; model: string | null; calls: number; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; costUsd: number | null; costBasis: "actual" | "estimated" | null } | null;
  servedFromCache: boolean;
  customer: { id: string; email: string | null; name: string | null; removed: boolean } | null;
}
interface Data {
  items: Item[]; page: number; pageSize: number; total: number; totalPages: number;
  facets: { eventTypes: { value: string; label: string }[]; features: { value: string; label: string }[]; statuses: string[]; providers?: string[] };
}

const KEYS = ["customer", "userId", "eventType", "feature", "status", "from", "to", "provider", "costBasis", "ai"] as const;
const statusTone = (s: string) => (s === "success" ? "good" : s === "error" || s === "failed" ? "bad" : "warn");

function details(i: Item): string {
  const m = i.metadata ?? {};
  const parts: string[] = [];
  if (m.method) parts.push(String(m.method));
  if (m.route) parts.push(String(m.route));
  if (m.reason) parts.push(String(m.reason).replace("_", " "));
  if (Array.isArray(m.fields)) parts.push(`fields: ${(m.fields as string[]).join(", ")}`);
  if (i.eventType === "feature.request") parts.push(`HTTP ${i.statusCode} · ${i.durationMs} ms`);
  return parts.join(" · ") || "—";
}

function CostCell({ i }: { i: Item }) {
  if (!i.ai) return <span className="text-xs text-[#6B6259]">{i.servedFromCache ? "Cached" : "—"}</span>;
  if (i.ai.costUsd === null) return <span className="text-xs text-[#6B6259]" title="The provider reported no cost and no price is configured">Not known</span>;
  return (
    <span className="block">
      <span className="tabular-nums">{fmtUsd(i.ai.costUsd)}</span>
      {i.ai.costBasis && <span className="block text-[11px] text-[#6B6259]">{BASIS_LABEL[i.ai.costBasis]}</span>}
    </span>
  );
}

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#EEE9E2] py-1.5 text-sm last:border-0">
      <dt className="text-[#6B6259]">{k}</dt>
      <dd className="text-right font-medium text-[#1F1B16]">{v}</dd>
    </div>
  );
}

function DetailDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const ai = item?.ai;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{item.label}</DialogTitle>
              <DialogDescription>{fmtDate(item.at)} · {item.feature}</DialogDescription>
            </DialogHeader>
            <dl>
              <DetailRow k="Customer" v={item.customer ? (item.customer.removed ? "Removed account" : item.customer.name ?? item.customer.email) : "Not signed in"} />
              {item.customer?.email && item.customer.name && <DetailRow k="Email" v={item.customer.email} />}
              <DetailRow k="Result" v={`${item.status} (HTTP ${item.statusCode})`} />
              <DetailRow k="Duration" v={`${item.durationMs} ms`} />
              <DetailRow k="Served from cache" v={item.servedFromCache ? "Yes (nothing generated)" : "No"} />
            </dl>
            <h4 className="mt-3 text-sm font-semibold text-[#1F1B16]">AI usage</h4>
            {ai ? (
              <dl>
                <DetailRow k="Provider" v={ai.provider} />
                <DetailRow k="Model" v={ai.model ?? "Not reported"} />
                <DetailRow k="Provider calls" v={ai.calls} />
                <DetailRow k="Input tokens" v={fmtNum(ai.inputTokens)} />
                <DetailRow k="Output tokens" v={fmtNum(ai.outputTokens)} />
                <DetailRow k="Total tokens" v={fmtNum(ai.totalTokens)} />
                <DetailRow k="Cost" v={ai.costUsd === null ? "Not known" : `${fmtUsd(ai.costUsd)} USD`} />
                <DetailRow k="Cost type" v={ai.costBasis ? `${BASIS_LABEL[ai.costBasis]}${ai.costBasis === "actual" ? " (reported by the provider)" : " (tokens x configured price)"}` : "None: the provider reported no cost and no price is configured"} />
              </dl>
            ) : (
              <p className="text-sm text-[#6B6259]">{item.servedFromCache ? "This answer was reused, so no AI provider was called and nothing was charged." : "No AI provider was called for this activity (or it happened before cost tracking began), so no AI cost applies."}</p>
            )}
            {item.customer && !item.customer.removed && <Link className="mt-3 inline-block text-sm text-[#803003] hover:underline" to={`/admin/users?user=${item.customer.id}`}>Open customer profile</Link>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [customer, setCustomer] = useState(params.get("customer") ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const filters = new URLSearchParams();
  for (const k of KEYS) { const v = params.get(k); if (v) filters.set(k, v); }
  const q = usePanel<Data>(`/activity?${new URLSearchParams({ ...Object.fromEntries(filters), page: String(page), pageSize: "25" }).toString()}`, { placeholderData: (p) => p });
  const active = KEYS.some((k) => params.get(k));
  const facets = q.data?.facets;

  const exportCsv = async () => {
    setBusy(true); setMsg(null);
    try {
      const out = new URLSearchParams({ kind: "activity", from: params.get("from") ?? isoDay(new Date(Date.now() - 29 * 86_400_000)), to: params.get("to") ?? isoDay(new Date()) });
      for (const k of ["feature", "eventType", "status"] as const) { const v = params.get(k); if (v) out.set(k, v); }
      await panelDownloadCsv(`/reports/export?${out.toString()}`, "mybhagya-activity.csv");
      setMsg({ ok: true, text: "Export downloaded (it respects the date range, feature, event and status filters). Recorded in the audit log." });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Customer activity"
        subtitle="What customers actually did: sign-ins, feature requests, page opens and profile changes. Opening a feature is recorded separately from using it, and message content is never stored."
        actions={<button className={ghostBtn} disabled={busy} onClick={exportCsv}>{busy ? "Preparing…" : "Export CSV"}</button>}
      />
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ customer: customer.trim() || null, userId: null }); }} aria-label="Activity filters">
        <label className="text-xs text-[#6B6259]">Customer
          <input className={`${inputClass} mt-1 w-56`} placeholder="Name or email" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </label>
        <label className="text-xs text-[#6B6259]">Activity
          <select className={`${inputClass} mt-1 w-auto`} value={params.get("eventType") ?? ""} onChange={(e) => set({ eventType: e.target.value || null })}>
            <option value="">All activity</option>
            {(facets?.eventTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label} ({t.value})</option>)}
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Feature
          <select className={`${inputClass} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}>
            <option value="">All features</option>
            {(facets?.features ?? []).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Result
          <select className={`${inputClass} mt-1 w-auto`} value={params.get("status") ?? ""} onChange={(e) => set({ status: e.target.value || null })}>
            <option value="">Any</option>
            {(facets?.statuses ?? ["success", "error", "rejected", "failed"]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Provider
          <select className={`${inputClass} mt-1 w-auto`} value={params.get("provider") ?? ""} onChange={(e) => set({ provider: e.target.value || null })}>
            <option value="">Any</option>
            {(facets?.providers ?? ["openrouter", "groq", "sarvam"]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Cost type
          <select className={`${inputClass} mt-1 w-auto`} value={params.get("costBasis") ?? (params.get("ai") === "no" ? "nonai" : params.get("ai") === "yes" ? "ai" : "")} onChange={(e) => {
            const v = e.target.value;
            set({ costBasis: ["actual", "estimated", "none"].includes(v) ? v : null, ai: v === "nonai" ? "no" : v === "ai" ? "yes" : null });
          }}>
            <option value="">Any</option>
            <option value="ai">All AI requests</option>
            <option value="actual">Actual cost</option>
            <option value="estimated">Estimated cost</option>
            <option value="none">AI, cost not known</option>
            <option value="nonai">No AI used</option>
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">From
          <input type="date" className={`${inputClass} mt-1 w-auto`} max={params.get("to") ?? isoDay(new Date())} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null, to: params.get("to") || e.target.value || null })} />
        </label>
        <label className="text-xs text-[#6B6259]">To
          <input type="date" className={`${inputClass} mt-1 w-auto`} min={params.get("from") ?? undefined} max={isoDay(new Date())} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null, from: params.get("from") || e.target.value || null })} />
        </label>
        <button type="submit" className={ghostBtn}>Apply</button>
        {active && <button type="button" className={ghostBtn} onClick={() => { setCustomer(""); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</button>}
      </form>
      {params.get("userId") && (
        <p className="text-sm text-[#6B6259]">Showing one customer's activity. <Link className="text-[#803003] hover:underline" to={`/admin/users?user=${params.get("userId")}`}>Open their profile</Link></p>
      )}
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}

      <QueryView q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title={active ? "No activity matches these filters" : "No activity recorded yet"} hint={active ? "Try widening the date range or removing a filter." : "Activity is recorded from the moment tracking was deployed. Nothing is back-filled or estimated."} />
          ) : (
            <>
              <Table head={["When", "Customer", "Activity", "Feature", "Provider / Model", "Cost", "Result", "Details"]}>
                {d.items.map((i) => (
                  <tr key={i.id} className="cursor-pointer hover:bg-[#FBF8F3]" onClick={() => setSelected(i)}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtDate(i.at)}</td>
                    <td className="px-3 py-2">
                      {i.customer ? (
                        i.customer.removed ? <span className="text-xs text-[#756B61]">Removed account</span> : (
                          <Link className="block hover:text-[#803003]" to={`/admin/users?user=${i.customer.id}`}>
                            <span className="block font-medium">{i.customer.name ?? i.customer.email}</span>
                            {i.customer.name && <span className="block text-xs text-[#6B6259]">{i.customer.email}</span>}
                          </Link>
                        )
                      ) : <span className="text-xs text-[#756B61]">Not signed in</span>}
                    </td>
                    <td className="px-3 py-2">{i.label}<span className="block font-mono text-[11px] text-[#756B61]">{i.eventType}</span></td>
                    <td className="px-3 py-2">{i.feature}</td>
                    <td className="px-3 py-2 text-xs">
                      {i.ai ? <><span className="block font-medium text-[#1F1B16]">{i.ai.provider}</span><span className="block text-[#6B6259]">{i.ai.model ?? "model not reported"}</span></> : <span className="text-[#6B6259]">—</span>}
                    </td>
                    <td className="px-3 py-2"><CostCell i={i} /></td>
                    <td className="px-3 py-2"><Badge tone={statusTone(i.status)}>{i.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-[#6B6259]">
                      {details(i)}
                      <button type="button" className="ml-2 font-medium text-[#803003] hover:underline focus-visible:outline focus-visible:outline-2" onClick={(e) => { e.stopPropagation(); setSelected(i); }}>View</button>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )
        }
      </QueryView>
      <DetailDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
