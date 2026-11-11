import { useEffect, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import LotusOm from "@/components/ai-guru/LotusOm";
import { guruTiming, statusIndexAt } from "@/lib/guruTiming";
import { AstrologerAvatar } from "@/components/astrologers/AstrologerCard";
import type { Astrologer } from "@/data/astrologers";
import { guruLanguages } from "@/lib/guruLanguages";

export const AI_GUIDED_LABEL = "Guided response based on this astrologer's area of expertise";

/** Experience is shown only for real, verified profiles. */
const showExperience = (a: Astrologer) => !a.demo && a.verified;

/**
 * The guidance profile behind this conversation. It comes from the same data as the consultation section.
 * The replies are AI-generated, so the card says so and shows no online status.
 */
export const PersonaCard = ({ persona }: { persona: Astrologer | null }) => {
  const { t } = useTranslation();
  if (!persona) return null; // before a guidance profile is assigned nothing is shown, so the name is not repeated
  return (
    <div className="mx-3 mb-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] p-3.5" data-testid="persona-card">
      <div className="flex items-center gap-3">
        <AstrologerAvatar a={persona} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <span className="truncate">{persona.name}</span>
            {persona.verified && !persona.demo && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#592209]" aria-label={t("guru.persona.verified")} />}
          </div>
          <div className="text-[11px] text-muted-foreground">{guruLanguages(persona).join(" · ")}</div>
        </div>
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-1" aria-label={t("guru.persona.expertise")}>
        {persona.expertise.map((x) => (
          <li key={x} className="rounded-full border border-[#592209]/25 bg-[#F5E9D6] px-2 py-0.5 text-[10px] text-[#592209]">
            {x}
          </li>
        ))}
      </ul>
      {showExperience(persona) && <p className="mt-2 text-[11px] text-muted-foreground">{t("guru.persona.years", { count: persona.experienceYears })}</p>}
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{persona.about}</p>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-snug text-[#6B4A37]" data-testid="ai-guided-label">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#592209]" aria-hidden="true" />
        {t("guru.persona.guidedLabel")}
      </p>
    </div>
  );
};

/** Compact version for the page header (only rendered once a guidance profile is assigned). */
export const PersonaHeader = ({ persona }: { persona: Astrologer }) => {
  const { t } = useTranslation();
  return (
  <div className="flex min-w-0 items-center gap-3" data-testid="persona-header">
    <AstrologerAvatar a={persona} size={44} />
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="line-clamp-2 break-words font-home-serif text-base font-semibold leading-tight text-foreground sm:line-clamp-1 sm:text-lg">{persona.name}</span>
        {persona.verified && !persona.demo && <BadgeCheck className="h-4 w-4 shrink-0 text-[#592209]" aria-label={t("guru.persona.verified")} />}
      </div>
      <div className="hidden text-xs text-muted-foreground sm:block">{persona.expertise.slice(0, 3).join(" · ")} · {t("guru.persona.guided")}</div>
    </div>
  </div>
  );
};

/** Shown while a guidance profile is being chosen. The lotus glows and the status line changes as time passes. */
export const SearchingGuru = () => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" aria-live="polite" data-testid="searching-guru" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] px-6 py-8 text-center">
      <LotusOm size={84} animated />
      <p className="font-home-serif text-xl font-semibold text-[#592209]">{t("guru.search.title")}</p>
      <p className="text-sm text-[#6B4A37]" data-testid="searching-status">{t(`guru.search.status${statusIndexAt(elapsed, guruTiming.statusEveryMs) + 1}`)}</p>
    </div>
  );
};

/** Shown when no profile is currently available. No chat is opened. */
export const GuruUnavailable = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
  <div role="status" data-testid="no-guru" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] px-6 py-8 text-center">
    <p className="font-home-serif text-xl font-semibold text-[#592209]">{t("guru.search.none")}</p>
    <p className="text-sm text-[#6B4A37]">{t("guru.search.noneBody")}</p>
    <button type="button" onClick={onRetry} className="rounded-full bg-[#592209] px-5 py-2 text-sm font-semibold text-[#F5E9D6] hover:opacity-90">
      {t("common.retry")}
    </button>
  </div>
  );
};
