import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, validateCustomRange, type RangePreset, type ResolvedRange } from "./dateRange";

interface Props {
  range: ResolvedRange;
  /** Called with a preset, or with "custom" and the two dates once they are valid. */
  onChange: (preset: RangePreset, custom?: { from: string; to: string }) => void;
}

const dateInput = "h-8 rounded-md border border-[#E3D2B4] bg-white px-2 text-[13px] text-[#33251D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#803003]/50";

export function DateRangeFilter({ range, onChange }: Props) {
  const [custom, setCustom] = useState(range.preset === "custom" ? { from: range.from, to: range.to } : { from: "", to: "" });
  const [showCustom, setShowCustom] = useState(range.preset === "custom");
  const [error, setError] = useState<string | null>(range.error ?? null);
  useEffect(() => { setError(range.error ?? null); }, [range.error]);

  const pick = (id: RangePreset) => {
    if (id === "custom") { setShowCustom(true); return; }
    setShowCustom(false); setError(null);
    onChange(id);
  };
  const apply = () => {
    const problem = validateCustomRange(custom.from, custom.to);
    setError(problem);
    if (!problem) onChange("custom", custom);
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div role="group" aria-label="Date range" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#F5E9D6]/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RANGE_PRESETS.map((p) => {
          const on = p.id === "custom" ? showCustom || range.preset === "custom" : range.preset === p.id && !showCustom;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(p.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]",
                on ? "bg-[#803003] text-[#FFF6E6] shadow-sm" : "text-[#33251D] hover:bg-[#803003]/10",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {showCustom && (
        <form noValidate className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <label className="text-xs text-[#6B6259]">
            From
            <input type="date" aria-label="From date" className={cn(dateInput, "mt-0.5 block")} value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          </label>
          <label className="text-xs text-[#6B6259]">
            To
            <input type="date" aria-label="To date" className={cn(dateInput, "mt-0.5 block")} value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </label>
          <button type="submit" className="h-8 rounded-md bg-[#803003] px-3 text-[13px] font-medium text-[#FFF6E6] hover:bg-[#6B2802] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003]">Apply</button>
        </form>
      )}
      {error && <p role="alert" className="text-xs text-[#B3261E]">{error}</p>}
    </div>
  );
}
