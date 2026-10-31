import { Link, useSearchParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, inputClass, PageHeader, Pager, personName, Stat, Table } from "../ui";

interface Lib {
  totals: { readings: number; saved: number; conversations: number };
  byFeature: { feature: string; label: string; count: number }[];
  items: { id: string; feature: string; label: string; isSaved: boolean; createdAt: string; customer: { id: string; email: string; name: string | null } }[];
  page: number; pageSize: number; total: number; totalPages: number; note: string;
}

export default function CustomerLibraryPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const feature = params.get("feature") ?? "";
  const q = usePanel<Lib>(`/customer-library?page=${page}&pageSize=20${feature ? `&feature=${encodeURIComponent(feature)}` : ""}`, { placeholderData: (p) => p });
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Customer readings & library" subtitle="What customers have generated and kept. Only that a reading exists is shown; the reading text and chat messages stay private to each customer." />
      <QueryView q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Stored readings" value={d.totals.readings} />
              <Stat label="Saved by customers" value={d.totals.saved} />
              <Stat label="Conversations" value={d.totals.conversations} />
            </div>
            <Card title="Readings by feature">
              {d.byFeature.length === 0 ? <Empty title="No readings stored yet" hint="Readings appear here once signed-in customers generate them." /> : (
                <ul className="flex flex-wrap gap-2">
                  {d.byFeature.map((f) => (
                    <li key={f.feature}><button type="button" className={`rounded-full border px-3 py-1 text-sm ${feature === f.feature ? "border-[#803003] bg-[#F4EEE6] text-[#803003]" : "border-[#DDD6CC] bg-white hover:bg-[#F7F4EF]"}`} onClick={() => set({ feature: feature === f.feature ? null : f.feature })}>{f.label} · {f.count}</button></li>
                  ))}
                </ul>
              )}
            </Card>
            {d.items.length > 0 && (
              <>
                <label className="block text-xs text-[#6B6259]">Feature
                  <select className={`${inputClass} mt-1 w-auto min-w-[12rem]`} value={feature} onChange={(e) => set({ feature: e.target.value || null })}>
                    <option value="">All features</option>
                    {d.byFeature.map((f) => <option key={f.feature} value={f.feature}>{f.label}</option>)}
                  </select>
                </label>
                <Table head={["Customer", "Feature", "Saved", "Generated"]}>
                  {d.items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2"><Link className="font-medium hover:text-[#803003]" to={`/admin/customers?user=${r.customer.id}`}>{personName({ name: r.customer.name, email: null }) === "Unknown" ? r.customer.email : personName({ name: r.customer.name, email: null })}</Link><span className="block text-xs text-[#6B6259]">{r.customer.email}</span></td>
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2">{r.isSaved ? <Badge tone="good">Saved</Badge> : <span className="text-xs text-[#756B61]">—</span>}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </Table>
                <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />
              </>
            )}
          </>
        )}
      </QueryView>
    </div>
  );
}
