import { useEffect, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import LotusOm from "@/components/ai-guru/LotusOm";
import { guruTiming, statusAt } from "@/lib/guruTiming";
import { AstrologerAvatar } from "@/components/astrologers/AstrologerCard";
import type { Astrologer } from "@/data/astrologers";

export const AI_GUIDED_LABEL = "Guided response based on this astrologer's area of expertise";

/** Experience is shown only for real, verified profiles. */
const showExperience = (a: Astrologer) => !a.demo && a.verified;

/**
 * The guidance profile behind this conversation. It comes from the same data as the consultation section.
 * The replies are AI-generated, so the card says so and shows no online status.
 */
export const PersonaCard = ({ persona }: { persona: Astrologer | null }) => {
  if (!persona) return null; // before a guidance profile is assigned nothing is shown, so the name is not repeated
  return (
    <div className="mx-3 mb-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] p-3.5" data-testid="persona-card">
      <div className="flex items-center gap-3">
        <AstrologerAvatar a={persona} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <span className="truncate">{persona.name}</span>
            {persona.verified && !persona.demo && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#592209]" aria-label="Verified" />}
          </div>
          <div className="text-[11px] text-muted-foreground">{persona.languages.join(" · ")}</div>
        </div>
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="Expertise">
        {persona.expertise.map((x) => (
          <li key={x} className="rounded-full border border-[#592209]/25 bg-[#F5E9D6] px-2 py-0.5 text-[10px] text-[#592209]">
            {x}
          </li>
        ))}
      </ul>
      {showExperience(persona) && <p className="mt-2 text-[11px] text-muted-foreground">{persona.experienceYears} years of experience</p>}
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{persona.about}</p>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-snug text-[#6B4A37]" data-testid="ai-guided-label">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#592209]" aria-hidden="true" />
        {AI_GUIDED_LABEL}
      </p>
    </div>
  );
};

/** Compact version for the page header (only rendered once a guidance profile is assigned). */
export const PersonaHeader = ({ persona }: { persona: Astrologer }) => (
  <div className="flex min-w-0 items-center gap-3" data-testid="persona-header">
    <AstrologerAvatar a={persona} size={44} />
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-home-serif text-lg font-semibold text-foreground">{persona.name}</span>
        {persona.verified && !persona.demo && <BadgeCheck className="h-4 w-4 shrink-0 text-[#592209]" aria-label="Verified" />}
      </div>
      <div className="text-xs text-muted-foreground">{persona.expertise.slice(0, 3).join(" · ")} · Guided</div>
    </div>
  </div>
);

/** Shown while a guidance profile is being chosen. The lotus glows and the status line changes as time passes. */
export const SearchingGuru = () => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" aria-live="polite" data-testid="searching-guru" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] px-6 py-8 text-center">
      <LotusOm size={84} animated />
      <p className="font-home-serif text-xl font-semibold text-[#592209]">Searching for an available Guru...</p>
      <p className="text-sm text-[#6B4A37]" data-testid="searching-status">{statusAt(elapsed, guruTiming.statusEveryMs)}</p>
    </div>
  );
};

/** Shown when no profile is currently available. No chat is opened. */
export const GuruUnavailable = ({ onRetry }: { onRetry: () => void }) => (
  <div role="status" data-testid="no-guru" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] px-6 py-8 text-center">
    <p className="font-home-serif text-xl font-semibold text-[#592209]">No Guru is currently available.</p>
    <p className="text-sm text-[#6B4A37]">Please try again shortly.</p>
    <button type="button" onClick={onRetry} className="rounded-full bg-[#592209] px-5 py-2 text-sm font-semibold text-[#F5E9D6] hover:opacity-90">
      Try again
    </button>
  </div>
);
