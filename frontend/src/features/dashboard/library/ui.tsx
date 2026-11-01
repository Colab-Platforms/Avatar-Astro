import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Bookmark, BookmarkCheck, CalendarHeart, CircleUserRound, Compass, Gem, Hand, HeartHandshake, MessageCircleHeart,
  MoonStar, ScrollText, Sparkles, Sun, Type, Waypoints, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadingCard } from "./api";

/**
 * Visual language of the personal dashboard. One restrained system: warm ivory page, white-ivory surfaces with hairline borders,
 * espresso brown for primary actions and strong text, terracotta only as a small accent (links, active marker), muted gold for icon chips.
 */
export const GOLD = "#A8803A";
export const card = "rounded-2xl border border-[#E9DDC9] bg-[#FFFDF8] shadow-[0_1px_2px_rgba(58,28,12,0.04),0_10px_28px_-16px_rgba(58,28,12,0.12)]";
export const cardHover = "transition duration-200 hover:-translate-y-0.5 hover:border-[#D8C6A6] hover:shadow-[0_1px_2px_rgba(58,28,12,0.05),0_16px_32px_-16px_rgba(58,28,12,0.2)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";
export const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8803A]";
export const field = "w-full rounded-xl border border-[#E0D2BA] bg-white px-3.5 py-2.5 text-sm text-[#2A1A10] placeholder:text-[#2A1A10]/45 transition focus:border-[#7A2E0A] focus:outline-none focus:ring-4 focus:ring-[#A8803A]/20";
export const btn = `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3A1C0C] px-4 py-2 text-sm font-medium text-[#FBF3E4] shadow-sm transition-colors hover:bg-[#2A1308] ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`;
export const ghost = `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E0D2BA] bg-white px-3.5 py-2 text-sm font-medium text-[#2A1A10] transition-colors hover:bg-[#F6EEDF] ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`;
export const textLink = `rounded text-sm font-medium text-[#7A2E0A] underline-offset-4 hover:underline ${focusRing}`;
export const labelCls = "text-xs font-medium text-[#6E5D4E]";

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

/** "3 hours ago" for recent moments, a plain date for older ones. Only formats a real timestamp. */
export function ago(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return fmtDay(iso);
}

export function PageHeader({ title, sub, actions, eyebrow }: { title: string; sub?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#E9DDC9] pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#A8803A]">{eyebrow}</p>}
        <h1 className="font-home-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-[#2A1A10] sm:text-[1.9rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#6E5D4E]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ id, title, action }: { id?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <h2 id={id} className="font-home-serif text-lg font-semibold tracking-tight text-[#2A1A10]">{title}</h2>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#EFE4D0]/70 motion-reduce:animate-none" />)}
      </div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-5 text-red-900">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> We could not load this.</p>
      {error?.message && <p className="text-sm">{error.message}</p>}
      {onRetry && <button className={ghost} onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ icon: Icon = Sparkles, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={cn(card, "flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center")}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E8D4] text-[#7A2E0A] ring-8 ring-[#F3E8D4]/50"><Icon className="h-6 w-6" aria-hidden="true" /></span>
      <p className="font-home-serif text-lg font-semibold text-[#2A1A10]">{title}</p>
      {body && <p className="max-w-md text-sm leading-relaxed text-[#6E5D4E]">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="mt-5 text-xs text-[#6E5D4E]">{total} item{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-xs text-[#6E5D4E]">Page {page} of {totalPages} · {total} items</span>
      <span className="flex gap-2">
        <button className={ghost} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className={ghost} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  );
}

type Tone = "gold" | "brown" | "sage" | "plum";
const TONES: Record<Tone, string> = { gold: "bg-[#F3E8D4] text-[#8A5A12]", brown: "bg-[#EADBD0] text-[#6B2802]", sage: "bg-[#E3EBDD] text-[#3F5E3D]", plum: "bg-[#EBE0E8] text-[#6A3A63]" };

/** Rounded icon chip used on lists and cards. */
export function IconChip({ icon: Icon, tone = "gold", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl", TONES[tone], size === "sm" ? "h-9 w-9" : "h-11 w-11")}>
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
    </span>
  );
}

/** One metric. The value comes first and the label immediately after it (assistive tech reads "2, Readings generated"). */
export function StatCard({ icon, tone, value, label, hint, className }: { icon: LucideIcon; tone?: Tone; value: ReactNode; label: string; hint?: string; className?: string }) {
  return (
    <div className={cn(card, "flex flex-col gap-3.5 p-4 sm:p-5", className)}>
      <IconChip icon={icon} tone={tone} size="sm" />
      <div>
        <p className="font-home-sans text-[1.7rem] font-semibold leading-none tabular-nums tracking-tight text-[#2A1A10]">{value}</p>
        <p className="mt-2 text-[0.8rem] font-medium text-[#4A3A2C]">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[#6E5D4E]">{hint}</p>}
      </div>
    </div>
  );
}

export function FeatureBadge({ feature, label }: { feature: string; label: string }) {
  const Icon = iconFor(feature);
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8D4] px-2.5 py-0.5 text-xs font-medium text-[#6B4A12]"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>;
}

/** Bookmark toggle. aria-pressed reflects the saved state; the label says what pressing it does. */
export function SaveButton({ saved, busy, onToggle, title }: { saved: boolean; busy?: boolean; onToggle: () => void; title: string }) {
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? `Remove "${title}" from saved` : `Save "${title}"`} disabled={busy} onClick={onToggle}
      className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50", focusRing, saved ? "border-[#3A1C0C] bg-[#3A1C0C] text-[#FBF3E4]" : "border-[#E0D2BA] bg-white text-[#6B2802] hover:bg-[#F6EEDF]")}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** One reading in a list: icon, title, date, short preview, open and save. Never shows the full output. */
export function ReadingCardView({ r, onToggleSave, saving }: { r: ReadingCard; onToggleSave: (r: ReadingCard) => void; saving?: boolean }) {
  const Icon = iconFor(r.feature);
  return (
    <article className={cn(card, cardHover, "flex flex-col gap-3 p-5")}>
      <div className="flex items-start gap-3">
        <IconChip icon={Icon} tone="brown" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-home-serif text-base font-semibold text-[#2A1A10]">{r.title}</h3>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">{r.featureLabel} · {fmtDateTime(r.createdAt)}</p>
        </div>
        <SaveButton saved={r.isSaved} busy={saving} onToggle={() => onToggleSave(r)} title={r.title} />
      </div>
      {r.summary && <p className="line-clamp-3 text-sm leading-relaxed text-[#4A3A2C]">{r.summary}</p>}
      <div className="mt-auto flex items-center justify-between pt-1">
        <Link to={`/dashboard/readings/${r.id}`} className={btn}>View reading</Link>
        {r.isSaved && <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B2802]"><BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />Saved</span>}
      </div>
    </article>
  );
}

export { CalendarHeart };
