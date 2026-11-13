import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePanel } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, fmtDate, ghostBtn, PageHeader, personName, Stat, Table } from "../ui";
import { CreateAccountDialog, DeleteDialog, EditAccountDialog, PasswordDialog, StatusDialog } from "../accounts/AccountDialogs";
import { CustomerWalletCard } from "../accounts/CustomerWalletCard";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null;
  city: string | null; state: string | null; country: string | null; authProvider: string;
  isEmailVerified: boolean; isPhoneVerified: boolean; isActive: boolean; profileCompleted: boolean; createdAt: string; role: string;
}
interface EventRow { id: string; eventType: string; feature?: string; status: string; statusCode?: number; metadata: Record<string, unknown> | null; createdAt: string; label?: string }
interface RateLimitRow { tool: string; label: string; limit: number; used: number; windowHours: number }
type Dlg = { type: "edit" | "password" | "status" | "delete" };
interface UserDetail extends UserRow {
  address: string | null; gender: string | null; dateOfBirth: string | null; profileImage: string | null; activeSessions: number;
  usageLast30Days: { feature: string; count: number }[];
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  loginHistory: EventRow[];
  recentActivity: EventRow[];
  featureUsage: { feature: string; total: number; success: number; failed: number }[];
  eventCounts: { eventType: string; count: number }[];
  rateLimits: RateLimitRow[];
  notStored: string[];
  credentialStatus: string;
  createdBy: { id: string; email: string; name: string | null } | null;
  library: { readings: number; saved: number; conversations: number };
  auditHistory: { id: string; actorEmail: string; action: string; summary: string; createdAt: string }[];
}

const methodLabel = (m: unknown) => ({ password: "Email & password", google: "Google", otp: "Email code", phone_otp: "Phone code", email: "Email & password" } as Record<string, string>)[String(m)] ?? String(m ?? "—");
const providerLabel = (p: string) => (p === "GOOGLE" ? "Google" : "Email & password");

const FEATURE_INFO: Record<string, { title: string; category?: string }> = {
  tarot: { title: "AI Tarot Reading", category: "Astrology" },
  "birth-chart": { title: "Birth Chart (Kundali)", category: "Astrology" },
  compatibility: { title: "Compatibility (Kundali Milan)", category: "Astrology" },
  "name-analysis": { title: "Name Destiny Report", category: "Astrology" },
  interpretation: { title: "Horoscope & Interpretation", category: "Astrology" },
  "palm-reading": { title: "Palm Reading", category: "Astrology" },
  zodiac: { title: "Zodiac Signs", category: "Astrology" },
  gemstone: { title: "Ratna Jyotish (Gemstones)", category: "Astrology" },
  "ai-chat": { title: "Spiritual AI Chat", category: "Inner Voice" },
  "inner-voice": { title: "Future Life Path", category: "Inner Voice" },
  tts: { title: "Voice Audio (TTS)", category: "Inner Voice" },
};

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full border border-[#E8E3DC] object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4EEE6] text-base font-semibold text-[#803003]">{initials}</span>
  );
}

export default function CustomerDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const q = usePanel<UserDetail>(`/customers/${id}`);
  const done = (text: string) => setMsg({ ok: true, text });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Customer profile"
        subtitle="Full account record: login details, tool usage, rate limits and admin history."
        actions={
          <Link className={ghostBtn} to="/admin/customers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to customers
          </Link>
        }
      />

      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg.text}</p>}

      <QueryView q={q}>
        {(u) => {
          const name = personName(u);
          const totalRequests = u.featureUsage.reduce((s, f) => s + f.total, 0);
          const totalSuccess = u.featureUsage.reduce((s, f) => s + f.success, 0);
          const totalFailed = u.featureUsage.reduce((s, f) => s + f.failed, 0);
          const overallSuccessRate = totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 100) : 100;

          return (
            <div className="space-y-6">
              {/* Account Identity Card */}
              <Card>
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
                    <button className={ghostBtn} onClick={() => setDlg({ type: "edit" })}>Edit</button>
                    <button className={ghostBtn} onClick={() => setDlg({ type: "password" })} disabled={u.authProvider === "GOOGLE" && u.credentialStatus === "none (signs in with Google)"}>Reset password</button>
                    <button className={ghostBtn} onClick={() => setDlg({ type: "status" })}>{u.isActive ? "Deactivate" : "Reactivate"}</button>
                    <button className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700" onClick={() => setDlg({ type: "delete" })}>Delete</button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="Registered" value={new Date(u.createdAt).toLocaleDateString()} />
                  <Stat label="Last active" value={u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"} hint={u.lastActiveAt ? fmtDate(u.lastActiveAt) : "No activity recorded"} />
                  <Stat label="Last sign-in" value={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"} hint={u.lastLoginAt ? fmtDate(u.lastLoginAt) : "No sign-in recorded since tracking began"} />
                  <Stat label="Feature requests" value={totalRequests} hint={`${u.activeSessions} active session${u.activeSessions === 1 ? "" : "s"}`} to={`/admin/activity?userId=${u.id}&eventType=feature.request`} />
                </div>

                <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {([
                    ["Location", [u.city, u.state, u.country].filter(Boolean).join(", ") || "—"],
                    ["Gender", u.gender ?? "—"],
                    ["Date of birth", u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : "—"],
                    ["Profile completed", u.profileCompleted ? "Yes" : "No"],
                    ["Address", u.address ?? "—"],
                    ["Password", u.credentialStatus],
                    ["Created by", u.createdBy ? (u.createdBy.name ?? u.createdBy.email) : "Self-registered"],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-medium text-[#6B6259]">{k}</dt>
                      <dd className="mt-0.5 break-words font-medium text-[#1F1B16]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              {/* Coin Wallet & Ledger */}
              <CustomerWalletCard userId={u.id} userName={name} />

              {/* Rate Limits */}
              <Card
                title="Rate limits"
                description="Uses per rolling 24-hour window, per tool. Only metered tools with a configured limit are shown."
              >
                {u.rateLimits.length === 0 ? (
                  <p className="text-sm text-[#6B6259]">No per-user limits are configured, or this account has not used a limited tool.</p>
                ) : (
                  <>
                    <Table head={["Tool", "Used", "Limit", "Window", "Status"]}>
                      {u.rateLimits.map((r) => {
                        const isAtLimit = r.used >= r.limit;
                        const percentUsed = r.limit > 0 ? Math.min(100, Math.round((r.used / r.limit) * 100)) : 0;
                        return (
                          <tr key={r.tool}>
                            <td className="px-3 py-2.5 font-medium text-[#1F1B16]">{r.label}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                {isAtLimit ? <Badge tone="bad">{r.used}</Badge> : <span className="tabular-nums font-semibold text-[#1F1B16]">{r.used}</span>}
                                <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[#EEE9E2] sm:block" title={`${percentUsed}% used`}>
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      isAtLimit ? "bg-red-500" : percentUsed >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${percentUsed}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 tabular-nums text-[#1F1B16]">{r.limit}</td>
                            <td className="px-3 py-2.5 text-xs text-[#6B6259]">{r.windowHours}h</td>
                            <td className="px-3 py-2.5">
                              {isAtLimit ? (
                                <Badge tone="bad">Limit reached</Badge>
                              ) : r.used > 0 ? (
                                <Badge tone="neutral">{r.limit - r.used} left ({percentUsed}%)</Badge>
                              ) : (
                                <Badge tone="good">Available</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Table>
                    <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#6B6259]">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        <span><strong className="font-medium text-[#1F1B16]">Red badge / Limit reached:</strong> Customer has reached their 24-hour quota and is temporarily restricted on that tool until the window resets.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        <span><strong className="font-medium text-[#1F1B16]">Available:</strong> Normal usage within limit.</span>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* Feature Usage (Full Width for clear layout and rich data) */}
              <Card
                title="Feature usage"
                description="Summary of all astrological calculations, tarot readings, and AI queries executed by this customer."
                actions={
                  <Link className="text-xs font-medium text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}&eventType=feature.request`}>
                    View all feature activity →
                  </Link>
                }
              >
                {u.featureUsage.length === 0 ? (
                  <p className="text-sm text-[#6B6259]">No feature requests recorded.</p>
                ) : (
                  <Table head={["Feature", "Requests", "Succeeded", "Failed", "Success rate", "Activity"]}>
                    {u.featureUsage.map((f) => {
                      const info = FEATURE_INFO[f.feature];
                      const displayName = info?.title ?? f.feature.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                      const rate = f.total > 0 ? Math.round((f.success / f.total) * 100) : 100;
                      return (
                        <tr key={f.feature}>
                          <td className="px-3 py-2.5">
                            <Link className="font-medium text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}&feature=${f.feature}`}>
                              {displayName}
                            </Link>
                            <p className="text-xs text-[#6B6259]">{f.feature}</p>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums font-semibold text-[#1F1B16]">{f.total}</td>
                          <td className="px-3 py-2.5 tabular-nums text-emerald-800 font-semibold">{f.success}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {f.failed > 0 ? <Badge tone="bad">{f.failed}</Badge> : <span className="text-[#8C8379]">0</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-xs font-medium">{rate}%</span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EEE9E2]">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    rate === 100 ? "bg-emerald-500" : rate >= 80 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#803003] hover:underline"
                              to={`/admin/activity?userId=${u.id}&feature=${f.feature}`}
                            >
                              Logs <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#FAF8F5] text-xs font-semibold text-[#1F1B16]">
                      <td className="px-3 py-2.5">Total across all features</td>
                      <td className="px-3 py-2.5 tabular-nums">{totalRequests}</td>
                      <td className="px-3 py-2.5 tabular-nums text-emerald-800">{totalSuccess}</td>
                      <td className="px-3 py-2.5 tabular-nums">{totalFailed > 0 ? <Badge tone="bad">{totalFailed}</Badge> : "0"}</td>
                      <td className="px-3 py-2.5 tabular-nums">{overallSuccessRate}% overall</td>
                      <td className="px-3 py-2.5">
                        <Link className="text-xs font-medium text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}&eventType=feature.request`}>
                          All logs →
                        </Link>
                      </td>
                    </tr>
                  </Table>
                )}
              </Card>

              {/* 2-column grid for Sign-in history and Stored Readings */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Sign-in history">
                  {u.loginHistory.length === 0 ? <p className="text-sm text-[#6B6259]">No sign-ins recorded since tracking began.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.loginHistory.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <span className="min-w-0 truncate">
                            <span className="font-medium text-[#1F1B16]">
                              {e.eventType === "auth.register" ? "Account created" : e.eventType === "auth.login" ? "Signed in" : "Failed sign-in"}
                            </span>
                            <span className="text-[#6B6259]"> · {methodLabel(e.metadata?.method)}{e.metadata?.reason ? ` · ${String(e.metadata.reason).replace("_", " ")}` : ""}</span>
                          </span>
                          <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card
                  title="Readings, saved content and conversations"
                  actions={<Link className="text-xs font-medium text-[#803003] hover:underline" to="/admin/customer-library">Customer library overview →</Link>}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Stored readings" value={u.library.readings} />
                    <Stat label="Saved" value={u.library.saved} />
                    <Stat label="Conversations" value={u.library.conversations} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#6B6259]">
                    Only counts are shown. The reading text and chat messages stay private to the customer.
                  </p>
                </Card>
              </div>

              {/* 2-column grid for Account history and Recent activity */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Account history">
                  {u.auditHistory.length === 0 ? <p className="text-sm text-[#6B6259]">No admin actions recorded for this account.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.auditHistory.map((h) => (
                        <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <span className="min-w-0 truncate">
                            <Badge tone="warn">{h.action}</Badge> <span className="text-[#6B6259]">{h.summary} · by {h.actorEmail}</span>
                          </span>
                          <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(h.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card
                  title="Recent activity"
                  actions={<Link className="text-xs font-medium text-[#803003] hover:underline" to={`/admin/activity?userId=${u.id}`}>View all activity →</Link>}
                >
                  {u.recentActivity.length === 0 ? <p className="text-sm text-[#6B6259]">No activity recorded for this customer.</p> : (
                    <ul className="divide-y divide-[#EEE9E2] rounded-xl border border-[#E8E3DC] text-sm">
                      {u.recentActivity.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <span className="min-w-0 truncate">
                            <span className="font-medium text-[#1F1B16]">{e.label}</span>
                            {e.feature ? <span className="text-[#6B6259]"> · {FEATURE_INFO[e.feature]?.title ?? e.feature}</span> : null}{" "}
                            {e.status !== "success" && <Badge tone="bad">{e.status}</Badge>}
                          </span>
                          <span className="shrink-0 text-xs text-[#6B6259]">{fmtDate(e.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              {/* Platform notices */}
              {u.notStored && u.notStored.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-4 text-xs text-[#6B6259]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8C8379]" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-medium text-[#1F1B16]">Platform notice</p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {u.notStored.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <CreateAccountDialog kind="customer" open={false} onClose={() => {}} onCreated={() => {}} />
              <EditAccountDialog kind="customer" account={u} open={dlg?.type === "edit"} onClose={() => setDlg(null)} onSaved={() => done("Customer updated.")} />
              <PasswordDialog kind="customer" account={u} open={dlg?.type === "password"} onClose={() => setDlg(null)} onDone={done} />
              <StatusDialog kind="customer" account={u} open={dlg?.type === "status"} onClose={() => setDlg(null)} onDone={done} />
              <DeleteDialog kind="customer" account={u} open={dlg?.type === "delete"} onClose={() => setDlg(null)} onDone={() => navigate("/admin/customers")} />
            </div>
          );
        }}
      </QueryView>
    </div>
  );
}
