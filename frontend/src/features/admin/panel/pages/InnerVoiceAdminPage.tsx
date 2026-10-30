import { useState } from "react";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Bars, Card, Empty, fmtDate, PageHeader, Stat, Table } from "../ui";
import { ToolSwitch } from "./ToolsPage";

interface IV {
  windowDays: number;
  trackingSince: string | null;
  features: { key: string; label: string; group: string; mount: string; provider: string; enabled: boolean; usage: { total: number; errors: number; rejected: number; lastAt: string | null } }[];
  daily: { day: string; feature: string; total: number; errors: number }[];
  errors: { id: string; feature: string; statusCode: number; durationMs: number; createdAt: string }[];
  providers: { id: string; name: string; configured: boolean; model: string | null }[];
  browserOnly: string;
}

export default function InnerVoiceAdminPage() {
  const q = usePanel<IV>("/inner-voice");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Inner Voice" subtitle="Know Your Karma, AI Guru, Sacred Shloka and Future Life Path: configuration, real usage, errors and provider status." />
      {msg && <p role="status" className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">{msg}</p>}
      <QueryView q={q}>
        {(d) => {
          const byDay = new Map<string, number>();
          d.daily.forEach((r) => byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.total));
          const days = Array.from({ length: d.windowDays }, (_, i) => new Date(Date.now() - (d.windowDays - 1 - i) * 86_400_000).toISOString().slice(0, 10));
          const total = d.features.reduce((s, f) => s + f.usage.total, 0);
          const errors = d.features.reduce((s, f) => s + f.usage.errors, 0);
          return (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label={`Requests (${d.windowDays}d)`} value={total} hint={d.trackingSince ? `Tracked since ${fmtDate(d.trackingSince)}` : "No requests recorded yet"} />
                <Stat label="Failures" value={errors} tone={errors ? "bad" : "default"} />
                {d.providers.map((p) => (
                  <Stat key={p.id} label={p.name} value={p.configured ? "Configured" : "Missing key"} hint={p.model ? `Model: ${p.model}` : undefined} tone={p.configured ? "default" : "bad"} />
                ))}
              </div>
              <Card title="Requests per day" description={`Last ${d.windowDays} days, all Inner Voice features`}>
                {total === 0 ? <Empty title="No usage recorded yet" /> : <Bars label="Inner Voice requests per day" data={days.map((day) => ({ label: day, value: byDay.get(day) ?? 0 }))} />}
              </Card>
              <Card title="Features">
                <Table head={["Feature", "Enabled", "Requests", "Failures", "Last used"]}>
                  {d.features.map((f) => (
                    <tr key={f.key}>
                      <td className="px-3 py-2"><p className="font-medium">{f.label}</p><p className="font-mono text-xs text-[#6B6259]">{f.mount}</p></td>
                      <td className="px-3 py-2"><ToolSwitch tool={{ ...f, usage: f.usage }} onDone={setMsg} onError={setMsg} /></td>
                      <td className="px-3 py-2">{f.usage.total}</td>
                      <td className="px-3 py-2">{f.usage.errors ? <Badge tone="bad">{f.usage.errors}</Badge> : 0}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(f.usage.lastAt)}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
              <Card title="Recent errors">
                {d.errors.length === 0 ? <Empty title="No errors recorded" /> : (
                  <ul className="divide-y divide-[#EEE9E2] text-sm">
                    {d.errors.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{d.features.find((f) => f.key === e.feature)?.label ?? e.feature}</span>
                        <span className="flex items-center gap-3"><Badge tone="bad">{e.statusCode}</Badge><span className="text-xs">{e.durationMs} ms</span><span className="text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <p className="rounded-xl border border-dashed border-[#803003]/40 bg-[#FBF8F3] p-4 text-sm text-[#4A423A]">{d.browserOnly}</p>
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
