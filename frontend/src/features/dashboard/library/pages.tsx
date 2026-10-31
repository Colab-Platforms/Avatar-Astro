import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BookOpenText, CalendarHeart, Clock, Compass, MessageCircleHeart, PackageOpen, ScrollText, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFeatureFlags } from "@/lib/featureFlags";
import { isAdminUser } from "@/features/admin/utils/roles";
import {
  useConversation, useConversations, useDeleteConversation, useDeleteReading, useNotConfigured, useOverview, useReading, useReadings, useSetSaved, useTimeline,
  type ReadingCard,
} from "./api";
import { SavedReadingBody, rendererKey } from "./SavedReadingBody";
import {
  ago, btn, card, cardHover, Empty, ErrorBox, FEATURE_PATH, FeatureBadge, field, fmtDateTime, focusRing, ghost, IconChip, iconFor, labelCls, Loading, PageHeader, Pager,
  ReadingCardView, SaveButton, SectionHeader, StatCard, textLink,
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
const QUICK = [
  { path: "/tarot", title: "Tarot Reading", desc: "Draw cards for the question on your mind.", icon: Sparkles, tone: "gold" as const },
  { path: "/horoscopes", title: "Daily Horoscope", desc: "Today's guidance, written for your sign.", icon: Sun, tone: "brown" as const },
  { path: "/inner-voice/chat", title: "Talk to AI Guru", desc: "Ask anything, in your own words.", icon: MessageCircleHeart, tone: "sage" as const },
  { path: "/birth-chart", title: "Birth Chart", desc: "See the sky as it stood at your birth.", icon: Compass, tone: "plum" as const },
];

/** Quiet decorative ring for the welcome banner: pure SVG, no image, hidden from assistive tech. */
function Ornament() {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -top-12 hidden h-72 w-72 text-[#A8803A] opacity-[0.22] sm:block lg:h-80 lg:w-80">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="46" strokeDasharray="2 4" />
        {ticks.map((a) => <line key={a} x1="100" y1="8" x2="100" y2={a % 30 === 0 ? 20 : 14} transform={`rotate(${a} 100 100)`} />)}
        <path d="M100 54 L108 92 L146 100 L108 108 L100 146 L92 108 L54 100 L92 92 Z" strokeWidth="1" />
      </g>
    </svg>
  );
}

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
  const last = d.stats.lastActiveAt;
  // A sign-in is recorded as activity too, but it is not a feature the person can "open again".
  const lastFeature = d.continue.lastFeature && FEATURE_PATH[d.continue.lastFeature.key] ? d.continue.lastFeature : null;
  const hasContinue = !!(d.continue.reading || d.continue.conversation || lastFeature);
  const quick = QUICK.filter((x) => !isPathDisabled(x.path));
  return (
    <div className="space-y-8">
      <section aria-labelledby="welcome-h" className={`${card} relative overflow-hidden bg-gradient-to-br from-[#FFFDF8] via-[#FBF4E6] to-[#F3E6CC] px-6 py-7 sm:px-9 sm:py-9`}>
        <Ornament />
        <div className="relative max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#A8803A]">{todayLong()}</p>
          <h1 id="welcome-h" className="mt-2 font-home-serif text-3xl font-semibold tracking-tight text-[#2A1A10] sm:text-[2.15rem]">Namaste, {first}</h1>
          <p className="mt-2.5 max-w-xl text-[0.95rem] leading-relaxed text-[#4A3A2C]">Every reading you create is kept here, exactly as it was written, so you can return to it whenever you need guidance.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/#astrology-tools" className={btn}>Explore astrology <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            {isAdminUser(user) && <Link className={ghost} to="/admin">Open the admin panel</Link>}
          </div>
        </div>
      </section>

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={BookOpenText} tone="gold" value={d.stats.readings} label="Readings generated" />
        <StatCard icon={Bookmark} tone="brown" value={d.stats.savedReadings} label="Saved readings" hint={d.stats.readings ? `of ${d.stats.readings} readings` : undefined} />
        <StatCard icon={Compass} tone="sage" value={d.stats.featuresExplored} label="Features explored" />
        <StatCard icon={MessageCircleHeart} tone="plum" value={d.stats.conversations} label="Conversations" />
        <StatCard className="col-span-2 sm:col-span-1" icon={Clock} tone="gold" value={last ? new Date(last).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"} label="Last active" hint={last ? ago(last) : "No activity yet"} />
      </section>

      {quick.length > 0 && (
        <section aria-labelledby="qa-h">
          <SectionHeader id="qa-h" title="Quick actions" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quick.map((x) => (
              <Link key={x.path} to={x.path} className={`${card} ${cardHover} group flex flex-col gap-3 p-4 sm:p-5 ${focusRing}`}>
                <span className="flex items-start justify-between">
                  <IconChip icon={x.icon} tone={x.tone} />
                  <ArrowUpRight className="h-4 w-4 text-[#A8803A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#2A1A10]">{x.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#6E5D4E]">{x.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasContinue && (
        <section aria-labelledby="cont-h">
          <SectionHeader id="cont-h" title="Continue where you left off" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {d.continue.reading && (
              <Link to={`/dashboard/readings/${d.continue.reading.id}`} className={`${card} ${cardHover} block p-4 ${focusRing}`}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">Latest reading</p><p className="mt-1.5 truncate text-sm font-semibold text-[#2A1A10]">{d.continue.reading.title}</p><p className="mt-0.5 text-xs text-[#6E5D4E]">{ago(d.continue.reading.createdAt)}</p>
              </Link>
            )}
            {d.continue.conversation && (
              <Link to={`/dashboard/conversations/${d.continue.conversation.id}`} className={`${card} ${cardHover} block p-4 ${focusRing}`}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">Latest conversation · {d.continue.conversation.featureLabel}</p><p className="mt-1.5 truncate text-sm font-semibold text-[#2A1A10]">{d.continue.conversation.title}</p><p className="mt-0.5 text-xs text-[#6E5D4E]">{ago(d.continue.conversation.lastMessageAt)}</p>
              </Link>
            )}
            {lastFeature && (
              <Link to={FEATURE_PATH[lastFeature.key]} className={`${card} ${cardHover} block p-4 ${focusRing}`}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">Last used feature</p><p className="mt-1.5 truncate text-sm font-semibold text-[#2A1A10]">{lastFeature?.label}</p><p className="mt-0.5 text-xs text-[#6E5D4E]">Open it again</p>
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="rr-h">
          <SectionHeader id="rr-h" title="Recent readings" action={!empty && <Link to="/dashboard/readings" className={textLink}>See all</Link>} />
          {empty ? (
            <Empty icon={Sparkles} title="Your journey begins here" body="You have no readings or conversations yet. Start with any quick action above and the result will be kept here automatically." />
          ) : d.recentReadings.length === 0 ? (
            <p className="text-sm text-[#6E5D4E]">No readings yet.</p>
          ) : (
            <ul className={`${card} divide-y divide-[#EFE4D0]`}>
              {d.recentReadings.slice(0, 5).map((r) => {
                const Icon = iconFor(r.feature);
                return (
                  <li key={r.id} className="flex items-center gap-3.5 px-4 py-3.5">
                    <IconChip icon={Icon} tone="brown" size="sm" />
                    <Link to={`/dashboard/readings/${r.id}`} className={`min-w-0 flex-1 rounded ${focusRing}`}>
                      <span className="block truncate text-sm font-semibold text-[#2A1A10] hover:text-[#7A2E0A]">{r.title}</span>
                      <span className="block truncate text-xs text-[#6E5D4E]">{r.featureLabel} · {ago(r.createdAt)}</span>
                    </Link>
                    <SaveButton saved={r.isSaved} busy={save.busy} onToggle={() => save.toggle(r)} title={r.title} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="ra-h">
          <SectionHeader id="ra-h" title="Recent activity" action={<Link to="/dashboard/activity" className={textLink}>Full timeline</Link>} />
          <div className={`${card} p-5`}>
            {d.recentActivity.length === 0 ? (
              <p className="text-sm leading-relaxed text-[#6E5D4E]">No activity yet. What you do while signed in will appear here. Only the feature name and time are kept, never what you asked.</p>
            ) : (
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[1.05rem] before:top-2 before:w-px before:bg-[#E9DDC9]">
                {d.recentActivity.map((a) => {
                  const Icon = iconFor(a.feature);
                  return (
                    <li key={a.id} className="relative flex items-start gap-3">
                      <span className="relative z-10 flex h-[2.1rem] w-[2.1rem] shrink-0 items-center justify-center rounded-full border border-[#E9DDC9] bg-[#FFFDF8] text-[#7A2E0A]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-[#2A1A10]">{a.label}</p>
                        <p className="truncate text-xs text-[#6E5D4E]">{a.featureLabel} · <time dateTime={a.at} title={fmtDateTime(a.at)}>{ago(a.at)}</time></p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
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
      <form role="search" aria-label="Filter readings" className={`${card} mb-6 flex flex-wrap items-end gap-3 p-4`} onSubmit={(e) => e.preventDefault()}>
        <label className={`${labelCls} min-w-[12rem] flex-1`}>Search<input className={`${field} mt-1`} placeholder="Search title or summary" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className={labelCls}>Feature
          <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}>
            <option value="">All features</option>{(q.data?.features ?? []).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className={labelCls}>From<input type="date" className={`${field} mt-1 w-auto`} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} /></label>
        <label className={labelCls}>To<input type="date" className={`${field} mt-1 w-auto`} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} /></label>
        {active && <button type="button" className={ghost} onClick={() => { setText(""); set({ q: null, feature: null, from: null, to: null }); }}>Clear</button>}
      </form>
      {save.error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{save.error.message}</p>}
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? (
        savedOnly && !active ? <Empty icon={Bookmark} title="Nothing saved yet" body="Tap the bookmark on any reading to keep it here." action={<Link to="/dashboard/readings" className={btn}>Browse my readings</Link>} />
          : active ? <Empty title="No readings match" body="Try a different search or clear the filters." />
          : <Empty icon={Sparkles} title="No readings yet" body="Readings you generate while signed in are saved here automatically." action={<Link to="/tarot" className={btn}>Try a Tarot reading</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">{q.data.items.map((r: ReadingCard) => <ReadingCardView key={r.id} r={r} onToggleSave={save.toggle} saving={save.busy} />)}</div>
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
  const back = <Link to="/dashboard/readings" className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-[#7A2E0A] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My Readings</Link>;
  if (q.isLoading) return <>{back}<Loading /></>;
  if (q.error || !q.data) return <>{back}<ErrorBox error={q.error} /></>;
  const r = q.data;
  const Icon = iconFor(r.feature);
  return (
    <>
      {back}
      <div className={`mx-auto ${r.feature === "gemstone" ? "max-w-6xl" : "max-w-4xl"}`}>
        <header className={`${card} mb-5 flex flex-wrap items-start gap-4 p-5 sm:p-6`}>
          <IconChip icon={Icon} tone="brown" />
          <div className="min-w-[min(100%,14rem)] flex-1 basis-[14rem]">
            <h1 className="font-home-serif text-xl font-semibold leading-snug text-[#2A1A10] sm:text-2xl">{r.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#6E5D4E]">
              <FeatureBadge feature={r.feature} label={r.featureLabel} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3EBDD] px-2.5 py-0.5 font-medium text-[#3F5E3D]"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Original saved reading</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{fmtDateTime(r.createdAt)}</span>
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <SaveButton saved={r.isSaved} busy={save.busy} onToggle={() => save.toggle(r)} title={r.title} />
            <button className={ghost} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
          </div>
        </header>
        <p className="mb-5 rounded-xl border border-[#EFE4D0] bg-[#FBF6EA] px-4 py-3 text-xs leading-relaxed text-[#4A3A2C]">This is the original reading exactly as it was generated on {fmtDateTime(r.createdAt)}. It is not regenerated when you open it.</p>
        <div data-renderer={rendererKey(r.feature, r.output)}><SavedReadingBody feature={r.feature} output={r.output} /></div>
        <div className="mt-8"><Link to={FEATURE_PATH[r.feature] ?? "/dashboard/readings"} className={ghost}>Make a new {r.featureLabel} reading</Link></div>
      </div>
      {confirm && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="del-h" className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1A10]/55 backdrop-blur-[2px] p-4">
          <div className={`${card} w-full max-w-sm bg-white p-6`}>
            <h2 id="del-h" className="font-home-serif font-semibold text-lg">Delete this reading?</h2>
            <p className="mt-2 text-sm text-[#4A3A2C]">It will be removed from your account and cannot be recovered.</p>
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
      <form role="search" aria-label="Filter activity" className={`${card} mb-6 flex flex-wrap items-end gap-3 p-4`} onSubmit={(e) => e.preventDefault()}>
        <label className={`${labelCls} min-w-[12rem] flex-1`}>Search<input className={`${field} mt-1`} placeholder="Search activity" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className={labelCls}>What
          <select className={`${field} mt-1 w-auto`} value={params.get("kind") ?? ""} onChange={(e) => set({ kind: e.target.value || null })}><option value="">Everything</option>{kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
        </label>
        <label className={labelCls}>Feature
          <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}>
            <option value="">All features</option>
            {[["tarot", "Tarot"], ["horoscope", "Daily Horoscope"], ["birth-chart", "Birth Chart"], ["compatibility", "Compatibility"], ["name-analysis", "Name Analysis"], ["palm-reading", "Palm Reading"], ["gemstone", "Gemstone"], ["karma", "Karma"], ["shloka", "Shloka"], ["ai-guru", "AI Guru"], ["inner-voice", "Inner Voice"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className={labelCls}>From<input type="date" className={`${field} mt-1 w-auto`} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} /></label>
        <label className={labelCls}>To<input type="date" className={`${field} mt-1 w-auto`} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} /></label>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : items.length === 0 ? (
        <Empty icon={CalendarHeart} title="No activity to show" body={Object.values(f).some(Boolean) ? "Nothing matches these filters." : "Your readings, saves and conversations will appear here as you use MyBhagya."} />
      ) : (
        <>
          <ol className={`${card} divide-y divide-[#EFE4D0]`}>
            {items.map((i) => {
              const Icon = iconFor(i.feature), href = link(i);
              const row = (
                <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <IconChip icon={Icon} tone="gold" size="sm" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#2A1A10]">{i.label}{i.status === "failed" && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">did not complete</span>}</p><p className="truncate text-xs text-[#6E5D4E]">{i.featureLabel}{i.title ? ` · ${i.title}` : ""}</p></div>
                  <time dateTime={i.at} title={fmtDateTime(i.at)} className="hidden shrink-0 text-xs text-[#6E5D4E] sm:block">{fmtDateTime(i.at)}</time>
                </div>
              );
              return <li key={i.id}>{href ? <Link to={href} className="block hover:bg-[#F8F1E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B]">{row}</Link> : row}</li>;
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
      <div className={`${card} mb-6 p-4`}><label className={labelCls}>Type
        <select className={`${field} mt-1 w-auto`} value={params.get("feature") ?? ""} onChange={(e) => set({ feature: e.target.value || null })}><option value="">All</option><option value="ai-guru">AI Guru</option><option value="inner-voice">Inner Voice</option></select></label></div>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : q.data.items.length === 0 ? (
        <Empty icon={MessageCircleHeart} title="No conversations yet" body="Chats with AI Guru and Inner Voice are saved here once you start one while signed in." action={<Link to="/inner-voice/chat" className={btn}>Talk to AI Guru</Link>} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">{q.data.items.map((c) => (
            <li key={c.id}><Link to={`/dashboard/conversations/${c.id}`} className={`${card} ${cardHover} flex items-start gap-4 p-4 sm:p-5 ${focusRing}`}>
              <IconChip icon={iconFor(c.feature)} tone="plum" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-[#2A1A10]">{c.title}</p><FeatureBadge feature={c.feature} label={c.featureLabel} /></div>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4A3A2C]">{c.preview}</p>
                <p className="mt-2 text-xs text-[#6E5D4E]">Started {fmtDateTime(c.createdAt)} · last active {fmtDateTime(c.lastMessageAt)} · {c.messageCount} messages</p>
              </div>
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
  const back = <Link to="/dashboard/conversations" className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-[#7A2E0A] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My Conversations</Link>;
  if (q.isLoading) return <>{back}<Loading /></>;
  if (q.error || !q.data) return <>{back}<ErrorBox error={q.error} /></>;
  const c = q.data;
  const canContinue = c.feature === "ai-guru";
  return (
    <>
      {back}
      <div className={`${card} mx-auto max-w-4xl p-5 sm:p-8`}>
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#E9DDC9] pb-4">
          <div className="min-w-0"><h1 className="truncate font-home-serif font-semibold text-2xl">{c.title}</h1><p className="mt-1 text-xs text-[#6E5D4E]"><FeatureBadge feature={c.feature} label={c.featureLabel} /> · started {fmtDateTime(c.createdAt)}</p></div>
          <div className="flex gap-2">
            {canContinue && <Link to={`/inner-voice/chat?conversation=${c.id}`} className={btn}>Continue this conversation</Link>}
            <button className={ghost} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
          </div>
        </header>
        <ol className="space-y-3" aria-label="Messages">
          {c.messages.map((m) => (
            <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-[#3A1C0C] text-[#FBF3E4]" : "border border-[#E9DDC9] bg-[#FBF6EA] text-[#2A1A10]"}`}>
                <span className="sr-only">{m.role === "user" ? "You: " : "Guide: "}</span>{m.content}
              </div>
            </li>
          ))}
        </ol>
        {!canContinue && <p className="mt-5 text-xs text-[#6E5D4E]">Inner Voice chats are kept for reading; they cannot be continued from here.</p>}
      </div>
      {confirm && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="cdel-h" className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1A10]/55 backdrop-blur-[2px] p-4">
          <div className={`${card} w-full max-w-sm bg-white p-6`}>
            <h2 id="cdel-h" className="font-home-serif font-semibold text-lg">Delete this conversation?</h2>
            <p className="mt-2 text-sm text-[#4A3A2C]">All its messages will be removed and cannot be recovered.</p>
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
export const MyBookings = () => <NotAvailable kind="bookings" title="My Bookings" sub="Puja and Darshan bookings." icon={ScrollText} action={<Link to="/puja" className={btn}>Browse pujas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />;
export const MyOrders = () => <NotAvailable kind="orders" title="My Orders" sub="Purchases from the Divine Shop." icon={PackageOpen} action={<Link to="/shop" className={btn}>Visit the shop <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />;
