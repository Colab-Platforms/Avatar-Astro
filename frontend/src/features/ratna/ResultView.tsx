import { Link } from "react-router-dom";
import Accordion from "./Accordion";
import GemStage, { GemIllustration } from "./GemStage";
import ResultHero from "./ResultHero";
import ShopSections from "./ShopSections";
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
    <h2 className="font-astra text-lg text-[#f0d58a] sm:text-xl">{title}</h2>
    <div className="mt-3 text-base text-slate-200">{children}</div>
  </section>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li className="min-w-0 rounded-xl border border-[#d4a64a]/25 bg-[#081426]/60 p-3">
    <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
    <div className="mt-1 break-words text-lg leading-snug text-white">{children}</div>
  </li>
);

/** One short sentence on why the stone was selected. */
const whyLine = (r: RatnaResult): string => {
  if (r.dateBased) return `Born on a ${r.dateBased.weekday}, a day ruled by ${r.dateBased.weekdayLord}.`;
  return `Your Ascendant is ${r.chart?.ascendant.sign}; its ruler ${r.recommendation?.lagnaLord} is linked with this stone.`;
};

/* ---------------------------------------------------------------- */

const PrimaryCard = ({ result }: { result: RatnaResult }) => {
  const { primary, method, dateBased } = result;
  const stone = primary.stone;
  const cautions = result.recommendation?.cautions ?? [];
  return (
    <section
      className="ratna-card ratna-gem-card ratna-reveal p-4 sm:p-6"
      style={step(1)}
      aria-labelledby="ratna-primary-h"
    >
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        <GemStage stone={stone} />
        <div className="min-w-0 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4a64a] sm:text-sm">
            {dateBased ? "Your Birth-Date Gemstone" : "Your Lagna-Lord Gemstone"}
          </p>
          <h2
            id="ratna-primary-h"
            data-testid="recommended-stone"
            className="mt-1 break-words font-astra text-3xl text-white sm:text-4xl lg:text-5xl"
          >
            {stone.name}
          </h2>
          <p className="mt-1 text-base text-slate-300 sm:text-lg">
            Traditionally associated with {primary.planet}
            <span className="text-slate-500"> · </span>
            <span className="text-slate-400">{stone.sanskrit}</span>
          </p>
          <p className="mt-3 text-base text-slate-100 sm:text-lg">{whyLine(result)}</p>
          <p
            className="mt-3 inline-block max-w-full break-words rounded-full border border-[#d4a64a]/50 bg-[#d4a64a]/10 px-3.5 py-1 text-sm text-[#f0d58a]"
            data-testid="method-label"
          >
            Method: {method.name}
          </p>
          {dateBased && (
            <p className="mt-3 text-sm text-slate-400 sm:text-base">
              Based on your birth date and birthplace; exact birth time was not used.{" "}
              <Link to="/ratna-jyotish" className="ratna-link whitespace-nowrap font-semibold text-[#f0d58a] underline">
                Calculate again with an exact birth time
              </Link>
            </p>
          )}
          {cautions.map((c) => (
            <p key={c} className="mt-3 rounded-lg border border-amber-400/40 bg-amber-950/30 p-2.5 text-left text-sm text-amber-100">
              {c}
            </p>
          ))}
          {result.notice && <p className="mt-3 text-left text-sm text-amber-200">{result.notice}</p>}
          <div className="mt-4 text-left">
            <Accordion title="Why this gemstone?">
              {dateBased && <p>{dateBased.rule}</p>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {primary.factors.map((f) => (
                  <li key={f.label} className="min-w-0 rounded-lg border border-[#d4a64a]/25 px-3 py-1.5 text-sm">
                    <span className="text-slate-400">{f.label}: </span>
                    <span className="break-words">{f.value}</span>
                  </li>
                ))}
              </ul>
              <p className="whitespace-pre-line">{result.explanation.text}</p>
              <p className="text-xs text-slate-400">
                {result.explanation.source === "ai"
                  ? "Wording written by AI from your calculated details and checked against them. The gemstone itself comes from the calculation rules, not the AI."
                  : "Explanation generated from your calculated details using fixed rules."}
              </p>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

const Associations = ({ result }: { result: RatnaResult }) => {
  const stone = result.primary.stone;
  return (
    <Panel title="Traditional associations" index={2} testId="ratna-significance">
      <ul className="space-y-2">
        {stone.themes.slice(0, 3).map((t) => (
          <li key={t.label} className="ratna-lift rounded-xl border border-[#d4a64a]/25 bg-[#081426]/60 px-3 py-2.5">
            <h3 className="text-base font-semibold text-[#f0d58a]">{t.label}</h3>
            <p className="text-sm text-slate-300">{t.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        Traditional interpretation in some Vedic astrology schools, not scientific evidence.
      </p>
    </Panel>
  );
};

const Wearing = ({ result }: { result: RatnaResult }) => {
  const w = result.wearing;
  if (!w) return null;
  return (
    <Panel title="How to wear" index={3} testId="ratna-wearing">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Fact label="Traditional weekday">{w.weekday}</Fact>
        <Fact label="Customary wearing">
          <p>{w.metal}</p>
          <p>{w.finger}</p>
        </Fact>
        {w.sunrise && (
          <li className="min-w-0 rounded-xl border border-[#d4a64a]/25 bg-[#081426]/60 p-3 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <p className="text-xs uppercase tracking-widest text-slate-400">Next {w.weekday} sunrise</p>
            <p className="mt-1 break-words text-lg leading-snug text-white">{w.sunrise.local}</p>
            <p className="break-words text-xs text-slate-400">
              {w.sunrise.locationLabel} · {w.sunrise.timeZone}
            </p>
          </li>
        )}
      </ul>
    </Panel>
  );
};

const Secondary = ({ result }: { result: RatnaResult }) => {
  const list = result.recommendation?.secondary ?? [];
  if (list.length === 0) return null;
  return (
    <Panel title="Other Traditional Perspectives" index={4}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((s) => (
          <li key={s.planet} className="ratna-lift min-w-0 rounded-xl border border-[#d4a64a]/25 bg-[#081426]/60 px-3 py-2.5">
            <strong className="text-white">{s.stone.name}</strong>
            <span className="text-sm text-slate-300">
              {" "}
              — {s.planet}, {ordinal(s.house)} house lord ({s.sign})
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">Optional additional associations; none are required.</p>
    </Panel>
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
              <caption className="pb-1 text-left text-slate-400">Traditional weekday rulers and gemstones</caption>
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-3">Weekday</th>
                  <th className="py-1 pr-3">Planet</th>
                  <th className="py-1">Gemstone</th>
                </tr>
              </thead>
              <tbody>
                {dateBased.table.map((r) => {
                  const mine = r.weekday === dateBased.weekday;
                  return (
                    <tr
                      key={r.weekday}
                      aria-current={mine ? "true" : undefined}
                      className={`border-t border-white/10 ${mine ? "bg-[#d4a64a]/15 text-white" : ""}`}
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
            <p className="text-slate-400">
              Local sunrise on your birth date: {dateBased.sunrise.local} ({dateBased.sunrise.timeZone}).
            </p>
          )}
          {result.stableSigns.length > 0 && (
            <div>
              <p className="text-slate-300">
                Background only: planets that stayed in one sidereal sign for your whole birth date.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm" aria-label="Planetary signs steady across the date">
                {result.stableSigns.map((s) => (
                  <li key={s.planet} className="rounded-full border border-[#d4a64a]/25 px-3 py-1 text-slate-300">
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
            with {rec.stone.name}.
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
        </>
      )}
      {result.chart && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-base">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1 pr-3">Planet</th>
                <th className="py-1 pr-3">Sign</th>
                <th className="py-1 pr-3">Degree</th>
                <th className="py-1">House</th>
              </tr>
            </thead>
            <tbody>
              {result.chart.planets.map((p) => (
                <tr key={p.planet} className="border-t border-white/10">
                  <td className="py-1 pr-3">{p.planet}</td>
                  <td className="py-1 pr-3">{p.sign}</td>
                  <td className="py-1 pr-3">{p.degree.toFixed(1)}°</td>
                  <td className="py-1">{ordinal(p.house)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {wearing && (
        <>
          <p className="text-slate-400">{wearing.sunriseNote}</p>
          <p className="text-slate-400">{wearing.customNote}</p>
        </>
      )}
      <h4 className="pt-1 font-semibold text-[#f0d58a]">Limitations and alternate interpretations</h4>
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
    <PrimaryCard result={result} />
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Associations result={result} />
      <Wearing result={result} />
    </div>
    <Secondary result={result} />
    <ShopSections
      stoneKey={result.primary.stone.key}
      stoneName={result.primary.stone.name}
      planet={result.primary.planet}
    />
    <div className="ratna-reveal space-y-3" style={step(6)}>
      <MethodDisclosure result={result} />
      <p
        role="note"
        data-testid="ratna-notice"
        className="rounded-xl border border-[#d4a64a]/30 bg-[#081426]/60 px-4 py-3 text-sm text-slate-300"
      >
        {SCIENCE_NOTICE}
      </p>
    </div>
  </div>
);
