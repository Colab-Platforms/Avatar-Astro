import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "@/i18n";
import { useGlossary, glossName } from "@/i18n/glossary";
import type { PlaceResult } from "@/features/ratna/types";
import TermInfo, { ExplainTerms } from "@/components/astrology/TermInfo";
import { findTerms } from "@/lib/astroGlossary";
import { kundaliApi } from "./api";
import { D1Chart } from "./BirthChartDiagram";
import type { KootaScore, MatchResult } from "./types";
import { tb, tbCell, tbName } from "./backendText";

// Love Compatibility: the real Ashtakoota (Guna Milan) score for the two people already entered above. It is calculated by the
// server from each person's Moon sign and Nakshatra, which need an exact birth time and place, so those are asked for here.
// If anything is missing or the calculation fails, an "unavailable" state is shown: a score is never estimated or invented.

export interface MatchPersonInput {
  name: string;
  gender: string;
  day: string;
  month: string;
  year: string;
  /** 24-hour HH:mm from the form, or "" when not given. */
  time: string;
  place: PlaceResult | null;
}

// English data. The shown text is looked up by key (gunaMilan.koota.<id>.measures / .low) with this English as the fallback.
const KOOTA_HELP: Record<string, { measures: string; low: string }> = {
  Varna: { measures: "temperament and ego", low: "differing temperament classes" },
  Vashya: { measures: "mutual attraction and influence", low: "partners who may pull in different directions" },
  Tara: { measures: "birth-star harmony and wellbeing", low: "unfavourable birth-star relation" },
  Yoni: { measures: "physical and instinctive closeness", low: "differing instincts" },
  "Graha Maitri": { measures: "mental friendship and communication", low: "Moon-sign rulers that are not friendly" },
  Gana: { measures: "basic nature and temperament", low: "very different temperament types" },
  Bhakoot: { measures: "emotional bond, family and finances", low: "Moon signs in a position tradition finds difficult" },
  Nadi: { measures: "health and energy compatibility", low: "same Nadi" },
};
const KOOTA_KEY: Record<string, string> = { Varna: "varna", Vashya: "vashya", Tara: "tara", Yoni: "yoni", "Graha Maitri": "grahaMaitri", Gana: "gana", Bhakoot: "bhakoot", Nadi: "nadi" };
const helpOf = (t: TFunction, koota: string, field: "measures" | "low") =>
  t(`gunaMilan.koota.${KOOTA_KEY[koota] ?? koota}.${field}`, { defaultValue: KOOTA_HELP[koota]?.[field] ?? "" });

const pad = (v: string) => String(v).padStart(2, "0");
const toReq = (p: MatchPersonInput, time: string, place: PlaceResult) => ({
  dateOfBirth: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
  timeOfBirth: time,
  timeUnknown: false,
  place: { name: place.name, admin1: place.admin1, country: place.country, latitude: place.latitude, longitude: place.longitude, timezone: place.timezone },
});

const ScoreRing = ({ total }: { total: number }) => {
  const { t } = useTranslation();
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 130 130" className="h-40 w-40 shrink-0" role="img" aria-label={t("gunaMilan.ring.aria", { total })}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#592209" strokeOpacity="0.15" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="#592209" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(total / 36) * c} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="#301607">{total}</text>
      <text x="65" y="86" textAnchor="middle" fontSize="12" fill="#6B4A37">{t("gunaMilan.ring.outOf")}</text>
    </svg>
  );
};

const interpret = (t: TFunction, ks: KootaScore[], first: string, second: string) => {
  const get = (n: string) => ks.find((k) => k.koota === n)!;
  const strong = ks.filter((k) => k.score === k.max).map((k) => k.koota);
  const weak = ks.filter((k) => k.score === 0).map((k) => k.koota);
  const f = (n: string) => get(n).score / get(n).max;
  const emotional = (f("Bhakoot") + f("Graha Maitri") + f("Gana")) / 3;
  const comm = (f("Graha Maitri") + f("Vashya")) / 2;
  const level = (x: number) => t(`gunaMilan.level.${x >= 0.75 ? "strong" : x >= 0.4 ? "moderate" : "weaker"}`);
  const total = ks.reduce((s, k) => s + k.score, 0);
  return {
    strong,
    weak,
    emotional: t("gunaMilan.insight.emotional", { level: level(emotional) }),
    communication: t("gunaMilan.insight.communication", { level: level(comm) }),
    summary: t("gunaMilan.insight.summary", {
      first,
      second,
      total,
      full: strong.length ? t("gunaMilan.insight.fullIn", { list: strong.map((n) => tbName(t, n)).join(", ") }) : t("gunaMilan.insight.noFull"),
      zero: weak.length ? t("gunaMilan.insight.zeroIn", { list: weak.map((n) => tbName(t, n)).join(", ") }) : t("gunaMilan.insight.noZero"),
    }),
  };
};

const GunaMilanPanel = ({ people, onAddDetails }: { people: [MatchPersonInput, MatchPersonInput]; onAddDetails: () => void }) => {
  const { t } = useTranslation();
  const { g } = useGlossary();
  // Directional Kootas count the groom first: put the male partner first when the genders are male and female.
  const swap = people[0].gender === "Female" && people[1].gender === "Male";
  const ordered: [MatchPersonInput, MatchPersonInput] = swap ? [people[1], people[0]] : people;
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [res, setRes] = useState<MatchResult | null>(null);

  // Both birth times and places come from the main form. Without both, no request is made and no score is shown.
  const ready = people.every((p) => p.time && p.place);
  const started = useRef(false);
  const run = async () => {
    if (!ready) return;
    setState("loading");
    setError("");
    try {
      const out = await kundaliApi.match(toReq(ordered[0], ordered[0].time, ordered[0].place!), toReq(ordered[1], ordered[1].time, ordered[1].place!));
      setRes(out);
      setState("idle");
    } catch (e) {
      setRes(null);
      setError(tb(i18n.t.bind(i18n) as TFunction, glossName, (e as Error)?.message) || i18n.t("gunaMilan.unavailable"));
      setState("error");
    }
  };
  useEffect(() => {
    if (ready && !started.current) {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const box = "rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 sm:p-5";
  const insight = res ? interpret(t, res.ashtakoota.kootas, ordered[0].name, ordered[1].name) : null;

  return (
    <section className="mx-auto mb-10 max-w-[1100px] space-y-4 px-5 text-[#301607]" data-testid="guna-milan" aria-label={t("gunaMilan.ariaLabel")}>
      <div className={box + " border-[#C9873A]/50 bg-[#FFF7E6]"}>
        <h2 className="text-xl font-semibold text-[#592209] sm:text-2xl">
          <Trans i18nKey="gunaMilan.title" components={{ ashta: <TermInfo term="Ashtakoota">x</TermInfo> }} />
        </h2>
        <p className="mt-2 text-base leading-relaxed">
          <Trans
            i18nKey="gunaMilan.intro"
            components={{ gm: <TermInfo term="Guna Milan">x</TermInfo>, moon: <TermInfo term="Chandra Rashi">x</TermInfo>, nak: <TermInfo term="Nakshatra">x</TermInfo> }}
          />
        </p>
        {!ready && (
          <div className="mt-3 space-y-2" data-testid="guna-needs-details">
            <p className="rounded-lg border border-[#C9873A]/50 bg-[#FBF5EC] p-3 text-base">
              <Trans i18nKey="gunaMilan.needsDetails" components={{ lagna: <TermInfo term="Lagna">x</TermInfo> }} />
            </p>
            <button type="button" onClick={onAddDetails} className="rounded-full bg-[#592209] px-6 py-2.5 text-base font-semibold text-[#F5E9D6]">{t("gunaMilan.addDetails")}</button>
          </div>
        )}
        {state === "loading" && <p className="mt-3 text-base" role="status">{t("gunaMilan.calculating")}</p>}
        {state === "error" && (
          <div role="alert" className="mt-3 rounded-lg border border-[#9B2C1D]/40 bg-[#9B2C1D]/10 p-3 text-[#7A2216]" data-testid="guna-unavailable">
            <p>{error}</p>
            <button type="button" onClick={run} className="mt-2 rounded-full border border-[#592209] px-4 py-1.5 text-sm font-semibold text-[#592209]">{t("gunaMilan.tryAgain")}</button>
          </div>
        )}
      </div>

      {res && insight && (
        <div className="space-y-4" data-testid="guna-result">
          <div className={box + " flex flex-col items-center gap-4 sm:flex-row"}>
            <ScoreRing total={res.ashtakoota.total} />
            <div>
              <p className="text-lg font-semibold text-[#592209]">{t("gunaMilan.totalLine", { total: res.ashtakoota.total, band: tb(t, g, res.ashtakoota.band) })}</p>
              <p className="mt-1 text-base leading-relaxed">{insight.summary}</p>
              <ExplainTerms terms={["Chandra Rashi", "Nakshatra", "Pada", "Guna Milan"]} label={t("gunaMilan.termsSummary")} />
              <p className="mt-1 text-sm text-[#6B4A37]">
                {t("gunaMilan.moonLine", { name: ordered[0].name, sign: g("rashi", res.ashtakoota.moons.a.sign), nakshatra: g("nakshatra", res.ashtakoota.moons.a.nakshatra), pada: res.ashtakoota.moons.a.pada })}{" "}
                {t("gunaMilan.moonLine", { name: ordered[1].name, sign: g("rashi", res.ashtakoota.moons.b.sign), nakshatra: g("nakshatra", res.ashtakoota.moons.b.nakshatra), pada: res.ashtakoota.moons.b.pada })}
              </p>
              <p className="mt-1 text-sm text-[#6B4A37]">{t("gunaMilan.convention")}</p>
            </div>
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">{t("gunaMilan.table.title")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-base" data-testid="guna-table">
                <thead className="text-sm text-[#6B4A37]">
                  <tr><th className="py-1 pr-3"><TermInfo term="Koota">Koota</TermInfo></th><th className="py-1 pr-3">{t("gunaMilan.table.score")}</th><th className="py-1 pr-3">{ordered[0].name}</th><th className="py-1 pr-3">{ordered[1].name}</th><th className="py-1">{t("gunaMilan.table.looksAt")}</th></tr>
                </thead>
                <tbody>
                  {res.ashtakoota.kootas.map((k) => (
                    <tr key={k.koota} className="border-t border-[#592209]/15 align-top">
                      <td className="py-1.5 pr-3 font-semibold"><TermInfo term={k.koota}>{tbName(t, k.koota)}</TermInfo></td>
                      <td className="py-1.5 pr-3">{k.score} / {k.max}</td>
                      <td className="py-1.5 pr-3">{tbCell(t, g, k.koota, k.a)}</td>
                      <td className="py-1.5 pr-3">{tbCell(t, g, k.koota, k.b)}</td>
                      <td className="py-1.5 text-[15px] text-[#4A2E1F]">{t("gunaMilan.table.measuresNote", { measures: helpOf(t, k.koota, "measures"), note: tb(t, g, k.note) })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">{t("gunaMilan.doshas.title")}</h3>
            <ul className="space-y-2">
              {res.ashtakoota.doshas.map((d) => (
                <li key={d.name}>
                  <strong><TermInfo term={d.name === "Nadi Dosha" ? "Nadi" : "Bhakoot"}>{tbName(t, d.name)}</TermInfo>{t("gunaMilan.doshas.statusLine", { status: d.present ? (d.cancelled ? t("gunaMilan.doshas.presentException") : t("gunaMilan.doshas.present")) : t("gunaMilan.doshas.notPresent") })}</strong> {tb(t, g, d.note)}
                </li>
              ))}
              <li>
                <strong><TermInfo term="Mangal Dosha">Mangal Dosha</TermInfo>.</strong> {t("gunaMilan.nameNote", { name: ordered[0].name, note: tb(t, g, res.mangal.a.note) })} {t("gunaMilan.nameNote", { name: ordered[1].name, note: tb(t, g, res.mangal.b.note) })} <em>{tb(t, g, res.mangal.verdict)}</em>
              </li>
            </ul>
            <ExplainTerms terms={["Lagna", "Dosha"]} />
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">{t("gunaMilan.plain.title")}</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-base leading-relaxed">
              <li><strong>{t("gunaMilan.plain.strengths")}</strong> {insight.strong.length ? t("gunaMilan.plain.strongList", { items: insight.strong.map((n) => t("gunaMilan.plain.strongItem", { name: tbName(t, n), measures: helpOf(t, n, "measures") })).join("; ") }) : t("gunaMilan.insight.noFull")}</li>
              <li><strong>{t("gunaMilan.plain.challenges")}</strong> {insight.weak.length ? t("gunaMilan.plain.weakList", { items: insight.weak.map((n) => t("gunaMilan.plain.weakItem", { name: tbName(t, n), low: helpOf(t, n, "low") })).join("; ") }) : t("gunaMilan.insight.noZero")}</li>
              <li>{insight.emotional}</li>
              <li>{insight.communication}</li>
              <li><strong>{t("gunaMilan.plain.practical")}</strong> {t("gunaMilan.plain.practicalBody")}</li>
            </ul>
          </div>

          <div className={box}>
            <h3 className="mb-3 text-lg font-semibold text-[#592209]"><Trans i18nKey="gunaMilan.charts.title" components={{ d1: <TermInfo term="D1 (Rashi chart)">x</TermInfo> }} /></h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div><p className="mb-1 text-center font-semibold">{ordered[0].name}</p><D1Chart k={res.a} /></div>
              <div><p className="mb-1 text-center font-semibold">{ordered[1].name}</p><D1Chart k={res.b} /></div>
            </div>
            <p className="mt-3 text-sm text-[#6B4A37]">
              <Trans i18nKey="gunaMilan.charts.legend" components={{ rashi: <TermInfo term="Rashi">x</TermInfo> }} />
            </p>
            <ExplainTerms terms={["Rahu", "Ketu"]} />
          </div>

          <details className={box} data-testid="guna-method">
            <summary className="cursor-pointer text-lg font-semibold text-[#592209]">{t("gunaMilan.method.title")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{res.ashtakoota.method.map((m) => <li key={m}>{tb(t, g, m)}</li>)}</ul>
            <ExplainTerms terms={findTerms(res.ashtakoota.method.join(" "))} label={t("gunaMilan.method.terms")} />
            <p className="mt-2 text-sm text-[#6B4A37]">{t("gunaMilan.method.disclaimer")}</p>
          </details>
        </div>
      )}
    </section>
  );
};

export default GunaMilanPanel;
