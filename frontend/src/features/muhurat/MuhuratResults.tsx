import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, BookmarkCheck, CalendarPlus, Copy, MapPin, Share2, Sun } from "lucide-react";
import MuhuratCalendar, { DayBar } from "./MuhuratCalendar";
import { copyText, downloadIcs, shareMuhurat, windowText } from "./sharing";
import { daysBetween, longDate, placeLabel, range12, shortDate, time12 } from "./format";
import { savedId, type SavedMuhurat } from "./saved";
import type { DayResult, MuhuratPlace, MuhuratResult, MuhuratWindow } from "./types";

interface Saver { isSaved: (id: string) => boolean; toggle: (e: Omit<SavedMuhurat, "savedAt">) => void }

const CONFIDENCE: Record<string, string> = {
  consensus: "The core lists for this event (tithi, nakshatra, weekday) agree across the Panchang references consulted.",
  general: "This event follows the general auspicious-time conventions. The references consulted give no separate list for it, so no extra event-specific rule has been added.",
};

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-[#592209]/5 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{k}</dt><dd className="text-[15px] font-semibold text-[#301607]">{v}</dd></div>;
}

function Actions({ w, eventId, eventLabel, place, saver }: { w: MuhuratWindow; eventId: string; eventLabel: string; place: MuhuratPlace; saver: Saver }) {
  const [msg, setMsg] = useState("");
  const id = savedId(eventId, place, w);
  const saved = saver.isSaved(id);
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-[#592209]/40 px-3.5 py-1.5 text-sm font-semibold text-[#592209] hover:bg-[#592209]/10";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} aria-pressed={saved} onClick={() => { saver.toggle({ id, eventId, eventLabel, place, window: w }); setMsg(saved ? "Removed from saved." : "Saved in this browser."); }}>
          {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />} {saved ? "Saved" : "Save"}
        </button>
        <button type="button" className={btn} onClick={async () => setMsg((await copyText(windowText(w, eventLabel, place))) ? "Timing copied." : "Could not copy. Please select the text and copy it.")}>
          <Copy size={16} aria-hidden="true" /> Copy
        </button>
        <button type="button" className={btn} onClick={async () => { const r = await shareMuhurat(eventLabel, place, w); setMsg(r === "shared" ? "Shared." : r === "copied" ? "Sharing is not available here, so the text was copied." : r === "cancelled" ? "" : "Could not share."); }}>
          <Share2 size={16} aria-hidden="true" /> Share
        </button>
        <button type="button" className={btn} onClick={() => setMsg(downloadIcs(eventLabel, place, w) ? "Calendar file downloaded. Open it to add the event to your calendar." : "Could not create the calendar file.")}>
          <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-1.5 min-h-[1.1rem] text-xs text-[#6B4A37]">{msg}</p>
    </div>
  );
}

function Details({ w, day }: { w: MuhuratWindow; day?: DayResult }) {
  return (
    <details className="mt-4 rounded-xl border border-[#592209]/15 bg-white/50 p-3 text-sm text-[#4A2E1F]">
      <summary className="cursor-pointer font-semibold text-[#592209]">Calculation details</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact k="Weekday" v={w.weekday} />
        <Fact k="Tithi" v={`${w.panchang.paksha} ${w.panchang.tithi}`} />
        <Fact k="Nakshatra" v={`${w.panchang.nakshatra}, pada ${w.panchang.pada}`} />
        <Fact k="Yoga" v={w.panchang.yoga} />
        <Fact k="Karana" v={w.panchang.karana} />
        {day?.sunrise && <Fact k="Sunrise · Sunset" v={`${time12(day.sunrise)} · ${time12(day.sunset!)}`} />}
      </dl>
      {w.changes.length > 0 && <><p className="mt-3 font-semibold">Changes inside this window</p><ul className="list-disc pl-5">{w.changes.map((c) => <li key={c}>{c}</li>)}</ul></>}
      <p className="mt-3 font-semibold">Avoided periods that day</p>
      <ul className="list-disc pl-5">{w.avoidedPeriods.map((p) => <li key={p.label}>{p.label}: {range12(p.startLocal, p.endLocal)}</li>)}</ul>
      <p className="mt-3 font-semibold">How this window was ranked ({w.score} of 100)</p>
      <ul className="list-disc pl-5">{w.scoreParts.map((p) => <li key={p.label}>{p.label}: +{p.points}</li>)}</ul>
      <p className="mt-2 text-xs text-[#6B4A37]">All times are local time at the event location. The ranking only orders windows that already qualify; it is not a classical grade.</p>
    </details>
  );
}

function WindowCard({ w, featured, result, day, saver }: { w: MuhuratWindow; featured?: boolean; result: MuhuratResult; day?: DayResult; saver: Saver }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      data-testid={featured ? "best-muhurat" : "other-muhurat"}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-3xl border bg-[#FFFDF6] p-5 sm:p-7 ${featured ? "border-[#C9873A] shadow-[0_18px_40px_-22px_rgba(89,34,9,0.55)]" : "border-[#C9873A]/40 shadow-sm"}`}
    >
      {featured && <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8A5A1E]"><Sun size={14} aria-hidden="true" /> Your Suitable Muhurat</p>}
      <h3 className={`font-bold text-[#301607] ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}>{longDate(w.date)}</h3>
      <p data-testid="window-time" className={`font-bold text-[#C9873A] ${featured ? "mt-1 text-4xl sm:text-5xl" : "mt-1 text-2xl"}`} style={{ fontFamily: "'Astra','Cinzel',serif" }}>{range12(w.startLocal, w.endLocal)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#4A2E1F]"><MapPin size={14} aria-hidden="true" /> {placeLabel(result.place)} <span className="text-[#6B4A37]">· local time</span></p>
      {day && <div className="mt-3 max-w-sm"><DayBar day={day} className="h-2" /><p className="mt-1 text-[11px] text-[#6B4A37]">Gold: every suitable window that day, between sunrise {time12(day.sunrise!)} and sunset {time12(day.sunset!)}</p></div>}

      <dl className={`mt-4 grid gap-2 ${featured ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
        <Fact k="Tithi" v={`${w.panchang.paksha} ${w.panchang.tithi}`} />
        <Fact k="Nakshatra" v={w.panchang.nakshatra} />
        {featured && <Fact k="Yoga" v={w.panchang.yoga} />}
        {featured && <Fact k="Karana" v={w.panchang.karana} />}
        <Fact k="Weekday" v={w.weekday} />
      </dl>

      {featured && (
        <>
          <p className="mt-4 text-sm text-[#4A2E1F]"><span className="font-semibold">Avoided that day:</span> {w.avoidedPeriods.map((p) => `${p.label} ${range12(p.startLocal, p.endLocal)}`).join(" · ")}. This window lies outside all three.</p>
          <div className="mt-4 rounded-2xl bg-[#592209]/5 p-4">
            <h4 className="font-bold text-[#301607]">Why this Muhurat?</h4>
            <p className="mt-1 text-sm text-[#4A2E1F]">Under the selected traditional rules, this time meets the event's criteria for the following reasons, each taken from the calculated Panchang for {placeLabel(result.place)}:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-[#4A2E1F]">{w.why.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </>
      )}
      {!featured && <p className="mt-3 text-sm text-[#4A2E1F]">{w.why[0]} {w.why[2]}</p>}
      <Details w={w} day={day} />
      <div className="mt-4"><Actions w={w} eventId={result.event.id} eventLabel={result.event.label} place={result.place} saver={saver} /></div>
    </motion.article>
  );
}

export default function MuhuratResults({ result, saver, onExpand, onAgain }: { result: MuhuratResult; saver: Saver; onExpand: (newEnd: string) => void; onAgain: () => void }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const dayOf = (date: string) => result.days.find((d) => d.date === date);
  const span = daysBetween(result.startDate, result.endDate) + 1;
  const canExpand = span < 366;
  const nextEnd = (() => { const d = new Date(`${result.endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + Math.min(90, 366 - span)); return d.toISOString().slice(0, 10); })();
  const tab = (active: boolean) => `rounded-full border px-5 py-2 text-sm font-semibold ${active ? "border-[#592209] bg-[#592209] text-[#F7DC8A]" : "border-[#592209]/30 text-[#592209]"}`;

  return (
    <div data-testid="muhurat-results" className="mx-auto max-w-6xl space-y-8">
      <section aria-label="Search summary" data-testid="search-summary" className="rounded-3xl border border-[#592209]/20 bg-[#592209]/5 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-[#301607]">{result.event.label}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#4A2E1F] sm:grid-cols-3">
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">Location</dt><dd>{placeLabel(result.place)} <span className="text-[#6B4A37]">({result.place.timezone})</span></dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">Searched</dt><dd>{shortDate(result.startDate)} to {shortDate(result.endDate)} ({span} days)</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">Method</dt><dd>{result.method.label}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-[#4A2E1F]">{result.totals.windows > 0 ? `${result.totals.windows} suitable window${result.totals.windows === 1 ? "" : "s"} on ${result.totals.daysWithWindows} of ${result.totals.days} days.` : "No suitable window was found in this period."}</p>
      </section>

      {result.best ? (
        <>
          <WindowCard w={result.best} featured result={result} day={dayOf(result.best.date)} saver={saver} />

          <div className="flex justify-center gap-2" role="tablist" aria-label="Result views">
            <button role="tab" aria-selected={view === "list"} className={tab(view === "list")} onClick={() => setView("list")}>Best dates</button>
            <button role="tab" aria-selected={view === "calendar"} className={tab(view === "calendar")} onClick={() => setView("calendar")}>Calendar view</button>
          </div>

          {view === "list" ? (
            result.others.length > 0 && (
              <section aria-labelledby="others-h">
                <h3 id="others-h" className="mb-4 text-xl font-bold text-[#301607]">Other suitable dates</h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {result.others.map((w) => <WindowCard key={w.startUtc} w={w} result={result} day={dayOf(w.date)} saver={saver} />)}
                </div>
              </section>
            )
          ) : (
            <MuhuratCalendar days={result.days} startDate={result.startDate} endDate={result.endDate} initialDate={result.best.date} />
          )}
        </>
      ) : (
        <section data-testid="no-muhurat" className="rounded-3xl border border-[#C9873A]/40 bg-[#FFFDF6] p-6 text-center">
          <h3 className="text-xl font-bold text-[#301607]">No suitable window in this period</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#4A2E1F]">No time between {shortDate(result.startDate)} and {shortDate(result.endDate)} qualified for {result.event.label} at {placeLabel(result.place)} under the selected method. This does not mean the event cannot be held; it means no window met every rule listed below.</p>
          {(() => {
            const counts = new Map<string, number>();
            for (const d of result.days) for (const b of d.blockers) counts.set(b, (counts.get(b) ?? 0) + 1);
            const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
            return top.length ? <ul className="mx-auto mt-3 max-w-md list-disc pl-5 text-left text-sm text-[#6B4A37]">{top.map(([b, n]) => <li key={b}>{b} ({n} {n === 1 ? "day" : "days"})</li>)}</ul> : null;
          })()}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {canExpand && <button type="button" onClick={() => onExpand(nextEnd)} className="rounded-full bg-[#592209] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#F7DC8A]">Search until {shortDate(nextEnd)}</button>}
            <button type="button" onClick={onAgain} className="rounded-full border border-[#592209]/40 px-6 py-3 text-sm font-semibold text-[#592209]">Change the search</button>
          </div>
        </section>
      )}

      <section aria-labelledby="calc-h" data-testid="calc-method" className="rounded-3xl border border-[#592209]/20 bg-white/50 p-5 sm:p-6">
        <h3 id="calc-h" className="text-lg font-bold text-[#301607]">Calculation method</h3>
        <p data-testid="method-label" className="mt-1 text-sm text-[#4A2E1F]">{result.method.label}</p>
        <details className="mt-3 text-sm text-[#4A2E1F]">
          <summary className="cursor-pointer font-semibold text-[#592209]">Panchang elements and rules evaluated</summary>
          <p className="mt-3 font-semibold">Evaluated for {result.event.label}</p>
          <ul data-testid="evaluated" className="list-disc pl-5">{result.evaluated.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 font-semibold">Rules applied</p>
          <ul className="list-disc pl-5">{result.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 font-semibold">What these rules rest on</p>
          <p data-testid="confidence">{CONFIDENCE[result.event.confidence]}</p>
          <p className="mt-1">{result.event.basis}</p>
        </details>
        <details className="mt-2 text-sm text-[#4A2E1F]">
          <summary className="cursor-pointer font-semibold text-[#592209]">Limits and uncertainty</summary>
          <p className="mt-3">{result.method.note}</p>
          <ul className="mt-2 list-disc pl-5">{result.event.limitations.map((r) => <li key={r}>{r}</li>)}</ul>
          {result.notes.length > 0 && <ul className="mt-2 list-disc pl-5">{result.notes.map((r) => <li key={r}>{r}</li>)}</ul>}
        </details>
      </section>

      <div className="text-center">
        <button type="button" onClick={onAgain} className="rounded-full border border-[#592209]/40 px-8 py-3 text-sm uppercase tracking-widest text-[#592209] hover:bg-[#592209]/10">✦ New Search</button>
      </div>
    </div>
  );
}
