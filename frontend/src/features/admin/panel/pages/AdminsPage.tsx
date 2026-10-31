import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, ghostBtn, inputClass, PageHeader, Pager, personName, primaryBtn, Stat, Table } from "../ui";
import { CreateAccountDialog, DeleteDialog, EditAccountDialog, PasswordDialog, StatusDialog } from "../accounts/AccountDialogs";

interface AdminRow {
  id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null; authProvider: string;
  isEmailVerified: boolean; isPhoneVerified: boolean; isActive: boolean; createdAt: string; role: string;
  lastActiveAt: string | null; lastLoginAt: string | null;
}
interface AdminList { items: AdminRow[]; page: number; pageSize: number; total: number; totalPages: number; stats: { total: number; active: number; deactivated: number; superAdmins: number } }
interface AuditRow { id: string; actorEmail: string; action: string; summary: string; createdAt: string }
interface AdminDetail extends AdminRow {
  createdBy: { id: string; email: string; name: string | null } | null;
  credentialStatus: string;
  auditHistory: AuditRow[];
  recentAdminActions: { id: string; action: string; summary: string; createdAt: string }[];
  loginHistory: { id: string; eventType: string; status: string; metadata: Record<string, unknown> | null; createdAt: string }[];
}
type Dlg = { type: "create" } | { type: "edit" | "password" | "status" | "delete"; user: AdminRow };

const FILTER_KEYS = ["search", "role", "status", "provider", "emailVerified"] as const;
const providerLabel = (p: string) => (p === "GOOGLE" ? "Google" : "Email & password");
const roleTone = (r: string) => (r === "SUPERADMIN" ? "warn" : "neutral");

function AdminProfile({ id, selfId, onClose, onAction }: { id: string; selfId?: string; onClose: () => void; onAction: (type: "edit" | "password" | "status" | "delete", u: AdminDetail) => void }) {
  const q = usePanel<AdminDetail>(`/admins/${id}`);
  return (
    <Card title="Administrator details" actions={<button className={ghostBtn} onClick={onClose}>Close</button>}>
      <QueryView q={q}>
        {(u) => {
          const self = u.id === selfId;
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-[#1F1B16]">{personName(u)}{self ? " (you)" : ""}</p>
                  <p className="truncate text-sm text-[#6B6259]">{u.email}{u.phoneNo ? ` · ${u.phoneNo}` : ""}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                    {u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
                    <Badge>{providerLabel(u.authProvider)}</Badge>
                    <Badge tone={u.isEmailVerified ? "good" : "warn"}>Email {u.isEmailVerified ? "verified" : "not verified"}</Badge>
                    <Badge tone={u.isPhoneVerified ? "good" : "warn"}>Phone {u.isPhoneVerified ? "verified" : "not verified"}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={ghostBtn} onClick={() => onAction("edit", u)}>Edit</button>
                  {!self && <button className={ghostBtn} onClick={() => onAction("password", u)}>Reset password</button>}
                  {!self && <button className={ghostBtn} onClick={() => onAction("status", u)}>{u.isActive ? "Deactivate" : "Reactivate"}</button>}
                  {!self && <button className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700" onClick={() => onAction("delete", u)}>Delete</button>}
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["Registered", fmtDate(u.createdAt)],
                  ["Last active", u.lastActiveAt ? fmtDate(u.lastActiveAt) : "No activity recorded"],
                  ["Last login", u.lastLoginAt ? fmtDate(u.lastLoginAt) : "No sign-in recorded"],
                  ["Created by", u.createdBy ? (u.createdBy.name ?? u.createdBy.email) : "Existing account (not created from the panel)"],
                  ["Password", u.credentialStatus],
                ] as [string, string][]).map(([k, v]) => <div key={k}><dt className="text-xs text-[#6B6259]">{k}</dt><dd className="break-words">{v}</dd></div>)}
              </dl>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Recent actions by this administrator</h4>
                  {u.recentAdminActions.length === 0 ? <p className="text-sm text-[#6B6259]">No admin actions recorded.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.recentAdminActions.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2"><span><Badge tone="warn">{a.action}</Badge> <span className="text-[#6B6259]">{a.summary}</span></span><span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(a.createdAt)}</span></li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Audit history of this account</h4>
                  {u.auditHistory.length === 0 ? <p className="text-sm text-[#6B6259]">Nothing recorded yet.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.auditHistory.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2"><span><Badge tone="warn">{a.action}</Badge> <span className="text-[#6B6259]">{a.summary} · by {a.actorEmail}</span></span><span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(a.createdAt)}</span></li>)}
                    </ul>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#6B6259]">Passwords and tokens are never shown. <Link className="text-[#803003] hover:underline" to="/admin/settings?scope=admin">All administrator activity</Link></p>
            </div>
          );
        }}
      </QueryView>
    </Card>
  );
}

export default function AdminsPage() {
  const [params, setParams] = useSearchParams();
  const selfId = useAuthStore((s) => s.user?.id);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const selected = params.get("admin");
  const [searchText, setSearchText] = useState(params.get("search") ?? "");
  const done = (text: string) => setMsg({ ok: true, text });

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch) && !("admin" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  const apiQuery = new URLSearchParams();
  for (const k of FILTER_KEYS) { const v = params.get(k); if (v) apiQuery.set(k, v); }
  apiQuery.set("page", String(page));
  apiQuery.set("pageSize", "15");
  const q = usePanel<AdminList>(`/admins?${apiQuery.toString()}`, { placeholderData: (p) => p });
  const filtersActive = FILTER_KEYS.some((k) => params.get(k));
  const sel = "w-auto min-w-[9rem]";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Admin Management" subtitle="ADMIN and SUPERADMIN accounts only. Customers are managed separately under Customers. Only a SUPERADMIN can create, change or remove administrators."
        actions={<button className={primaryBtn} onClick={() => setDlg({ type: "create" })}>Create administrator</button>} />

      <QueryView q={q}>
        {(d) => (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total administrators" value={d.stats.total} />
            <Stat label="Active administrators" value={d.stats.active} />
            <Stat label="Deactivated administrators" value={d.stats.deactivated} tone={d.stats.deactivated ? "bad" : "default"} />
            <Stat label="SUPERADMIN accounts" value={d.stats.superAdmins} />
          </div>
        )}
      </QueryView>

      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ search: searchText.trim() || null }); }} aria-label="Administrator filters">
        <label className="text-xs text-[#6B6259]">Search
          <input className={`${inputClass} mt-1 w-64`} placeholder="Name, email or phone" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </label>
        <label className="text-xs text-[#6B6259]">Role
          <select className={`${inputClass} ${sel} mt-1`} value={params.get("role") ?? ""} onChange={(e) => set({ role: e.target.value || null })}>
            <option value="">All</option><option value="ADMIN">ADMIN</option><option value="SUPERADMIN">SUPERADMIN</option>
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Status
          <select className={`${inputClass} ${sel} mt-1`} value={params.get("status") ?? ""} onChange={(e) => set({ status: e.target.value || null })}>
            <option value="">All</option><option value="active">Active</option><option value="inactive">Deactivated</option>
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Sign-in method
          <select className={`${inputClass} ${sel} mt-1`} value={params.get("provider") ?? ""} onChange={(e) => set({ provider: e.target.value || null })}>
            <option value="">All</option><option value="LOCAL">Email & password</option><option value="GOOGLE">Google</option>
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Email verified
          <select className={`${inputClass} ${sel} mt-1`} value={params.get("emailVerified") ?? ""} onChange={(e) => set({ emailVerified: e.target.value || null })}>
            <option value="">Any</option><option value="true">Verified</option><option value="false">Not verified</option>
          </select>
        </label>
        <button className={ghostBtn} type="submit">Search</button>
        {filtersActive && <button type="button" className={ghostBtn} onClick={() => { setSearchText(""); setParams(new URLSearchParams(selected ? { admin: selected } : {}), { replace: true }); }}>Clear filters</button>}
      </form>

      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
      {selected && <AdminProfile id={selected} selfId={selfId} onClose={() => set({ admin: null })} onAction={(type, u) => setDlg({ type, user: u })} />}

      <QueryView q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title={filtersActive ? "No administrators match these filters" : "No administrators yet"} hint={filtersActive ? "Try removing a filter." : "Use Create administrator to add one."} />
          ) : (
            <>
              <Table head={["Administrator", "Role", "Status", "Sign-in", "Email", "Registered", "Last active", "Last login", ""]}>
                {d.items.map((u) => (
                  <tr key={u.id} className={u.id === selected ? "bg-[#FBF8F3]" : ""}>
                    <td className="px-3 py-2">
                      <button type="button" className="text-left" onClick={() => set({ admin: u.id })} aria-label={`Open details of ${personName(u)}`}>
                        <span className="block font-medium text-[#1F1B16] hover:text-[#803003]">{personName({ ...u, email: null }) === "Unknown" ? "—" : personName({ ...u, email: null })}{u.id === selfId ? " (you)" : ""}</span>
                        <span className="block text-xs text-[#6B6259]">{u.email}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2"><Badge tone={roleTone(u.role)}>{u.role}</Badge></td>
                    <td className="px-3 py-2">{u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</td>
                    <td className="px-3 py-2 text-xs">{providerLabel(u.authProvider)}</td>
                    <td className="px-3 py-2 text-xs">{u.isEmailVerified ? "Verified" : "Not verified"}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{u.lastActiveAt ? fmtDate(u.lastActiveAt) : <span className="text-[#756B61]">No activity</span>}</td>
                    <td className="px-3 py-2 text-xs">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : <span className="text-[#756B61]">—</span>}</td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                      <button className={ghostBtn} onClick={() => set({ admin: u.id })}>View</button>
                      <button className={ghostBtn} onClick={() => setDlg({ type: "edit", user: u })}>Edit</button>
                      {u.id !== selfId && <button className={ghostBtn} onClick={() => setDlg({ type: "status", user: u })}>{u.isActive ? "Deactivate" : "Reactivate"}</button>}
                    </td>
                  </tr>
                ))}
              </Table>
              <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )
        }
      </QueryView>

      <CreateAccountDialog kind="admin" open={dlg?.type === "create"} onClose={() => setDlg(null)} onCreated={(email) => done(`Administrator ${email} created. They sign in on the normal sign-in page and verify their email once.`)} />
      {dlg && dlg.type === "edit" && <EditAccountDialog kind="admin" account={dlg.user} self={dlg.user.id === selfId} open onClose={() => setDlg(null)} onSaved={() => done("Administrator updated.")} />}
      {dlg && dlg.type === "password" && <PasswordDialog kind="admin" account={dlg.user} open onClose={() => setDlg(null)} onDone={done} />}
      {dlg && dlg.type === "status" && <StatusDialog kind="admin" account={dlg.user} open onClose={() => setDlg(null)} onDone={done} />}
      {dlg && dlg.type === "delete" && <DeleteDialog kind="admin" account={dlg.user} open onClose={() => setDlg(null)} onDone={(t) => { done(t); set({ admin: null }); }} />}
    </div>
  );
}
