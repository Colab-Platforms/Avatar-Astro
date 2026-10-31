import { BadgeCheck, Sparkles } from "lucide-react";
import { AstrologerAvatar } from "@/components/astrologers/AstrologerCard";
import type { Astrologer } from "@/data/astrologers";

export const AI_GUIDED_LABEL = "AI-guided response based on this astrologer's area of expertise";

/** Experience is shown only for real, verified profiles. */
const showExperience = (a: Astrologer) => !a.demo && a.verified;

/**
 * The guidance profile behind this conversation. It comes from the same data as the consultation section.
 * The replies are AI-generated, so the card says so and shows no online status.
 */
export const PersonaCard = ({ persona }: { persona: Astrologer | null }) => {
  if (!persona) {
    return (
      <div className="mx-3 mb-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] p-3.5" data-testid="persona-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#592209]/10 text-[#592209]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">Divya Margdarshak</div>
            <div className="text-[11px] text-muted-foreground">AI-powered spiritual guidance</div>
          </div>
        </div>
      </div>
    );
  }
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

/** Compact version for the page header. */
export const PersonaHeader = ({ persona }: { persona: Astrologer | null }) =>
  persona ? (
    <div className="flex min-w-0 items-center gap-3" data-testid="persona-header">
      <AstrologerAvatar a={persona} size={44} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-home-serif text-lg font-semibold text-foreground">{persona.name}</span>
          {persona.verified && !persona.demo && <BadgeCheck className="h-4 w-4 shrink-0 text-[#592209]" aria-label="Verified" />}
        </div>
        <div className="text-xs text-muted-foreground">{persona.expertise.slice(0, 3).join(" · ")} · AI-guided</div>
      </div>
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-3" data-testid="persona-header">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#592209]/10 text-[#592209]">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="truncate font-home-serif text-lg font-semibold text-foreground">Divya Margdarshak</div>
        <div className="text-xs text-muted-foreground">AI-powered spiritual guidance</div>
      </div>
    </div>
  );

/** Shown while a guidance profile is being chosen for a new question. */
export const SearchingGuru = () => (
  <div role="status" aria-live="polite" data-testid="searching-guru" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/15 bg-[#FBF5EC] px-6 py-8 text-center">
    <span className="relative flex h-12 w-12 items-center justify-center" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#592209]/20" />
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#592209] text-[#F5E9D6]">
        <Sparkles className="h-4 w-4" />
      </span>
    </span>
    <p className="font-home-serif text-xl font-semibold text-[#592209]">Searching for an available Guru...</p>
    <p className="text-sm text-[#6B4A37]">Finding the right guidance for your question.</p>
  </div>
);
