import { Link } from "react-router-dom";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { ratnaContext } from "@/features/guru/contexts";
import Accordion from "./Accordion";
import ProfilePanels from "./ProfilePanels";
import GemStage, { GemIllustration } from "./GemStage";
import RatnaCard, { FactGrid, StoneName } from "./RatnaCard";
import ResultHero from "./ResultHero";
import ShopSections from "./ShopSections";
import RatnaSummary from "./RatnaSummary";
import { stoneLabel } from "./ratnaCatalog";
import { SCIENCE_NOTICE, ordinal, utcLabel } from "./format";
import type { RatnaResult } from "./types";

export { GemIllustration };

const step = (i: number) => ({ ["--i" as string]: Math.min(i, 6) }) as React.CSSProperties;

const Panel = ({
  title,
  index,
  testId,
  children,
}: {
  title: string;
  index: number;
  testId?: string;
  children: React.ReactNode;
}) => (
  <section
    className="ratna-card ratna-reveal min-w-0 p-4 sm:p-5"
    style={step(index)}
    data-testid={testId}
    aria-label={title}
  >
    <h2 className="font-home-serif text-lg font-semibold text-[#592209] sm:text-xl">{title}</h2>
    <div className="mt-3 text-base text-[#4A2E1F]">{children}</div>
  </section>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="min-w-0 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{label}</p>
    <div className="mt-1 break-words text-lg leading-snug text-[#301607]">{children}</div>
  </li>
);

const NC = "Not calculated";

/* ---------------------------------------------------------------- */

const WhyPanel = ({ result }: { result: RatnaResult }) => {
  const analysis = result.recommendation?.analysis;
  const { primary, dateBased } = result;
  return (
    <Panel title="Why this Ratna is recommended" index={2} testId="ratna-why">
      {analysis ? (
        <ul className="space-y-2">
          {analysis.primary.reasons.map((r) => (
            <li key={r} className="rounded-lg border border-[#592209]/20 bg-[#FBF5EC] px-3 py-2 text-[0.95rem]">
              {r}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {primary.factors.map((f) => (
            <li key={f.label} className="min-w-0 rounded-lg border border-[#592209]/20 px-3 py-1.5 text-sm">
              <span className="text-[#6B4A37]">{f.label}: </span>
              <span className="break-words">{f.value}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Accordion title="Full explanation">
          {dateBased && <p>{dateBased.rule}</p>}
          <p className="whitespace-pre-line">{result.explanation.text}</p>
          <p className="text-xs text-[#6B4A37]">
            {result.explanation.source === "ai"
              ? "Wording written by AI from your calculated details and checked against them. The Ratna itself comes from the calculation rules, not the AI."
              : "Explanation generated from your calculated details using fixed rules."}
          </p>
        </Accordion>
      </div>
    </Panel>
  );
};

const Alternatives = ({ result }: { result: RatnaResult }) => {
  const an = result.recommendation?.analysis;
  if (!an) return null;
  return (
    <section className="ratna-reveal space-y-3" style={step(5)} aria-labelledby="ratna-alt-h" data-testid="ratna-alternatives">
      <h2 id="ratna-alt-h" className="font-home-serif text-xl font-semibold text-[#592209] sm:text-2xl">
        Alternative Ratnas
      </h2>
      {an.alternatives.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {an.alternatives.map((a, i) => (
            <RatnaCard key={a.planet} a={a} index={i} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] px-4 py-3 text-[#4A2E1F]">
          No alternative Ratna is supported by this chart. The 5th and 9th house lords are either the Lagna lord already or also rule a 6th, 8th or 12th house.
        </p>
      )}
    </section>
  );
};

const Cautioned = ({ result }: { result: RatnaResult }) => {
  const an = result.recommendation?.analysis;
  if (!an || an.cautionedStones.length === 0) return null;
  return (
    <section className="ratna-reveal space-y-3" style={step(5)} aria-labelledby="ratna-caution-h" data-testid="ratna-cautioned">
      <h2 id="ratna-caution-h" className="font-home-serif text-xl font-semibold text-[#592209] sm:text-2xl">
        Ratnas that require caution
      </h2>
      <p className="text-sm text-[#4A2E1F]">
        These are not recommended for this chart under this method. Strengthening a planet is not always helpful, so each
        reason below comes from your calculated chart.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {an.cautionedStones.map((a, i) => (
          <RatnaCard key={a.planet} a={a} index={i} />
        ))}
      </ul>
      {an.notIndicated.length > 0 && (
        <p className="text-sm text-[#6B4A37]">
          No chart-specific basis for or against: {an.notIndicated.join(", ")}.
        </p>
      )}
    </section>
  );
};

export const MethodDisclosure = ({ result }: { result: RatnaResult }) => {
  const rec = result.recommendation;
  const { method, birth, dateBased, wearing } = result;
  return (
    <Accordion title="How this was calculated">
      <p>
        <strong>{method.name}.</strong> {method.summary}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Zodiac: {method.zodiac}</li>
        <li>Ayanamsa: {method.ayanamsa}</li>
        <li>Houses: {method.houses}</li>
        <li>Lunar nodes: {method.nodes}</li>
        <li>Engine: {method.engine}</li>
        <li>
          {dateBased ? "Birth date and place" : "Birth instant"}: {birth.dateOfBirth}
          {birth.timeOfBirth ? ` ${birth.timeOfBirth}` : ""} in {birth.place} ({birth.timeZone}
          {birth.utcOffsetMinutes != null ? `, ${utcLabel(birth.utcOffsetMinutes)}` : ""})
        </li>
      </ul>

      {dateBased && (
        <>
          <p>{dateBased.rule}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-base">
              <caption className="pb-1 text-left text-[#6B4A37]">Traditional weekday rulers and Ratnas</caption>
              <thead className="text-[#6B4A37]">
                <tr>
                  <th className="py-1 pr-3">Weekday</th>
                  <th className="py-1 pr-3">Planet</th>
                  <th className="py-1">Ratna</th>
                </tr>
              </thead>
              <tbody>
                {dateBased.table.map((r) => {
                  const mine = r.weekday === dateBased.weekday;
                  return (
                    <tr
                      key={r.weekday}
                      aria-current={mine ? "true" : undefined}
                      className={`border-t border-[#592209]/15 ${mine ? "bg-[#592209]/10 text-[#301607]" : ""}`}
                    >
                      <td className="py-1 pr-3">{r.weekday}</td>
                      <td className="py-1 pr-3">{r.planet}</td>
                      <td className="py-1">{r.stone}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>{dateBased.classicalNote}</p>
          {dateBased.sunrise && (
            <p className="text-[#6B4A37]">
              Local sunrise on your birth date: {dateBased.sunrise.local} ({dateBased.sunrise.timeZone}).
            </p>
          )}
          {result.stableSigns.length > 0 && (
            <div>
              <p className="text-[#6B4A37]">
                Background only: planets that stayed in one sidereal sign for your whole birth date.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm" aria-label="Planetary signs steady across the date">
                {result.stableSigns.map((s) => (
                  <li key={s.planet} className="rounded-full border border-[#592209]/25 px-3 py-1 text-[#4A2E1F]">
                    {s.planet} in {s.sign}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {rec && (
        <>
          <p>
            Your Ascendant is {result.chart?.ascendant.sign}; its ruler {rec.lagnaLord} is traditionally associated
            with {stoneLabel(rec.stone)}.
          </p>
          {rec.excluded.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {rec.excluded.map((e) => (
                <li key={e.house}>{e.reason}</li>
              ))}
            </ul>
          )}
          {rec.secondary.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {rec.secondary.map((s) => (
                <li key={s.planet}>
                  {s.stone.name}: {s.reason}
                </li>
              ))}
            </ul>
          )}
          {rec.analysis.dasha ? (
            <p>
              Vimshottari dasha (from the Moon in {rec.analysis.dasha.moonNakshatra}) as of {rec.analysis.dasha.asOf}:{" "}
              {rec.analysis.dasha.mahadasha.lord} Mahadasha ({rec.analysis.dasha.mahadasha.start} to{" "}
              {rec.analysis.dasha.mahadasha.end}), {rec.analysis.dasha.antardasha.lord} Antardasha (
              {rec.analysis.dasha.antardasha.start} to {rec.analysis.dasha.antardasha.end}).
            </p>
          ) : (
            <p>Vimshottari dasha: {NC}.</p>
          )}
        </>
      )}
      {result.chart && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-base">
            <thead className="text-[#6B4A37]">
              <tr>
                <th className="py-1 pr-3">Planet</th>
                <th className="py-1 pr-3">Sign</th>
                <th className="py-1 pr-3">Degree</th>
                <th className="py-1 pr-3">House</th>
                <th className="py-1 pr-3">Nakshatra</th>
                <th className="py-1">Dignity</th>
              </tr>
            </thead>
            <tbody>
              {result.chart.planets.map((p) => (
                <tr key={p.planet} className="border-t border-[#592209]/15">
                  <td className="py-1 pr-3">
                    {p.planet}
                    {p.retrograde && p.planet !== "Rahu" && p.planet !== "Ketu" ? " (R)" : ""}
                    {p.combust ? " (C)" : ""}
                  </td>
                  <td className="py-1 pr-3">{p.sign}</td>
                  <td className="py-1 pr-3">{p.degree.toFixed(1)}°</td>
                  <td className="py-1 pr-3">{ordinal(p.house)}</td>
                  <td className="py-1 pr-3">
                    {p.nakshatra}-{p.pada}
                  </td>
                  <td className="py-1">{p.dignity === "not assessed" ? "n/a" : p.dignity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-[#6B4A37]">(R) retrograde, (C) combust. Whole-sign houses.</p>
        </div>
      )}
      {rec && (
        <div>
          <h4 className="pt-1 font-semibold text-[#592209]">Not calculated</h4>
          <ul className="list-disc space-y-1 pl-5">
            {rec.analysis.notCalculated.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {wearing && (
        <>
          <p className="text-[#6B4A37]">{wearing.sunriseNote}</p>
          <p className="text-[#6B4A37]">{wearing.customNote}</p>
        </>
      )}
      <h4 className="pt-1 font-semibold text-[#592209]">Limitations and alternate interpretations</h4>
      <ul className="list-disc space-y-1 pl-5">
        {method.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Accordion>
  );
};

const GUIDE_TERMS: [string, string][] = [
  ["Ratna", "A gemstone used in Jyotish. Each Ratna is traditionally linked with one graha (planet)."],
  ["Lagna", "Your rising sign at birth. Its ruling graha is the usual starting point for choosing a Ratna."],
  ["Graha", "A planet or point in Jyotish, such as the Sun, Moon, Jupiter or Saturn."],
  ["Dasha", "A long planetary period in your life, counted from the Moon's nakshatra. It is checked before a Ratna is suggested."],
  ["Dignity", "How comfortable a graha is in its sign: for example in its own sign, exalted, or in a weaker sign."],
];

/** Separates calculated facts from traditional guidance, and explains the terms, before the details. */
const ReadingGuide = () => (
  <section className="rounded-2xl border border-[#C9873A]/50 bg-[#FFF7E6] p-4 sm:p-5" aria-label="How to read this result" data-testid="ratna-guide">
    <h2 className="font-home-serif text-lg font-semibold text-[#592209] sm:text-xl">How to read this result</h2>
    <ul className="mt-2 space-y-1.5 text-base leading-[1.6] text-[#301607]">
      <li><strong>Calculated:</strong> your chart details (Lagna, graha positions, Dasha) come from your birth date, time and place.</li>
      <li><strong>Traditional:</strong> what each Ratna stands for, and the rules used to choose one, come from Jyotish tradition.</li>
      <li><strong>Guidance:</strong> wearing advice and cautions are general. No gemstone is promised to change health, money or luck, and a qualified astrologer can advise you in person.</li>
    </ul>
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold text-[#592209]">Terms explained simply</summary>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {GUIDE_TERMS.map(([t, d]) => (
          <div key={t}><dt className="font-semibold text-[#301607]">{t}</dt><dd className="text-[15px] leading-relaxed text-[#4A2E1F]">{d}</dd></div>
        ))}
      </dl>
    </details>
  </section>
);

export const ResultView = ({ result }: { result: RatnaResult }) => (
  <div className="space-y-4 sm:space-y-5">
    <ResultHero result={result} />
    <RatnaSummary result={result} />
    <ShopSections
      compact
      stoneKey={result.primary.stone.key}
      stoneName={result.primary.stone.name}
      stoneLabel={stoneLabel(result.primary.stone)}
      planet={result.primary.planet}
    />
    <details className="ratna-card p-4 sm:p-5" data-testid="ratna-details">
      <summary className="cursor-pointer font-home-serif text-lg font-semibold text-[#592209] sm:text-xl">View Calculation Details</summary>
      <div className="mt-4 space-y-4">
        <ReadingGuide />
        <ProfilePanels result={result} />
        <WhyPanel result={result} />
        <Cautioned result={result} />
        <Alternatives result={result} />
        <MethodDisclosure result={result} />
      </div>
    </details>
    <AskDivyaSection feature="ratna" context={ratnaContext(result)} />
    <p role="note" data-testid="ratna-notice" className="rounded-xl border border-[#592209]/25 bg-[#FBF5EC] px-4 py-3 text-sm text-[#4A2E1F]">
      {SCIENCE_NOTICE}
    </p>
  </div>
);
