import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { KundaliResult, LuminaryResult } from "./types";
import { D1Chart, D9Chart } from "./BirthChartDiagram";
import { useGlossary } from "@/i18n/glossary";
import { rashiName } from "./kundaliInsights";
import { tb } from "./backendText";

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

type Gloss = ReturnType<typeof useGlossary>["g"];

const rashiLine = (l: LuminaryResult, whenUncertain: string, g: Gloss, t: TFunction): ReactNode =>
  l.rashi ? (
    <>
      {rashiName(l.rashi)} ({l.rashi.hindi}) <span className="text-base text-[#6B4A37]">· {g("rashi", l.rashi.sign)}</span>
    </>
  ) : (
    <span className="text-base">
      {l.candidates.map((c) => `${rashiName(c)} (${g("rashi", c.sign)})`).join(t("kundali.panels.or"))}
      <span className="block text-sm text-[#6B4A37]">{whenUncertain}</span>
    </span>
  );

const nak = (l: LuminaryResult, g: Gloss, t: TFunction): string =>
  l.nakshatra
    ? l.nakshatra.pada
      ? t("kundali.panels.nakshatraPada", { nakshatra: g("nakshatra", l.nakshatra.name), pada: l.nakshatra.pada })
      : g("nakshatra", l.nakshatra.name)
    : t("kundali.panels.needsBirthTime");

/** Vedic (sidereal, Lahiri) results: Surya/Chandra Rashi, Nakshatra, Lagna, grahas, Panchang, basis and limits. */
export const KundaliPanels = ({ k }: { k: KundaliResult }) => {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const p = k.panchang;
  return (
    <div className="space-y-4" data-testid="kundali-panels">
      {!k.timeKnown && (
        <p className="rounded-xl border border-[#592209]/20 bg-[#F5E9D6]/70 p-3 text-sm text-[#4A2E1F]" data-testid="kundali-time-notice">
          {t("kundali.panels.timeNotice")}
        </p>
      )}
      <Panel title={t("kundali.panels.panchang.title")} testId="kundali-panchang">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label={t("kundali.panels.panchang.vikramSamvat")}>{p.vikramSamvat}</Card>
          <Card label={t("kundali.panels.panchang.masa")}>
            {p.masa.adhika ? t("kundali.panels.panchang.adhika") : ""}
            {g("masa", p.masa.name)} ({p.masa.hindi})
          </Card>
          <Card label={t("kundali.panels.panchang.paksha")}>{p.paksha === "shukla" ? t("kundali.panels.panchang.shukla") : t("kundali.panels.panchang.krishna")}</Card>
          <Card label={t("kundali.panels.panchang.tithi")}>
            {g("tithi", p.tithi.name)} ({p.tithi.hindi})
          </Card>
          <Card label={t("kundali.panels.panchang.nakshatra")}>
            {t("kundali.panels.nakshatraPada", { nakshatra: g("nakshatra", p.nakshatra.name), pada: p.nakshatra.pada })}
          </Card>
          <Card label={t("kundali.panels.panchang.yoga")}>{g("yoga", p.yoga)}</Card>
          <Card label={t("kundali.panels.panchang.karana")}>{g("karana", p.karana)}</Card>
          <Card label={t("kundali.panels.panchang.vara")}>{g("weekday", p.vara.name)}</Card>
        </ul>
        <p className="text-sm text-[#6B4A37]">
          {t("kundali.panels.panchang.tithiRan", { start: p.tithi.startLocal, end: p.tithi.endLocal })}
          {p.uncertain ? t("kundali.panels.panchang.dependOnTime") : ""}
        </p>
        {p.uncertain && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#301607]" data-testid="kundali-panchang-uncertain">
            {p.uncertainties.map((u) => (
              <li key={u}>{tb(t, g, u)}</li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("kundali.panels.rashi.title")} testId="kundali-rashi">
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Card label={t("kundali.panels.rashi.surya")} testId="surya-rashi">
            {rashiLine(k.sun, t("kundali.panels.rashi.sunChanges"), g, t)}
          </Card>
          <Card label={t("kundali.panels.rashi.chandra")} testId="chandra-rashi">
            {rashiLine(k.moon, t("kundali.panels.rashi.moonChanges"), g, t)}
          </Card>
          <Card label={t("kundali.panels.rashi.janmaNakshatra")} testId="janma-nakshatra">
            {nak(k.moon, g, t)}
            {k.moon.nakshatra && <span className="block text-sm text-[#6B4A37]">{t("kundali.panels.rashi.ruledBy", { lord: g("planet", k.moon.nakshatra.lord) })}</span>}
          </Card>
          <Card label={t("kundali.panels.rashi.lagna")} testId="lagna">
            {k.lagna ? (
              <>
                {rashiName(k.lagna.rashi)} ({k.lagna.rashi.hindi})
                <span className="block text-sm text-[#6B4A37]">
                  {k.lagna.degreeInSign}° · {t("kundali.panels.nakshatraPada", { nakshatra: g("nakshatra", k.lagna.nakshatra.name), pada: k.lagna.nakshatra.pada })}
                </span>
              </>
            ) : (
              <span className="text-base">{t("kundali.panels.rashi.lagnaNotCalculated")}</span>
            )}
          </Card>
        </ul>
        <p className="text-sm text-[#6B4A37]">{t("kundali.panels.rashi.siderealNote")}</p>
      </Panel>

      {k.planets && k.lagna && (
        <Panel title={t("kundali.panels.charts.title")} testId="kundali-charts">
          <div className="grid gap-6 md:grid-cols-2">
            <D1Chart k={k} />
            <D9Chart k={k} />
          </div>
          <p className="text-sm text-[#6B4A37]">{t("kundali.panels.charts.note")}</p>
        </Panel>
      )}

      {k.planets && (
        <Panel title={t("kundali.panels.grahas.title")} testId="kundali-planets">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-base">
              <thead className="text-sm text-[#6B4A37]">
                <tr>
                  <th className="py-1 pr-3">{t("kundali.panels.grahas.graha")}</th>
                  <th className="py-1 pr-3">{t("kundali.panels.grahas.rashiColumn")}</th>
                  <th className="py-1 pr-3">{t("kundali.panels.grahas.house")}</th>
                  <th className="py-1">{t("kundali.panels.grahas.nakshatra")}</th>
                </tr>
              </thead>
              <tbody>
                {k.planets.map((pl) => (
                  <tr key={pl.planet} className="border-t border-[#592209]/15 text-[#301607]">
                    <td className="py-1 pr-3">{g("planet", pl.planet)}</td>
                    <td className="py-1 pr-3">
                      {rashiName(pl.rashi)} {pl.degreeInSign}°
                    </td>
                    <td className="py-1 pr-3">{pl.house}</td>
                    <td className="py-1">
                      {g("nakshatra", pl.nakshatra)}, {pl.pada}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {k.dasha && (
            <p>
              <Trans
                i18nKey="kundali.panels.grahas.dasha"
                values={{ asOf: k.dasha.asOf, mahadasha: g("planet", k.dasha.mahadasha.lord), antardasha: g("planet", k.dasha.antardasha.lord), nakshatra: g("nakshatra", k.dasha.moonNakshatra) }}
                components={{ b: <strong /> }}
              />
            </p>
          )}
        </Panel>
      )}

    </div>
  );
};

export default KundaliPanels;
