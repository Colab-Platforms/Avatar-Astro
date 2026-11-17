import { useSearchParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, ghostBtn, inputClass, PageHeader, Pager, personName, Stat, Table } from "../ui";
import { fmtCount, fmtRupees } from "../../overview/format";

type Status = "CREATED" | "SUCCESS" | "FAILED" | "EXPIRED";
interface Data {
  items: { id: string; amountPaise: number; provider: "MOCK" | "RAZORPAY"; status: Status; providerPaymentId: string | null; createdAt: string; completedAt: string | null; user: { id: string; firstName: string | null; lastName: string | null; email: string } }[];
  page: number; pageSize: number; total: number; totalPages: number;
  summary: { razorpayRevenuePaise: number; razorpayByStatus: Partial<Record<Status, number>> };
}

const TONE = { SUCCESS: "good", FAILED: "bad", EXPIRED: "neutral", CREATED: "warn" } as const;
const LABEL: Record<Status, string> = { SUCCESS: "Successful", FAILED: "Failed", EXPIRED: "Abandoned", CREATED: "Awaiting payment" };
const STATUSES = Object.keys(LABEL) as Status[];

/** Wallet top-up orders (Razorpay), newest first. The Overview's payment figures link here with the same status and dates. */
export default function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get("status") as Status) ? (params.get("status") as Status) : "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (status) query.set("status", status);
  if (from && to) { query.set("from", from); query.set("to", to); }
  const q = usePanel<Data>(`/payments?${query}`, { placeholderData: (p) => p });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Payments & Plans" subtitle="Wallet top-up orders paid through Razorpay. Revenue counts successful orders only; amounts are in rupees." />
      <QueryView q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total revenue" value={fmtRupees(d.summary.razorpayRevenuePaise)} hint="All time, successful Razorpay orders" />
              <Stat label="Successful" value={fmtCount(d.summary.razorpayByStatus.SUCCESS ?? 0)} />
              <Stat label="Failed" value={fmtCount(d.summary.razorpayByStatus.FAILED ?? 0)} tone={d.summary.razorpayByStatus.FAILED ? "bad" : "default"} />
              <Stat label="Abandoned" value={fmtCount(d.summary.razorpayByStatus.EXPIRED ?? 0)} hint="Opened but never paid" />
            </div>

            <Card>
              <form className="mb-3 flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
                <label className="text-xs text-[#6B6259]">Status
                  <select className={`${inputClass} mt-1 block`} value={status} onChange={(e) => set({ status: e.target.value })}>
                    <option value="">All</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[#6B6259]">From
                  <input type="date" className={`${inputClass} mt-1 block`} value={from} onChange={(e) => set({ from: e.target.value, ...(e.target.value && !to ? { to: e.target.value } : {}) })} />
                </label>
                <label className="text-xs text-[#6B6259]">To
                  <input type="date" className={`${inputClass} mt-1 block`} value={to} onChange={(e) => set({ to: e.target.value, ...(e.target.value && !from ? { from: e.target.value } : {}) })} />
                </label>
                {(status || from || to) && <button type="button" className={ghostBtn} onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>}
              </form>

              {d.items.length === 0 ? (
                <Empty title="No payments match" hint={status || from ? "Try a different status or date range." : "Top-ups will appear here as customers recharge their wallets."} />
              ) : (
                <Table head={["When", "Customer", "Amount", "Status", "Payment ref"]}>
                  {d.items.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtDate(o.completedAt ?? o.createdAt)}</td>
                      <td className="px-3 py-2"><span className="block font-medium">{personName(o.user)}</span><span className="block text-xs text-[#6B6259]">{o.user.email}</span></td>
                      <td className="px-3 py-2 tabular-nums">{fmtRupees(o.amountPaise)}{o.provider === "MOCK" && <span className="ml-1 text-xs text-[#6B6259]">(test order)</span>}</td>
                      <td className="px-3 py-2"><Badge tone={TONE[o.status]}>{LABEL[o.status]}</Badge></td>
                      <td className="px-3 py-2 font-mono text-xs text-[#6B6259]">{o.providerPaymentId ?? "—"}</td>
                    </tr>
                  ))}
                </Table>
              )}
              {d.total > 0 && <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />}
            </Card>
          </>
        )}
      </QueryView>
    </div>
  );
}
