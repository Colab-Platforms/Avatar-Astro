import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Bookmark, BookmarkCheck, CalendarHeart, CircleUserRound, Compass, Gem, Hand, HeartHandshake, Loader2, MessageCircleHeart,
  MoonStar, ScrollText, Sparkles, Sun, Type, Waypoints, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadingCard } from "./api";

/** Visual language of the personal dashboard: ivory page, terracotta primary, muted gold accent. */
export const GOLD = "#B8893B";
export const card = "rounded-2xl border border-[#E4D3B8] bg-[#FBF5EC] shadow-[0_1px_3px_rgba(80,40,10,0.06)]";
export const field = "w-full rounded-xl border border-[#D9C4A3] bg-white px-3 py-2 text-sm text-[#301607] placeholder:text-[#301607]/50 focus:border-[#803003] focus:outline-none focus:ring-2 focus:ring-[#B8893B]/40";
export const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#803003] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6B2802] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8893B] disabled:cursor-not-allowed disabled:opacity-50";
export const ghost = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#803003]/30 bg-white/70 px-3 py-1.5 text-sm text-[#301607] transition-colors hover:bg-[#B8893B]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8893B] disabled:cursor-not-allowed disabled:opacity-50";

export const FEATURE_ICON: Record<string, LucideIcon> = {
  tarot: Sparkles, horoscope: Sun, "birth-chart": Compass, compatibility: HeartHandshake, "name-analysis": Type, "palm-reading": Hand,
  gemstone: Gem, karma: Waypoints, shloka: ScrollText, "life-path": MoonStar, journal: ScrollText, "guru-report": ScrollText,
  "ai-guru": MessageCircleHeart, "inner-voice": MessageCircleHeart,
};
export const iconFor = (feature: string | null | undefined): LucideIcon => (feature && FEATURE_ICON[feature]) || CircleUserRound;

/** Where a feature lives on the site, so "continue" and "try this" links go to the real page. */
export const FEATURE_PATH: Record<string, string> = {
  tarot: "/tarot", horoscope: "/horoscopes", "birth-chart": "/birth-chart", compatibility: "/compatibility", "name-analysis": "/name-destiny-report",
  "palm-reading": "/palm-reading", gemstone: "/ratna-jyotish", karma: "/inner-voice", shloka: "/inner-voice/wisdom", "life-path": "/inner-voice/future-path",
  "ai-guru": "/inner-voice/chat", "guru-report": "/inner-voice/chat", "inner-voice": "/inner-voice", journal: "/inner-voice",
};

export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtDay = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl tracking-wide text-[#301607] sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#301607]/70">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div role="status" className="flex items-center gap-2 py-10 text-[#301607]/70"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-[#803003]" aria-hidden="true" /> {label}</div>;
}

export function ErrorBox({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> We could not load this.</p>
      {error?.message && <p className="text-sm">{error.message}</p>}
      {onRetry && <button className={ghost} onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ icon: Icon = Sparkles, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={cn(card, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8893B]/20 text-[#803003]"><Icon className="h-6 w-6" aria-hidden="true" /></span>
      <p className="font-display text-lg text-[#301607]">{title}</p>
      {body && <p className="max-w-md text-sm leading-relaxed text-[#301607]/70">{body}</p>}
      {action}
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="mt-4 text-xs text-[#301607]/60">{total} item{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3 text-sm">
      <span className="text-xs text-[#301607]/60">Page {page} of {totalPages} · {total} items</span>
      <span className="flex gap-2">
        <button className={ghost} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className={ghost} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  );
}

export function FeatureBadge({ feature, label }: { feature: string; label: string }) {
  const Icon = iconFor(feature);
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B8893B]/20 px-2.5 py-0.5 text-xs font-medium text-[#5a2a08]"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>;
}

/** Bookmark toggle. aria-pressed reflects the saved state; the label says what pressing it does. */
export function SaveButton({ saved, busy, onToggle, title }: { saved: boolean; busy?: boolean; onToggle: () => void; title: string }) {
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? `Remove "${title}" from saved` : `Save "${title}"`} disabled={busy} onClick={onToggle}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8893B] disabled:opacity-50", saved ? "border-[#803003] bg-[#803003] text-white" : "border-[#803003]/30 bg-white/70 text-[#803003] hover:bg-[#B8893B]/15")}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** One reading in a list: icon, title, date, short preview, open and save. Never shows the full output. */
export function ReadingCardView({ r, onToggleSave, saving }: { r: ReadingCard; onToggleSave: (r: ReadingCard) => void; saving?: boolean }) {
  const Icon = iconFor(r.feature);
  return (
    <article className={cn(card, "flex flex-col gap-3 p-5 transition-shadow hover:shadow-md")}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#803003] text-[#F5E9D6]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base text-[#301607]">{r.title}</h3>
          <p className="text-xs text-[#301607]/60">{r.featureLabel} · {fmtDateTime(r.createdAt)}</p>
        </div>
        <SaveButton saved={r.isSaved} busy={saving} onToggle={() => onToggleSave(r)} title={r.title} />
      </div>
      {r.summary && <p className="line-clamp-3 text-sm leading-relaxed text-[#301607]/80">{r.summary}</p>}
      <div className="mt-auto flex items-center justify-between">
        <Link to={`/dashboard/readings/${r.id}`} className={btn}>View reading</Link>
        {r.isSaved && <span className="text-xs font-medium text-[#803003]">Saved</span>}
      </div>
    </article>
  );
}

export { CalendarHeart };
