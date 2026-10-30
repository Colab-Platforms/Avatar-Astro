import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { panelSend, usePanel, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, fmtDate, NotConfigured, PageHeader, Table } from "../ui";

interface Tool {
  key: string; label: string; group: string; mount: string; provider: string; enabled: boolean;
  usage: { total: number; errors: number; rejected: number; lastAt: string | null };
}
interface ToolsData { windowDays: number; tools: Tool[]; unsupported: { key: string; label: string; reason: string }[] }

export function ToolSwitch({ tool, onDone, onError }: { tool: Tool; onDone: (m: string) => void; onError: (m: string) => void }) {
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

export default function ToolsPage() {
  const q = usePanel<ToolsData>("/tools");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Astrology Tools" subtitle="The backend features behind each tool. Switching one off makes its API answer 'temporarily unavailable' immediately (no deploy needed)." />
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}
      <QueryView q={q}>
        {(d) => (
          <>
            <Table head={["Tool", "Switch", `Requests (${d.windowDays}d)`, "Failures", "Rejected", "Last used", "Endpoint"]}>
              {d.tools.map((t) => (
                <tr key={t.key}>
                  <td className="px-3 py-2"><p className="font-medium">{t.label}</p><Badge tone={t.group === "inner-voice" ? "warn" : "neutral"}>{t.group === "inner-voice" ? "Inner Voice" : "Astrology"}</Badge></td>
                  <td className="px-3 py-2"><ToolSwitch tool={t} onDone={(m) => setMsg({ ok: true, text: m })} onError={(m) => setMsg({ ok: false, text: m })} /></td>
                  <td className="px-3 py-2">{t.usage.total}</td>
                  <td className="px-3 py-2">{t.usage.errors ? <Badge tone="bad">{t.usage.errors}</Badge> : 0}</td>
                  <td className="px-3 py-2">{t.usage.rejected}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(t.usage.lastAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.mount}</td>
                </tr>
              ))}
            </Table>
            <Card title="Not supported yet" description="Shown so nothing here looks configurable when it is not.">
              <div className="grid gap-3 sm:grid-cols-2">
                {d.unsupported.map((u) => <NotConfigured key={u.key} title={u.label} reason={u.reason} />)}
              </div>
            </Card>
          </>
        )}
      </QueryView>
    </div>
  );
}
