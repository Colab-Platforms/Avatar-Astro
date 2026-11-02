import { Link } from "react-router-dom";
import GemStage from "./GemStage";
import { StoneName } from "./RatnaCard";
import { stoneLabel } from "./ratnaCatalog";
import { formatBirthDate } from "./format";
import type { RatnaResult } from "./types";

// The short, readable part of a Ratna result. Everything here is read from the calculated result; long Panchang tables,
// the method write-up, alternatives and the full explanation live in "View Calculation Details" (see ResultView).

const NOT_WITHOUT_TIME = [
  "Lagna (Ascendant) and the twelve houses",
  "Which house each planet sits in, and which houses it rules",
  "The exact Moon sign and nakshatra when the Moon changes sign that day, and the start of the dasha",
];

const Card = ({ n, title, testId, children }: { n: number; title: string; testId: string; children: React.ReactNode }) => (
  <section className="ratna-card p-4 sm:p-5" data-testid={testId} aria-label={title}>
    <h2 className="flex items-center gap-2 font-home-serif text-lg font-semibold text-[#592209] sm:text-xl">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#592209] text-sm text-[#F5E9D6]" aria-hidden>{n}</span>
      {title}
    </h2>
    <div className="mt-3 text-base leading-relaxed text-[#301607]">{children}</div>
  </section>
);

const Pill = ({ tone, children }: { tone: "ok" | "warn" | "no"; children: React.ReactNode }) => (
  <span className={`mr-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${tone === "ok" ? "bg-[#2F6B3A] text-white" : tone === "warn" ? "bg-[#C9873A] text-[#301607]" : "bg-[#592209] text-[#F5E9D6]"}`}>{children}</span>
);

export const RatnaSummary = ({ result }: { result: RatnaResult }) => {
  const { primary, method, dateBased, birth, panchang } = result;
  const analysis = result.recommendation?.analysis;
  const stone = primary.stone;
  const cautions = analysis?.primary.cautions ?? [];
  const w = result.wearing;
  const reasons = analysis ? analysis.primary.reasons.slice(0, 2) : [];

  const uncertain = panchang?.uncertain ? panchang.uncertainties : [];
  const missing = dateBased ? NOT_WITHOUT_TIME : analysis?.notCalculated.slice(0, 3) ?? [];

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="ratna-summary">
      {/* 1. recommended ratna */}
      <section className="ratna-card ratna-gem-card p-4 sm:p-6" data-testid="ratna-recommended" aria-labelledby="ratna-primary-h">
        <div className="grid items-center gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <GemStage stone={stone} />
          <div className="min-w-0 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#592209] sm:text-sm">Your Recommended Ratna</p>
            <StoneName stone={stone} as="h2" testId="recommended-stone"
              className="mt-1 break-words font-home-serif text-3xl font-semibold text-[#592209] sm:text-4xl lg:text-5xl"
              hindiClassName="mt-1 text-xl text-[#6B4A37] sm:text-2xl" />
            <span id="ratna-primary-h" className="sr-only">{stoneLabel(stone)}</span>
            <p className="mt-2 text-base text-[#4A2E1F] sm:text-lg">Associated planet: <strong>{primary.planet}</strong></p>
            {dateBased && (
              <p className="mt-3 rounded-lg border border-[#E58A45]/60 bg-[#E58A45]/10 p-3 text-left text-sm text-[#301607]" data-testid="ratna-weekday-banner">
                <strong>General weekday association, not a Kundali-based recommendation.</strong> It uses your birth weekday ({dateBased.weekday}, ruled by {dateBased.weekdayLord}) because no birth time was given.{" "}
                <Link to="/ratna-jyotish" className="whitespace-nowrap font-semibold text-[#592209] underline">Calculate with your birth time</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2. why this gemstone */}
      <Card n={2} title="Why This Gemstone" testId="ratna-why">
        <p className="mb-2 text-sm text-[#4A2E1F]" data-testid="method-label">Method: {method.name}</p>
        {analysis ? (
          <ul className="space-y-2">{reasons.map((r) => <li key={r} className="rounded-lg border border-[#592209]/20 bg-[#FBF5EC] px-3 py-2">{r}</li>)}</ul>
        ) : (
          <p>{dateBased ? dateBased.rule : primary.factors.map((f) => `${f.label}: ${f.value}`).join(". ")}</p>
        )}
      </Card>

      {/* 3. birth details */}
      <Card n={3} title="Your Birth Details" testId="ratna-birth">
        <ul aria-label="Birth details used" className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {[
            ["Date", formatBirthDate(birth.dateOfBirth)],
            ["Time", birth.timeOfBirth ?? "Not provided"],
            ["Place", birth.place],
            ...(panchang ? [["Tithi", `${panchang.paksha === "shukla" ? "Shukla" : "Krishna"} ${panchang.tithi.name}`], ["Nakshatra", `${panchang.nakshatra.name}, pada ${panchang.nakshatra.pada}`], ["Moon sign", panchang.moonRashi]] : []),
          ].map(([l, v]) => (
            <li key={l} className="min-w-0 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{l}</p>
              <p className="mt-0.5 break-words text-base text-[#301607]">{v}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* 4. calculation accuracy */}
      <Card n={4} title="Calculation Accuracy" testId="ratna-accuracy">
        <ul className="space-y-2 text-[15.5px]">
          <li><Pill tone="ok">Calculated</Pill>{analysis ? "Lagna, houses, planet positions and the running dasha, from your birth date, time and place." : "Your birth weekday, birthplace and the Panchang details above."}</li>
          {uncertain.length > 0 && <li data-testid="ratna-uncertain"><Pill tone="warn">Uncertain</Pill>{uncertain.join(" ")}</li>}
          {missing.length > 0 && (
            <li data-testid="ratna-missing"><Pill tone="no">Not calculated</Pill>{dateBased ? "These need your exact birth time: " : ""}{missing.join("; ")}.</li>
          )}
        </ul>
      </Card>

      {/* 5. traditional significance */}
      <Card n={5} title="Traditional Significance" testId="ratna-significance">
        <ul className="space-y-2">
          {stone.themes.slice(0, 3).map((t) => (
            <li key={t.label} className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] px-3 py-2.5">
              <h3 className="font-semibold text-[#592209]">{t.label}</h3>
              <p className="text-[15.5px] text-[#4A2E1F]">{t.note}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* 6. wearing guidance */}
      {w && (
        <Card n={6} title="Wearing Guidance (Traditional)" testId="ratna-wearing">
          <p className="mb-2 text-sm text-[#4A2E1F]">Traditional customs, not a personal prescription and not a guarantee of any result. Customs differ between lineages.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">Weekday</span><p>{w.weekday}</p></li>
            <li className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">Metal and finger</span><p>{w.metal}</p><p>{w.finger}</p></li>
          </ul>
          {w.sunrise && <p className="mt-2 text-[15.5px]">Next {w.weekday} sunrise: <strong>{w.sunrise.local}</strong> ({w.sunrise.locationLabel} · {w.sunrise.timeZone})</p>}
          {w.weight && <p className="mt-2 text-[15.5px]" data-testid="ratna-weight-guidance"><strong>Weight (your weight: {w.weight.weightKg} kg):</strong> {w.weight.text} <span className="text-[#6B4A37]">{w.weight.disclaimer}</span></p>}
          {cautions.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#E58A45]/60 bg-[#E58A45]/10 p-3 text-[15.5px]" data-testid="ratna-cautions">
              <p className="font-semibold text-[#592209]">Precautions for this chart</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">{cautions.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="mt-2 text-sm text-[#6B4A37]">For any important decision, please consult a qualified Vedic astrologer.</p>
            </div>
          )}
          {cautions.length === 0 && <p className="mt-2 text-sm text-[#6B4A37]">For any important decision, please consult a qualified Vedic astrologer.</p>}
        </Card>
      )}
    </div>
  );
};

export default RatnaSummary;
