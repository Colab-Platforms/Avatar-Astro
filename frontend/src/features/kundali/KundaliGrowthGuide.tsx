import type { LucideIcon } from "lucide-react";
import { Activity, Briefcase, CalendarCheck, CheckCircle2, Compass, Flower2, Heart, Sparkles, TrendingUp, Wallet } from "lucide-react";
import type { KundaliResult } from "./types";
import { buildGrowthGuide, type AreaKey } from "./growthGuide";

const ICON: Record<AreaKey, LucideIcon> = {
  personality: Compass,
  career: Briefcase,
  love: Heart,
  money: Wallet,
  health: Activity,
  spirit: Flower2,
};

const Label = ({ icon: Icon, children }: { icon: LucideIcon; children: string }) => (
  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#6B4A37]">
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    {children}
  </p>
);

/**
 * The closing section of the Janma Kundali reading. Everything comes from buildGrowthGuide, which uses only the calculated
 * reading, so nothing is invented and the same page never shows the same advice twice.
 */
export const KundaliGrowthGuide = ({ k, sunSign, lifePath, name }: { k: KundaliResult; sunSign: string; lifePath: number; name?: string }) => {
  const g = buildGrowthGuide({ kundali: k, sunSign, lifePath, name });
  return (
    <section
      data-testid="growth-guide"
      aria-labelledby="growth-guide-h"
      className="rounded-3xl border border-[#C9873A]/60 bg-gradient-to-b from-[#FFF7E6] to-[#FBF5EC] p-4 shadow-[0_10px_30px_-18px_rgba(89,34,9,0.5)] sm:p-7"
    >
      <div className="mb-5 text-center">
        <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#592209] text-[#F5E9D6]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="growth-guide-h" className="text-2xl font-bold text-[#301607] sm:text-3xl">Your Personal Growth Guide</h2>
        <p className="mx-auto mt-1 max-w-xl text-base italic text-[#6B4A37]">
          Understand your strengths, work on your challenges and take small steps towards a better life.
        </p>
      </div>

      {g.notices.length > 0 && (
        <ul data-testid="growth-notices" className="mb-4 space-y-1 rounded-xl border border-[#592209]/20 bg-[#F5E9D6]/70 p-3 text-sm text-[#4A2E1F]">
          {g.notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {g.areas.map((a) => {
          const Icon = ICON[a.key];
          return (
            <article key={a.key} data-testid={`growth-${a.key}`} className="flex min-w-0 flex-col rounded-2xl border border-[#592209]/20 bg-white/70 p-4">
              <h3 className="mb-3 flex items-center gap-2.5 text-lg font-semibold text-[#592209]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#592209]/10">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                {a.title}
              </h3>

              {a.chart.length > 0 && (
                <div className="mb-3 rounded-lg border border-[#592209]/15 bg-[#F5E9D6]/60 p-2.5" data-testid={`growth-${a.key}-chart`}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#592209]">From your chart</p>
                  <ul className="space-y-1 text-sm leading-snug text-[#301607]">
                    {a.chart.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-3">
                <Label icon={TrendingUp}>Your Strengths</Label>
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-snug text-[#301607]">
                  {a.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <Label icon={Compass}>Areas to Improve</Label>
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-snug text-[#301607]">
                  {a.improve.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[#FFF1CC]/70 p-3">
                <Label icon={CheckCircle2}>What You Can Do</Label>
                <ol className="space-y-1.5 text-[15px] leading-snug text-[#301607]">
                  {a.actions.map((s, i) => (
                    <li key={s} className="flex gap-2">
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#592209] text-[11px] font-bold text-[#F5E9D6]">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-3 text-xs leading-snug text-[#6B4A37]">{a.basis}</p>
            </article>
          );
        })}
      </div>

      <div data-testid="growth-plan" className="mt-5 rounded-2xl border border-[#592209]/25 bg-white/70 p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-[#592209]">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          Your Next 30 Days
        </h3>
        <ol className="grid gap-2.5 sm:grid-cols-2">
          {g.plan.map((p, i) => (
            <li key={p.label} className="flex gap-3 rounded-xl border border-[#592209]/15 bg-[#FBF5EC] p-3">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9873A] text-sm font-bold text-[#301607]">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6B4A37]">{p.label}</p>
                <p className="text-[15px] leading-snug text-[#301607]">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div data-testid="growth-message" className="mt-5 rounded-2xl bg-[#592209] p-5 text-center text-[#F5E9D6] sm:p-7">
        <h3 className="mb-2 text-xl font-semibold text-[#F7DC8A] sm:text-2xl">A Message for Your Journey</h3>
        <p className="mx-auto max-w-2xl text-[17px] italic leading-relaxed">{g.message}</p>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-[#6B4A37]">
        Astrology is a traditional way of reflecting and is not scientifically proven. This guide offers ideas to think about, not predictions or medical, financial or relationship advice.
      </p>
    </section>
  );
};

export default KundaliGrowthGuide;
