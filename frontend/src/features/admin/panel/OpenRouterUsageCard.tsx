import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { AuthApiError } from "@/lib/authClient";
import { errorMessage, panelSend, usePanel } from "./api";
import { Badge, Card, fmtDate, ghostBtn } from "./ui";
import { fmtUsd } from "./money";
import type { BalanceProvider } from "./ProviderBalances";

interface Snapshot { providers: BalanceProvider[]; refreshedAt: string | null; throttled?: boolean }

/** Reading never calls OpenRouter: it shows the last saved check. Only the Refresh button does, and only the server holds the key. */
export function OpenRouterUsageCard() {
  const qc = useQueryClient();
  const q = usePanel<Snapshot>("/providers/balance");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** When our own refresh limit (HTTP 429) was hit: the button waits out the minute instead of failing again. */
  const [coolUntil, setCoolUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (coolUntil <= Date.now()) return;
    const t = setInterval(() => { setNow(Date.now()); if (Date.now() >= coolUntil) clearInterval(t); }, 1000);
    return () => clearInterval(t);
  }, [coolUntil]);
  const coolSecs = Math.max(0, Math.ceil((coolUntil - now) / 1000));

  const refresh = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await panelSend<{ data?: Snapshot } & Snapshot>("POST", "/providers/balance/refresh");
      const snap: Snapshot = res?.data ?? res;
      qc.setQueryData(["admin-panel", "/providers/balance"], snap);
      setMsg({ ok: true, text: snap.throttled ? "Checked less than a minute ago, so the saved result is shown." : "API key usage refreshed." });
    } catch (e) {
      if (e instanceof AuthApiError && e.status === 429) {
        setNow(Date.now()); setCoolUntil(Date.now() + 60_000);
        setMsg({ ok: false, text: "Refresh was used too many times in a minute (this is the dashboard's own limit, not OpenRouter). You can try again in 60 seconds." });
      } else setMsg({ ok: false, text: errorMessage(e) });
    } finally { setBusy(false); }
  };

  const p = q.data?.providers.find((x) => x.id === "openrouter");
  const k = p?.keyUsage;
  const when = (iso: string | null | undefined) => (iso ? fmtDate(iso) : "later");
  const status =
    !p || !k ? { label: "Not checked yet", tone: "neutral" as const }
    : k?.status === "ok" ? { label: "Connected", tone: "good" as const }
    : k?.status === "not_configured" ? { label: "Not Configured", tone: "neutral" as const }
    : k?.status === "unauthorized" ? { label: "Unauthorized", tone: "bad" as const }
    : k?.status === "rate_limited" ? { label: "Rate limited", tone: "bad" as const }
    : { label: "Temporarily unavailable", tone: "bad" as const };
  const hasNumbers = k?.usage != null;

  const stat = (label: string, value: string, testId: string, note?: string) => (
    <div className="rounded-xl border border-[#301607]/10 bg-[#FBF8F3] p-3" data-testid={testId}>
      <p className="text-xs uppercase tracking-wide text-[#6B6259]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[#301607]">{value}</p>
      {note && <p className="mt-0.5 text-xs text-[#6B6259]">{note}</p>}
    </div>
  );

  return (
    <Card
      title="OpenRouter API Usage"
      description="Usage of the API key this server is configured with (OPENROUTER_API_KEY), read from OpenRouter's key API. Not the whole account's credits. Nothing here is estimated."
      actions={<button className={ghostBtn} onClick={refresh} disabled={busy || coolSecs > 0}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> {busy ? "Refreshing…" : coolSecs > 0 ? `Retry in ${coolSecs}s` : "Refresh Usage"}</button>}
    >
      <div data-testid="openrouter-card">
        {msg && <p role="status" className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
        {q.isLoading && <p className="text-sm text-[#6B6259]">Loading…</p>}
        {q.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">Could not load the saved usage: {q.error.message}</p>}
        {!q.isLoading && !q.error && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#4A423A]">Connection status</span>
              <span data-testid="openrouter-status"><Badge tone={status.tone}>{status.label}</Badge></span>
              {k?.status === "ok" && k.label && <span className="text-sm text-[#4A423A]">API key: <strong data-testid="openrouter-key-name">{k.label}</strong></span>}
            </div>
            {k?.status === "not_configured" && (
              <p className="mb-3 rounded-lg bg-[#FBF8F3] p-3 text-sm text-[#4A423A]">Set <code>OPENROUTER_API_KEY</code> on the server to see this key's usage. Nothing is shown until then.</p>
            )}
            {k && !["ok", "not_configured"].includes(k.status) && (
              <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
                Unable to fetch key usage{k.error ? `: ${k.error}` : "."}
                {k.status === "rate_limited" ? ` OpenRouter will be asked again after ${when(k.retryAt)}.` : ""}
                {k.status === "unauthorized" ? " It will not be retried until the key on the server changes." : ""}
                {" "}{hasNumbers ? `Showing the last successful snapshot from ${fmtDate(k.fetchedAt)}.` : "No earlier snapshot is available."}
              </p>
            )}
            {hasNumbers && k && (
              <div className="grid gap-3 sm:grid-cols-3" data-testid="openrouter-numbers">
                {stat("Total usage", fmtUsd(k.usage!), "stat-usage", "Spent on this key")}
                {stat("Spending limit", k.limit != null ? fmtUsd(k.limit) : k.unlimited ? "Unlimited" : "–", "stat-limit", k.limit != null && k.limitReset ? `Resets ${k.limitReset}` : undefined)}
                {stat("Remaining key budget", k.remaining != null ? fmtUsd(k.remaining) : k.unlimited ? "Unlimited" : "–", "stat-remaining", k.limit != null ? "Limit minus usage" : undefined)}
              </div>
            )}
            {hasNumbers && k && (k.usageDaily != null || k.usageWeekly != null || k.usageMonthly != null) && (
              <p className="mt-3 text-xs text-[#6B6259]" data-testid="openrouter-period">
                Usage period (UTC): {[k.usageDaily != null && `today ${fmtUsd(k.usageDaily)}`, k.usageWeekly != null && `this week ${fmtUsd(k.usageWeekly)}`, k.usageMonthly != null && `this month ${fmtUsd(k.usageMonthly)}`].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-1 text-xs text-[#6B6259]" data-testid="openrouter-refreshed">
              Last updated: {k?.fetchedAt ? fmtDate(k.fetchedAt) : "Never"}
              {k?.stale ? " (stale: the latest attempt failed)" : ""}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
