import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, Inbox, Loader2, PlugZap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin design tokens. Light, warm-neutral SaaS look: white surfaces on a soft background, hairline borders,
 * one restrained accent (gerua). Typography is Inter, set once on the admin shell (see AdminLayout).
 */
export const panelColors = { page: "#FAF8F5", surface: "#FFFFFF", line: "#E8E3DC", ink: "#1F1B16", muted: "#6B6259", accent: "#803003" } as const;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1F1B16] sm:text-[1.75rem]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6259]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: { title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-[#E8E3DC] bg-white p-5 shadow-[0_1px_2px_rgba(31,27,22,0.04)]", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[0.95rem] font-semibold text-[#1F1B16]">{title}</h3>}
            {description && <p className="mt-0.5 text-xs leading-relaxed text-[#6B6259]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * KPI tile. With `to` the whole tile is a real link (keyboard focusable, visible focus ring, hover lift and a
 * chevron affordance); without it the tile is static. Only pass `to` when the destination is meaningful.
 */
export function Stat({ label, value, hint, tone = "default", to }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "bad"; to?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.8rem] font-medium text-[#6B6259]">{label}</p>
        {to && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#B8AFA4] transition group-hover:translate-x-0.5 group-hover:text-[#803003]" aria-hidden="true" />}
      </div>
      <p className={cn("mt-1.5 text-[1.65rem] font-semibold leading-none tabular-nums", tone === "bad" ? "text-red-700" : "text-[#1F1B16]")}>{value}</p>
      {hint && <p className="mt-2 text-xs leading-snug text-[#6B6259]">{hint}</p>}
    </>
  );
  const base = "block rounded-xl border border-[#E8E3DC] bg-white p-4 shadow-[0_1px_2px_rgba(31,27,22,0.04)]";
  if (!to) return <div className={base}>{body}</div>;
  return (
    <Link
      to={to}
      aria-label={`${label}: ${typeof value === "string" || typeof value === "number" ? value : ""}. Open details`}
      className={cn(base, "group transition hover:-translate-y-px hover:border-[#C9BFB2] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003]")}
    >
      {body}
    </Link>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B6259]" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-[#803003]" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-900" role="alert">
      <AlertTriangle className="h-6 w-6" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm hover:bg-red-100">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-[#6B6259]">
      <Inbox className="h-6 w-6 text-[#B8AFA4]" />
      <p className="font-medium text-[#1F1B16]">{title}</p>
      {hint && <p className="max-w-md text-sm">{hint}</p>}
    </div>
  );
}

/** Used where no real data source exists. Never styled like a working feature. */
export function NotConfigured({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#D8CFC3] bg-[#FBF8F3] p-8 text-center" role="note">
      <PlugZap className="h-7 w-7 text-[#803003]" />
      <p className="font-semibold text-[#1F1B16]">{title}</p>
      <span className="rounded-full bg-[#803003]/10 px-2.5 py-0.5 text-xs font-medium text-[#803003]">Not configured</span>
      <p className="max-w-lg text-sm text-[#6B6259]">{reason}</p>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const tones = {
    neutral: "bg-[#F1ECE5] text-[#4A423A]",
    good: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
    bad: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
    warn: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
  } as const;
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export const inputClass =
  "w-full rounded-lg border border-[#DDD6CC] bg-white px-3 py-2 text-sm text-[#1F1B16] placeholder:text-[#9A9086] focus:border-[#803003] focus:outline-none focus:ring-2 focus:ring-[#803003]/20";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#803003] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6B2802] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003] disabled:cursor-not-allowed disabled:opacity-50";
export const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#DDD6CC] bg-white px-3 py-1.5 text-sm font-medium text-[#1F1B16] transition hover:bg-[#F7F4EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003] disabled:cursor-not-allowed disabled:opacity-50";

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[#1F1B16]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#6B6259]">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E3DC] bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-[#F7F4EF] text-xs font-medium text-[#6B6259]">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#EEE9E2] text-[#1F1B16]">{children}</tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[#6B6259]">
      <span>{total.toLocaleString()} total · page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button type="button" className={ghostBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className={ghostBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

/** Tiny dependency-free bar chart; every bar is real data passed in. */
export function Bars({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={label} className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.label}: ${d.value}`}>
          <div className="w-full rounded-t bg-[#C9855A] transition group-hover:bg-[#803003]" style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtPct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));
export const personName = (u: { firstName?: string | null; lastName?: string | null; name?: string | null; email?: string | null }) =>
  u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown";
