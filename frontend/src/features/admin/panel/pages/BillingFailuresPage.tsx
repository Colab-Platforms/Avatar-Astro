import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelSend, usePanel, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Empty, fmtDate, PageHeader, Table } from "../ui";

interface StuckToolExecution {
  id: string;
  toolKey: string;
  executionId: string;
  userEmail: string;
  status: string;
  quotedPriceSubunits: number;
  createdAt: string;
}
interface StuckReservation {
  id: string;
  purpose: string;
  referenceId: string;
  userId: string;
  status: string;
  amountPaise: number;
  createdAt: string;
}
interface BillingFailures {
  stuckAfterMinutes: number;
  toolExecutions: StuckToolExecution[];
  reservations: StuckReservation[];
}

function ReleaseButton({ path, label, onDone, onError }: { path: string; label: string; onDone: (m: string) => void; onError: (m: string) => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => panelSend("POST", path),
    onSuccess: () => {
      onDone(`${label}: released.`);
      qc.invalidateQueries({ queryKey: ["admin-panel", "/billing-failures"] });
    },
    onError: (e) => onError(errorMessage(e)),
  });
  return (
    <button
      type="button"
      disabled={m.isPending}
      onClick={() => {
        if (!window.confirm(`Release this hold? This frees the coins without any charge. Only do this if you've confirmed the underlying action is not actually in progress.`)) return;
        m.mutate();
      }}
      className="rounded-md border border-[#301607]/25 px-2 py-1 text-xs font-semibold text-[#803003] hover:bg-[#803003]/10 disabled:opacity-40"
    >
      {m.isPending ? "…" : "Release"}
    </button>
  );
}

export default function BillingFailuresPage() {
  const q = usePanel<BillingFailures>("/billing-failures");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (m: string) => setMsg({ ok: true, text: m });
  const fail = (m: string) => setMsg({ ok: false, text: m });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Billing Failures & Reconciliation"
        subtitle="Coin holds (AI tool reservations and chat lookahead reservations) that never resolved to settled or released. Releasing a hold frees the coins without charging — use it only once you've confirmed the underlying action actually isn't still running."
      />
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}
      <QueryView q={q}>
        {(d) => (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[#1F1B16]">Stuck AI tool executions (open &gt; {d.stuckAfterMinutes} min)</h2>
              {d.toolExecutions.length === 0 ? (
                <Empty title="Nothing stuck" hint="Every tool execution has settled or released normally." />
              ) : (
                <Table head={["Tool", "User", "Status", "Price", "Opened", "Action"]}>
                  {d.toolExecutions.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2"><p className="font-medium">{e.toolKey}</p><p className="font-mono text-xs text-[#6B6259]">{e.executionId}</p></td>
                      <td className="px-3 py-2 text-sm">{e.userEmail}</td>
                      <td className="px-3 py-2"><Badge tone="warn">{e.status}</Badge></td>
                      <td className="px-3 py-2 text-sm">₹{(e.quotedPriceSubunits / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(e.createdAt)}</td>
                      <td className="px-3 py-2"><ReleaseButton path={`/billing-failures/tool-executions/${e.id}/release`} label={e.toolKey} onDone={done} onError={fail} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-[#1F1B16]">Stuck wallet reservations (open &gt; {d.stuckAfterMinutes} min)</h2>
              {d.reservations.length === 0 ? (
                <Empty title="Nothing stuck" hint="Every reservation has settled or released normally." />
              ) : (
                <Table head={["Purpose", "Reference", "User", "Status", "Amount", "Opened", "Action"]}>
                  {d.reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-sm">{r.purpose}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#6B6259]">{r.referenceId}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#6B6259]">{r.userId}</td>
                      <td className="px-3 py-2"><Badge tone="warn">{r.status}</Badge></td>
                      <td className="px-3 py-2 text-sm">₹{(r.amountPaise / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(r.createdAt)}</td>
                      <td className="px-3 py-2"><ReleaseButton path={`/billing-failures/reservations/${r.id}/release`} label={r.purpose} onDone={done} onError={fail} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>
          </>
        )}
      </QueryView>
    </div>
  );
}
