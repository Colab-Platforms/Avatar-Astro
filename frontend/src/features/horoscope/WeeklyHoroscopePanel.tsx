import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { intlTag } from "@/features/muhurat/format";
import { useWeeklyHoroscope, type WeeklySections } from "./useWeeklyHoroscope";
import { currentWeek, formatWeekRange } from "./week";

const SECTIONS: { key: keyof Omit<WeeklySections, "lucky">; label: string }[] = [
  { key: "overview", label: "horoscope.weekly.overview" },
  { key: "career", label: "horoscope.weekly.career" },
  { key: "love", label: "horoscope.weekly.love" },
  { key: "finance", label: "horoscope.weekly.finance" },
  { key: "health", label: "horoscope.weekly.health" },
  { key: "family", label: "horoscope.weekly.family" },
];

/** The weekly reading for the chosen sign. Only the weekly endpoint feeds this: it never shows the daily reading. */
export default function WeeklyHoroscopePanel({ sign }: { sign: string | null }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useWeeklyHoroscope(sign);
  const locale = !i18n.language || i18n.language === "en" ? "en-GB" : intlTag();
  const week = data ? { start: data.weekStart, end: data.weekEnd } : currentWeek();

  return (
    <div data-testid="weekly-panel" className="mx-auto max-w-4xl">
      <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-primary" data-testid="week-range">
        {t("horoscope.weekly.weekOf", { range: formatWeekRange(week.start, week.end, locale) })}
      </p>

      {!sign && <p className="py-12 text-center text-muted-foreground">{t("horoscope.weekly.prompt")}</p>}

      {sign && isLoading && (
        <div className="py-12 text-center" role="status">
          <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("horoscope.weekly.loading")}</p>
        </div>
      )}

      {sign && isError && (
        <div className="py-12 text-center" role="alert">
          <p className="mb-3 text-red-800">{t("horoscope.weekly.error")}</p>
          <button type="button" onClick={() => void refetch()} className="rounded-full border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/10">{t("horoscope.weekly.retry")}</button>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map(({ key, label }) => (
              <section key={key} className={`glass-card rounded-2xl p-6 ${key === "overview" ? "md:col-span-2" : ""}`} data-testid={`weekly-${key}`}>
                <h3 className="mb-2 font-display text-lg text-primary">{t(label)}</h3>
                <p className="leading-relaxed text-foreground">{data.sections[key]}</p>
              </section>
            ))}
          </div>

          {data.sections.lucky && (data.sections.lucky.color || data.sections.lucky.number) && (
            <div className="flex flex-wrap justify-center gap-3" data-testid="weekly-lucky">
              {data.sections.lucky.color && <span className="rounded-full border border-[#C18A3D] bg-[#F5E9D6] px-4 py-2 text-sm text-[#54230F]">{t("horoscope.weekly.luckyColor")}: <b>{data.sections.lucky.color}</b></span>}
              {data.sections.lucky.number && <span className="rounded-full border border-[#C18A3D] bg-[#F5E9D6] px-4 py-2 text-sm text-[#54230F]">{t("horoscope.weekly.luckyNumber")}: <b>{data.sections.lucky.number}</b></span>}
            </div>
          )}

          <section className="rounded-2xl border border-[#C18A3D] bg-[#F5E9D6] p-6 text-center" data-testid="weekly-advice">
            <h3 className="mb-2 font-display text-lg text-[#54230F]">{t("horoscope.weekly.advice")}</h3>
            <p className="leading-relaxed text-[#33251D]">{data.sections.advice}</p>
          </section>

          <p className="text-center text-xs text-muted-foreground">{t("horoscope.weekly.basis")}</p>
        </div>
      )}
    </div>
  );
}
