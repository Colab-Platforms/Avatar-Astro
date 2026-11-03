import type { ReactNode } from "react";
import type { KundaliResult, LuminaryResult } from "./types";
import TermInfo, { ExplainTerms } from "@/components/astrology/TermInfo";
import { findTerms } from "@/lib/astroGlossary";
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
  const ayan = k.method.ayanamsaDegrees ? `${k.method.ayanamsaDegrees.toFixed(0)}°` : "about 24°";
  return (
    <div className="space-y-4" data-testid="kundali-panels">
      <Panel title="Your Vedic Rashi and Nakshatra" testId="kundali-rashi">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label={<TermInfo term="Surya Rashi">Surya Rashi (Sun sign)</TermInfo>} testId="surya-rashi">
            {rashiLine(k.sun, "The Sun changes sign on your birth date. Your birth time decides which applies.")}
          </Card>
          <Card label={<TermInfo term="Chandra Rashi">Chandra Rashi (Moon sign)</TermInfo>} testId="chandra-rashi">
            {rashiLine(k.moon, "The Moon changes sign on your birth date. Your birth time decides which applies.")}
          </Card>
          <Card label={<TermInfo term="Nakshatra">Janma Nakshatra</TermInfo>} testId="janma-nakshatra">
            {nak(k.moon)}
            {k.moon.nakshatra && <span className="block text-sm text-[#6B4A37]">Ruled by {k.moon.nakshatra.lord}</span>}
          </Card>
          <Card label={<TermInfo term="Lagna">Lagna (Ascendant)</TermInfo>} testId="lagna">
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
        <p className="text-sm text-[#6B4A37]">
          Calculated in the <TermInfo term="Sidereal zodiac (Nirayana)">sidereal (Nirayana) zodiac</TermInfo> with the Lahiri <TermInfo term="Ayanamsa">ayanamsa</TermInfo>. It differs from the Western <TermInfo term="Tropical zodiac">tropical zodiac</TermInfo> by {ayan}, so
          your Vedic Rashi is often one sign earlier than the Western sign printed in newspapers.
        </p>
      </Panel>

      <Panel title="Panchang at birth" testId="kundali-panchang">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label={<TermInfo term="Vikram Samvat">Vikram Samvat</TermInfo>}>{p.vikramSamvat}</Card>
          <Card label={<TermInfo term="Masa">Hindu month (Masa)</TermInfo>}>
            {p.masa.adhika ? "Adhika " : ""}
            {p.masa.name} ({p.masa.hindi})
          </Card>
          <Card label={<TermInfo term="Paksha">Paksha</TermInfo>}>{p.paksha === "shukla" ? "Shukla (शुक्ल)" : "Krishna (कृष्ण)"}</Card>
          <Card label={<TermInfo term="Tithi">Tithi</TermInfo>}>
            {p.tithi.name} ({p.tithi.hindi})
          </Card>
          <Card label={<TermInfo term="Nakshatra">Nakshatra</TermInfo>}>
            {p.nakshatra.name}, pada {p.nakshatra.pada}
          </Card>
          <Card label={<TermInfo term="Yoga">Yoga</TermInfo>}>{p.yoga}</Card>
          <Card label={<TermInfo term="Karana">Karana</TermInfo>}>{p.karana}</Card>
          <Card label={<TermInfo term="Vara">Vara (weekday)</TermInfo>}>{p.vara.name}</Card>
        </ul>
        <ExplainTerms terms={["Panchang", "Pada", ...findTerms([p.convention.label, p.convention.note, ...p.uncertainties, ...p.notes].join(" "))]} label="Also explained" />
        <p className="text-sm text-[#6B4A37]">
          {p.convention.label}. Your tithi ran from {p.tithi.startLocal} to {p.tithi.endLocal} (local time at your birthplace).
          {p.uncertain ? " Some of these depend on your birth time and are marked uncertain below." : ""}
        </p>
        {p.uncertain && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#301607]" data-testid="kundali-panchang-uncertain">
            {p.uncertainties.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </Panel>

      {k.planets && k.lagna && (
        <Panel title="Your birth charts" testId="kundali-charts">
          <div className="grid gap-6 md:grid-cols-2">
            <D1Chart k={k} />
            <D9Chart k={k} />
          </div>
          <p className="text-sm text-[#6B4A37]">
            Drawn in the North Indian style from the positions calculated above: the top diamond is the <TermInfo term="Lagna">Lagna</TermInfo> (house 1), houses run anticlockwise, and the small number in each
            house is the <TermInfo term="Rashi">Rashi</TermInfo> number (1 = Mesha ... 12 = Meena). Su Sun, Mo Moon, Ma Mars, Me Mercury, Ju Jupiter, Ve Venus, Sa Saturn, Ra <TermInfo term="Rahu">Rahu</TermInfo>, Ke <TermInfo term="Ketu">Ketu</TermInfo>.
            The left chart is the <TermInfo term="D1 (Rashi chart)">Rashi chart (D1)</TermInfo>, the main birth chart. The right-hand chart is the <TermInfo term="Navamsa (D9)">Navamsa (D9)</TermInfo>, an extra view tradition reads for marriage and inner strength.
          </p>
        </Panel>
      )}

      {k.planets && (
        <Panel title="Grahas in your Janma Kundali" testId="kundali-planets">
          <ExplainTerms terms={["Janma Kundali"]} label="Also explained" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-base">
              <thead className="text-sm text-[#6B4A37]">
                <tr>
                  <th className="py-1 pr-3"><TermInfo term="Graha">Graha</TermInfo></th>
                  <th className="py-1 pr-3"><TermInfo term="Rashi">Rashi (sign, degree)</TermInfo></th>
                  <th className="py-1 pr-3"><TermInfo term="Bhava (house)">House</TermInfo></th>
                  <th className="py-1"><TermInfo term="Nakshatra">Nakshatra</TermInfo></th>
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
              Running <TermInfo term="Dasha">Vimshottari period</TermInfo> (as of {k.dasha.asOf}): <strong>{k.dasha.mahadasha.lord}</strong> <TermInfo term="Mahadasha">Mahadasha</TermInfo> /{" "}
              <strong>{k.dasha.antardasha.lord}</strong> <TermInfo term="Antardasha">Antardasha</TermInfo>, counted from your Moon in {k.dasha.moonNakshatra}.
            </p>
          )}
        </Panel>
      )}

      {!k.timeKnown && k.stableSigns.length > 0 && (
        <Panel title="Grahas that stay in one Rashi on your birth date" testId="kundali-stable">
          <p>{k.stableSigns.map((s) => `${s.planet} in ${s.rashi.name}`).join(", ")}.</p>
          <ExplainTerms terms={["Rashi", ...findTerms(k.stableSigns.map((s) => s.planet).join(" "))]} label="Terms explained" />
        </Panel>
      )}

      <Panel title="How this was calculated" testId="kundali-basis">
        <ul className="list-disc space-y-1 pl-5">
          {k.basis.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="font-semibold text-[#592209]">Limits of this reading</p>
        <ul className="list-disc space-y-1 pl-5">
          {k.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <ExplainTerms terms={["Bhava (house)", ...findTerms([...k.basis, ...k.limitations, k.method.houses].join(" "))]} label="Terms explained" />
      </Panel>
    </div>
  );
};

export default KundaliPanels;
