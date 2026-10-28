import type { GemstoneInfo, RatnaResult } from "./types";

const ordinal = (n: number) =>
  n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

export const GemIllustration = ({ stone, size = 120 }: { stone: GemstoneInfo; size?: number }) => (
  <svg
    role="img"
    aria-label={`${stone.name} illustration`}
    width={size}
    height={size}
    viewBox="0 0 120 120"
  >
    <polygon points="30,38 90,38 108,58 60,108 12,58" fill={stone.colour} stroke="#d4a64a" strokeWidth="2" />
    <polygon points="30,38 60,58 12,58" fill="#ffffff" opacity="0.18" />
    <polygon points="90,38 60,58 108,58" fill="#000000" opacity="0.14" />
    <polygon points="60,58 108,58 60,108" fill="#000000" opacity="0.2" />
    <polygon points="12,58 60,58 60,108" fill="#ffffff" opacity="0.08" />
    <polygon points="30,38 60,14 90,38" fill={stone.colour} stroke="#d4a64a" strokeWidth="2" opacity="0.85" />
  </svg>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="ratna-card p-5 sm:p-7">
    <h2 className="font-astra text-2xl text-[#f0d58a] sm:text-3xl">{title}</h2>
    <div className="mt-4 space-y-3 text-lg text-slate-200">{children}</div>
  </section>
);

const Disclosure = ({ summary, children, open }: { summary: string; children: React.ReactNode; open?: boolean }) => (
  <details open={open} className="group rounded-lg border border-[#d4a64a]/30 bg-[#081426]/60 p-4">
    <summary className="cursor-pointer select-none text-lg font-semibold text-[#f0d58a]">{summary}</summary>
    <div className="mt-3 space-y-3 text-base text-slate-200">{children}</div>
  </details>
);

export const ResultView = ({ result }: { result: RatnaResult }) => {
  const rec = result.recommendation;

  if (result.status === "limited" || !rec) {
    return (
      <div className="space-y-6">
        <Section title="Your Ratna Jyotish Result">
          <p>{result.explanation.text}</p>
          {result.stableSigns.length > 0 && (
            <>
              <p className="text-base text-slate-300">
                {result.notice} These signs are the same at every moment of your birth date at your birthplace:
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {result.stableSigns.map((s) => (
                  <li key={s.planet} className="rounded-lg border border-[#d4a64a]/25 px-3 py-2">
                    {s.planet} in {s.sign}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
        <MethodDisclosure result={result} />
      </div>
    );
  }

  const stone = rec.stone;
  return (
    <div className="space-y-6">
      <Section title="Your Ratna Jyotish Result">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <GemIllustration stone={stone} />
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-400">
              Traditionally associated with {rec.lagnaLord}
            </p>
            <p className="font-astra text-3xl text-white sm:text-4xl" data-testid="recommended-stone">
              {stone.name}
            </p>
            <p className="text-base text-slate-400">{stone.sanskrit}</p>
          </div>
        </div>
        <p>{result.explanation.text}</p>
        <p className="text-sm text-slate-400">
          {result.explanation.source === "ai"
            ? "Wording written by AI from your calculated chart and checked against it. The gemstone itself comes from the calculation rules, not the AI."
            : "Explanation generated from your calculated chart using fixed rules."}
        </p>
        <h3 className="pt-2 text-xl text-[#f0d58a]">Chart factors used</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rec.factors.map((f) => (
            <li key={f.label} className="rounded-lg border border-[#d4a64a]/25 px-3 py-2">
              <span className="text-slate-400">{f.label}: </span>
              {f.value}
            </li>
          ))}
        </ul>
        {result.notice && <p className="text-amber-200">{result.notice}</p>}
        {rec.cautions.map((c) => (
          <p key={c} className="rounded-lg border border-amber-400/40 bg-amber-950/30 p-3 text-base text-amber-100">
            {c}
          </p>
        ))}
      </Section>

      <Section title="Traditional Benefits and Significance">
        {stone.significance.map((s) => (
          <p key={s}>{s}</p>
        ))}
        <p className="text-base text-slate-400">
          These are astrological beliefs. There is no scientific evidence that a gemstone changes health, wealth,
          relationships or other life outcomes, and nothing here is medical, legal or financial advice.
        </p>
      </Section>

      <Section title="Why This Gemstone?">
        <MethodDisclosure result={result} />
      </Section>

      {rec.secondary.length > 0 && (
        <Section title="Secondary Perspectives">
          <p className="text-base text-slate-300">
            Optional additional associations from the 5th and 9th house rulers. None of these are required.
          </p>
          <ul className="space-y-2">
            {rec.secondary.map((s) => (
              <li key={s.planet} className="rounded-lg border border-[#d4a64a]/25 p-3">
                <strong className="text-white">{s.stone.name}</strong> — {s.planet}, {ordinal(s.house)} house lord ({s.sign}).
                <span className="block text-base text-slate-400">{s.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.wearing && (
        <Section title="Traditional Wearing Guidance">
          <ul className="space-y-1.5">
            <li>
              <span className="text-slate-400">Traditional weekday: </span>
              {result.wearing.weekday}
            </li>
            <li>
              <span className="text-slate-400">Customary metal: </span>
              {result.wearing.metal}
            </li>
            <li>
              <span className="text-slate-400">Customary finger: </span>
              {result.wearing.finger}
            </li>
          </ul>
          {result.wearing.sunrise ? (
            <p>
              <span className="text-slate-400">Next {result.wearing.weekday} sunrise: </span>
              {result.wearing.sunrise.local} ({result.wearing.sunrise.timeZone})
              <span className="block text-base text-slate-400">
                Location used: {result.wearing.sunrise.locationLabel}. This may differ from where you live now.
              </span>
            </p>
          ) : null}
          <p className="text-base text-slate-400">{result.wearing.sunriseNote}</p>
          <p className="text-base text-slate-400">{result.wearing.customNote}</p>
        </Section>
      )}
    </div>
  );
};

export const MethodDisclosure = ({ result }: { result: RatnaResult }) => {
  const rec = result.recommendation;
  return (
    <Disclosure summary="How this was calculated">
      <p>
        <strong>{result.method.name}.</strong> {result.method.summary}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Zodiac: {result.method.zodiac}</li>
        <li>Ayanamsa: {result.method.ayanamsa}</li>
        <li>Houses: {result.method.houses}</li>
        <li>Lunar nodes: {result.method.nodes}</li>
        <li>Engine: {result.method.engine}</li>
        <li>
          Birth instant: {result.birth.dateOfBirth}
          {result.birth.timeOfBirth ? ` ${result.birth.timeOfBirth}` : ""} in {result.birth.place} ({result.birth.timeZone}
          {result.birth.utcOffsetMinutes != null
            ? `, UTC${result.birth.utcOffsetMinutes >= 0 ? "+" : "-"}${Math.floor(Math.abs(result.birth.utcOffsetMinutes) / 60)}:${String(Math.abs(result.birth.utcOffsetMinutes) % 60).padStart(2, "0")}`
            : ""}
          )
        </li>
      </ul>
      {rec && (
        <>
          <p>
            Your Ascendant is {result.chart?.ascendant.sign}; its ruler {rec.lagnaLord} is traditionally associated with{" "}
            {rec.stone.name}.
          </p>
          {rec.excluded.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {rec.excluded.map((e) => (
                <li key={e.house}>{e.reason}</li>
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
      <h4 className="pt-1 font-semibold text-[#f0d58a]">Limitations and alternate interpretations</h4>
      <ul className="list-disc space-y-1 pl-5">
        {result.method.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Disclosure>
  );
};
