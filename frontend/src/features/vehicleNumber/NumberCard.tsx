import { useRef, useState } from "react";
import { Check, Copy, GitCompareArrows, Heart, Share2 } from "lucide-react";
import NumberPlate from "./NumberPlate";
import { explain, type Compatibility, type Evaluation, type Label } from "./vehicleNumerology";
import { copyText, shareNumber, shareText, type ShareInput } from "./sharing";

export const LABEL_STYLE: Record<Label, string> = {
  "Strong match": "bg-[#C9873A] text-[#301607]",
  "Good match": "bg-[#592209] text-[#F5E9D6]",
  "Neutral match": "bg-[#592209]/10 text-[#592209] ring-1 ring-[#592209]/25",
  "Less aligned": "bg-[#8A5A1E]/10 text-[#6B4A37] ring-1 ring-[#8A5A1E]/30",
};

export const shareInputFor = (number: string, ev: Evaluation, c: Compatibility): ShareInput => ({
  number, total: ev.total, reduced: ev.reduced, planet: ev.planet, label: c.label, keywords: ev.theme.keywords,
});

export const reducedText = (ev: Evaluation) => (ev.master ? `${ev.reduced} (reads as ${ev.root})` : String(ev.reduced));

const action = "flex items-center justify-center gap-1.5 rounded-xl border border-[#592209]/25 bg-white/60 px-2 py-2 text-xs font-semibold text-[#592209] transition-colors hover:bg-[#592209] hover:text-[#F5E9D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A] aria-pressed:border-[#592209] aria-pressed:bg-[#592209] aria-pressed:text-[#F7DC8A]";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#592209]/12 bg-white/70 px-3 py-2 text-center">
    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">{label}</p>
    <p className="mt-0.5 text-xl font-bold text-[#301607]" style={{ fontFamily: "'Astra','Cinzel',Georgia,serif" }}>{value}</p>
  </div>
);

export interface NumberCardProps {
  /** The registration number shown on the plate (leading zeros kept). */
  number: string;
  evaluation: Evaluation;
  compat: Compatibility;
  /** Where the number came from when it is not simply an everyday number, e.g. "From your date of birth". */
  tag?: string;
  /** A recommended ordinary number: shows the Everyday Number and Practical number labels. */
  everyday?: boolean;
  saved: boolean;
  onToggleSave: (n: string) => void;
  inCompare: boolean;
  compareFull: boolean;
  onToggleCompare: (n: string) => void;
}

export default function NumberCard({ number, evaluation: ev, compat, tag, everyday, saved, onToggleSave, inCompare, compareFull, onToggleCompare }: NumberCardProps) {
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const say = (m: string) => { setNote(m); clearTimeout(timer.current); timer.current = setTimeout(() => setNote(""), 2200); };
  const input = shareInputFor(number, ev, compat);
  const copy = async () => say((await copyText(shareText(input))) ? "Copied" : "Could not copy");
  const share = async () => {
    const r = await shareNumber(input);
    say(r === "shared" ? "Shared" : r === "copied" ? "Sharing is not available here, so the text was copied" : r === "cancelled" ? "" : "Could not share");
  };

  return (
    <li data-testid="number-card" className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#592209]/15 bg-[#FFFCF5] shadow-[0_14px_34px_-22px_rgba(89,34,9,0.55)]">
      <div className="bg-gradient-to-br from-[#FFF6DD] to-[#F8E7C4] px-4 pb-3 pt-3">
        <div className="mb-2.5 flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1.5">
            {everyday && <span data-testid="everyday-label" className="rounded-full border border-[#8A5A1E]/40 bg-white/60 px-2.5 py-0.5 text-[11px] font-bold text-[#592209]">Everyday Number</span>}
            {tag && <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A5A1E]">{tag}</span>}
          </span>
          <span data-testid="compat-label" className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${LABEL_STYLE[compat.label]}`}>{compat.label}</span>
        </div>
        <NumberPlate number={number} size="md" />
        {everyday && <p className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A5A1E]">Practical number</p>}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Number Total" value={String(ev.total)} />
          <Stat label="Numerology Number" value={reducedText(ev)} />
        </div>

        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">Traditional Interpretation</p>
          <p className="mt-0.5 text-sm font-semibold text-[#592209]">{ev.symbol} {ev.planet} · {ev.theme.keywords}</p>
          <p className="mt-1 text-sm leading-snug text-[#301607]">{ev.theme.text}</p>
        </div>

        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">Why It Matches Your Profile</p>
          <ul className="mt-1 space-y-1 text-[13.5px] leading-snug text-[#301607]">
            {explain(ev, compat).map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
          <button type="button" onClick={() => onToggleSave(number)} aria-pressed={saved} aria-label={saved ? `Remove ${number} from saved numbers` : `Save ${number}`} className={action}>
            <Heart size={14} aria-hidden="true" fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={copy} aria-label={`Copy ${number}`} className={action}>
            <Copy size={14} aria-hidden="true" /> Copy
          </button>
          <button type="button" onClick={share} aria-label={`Share ${number}`} className={action}>
            <Share2 size={14} aria-hidden="true" /> Share
          </button>
          <button type="button" onClick={() => onToggleCompare(number)} aria-pressed={inCompare} disabled={!inCompare && compareFull} aria-label={inCompare ? `Remove ${number} from comparison` : `Compare ${number}`} className={`${action} disabled:cursor-not-allowed disabled:opacity-50`}>
            <GitCompareArrows size={14} aria-hidden="true" /> {inCompare ? "Added" : "Compare"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="h-4 text-center text-xs font-semibold text-[#592209]">{note && <><Check size={12} className="mr-1 inline" aria-hidden="true" />{note}</>}</p>
      </div>
    </li>
  );
}
