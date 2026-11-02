import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { errorMessage, panelSend, usePanel } from "./api";
import { Badge, Card, fmtDate, ghostBtn } from "./ui";
import { fmtUsd } from "./money";
import type { BalanceProvider } from "./ProviderBalances";

interface Snapshot { providers: BalanceProvider[]; refreshedAt: string | null; throttled?: boolean }

/** Reading never calls OpenRouter: it shows the last saved check. Only the Refresh button does, and only the server holds the keys. */
export function OpenRouterUsageCard() {
  const qc = useQueryClient();
  const q = usePanel<Snapshot>("/providers/balance");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await panelSend<{ data?: Snapshot } & Snapshot>("POST", "/providers/balance/refresh");
      const snap: Snapshot = res?.data ?? res;
      qc.setQueryData(["admin-panel", "/providers/balance"], snap);
      setMsg({ ok: true, text: snap.throttled ? "Checked less than a minute ago, so the saved result is shown." : "OpenRouter balance refreshed." });
    } catch (e) { setMsg({ ok: false, text: errorMessage(e) }); } finally { setBusy(false); }
  };

  const p = q.data?.providers.find((x) => x.id === "openrouter");
  const c = p?.credits;
  const status =
    !p ? { label: "Not checked yet", tone: "neutral" as const }
    : c?.status === "ok" ? { label: "Connected", tone: "good" as const }
    : c?.status === "not_configured" ? { label: "Not Configured", tone: "neutral" as const }
    : { label: "Unable to fetch balance", tone: "bad" as const };
  const hasNumbers = c?.totalCredits != null;

  const stat = (label: string, value: number | null | undefined) => (
    <div className="rounded-xl border border-[#301607]/10 bg-[#FBF8F3] p-3">
      <p className="text-xs uppercase tracking-wide text-[#6B6259]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[#301607]">{value == null ? "–" : fmtUsd(value)}</p>
    </div>
  );

  return (
    <Card
      title="OpenRouter API Usage"
      description="Account credits from OpenRouter's official credits API, read by the server with a management key. Nothing here is estimated."
      actions={<button className={ghostBtn} onClick={refresh} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> {busy ? "Refreshing…" : "Refresh Balance"}</button>}
    >
      <div data-testid="openrouter-card">
        {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
        {q.isLoading && <p className="text-sm text-[#6B6259]">Loading…</p>}
        {q.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">Could not load the saved balance: {q.error.message}</p>}
        {!q.isLoading && !q.error && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#4A423A]">Connection status</span>
              <span data-testid="openrouter-status"><Badge tone={status.tone}>{status.label}</Badge></span>
            </div>
            {c?.status === "not_configured" && (
              <p className="mb-3 rounded-lg bg-[#FBF8F3] p-3 text-sm text-[#4A423A]">Set <code>OPENROUTER_MANAGEMENT_KEY</code> on the server to read the account balance. No balance is shown until then.</p>
            )}
            {c?.status === "error" && (
              <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
                Unable to fetch balance{c.error ? `: ${c.error}` : "."} {hasNumbers ? `Showing the last successful snapshot from ${fmtDate(c.fetchedAt)}.` : "No earlier snapshot is available."}
              </p>
            )}
            {(c?.status === "ok" || hasNumbers) && (
              <div className="grid gap-3 sm:grid-cols-3" data-testid="openrouter-numbers">
                {stat("Total credits purchased", c?.totalCredits)}
                {stat("Total usage", c?.totalUsage)}
                {stat("Remaining balance", c?.remaining)}
              </div>
            )}
            <p className="mt-3 text-xs text-[#6B6259]" data-testid="openrouter-refreshed">
              Last successful refresh: {c?.fetchedAt ? fmtDate(c.fetchedAt) : "Never"}
              {c?.stale ? " (stale: the latest attempt failed)" : ""}
            </p>
            {p && p.usage.monthlyUsd !== null && (
              <p className="mt-1 text-xs text-[#6B6259]">API key usage this month: {fmtUsd(p.usage.monthlyUsd)}{p.usage.totalUsd !== null ? ` · ${fmtUsd(p.usage.totalUsd)} total on the key` : ""}. Remaining = credits purchased minus usage.</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
