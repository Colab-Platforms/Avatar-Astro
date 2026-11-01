import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, Empty, fmtDate, ghostBtn, inputClass, isoDay, PageHeader, Pager, personName, primaryBtn, Stat, Table } from "../ui";
import { CreateAccountDialog, DeleteDialog, EditAccountDialog, PasswordDialog, StatusDialog } from "../accounts/AccountDialogs";

interface UserRow {
  id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null;
  city: string | null; state: string | null; country: string | null; authProvider: string;
  isEmailVerified: boolean; isPhoneVerified: boolean; isActive: boolean; profileCompleted: boolean; createdAt: string; role: string;
  lastActiveAt: string | null; activityCount: number;
}
type Dlg = { type: "create" } | { type: "edit" | "password" | "status" | "delete"; user: UserRow };
interface UserList { items: UserRow[]; page: number; pageSize: number; total: number; totalPages: number }
interface EventRow { id: string; eventType: string; feature?: string; status: string; statusCode?: number; metadata: Record<string, unknown> | null; createdAt: string; label?: string }
interface UserDetail extends UserRow {
  address: string | null; gender: string | null; dateOfBirth: string | null; profileImage: string | null; activeSessions: number;
  usageLast30Days: { feature: string; count: number }[];
  lastLoginAt: string | null;
  loginHistory: EventRow[];
  recentActivity: EventRow[];
  featureUsage: { feature: string; total: number; success: number; failed: number }[];
  eventCounts: { eventType: string; count: number }[];
  notStored: string[];
  credentialStatus: string;
  createdBy: { id: string; email: string; name: string | null } | null;
  library: { readings: number; saved: number; conversations: number };
  auditHistory: { id: string; actorEmail: string; action: string; summary: string; createdAt: string }[];
}

const FILTER_KEYS = ["search", "status", "provider", "emailVerified", "phoneVerified", "registeredFrom", "registeredTo"] as const;
const methodLabel = (m: unknown) => ({ password: "Email & password", google: "Google", otp: "Email code", phone_otp: "Phone code", email: "Email & password" } as Record<string, string>)[String(m)] ?? String(m ?? "—");
const providerLabel = (p: string) => (p === "GOOGLE" ? "Google" : "Email & password");

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full border border-[#E8E3DC] object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EEE6] text-sm font-semibold text-[#803003]">{initials}</span>
  );
}

function CustomerProfile({ id, onClose, onAction }: { id: string; onClose: () => void; onAction: (type: "edit" | "password" | "status" | "delete", u: UserDetail) => void }) {
  const q = usePanel<UserDetail>(`/customers/${id}`);
  return (
    <Card title="Customer profile" actions={<button className={ghostBtn} onClick={onClose}>Close</button>}>
      <QueryView q={q}>
        {(u) => {
          const name = personName(u);
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={name} src={u.profileImage} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-[#1F1B16]">{name}</p>
                  <p className="truncate text-sm text-[#6B6259]">{u.email}{u.phoneNo ? ` · ${u.phoneNo}` : ""}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
                    <Badge tone={u.role === "USER" ? "neutral" : "warn"}>{u.role}</Badge>
                    <Badge>{providerLabel(u.authProvider)}</Badge>
                    <Badge tone={u.isEmailVerified ? "good" : "warn"}>Email {u.isEmailVerified ? "verified" : "not verified"}</Badge>
                    <Badge tone={u.isPhoneVerified ? "good" : "warn"}>Phone {u.isPhoneVerified ? "verified" : "not verified"}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={ghostBtn} onClick={() => onAction("edit", u)}>Edit</button>
                  <button className={ghostBtn} onClick={() => onAction("password", u)} disabled={u.authProvider === "GOOGLE" && u.credentialStatus === "none (signs in with Google)"}>Reset password</button>
                  <button className={ghostBtn} onClick={() => onAction("status", u)}>{u.isActive ? "Deactivate" : "Reactivate"}</button>
                  <button className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700" onClick={() => onAction("delete", u)}>Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Registered" value={new Date(u.createdAt).toLocaleDateString()} />
                <Stat label="Last active" value={u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"} hint={u.lastActiveAt ? fmtDate(u.lastActiveAt) : "No activity recorded"} />
                <Stat label="Last sign-in" value={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"} hint={u.lastLoginAt ? fmtDate(u.lastLoginAt) : "No sign-in recorded since tracking began"} />
                <Stat label="Feature requests" value={u.featureUsage.reduce((s, f) => s + f.total, 0)} hint={`${u.activeSessions} active session${u.activeSessions === 1 ? "" : "s"}`} to={`/admin/activity?userId=${u.id}&eventType=feature.request`} />
              </div>

              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["Location", [u.city, u.state, u.country].filter(Boolean).join(", ") || "—"],
                  ["Gender", u.gender ?? "—"],
                  ["Date of birth", u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : "—"],
                  ["Profile completed", u.profileCompleted ? "Yes" : "No"],
                  ["Address", u.address ?? "—"],
                  ["Password", u.credentialStatus],
                  ["Created by", u.createdBy ? (u.createdBy.name ?? u.createdBy.email) : "Self-registered"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-[#6B6259]">{k}</dt><dd className="break-words">{v}</dd></div>
                ))}
              </dl>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Feature usage</h4>
                  {u.featureUsage.length === 0 ? <p className="text-sm text-[#6B6259]">No feature requests recorded.</p> : (
                    <Table head={["Feature", "Requests", "Succeeded", "Failed"]}>
                      {u.featureUsage.map((f) => (
                        <tr key={f.feature}>
                          <td className="px-3 py-2"><Link className="text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}&feature=${f.feature}`}>{f.feature}</Link></td>
                          <td className="px-3 py-2">{f.total}</td><td className="px-3 py-2">{f.success}</td><td className="px-3 py-2">{f.failed ? <Badge tone="bad">{f.failed}</Badge> : 0}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Sign-in history</h4>
                  {u.loginHistory.length === 0 ? <p className="text-sm text-[#6B6259]">No sign-ins recorded since tracking began.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.loginHistory.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span>
                            {e.eventType === "auth.register" ? "Account created" : e.eventType === "auth.login" ? "Signed in" : "Failed sign-in"}
                            <span className="text-[#6B6259]"> · {methodLabel(e.metadata?.method)}{e.metadata?.reason ? ` · ${String(e.metadata.reason).replace("_", " ")}` : ""}</span>
                          </span>
                          <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Readings, saved content and conversations</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Stored readings" value={u.library.readings} />
                  <Stat label="Saved" value={u.library.saved} />
                  <Stat label="Conversations" value={u.library.conversations} />
                </div>
                <p className="mt-1.5 text-xs text-[#6B6259]">Only counts are shown. The reading text and chat messages stay private to the customer. <Link className="text-[#803003] hover:underline" to="/admin/customer-library">Customer library overview</Link></p>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Account history</h4>
                {u.auditHistory.length === 0 ? <p className="text-sm text-[#6B6259]">No admin actions recorded for this account.</p> : (
                  <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                    {u.auditHistory.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span><Badge tone="warn">{h.action}</Badge> <span className="text-[#6B6259]">{h.summary} · by {h.actorEmail}</span></span>
                        <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(h.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Recent activity</h4>
                  <Link className="text-sm text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}`}>View all activity</Link>
                </div>
                {u.recentActivity.length === 0 ? <p className="text-sm text-[#6B6259]">No activity recorded for this customer.</p> : (
                  <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                    {u.recentActivity.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span>{e.label}{e.feature ? <span className="text-[#6B6259]"> · {e.feature}</span> : null} {e.status !== "success" && <Badge tone="bad">{e.status}</Badge>}</span>
                        <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <ul className="space-y-1 rounded-xl border border-dashed border-[#D8CFC3] bg-[#FBF8F3] p-3 text-xs text-[#6B6259]">
                {u.notStored.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          );
        }}
      </QueryView>
    </Card>
  );
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const selected = params.get("user");
  const [searchText, setSearchText] = useState(params.get("search") ?? "");

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch) && !("user" in patch)) next.delete("page");
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
        {filtersActive && <button type="button" className={ghostBtn} onClick={() => { setSearchText(""); setParams(new URLSearchParams(selected ? { user: selected } : {}), { replace: true }); }}>Clear filters</button>}
      </form>

      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}
      {selected && <CustomerProfile id={selected} onClose={() => set({ user: null })} onAction={(type, u) => setDlg({ type, user: u })} />}

      <QueryView q={q}>
        {(d) =>
          d.items.length === 0 ? (
            <Empty title={filtersActive ? "No customers match these filters" : "No customers yet"} hint={filtersActive ? "Try removing a filter." : "Registered customers will appear here. You can also create one with the button above."} />
          ) : (
            <>
              <Table head={["Customer", "Status", "Sign-in", "Verified", "Registered", "Last active", ""]}>
                {d.items.map((u) => (
                  <tr key={u.id} className={u.id === selected ? "bg-[#FBF8F3]" : ""}>
                    <td className="px-3 py-2">
                      <button type="button" className="text-left" onClick={() => set({ user: u.id })} aria-label={`Open profile of ${personName(u)}`}>
                        <span className="block font-medium text-[#1F1B16] hover:text-[#803003]">{personName({ ...u, email: null }) === "Unknown" ? "—" : personName({ ...u, email: null })}</span>
                        <span className="block text-xs text-[#6B6259]">{u.email}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2">{u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}</td>
                    <td className="px-3 py-2 text-xs">{providerLabel(u.authProvider)}</td>
                    <td className="px-3 py-2 text-xs">{[u.isEmailVerified && "Email", u.isPhoneVerified && "Phone"].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{u.lastActiveAt ? fmtDate(u.lastActiveAt) : <span className="text-[#756B61]">No activity</span>}</td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                      <button className={ghostBtn} onClick={() => set({ user: u.id })}>View</button>
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
      {dlg && dlg.type === "delete" && <DeleteDialog kind="customer" account={dlg.user} open onClose={() => setDlg(null)} onDone={(t) => { done(t); set({ user: null }); }} />}
    </div>
  );
}
