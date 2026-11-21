import { useRef, type KeyboardEvent } from "react";
import { CalendarDays, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export type HoroscopeTab = "daily" | "weekly";
const TABS: HoroscopeTab[] = ["daily", "weekly"];
const ICON = { daily: Sun, weekly: CalendarDays } as const;

/**
 * The Daily / Weekly switch shared by every page that offers both (/horoscopes and /zodiac/:sign).
 * The page owns which tab is selected and what each tab shows; this is only the control. A gold-trimmed pill whose
 * highlight glides to the chosen tab. Arrow keys, Home and End move between the tabs, as in any tab list.
 * The panel it controls must have id "horoscope-tabpanel".
 */
export default function HoroscopeTabs({ tab, onChange }: { tab: HoroscopeTab; onChange: (t: HoroscopeTab) => void }) {
  const { t } = useTranslation();
  const refs = useRef<Record<HoroscopeTab, HTMLButtonElement | null>>({ daily: null, weekly: null });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] : e.key === "ArrowLeft" ? TABS[(i + TABS.length - 1) % TABS.length] : e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={t("horoscope.tabs.label")} data-testid="horoscope-tabs"
      className="relative mx-auto mb-8 flex w-full max-w-md gap-1 rounded-full border border-[#C18A3D] bg-gradient-to-b from-[#FBF3E3] to-[#F5E9D6] p-1 shadow-[inset_0_1px_2px_rgba(84,35,15,0.12),0_2px_8px_-2px_rgba(84,35,15,0.18)]">
      {/* the gliding highlight */}
      <span aria-hidden data-testid="tab-indicator"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-full bg-gradient-to-b from-[#9A3A08] to-[#803003] shadow-[0_3px_10px_-2px_rgba(84,35,15,0.55),inset_0_1px_0_rgba(255,226,170,0.35)] ring-1 ring-[#C18A3D]/70 transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: tab === "weekly" ? "translateX(calc(100% + 4px))" : "translateX(0)" }} />
      {TABS.map((k) => {
        const Icon = ICON[k];
        return (
          <button
            key={k}
            ref={(el) => { refs.current[k] = el; }}
            role="tab"
            type="button"
            id={`horoscope-tab-${k}`}
            aria-selected={tab === k}
            aria-controls="horoscope-tabpanel"
            tabIndex={tab === k ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={onKeyDown}
            className={`relative z-10 inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#803003] motion-reduce:transition-none sm:gap-2 sm:px-4 sm:text-base ${tab === k ? "text-[#F5E9D6]" : "text-[#54230F] hover:text-[#803003]"}`}
          >
            <Icon className="hidden h-4 w-4 shrink-0 min-[420px]:block" aria-hidden />
            <span className="whitespace-nowrap">{t(`horoscope.tabs.${k}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
