import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003]";

/** One compact metric. With `to` the whole tile is a link to the records behind the number. */
export function Kpi({ label, value, hint, icon: Icon, tone = "default", to }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone?: "default" | "bad"; to?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[12px] font-medium leading-tight text-[#6B6259]">{label}</p>
        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", tone === "bad" ? "bg-[#B3261E]/10 text-[#B3261E]" : "bg-[#F5E9D6] text-[#803003]")}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
      </div>
      <p className={cn("mt-1.5 text-[1.45rem] font-semibold leading-none tabular-nums", tone === "bad" ? "text-[#B3261E]" : "text-[#33251D]")}>{value}</p>
      {hint && <p className="mt-1.5 truncate text-[11px] leading-snug text-[#6B6259]" title={hint}>{hint}</p>}
    </>
  );
  const base = "block rounded-xl border border-[#E8E3DC] bg-white p-3.5 shadow-[0_1px_2px_rgba(51,37,29,0.04)]";
  if (!to) return <div className={base}>{body}</div>;
  return (
    <Link to={to} aria-label={`${label}: ${typeof value === "string" || typeof value === "number" ? value : ""}. Open details`} className={cn(base, "transition hover:-translate-y-px hover:border-[#C9BFB2] hover:shadow-md", focusRing)}>
      {body}
    </Link>
  );
}

/** A titled panel whose header carries the "View all" link to the full page. */
export function Panel({ title, note, to, linkLabel = "View all", children, className }: { title: string; note?: string; to?: string; linkLabel?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-[#E8E3DC] bg-white p-4 shadow-[0_1px_2px_rgba(51,37,29,0.04)]", className)}>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold text-[#33251D]">{title}</h3>
          {note && <p className="mt-0.5 text-[11px] leading-snug text-[#6B6259]">{note}</p>}
        </div>
        {to && <Link to={to} className={cn("inline-flex shrink-0 items-center gap-0.5 rounded text-xs font-medium text-[#803003] hover:underline", focusRing)}>{linkLabel}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
      </div>
      {children}
    </section>
  );
}

/** Shown inside a panel when there is nothing to list, or when its own data could not be loaded. */
export function PanelEmpty({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "error" }) {
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3 py-5 text-center text-xs", tone === "error" ? "bg-[#B3261E]/5 text-[#B3261E]" : "bg-[#FAF8F5] text-[#6B6259]")}>{children}</p>;
}

/** One line of a recent-activity list. */
export function RecentRow({ to, primary, secondary, trailing }: { to?: string; primary: ReactNode; secondary?: ReactNode; trailing?: ReactNode }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-[#33251D]">{primary}</span>
        {secondary && <span className="block truncate text-[11px] text-[#6B6259]">{secondary}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right text-[11px] text-[#6B6259]">{trailing}</span>}
    </>
  );
  const row = "flex items-center gap-3 py-2";
  return <li>{to ? <Link to={to} className={cn(row, "rounded hover:text-[#803003]", focusRing)}>{inner}</Link> : <div className={row}>{inner}</div>}</li>;
}

export interface AlertItem { key: string; label: string; count: number; tone: "bad" | "warn"; to?: string; when: string }

/** Only alerts that have a real, non-zero count are passed in; nothing is shown for a zero. */
export function AlertList({ items }: { items: AlertItem[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((a) => {
        const inner = (
          <>
            <span className={cn("grid h-7 min-w-[1.75rem] shrink-0 place-items-center rounded-md px-1.5 text-[13px] font-bold tabular-nums", a.tone === "bad" ? "bg-[#B3261E]/10 text-[#B3261E]" : "bg-[#E58A45]/20 text-[#7A3E0B]")}>{a.count.toLocaleString("en-IN")}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-[#33251D]">{a.label}</span><span className="block text-[11px] text-[#6B6259]">{a.when}</span></span>
            {a.to && <ChevronRight className="h-4 w-4 shrink-0 text-[#8C8379]" aria-hidden="true" />}
          </>
        );
        const base = "flex items-center gap-2.5 rounded-lg border border-[#E8E3DC] bg-[#FFFCF7] px-2.5 py-2";
        return <li key={a.key}>{a.to ? <Link to={a.to} className={cn(base, "hover:border-[#C9BFB2] hover:bg-white", focusRing)}>{inner}</Link> : <div className={base}>{inner}</div>}</li>;
      })}
    </ul>
  );
}

export interface QuickAction { to: string; label: string; icon: LucideIcon }

export function QuickActions({ items }: { items: QuickAction[] }) {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className={cn("flex items-center gap-2 rounded-lg border border-[#E8E3DC] bg-white px-3 py-2.5 text-[13px] font-medium text-[#33251D] transition hover:border-[#803003]/40 hover:bg-[#F5E9D6]/50", focusRing)}>
          <Icon className="h-4 w-4 shrink-0 text-[#803003]" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
