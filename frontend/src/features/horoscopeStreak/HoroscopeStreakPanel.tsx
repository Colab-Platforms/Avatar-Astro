import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle, Flame, Sparkles } from "lucide-react";
import { requireSignIn } from "@/lib/authedFetch";
import { localDateKey } from "@/lib/karmaScore";
import { completeToday, loadDays, summarize } from "@/lib/horoscopeStreak";
import { intlTag } from "@/features/muhurat/format";

export interface HoroscopeSteps { read: boolean; shuffled: boolean; revealed: boolean }

const weekday = (key: string) => new Intl.DateTimeFormat(intlTag(), { weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const dayLong = (key: string) => new Intl.DateTimeFormat(intlTag(), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

/**
 * Daily Horoscope streak, in the Karma Sankhya style: kept in this browser, no points. A day counts once the visitor has
 * read the horoscope, shuffled the cards, revealed one and pressed Complete.
 */
export default function HoroscopeStreakPanel({ steps }: { steps: HoroscopeSteps }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [days, setDays] = useState<string[]>(() => loadDays());
  const [today, setToday] = useState(() => localDateKey());
  const [celebrate, setCelebrate] = useState(false);

  // Roll over at local midnight, as the Karma dashboard does.
  useEffect(() => {
    const id = setInterval(() => setToday((p) => { const k = localDateKey(); return k === p ? p : k; }), 30_000);
    return () => clearInterval(id);
  }, []);

  const s = useMemo(() => summarize(days), [days, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = steps.read && steps.shuffled && steps.revealed;

  const finish = () => {
    setDays((d) => completeToday(d));
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), 1600);
  };
  // Like Karma Sankhya, recording a day needs a signed-in visitor; after sign-in the completion runs once.
  const onComplete = () => { if (!ready || !requireSignIn(finish)) return; finish(); };

  const msg = s.currentStreak === 0 ? "encourage0" : s.currentStreak < 7 ? "encourage1" : "encourage2";
  const stat = (label: string, value: number, icon?: boolean) => (
    <div className="rounded-2xl bg-white/[0.07] p-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-3xl font-extrabold text-[#F6C86A]">{icon && <Flame className="h-6 w-6 text-[#F6A93A]" aria-hidden />}{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5E9D6]/75">{label}</p>
    </div>
  );
  const steplist: [boolean, string][] = [[steps.read, "stepRead"], [steps.shuffled, "stepShuffle"], [steps.revealed, "stepReveal"]];
  const nm = s.nextMilestone;

  return (
    <section className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A1A07] via-[#3B1706] to-[#2A0F04] p-5 text-[#F5E9D6] shadow-xl md:p-8" aria-label={t("streak.dailyStreak")} data-testid="streak-panel">
      {celebrate && !reduce && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <motion.span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#F6C86A]" initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 140, y: Math.sin(a) * 90, opacity: 0, scale: 0.4 }} transition={{ duration: 0.9, ease: "easeOut" }} />;
          })}
        </div>
      )}
      <div className="relative">
        <h2 className="flex items-center gap-2 text-2xl font-bold md:text-3xl"><Flame className="h-7 w-7 text-[#F6A93A]" aria-hidden /> {t("streak.dailyStreak")}</h2>
        <p className="mt-2 text-[#F5E9D6]/85" data-testid="streak-message">{t(`streak.${msg}`)}</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {stat(t("streak.currentStreak"), s.currentStreak, true)}
          {stat(t("streak.bestStreak"), s.bestStreak)}
          {stat(t("streak.totalDays"), s.totalDays)}
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#E9B872]">{t("streak.weeklyProgress")}</h3>
        <ol className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-3" data-testid="week-tracker">
          {s.week.map((d) => {
            const state = d.completed ? "done" : d.isToday ? "today" : "missed";
            return (
              <li key={d.date} className="flex flex-col items-center gap-1.5" data-state={state}>
                <span className="text-[11px] font-medium text-[#F5E9D6]/80 sm:text-xs">{weekday(d.date)}</span>
                <span
                  role="img"
                  aria-label={`${dayLong(d.date)}: ${t(`streak.${d.completed ? "stateDone" : d.isToday ? "stateToday" : "stateMissed"}`)}`}
                  className={`grid h-9 w-9 place-items-center rounded-full sm:h-11 sm:w-11 ${d.completed ? "bg-[#E9B872] text-[#3B1706]" : d.isToday ? "border-2 border-[#F6C86A] bg-[#F6C86A]/15 text-[#F6C86A]" : "border border-white/20 text-white/30"}`}
                >
                  {d.completed ? <Check className="h-5 w-5" aria-hidden /> : d.isToday ? <Circle className="h-3 w-3 fill-current" aria-hidden /> : null}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-2xl bg-white/[0.07] p-4" data-testid="next-milestone">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#E9B872]">{t("streak.nextMilestone")}</h3>
          {nm ? (
            <>
              <p className="mt-2 text-lg font-bold">{t("streak.progress", { progress: nm.progress, days: nm.days })}</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={nm.days} aria-valuenow={nm.progress} aria-label={t("streak.nextMilestone")}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#E9B872] to-[#F6C86A] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(100, (nm.progress / nm.days) * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm text-[#F5E9D6]/85">{t("streak.daysRemaining", { n: nm.remaining })}</p>
            </>
          ) : <p className="mt-2">{t("streak.allDone")}</p>}
        </div>

        <div className="mt-6" aria-live="polite">
          {s.completedToday ? (
            <div className="rounded-2xl border border-[#E9B872]/50 bg-[#E9B872]/10 p-4" data-testid="completed-state">
              <p className="flex items-center gap-2 text-lg font-bold text-[#F6C86A]"><Sparkles className="h-5 w-5" aria-hidden /> {t("streak.completedTitle")}</p>
              <p className="mt-2 text-sm text-[#F5E9D6]/85">{t("streak.comeBack")}</p>
            </div>
          ) : (
            <>
              <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" data-testid="steps">
                {steplist.map(([ok, k]) => (
                  <li key={k} className={`flex items-center gap-1.5 ${ok ? "text-[#F6C86A]" : "text-[#F5E9D6]/60"}`}><Check className={`h-4 w-4 ${ok ? "" : "opacity-30"}`} aria-hidden /> {t(`streak.${k}`)}</li>
                ))}
              </ul>
              <button type="button" disabled={!ready} onClick={onComplete} data-testid="complete-horoscope" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#E9B872] px-8 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#3B1706] shadow-lg transition hover:bg-[#F6C86A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {t("streak.complete")}
              </button>
              {!ready && <p className="mt-2 text-xs text-[#F5E9D6]/65">{t("streak.stepsNeeded")}</p>}
            </>
          )}
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-xs text-[#F5E9D6]/65" data-testid="device-note">{t("streak.deviceNote")}</p>
      </div>
    </section>
  );
}
