import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, Flame } from "lucide-react";
import { requireSignIn } from "@/lib/authedFetch";
import type { KarmaAward, KarmaSummary } from "./api";

/** Compact Reward Points strip for Karma Sankhya. The 0-100 practice score above it is a separate thing and is never converted into these Reward Points. */
export default function KarmaRewardsSummary({ summary, signedIn, isError, last, onRetry }: { summary?: KarmaSummary; signedIn: boolean; isError: boolean; last: KarmaAward["awarded"] | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const shell = "mb-5 rounded-2xl bg-gradient-to-br from-[#4A1A07] to-[#2A0F04] p-4 text-[#F5E9D6] shadow-md md:p-5";
  const head = <h2 className="flex items-center gap-2 text-lg font-bold"><Award className="h-5 w-5 text-[#E9B872]" aria-hidden /> {t("points.karma.rewardsHeading")}</h2>;

  if (!signedIn) {
    return (
      <section className={shell} data-testid="karma-rewards-signin" aria-label={t("points.karma.rewardsHeading")}>
        {head}
        <p className="mt-1 text-sm text-[#F5E9D6]/85">{t("points.karma.signInToEarn")}</p>
        <button type="button" onClick={() => requireSignIn()} className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-[#E9B872] px-5 py-1.5 text-sm font-bold text-[#3B1706]">{t("points.common.signIn")}</button>
      </section>
    );
  }
  if (isError) {
    return (
      <section className={shell} role="alert" data-testid="karma-rewards-error">
        {head}
        <p className="mt-1 text-sm">{t("points.common.loadError")}</p>
        <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-[#E9B872] px-5 py-1.5 text-sm font-bold text-[#3B1706]">{t("points.common.retry")}</button>
      </section>
    );
  }
  if (!summary) return <section className={shell} role="status" aria-label={t("points.common.loading")}><div className="h-16 animate-pulse rounded-xl bg-white/10" /></section>;

  const nm = summary.nextMilestone;
  const cell = (label: string, value: string | number) => (
    <div className="rounded-xl bg-white/[0.07] p-3 text-center">
      <p className="text-2xl font-extrabold text-[#F6C86A]">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5E9D6]/75">{label}</p>
    </div>
  );
  return (
    <section className={shell} aria-label={t("points.karma.rewardsHeading")} data-testid="karma-rewards">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {head}
        <Link to="/dashboard/rewards" className="text-xs font-semibold text-[#E9B872] underline-offset-2 hover:underline">{t("points.horoscope.viewRewards")}</Link>
      </div>
      <p className="mt-1 text-xs text-[#F5E9D6]/70">{t("points.karma.scoreNote")} <span data-testid="tz-note">{t("points.common.timezoneNote")}</span></p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cell(t("points.karma.pointsToday"), summary.todayPoints)}
        {cell(t("points.karma.totalPoints"), summary.totalPoints)}
        {cell(t("points.karma.currentStreak"), t("points.karma.daysUnit", { n: summary.currentStreak }))}
        {cell(t("points.karma.bestStreak"), t("points.karma.daysUnit", { n: summary.bestStreak }))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-testid="karma-next">
        <Flame className="h-4 w-4 text-[#F6A93A]" aria-hidden />
        {nm ? <span><strong>{t("points.karma.nextMilestone")}:</strong> {t("points.horoscope.progress", { progress: nm.progress, days: nm.days })} · {t("points.horoscope.bonusPoints", { n: nm.bonus })}</span> : <span>{t("points.horoscope.allDone")}</span>}
      </p>
      {last && (
        <p role="status" data-testid="karma-just-earned" className="mt-2 text-sm font-semibold text-[#F6C86A]">
          {last.points > 0 && t("points.karma.earnedNow", { n: last.points })}
          {last.milestone && <span className="ml-3">{t("points.karma.milestoneNow", { days: last.milestone.days, n: last.milestone.bonus })}</span>}
        </p>
      )}
    </section>
  );
}
