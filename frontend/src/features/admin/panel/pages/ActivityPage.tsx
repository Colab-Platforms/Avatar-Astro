import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage, panelDownloadCsv, usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Empty, fmtDate, ghostBtn, inputClass, isoDay, PageHeader, Pager, Table } from "../ui";

interface Item {
  id: string; at: string; eventType: string; label: string; feature: string; status: string; statusCode: number; durationMs: number;
  metadata: Record<string, unknown> | null;
  customer: { id: string; email: string | null; name: string | null; removed: boolean } | null;
}
interface Data {
  items: Item[]; page: number; pageSize: number; total: number; totalPages: number;
  facets: { eventTypes: { value: string; label: string }[]; features: { value: string; label: string }[]; statuses: string[] };
}

const KEYS = ["customer", "userId", "eventType", "feature", "status", "from", "to"] as const;
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

export default function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [customer, setCustomer] = useState(params.get("customer") ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
              <Table head={["When", "Customer", "Activity", "Feature", "Result", "Details"]}>
                {d.items.map((i) => (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtDate(i.at)}</td>
                    <td className="px-3 py-2">
                      {i.customer ? (
                        i.customer.removed ? <span className="text-xs text-[#9A9086]">Removed account</span> : (
                          <Link className="block hover:text-[#803003]" to={`/admin/users?user=${i.customer.id}`}>
                            <span className="block font-medium">{i.customer.name ?? i.customer.email}</span>
                            {i.customer.name && <span className="block text-xs text-[#6B6259]">{i.customer.email}</span>}
                          </Link>
                        )
                      ) : <span className="text-xs text-[#9A9086]">Not signed in</span>}
                    </td>
                    <td className="px-3 py-2">{i.label}<span className="block font-mono text-[11px] text-[#9A9086]">{i.eventType}</span></td>
                    <td className="px-3 py-2">{i.feature}</td>
                    <td className="px-3 py-2"><Badge tone={statusTone(i.status)}>{i.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-[#6B6259]">{details(i)}</td>
                  </tr>
                ))}
              </Table>
              <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )
        }
      </QueryView>
    </div>
  );
}
