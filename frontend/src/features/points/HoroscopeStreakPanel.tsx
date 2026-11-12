import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Award, Check, Circle, Flame, Sparkles } from "lucide-react";
import { AuthApiError } from "@/lib/authClient";
import { requireSignIn } from "@/lib/authedFetch";
import { intlTag } from "@/features/muhurat/format";
import { pointsApi, type CompleteResult } from "./api";
import { POINTS_KEYS, useHoroscopeStreak } from "./hooks";

export interface HoroscopeSteps { read: boolean; shuffled: boolean; revealed: boolean }

const weekday = (key: string) => new Intl.DateTimeFormat(intlTag(), { weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const dayLong = (key: string) => new Intl.DateTimeFormat(intlTag(), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

/** A few gold sparks that fly out once on completion. Skipped entirely for reduced motion. */
const Sparks = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return <motion.span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#F6C86A]" initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 140, y: Math.sin(a) * 90, opacity: 0, scale: 0.4 }} transition={{ duration: 0.9, ease: "easeOut" }} />;
    })}
  </div>
);

/**
 * Daily Horoscope streak and rewards, under the card interaction. Every number shown comes from the server; the button only
 * enables once this page has seen the horoscope read, the cards shuffled and a card revealed (reported to the server, not verified by it).
 */
export default function HoroscopeStreakPanel({ sign, readingDate, steps }: { sign: string; readingDate?: string; steps: HoroscopeSteps }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const qc = useQueryClient();
  const q = useHoroscopeStreak();
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const done = useMutation({
    mutationFn: () => pointsApi.completeHoroscope({ sign: sign.toLowerCase(), horoscopeDate: readingDate, steps }),
    onSuccess: (r) => {
      setError(null); setResult(r);
      qc.setQueryData(POINTS_KEYS.horoscope, r.summary);
      void qc.invalidateQueries({ queryKey: POINTS_KEYS.rewards });
      if (!r.alreadyCompleted) { setCelebrate(true); window.setTimeout(() => setCelebrate(false), 1600); }
    },
    // Nothing is shown as earned unless the server confirmed it.
    onError: (e) => setError(e instanceof AuthApiError && e.status === 409 ? t("points.horoscope.dateChanged") : t("points.horoscope.completeFailed")),
  });

  const shell = "relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A1A07] via-[#3B1706] to-[#2A0F04] p-5 text-[#F5E9D6] shadow-xl md:p-8";
  const heading = (
    <h2 className="flex items-center gap-2 text-2xl font-bold md:text-3xl"><Flame className="h-7 w-7 text-[#F6A93A]" aria-hidden /> {t("points.horoscope.dailyStreak")}</h2>
  );

  const signedIn = q.data !== undefined || q.isLoading || q.isError;
  if (!signedIn) {
    return (
      <section className={shell} data-testid="streak-signin" aria-label={t("points.horoscope.dailyStreak")}>
        {heading}
        <p className="mt-3 text-[#F5E9D6]/85">{t("points.common.signInPrompt")}</p>
        <button type="button" onClick={() => requireSignIn()} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#E9B872] px-6 py-2 text-sm font-bold text-[#3B1706] hover:bg-[#F6C86A]">{t("points.common.signIn")}</button>
      </section>
    );
  }
  if (q.isLoading) return <section className={shell} role="status" aria-label={t("points.common.loading")}><div className="h-40 animate-pulse rounded-2xl bg-white/10" /></section>;
  if (q.isError || !q.data) {
    return (
      <section className={shell} role="alert" data-testid="streak-error">
        {heading}
        <p className="mt-3">{t("points.common.loadError")}</p>
        <button type="button" onClick={() => void q.refetch()} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#E9B872] px-6 py-2 text-sm font-bold text-[#3B1706]">{t("points.common.retry")}</button>
      </section>
    );
  }

  const s = q.data;
  const ready = steps.read && steps.shuffled && steps.revealed;
  const msg = s.currentStreak === 0 ? "encourage0" : s.currentStreak < 7 ? "encourage1" : "encourage2";
  const stat = (label: string, value: string | number, icon?: boolean) => (
    <div className="rounded-2xl bg-white/[0.07] p-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-3xl font-extrabold text-[#F6C86A]">{icon && <Flame className="h-6 w-6 text-[#F6A93A]" aria-hidden />}{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5E9D6]/75">{label}</p>
    </div>
  );
  const steplist: [boolean, string][] = [[steps.read, "stepRead"], [steps.shuffled, "stepShuffle"], [steps.revealed, "stepReveal"]];
  const nm = s.nextMilestone;

  return (
    <section className={shell} aria-label={t("points.horoscope.dailyStreak")} data-testid="streak-panel">
      {celebrate && !reduce && <Sparks />}
      <div className="relative">
        {heading}
        <p className="mt-2 text-[#F5E9D6]/85" data-testid="streak-message">{t(`points.horoscope.${msg}`)}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stat(t("points.horoscope.currentStreak"), s.currentStreak, true)}
          {stat(t("points.horoscope.bestStreak"), s.bestStreak)}
          {stat(t("points.horoscope.totalDays"), s.totalDays)}
          {stat(t("points.horoscope.pointsToday"), s.todayPoints)}
        </div>
        <p className="mt-3 text-sm text-[#F5E9D6]/80" data-testid="total-points">{t("points.horoscope.totalPoints")}: <strong className="text-[#F6C86A]">{s.totalPoints}</strong></p>

        {/* Weekly tracker */}
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#E9B872]">{t("points.horoscope.weeklyProgress")}</h3>
        <ol className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-3" data-testid="week-tracker">
          {s.week.map((d) => {
            const state = d.completed ? "done" : d.isToday ? "today" : "missed";
            return (
              <li key={d.date} className="flex flex-col items-center gap-1.5" data-state={state}>
                <span className="text-[11px] font-medium text-[#F5E9D6]/80 sm:text-xs">{weekday(d.date)}</span>
                <span
                  role="img"
                  aria-label={`${dayLong(d.date)}: ${t(`points.horoscope.${d.completed ? "stateDone" : d.isToday ? "stateToday" : "stateMissed"}`)}`}
                  className={`grid h-9 w-9 place-items-center rounded-full sm:h-11 sm:w-11 ${d.completed ? "bg-[#E9B872] text-[#3B1706]" : d.isToday ? "border-2 border-[#F6C86A] bg-[#F6C86A]/15 text-[#F6C86A]" : "border border-white/20 text-white/30"}`}
                >
                  {d.completed ? <Check className="h-5 w-5" aria-hidden /> : d.isToday ? <Circle className="h-3 w-3 fill-current" aria-hidden /> : null}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Next milestone */}
        <div className="mt-6 rounded-2xl bg-white/[0.07] p-4" data-testid="next-milestone">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#E9B872]">{t("points.horoscope.nextMilestone")}</h3>
          {nm ? (
            <>
              <p className="mt-2 text-lg font-bold">{t("points.horoscope.progress", { progress: nm.progress, days: nm.days })}</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={nm.days} aria-valuenow={nm.progress} aria-label={t("points.horoscope.nextMilestone")}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#E9B872] to-[#F6C86A] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(100, (nm.progress / nm.days) * 100)}%` }} />
              </div>
              <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#F5E9D6]/85"><span>{t("points.horoscope.daysRemaining", { n: nm.remaining })}</span><span>{t("points.horoscope.bonusPoints", { n: nm.bonus })}</span></p>
            </>
          ) : <p className="mt-2">{t("points.horoscope.allDone")}</p>}
        </div>

        {/* Completion */}
        <div className="mt-6" aria-live="polite">
          {s.completedToday ? (
            <div className="rounded-2xl border border-[#E9B872]/50 bg-[#E9B872]/10 p-4" data-testid="completed-state">
              <p className="flex items-center gap-2 text-lg font-bold text-[#F6C86A]"><Sparkles className="h-5 w-5" aria-hidden /> {t("points.horoscope.completedTitle")}</p>
              {result && !result.alreadyCompleted && (
                <ul className="mt-2 space-y-0.5 text-sm font-semibold" data-testid="earned">
                  <li>{t("points.horoscope.earnedDaily", { n: result.awarded.daily })}</li>
                  {result.awarded.milestone && <li data-testid="earned-bonus">{t("points.horoscope.earnedBonus", { days: result.awarded.milestone.days, n: result.awarded.milestone.bonus })}</li>}
                </ul>
              )}
              <p className="mt-2 text-sm text-[#F5E9D6]/85">{t("points.horoscope.comeBack")}</p>
            </div>
          ) : (
            <>
              <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" data-testid="steps">
                {steplist.map(([ok, k]) => (
                  <li key={k} className={`flex items-center gap-1.5 ${ok ? "text-[#F6C86A]" : "text-[#F5E9D6]/60"}`}><Check className={`h-4 w-4 ${ok ? "" : "opacity-30"}`} aria-hidden /> {t(`points.horoscope.${k}`)}</li>
                ))}
              </ul>
              <button type="button" disabled={!ready || done.isPending} onClick={() => done.mutate()} data-testid="complete-horoscope" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#E9B872] px-8 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#3B1706] shadow-lg transition hover:bg-[#F6C86A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {done.isPending ? t("points.horoscope.completing") : t("points.horoscope.complete")}
              </button>
              {!ready && <p className="mt-2 text-xs text-[#F5E9D6]/65">{t("points.horoscope.stepsNeeded")}</p>}
            </>
          )}
          <AnimatePresence>{error && <motion.p role="alert" data-testid="complete-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 rounded-lg bg-black/25 p-3 text-sm">{error}</motion.p>}</AnimatePresence>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-[#F5E9D6]/65">
          <p className="max-w-xl">{t("points.horoscope.attestNote")} <span data-testid="tz-note">{t("points.common.timezoneNote")}</span></p>
          <Link to="/dashboard/rewards" className="inline-flex items-center gap-1.5 font-semibold text-[#E9B872] underline-offset-2 hover:underline"><Award className="h-4 w-4" aria-hidden /> {t("points.horoscope.viewRewards")}</Link>
        </div>
      </div>
    </section>
  );
}
