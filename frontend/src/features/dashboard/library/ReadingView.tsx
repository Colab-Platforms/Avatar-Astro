import type { ReactNode } from "react";

/**
 * Renders a stored reading's ORIGINAL output generically: every field the provider returned, in order, with readable labels.
 * It shows exactly what was saved; it never calls a provider and never regenerates anything.
 */
const label = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const HIDDEN = new Set(["id", "success", "status"]);

function Node({ value, depth }: { value: unknown; depth: number }): ReactNode {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return <p className="whitespace-pre-line text-sm leading-relaxed text-[#301607]/90">{value}</p>;
  if (typeof value === "number" || typeof value === "boolean") return <p className="text-sm text-[#301607]/90">{String(value)}</p>;
  if (Array.isArray(value)) {
    const items = value.filter((v) => v !== null && v !== undefined && v !== "");
    if (!items.length) return null;
    if (items.every((v) => typeof v === "string" || typeof v === "number")) {
      return <ul className="list-disc space-y-1 pl-5 text-sm text-[#301607]/90">{items.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
    }
    return <div className="space-y-3">{items.map((v, i) => <div key={i} className="rounded-xl border border-[#E4D3B8] bg-white/60 p-3"><Node value={v} depth={depth + 1} /></div>)}</div>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));
    if (!entries.length) return null;
    return (
      <dl className="space-y-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className={depth === 0 ? "mb-1 font-display text-base text-[#803003]" : "mb-0.5 text-xs font-semibold uppercase tracking-wide text-[#803003]/80"}>{label(k)}</dt>
            <dd><Node value={v} depth={depth + 1} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export function ReadingView({ output }: { output: unknown }) {
  const body = <Node value={output} depth={0} />;
  return <div data-testid="reading-output">{body ?? <p className="text-sm text-[#301607]/70">This reading has no displayable content.</p>}</div>;
}
