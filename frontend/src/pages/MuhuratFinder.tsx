import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, Copy, Trash2 } from "lucide-react";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { requireSignIn } from "@/lib/authedFetch";
import { MUHURAT_FEATURE } from "@/data/featureCatalog";
import { muhuratApi } from "@/features/muhurat/api";
import EventPicker from "@/features/muhurat/EventPicker";
import MuhuratForm, { type MuhuratFormValues } from "@/features/muhurat/MuhuratForm";
import MuhuratResults from "@/features/muhurat/MuhuratResults";
import type { EventCard } from "@/features/muhurat/events";
import { longDate, placeLabel, range12, windowText } from "@/features/muhurat/format";
import { useSavedMuhurats } from "@/features/muhurat/saved";
import { copyText, downloadIcs } from "@/features/muhurat/sharing";
import type { MuhuratResult } from "@/features/muhurat/types";

function Calculating() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <div role="status" aria-live="polite" data-testid="muhurat-loading" className="mx-auto max-w-md rounded-3xl border border-[#C9873A]/40 bg-[#FFFDF6] p-10 text-center">
      <motion.svg viewBox="0 0 64 64" className="mx-auto h-16 w-16 text-[#C9873A]" aria-hidden="true" animate={reduce ? undefined : { rotate: 360 }} transition={reduce ? undefined : { repeat: Infinity, duration: 12, ease: "linear" }}>
        <circle cx="32" cy="32" r="11" fill="currentColor" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 30} 32 32)`} />)}
      </motion.svg>
      <p className="mt-4 text-lg font-bold text-[#301607]">{t("muhurat.page.calculatingTitle")}</p>
      <p className="mt-1 text-sm text-[#6B4A37]">{t("muhurat.page.calculatingBody")}</p>
    </div>
  );
}

export default function MuhuratFinder() {
  const { t } = useTranslation();
  useFeatureTitle(MUHURAT_FEATURE);
  const [event, setEvent] = useState<EventCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<{ result: MuhuratResult; values: MuhuratFormValues } | null>(null);
  const run = useRef(0);
  const saver = useSavedMuhurats();
  const [note, setNote] = useState("");

  const search = async (ev: EventCard, v: MuhuratFormValues) => {
    if (busy) return;
    if (!requireSignIn(() => { void search(ev, v); })) return; // signed out: ask, keep the form, then run this once
    setError("");
    setBusy(true);
    const id = ++run.current;
    try {
      const p = v.place;
      const result = await muhuratApi.search({
        event: ev.id,
        place: { name: p.name, admin1: p.admin1, country: p.country, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone },
        startDate: v.startDate,
        endDate: v.endDate,
        preferences: v.preferences,
      });
      if (id !== run.current) return;
      setShown({ result, values: v });
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (id !== run.current) return;
      setError((e as Error)?.message || t("muhurat.page.calcError"));
    } finally {
      if (id === run.current) setBusy(false);
    }
  };

  const reset = () => { setShown(null); setError(""); window.scrollTo({ top: 0 }); };
  const heading = shown ? t("muhurat.page.yourMuhurat") : event ? t(`muhurat.events.${event.id}.label`, { defaultValue: event.label }) : t("features.muhurat-finder.name", { defaultValue: MUHURAT_FEATURE.name });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-3xl pt-6 text-center">
        <div className="relative mx-auto mb-5 aspect-[2/1] w-64 sm:w-80">
          <span aria-hidden="true" className="absolute -inset-6 rounded-[50%] bg-[radial-gradient(ellipse,rgba(201,135,58,0.32),transparent_70%)]" />
          <img src="/images/tools/muhurat-finder.svg" alt={t("muhurat.page.imageAlt")} width={640} height={320} className="relative h-full w-full rounded-[50%] border-[3px] border-[#C9873A] bg-[#3b1706] object-cover shadow-[0_16px_36px_-14px_rgba(89,34,9,0.65)]" />
        </div>
        <img
          src="/images/muhurat-logo.png"
          alt="Bhagya"
          data-testid="muhurat-logo"
          className="mx-auto mb-3 h-20 w-auto max-w-[60%] object-contain sm:h-24"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#592209]">
          <span lang="hi" className="text-sm font-bold normal-case tracking-normal">शुभ मुहूर्त</span>
        </p>
        <h1 className="mb-4 text-4xl text-[#301607] sm:text-6xl" style={{ fontFamily: "'Astra','Cinzel',serif" }}>{heading}</h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#4A2E1F] sm:text-lg">{t("features.muhurat-finder.subtitle", { defaultValue: MUHURAT_FEATURE.subtitle })}</p>
        {!event && !shown && <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#6B4A37]">{t("muhurat.page.intro")}</p>}
      </header>

      {shown ? (
        <MuhuratResults
          result={shown.result}
          saver={saver}
          onAgain={reset}
          onExpand={(newEnd) => { if (event) void search(event, { ...shown.values, endDate: newEnd }); }}
        />
      ) : busy ? (
        <Calculating />
      ) : event ? (
        <MuhuratForm event={event} onBack={() => setEvent(null)} onSubmit={(v) => void search(event, v)} busy={busy} serverError={error} />
      ) : (
        <>
          <EventPicker onPick={(e) => { setEvent(e); window.scrollTo({ top: 0 }); }} />
          {saver.saved.length > 0 && (
            <section aria-labelledby="saved-h" data-testid="saved-list" className="mx-auto mt-12 max-w-3xl">
              <h2 id="saved-h" className="mb-1 text-xl font-bold text-[#301607]">{t("muhurat.page.savedTitle")}</h2>
              <p className="mb-4 text-xs text-[#6B4A37]">{t("muhurat.page.savedNote")}</p>
              <ul className="space-y-3">
                {saver.saved.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9873A]/40 bg-[#FFFDF6] p-4">
                    <div>
                      <p className="font-bold text-[#301607]">{s.eventLabel}</p>
                      <p className="text-sm text-[#4A2E1F]">{longDate(s.window.date)} · {range12(s.window.startLocal, s.window.endLocal)}</p>
                      <p className="text-xs text-[#6B4A37]">{placeLabel(s.place)} · local time</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" aria-label={t("muhurat.page.copyTiming", { event: s.eventLabel })} onClick={async () => setNote((await copyText(windowText(s.window, s.eventLabel, s.place))) ? t("muhurat.results.copied") : t("muhurat.results.copyFailed"))} className="rounded-full border border-[#592209]/40 p-2 text-[#592209]"><Copy size={16} aria-hidden="true" /></button>
                      <button type="button" aria-label={t("muhurat.page.downloadCal", { event: s.eventLabel })} onClick={() => setNote(downloadIcs(s.eventLabel, s.place, s.window) ? t("muhurat.results.icsDone") : t("muhurat.results.icsFailed"))} className="rounded-full border border-[#592209]/40 p-2 text-[#592209]"><CalendarPlus size={16} aria-hidden="true" /></button>
                      <button type="button" aria-label={t("muhurat.page.removeSaved", { event: s.eventLabel })} onClick={() => saver.remove(s.id)} className="rounded-full border border-[#9B2C1D]/40 p-2 text-[#9B2C1D]"><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <p role="status" aria-live="polite" className="mt-2 min-h-[1.1rem] text-xs text-[#6B4A37]">{note}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

