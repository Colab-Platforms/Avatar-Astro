import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { card } from "./ui";

/**
 * Readable, structured presentation of a stored reading's ORIGINAL output, used for every feature that has no dedicated renderer.
 * It never calls a provider, never regenerates anything and never drops a field: short facts become a fact grid, long text becomes
 * paragraphs, lists become lists, lists of objects become cards, and calculation internals move into collapsed "Technical details".
 */
export const labelOf = (k: string) =>
  k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Keys that describe how a result was produced rather than what it says. They stay available, but collapsed. */
const TECH = /^(audit|ayanamsa|ayanamsha|engine|ephemeris|factors|source|fallbackReason|provider|model|usage|tokens|meta|metadata|debug|stableSigns|version|cache|cached|requestId|timing|durationMs|trace|raw|calculation|calculationMeta|method|notCalculated)$/i;
const HIDDEN = new Set(["id", "success", "status"]);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (isObj(v) && Object.keys(v).length === 0);
const isShort = (v: unknown) => (typeof v === "string" && v.length <= 70 && !v.includes("\n")) || typeof v === "number" || typeof v === "boolean";
const show = (v: unknown) => (typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

/** Labelled, readable rendering of any nested value (used inside cards and the technical accordion). Never raw JSON. */
export function Nested({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (empty(value)) return null;
  if (typeof value === "string") return <p className="whitespace-pre-line text-sm leading-relaxed text-[#4A3A2C]">{value}</p>;
  if (typeof value === "number" || typeof value === "boolean") return <p className="text-sm text-[#4A3A2C]">{show(value)}</p>;
  if (Array.isArray(value)) {
    const items = value.filter((v) => !empty(v));
    if (items.every((v) => typeof v === "string" || typeof v === "number")) {
      return <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#4A3A2C]">{items.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
    }
    return <div className="space-y-2.5">{items.map((v, i) => <div key={i} className="rounded-xl border border-[#EFE4D0] bg-white/70 p-3.5"><Nested value={v} depth={depth + 1} /></div>)}</div>;
  }
  if (isObj(value)) {
    const entries = Object.entries(value).filter(([k, v]) => !HIDDEN.has(k) && !empty(v));
    const facts = entries.filter(([, v]) => isShort(v));
    const rest = entries.filter(([, v]) => !isShort(v));
    return (
      <div className="space-y-3">
        {facts.length > 0 && (
          <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">{labelOf(k)}</dt><dd className="break-words text-sm text-[#2A1A10]">{show(v)}</dd></div>)}
          </dl>
        )}
        {rest.map(([k, v]) => (
          <div key={k}>
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">{labelOf(k)}</p>
            <Nested value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/** Collapsed-by-default panel (native details/summary: keyboard and screen-reader friendly, no script). */
export function Technical({ title = "Technical details", hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-[#E9DDC9] bg-[#FBF6EA] open:bg-[#FFFDF8]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#2A1A10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A8803A] [&::-webkit-details-marker]:hidden">
        <span>{title}{hint && <span className="ml-2 text-xs font-normal text-[#6E5D4E]">{hint}</span>}</span>
        <span aria-hidden="true" className="text-[#A8803A] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-[#EFE4D0] px-4 py-4">{children}</div>
    </details>
  );
}

const Section = ({ title, children, tone }: { title: string; children: ReactNode; tone?: "lead" }) => (
  <section className={cn("rounded-2xl border p-5", tone === "lead" ? "border-[#D9C28F] bg-gradient-to-br from-[#FFFDF8] to-[#F7ECD3]" : "border-[#E9DDC9] bg-white/70")}>
    <h3 className="mb-2 font-home-serif text-base font-semibold text-[#2A1A10]">{title}</h3>
    {children}
  </section>
);

/** Top-level structured document for an arbitrary stored output. */
export function StructuredView({ output }: { output: unknown }) {
  if (typeof output === "string") return <Section title="Reading"><Nested value={output} /></Section>;
  if (Array.isArray(output)) return <Nested value={output} />;
  if (!isObj(output)) return null;
  const entries = Object.entries(output).filter(([k, v]) => !HIDDEN.has(k) && !empty(v));
  const tech = entries.filter(([k]) => TECH.test(k));
  const main = entries.filter(([k]) => !TECH.test(k));
  const facts = main.filter(([, v]) => isShort(v));
  const prose = main.filter(([, v]) => typeof v === "string" && !isShort(v));
  const lists = main.filter(([, v]) => Array.isArray(v) && (v as unknown[]).every((x) => typeof x === "string" || typeof x === "number"));
  const cards = main.filter(([, v]) => Array.isArray(v) && !(v as unknown[]).every((x) => typeof x === "string" || typeof x === "number"));
  const groups = main.filter(([, v]) => isObj(v));
  return (
    <div className="space-y-4">
      {facts.length > 0 && (
        <Section title="At a glance">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#A8803A]">{labelOf(k)}</dt><dd className="mt-0.5 break-words text-sm font-medium text-[#2A1A10]">{show(v)}</dd></div>)}
          </dl>
        </Section>
      )}
      {prose.map(([k, v], i) => <Section key={k} title={labelOf(k)} tone={i === 0 ? "lead" : undefined}><Nested value={v} /></Section>)}
      {(lists.length > 0 || groups.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists.map(([k, v]) => <Section key={k} title={labelOf(k)}><Nested value={v} /></Section>)}
          {groups.map(([k, v]) => <Section key={k} title={labelOf(k)}><Nested value={v} /></Section>)}
        </div>
      )}
      {cards.map(([k, v]) => <Section key={k} title={labelOf(k)}><Nested value={v} /></Section>)}
      {tech.length > 0 && (
        <Technical hint="how this result was produced">
          {tech.map(([k, v]) => <div key={k}><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#A8803A]">{labelOf(k)}</p><Nested value={v} /></div>)}
        </Technical>
      )}
    </div>
  );
}

/** Kept as the generic entry point (and its test id) for readings without a dedicated renderer. */
export function ReadingView({ output }: { output: unknown }) {
  const body = !empty(output) && (isObj(output) || typeof output === "string" || Array.isArray(output)) ? <StructuredView output={output} /> : null;
  return (
    <div data-testid="reading-output" className={cn(!body && card, !body && "p-5")}>
      {body ?? <p className="text-sm text-[#6E5D4E]">This reading has no displayable content.</p>}
    </div>
  );
}
