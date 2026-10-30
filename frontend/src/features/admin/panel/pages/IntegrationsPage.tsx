import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, fmtDate, PageHeader, Table } from "../ui";

interface Provider {
  id: string; name: string; model: string | null; configured: boolean; masked: string | null; envVar?: string; issues?: string[];
  detail?: { fromEmail: string | null; supportEmail: string | null };
  usage: { requests: number; errors: number } | null;
  lastSuccessAt?: string | null; lastFailureAt?: string | null;
}
interface Data {
  windowDays: number;
  database: { name: string; ok: boolean; latencyMs: number | null; error?: string; kind?: string; host?: string | null };
  providers: Provider[];
  security: { jwtSecretConfigured: boolean; jwtSecretStrong: boolean; mainAdminEmailPinned: boolean };
  note: string;
}

export default function IntegrationsPage() {
  const q = usePanel<Data>("/integrations");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="AI & integrations" subtitle="What THIS backend process is configured with, read from its environment when you open the page. Secret keys never leave the server." />
      <QueryView q={q}>
        {(d) => {
          const local = d.database.kind === "local";
          const missing = d.providers.filter((p) => !p.configured).length;
          return (
            <>
              <Card title="Database this admin panel is looking at" description="Customers and activity shown everywhere in this panel come from this database only.">
                <p className="flex flex-wrap items-center gap-3 text-sm">
                  {d.database.ok ? <Badge tone="good">Reachable</Badge> : <Badge tone="bad">Unreachable</Badge>}
                  <span>{d.database.name} · {d.database.kind ?? "unknown"}{d.database.host ? ` (${d.database.host})` : ""}</span>
                  {d.database.latencyMs !== null && <span className="text-[#6B6259]">{d.database.latencyMs} ms for a test query</span>}
                </p>
                {local && (
                  <p className="mt-3 rounded-lg bg-[#FBF8F3] p-3 text-xs leading-relaxed text-[#6B6259]">
                    This is a <strong>local test database</strong>. Accounts created while running a different backend or against another database (for example Google sign-ups on your usual dev server) are stored there, not here, so they will not appear in this panel.
                  </p>
                )}
              </Card>

              {local && missing > 0 && (
                <p role="note" className="rounded-xl border border-dashed border-[#D8CFC3] bg-[#FBF8F3] p-3 text-sm text-[#4A423A]">
                  Local test mode starts every provider <strong>switched off on purpose</strong>, so “Not set” below can be accurate for this process even if your normal backend has keys. To use providers you configured in <code className="font-mono text-xs">backend/.env</code>, start the local backend with, for example, <code className="font-mono text-xs">npm run local:backend -- --with=openrouter,groq,sarvam,google</code> (this makes real provider calls).
                </p>
              )}

              <Card title="Providers" description={`“Configured” only means a key is present. The last real success and failure come from recorded requests (last ${d.windowDays} days for the counts). No test calls are made from this page.`}>
                <Table head={["Integration", "Status", "Key", "Model", `Requests (${d.windowDays}d)`, "Failures", "Last success", "Last failure"]}>
                  {d.providers.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{p.name}</p>
                        {p.envVar && <p className="font-mono text-[11px] text-[#9A9086]">{p.envVar}</p>}
                        {p.detail && <p className="text-xs text-[#6B6259]">From: {p.detail.fromEmail ?? "not set"} · Support: {p.detail.supportEmail ?? "not set"}</p>}
                        {(p.issues ?? []).map((i) => <p key={i} className="text-xs text-amber-800">{i}</p>)}
                      </td>
                      <td className="px-3 py-2">{p.configured ? <Badge tone="good">Configured</Badge> : <Badge tone="bad">Not configured</Badge>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.masked ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{p.model ?? "—"}</td>
                      <td className="px-3 py-2">{p.usage ? p.usage.requests : "n/a"}</td>
                      <td className="px-3 py-2">{p.usage ? (p.usage.errors ? <Badge tone="bad">{p.usage.errors}</Badge> : 0) : "n/a"}</td>
                      <td className="px-3 py-2 text-xs">{p.usage ? (p.lastSuccessAt ? fmtDate(p.lastSuccessAt) : p.configured ? <span className="text-[#9A9086]">None recorded yet</span> : "—") : "n/a"}</td>
                      <td className="px-3 py-2 text-xs">{p.usage ? (p.lastFailureAt ? fmtDate(p.lastFailureAt) : "None recorded") : "n/a"}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
              <Card title="Security configuration">
                <ul className="space-y-1 text-sm">
                  <li>JWT secret: {d.security.jwtSecretConfigured ? (d.security.jwtSecretStrong ? <Badge tone="good">Set</Badge> : <Badge tone="warn">Set but shorter than 32 characters</Badge>) : <Badge tone="bad">Missing</Badge>}</li>
                  <li>Main admin pinned to one email (MAIN_ADMIN_EMAIL): {d.security.mainAdminEmailPinned ? <Badge tone="good">Yes</Badge> : <Badge>No (any SUPERADMIN account)</Badge>}</li>
                </ul>
              </Card>
              <p className="text-xs text-[#6B6259]">{d.note}</p>
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
