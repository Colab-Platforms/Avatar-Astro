import { Link } from "react-router-dom";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import { ratnaContext } from "@/features/guru/contexts";
import Accordion from "./Accordion";
import ProfilePanels from "./ProfilePanels";
import GemStage, { GemIllustration } from "./GemStage";
import RatnaCard, { FactGrid, StoneName } from "./RatnaCard";
import ResultHero from "./ResultHero";
import ShopSections from "./ShopSections";
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

const PrimaryCard = ({ result }: { result: RatnaResult }) => {
  const { primary, method, dateBased } = result;
  const stone = primary.stone;
  const analysis = result.recommendation?.analysis;
  const cautions = analysis?.primary.cautions ?? [];
  const dasha = analysis?.dasha;
  return (
    <section
      className="ratna-card ratna-gem-card ratna-reveal p-4 sm:p-6"
      style={step(1)}
      aria-labelledby="ratna-primary-h"
    >
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        <GemStage stone={stone} />
        <div className="min-w-0 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#592209] sm:text-sm">
            {dateBased ? "Traditional Birth-Weekday Ratna" : "Recommended Ratna"}
          </p>
          <StoneName
            stone={stone}
            as="h2"
            testId="recommended-stone"
            className="mt-1 break-words font-home-serif text-3xl font-semibold text-[#592209] sm:text-4xl lg:text-5xl"
            hindiClassName="mt-1 text-xl text-[#6B4A37] sm:text-2xl"
          />
          <span id="ratna-primary-h" className="sr-only">
            {stoneLabel(stone)}
          </span>
          <p className="mt-2 text-base text-[#4A2E1F] sm:text-lg">Traditionally associated with {primary.planet}</p>
          <p
            className="mt-3 inline-block max-w-full break-words rounded-full border border-[#592209]/40 bg-[#592209]/10 px-3.5 py-1 text-sm text-[#301607]"
            data-testid="method-label"
          >
            Method: {method.name}
          </p>
          {dateBased ? (
            <div className="mt-3 rounded-lg border border-[#E58A45]/60 bg-[#E58A45]/10 p-3 text-left text-sm text-[#301607]">
              <p className="font-semibold">General association, not a Kundali-based recommendation.</p>
              <p className="mt-1">
                Born on a {dateBased.weekday}, a day ruled by {dateBased.weekdayLord}.
              </p>
              <p className="mt-1">
                Based on your birth date and birthplace; exact birth time was not used.{" "}
                <Link to="/ratna-jyotish" className="ratna-link whitespace-nowrap font-semibold text-[#592209] underline">
                  Calculate again with an exact birth time
                </Link>
              </p>
            </div>
          ) : (
            dasha && (
              <p className="mt-3 text-sm text-[#4A2E1F]">
                Running period: <strong>{dasha.mahadasha.lord}</strong> Mahadasha / <strong>{dasha.antardasha.lord}</strong>{" "}
                Antardasha (as of {dasha.asOf})
              </p>
            )
          )}
          {result.notice && <p className="mt-3 text-left text-sm text-[#592209]">{result.notice}</p>}
        </div>
      </div>

      <div className="mt-6">
        {analysis ? (
          <FactGrid a={analysis.primary} />
        ) : (
          <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4" aria-label="Planet details">
            <Fact label="Associated planet">{primary.planet}</Fact>
            <Fact label="Planet's sign">{dateBased?.weekdayLordSign ?? NC}</Fact>
            <Fact label="Planet's house">{NC} (needs birth time)</Fact>
            <Fact label="Nakshatra">{NC}</Fact>
            <Fact label="Dignity">{NC}</Fact>
            <Fact label="Current dasha relevance">{NC}</Fact>
          </ul>
        )}
      </div>

      {cautions.length > 0 && (
        <div
          className="mt-4 rounded-xl border border-[#E58A45]/60 bg-[#E58A45]/10 p-4 text-left text-sm text-[#301607]"
          data-testid="ratna-cautions"
        >
          <h3 className="font-semibold text-[#592209]">Cautions for this chart</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2">For any consequential decision, please consult a qualified Vedic astrologer.</p>
        </div>
      )}
    </section>
  );
};

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

const Associations = ({ result }: { result: RatnaResult }) => {
  const stone = result.primary.stone;
  return (
    <Panel title="Traditional significance" index={3} testId="ratna-significance">
      <p>{stone.significance[0]}</p>
      <ul className="mt-3 space-y-2">
        {stone.themes.slice(0, 3).map((t) => (
          <li key={t.label} className="ratna-lift rounded-xl border border-[#592209]/20 bg-[#FBF5EC] px-3 py-2.5">
            <h3 className="text-base font-semibold text-[#592209]">{t.label}</h3>
            <p className="text-sm text-[#4A2E1F]">{t.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[#6B4A37]">
        Traditional interpretation in some Vedic astrology schools, not scientific evidence. No outcome is guaranteed.
      </p>
    </Panel>
  );
};

const Wearing = ({ result }: { result: RatnaResult }) => {
  const w = result.wearing;
  if (!w) return null;
  return (
    <Panel title="Wearing guidance" index={4} testId="ratna-wearing">
      <p className="mb-3 rounded-lg border border-[#592209]/25 bg-[#592209]/5 px-3 py-2 text-sm text-[#301607]">
        General traditional guidance, not a personalised prescription. Customs vary between lineages.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Fact label="Traditional weekday">{w.weekday}</Fact>
        <Fact label="Commonly cited customs">
          <p>{w.metal}</p>
          <p>{w.finger}</p>
        </Fact>
        {w.sunrise && (
          <li className="min-w-0 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">Next {w.weekday} sunrise</p>
            <p className="mt-1 break-words text-lg leading-snug text-[#301607]">{w.sunrise.local}</p>
            <p className="break-words text-xs text-[#6B4A37]">
              {w.sunrise.locationLabel} · {w.sunrise.timeZone}
            </p>
          </li>
        )}
      </ul>
      {w.weight && (
        <div className="mt-3 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3 text-sm text-[#301607]" data-testid="ratna-weight-guidance">
          <p className="font-semibold text-[#592209]">Traditional weight guidance (your weight: {w.weight.weightKg} kg)</p>
          <p className="mt-1">{w.weight.text}</p>
          <p className="mt-1 text-[#6B4A37]">{w.weight.disclaimer}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-[#6B4A37]">
        Mantra, duration and purification are not prescribed here
        {w.weight ? "" : ", nor is carat weight"}; a qualified astrologer should advise on them.
      </p>
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

export const ResultView = ({ result }: { result: RatnaResult }) => (
  <div className="space-y-4 sm:space-y-5">
    <ResultHero result={result} />
    <ProfilePanels result={result} />
    <PrimaryCard result={result} />
    <WhyPanel result={result} />
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Associations result={result} />
      <Wearing result={result} />
    </div>
    <Alternatives result={result} />
    <Cautioned result={result} />
    <ShopSections
      stoneKey={result.primary.stone.key}
      stoneName={result.primary.stone.name}
      stoneLabel={stoneLabel(result.primary.stone)}
      planet={result.primary.planet}
    />
    <AskDivyaSection feature="ratna" context={ratnaContext(result)} />
    <div className="ratna-reveal space-y-3" style={step(6)}>
      <MethodDisclosure result={result} />
      <p
        role="note"
        data-testid="ratna-notice"
        className="rounded-xl border border-[#592209]/25 bg-[#FBF5EC] px-4 py-3 text-sm text-[#4A2E1F]"
      >
        {SCIENCE_NOTICE}
      </p>
    </div>
  </div>
);
