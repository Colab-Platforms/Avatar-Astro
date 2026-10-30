import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { tools } from "@/data/tools";
import { authRequest } from "@/lib/authClient";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { isAdminUser } from "@/features/admin/utils/roles";
import { useFeatureFlags } from "@/lib/featureFlags";
import { useMyDashboard } from "./useMyDashboard";

const card = "rounded-2xl border border-[#803003]/15 bg-white/70 p-5 shadow-sm";
const linkCard = "block rounded-xl border border-[#803003]/20 bg-white/70 p-4 transition hover:bg-[#E58A45]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E58A45]";
const btn = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#803003] px-4 py-2 text-sm font-medium text-white hover:bg-[#803003]/90 disabled:opacity-50";
const ghost = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#803003]/30 bg-white/60 px-3 py-1.5 text-sm hover:bg-[#E58A45]/20 disabled:opacity-50";
const input = "w-full rounded-lg border border-[#803003]/25 bg-white px-3 py-2 text-sm text-[#301607] focus:border-[#803003] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/50";

const Heading = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-5"><h1 className="font-display text-2xl tracking-wide sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-[#301607]/70">{sub}</p>}</div>
);

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#803003]/40 bg-[#E58A45]/10 p-4 text-sm text-[#301607]/80">{children}</p>;
}

function Loaded({ children }: { children: (d: NonNullable<ReturnType<typeof useMyDashboard>["data"]>) => ReactNode }) {
  const q = useMyDashboard();
  if (q.isLoading) return <div role="status" className="flex items-center gap-2 py-10 text-[#301607]/70"><Loader2 className="h-5 w-5 animate-spin text-[#803003]" /> Loading your dashboard…</div>;
  if (q.error || !q.data)
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> We could not load your dashboard.</p>
        <p className="text-sm">{q.error?.message}</p>
        <button className={ghost} onClick={() => q.refetch()}>Try again</button>
      </div>
    );
  return <>{children(q.data)}</>;
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  return (
    <Loaded>
      {(d) => (
        <>
          <Heading title={`Namaste, ${d.profile.firstName || "friend"}`} sub="Your starting point for everything on MyBhagya." />
          {!d.profile.profileCompleted && (
            <Note>Your profile is not complete yet. <Link className="underline" to="/dashboard/profile">Finish it</Link> so readings can be personal.</Note>
          )}
          {isAdminUser(user) && <p className="mt-3 text-sm"><Link className="text-[#803003] underline" to="/admin">Open the admin panel</Link></p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: "/dashboard/astrology", t: "My Astrology", s: "Birth chart, tarot, compatibility and more" },
              { to: "/dashboard/inner-voice", t: "My Inner Voice", s: "Karma, AI Guru, shlokas, life path" },
              { to: "/dashboard/devotion", t: "Devotion & Live", s: "Live Darshan, pujas, chadhawa" },
            ].map((x) => <Link key={x.to} to={x.to} className={linkCard}><p className="font-medium">{x.t}</p><p className="text-sm text-[#301607]/70">{x.s}</p></Link>)}
          </div>
          <section className={`${card} mt-6`} aria-labelledby="recent-h">
            <h2 id="recent-h" className="mb-3 font-semibold">Recent activity</h2>
            {d.recentActivity.length === 0 ? (
              <p className="text-sm text-[#301607]/70">No activity recorded yet. Features you use while signed in will appear here. Only the feature name, time and whether it worked are kept, never what you asked or were told.</p>
            ) : (
              <ul className="divide-y divide-[#803003]/10 text-sm">
                {d.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{a.label}</span>
                    <span className="flex items-center gap-2 text-xs text-[#301607]/65">{a.status !== "success" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900">didn't complete</span>}{when(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Loaded>
  );
}

export function MyAstrology() {
  const { isPathDisabled } = useFeatureFlags();
  return (
    <Loaded>
      {(d) => (
        <>
          <Heading title="My Astrology" sub="Open any astrology tool. Free with your account." />
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.filter((t) => !isPathDisabled(t.path)).map((t) => <Link key={t.path} to={t.path} className={linkCard}><p className="font-medium">{t.title}</p><p className="mt-1 line-clamp-2 text-sm text-[#301607]/70">{t.description}</p></Link>)}
          </div>
          <section className={`${card} mt-6`}>
            <h2 className="mb-2 font-semibold">Saved reports</h2>
            <Note>{d.persistence.savedReports ? "" : "Reports are generated on demand and are not saved to your account, so there is no history to show. Nothing is stored about what you asked."}</Note>
            {d.usage.byFeature.length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-sm font-medium">Times you used each feature (last {d.usage.windowDays} days)</h3>
                <ul className="text-sm">{d.usage.byFeature.map((u) => <li key={u.feature} className="flex justify-between border-b border-[#803003]/10 py-1.5"><span>{u.label}</span><span>{u.count}</span></li>)}</ul>
              </>
            )}
          </section>
        </>
      )}
    </Loaded>
  );
}

export function MyInnerVoice() {
  const { isPathDisabled } = useFeatureFlags();
  return (
    <Loaded>
      {(d) => (
        <>
          <Heading title="My Inner Voice" sub="Your reflection tools." />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: "/inner-voice", t: "Know Your Karma", s: "A written karmic reading from your situation" },
              { to: "/inner-voice/chat", t: "AI Guru", s: "Ask for guidance in conversation" },
              { to: "/inner-voice/dashboard", t: "Karma Score", s: "Track your daily actions and your score" },
              { to: "/inner-voice/future-path", t: "Future Life Path", s: "Reflective guidance for the months ahead" },
              { to: "/inner-voice/wisdom", t: "Sacred Shloka", s: "A verse chosen for your situation" },
            ].filter((x) => !isPathDisabled(x.to, true)).map((x) => <Link key={x.to} to={x.to} className={linkCard}><p className="font-medium">{x.t}</p><p className="text-sm text-[#301607]/70">{x.s}</p></Link>)}
          </div>
          <div className="mt-6"><Note>{d.persistence.note}</Note></div>
        </>
      )}
    </Loaded>
  );
}

export function MyDevotion() {
  return (
    <Loaded>
      {(d) => (
        <>
          <Heading title="Devotion & Live Darshan" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: "/avatar-live/darshan", t: "Live Darshan", s: "Watch live aarti and darshan from temples" },
              { to: "/puja", t: "Puja", s: "Browse temple puja offerings" },
              { to: "/chadhawa", t: "Chadhawa", s: "Devotional offerings" },
              { to: "/shop", t: "Divine Shop", s: "Sacred items" },
            ].map((x) => <Link key={x.to} to={x.to} className={linkCard}><p className="font-medium">{x.t}</p><p className="text-sm text-[#301607]/70">{x.s}</p></Link>)}
          </div>
          <div className="mt-6"><Note>{d.persistence.bookings ? "" : "Bookings and orders are not part of the site yet, so there is nothing to list here."}</Note></div>
        </>
      )}
    </Loaded>
  );
}

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
        return (
          <>
            <Heading title="Profile & Settings" />
            {msg && <p role="status" className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</p>}
            <section className={card} aria-labelledby="acct-h">
              <h2 id="acct-h" className="mb-3 font-semibold">Account</h2>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-wider text-[#301607]/60">Email</dt><dd>{p.email} {p.isEmailVerified ? "(verified)" : "(not verified)"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-[#301607]/60">Phone</dt><dd>{p.phoneNo ?? "—"} {p.phoneNo ? (p.isPhoneVerified ? "(verified)" : "(not verified)") : ""}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-[#301607]/60">Sign-in method</dt><dd>{p.authProvider === "GOOGLE" ? "Google" : "Email & password"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-[#301607]/60">Member since</dt><dd>{when(p.createdAt)}</dd></div>
              </dl>
            </section>
            <section className={`${card} mt-4`} aria-labelledby="edit-h">
              <h2 id="edit-h" className="mb-3 font-semibold">Your details</h2>
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setMsg(null); save.mutate(form); }}>
                {(["firstName", "lastName", "city", "state", "country", "gender"] as const).map((k) => (
                  <label key={k} className="text-sm">
                    {{ firstName: "First name", lastName: "Last name", city: "City", state: "State", country: "Country", gender: "Gender" }[k]}
                    <input className={`${input} mt-1`} value={form[k]} maxLength={80} required={k === "firstName"} onChange={(e) => setEdit({ ...form, [k]: e.target.value })} />
                  </label>
                ))}
                <div className="sm:col-span-2"><button className={btn} disabled={save.isPending || !edit}>{save.isPending ? "Saving…" : "Save changes"}</button></div>
              </form>
              <p className="mt-2 text-xs text-[#301607]/60">Email, phone and password changes go through their own verified flows.</p>
            </section>
            <section className={`${card} mt-4`} aria-labelledby="sec-h">
              <h2 id="sec-h" className="mb-3 font-semibold">Security</h2>
              <p className="mb-3 text-sm">Signed in on {d.activeSessions} device session{d.activeSessions === 1 ? "" : "s"}. To change your password, sign out and use "Forgot password" on the sign-in page.</p>
              <div className="flex flex-wrap gap-2">
                <button className={ghost} disabled={signOutAll.isPending} onClick={() => { if (window.confirm("Sign out of every device, including this one?")) signOutAll.mutate(); }}>Sign out of all devices</button>
              </div>
            </section>
            <section className={`${card} mt-4`} aria-labelledby="priv-h">
              <h2 id="priv-h" className="mb-2 font-semibold">Privacy</h2>
              <p className="mb-3 text-sm text-[#301607]/75">We keep a short activity trail (feature name, time, success or failure) to show your recent activity. It never includes what you asked or were told. You can delete it at any time.</p>
              <button className={ghost} disabled={clear.isPending || !d.hasTrackedActivity} onClick={() => { if (window.confirm("Delete your activity history?")) clear.mutate(); }}>Clear my activity history</button>
            </section>
          </>
        );
      }}
    </Loaded>
  );
}
