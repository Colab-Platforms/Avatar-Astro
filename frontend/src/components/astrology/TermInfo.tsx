import { useId, useState, type ReactNode } from "react";
import { getTerm } from "@/lib/astroGlossary";

// "What does this mean?" for any astrology term. Shows the label with a small (i) button; pressing it opens the glossary
// explanation right below, in place, so nobody has to leave the result. The text always comes from astroGlossary.ts.
// It uses the same brown/cream palette as the surrounding result panels and does not change their layout.

interface Props {
  /** Glossary term to explain (e.g. "Lagna"). */
  term: string;
  /** What to display; defaults to the term. */
  children?: ReactNode;
  /** Optional sentence about THIS result, shown first in the explanation. */
  context?: ReactNode;
}

export const TermInfo = ({ term, children, context }: Props) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const entry = getTerm(term);
  if (!entry) return <>{children ?? term}</>;
  return (
    <>
      <span className="inline-flex items-baseline gap-1">
        {children ?? term}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`What does ${entry.term} mean?`}
          title={entry.short}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-[18px] w-[18px] shrink-0 translate-y-[2px] items-center justify-center rounded-full border border-[#592209]/50 text-[11px] font-bold leading-none text-[#592209] hover:bg-[#592209] hover:text-[#F5E9D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A]"
        >
          i
        </button>
      </span>
      {open && (
        <span
          id={id}
          role="note"
          data-testid={`term-info-${entry.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          className="my-2 block rounded-xl border border-[#C9873A]/50 bg-[#FFF7E6] p-3 text-left text-[15px] font-normal normal-case leading-relaxed tracking-normal text-[#301607]"
        >
          <span className="block font-semibold text-[#592209]">{entry.term}: what does this mean?</span>
          {context && <span className="mt-1 block">{context}</span>}
          <span className="mt-1 block">{entry.meaning}</span>
          {entry.how && (
            <span className="mt-1 block">
              <strong>How it is determined: </strong>
              {entry.how}
            </span>
          )}
          {entry.why && (
            <span className="mt-1 block">
              <strong>Why it matters: </strong>
              {entry.why}
            </span>
          )}
          {entry.tradition && (
            <span className="mt-1 block text-[#4A2E1F]">
              <strong>Traditionally: </strong>
              {entry.tradition}
            </span>
          )}
          {entry.example && (
            <span className="mt-1 block text-[#4A2E1F]">
              <strong>For example: </strong>
              {entry.example}
            </span>
          )}
        </span>
      )}
    </>
  );
};

export default TermInfo;

/** "Terms used here" row: one (i) explainer per term, for terms that appear inside generated sentences. Renders nothing if empty. */
export const ExplainTerms = ({ terms, label = "Terms used here" }: { terms: string[]; label?: string }) => {
  const list = Array.from(new Set(terms));
  if (!list.length) return null;
  return (
    <div className="mt-2 text-sm leading-7 text-[#6B4A37]" data-testid="explain-terms">
      <span className="font-semibold text-[#592209]">{label}: </span>
      {list.map((t, i) => (
        <span key={t}>
          {i > 0 && " · "}
          <TermInfo term={t} />
        </span>
      ))}
    </div>
  );
};
