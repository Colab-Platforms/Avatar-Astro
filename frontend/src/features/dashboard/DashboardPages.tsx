import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, History, LockKeyhole, Settings2, ShieldCheck, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { authRequest } from "@/lib/authClient";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { useMyDashboard } from "./useMyDashboard";
import { btn, card, ErrorBox, field, ghost, IconChip, labelCls, Loading, PageHeader } from "./library/ui";

function Loaded({ children }: { children: (d: NonNullable<ReturnType<typeof useMyDashboard>["data"]>) => ReactNode }) {
  const q = useMyDashboard();
  if (q.isLoading) return <Loading label="Loading your dashboard…" />;
  if (q.error || !q.data) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  return <>{children(q.data)}</>;
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Section({ id, icon, tone, title, desc, children, className }: { id: string; icon: LucideIcon; tone?: "gold" | "brown" | "sage" | "plum"; title: string; desc?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`${card} p-5 sm:p-6 ${className ?? ""}`} aria-labelledby={id}>
      <div className="mb-4 flex items-start gap-3.5">
        <IconChip icon={icon} tone={tone} size="sm" />
        <div className="min-w-0">
          <h2 id={id} className="font-home-serif text-base font-semibold text-[#2A1A10]">{title}</h2>
          {desc && <p className="mt-0.5 text-xs leading-relaxed text-[#6E5D4E]">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">{k}</dt><dd className="mt-0.5 break-words text-sm text-[#2A1A10]">{children}</dd></div>;
}

const Verified = ({ ok }: { ok: boolean }) => (
  <span className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-[#E3EBDD] text-[#3F5E3D]" : "bg-[#F6E7D2] text-[#8A5A12]"}`}>
    {ok ? <BadgeCheck className="h-3 w-3" aria-hidden="true" /> : <CircleAlert className="h-3 w-3" aria-hidden="true" />}{ok ? "verified" : "not verified"}
  </span>
);

export function ProfileSettings() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState<Record<string, string> | null>(null);

  const save = useMutation({
    mutationFn: (v: Record<string, string>) => authRequest<Record<string, unknown>>("/me/profile", { method: "PATCH", body: v }),
    onSuccess: (p) => {
      const current = useAuthStore.getState().user;
      if (current) setUser({ ...current, ...(p as object) } as typeof current);
      setMsg({ ok: true, text: "Profile updated." });
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["my-dashboard"] });
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." }),
  });
  const clear = useMutation({
    mutationFn: () => authRequest<{ deleted: number }>("/me/activity", { method: "DELETE" }),
    onSuccess: (r) => { setMsg({ ok: true, text: `Cleared ${r.deleted} activity record(s).` }); qc.invalidateQueries({ queryKey: ["my-dashboard"] }); },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not clear." }),
  });
  const signOutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSettled: () => logout(),
  });

  return (
    <Loaded>
      {(d) => {
        const p = d.profile;
        const form = edit ?? { firstName: p.firstName ?? "", lastName: p.lastName ?? "", city: p.city ?? "", state: p.state ?? "", country: p.country ?? "", gender: p.gender ?? "" };
        const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email;
        const initials = fullName.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
        return (
          <>
            <PageHeader title="Profile & Settings" sub="Your account, your details and your privacy, in one place." />
            {msg && <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-[#CFE0C7] bg-[#EEF5EA] text-[#2F4D2D]" : "border-red-200 bg-red-50 text-red-900"}`}>{msg.text}</p>}

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <Section id="acct-h" icon={UserRound} title="Account" desc="How you sign in and how long you have been with us.">
                  <div className="mb-5 flex items-center gap-4 rounded-xl bg-[#F8F1E4] p-4">
                    <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3A1C0C] font-home-serif text-lg font-semibold text-[#F3E8D4]">{initials || "M"}</span>
                    <div className="min-w-0"><p className="truncate font-home-serif text-lg font-semibold text-[#2A1A10]">{fullName}</p><p className="truncate text-sm text-[#6E5D4E]">{p.email}</p></div>
                  </div>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <Fact k="Email">{p.email} <Verified ok={p.isEmailVerified} /></Fact>
                    <Fact k="Phone">{p.phoneNo ?? "—"} {p.phoneNo ? <Verified ok={p.isPhoneVerified} /> : null}</Fact>
                    <Fact k="Sign-in method">{p.authProvider === "GOOGLE" ? "Google" : "Email & password"}</Fact>
                    <Fact k="Member since">{when(p.createdAt)}</Fact>
                  </dl>
                </Section>

                <Section id="edit-h" icon={Settings2} tone="gold" title="Your details" desc="Used to personalise your readings.">
                  <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate(form); }}>
                    {(["firstName", "lastName", "city", "state", "country", "gender"] as const).map((k) => (
                      <label key={k} className={`${labelCls} block`}>
                        {{ firstName: "First name", lastName: "Last name", city: "City", state: "State", country: "Country", gender: "Gender" }[k]}
                        <input className={`${field} mt-1.5`} value={form[k]} maxLength={80} required={k === "firstName"} onChange={(e) => setEdit({ ...form, [k]: e.target.value })} />
                      </label>
                    ))}
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      <button className={btn} disabled={save.isPending || !edit}>{save.isPending ? "Saving…" : "Save changes"}</button>
                      <p className="text-xs text-[#6E5D4E]">Email, phone and password changes go through their own verified flows.</p>
                    </div>
                  </form>
                </Section>
              </div>

              <div className="space-y-6">
                <Section id="sec-h" icon={LockKeyhole} tone="brown" title="Security">
                  <p className="mb-4 text-sm leading-relaxed text-[#4A3A2C]">Signed in on {d.activeSessions} device session{d.activeSessions === 1 ? "" : "s"}. To change your password, sign out and use "Forgot password" on the sign-in page.</p>
                  <button className={ghost} disabled={signOutAll.isPending} onClick={() => { if (window.confirm("Sign out of every device, including this one?")) signOutAll.mutate(); }}>Sign out of all devices</button>
                </Section>

                <Section id="priv-h" icon={ShieldCheck} tone="sage" title="Privacy">
                  <p className="mb-4 text-sm leading-relaxed text-[#4A3A2C]">We keep a short activity trail (feature name, time, success or failure) to show your recent activity. It never includes what you asked or were told. You can delete it at any time.</p>
                  <button className={ghost} disabled={clear.isPending || !d.hasTrackedActivity} onClick={() => { if (window.confirm("Delete your activity history?")) clear.mutate(); }}><History className="h-4 w-4" aria-hidden="true" />Clear my activity history</button>
                  <p className="mt-3 text-xs leading-relaxed text-[#6E5D4E]">Clearing activity does not delete your readings or conversations. Delete those from My Readings and My Conversations.</p>
                </Section>

                <Section id="pref-h" icon={Settings2} tone="plum" title="Preferences">
                  <p className="text-sm leading-relaxed text-[#4A3A2C]">MyBhagya does not send marketing messages or notifications, so there are no notification settings to change. Your privacy controls are above.</p>
                </Section>

                <section className="rounded-2xl border border-[#E8CFC4] bg-[#FBF1EC] p-5 sm:p-6" aria-labelledby="del-h">
                  <h2 id="del-h" className="mb-2 flex items-center gap-2 font-home-serif text-base font-semibold text-[#6B2410]"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete my account</h2>
                  <p className="text-sm leading-relaxed text-[#5A3A30]">There is no self-service deletion yet. To have your account and everything saved in it (readings, conversations, activity) permanently removed, email <a className="font-medium underline" href="mailto:support@avatarindia.com">support@avatarindia.com</a> from your registered address. Deletion cannot be undone.</p>
                </section>
              </div>
            </div>
          </>
        );
      }}
    </Loaded>
  );
}
