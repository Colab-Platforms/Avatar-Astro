import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { longDate, range12, time12 } from "./format";
import type { DayResult } from "./types";

const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const HEAD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Sunrise-to-sunset as a bar: only the qualifying windows are filled, so a whole date is never shown as auspicious. */
export function DayBar({ day, className = "h-1.5" }: { day: DayResult; className?: string }) {
  if (!day.sunrise || !day.sunset) return null;
  const a = mins(day.sunrise), b = mins(day.sunset), span = Math.max(1, b - a);
  return (
    <span aria-hidden="true" className={`relative block w-full overflow-hidden rounded-full bg-[#592209]/10 ${className}`}>
      {day.windows.map((w) => (
        <span key={w.startUtc} className="absolute inset-y-0 rounded-full bg-[#C9873A]" style={{ left: `${((mins(w.startLocal) - a) / span) * 100}%`, width: `${Math.max(3, ((mins(w.endLocal) - mins(w.startLocal)) / span) * 100)}%` }} />
      ))}
    </span>
  );
}

const monthOf = (ymd: string) => ymd.slice(0, 7);
const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };

export default function MuhuratCalendar({ days, startDate, endDate, initialDate, onPickWindow }: { days: DayResult[]; startDate: string; endDate: string; initialDate?: string; onPickWindow?: (date: string) => void }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const [month, setMonth] = useState(monthOf(initialDate ?? startDate));
  const [picked, setPicked] = useState<string | null>(initialDate ?? null);

  const first = monthOf(startDate), last = monthOf(endDate);
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const day = picked ? byDate.get(picked) : undefined;

  return (
    <section aria-label="Calendar view" data-testid="muhurat-calendar" className="rounded-3xl border border-[#C9873A]/40 bg-[#FFFDF6] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-full border border-[#592209]/30 p-2 text-[#592209] disabled:opacity-30"><ChevronLeft size={18} aria-hidden="true" /></button>
        <h3 data-testid="calendar-month" aria-live="polite" className="text-lg font-bold text-[#301607]">{MONTH.format(new Date(Date.UTC(y, m - 1, 1)))}</h3>
        <button type="button" aria-label="Next month" disabled={month >= last} onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-full border border-[#592209]/30 p-2 text-[#592209] disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]" aria-hidden="true">{HEAD.map((h) => <span key={h}>{h}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((ymd, i) => {
          if (!ymd) return <span key={`e${i}`} />;
          const d = byDate.get(ymd);
          const n = d?.windows.length ?? 0;
          const state = !d ? "not-calculated" : n > 1 ? "multiple" : n === 1 ? "available" : "none";
          const text = !d ? "not calculated" : n === 0 ? "no qualifying window" : n === 1 ? "1 suitable window" : `${n} suitable windows`;
          return (
            <button
              key={ymd}
              type="button"
              data-testid="calendar-day"
              data-state={state}
              disabled={!d}
              aria-pressed={picked === ymd}
              aria-label={`${longDate(ymd)}: ${text}`}
              onClick={() => { setPicked(ymd); onPickWindow?.(ymd); }}
              className={`flex min-h-[3.4rem] flex-col items-center justify-between rounded-xl border px-1 py-1.5 text-sm transition-colors ${picked === ymd ? "border-[#592209] bg-[#592209]/10" : "border-[#592209]/10 bg-white/60 hover:border-[#592209]/40"} ${!d ? "opacity-40" : ""}`}
            >
              <span className={`font-semibold ${n ? "text-[#301607]" : "text-[#6B4A37]"}`}>{Number(ymd.slice(8))}</span>
              {d ? (n ? <><DayBar day={d} className="h-1" /><span className="text-[10px] font-semibold text-[#8A5A1E]">{n > 1 ? `${n} windows` : "1 window"}</span></> : <span className="text-[10px] text-[#6B4A37]/70">none</span>) : <span className="text-[10px]">&nbsp;</span>}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#4A2E1F]" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-6 rounded-full bg-[#C9873A]" /> Suitable window (the gold part shows when, between sunrise and sunset)</li>
        <li>“2 windows”: more than one suitable window that day</li>
        <li>“none”: no qualifying window under this method</li>
        <li className="opacity-60">Faded: outside your search, not calculated</li>
      </ul>

      <div aria-live="polite" data-testid="calendar-day-panel" className="mt-4 rounded-2xl border border-[#592209]/15 bg-white/60 p-4">
        {day ? (
          <>
            <h4 className="font-bold text-[#301607]">{longDate(day.date)}</h4>
            {day.sunrise && <p className="text-xs text-[#6B4A37]">Sunrise {time12(day.sunrise)} · Sunset {time12(day.sunset!)}</p>}
            {day.windows.length ? (
              <ul className="mt-3 space-y-2">
                {day.windows.map((w) => (
                  <li key={w.startUtc} className="rounded-xl border border-[#C9873A]/40 bg-[#FFF7E6] px-3 py-2 text-sm">
                    <span className="font-bold text-[#301607]">{range12(w.startLocal, w.endLocal)}</span>
                    <span className="text-[#4A2E1F]"> · {w.panchang.paksha} {w.panchang.tithi} · {w.panchang.nakshatra}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-[#4A2E1F]">
                <p>No qualifying window on this date under the selected method.</p>
                {day.blockers.length > 0 && <ul className="mt-1 list-disc pl-5 text-[#6B4A37]">{day.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#6B4A37]">Select a date to see its suitable timings.</p>
        )}
      </div>
    </section>
  );
}
