import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark, CalendarHeart, Clock, MessageCircleHeart, PackageOpen, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFeatureFlags } from "@/lib/featureFlags";
import { isAdminUser } from "@/features/admin/utils/roles";
import {
  useConversation, useConversations, useDeleteConversation, useDeleteReading, useNotConfigured, useOverview, useReading, useReadings, useSetSaved, useTimeline,
  type ReadingCard,
} from "./api";
import { ReadingView } from "./ReadingView";
import {
  btn, card, Empty, ErrorBox, FEATURE_PATH, FeatureBadge, field, fmtDateTime, ghost, iconFor, Loading, PageHeader, Pager, ReadingCardView, SaveButton,
} from "./ui";

const todayLong = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Debounced copy of a value, so typing in a search box does not fire a request per keystroke. */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function useParam() {
  const [params, setParams] = useSearchParams();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  return { params, set };
}

function useToggleSave() {
  const m = useSetSaved();
  return { toggle: (r: { id: string; isSaved: boolean }) => m.mutate({ id: r.id, saved: !r.isSaved }), busy: m.isPending, error: m.error };
}

// ── Overview ────────────────────────────────────────────────────────────────
export function Overview() {
  const user = useAuthStore((s) => s.user);
  const q = useOverview();
  const { isPathDisabled } = useFeatureFlags();
  const save = useToggleSave();
  if (q.isLoading) return <Loading label="Opening your space…" />;
  if (q.error || !q.data) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data;
  const first = (user as { firstName?: string } | null)?.firstName || "friend";
  const empty = d.stats.readings === 0 && d.stats.conversations === 0;
  const stats = [
    { k: "Readings generated", v: d.stats.readings }, { k: "Saved readings", v: d.stats.savedReadings },
    { k: "Features explored", v: d.stats.featuresExplored }, { k: "Conversations", v: d.stats.conversations },
    { k: "Last active", v: d.stats.lastActiveAt ? new Date(d.stats.lastActiveAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—" },
  ];
  return (
    <>
      <section className={`${card} mb-6 bg-gradient-to-br from-[#FBF5EC] to-[#F1DFC0] p-6 sm:p-8`}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#803003]/80">{todayLong()}</p>
        <h1 className="mt-2 font-display text-3xl text-[#301607] sm:text-4xl">Namaste, {first}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#301607]/75">This is your personal MyBhagya space: every reading you create is kept here, so you can come back to it whenever you need.</p>
        {isAdminUser(user) && <p className="mt-3 text-sm"><Link className="text-[#803003] underline" to="/admin">Open the admin panel</Link></p>}
      </section>

      <section aria-label="Your numbers" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.k} className={`${card} p-4`}><p className="text-2xl font-semibold tabular-nums text-[#803003]">{s.v}</p><p className="mt-1 text-xs text-[#301607]/70">{s.k}</p></div>
        ))}
      </section>

      {empty ? (
        <Empty icon={Sparkles} title="Your journey begins here" body="You have no readings or conversations yet. Try one of these and it will appear here automatically."
          action={<div className="mt-2 flex flex-wrap justify-center gap-2">{[{ p: "/tarot", t: "Tarot reading" }, { p: "/horoscopes", t: "Daily horoscope" }, { p: "/inner-voice/chat", t: "Talk to AI Guru" }, { p: "/birth-chart", t: "Birth chart" }].filter((x) => !isPathDisabled(x.p)).map((x) => <Link key={x.p} to={x.p} className={btn}>{x.t}</Link>)}</div>} />
      ) : (
        <>
          <section aria-labelledby="cont-h" className="mb-6">
            <h2 id="cont-h" className="mb-3 font-display text-lg text-[#301607]">Continue where you left off</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {d.continue.reading && (
                <Link to={`/dashboard/readings/${d.continue.reading.id}`} className={`${card} block p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]`}>
                  <p className="text-xs text-[#803003]">Latest reading</p><p className="mt-1 font-medium">{d.continue.reading.title}</p><p className="text-xs text-[#301607]/60">{fmtDateTime(d.continue.reading.createdAt)}</p>
                </Link>
              )}
              {d.continue.conversation && (
                <Link to={`/dashboard/conversations/${d.continue.conversation.id}`} className={`${card} block p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]`}>
                  <p className="text-xs text-[#803003]">Latest conversation · {d.continue.conversation.featureLabel}</p><p className="mt-1 truncate font-medium">{d.continue.conversation.title}</p><p className="text-xs text-[#301607]/60">{fmtDateTime(d.continue.conversation.lastMessageAt)}</p>
                </Link>
              )}
              {d.continue.lastFeature && (
                <Link to={FEATURE_PATH[d.continue.lastFeature.key] ?? "/dashboard/readings"} className={`${card} block p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]`}>
                  <p className="text-xs text-[#803003]">Last used feature</p><p className="mt-1 font-medium">{d.continue.lastFeature.label}</p><p className="text-xs text-[#301607]/60">Open it again</p>
                </Link>
              )}
            </div>
          </section>

          <section aria-labelledby="rr-h" className="mb-6">
            <div className="mb-3 flex items-center justify-between"><h2 id="rr-h" className="font-display text-lg text-[#301607]">Recent readings</h2><Link to="/dashboard/readings" className="text-sm text-[#803003] underline">See all</Link></div>
            {d.recentReadings.length === 0 ? <p className="text-sm text-[#301607]/70">No readings yet.</p> : (
              <div className="grid gap-3 md:grid-cols-2">{d.recentReadings.slice(0, 4).map((r) => <ReadingCardView key={r.id} r={r} onToggleSave={save.toggle} saving={save.busy} />)}</div>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="ra-h" className={`${card} p-5`}>
        <div className="mb-3 flex items-center justify-between"><h2 id="ra-h" className="font-display text-lg text-[#301607]">Recent activity</h2><Link to="/dashboard/activity" className="text-sm text-[#803003] underline">Full timeline</Link></div>
        {d.recentActivity.length === 0 ? <p className="text-sm text-[#301607]/70">No activity yet. What you do while signed in will appear here. Only the feature name and time are kept, never what you asked.</p> : (
          <ul className="divide-y divide-[#E4D3B8] text-sm">{d.recentActivity.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2"><span>{a.label} <span className="text-[#301607]/60">· {a.featureLabel}</span></span><span className="shrink-0 text-xs text-[#301607]/60">{fmtDateTime(a.at)}</span></li>)}</ul>
        )}
      </section>
    </>
  );
}

// ── Readings list (shared by My Readings and Saved) ─────────────────────────
function ReadingsList({ savedOnly }: { savedOnly: boolean }) {
  const { params, set } = useParam();
  const [text, setText] = useState(params.get("q") ?? "");
  const debounced = useDebounced(text);
  useEffect(() => { if ((params.get("q") ?? "") !== debounced) set({ q: debounced || null }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debounced]);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = useReadings({ q: params.get("q"), feature: params.get("feature"), from: params.get("from"), to: params.get("to"), saved: savedOnly ? "true" : undefined, page, pageSize: 12 });
  const save = useToggleSave();
  const active = ["q", "feature", "from", "to"].some((k) => params.get(k));
  return (
    <>
      <PageHeader title={savedOnly ? "Saved" : "My Readings"} sub={savedOnly ? "The readings you chose to keep close." : "Every reading you have generated, kept exactly as it was written. Opening one never creates a new one."} />
      <form role="search" aria-label="Filter readings" className="mb-5 flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="min-w-[12rem] flex-1 text-xs text-[#301607]/70">Search<input className={`${field} mt-1`} placeholder="Search title or summary" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className="text-xs text-[#301607]/70">Feature
          <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}>
            <option value="">All features</option>{(q.data?.features ?? []).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#301607]/70">From<input type="date" className={`${field} mt-1 w-auto`} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} /></label>
        <label className="text-xs text-[#301607]/70">To<input type="date" className={`${field} mt-1 w-auto`} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} /></label>
        {active && <button type="button" className={ghost} onClick={() => { setText(""); set({ q: null, feature: null, from: null, to: null }); }}>Clear</button>}
      </form>
      {save.error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{save.error.message}</p>}
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? (
        savedOnly && !active ? <Empty icon={Bookmark} title="Nothing saved yet" body="Tap the bookmark on any reading to keep it here." action={<Link to="/dashboard/readings" className={btn}>Browse my readings</Link>} />
          : active ? <Empty title="No readings match" body="Try a different search or clear the filters." />
          : <Empty icon={Sparkles} title="No readings yet" body="Readings you generate while signed in are saved here automatically." action={<Link to="/tarot" className={btn}>Try a Tarot reading</Link>} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">{q.data.items.map((r: ReadingCard) => <ReadingCardView key={r.id} r={r} onToggleSave={save.toggle} saving={save.busy} />)}</div>
          <Pager page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} onPage={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}
export const MyReadings = () => <ReadingsList savedOnly={false} />;
export const Saved = () => <ReadingsList savedOnly />;

// ── Reading detail ──────────────────────────────────────────────────────────
export function ReadingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useReading(id);
  const save = useToggleSave();
  const del = useDeleteReading();
  const [confirm, setConfirm] = useState(false);
  const back = <Link to="/dashboard/readings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#803003] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My Readings</Link>;
  if (q.isLoading) return <>{back}<Loading /></>;
  if (q.error || !q.data) return <>{back}<ErrorBox error={q.error} /></>;
  const r = q.data;
  const Icon = iconFor(r.feature);
  return (
    <>
      {back}
      <article className={`${card} p-5 sm:p-7`}>
        <header className="mb-5 flex flex-wrap items-start gap-3 border-b border-[#E4D3B8] pb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#803003] text-[#F5E9D6]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl text-[#301607]">{r.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#301607]/65"><FeatureBadge feature={r.feature} label={r.featureLabel} /><Clock className="h-3.5 w-3.5" aria-hidden="true" />{fmtDateTime(r.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <SaveButton saved={r.isSaved} busy={save.busy} onToggle={() => save.toggle(r)} title={r.title} />
            <button className={ghost} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
          </div>
        </header>
        <p className="mb-4 rounded-lg bg-[#B8893B]/12 px-3 py-2 text-xs text-[#301607]/75">This is the original reading exactly as it was generated on {fmtDateTime(r.createdAt)}. It is not regenerated when you open it.</p>
        <ReadingView output={r.output} />
        <div className="mt-6"><Link to={FEATURE_PATH[r.feature] ?? "/dashboard/readings"} className={ghost}>Make a new {r.featureLabel} reading</Link></div>
      </article>
      {confirm && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="del-h" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${card} w-full max-w-sm bg-white p-6`}>
            <h2 id="del-h" className="font-display text-lg">Delete this reading?</h2>
            <p className="mt-2 text-sm text-[#301607]/75">It will be removed from your account and cannot be recovered.</p>
            {del.error && <p role="alert" className="mt-2 text-sm text-red-800">{del.error.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className={ghost} autoFocus onClick={() => setConfirm(false)}>Cancel</button>
              <button className={btn} disabled={del.isPending} onClick={() => del.mutate(r.id, { onSuccess: () => nav("/dashboard/readings", { replace: true }) })}>{del.isPending ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Activity ────────────────────────────────────────────────────────────────
export function MyActivity() {
  const { params, set } = useParam();
  const [text, setText] = useState(params.get("q") ?? "");
  const debounced = useDebounced(text);
  useEffect(() => { if ((params.get("q") ?? "") !== debounced) set({ q: debounced || null }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debounced]);
  const f = { q: params.get("q") ?? undefined, feature: params.get("feature") ?? undefined, kind: params.get("kind") ?? undefined, from: params.get("from") ?? undefined, to: params.get("to") ?? undefined };
  const q = useTimeline(f);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const kinds = q.data?.pages[0]?.kinds ?? [];
  const link = (i: (typeof items)[number]): string | null => (i.link ? (i.link.type === "reading" ? `/dashboard/readings/${i.link.id}` : `/dashboard/conversations/${i.link.id}`) : null);
  return (
    <>
      <PageHeader title="My Activity" sub="A private timeline of what you did. It records what happened, never what you asked or were told." />
      <form role="search" aria-label="Filter activity" className="mb-5 flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="min-w-[12rem] flex-1 text-xs text-[#301607]/70">Search<input className={`${field} mt-1`} placeholder="Search activity" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className="text-xs text-[#301607]/70">What
          <select className={`${field} mt-1 w-auto`} value={params.get("kind") ?? ""} onChange={(e) => set({ kind: e.target.value || null })}><option value="">Everything</option>{kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
        </label>
        <label className="text-xs text-[#301607]/70">Feature
          <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}>
            <option value="">All features</option>
            {[["tarot", "Tarot"], ["horoscope", "Daily Horoscope"], ["birth-chart", "Birth Chart"], ["compatibility", "Compatibility"], ["name-analysis", "Name Analysis"], ["palm-reading", "Palm Reading"], ["gemstone", "Gemstone"], ["karma", "Karma"], ["shloka", "Shloka"], ["ai-guru", "AI Guru"], ["inner-voice", "Inner Voice"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#301607]/70">From<input type="date" className={`${field} mt-1 w-auto`} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} /></label>
        <label className="text-xs text-[#301607]/70">To<input type="date" className={`${field} mt-1 w-auto`} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} /></label>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : items.length === 0 ? (
        <Empty icon={CalendarHeart} title="No activity to show" body={Object.values(f).some(Boolean) ? "Nothing matches these filters." : "Your readings, saves and conversations will appear here as you use MyBhagya."} />
      ) : (
        <>
          <ol className={`${card} divide-y divide-[#E4D3B8]`}>
            {items.map((i) => {
              const Icon = iconFor(i.feature), href = link(i);
              const row = (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B8893B]/20 text-[#803003]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#301607]">{i.label}{i.status === "failed" && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">did not complete</span>}</p><p className="truncate text-xs text-[#301607]/65">{i.featureLabel}{i.title ? ` · ${i.title}` : ""}</p></div>
                  <time dateTime={i.at} className="shrink-0 text-xs text-[#301607]/60">{fmtDateTime(i.at)}</time>
                </div>
              );
              return <li key={i.id}>{href ? <Link to={href} className="block hover:bg-[#B8893B]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]">{row}</Link> : row}</li>;
            })}
          </ol>
          {q.hasNextPage && <div className="mt-4 text-center"><button className={ghost} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? "Loading…" : "Load more"}</button></div>}
        </>
      )}
    </>
  );
}

// ── Conversations ───────────────────────────────────────────────────────────
export function Conversations() {
  const { params, set } = useParam();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = useConversations({ feature: params.get("feature"), page, pageSize: 12 });
  return (
    <>
      <PageHeader title="My Conversations" sub="Your past chats with AI Guru and Inner Voice, saved so you can return to them." />
      <div className="mb-5"><label className="text-xs text-[#301607]/70">Type
        <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}><option value="">All</option><option value="ai-guru">AI Guru</option><option value="inner-voice">Inner Voice</option></select></label></div>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? (
        <Empty icon={MessageCircleHeart} title="No conversations yet" body="Chats with AI Guru and Inner Voice are saved here once you start one while signed in." action={<Link to="/inner-voice/chat" className={btn}>Talk to AI Guru</Link>} />
      ) : (
        <>
          <ul className="space-y-3">{q.data.items.map((c) => (
            <li key={c.id}><Link to={`/dashboard/conversations/${c.id}`} className={`${card} block p-4 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]`}>
              <div className="flex items-center justify-between gap-3"><p className="truncate font-medium">{c.title}</p><FeatureBadge feature={c.feature} label={c.featureLabel} /></div>
              <p className="mt-1 line-clamp-2 text-sm text-[#301607]/75">{c.preview}</p>
              <p className="mt-2 text-xs text-[#301607]/60">Started {fmtDateTime(c.createdAt)} · last active {fmtDateTime(c.lastMessageAt)} · {c.messageCount} messages</p>
            </Link></li>
          ))}</ul>
          <Pager page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} onPage={(p) => set({ page: String(p) })} />
        </>
      )}
    </>
  );
}

export function ConversationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useConversation(id);
  const del = useDeleteConversation();
  const [confirm, setConfirm] = useState(false);
  const back = <Link to="/dashboard/conversations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#803003] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My Conversations</Link>;
  if (q.isLoading) return <>{back}<Loading /></>;
  if (q.error || !q.data) return <>{back}<ErrorBox error={q.error} /></>;
  const c = q.data;
  const canContinue = c.feature === "ai-guru";
  return (
    <>
      {back}
      <div className={`${card} p-5 sm:p-7`}>
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#E4D3B8] pb-4">
          <div className="min-w-0"><h1 className="truncate font-display text-2xl">{c.title}</h1><p className="mt-1 text-xs text-[#301607]/65"><FeatureBadge feature={c.feature} label={c.featureLabel} /> · started {fmtDateTime(c.createdAt)}</p></div>
          <div className="flex gap-2">
            {canContinue && <Link to={`/inner-voice/chat?conversation=${c.id}`} className={btn}>Continue this conversation</Link>}
            <button className={ghost} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
          </div>
        </header>
        <ol className="space-y-3" aria-label="Messages">
          {c.messages.map((m) => (
            <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-[#803003] text-white" : "border border-[#E4D3B8] bg-white text-[#301607]"}`}>
                <span className="sr-only">{m.role === "user" ? "You: " : "Guide: "}</span>{m.content}
              </div>
            </li>
          ))}
        </ol>
        {!canContinue && <p className="mt-5 text-xs text-[#301607]/60">Inner Voice chats are kept for reading; they cannot be continued from here.</p>}
      </div>
      {confirm && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="cdel-h" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${card} w-full max-w-sm bg-white p-6`}>
            <h2 id="cdel-h" className="font-display text-lg">Delete this conversation?</h2>
            <p className="mt-2 text-sm text-[#301607]/75">All its messages will be removed and cannot be recovered.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className={ghost} autoFocus onClick={() => setConfirm(false)}>Cancel</button>
              <button className={btn} disabled={del.isPending} onClick={() => del.mutate(c.id, { onSuccess: () => nav("/dashboard/conversations", { replace: true }) })}>{del.isPending ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Bookings & Orders: honest empty states (no such system exists) ──────────
function NotAvailable({ kind, title, sub, icon, action }: { kind: "bookings" | "orders"; title: string; sub: string; icon: typeof PackageOpen; action: ReactNode }) {
  const q = useNotConfigured(kind);
  return (
    <>
      <PageHeader title={title} sub={sub} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : <Empty icon={icon} title={`No ${kind} to show`} body={q.data?.reason} action={action} />}
    </>
  );
}
export const MyBookings = () => <NotAvailable kind="bookings" title="My Bookings" sub="Puja and Darshan bookings." icon={ScrollText} action={<Link to="/puja" className={btn}>Browse pujas</Link>} />;
export const MyOrders = () => <NotAvailable kind="orders" title="My Orders" sub="Purchases from the Divine Shop." icon={PackageOpen} action={<Link to="/shop" className={btn}>Visit the shop</Link>} />;
