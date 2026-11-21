import { AlertCircle, Activity, Briefcase, Coins, Hash, Heart, Home, Lightbulb, Palette, RotateCw, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { intlTag } from "@/features/muhurat/format";
import { useWeeklyHoroscope, type WeeklySections } from "./useWeeklyHoroscope";
import { currentWeek, formatWeekRange } from "./week";

type Key = keyof Omit<WeeklySections, "lucky">;
const CARDS: { key: Key; label: string; Icon: LucideIcon }[] = [
  { key: "overview", label: "horoscope.weekly.overview", Icon: Sun },
  { key: "career", label: "horoscope.weekly.career", Icon: Briefcase },
  { key: "love", label: "horoscope.weekly.love", Icon: Heart },
  { key: "finance", label: "horoscope.weekly.finance", Icon: Coins },
  { key: "health", label: "horoscope.weekly.health", Icon: Activity },
  { key: "family", label: "horoscope.weekly.family", Icon: Home },
];

/** A fine gold flourish for the corners of a card. Purely decorative. */
const Corner = ({ className }: { className: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none absolute h-6 w-6 text-[#C18A3D] ${className}`} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <path d="M2 14 V4 a2 2 0 0 1 2 -2 H14" />
    <path d="M6 12 V8 a2 2 0 0 1 2 -2 H12" opacity="0.6" />
    <circle cx="2.6" cy="2.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
const Corners = () => (
  <>
    <Corner className="left-2 top-2" />
    <Corner className="right-2 top-2 rotate-90" />
    <Corner className="bottom-2 right-2 rotate-180" />
    <Corner className="bottom-2 left-2 -rotate-90" />
  </>
);

/** Gold line, small diamond, gold line. */
const Divider = () => (
  <div aria-hidden className="mx-auto mt-4 flex max-w-xs items-center gap-3">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C18A3D]" />
    <span className="h-2 w-2 rotate-45 bg-[#C18A3D]" />
    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C18A3D]" />
  </div>
);

const Badge = ({ Icon, large }: { Icon: LucideIcon; large?: boolean }) => (
  <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E9B872] via-[#C18A3D] to-[#8E5F22] text-[#2A0F04] shadow-[0_2px_6px_rgba(84,35,15,0.35),inset_0_1px_0_rgba(255,240,200,0.6)] ${large ? "h-12 w-12" : "h-10 w-10"}`}>
    <Icon className={large ? "h-6 w-6" : "h-5 w-5"} aria-hidden strokeWidth={2} />
  </span>
);

const cardBase = "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition duration-300 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7";
const lightCard = `${cardBase} border-[#C18A3D]/60 bg-gradient-to-br from-[#FFFCF6] via-[#FBF1DF] to-[#F2E0C2] shadow-[0_6px_20px_-8px_rgba(84,35,15,0.35)] hover:border-[#C18A3D] hover:shadow-[0_16px_32px_-12px_rgba(84,35,15,0.5)]`;
const darkCard = `${cardBase} border-[#C18A3D] bg-gradient-to-br from-[#54230F] via-[#6A2A0C] to-[#803003] text-[#F5E9D6] shadow-[0_10px_30px_-10px_rgba(84,35,15,0.65)] hover:shadow-[0_18px_38px_-12px_rgba(84,35,15,0.75)] md:col-span-2`;

/** The weekly reading for the chosen sign. Only the weekly endpoint feeds this: it never shows the daily reading. */
export default function WeeklyHoroscopePanel({ sign }: { sign: string | null }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useWeeklyHoroscope(sign);
  const locale = !i18n.language || i18n.language === "en" ? "en-GB" : intlTag();
  const week = data ? { start: data.weekStart, end: data.weekEnd } : currentWeek();
  const range = formatWeekRange(week.start, week.end, locale);

  return (
    <div data-testid="weekly-panel" className="mx-auto max-w-4xl">
      <header className="mb-8 text-center" data-testid="week-range" aria-label={t("horoscope.weekly.weekOf", { range })}>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#C18A3D]">{t("horoscope.weekly.thisWeek")}</p>
        <p className="mt-1 font-display text-2xl tracking-wide text-[#54230F] md:text-3xl">{range}</p>
        <Divider />
      </header>

      {!sign && <p className="py-12 text-center text-muted-foreground">{t("horoscope.weekly.prompt")}</p>}

      {sign && isLoading && (
        <div role="status" aria-live="polite">
          <p className="mb-4 flex items-center justify-center gap-2 text-sm text-[#6B4A37]"><Sparkles className="h-4 w-4 animate-pulse text-[#C18A3D]" aria-hidden />{t("horoscope.weekly.loading")}</p>
          <div className="grid gap-4 md:grid-cols-2" aria-hidden>
            {CARDS.map(({ key }) => (
              <div key={key} className={`h-36 animate-pulse rounded-2xl border border-[#C18A3D]/30 bg-gradient-to-br from-[#FBF1DF] to-[#F2E0C2] ${key === "overview" ? "md:col-span-2 md:h-44" : ""}`} />
            ))}
          </div>
        </div>
      )}

      {sign && isError && (
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-[#C18A3D]/60 bg-gradient-to-br from-[#FFFCF6] to-[#F5E3C6] px-6 py-10 text-center shadow-[0_6px_20px_-8px_rgba(84,35,15,0.35)]" role="alert">
          <Corners />
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#803003]" aria-hidden />
          <p className="mb-5 text-[#54230F]" data-error-kind={error?.kind}>{t(`horoscope.weekly.errors.${error?.kind ?? "generic"}`)}</p>
          <button type="button" disabled={isFetching} onClick={() => void refetch()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#803003] bg-[#803003] px-5 py-2 text-sm font-semibold text-[#F5E9D6] shadow transition hover:bg-[#54230F] disabled:opacity-60">
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />{t("horoscope.weekly.retry")}
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 md:auto-rows-fr md:gap-5">
            {CARDS.map(({ key, label, Icon }) => {
              const overview = key === "overview";
              return (
                <section key={key} className={overview ? darkCard : key === "family" ? `${lightCard} md:col-span-2` : lightCard} data-testid={`weekly-${key}`} data-icon={key} aria-labelledby={`weekly-h-${key}`}>
                  <span aria-hidden className={`pointer-events-none absolute inset-1.5 rounded-xl border ${overview ? "border-[#E9B872]/40" : "border-[#C18A3D]/25"}`} />
                  <Corners />
                  {overview && <Sun aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-[#E9B872]/10 transition-transform duration-700 group-hover:rotate-45 motion-reduce:transition-none" strokeWidth={1} />}
                  <div className="relative mb-3 flex items-center gap-3">
                    <Badge Icon={Icon} large={overview} />
                    <h3 id={`weekly-h-${key}`} className={`font-display tracking-wide ${overview ? "text-xl text-[#F5E9D6] md:text-2xl" : "text-lg text-[#54230F]"}`}>{t(label)}</h3>
                  </div>
                  <p className={`relative leading-relaxed ${overview ? "text-base text-[#F5E9D6] md:text-lg md:leading-8" : "text-[15px] leading-7 text-[#33251D]"}`}>{data.sections[key]}</p>
                </section>
              );
            })}
          </div>

          {data.sections.lucky && (data.sections.lucky.color || data.sections.lucky.number) && (
            <div className="flex flex-wrap justify-center gap-3" data-testid="weekly-lucky">
              {data.sections.lucky.color && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C18A3D] bg-gradient-to-b from-[#FFFCF6] to-[#F5E3C6] py-2 pl-2 pr-5 text-sm text-[#54230F] shadow-sm">
                  <Badge Icon={Palette} /><span>{t("horoscope.weekly.luckyColor")}: <b>{data.sections.lucky.color}</b></span>
                </span>
              )}
              {data.sections.lucky.number && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C18A3D] bg-gradient-to-b from-[#FFFCF6] to-[#F5E3C6] py-2 pl-2 pr-5 text-sm text-[#54230F] shadow-sm">
                  <Badge Icon={Hash} /><span>{t("horoscope.weekly.luckyNumber")}: <b>{data.sections.lucky.number}</b></span>
                </span>
              )}
            </div>
          )}

          <section className="relative overflow-hidden rounded-2xl border border-[#C18A3D] bg-gradient-to-r from-[#F5E3C6] via-[#FBEFD8] to-[#F5E3C6] px-6 py-7 text-center shadow-[0_6px_20px_-8px_rgba(84,35,15,0.35)]" data-testid="weekly-advice" data-icon="advice">
            <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-xl border border-[#C18A3D]/30" />
            <Corners />
            <div className="relative mb-2 flex items-center justify-center gap-3">
              <Badge Icon={Lightbulb} />
              <h3 className="font-display text-xl tracking-wide text-[#54230F]">{t("horoscope.weekly.advice")}</h3>
            </div>
            <p className="relative mx-auto max-w-2xl text-base leading-8 text-[#33251D]">{data.sections.advice}</p>
          </section>

          <p className="text-center text-xs leading-relaxed text-[#6B4A37]">{t("horoscope.weekly.basis")}</p>
        </div>
      )}
    </div>
  );
}
