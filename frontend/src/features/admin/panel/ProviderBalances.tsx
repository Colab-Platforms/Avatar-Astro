import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { errorMessage, panelSend, usePanel } from "./api";
import { Badge, Card, fmtDate, ghostBtn, Table } from "./ui";
import { fmtUsd } from "./money";

export interface BalanceProvider {
  id: string; name: string;
  connection: "not_configured" | "connected" | "rejected" | "error" | "unverified";
  balance: { state: "available" | "unsupported" | "unavailable"; remainingUsd: number | null; unlimited: boolean; scope: "account" | "key" | null; note: string };
  usage: { totalUsd: number | null; dailyUsd: number | null; weeklyUsd: number | null; monthlyUsd: number | null; note: string | null };
  lastCheckedAt: string | null; lastSuccessAt: string | null; error: string | null;
}
interface Snapshot { providers: BalanceProvider[]; refreshedAt: string | null; throttled?: boolean }

const CONNECTION: Record<BalanceProvider["connection"], { label: string; tone: "good" | "bad" | "warn" | "neutral" }> = {
  connected: { label: "Connected", tone: "good" },
  not_configured: { label: "Not configured", tone: "neutral" },
  rejected: { label: "Key rejected", tone: "bad" },
  error: { label: "Check failed", tone: "bad" },
  unverified: { label: "Key set, not verifiable", tone: "warn" },
};

export function BalanceCell({ p }: { p: BalanceProvider }) {
  const b = p.balance;
  if (b.state === "available") {
    return (
      <>
        <p className="font-medium tabular-nums">{fmtUsd(b.remainingUsd)}</p>
        <p className="text-xs text-[#6B6259]">{b.scope === "account" ? "Account credits" : "Remaining on this API key"}</p>
      </>
    );
  }
  if (b.state === "unsupported") {
    return (
      <>
        <p className="font-medium text-[#4A423A]">Not available through API</p>
        <p className="text-xs text-[#6B6259]">{b.note.replace(/^Not available through API\.\s*/, "")}</p>
      </>
    );
  }
  return (
    <>
      <p className="font-medium text-[#4A423A]">{b.unlimited ? "No limit set" : "Unavailable"}</p>
      <p className="text-xs text-[#6B6259]">{p.error ?? b.note}</p>
    </>
  );
}

export function UsageCell({ p }: { p: BalanceProvider }) {
  const u = p.usage;
  if (u.monthlyUsd === null && u.totalUsd === null) return <span className="text-xs text-[#6B6259]">{u.note ?? "Unavailable"}</span>;
  return (
    <>
      {u.monthlyUsd !== null && <p className="tabular-nums">{fmtUsd(u.monthlyUsd)} <span className="text-xs text-[#6B6259]">this month</span></p>}
      {u.totalUsd !== null && <p className="text-xs tabular-nums text-[#6B6259]">{fmtUsd(u.totalUsd)} total on key</p>}
    </>
  );
}

/** Reading this never calls a provider: it shows the last saved check. Only the button does. */
export function ProviderBalances() {
  const qc = useQueryClient();
  const q = usePanel<Snapshot>("/providers/balance");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await panelSend<{ data?: Snapshot; message?: string } & Snapshot>("POST", "/providers/balance/refresh");
      const snap = (res as any).data ?? res;
      qc.setQueryData(["admin-panel", "/providers/balance"], snap);
      setMsg({ ok: true, text: snap.throttled ? "Checked less than a minute ago, so the saved result is shown." : "Provider balances refreshed." });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(false); }
  };

  const d = q.data;
  return (
    <Card
      title="Provider balance"
      description="Read from each provider's official API where one exists. This page shows the last saved check; providers are only contacted when you press Refresh (at most once a minute)."
      actions={<button className={ghostBtn} onClick={refresh} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />{busy ? "Checking…" : "Refresh"}</button>}
    >
      {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
      {q.isLoading && <p className="text-sm text-[#6B6259]">Loading…</p>}
      {q.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">Could not load saved balances: {q.error.message}</p>}
      {d && d.providers.length === 0 && !q.isLoading && (
        <p className="rounded-lg bg-[#FBF8F3] p-3 text-sm text-[#4A423A]">No check has been run yet. Press Refresh to query the providers. Nothing is shown until then, and nothing is estimated.</p>
      )}
      {d && d.providers.length > 0 && (
        <>
          <Table head={["Provider", "Connection", "Remaining balance", "Usage", "Last checked"]}>
            {d.providers.map((p) => {
              const c = CONNECTION[p.connection];
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><Badge tone={c.tone}>{c.label}</Badge>{p.error && p.connection !== "connected" && <p className="mt-1 text-xs text-red-800">{p.error}</p>}</td>
                  <td className="px-3 py-2"><BalanceCell p={p} /></td>
                  <td className="px-3 py-2"><UsageCell p={p} /></td>
                  <td className="px-3 py-2 text-xs">
                    {p.lastCheckedAt ? fmtDate(p.lastCheckedAt) : "Never"}
                    {p.lastSuccessAt && p.lastSuccessAt !== p.lastCheckedAt && <span className="block text-[#6B6259]">Last success {fmtDate(p.lastSuccessAt)}</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
          <p className="mt-3 text-xs text-[#6B6259]">Balances are never calculated from MyBhagya's own cost records. "Remaining on this API key" is a limit set on the key, not your whole account balance.</p>
        </>
      )}
    </Card>
  );
}
