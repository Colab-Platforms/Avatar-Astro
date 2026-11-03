import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Empty, fmtDate, ghostBtn, inputClass, isoDay, PageHeader, Pager, personName, primaryBtn, Table } from "../ui";
import { CreateAccountDialog, DeleteDialog, EditAccountDialog, PasswordDialog, StatusDialog } from "../accounts/AccountDialogs";

interface UserRow {
  id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null;
  city: string | null; state: string | null; country: string | null; authProvider: string;
  isEmailVerified: boolean; isPhoneVerified: boolean; isActive: boolean; profileCompleted: boolean; createdAt: string; role: string;
  lastActiveAt: string | null; activityCount: number;
}
type Dlg = { type: "create" } | { type: "edit" | "password" | "status" | "delete"; user: UserRow };
interface UserList { items: UserRow[]; page: number; pageSize: number; total: number; totalPages: number }

const FILTER_KEYS = ["search", "status", "provider", "emailVerified", "phoneVerified", "registeredFrom", "registeredTo"] as const;
const providerLabel = (p: string) => (p === "GOOGLE" ? "Google" : "Email & password");

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [searchText, setSearchText] = useState(params.get("search") ?? "");

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const apiQuery = new URLSearchParams();
  for (const k of FILTER_KEYS) { const v = params.get(k); if (v) apiQuery.set(k, v); }
  apiQuery.set("page", String(page));
  apiQuery.set("pageSize", "15");
  const q = usePanel<UserList>(`/customers?${apiQuery.toString()}`, { placeholderData: (p) => p });
  const filtersActive = FILTER_KEYS.some((k) => params.get(k));

  const [dlg, setDlg] = useState<Dlg | null>(null);
  const done = (text: string) => setMsg({ ok: true, text });

  const sel = "w-auto min-w-[9rem]";
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Customers" subtitle="Normal customer accounts only. Administrators are managed separately under Admin Management. Filters live in the address bar, so a filtered view can be bookmarked or shared."
        actions={<button className={primaryBtn} onClick={() => setDlg({ type: "create" })}>Create customer</button>} />

      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ search: searchText.trim() || null }); }} aria-label="Customer filters">
        <label className="text-xs text-[#6B6259]">Search
          <input className={`${inputClass} mt-1 w-64`} placeholder="Name, email or phone" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
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
        <label className="text-xs text-[#6B6259]">Phone verified
          <select className={`${inputClass} ${sel} mt-1`} value={params.get("phoneVerified") ?? ""} onChange={(e) => set({ phoneVerified: e.target.value || null })}>
            <option value="">Any</option><option value="true">Verified</option><option value="false">Not verified</option>
          </select>
        </label>
        <label className="text-xs text-[#6B6259]">Registered from
          <input type="date" className={`${inputClass} ${sel} mt-1`} max={params.get("registeredTo") ?? isoDay(new Date())} value={params.get("registeredFrom") ?? ""} onChange={(e) => set({ registeredFrom: e.target.value || null })} />
        </label>
        <label className="text-xs text-[#6B6259]">Registered to
          <input type="date" className={`${inputClass} ${sel} mt-1`} min={params.get("registeredFrom") ?? undefined} max={isoDay(new Date())} value={params.get("registeredTo") ?? ""} onChange={(e) => set({ registeredTo: e.target.value || null })} />
        </label>
        <button className={ghostBtn} type="submit">Search</button>
        {filtersActive && <button type="button" className={ghostBtn} onClick={() => { setSearchText(""); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</button>}
      </form>

      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}

      <QueryView q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title={filtersActive ? "No customers match these filters" : "No customers yet"} hint={filtersActive ? "Try removing a filter." : "Registered customers will appear here. You can also create one with the button above."} />
          ) : (
            <>
              <Table head={["Customer", "Status", "Sign-in", "Verified", "Registered", "Last active", ""]}>
                {d.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">
                      <Link to={`/admin/customers/${u.id}`} className="text-left" aria-label={`Open profile of ${personName(u)}`}>
                        <span className="block font-medium text-[#1F1B16] hover:text-[#803003]">{personName({ ...u, email: null }) === "Unknown" ? "—" : personName({ ...u, email: null })}</span>
                        <span className="block text-xs text-[#6B6259]">{u.email}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">{u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</td>
                    <td className="px-3 py-2 text-xs">{providerLabel(u.authProvider)}</td>
                    <td className="px-3 py-2 text-xs">{[u.isEmailVerified && "Email", u.isPhoneVerified && "Phone"].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{u.lastActiveAt ? fmtDate(u.lastActiveAt) : <span className="text-[#756B61]">No activity</span>}</td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                      <Link className={ghostBtn} to={`/admin/customers/${u.id}`}>View</Link>
                      <button className={ghostBtn} onClick={() => setDlg({ type: "edit", user: u })}>Edit</button>
                      <button className={ghostBtn} onClick={() => setDlg({ type: "status", user: u })}>{u.isActive ? "Deactivate" : "Reactivate"}</button>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pager page={d.page} totalPages={d.totalPages} total={d.total} onPage={(p) => set({ page: String(p) })} />
            </>
          )
        }
      </QueryView>

      <CreateAccountDialog kind="customer" open={dlg?.type === "create"} onClose={() => setDlg(null)} onCreated={(email) => done(`Customer ${email} created. They verify their email the first time they sign in.`)} />
      {dlg && dlg.type === "edit" && <EditAccountDialog kind="customer" account={dlg.user} open onClose={() => setDlg(null)} onSaved={() => done("Customer updated.")} />}
      {dlg && dlg.type === "password" && <PasswordDialog kind="customer" account={dlg.user} open onClose={() => setDlg(null)} onDone={done} />}
      {dlg && dlg.type === "status" && <StatusDialog kind="customer" account={dlg.user} open onClose={() => setDlg(null)} onDone={done} />}
      {dlg && dlg.type === "delete" && <DeleteDialog kind="customer" account={dlg.user} open onClose={() => setDlg(null)} onDone={done} />}
    </div>
  );
}
