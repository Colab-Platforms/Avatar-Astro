import { useEffect, useRef, useState } from "react";
import type { PlaceResult } from "@/features/ratna/types";
import TermInfo, { ExplainTerms } from "@/components/astrology/TermInfo";
import { findTerms } from "@/lib/astroGlossary";
import { kundaliApi } from "./api";
import { D1Chart } from "./BirthChartDiagram";
import type { KootaScore, MatchResult } from "./types";

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

const pad = (v: string) => String(v).padStart(2, "0");
const toReq = (p: MatchPersonInput, time: string, place: PlaceResult) => ({
  dateOfBirth: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
  timeOfBirth: time,
  timeUnknown: false,
  place: { name: place.name, admin1: place.admin1, country: place.country, latitude: place.latitude, longitude: place.longitude, timezone: place.timezone },
});

const ScoreRing = ({ total }: { total: number }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 130 130" className="h-40 w-40 shrink-0" role="img" aria-label={`${total} out of 36 Guna points`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#592209" strokeOpacity="0.15" strokeWidth="10" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="#592209" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(total / 36) * c} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="#301607">{total}</text>
      <text x="65" y="86" textAnchor="middle" fontSize="12" fill="#6B4A37">out of 36</text>
    </svg>
  );
};

const interpret = (ks: KootaScore[], first: string, second: string) => {
  const get = (n: string) => ks.find((k) => k.koota === n)!;
  const strong = ks.filter((k) => k.score === k.max).map((k) => k.koota);
  const weak = ks.filter((k) => k.score === 0).map((k) => k.koota);
  const f = (n: string) => get(n).score / get(n).max;
  const emotional = (f("Bhakoot") + f("Graha Maitri") + f("Gana")) / 3;
  const comm = (f("Graha Maitri") + f("Vashya")) / 2;
  const level = (x: number) => (x >= 0.75 ? "strong" : x >= 0.4 ? "moderate" : "weaker");
  const total = ks.reduce((s, k) => s + k.score, 0);
  return {
    strong,
    weak,
    emotional: `Emotional compatibility (Bhakoot, Graha Maitri and Gana together) scores ${level(emotional)} in this calculation.`,
    communication: `Communication and understanding (Graha Maitri and Vashya) score ${level(comm)}.`,
    summary: `${first} and ${second} score ${total} of 36. ${strong.length ? `Full marks came in ${strong.join(", ")}.` : "No Koota scored full marks."} ${weak.length ? `Zero marks came in ${weak.join(", ")}.` : "No Koota scored zero."}`,
  };
};

const GunaMilanPanel = ({ people, onAddDetails }: { people: [MatchPersonInput, MatchPersonInput]; onAddDetails: () => void }) => {
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
      setError((e as Error)?.message || "Guna Milan is unavailable right now. No score was calculated.");
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
  const insight = res ? interpret(res.ashtakoota.kootas, ordered[0].name, ordered[1].name) : null;

  return (
    <section className="mx-auto mb-10 max-w-[1100px] space-y-4 px-5 text-[#301607]" data-testid="guna-milan" aria-label="Guna Milan">
      <div className={box + " border-[#C9873A]/50 bg-[#FFF7E6]"}>
        <h2 className="text-xl font-semibold text-[#592209] sm:text-2xl">
          Vedic Guna Milan (<TermInfo term="Ashtakoota">Ashtakoota</TermInfo>)
        </h2>
        <p className="mt-2 text-base leading-relaxed">
          The comparison above is by Sun sign only. Traditional Indian matching, called <TermInfo term="Guna Milan">Guna Milan</TermInfo>, scores eight factors out of 36 from each
          person's <TermInfo term="Chandra Rashi">Moon sign</TermInfo> and <TermInfo term="Nakshatra">Nakshatra</TermInfo>. The Moon moves to a new Nakshatra about every day, so this needs each
          person's exact birth time and place, which you enter with each person above. Without them no score is shown.
        </p>
        {!ready && (
          <div className="mt-3 space-y-2" data-testid="guna-needs-details">
            <p className="rounded-lg border border-[#C9873A]/50 bg-[#FBF5EC] p-3 text-base">
              No Guna score was calculated because the birth time and birth place of both people were not entered. They are required: the Moon moves to a new Nakshatra about every day, and the place sets the time zone and the <TermInfo term="Lagna">Lagna</TermInfo>.
            </p>
            <button type="button" onClick={onAddDetails} className="rounded-full bg-[#592209] px-6 py-2.5 text-base font-semibold text-[#F5E9D6]">Add birth time and place</button>
          </div>
        )}
        {state === "loading" && <p className="mt-3 text-base" role="status">Calculating the Moon positions and Guna scores…</p>}
        {state === "error" && (
          <div role="alert" className="mt-3 rounded-lg border border-[#9B2C1D]/40 bg-[#9B2C1D]/10 p-3 text-[#7A2216]" data-testid="guna-unavailable">
            <p>{error}</p>
            <button type="button" onClick={run} className="mt-2 rounded-full border border-[#592209] px-4 py-1.5 text-sm font-semibold text-[#592209]">Try again</button>
          </div>
        )}
      </div>

      {res && insight && (
        <div className="space-y-4" data-testid="guna-result">
          <div className={box + " flex flex-col items-center gap-4 sm:flex-row"}>
            <ScoreRing total={res.ashtakoota.total} />
            <div>
              <p className="text-lg font-semibold text-[#592209]">{res.ashtakoota.total} / 36 Guna: {res.ashtakoota.band}</p>
              <p className="mt-1 text-base leading-relaxed">{insight.summary}</p>
              <ExplainTerms terms={["Chandra Rashi", "Nakshatra", "Pada", "Guna Milan"]} label="Terms in this summary" />
              <p className="mt-1 text-sm text-[#6B4A37]">
                {ordered[0].name}: Moon in {res.ashtakoota.moons.a.sign}, {res.ashtakoota.moons.a.nakshatra} pada {res.ashtakoota.moons.a.pada}.{" "}
                {ordered[1].name}: Moon in {res.ashtakoota.moons.b.sign}, {res.ashtakoota.moons.b.nakshatra} pada {res.ashtakoota.moons.b.pada}.
              </p>
              <p className="mt-1 text-sm text-[#6B4A37]">Many families use 18 as a minimum, but that is a convention. A score describes tendencies in tradition and does not decide a relationship.</p>
            </div>
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">The eight Kootas</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-base" data-testid="guna-table">
                <thead className="text-sm text-[#6B4A37]">
                  <tr><th className="py-1 pr-3"><TermInfo term="Koota">Koota</TermInfo></th><th className="py-1 pr-3">Score</th><th className="py-1 pr-3">{ordered[0].name}</th><th className="py-1 pr-3">{ordered[1].name}</th><th className="py-1">What it looks at</th></tr>
                </thead>
                <tbody>
                  {res.ashtakoota.kootas.map((k) => (
                    <tr key={k.koota} className="border-t border-[#592209]/15 align-top">
                      <td className="py-1.5 pr-3 font-semibold"><TermInfo term={k.koota}>{k.koota}</TermInfo></td>
                      <td className="py-1.5 pr-3">{k.score} / {k.max}</td>
                      <td className="py-1.5 pr-3">{k.a}</td>
                      <td className="py-1.5 pr-3">{k.b}</td>
                      <td className="py-1.5 text-[15px] text-[#4A2E1F]">{KOOTA_HELP[k.koota]?.measures}. {k.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">Doshas in this match</h3>
            <ul className="space-y-2">
              {res.ashtakoota.doshas.map((d) => (
                <li key={d.name}>
                  <strong><TermInfo term={d.name === "Nadi Dosha" ? "Nadi" : "Bhakoot"}>{d.name}</TermInfo>: {d.present ? (d.cancelled ? "present, with a classical exception" : "present") : "not present"}.</strong> {d.note}
                </li>
              ))}
              <li>
                <strong><TermInfo term="Mangal Dosha">Mangal Dosha</TermInfo>.</strong> {ordered[0].name}: {res.mangal.a.note} {ordered[1].name}: {res.mangal.b.note} <em>{res.mangal.verdict}</em>
              </li>
            </ul>
            <ExplainTerms terms={["Lagna", "Dosha"]} />
          </div>

          <div className={box}>
            <h3 className="mb-2 text-lg font-semibold text-[#592209]">What this suggests, in plain words</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-base leading-relaxed">
              <li><strong>Strengths:</strong> {insight.strong.length ? insight.strong.map((n) => `${n} (${KOOTA_HELP[n].measures})`).join("; ") + " scored full marks." : "No Koota scored full marks."}</li>
              <li><strong>Challenges:</strong> {insight.weak.length ? insight.weak.map((n) => `${n} scored zero (${KOOTA_HELP[n].low})`).join("; ") + "." : "No Koota scored zero."}</li>
              <li>{insight.emotional}</li>
              <li>{insight.communication}</li>
              <li><strong>Practical guidance:</strong> treat the score as a prompt for honest conversation about temperament, family and health expectations, and consult a family astrologer for Dosha exceptions.</li>
            </ul>
          </div>

          <div className={box}>
            <h3 className="mb-3 text-lg font-semibold text-[#592209]">Both birth charts (<TermInfo term="D1 (Rashi chart)">Rashi chart, D1</TermInfo>)</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div><p className="mb-1 text-center font-semibold">{ordered[0].name}</p><D1Chart k={res.a} /></div>
              <div><p className="mb-1 text-center font-semibold">{ordered[1].name}</p><D1Chart k={res.b} /></div>
            </div>
            <p className="mt-3 text-sm text-[#6B4A37]">
              Surya = Sun, Chandra = Moon, Mangal = Mars, Budh = Mercury, Guru = Jupiter, Shukra = Venus, Shani = Saturn. The big number in each corner of a house is its <TermInfo term="Rashi">Rashi</TermInfo> number (1 = Mesha ... 12 = Meena).
            </p>
            <ExplainTerms terms={["Rahu", "Ketu"]} />
          </div>

          <details className={box} data-testid="guna-method">
            <summary className="cursor-pointer text-lg font-semibold text-[#592209]">How this was calculated</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{res.ashtakoota.method.map((m) => <li key={m}>{m}</li>)}</ul>
            <ExplainTerms terms={findTerms(res.ashtakoota.method.join(" "))} label="Terms explained" />
            <p className="mt-2 text-sm text-[#6B4A37]">Disclaimer: Guna Milan is a traditional practice and is not scientific evidence about a relationship. A birth-time error of a few minutes can change the Moon's Nakshatra pada.</p>
          </details>
        </div>
      )}
    </section>
  );
};

export default GunaMilanPanel;
