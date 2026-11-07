import type { ReactNode } from "react";
import type { KundaliResult, LuminaryResult } from "./types";
import { D1Chart, D9Chart } from "./BirthChartDiagram";

const Card = ({ label, children, testId }: { label: ReactNode; children: ReactNode; testId?: string }) => (
  <li className="min-w-0 rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3" data-testid={testId}>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{label}</p>
    <div className="mt-1 break-words text-lg leading-snug text-[#301607]">{children}</div>
  </li>
);

const Panel = ({ title, testId, children }: { title: string; testId: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 sm:p-5" data-testid={testId} aria-label={title}>
    <h2 className="mb-2 text-lg font-semibold text-[#592209] sm:text-xl">{title}</h2>
    <div className="space-y-2.5 text-base leading-[1.6] text-[#4A2E1F]">{children}</div>
  </section>
);

const rashiLine = (l: LuminaryResult, whenUncertain: string): ReactNode =>
  l.rashi ? (
    <>
      {l.rashi.name} ({l.rashi.hindi}) <span className="text-base text-[#6B4A37]">· {l.rashi.sign}</span>
    </>
  ) : (
    <span className="text-base">
      {l.candidates.map((c) => `${c.name} (${c.sign})`).join(" or ")}
      <span className="block text-sm text-[#6B4A37]">{whenUncertain}</span>
    </span>
  );

const nak = (l: LuminaryResult): string =>
  l.nakshatra ? `${l.nakshatra.name}${l.nakshatra.pada ? `, pada ${l.nakshatra.pada}` : ""}` : "Needs your exact birth time";

/** Vedic (sidereal, Lahiri) results: Surya/Chandra Rashi, Nakshatra, Lagna, grahas, Panchang, basis and limits. */
export const KundaliPanels = ({ k }: { k: KundaliResult }) => {
  const p = k.panchang;
  return (
    <div className="space-y-4" data-testid="kundali-panels">
      {!k.timeKnown && (
        <p className="rounded-xl border border-[#592209]/20 bg-[#F5E9D6]/70 p-3 text-sm text-[#4A2E1F]" data-testid="kundali-time-notice">
          You did not enter a birth time, so the Lagna, houses and Dasha are not calculated, and your Moon sign and some Panchang items may be uncertain.
        </p>
      )}
      <Panel title="Panchang at birth" testId="kundali-panchang">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label="Vikram Samvat">{p.vikramSamvat}</Card>
          <Card label="Hindu month (Masa)">
            {p.masa.adhika ? "Adhika " : ""}
            {p.masa.name} ({p.masa.hindi})
          </Card>
          <Card label="Paksha">{p.paksha === "shukla" ? "Shukla (शुक्ल)" : "Krishna (कृष्ण)"}</Card>
          <Card label="Tithi">
            {p.tithi.name} ({p.tithi.hindi})
          </Card>
          <Card label="Nakshatra">
            {p.nakshatra.name}, pada {p.nakshatra.pada}
          </Card>
          <Card label="Yoga">{p.yoga}</Card>
          <Card label="Karana">{p.karana}</Card>
          <Card label="Vara (weekday)">{p.vara.name}</Card>
        </ul>
        <p className="text-sm text-[#6B4A37]">
          Your tithi ran from {p.tithi.startLocal} to {p.tithi.endLocal} (local time at your birthplace).
          {p.uncertain ? " Some of these depend on your birth time:" : ""}
        </p>
        {p.uncertain && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#301607]" data-testid="kundali-panchang-uncertain">
            {p.uncertainties.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Your Vedic Rashi and Nakshatra" testId="kundali-rashi">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label="Surya Rashi (Sun sign)" testId="surya-rashi">
            {rashiLine(k.sun, "The Sun changes sign on your birth date. Your birth time decides which applies.")}
          </Card>
          <Card label="Chandra Rashi (Moon sign)" testId="chandra-rashi">
            {rashiLine(k.moon, "The Moon changes sign on your birth date. Your birth time decides which applies.")}
          </Card>
          <Card label="Janma Nakshatra" testId="janma-nakshatra">
            {nak(k.moon)}
            {k.moon.nakshatra && <span className="block text-sm text-[#6B4A37]">Ruled by {k.moon.nakshatra.lord}</span>}
          </Card>
          <Card label="Lagna (Ascendant)" testId="lagna">
            {k.lagna ? (
              <>
                {k.lagna.rashi.name} ({k.lagna.rashi.hindi})
                <span className="block text-sm text-[#6B4A37]">
                  {k.lagna.degreeInSign}° · {k.lagna.nakshatra.name}, pada {k.lagna.nakshatra.pada}
                </span>
              </>
            ) : (
              <span className="text-base">Not calculated: needs your exact birth time</span>
            )}
          </Card>
        </ul>
        <p className="text-sm text-[#6B4A37]">Vedic Rashis use the sidereal zodiac (Lahiri), so your Rashi is often one sign earlier than the Western sign in newspapers.</p>
      </Panel>

      {k.planets && k.lagna && (
        <Panel title="Your birth charts" testId="kundali-charts">
          <div className="grid gap-6 md:grid-cols-2">
            <D1Chart k={k} />
            <D9Chart k={k} />
          </div>
          <p className="text-sm text-[#6B4A37]">North Indian style: the top diamond is the Lagna (house 1) and houses run anticlockwise. Left: the main birth chart (D1). Right: the Navamsa (D9), read for marriage and inner strength.</p>
        </Panel>
      )}

      {k.planets && (
        <Panel title="Grahas in your Janma Kundali" testId="kundali-planets">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-base">
              <thead className="text-sm text-[#6B4A37]">
                <tr>
                  <th className="py-1 pr-3">Graha</th>
                  <th className="py-1 pr-3">Rashi (sign, degree)</th>
                  <th className="py-1 pr-3">House</th>
                  <th className="py-1">Nakshatra</th>
                </tr>
              </thead>
              <tbody>
                {k.planets.map((g) => (
                  <tr key={g.planet} className="border-t border-[#592209]/15 text-[#301607]">
                    <td className="py-1 pr-3">{g.planet}</td>
                    <td className="py-1 pr-3">
                      {g.rashi.name} {g.degreeInSign}°
                    </td>
                    <td className="py-1 pr-3">{g.house}</td>
                    <td className="py-1">
                      {g.nakshatra}, {g.pada}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {k.dasha && (
            <p>
              Running Vimshottari period (as of {k.dasha.asOf}): <strong>{k.dasha.mahadasha.lord}</strong> Mahadasha /{" "}
              <strong>{k.dasha.antardasha.lord}</strong> Antardasha, counted from your Moon in {k.dasha.moonNakshatra}.
            </p>
          )}
        </Panel>
      )}

    </div>
  );
};

export default KundaliPanels;
