import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, inputClass, PageHeader, Pager, Table } from "../ui";

interface Settings { settings: { key: string; value: unknown; updatedAt: string }[]; environment: string; note: string }
interface Logs { items: { id: string; actorEmail: string; action: string; entityType: string; entityId: string | null; summary: string; ip: string | null; createdAt: string }[]; page: number; total: number; totalPages: number }

const ACTIONS = ["", "customer.create", "customer.update", "customer.deactivate", "customer.reactivate", "customer.password_reset", "customer.password_reset_link", "customer.delete", "admin.create", "admin.update", "admin.role_change", "admin.deactivate", "admin.reactivate", "admin.password_reset", "admin.password_reset_link", "admin.delete", "feature.toggle", "content.create", "content.update", "content.publish", "content.unpublish", "content.delete", "report.export"];

export default function SettingsAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "admin" ? "admin." : params.get("scope") === "customer" ? "customer." : "";
  const settings = usePanel<Settings>("/settings");
  const logs = usePanel<Logs>(`/audit-logs?page=${page}&pageSize=20${action ? `&action=${encodeURIComponent(action)}` : scope ? `&actionPrefix=${encodeURIComponent(scope)}` : ""}`, { placeholderData: (p) => p });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={scope === "admin." ? "Administrator activity" : "Settings & Audit Logs"} subtitle={scope === "admin." ? "Every action on administrator accounts (created, edited, role changes, password resets, deactivation, deletion), newest first." : "Platform settings stored by the panel, and an append-only record of sensitive admin actions."} />
      <QueryView q={settings}>
        {(s) => (
          <Card title="Platform settings" description={s.note}>
            <p className="mb-3 text-sm">Environment: <Badge>{s.environment}</Badge></p>
            {s.settings.length === 0 ? <Empty title="No overrides stored" hint="Everything is at its default (all features on)." /> : (
              <Table head={["Setting", "Value", "Updated"]}>
                {s.settings.map((x) => (
                  <tr key={x.key}><td className="px-3 py-2 font-mono text-xs">{x.key}</td><td className="px-3 py-2">{String(x.value)}</td><td className="px-3 py-2 text-xs">{fmtDate(x.updatedAt)}</td></tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </QueryView>
      <Card title={scope === "admin." ? "Administrator audit history" : scope === "customer." ? "Customer account audit history" : "Audit log"}>
        {scope && <p className="mb-3 text-sm text-[#6B6259]">Showing {scope === "admin." ? "administrator" : "customer"} account actions only. <button type="button" className="text-[#803003] hover:underline" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setPage(1); }}>Show all actions</button></p>}
        <label className="mb-3 block text-sm">Action
          <select className={`${inputClass} mt-1 max-w-xs`} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
          </select>
        </label>
        <QueryView q={logs}>
          {(l) => l.items.length === 0 ? <Empty title="No audit entries yet" hint="Entries appear when the main admin changes users, content, feature switches or exports data." /> : (
            <>
              <Table head={["When", "Admin", "Action", "Details", "IP"]}>
                {l.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{fmtDate(a.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{a.actorEmail}</td>
                    <td className="px-3 py-2"><Badge tone="warn">{a.action}</Badge></td>
                    <td className="px-3 py-2">{a.summary}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.ip ?? "—"}</td>
                  </tr>
                ))}
              </Table>
              <Pager page={l.page} totalPages={l.totalPages} total={l.total} onPage={setPage} />
            </>
          )}
        </QueryView>
      </Card>
    </div>
  );
}
