import { useState } from "react";
import i18n from "@/i18n";
import { useGlossary } from "@/i18n/glossary";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bookmark, BookmarkCheck, CalendarPlus, CheckCircle2, Copy, MapPin, Share2, Sparkles, Sun } from "lucide-react";
import MuhuratCalendar, { DayBar } from "./MuhuratCalendar";
import { copyText, downloadIcs, shareMuhurat, windowText } from "./sharing";
import { daysBetween, longDate, placeLabel, range12, shortDate, time12 } from "./format";
import { savedId, type SavedMuhurat } from "./saved";
import type { DayPanchang, DayResult, MuhuratPlace, MuhuratResult, MuhuratWindow, Segment } from "./types";

interface Saver { isSaved: (id: string) => boolean; toggle: (e: Omit<SavedMuhurat, "savedAt">) => void }

const CONFIDENCE: Record<string, string> = { consensus: "muhurat.results.confidenceConsensus", general: "muhurat.results.confidenceGeneral" };

/** "Shukla Panchami until 3:18 AM (next day), then Shukla Shashthi": one element across the Vedic day, with its exact changes. */
export const sequenceText = (segs: Segment[], name: (n: string) => string = (n) => n): string =>
  segs.map((s) => (s.until ? i18n.t(s.untilNextDay ? "muhurat.seq.untilNext" : "muhurat.seq.until", { name: name(s.name), time: time12(s.until) }) : name(s.name))).join(`${i18n.t("muhurat.seq.then")} `.replace(/^/, ", ")).replace(/, then, /g, ", then ");

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-[#592209]/5 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{k}</dt><dd className="text-[15px] font-semibold text-[#301607]">{v}</dd></div>;
}

function Actions({ w, eventId, eventLabel, place, saver }: { w: MuhuratWindow; eventId: string; eventLabel: string; place: MuhuratPlace; saver: Saver }) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState("");
  const id = savedId(eventId, place, w);
  const saved = saver.isSaved(id);
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-[#592209]/40 px-3.5 py-1.5 text-sm font-semibold text-[#592209] hover:bg-[#592209]/10";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} aria-pressed={saved} onClick={() => { saver.toggle({ id, eventId, eventLabel, place, window: w }); setMsg(saved ? t("muhurat.results.removedSaved") : t("muhurat.results.savedHere")); }}>
          {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />} {saved ? t("common.saved") : t("common.save")}
        </button>
        <button type="button" className={btn} onClick={async () => setMsg((await copyText(windowText(w, eventLabel, place))) ? t("muhurat.results.copied") : t("muhurat.results.copyFailedSelect"))}>
          <Copy size={16} aria-hidden="true" /> {t("common.copy")}
        </button>
        <button type="button" className={btn} onClick={async () => { const r = await shareMuhurat(eventLabel, place, w); setMsg(r === "shared" ? t("muhurat.results.shared") : r === "copied" ? t("muhurat.results.shareCopied") : r === "cancelled" ? "" : t("muhurat.results.shareFailed")); }}>
          <Share2 size={16} aria-hidden="true" /> {t("common.share")}
        </button>
        <button type="button" className={btn} onClick={() => setMsg(downloadIcs(eventLabel, place, w) ? t("muhurat.results.icsDone") : t("muhurat.results.icsFailed"))}>
          <CalendarPlus size={16} aria-hidden="true" /> {t("muhurat.results.addToCalendar")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-1.5 min-h-[1.1rem] text-xs text-[#6B4A37]">{msg}</p>
    </div>
  );
}

function Details({ w, day }: { w: MuhuratWindow; day?: DayResult }) {
  const { t } = useTranslation();
  const { g, tithiFull } = useGlossary();
  const periodName = (label: string) => g("term", label);
  return (
    <details className="mt-3 rounded-xl border border-[#592209]/15 bg-white/50 p-3 text-sm text-[#4A2E1F]">
      <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.results.calcDetails")}</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact k={t("muhurat.results.weekday")} v={g("weekday", w.weekday)} />
        <Fact k={g("term", "Tithi")} v={tithiFull(`${w.panchang.paksha} ${w.panchang.tithi}`)} />
        <Fact k={g("term", "Nakshatra")} v={`${g("nakshatra", w.panchang.nakshatra)}, ${t("muhurat.results.pada", { n: w.panchang.pada })}`} />
        <Fact k={g("term", "Yoga")} v={g("yoga", w.panchang.yoga)} />
        <Fact k={g("term", "Karana")} v={g("karana", w.panchang.karana)} />
        {day?.sunrise && <Fact k={`${t("muhurat.results.sunrise")} · ${t("muhurat.results.sunset")}`} v={`${time12(day.sunrise)} · ${time12(day.sunset!)}`} />}
      </dl>
      <p className="mt-2 text-xs text-[#6B4A37]">{t("muhurat.results.valuesAtStart", { time: time12(w.startLocal) })}</p>
      {w.changes.length > 0 && <><p className="mt-3 font-semibold">{t("muhurat.results.changesInside")}</p><ul className="list-disc pl-5">{w.changes.map((c) => <li key={c}>{c}</li>)}</ul></>}
      <p className="mt-3 font-semibold">{t("muhurat.results.excludedPeriods")}</p>
      <ul className="list-disc pl-5">{w.avoidedPeriods.map((p) => <li key={p.label}>{periodName(p.label)}: {range12(p.startLocal, p.endLocal)}</li>)}</ul>
      <p className="mt-3 font-semibold">{t("muhurat.results.rankedAs", { score: w.score })}</p>
      <ul className="list-disc pl-5">{w.scoreParts.map((p) => <li key={p.label}>{p.label}: +{p.points}</li>)}</ul>
      <p className="mt-2 text-xs text-[#6B4A37]">{t("muhurat.results.detailsFoot")}</p>
    </details>
  );
}

const Badge = ({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "best" | "fest" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tone === "best" ? "bg-[#C9873A] text-white" : tone === "fest" ? "bg-[#F7DC8A]/60 text-[#592209]" : "bg-[#2F6B3A]/10 text-[#2F6B3A]"}`}>{children}</span>
);

/** The best-ranked window, shown in full. It also appears under its date below. */
function BestCard({ w, result, day, saver }: { w: MuhuratWindow; result: MuhuratResult; day?: DayResult; saver: Saver }) {
  const { t } = useTranslation();
  const { g, tithiFull } = useGlossary();
  const reduce = useReducedMotion();
  const eventLabel = t(`muhurat.events.${result.event.id}.label`, { defaultValue: result.event.label });
  return (
    <motion.article data-testid="best-muhurat" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="rounded-3xl border border-[#C9873A] bg-[#FFFDF6] p-5 shadow-[0_18px_40px_-22px_rgba(89,34,9,0.55)] sm:p-7">
      <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8A5A1E]"><Sun size={14} aria-hidden="true" /> {t("muhurat.results.bestMuhurat")}</p>
      <h3 className="text-2xl font-bold text-[#301607] sm:text-3xl">{longDate(w.date)}</h3>
      <p data-testid="window-time" className="mt-1 text-4xl font-bold text-[#C9873A] sm:text-5xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{range12(w.startLocal, w.endLocal)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#4A2E1F]"><MapPin size={14} aria-hidden="true" /> {placeLabel(result.place)} <span className="text-[#6B4A37]">· {t("muhurat.results.localTime")}</span></p>
      <div className="mt-2 flex flex-wrap gap-2"><Badge><CheckCircle2 size={13} aria-hidden="true" /> {t("muhurat.results.suitable")}</Badge>{w.observances.map((o) => <Badge key={o} tone="fest"><Sparkles size={12} aria-hidden="true" /> {o}</Badge>)}</div>
      {day && <div className="mt-3 max-w-sm"><DayBar day={day} className="h-2" /><p className="mt-1 text-[11px] text-[#6B4A37]">{t("muhurat.results.goldNote", { sunrise: time12(day.sunrise!), sunset: time12(day.sunset!) })}</p></div>}
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Fact k={g("term", "Tithi")} v={tithiFull(`${w.panchang.paksha} ${w.panchang.tithi}`)} />
        <Fact k={g("term", "Nakshatra")} v={g("nakshatra", w.panchang.nakshatra)} />
        <Fact k={g("term", "Yoga")} v={g("yoga", w.panchang.yoga)} />
        <Fact k={g("term", "Karana")} v={g("karana", w.panchang.karana)} />
        <Fact k={t("muhurat.results.weekday")} v={g("weekday", w.weekday)} />
      </dl>
      <p className="mt-4 text-sm text-[#4A2E1F]"><span className="font-semibold">{t("muhurat.results.excludedThatDay")}</span> {w.avoidedPeriods.map((p) => `${g("term", p.label)} ${range12(p.startLocal, p.endLocal)}`).join(" · ")}. {t("muhurat.results.outsideAll")}</p>
      <div className="mt-4 rounded-2xl bg-[#592209]/5 p-4">
        <h4 className="font-bold text-[#301607]">{t("muhurat.results.whyTitle")}</h4>
        <p className="mt-1 text-sm text-[#4A2E1F]">{t("muhurat.results.whyIntro", { place: placeLabel(result.place) })}</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-[#4A2E1F]">{w.why.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <Details w={w} day={day} />
      <div className="mt-4"><Actions w={w} eventId={result.event.id} eventLabel={eventLabel} place={result.place} saver={saver} /></div>
    </motion.article>
  );
}

function PanchangSummary({ p, day }: { p: DayPanchang; day: DayResult }) {
  const { t } = useTranslation();
  const { g, tithiFull } = useGlossary();
  const rows: [string, string][] = [
    [g("term", "Tithi"), sequenceText(p.tithi, tithiFull)],
    [g("term", "Nakshatra"), sequenceText(p.nakshatra, (n) => g("nakshatra", n))],
    [g("term", "Yoga"), sequenceText(p.yoga, (n) => g("yoga", n))],
    [g("term", "Karana"), sequenceText(p.karana, (n) => g("karana", n))],
  ];
  return (
    <div data-testid="panchang-summary" className="rounded-2xl bg-[#592209]/5 p-3 text-sm text-[#4A2E1F]">
      <p className="text-xs text-[#6B4A37]">
        {g("weekday", p.vara)} · {g("paksha", p.paksha)} {g("term", "paksha")} · {g("masa", p.masa.name)}{p.masa.adhika ? ` (${t("babyName.results.adhika")})` : ""} {t("muhurat.results.masaAmanta")} · {g("term", "Vikram Samvat")} {p.vikramSamvat}
        {day.sunrise ? ` · ${t("muhurat.results.sunrise")} ${time12(day.sunrise)}, ${t("muhurat.results.sunsetLc")} ${time12(day.sunset!)}` : ""}
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(([k, v]) => <div key={k}><dt className="inline text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{k}: </dt><dd className="inline">{v}</dd></div>)}
      </dl>
      {p.panchak && <p className="mt-1 text-xs text-[#6B4A37]">{g("term", "Panchak")}: {p.panchak.from ? t("muhurat.results.panchakFrom", { time: time12(p.panchak.from) }) : t("muhurat.results.panchakRunning")}{p.panchak.until ? `, ${t("muhurat.results.panchakUntil", { time: time12(p.panchak.until) })}` : ""}.</p>}
    </div>
  );
}

function DateCard({ day, best, result, saver }: { day: DayResult; best: MuhuratWindow | null; result: MuhuratResult; saver: Saver }) {
  const { t } = useTranslation();
  const { g, tithiFull } = useGlossary();
  const eventLabel = t(`muhurat.events.${result.event.id}.label`, { defaultValue: result.event.label });
  return (
    <article data-testid="date-card" aria-label={longDate(day.date)} className="rounded-3xl border border-[#C9873A]/40 bg-[#FFFDF6] p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[#301607] sm:text-xl">{longDate(day.date)}</h3>
          <p className="text-sm text-[#6B4A37]">{day.windows.length === 1 ? t("muhurat.calendar.oneWindow") : t("muhurat.calendar.nWindows", { count: day.windows.length })}</p>
        </div>
        {day.festivals.length > 0 && (
          <div data-testid="date-festivals" className="flex flex-wrap justify-end gap-1.5">{day.festivals.map((f) => <Badge key={f.id} tone="fest"><Sparkles size={12} aria-hidden="true" /> {g("festival", f.id, f.name)}</Badge>)}</div>
        )}
      </header>
      <div className="mt-3 max-w-sm"><DayBar day={day} className="h-2" /></div>
      {day.panchang && <div className="mt-3"><PanchangSummary p={day.panchang} day={day} /></div>}

      <ul className="mt-4 space-y-3">
        {day.windows.map((w) => (
          <li key={w.startUtc} data-testid="window-row" className="rounded-2xl border border-[#592209]/15 bg-white/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span data-testid="window-time" className="text-xl font-bold text-[#C9873A] sm:text-2xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{range12(w.startLocal, w.endLocal)}</span>
              <Badge><CheckCircle2 size={13} aria-hidden="true" /> {t("muhurat.results.suitable")}</Badge>
              {best && w.startUtc === best.startUtc && <Badge tone="best">{t("muhurat.results.bestShort")}</Badge>}
              <span className="text-xs text-[#6B4A37]">{t("muhurat.results.minutes", { count: w.durationMinutes })} · {tithiFull(`${w.panchang.paksha} ${w.panchang.tithi}`)} · {g("nakshatra", w.panchang.nakshatra)}</span>
            </div>
            <details className="mt-2 text-sm text-[#4A2E1F]">
              <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.results.whyWindow")}</summary>
              <ul className="mt-2 list-disc pl-5">{w.why.map((x) => <li key={x}>{x}</li>)}</ul>
            </details>
            <Details w={w} day={day} />
            <div className="mt-3"><Actions w={w} eventId={result.event.id} eventLabel={eventLabel} place={result.place} saver={saver} /></div>
          </li>
        ))}
      </ul>
    </article>
  );
}

const spanText = (spans: { startLocal: string; endLocal: string }[]) => spans.map((x) => range12(x.startLocal, x.endLocal)).join(", ");

/** The zero-result state: every date checked, every disqualifying condition with its scope, and what would have to be different. */
function NoResult({ result, canExpand, nextEnd, onExpand, onAgain }: { result: MuhuratResult; canExpand: boolean; nextEnd: string; onExpand: (e: string) => void; onAgain: () => void }) {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const eventLabel = t(`muhurat.events.${result.event.id}.label`, { defaultValue: result.event.label });
  const needs = [...new Set(result.days.flatMap((d) => d.analysis?.needs ?? []))];
  return (
    <section data-testid="no-muhurat" className="rounded-3xl border border-[#C9873A]/40 bg-[#FFFDF6] p-5 sm:p-8">
      <h3 className="text-center text-2xl font-bold text-[#301607] sm:text-3xl">{t("muhurat.noResult.title", { event: eventLabel })}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#4A2E1F]">
        {t("muhurat.noResult.body", { start: shortDate(result.startDate), end: shortDate(result.endDate), place: placeLabel(result.place) })}
      </p>

      {result.seasonNotes.length > 0 && (
        <div data-testid="season-notes" className="mx-auto mt-4 max-w-3xl rounded-2xl bg-[#592209]/5 p-4 text-sm text-[#4A2E1F]">
          {result.seasonNotes.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}

      <h4 className="mt-6 text-lg font-bold text-[#301607]">{t("muhurat.noResult.datesChecked")}</h4>
      <ul className="mt-3 space-y-3" data-testid="checked-dates">
        {result.days.map((d) => {
          const scopes = d.analysis?.scopes ?? d.blockers.map((reason) => ({ reason, scope: "whole day" as const, spans: [] }));
          return (
            <li key={d.date} data-testid="checked-date" className="rounded-2xl border border-[#592209]/15 bg-white/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#301607]">{longDate(d.date)}</span>
                <span className="rounded-full bg-[#9B2C1D]/10 px-2 py-0.5 text-xs font-bold text-[#9B2C1D]">{t("muhurat.results.notSuitable")}</span>
                {d.festivals.map((f) => <Badge key={f.id} tone="fest"><Sparkles size={12} aria-hidden="true" /> {g("festival", f.id, f.name)}</Badge>)}
                {d.sunrise && <span className="text-xs text-[#6B4A37]">{t("muhurat.results.sunrise")} {time12(d.sunrise)} · {t("muhurat.results.sunsetLc")} {time12(d.sunset!)}</span>}
              </div>
              <ul className="mt-2 space-y-1 text-sm text-[#4A2E1F]">
                {scopes.map((x) => (
                  <li key={x.reason} data-testid="condition">
                    {x.reason}{" "}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${x.scope === "whole day" ? "bg-[#9B2C1D]/10 text-[#9B2C1D]" : "bg-[#C9873A]/20 text-[#7a4a12]"}`}>{x.scope === "whole day" ? t("muhurat.noResult.wholeDate") : t("muhurat.noResult.partDate")}</span>
                    {x.scope === "part of the day" && x.spans.length > 0 && <span className="text-xs text-[#6B4A37]"> · {spanText(x.spans)}</span>}
                  </li>
                ))}
              </ul>
              {d.analysis && d.analysis.intervals.length > 0 && (
                <details className="mt-2 text-sm text-[#4A2E1F]">
                  <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.noResult.intervals")}</summary>
                  <ul className="mt-2 space-y-1">
                    {d.analysis.intervals.map((i) => (
                      <li key={i.startLocal + i.endLocal} data-testid="interval"><span className="font-semibold">{range12(i.startLocal, i.endLocal)}</span>: {i.reasons.join("; ")}</li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {needs.length > 0 && (
        <div data-testid="needs" className="mt-6 rounded-2xl bg-[#592209]/5 p-4">
          <h4 className="font-bold text-[#301607]">{t("muhurat.noResult.needsTitle")}</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-[#4A2E1F]">{needs.map((n) => <li key={n}>{n}</li>)}</ul>
          <p className="mt-2 text-xs text-[#6B4A37]">{t("muhurat.noResult.needsNote")}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {canExpand && <button type="button" onClick={() => onExpand(nextEnd)} className="rounded-full bg-[#592209] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#F7DC8A]">{t("muhurat.noResult.longer", { date: shortDate(nextEnd) })}</button>}
        <button type="button" onClick={onAgain} className="rounded-full border border-[#592209]/40 px-6 py-3 text-sm font-semibold text-[#592209]">{t("muhurat.noResult.changeRange")}</button>
        <button type="button" onClick={onAgain} className="rounded-full border border-[#592209]/40 px-6 py-3 text-sm font-semibold text-[#592209]">{t("muhurat.noResult.changeLocation")}</button>
      </div>
    </section>
  );
}

export default function MuhuratResults({ result, saver, onExpand, onAgain }: { result: MuhuratResult; saver: Saver; onExpand: (newEnd: string) => void; onAgain: () => void }) {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const eventLabel = t(`muhurat.events.${result.event.id}.label`, { defaultValue: result.event.label });
  const [view, setView] = useState<"list" | "calendar">("list");
  const span = daysBetween(result.startDate, result.endDate) + 1;
  const canExpand = span < 366;
  const nextEnd = (() => { const d = new Date(`${result.endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + Math.min(90, 366 - span)); return d.toISOString().slice(0, 10); })();
  const tab = (active: boolean) => `rounded-full border px-5 py-2 text-sm font-semibold ${active ? "border-[#592209] bg-[#592209] text-[#F7DC8A]" : "border-[#592209]/30 text-[#592209]"}`;
  const withWindows = result.days.filter((d) => d.windows.length > 0);
  const without = result.days.filter((d) => d.windows.length === 0);
  const tot = result.totals;
  const bestDay = result.best ? result.days.find((d) => d.date === result.best!.date) : undefined;

  return (
    <div data-testid="muhurat-results" className="mx-auto max-w-6xl space-y-8">
      <section aria-label="Search summary" data-testid="search-summary" className="rounded-3xl border border-[#592209]/20 bg-[#592209]/5 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-[#301607]">{eventLabel}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-[#4A2E1F] sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.summary.location")}</dt><dd>{placeLabel(result.place)} <span className="text-[#6B4A37]">({result.place.timezone})</span></dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.form.dateRange")}</dt><dd>{t("muhurat.summary.rangeText", { start: shortDate(result.startDate), end: shortDate(result.endDate), count: span })}</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.summary.convention")}</dt><dd data-testid="convention">{result.convention.panchang.label}</dd><dd className="text-xs text-[#6B4A37]">{t("muhurat.summary.festivals")}: {result.convention.festivals.label}</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.summary.dates")}</dt><dd data-testid="total-dates">{t("muhurat.summary.xOfY", { a: tot.daysWithWindows, b: tot.days })}</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.summary.windows")}</dt><dd data-testid="total-windows">{tot.windows}</dd></div>
          <div><dt className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A1E]">{t("muhurat.summary.festivalDays")}</dt><dd>{tot.festivalDays}</dd></div>
        </dl>
      </section>

      {result.best ? (
        <>
          <h2 data-testid="result-count" className="text-center text-2xl font-bold text-[#301607] sm:text-3xl">
            {tot.windows === 1 ? t("muhurat.results.countOne") : t("muhurat.results.countMany", { count: tot.windows })}
            <span className="block text-base font-normal text-[#6B4A37]">{tot.daysWithWindows === 1 ? t("muhurat.results.onOneDate") : t("muhurat.results.onDates", { count: tot.daysWithWindows })}</span>
          </h2>

          <BestCard w={result.best} result={result} day={bestDay} saver={saver} />

          <div className="flex justify-center gap-2" role="tablist" aria-label={t("muhurat.results.views")}>
            <button role="tab" aria-selected={view === "list"} className={tab(view === "list")} onClick={() => setView("list")}>{t("muhurat.results.byDate")}</button>
            <button role="tab" aria-selected={view === "calendar"} className={tab(view === "calendar")} onClick={() => setView("calendar")}>{t("muhurat.calendar.label")}</button>
          </div>

          {view === "list" ? (
            <section aria-labelledby="dates-h">
              <h3 id="dates-h" className="mb-4 text-xl font-bold text-[#301607]">{t("muhurat.results.allDates")}</h3>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {withWindows.map((d) => <DateCard key={d.date} day={d} best={result.best} result={result} saver={saver} />)}
              </div>
              {without.length > 0 && (
                <details data-testid="not-suitable" className="mt-6 rounded-2xl border border-[#592209]/20 bg-white/50 p-4 text-sm text-[#4A2E1F]">
                  <summary className="cursor-pointer font-semibold text-[#592209]">{without.length === 1 ? t("muhurat.results.notSuitableOne") : t("muhurat.results.notSuitableMany", { count: without.length })}</summary>
                  <ul className="mt-3 space-y-2">
                    {without.map((d) => (
                      <li key={d.date} data-testid="not-suitable-date">
                        <span className="font-semibold">{longDate(d.date)}</span> <span className="rounded-full bg-[#9B2C1D]/10 px-2 py-0.5 text-xs font-bold text-[#9B2C1D]">{t("muhurat.results.notSuitable")}</span>
                        {d.festivals.length > 0 && <span className="ml-2 text-xs text-[#8A5A1E]">{d.festivals.map((f) => g("festival", f.id, f.name)).join(", ")}</span>}
                        <ul className="list-disc pl-5 text-[#6B4A37]">{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          ) : (
            <MuhuratCalendar days={result.days} startDate={result.startDate} endDate={result.endDate} initialDate={result.best.date} />
          )}
        </>
      ) : (
        <NoResult result={result} canExpand={canExpand} nextEnd={nextEnd} onExpand={onExpand} onAgain={onAgain} />
      )}

      <section aria-labelledby="calc-h" data-testid="calc-method" className="rounded-3xl border border-[#592209]/20 bg-white/50 p-5 sm:p-6">
        <h3 id="calc-h" className="text-lg font-bold text-[#301607]">{t("muhurat.results.calcMethod")}</h3>
        <p data-testid="method-label" className="mt-1 text-sm text-[#4A2E1F]">{result.method.label}</p>
        <details className="mt-3 text-sm text-[#4A2E1F]">
          <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.results.elementsRules")}</summary>
          <p className="mt-3 font-semibold">{t("muhurat.results.evaluatedFor", { event: eventLabel })}</p>
          <ul data-testid="evaluated" className="list-disc pl-5">{result.evaluated.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 font-semibold">{t("muhurat.results.rulesApplied")}</p>
          <ul className="list-disc pl-5">{result.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 font-semibold">{t("muhurat.results.restOn")}</p>
          <p data-testid="confidence">{t(CONFIDENCE[result.event.confidence])}</p>
          <p className="mt-1">{result.event.basis}</p>
        </details>
        <details className="mt-2 text-sm text-[#4A2E1F]">
          <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.summary.convention")}</summary>
          <p className="mt-3">{result.convention.panchang.note}</p>
          <p className="mt-2">{result.convention.festivals.note}</p>
          <p className="mt-2">{result.convention.dayBoundary}</p>
        </details>
        <details className="mt-2 text-sm text-[#4A2E1F]">
          <summary className="cursor-pointer font-semibold text-[#592209]">{t("muhurat.results.limits")}</summary>
          <ul className="mt-3 list-disc pl-5">{result.event.limitations.map((r) => <li key={r}>{r}</li>)}</ul>
          {result.notes.length > 0 && <ul className="mt-2 list-disc pl-5">{result.notes.map((r) => <li key={r}>{r}</li>)}</ul>}
        </details>
      </section>

      <div className="text-center">
        <button type="button" onClick={onAgain} className="rounded-full border border-[#592209]/40 px-8 py-3 text-sm uppercase tracking-widest text-[#592209] hover:bg-[#592209]/10">✦ {t("common.newSearch")}</button>
      </div>
    </div>
  );
}
