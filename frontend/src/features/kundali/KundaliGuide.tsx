import type { KundaliResult } from "./types";
import { buildKundaliGuide, KUNDALI_TERMS, type Insight } from "./kundaliInsights";

// "Your chart in plain words": sections built from the calculated chart. Each point shows the calculated FACT first and the
// traditional MEANING second, so a reader can always tell what the chart says from what tradition says about it.

const Block = ({ title, question, items, testId }: { title: string; question: string; items: Insight[]; testId: string }) => (
  <section className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 sm:p-5" data-testid={testId} aria-label={title}>
    <h3 className="text-lg font-semibold text-[#592209] sm:text-xl">{title}</h3>
    <p className="mb-3 text-sm italic text-[#6B4A37]">{question}</p>
    {items.length === 0 ? (
      <p className="text-base text-[#4A2E1F]">Nothing in your calculated chart falls into this group.</p>
    ) : (
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.title} className="rounded-xl border border-[#592209]/15 bg-[#F5E9D6]/60 p-3">
            <p className="font-semibold text-[#301607]">{it.title}</p>
            <p className="mt-1 text-[15.5px] leading-relaxed text-[#301607]"><span className="mr-1 rounded bg-[#592209] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#F5E9D6]">In your chart</span>{it.fact}</p>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-[#4A2E1F]"><span className="mr-1 rounded bg-[#C9873A] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#301607]">Traditionally</span>{it.meaning}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const KundaliGuide = ({ k }: { k: KundaliResult }) => {
  const g = buildKundaliGuide(k);
  return (
    <div className="space-y-4" data-testid="kundali-guide">
      <section className="rounded-2xl border border-[#C9873A]/50 bg-[#FFF7E6] p-4 sm:p-5" data-testid="kundali-intro">
        <h2 className="text-xl font-semibold text-[#592209] sm:text-2xl">Your Janma Kundali in plain words</h2>
        <p className="mt-2 text-base leading-relaxed text-[#301607]">
          A Janma Kundali is a map of the sky at your exact time and place of birth. Jyotish reads it to describe your temperament, the areas of life that get more attention, and the periods you are passing through.
          It shows tendencies for reflection. It does not promise outcomes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#4A2E1F]">
          Each point below has two parts: <strong>In your chart</strong> is calculated from your birth details, and <strong>Traditionally</strong> is what Jyotish says about it in general.
        </p>
      </section>

      <Block testId="kundali-personality" title="Personality" question="How do you come across, and what is your inner nature like?" items={g.personality} />
      {g.houses && <Block testId="kundali-career" title="Career and money" question="What does your chart say about work and income?" items={g.career} />}
      {g.houses && <Block testId="kundali-relationships" title="Relationships" question="What does your chart say about partnership?" items={g.relationships} />}
      {g.houses && <Block testId="kundali-strengths" title="Strengths" question="Which grahas are placed comfortably?" items={g.strengths} />}
      {g.houses && <Block testId="kundali-challenges" title="Challenges to be aware of" question="Where might extra effort help?" items={g.challenges} />}
      <Block testId="kundali-important" title="Important chart insights" question="Which periods and markers are worth knowing?" items={g.important} />

      {g.notes.length > 0 && (
        <ul className="list-disc space-y-1 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 pl-8 text-[15.5px] text-[#301607]" data-testid="kundali-guide-notes">
          {g.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      <details className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 sm:p-5" data-testid="kundali-terms">
        <summary className="cursor-pointer text-lg font-semibold text-[#592209]">Terms explained simply</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {KUNDALI_TERMS.map(([t, d]) => (
            <div key={t}><dt className="font-semibold text-[#301607]">{t}</dt><dd className="text-[15px] leading-relaxed text-[#4A2E1F]">{d}</dd></div>
          ))}
        </dl>
      </details>
    </div>
  );
};

export default KundaliGuide;
