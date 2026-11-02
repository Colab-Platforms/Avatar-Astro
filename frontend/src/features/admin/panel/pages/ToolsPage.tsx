import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelSend, usePanel, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, fmtDate, NotConfigured, PageHeader, Table } from "../ui";
import { OpenRouterUsageCard } from "../OpenRouterUsageCard";

type Tool = {
  key: string; label: string; group: string; mount: string; provider: string; enabled: boolean;
  limitSupported: boolean; limit: number | null; endpoints: string[];
  usage: { total: number; errors: number; rejected: number; blocked: number; lastAt: string | null };
};
interface ToolsData { windowDays: number; limitWindowHours: number; countingRule: string; tools: Tool[]; unsupported: { key: string; label: string; reason: string }[] }

export function ToolSwitch({ tool, onDone, onError }: { tool: { key: string; label: string; enabled: boolean; [k: string]: unknown }; onDone: (m: string) => void; onError: (m: string) => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (enabled: boolean) => panelSend("PUT", `/tools/${tool.key}`, { enabled }),
    onSuccess: (_d, enabled) => { onDone(`${tool.label} ${enabled ? "enabled" : "disabled"}.`); qc.invalidateQueries({ queryKey: ["admin-panel"] }); },
    onError: (e) => onError(errorMessage(e)),
  });
  return (
    <button
      type="button"
      role="switch"
      aria-checked={tool.enabled}
      aria-label={`${tool.label} enabled`}
      disabled={m.isPending}
      onClick={() => {
        if (tool.enabled && !window.confirm(`Disable "${tool.label}"? Visitors will get a "temporarily unavailable" message.`)) return;
        m.mutate(!tool.enabled);
      }}
      className={`relative h-6 w-11 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E58A45] disabled:opacity-50 ${tool.enabled ? "bg-[#803003]" : "bg-[#301607]/30"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${tool.enabled ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Uses per signed-in user in any rolling 24 hours. Empty = unlimited. Saved to the database; applies to the next request. */
function LimitCell({ tool, onDone, onError }: { tool: Tool; onDone: (m: string) => void; onError: (m: string) => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string>(tool.limit == null ? "" : String(tool.limit));
  const dirty = draft !== (tool.limit == null ? "" : String(tool.limit));
  const m = useMutation({
    mutationFn: (limit: number | null) => panelSend("PUT", `/tools/${tool.key}`, { limit }),
    onSuccess: (_d, limit) => { onDone(limit === null ? `${tool.label}: no per-user limit.` : `${tool.label}: ${limit} uses per user per 24 hours.`); qc.invalidateQueries({ queryKey: ["admin-panel"] }); },
    onError: (e) => onError(errorMessage(e)),
  });
  if (!tool.limitSupported) return <span className="text-xs text-[#6B6259]" title="This tool has no metered endpoint">Not limited</span>;
  const parsed = draft.trim() === "" ? null : Number(draft);
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 100000);
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (!invalid && dirty) m.mutate(parsed); }}>
      <input
        type="number" inputMode="numeric" min={1} max={100000} step={1}
        value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Unlimited"
        aria-label={`${tool.label} uses per user per 24 hours`} aria-invalid={invalid}
        className={`w-28 rounded-md border px-2 py-1 text-sm ${invalid ? "border-red-500" : "border-[#301607]/25"}`}
      />
      <button type="submit" disabled={!dirty || invalid || m.isPending} aria-label={`Save ${tool.label} limit`}
        className="rounded-md bg-[#803003] px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">{m.isPending ? "…" : "Save"}</button>
    </form>
  );
}

export default function ToolsPage() {
  const q = usePanel<ToolsData>("/tools");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (m: string) => setMsg({ ok: true, text: m });
  const fail = (m: string) => setMsg({ ok: false, text: m });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Astrology Tools" subtitle="Switch tools on or off and set how many times each signed-in user can use them in any rolling 24 hours. Changes are saved to the database and apply to the next request (no deploy needed)." />
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}
      <QueryView q={q}>
        {(d) => {
          const astro = d.tools.filter((t) => t.group === "astrology");
          const other = d.tools.filter((t) => t.group !== "astrology");
          return (
            <>
              <Table head={["Tool", "Switch", "Limit / User / 24h", `Requests (${d.windowDays}d)`, "Failures", "Rejected", "Last Used", "Endpoint"]}>
                {astro.map((t) => (
                  <tr key={t.key} data-testid={`tool-row-${t.key}`}>
                    <td className="px-3 py-2"><p className="font-medium">{t.label}</p></td>
                    <td className="px-3 py-2"><ToolSwitch tool={t} onDone={done} onError={fail} /></td>
                    <td className="px-3 py-2"><LimitCell key={`${t.key}-${t.limit}`} tool={t} onDone={done} onError={fail} /></td>
                    <td className="px-3 py-2">{t.usage.total}</td>
                    <td className="px-3 py-2">{t.usage.errors ? <Badge tone="bad">{t.usage.errors}</Badge> : 0}</td>
                    <td className="px-3 py-2" title="Turned away because the tool was off or the user reached the limit">{t.usage.blocked}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(t.usage.lastAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.endpoints.map((e) => <p key={e}>{e}</p>)}</td>
                  </tr>
                ))}
              </Table>
              <p className="text-xs text-[#6B6259]" data-testid="counting-rule"><strong>How uses are counted:</strong> {d.countingRule} Rejected = turned away because the tool was off or the limit was reached. Limits apply to signed-in users only (by account, not IP), so a limited tool asks visitors to sign in.</p>
              {other.length > 0 && (
                <Card title="Other features" description="Switch only. These have no per-user limit here.">
                  <div className="divide-y divide-[#301607]/10">
                    {other.map((t) => (
                      <div key={t.key} className="flex items-center justify-between gap-3 py-2">
                        <div><p className="font-medium">{t.label}</p><p className="font-mono text-xs text-[#6B6259]">{t.mount} · {t.usage.total} requests ({d.windowDays}d)</p></div>
                        <ToolSwitch tool={t} onDone={done} onError={fail} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <OpenRouterUsageCard />
              {d.unsupported.length > 0 && (
                <Card title="Not supported yet" description="Shown so nothing here looks configurable when it is not.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {d.unsupported.map((u) => <NotConfigured key={u.key} title={u.label} reason={u.reason} />)}
                  </div>
                </Card>
              )}
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
