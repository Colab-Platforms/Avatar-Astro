import { ResultView } from "@/features/ratna/ResultView";
import type { RatnaResult } from "@/features/ratna/types";
import "@/features/ratna/ratna.css";
import { Nested, Technical } from "../ReadingView";

/**
 * Ratna Jyotish, rendered by the SAME result view as the live calculator page (hero, birth details, panchang, primary stone,
 * associations, wearing customs, alternatives, method and limitations), fed with the stored original. Calculation internals that
 * the live page keeps out of sight are kept here too, in one collapsed section, so nothing in the saved reading is lost.
 */
export default function RatnaSaved({ result }: { result: RatnaResult }) {
  const tech: [string, unknown][] = [
    ["Audit metadata", result.audit],
    ["Ayanamsa", result.method?.ayanamsa],
    ["Ephemeris engine", result.method?.engine],
    ["Calculation factors (primary stone)", result.primary?.factors],
    ["Calculation factors (recommendation)", result.recommendation?.factors],
    ["Explanation source", result.explanation ? { source: result.explanation.source === "ai" ? "AI-written explanation" : "Rule-based explanation", fallbackReason: result.explanation.fallbackReason } : null],
    ["Stable signs", result.stableSigns],
    ["Panchang convention and notes", result.panchang ? { convention: result.panchang.convention, basis: result.panchang.basis, reckonedAtUtc: result.panchang.reckonedAtUtc, uncertain: result.panchang.uncertain, uncertainties: result.panchang.uncertainties, notes: result.panchang.notes } : null],
    ["Birth data used", { timeZone: result.birth?.timeZone, utcOffsetMinutes: result.birth?.utcOffsetMinutes, ambiguousLocalTime: result.birth?.ambiguousLocalTime }],
    ["Notice", result.notice],
  ];
  const present = tech.filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <div data-testid="reading-output" data-renderer="ratna" className="ratna-saved space-y-5">
      <ResultView result={result} />
      <Technical hint="audit, ayanamsa, engine, factors, source, stable signs">
        {present.map(([label, value]) => (
          <div key={label}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#A8803A]">{label}</p>
            <Nested value={value} />
          </div>
        ))}
      </Technical>
    </div>
  );
}
