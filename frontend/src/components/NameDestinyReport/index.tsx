import { Download } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useGlossary } from "@/i18n/glossary";
import { intlTag } from "@/features/muhurat/format";
import { CHALDEAN_MAP, datesForNumber, numberInsight, planetForNumber, reduceNumber, type NameProfile } from "@/lib/numerology";
import { downloadBlueprintPDF } from "./lib/pdfExport";

const heading = { fontFamily: "'Astra','Cinzel',serif" } as const;

function formatDob(dob: string) {
  const [y, m, d] = dob.split("-");
  if (i18n.language && i18n.language !== "en") return new Intl.DateTimeFormat(intlTag(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

/** Collapsible, plain-language walk-through of how the name becomes the Naamank (Chaldean). Uses the real name and values. */
function NaamankExplainer({ profile }: { profile: NameProfile }) {
  const { t } = useTranslation();
  const w = profile.chaldean;
  const groups = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, letters: Object.entries(CHALDEAN_MAP).filter(([, v]) => v === n).map(([l]) => l) }));
  const used = new Set(w.letters.map((l) => l.ch));
  const chainSteps = w.chain.slice(0, -1).map((c, i) => `${String(c).split("").join(" + ")} = ${w.chain[i + 1]}`);
  return (
    <details className="glass-card mx-auto w-full max-w-3xl rounded-2xl p-5 sm:p-6" data-testid="nd-explainer">
      <summary className="cursor-pointer text-lg font-bold text-[#592209]" style={heading}>{t("namank.report.explainer.title")}</summary>
      <div className="mt-4 space-y-6 text-[15.5px] leading-relaxed text-[#301607]">
        <section>
          <h3 className="text-lg font-bold text-[#592209]">{t("namank.report.explainer.heading")}</h3>
          <p className="mt-1"><Trans i18nKey="namank.report.explainer.what" components={{ b: <strong />, i: <em /> }} /></p>
        </section>

        <section aria-label={t("namank.report.explainer.guideLabel")} data-testid="nd-letter-guide">
          <h3 className="font-bold text-[#592209]">{t("namank.report.explainer.guideHeading")}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {groups.map((g) => (
              <div key={g.n} className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-3 text-center">
                <p className="text-2xl font-extrabold text-[#592209]" style={heading}>{g.n}</p>
                <p className="mt-1 flex flex-wrap justify-center gap-1">
                  {g.letters.map((l) => <span key={l} className={`rounded px-1.5 py-0.5 text-sm font-semibold ${used.has(l) ? "bg-[#592209] text-[#F5E9D6]" : "bg-[#592209]/10 text-[#301607]"}`}>{l}</span>)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#6B4A37]">{t("namank.report.explainer.highlighted")}</p>
        </section>

        <section aria-label={t("namank.report.explainer.breakdownLabel")} data-testid="nd-breakdown">
          <h3 className="font-bold text-[#592209]">{t("namank.report.explainer.breakdownHeading")}</h3>
          <p className="text-sm text-[#4A2E1F]"><Trans i18nKey="namank.report.explainer.nameUsed" values={{ letters: profile.letters }} components={{ b: <strong /> }} /></p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {w.letters.map((l, i) => (
              <li key={i} className="flex w-12 flex-col items-center rounded-lg border border-[#592209]/30 bg-[#FBF5EC] py-1.5">
                <span className="text-lg font-bold text-[#301607]">{l.ch}</span>
                <span className="text-sm font-semibold text-[#592209]">{l.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section data-testid="nd-addition">
          <h3 className="font-bold text-[#592209]">{t("namank.report.explainer.additionHeading")}</h3>
          <p className="mt-1 break-words rounded-lg border border-[#592209]/15 bg-[#592209]/5 p-3 font-mono text-sm">{w.letters.map((l) => l.value).join(" + ")} = <strong>{w.total}</strong></p>
        </section>

        <section data-testid="nd-reduction">
          <h3 className="font-bold text-[#592209]">{t("namank.report.explainer.reductionHeading")}</h3>
          <p className="mt-1">{w.chain.length === 1 ? t("namank.report.explainer.alreadySingle", { total: w.total }) : t("namank.report.explainer.reduceAgain")}</p>
          {chainSteps.length > 0 && <ul className="mt-1 list-disc pl-5 font-mono text-sm">{chainSteps.map((c) => <li key={c}>{c}</li>)}</ul>}
          <p className="mt-2 rounded-xl border border-[#C9873A]/50 bg-[#FFF7E6] p-3"><Trans i18nKey="namank.report.explainer.yourNaamank" values={{ result: w.result }} components={{ b: <strong className="text-xl text-[#592209]" /> }} /></p>
        </section>
      </div>
    </details>
  );
}


type Core = { key: string; hindi: string; title: string; what: string; number: number };
type W = { letters: { ch: string; value: number }[]; total: number; chain: number[]; result: number };

const steps = (chain: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < chain.length - 1; i++) out.push(`${String(chain[i]).split("").join(" + ")} = ${chain[i + 1]}`);
  return out.length ? out.join(" → ") : i18n.t("namank.report.singleDigit");
};
const workingText = (w: W) => ({ values: w.letters.map((l) => `${l.ch}=${l.value}`).join("  "), sum: `${w.letters.map((l) => l.value).join(" + ")} = ${w.total}`, reduce: steps(w.chain) });

function Calc({ title, method, input, children }: { title: string; method: string; input: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-[#592209]/15 bg-[#592209]/5 p-4">
      <h4 className="font-semibold text-[#592209]">{title}</h4>
      <p className="text-xs text-[#6B4A37]">{t("namank.report.calc.method", { method })}</p>
      <p className="mt-1 text-sm text-[#301607]"><strong>{t("namank.report.calc.inputUsed")}</strong> {input}</p>
      <div className="mt-2 space-y-1 break-words font-mono text-xs leading-relaxed text-[#4A2E1F]" data-testid="nd-working">{children}</div>
    </div>
  );
}

export default function NameDestinyReport({ profile }: { profile: NameProfile }) {
  const { t } = useTranslation();
  const { g } = useGlossary();
  const planetName = (n: number) => g("planet", planetForNumber(n).planet);
  const planetNote = t("namank.report.calc.planetNote", { sun: g("planet", "Sun"), moon: g("planet", "Moon"), jupiter: g("planet", "Jupiter"), rahu: g("planet", "Rahu"), mercury: g("planet", "Mercury"), venus: g("planet", "Venus"), ketu: g("planet", "Ketu"), saturn: g("planet", "Saturn"), mars: g("planet", "Mars") });
  const dates = datesForNumber(profile.lifePath.result);
  const root = reduceNumber(profile.lifePath.result, false);
  const lp = profile.lifePath;

  const core: Core[] = [
    { key: "naamank", hindi: t("namank.report.core.naamank.native"), title: t("namank.report.core.naamank.title"), what: t("namank.report.core.naamank.what"), number: profile.chaldean.result },
    { key: "mulank", hindi: t("namank.report.core.mulank.native"), title: t("namank.report.core.mulank.title"), what: t("namank.report.core.mulank.what", { day: profile.birth.day }), number: profile.birth.result },
    { key: "bhagyank", hindi: t("namank.report.core.bhagyank.native"), title: t("namank.report.core.bhagyank.title"), what: t("namank.report.core.bhagyank.what"), number: lp.result },
  ];
  const more = [
    { title: t("namank.report.more.destiny.title"), what: t("namank.report.more.destiny.what"), n: profile.destiny.result },
    { title: t("namank.report.more.soulUrge.title"), what: t("namank.report.more.soulUrge.what"), n: profile.soulUrge.result },
    { title: t("namank.report.more.personality.title"), what: t("namank.report.more.personality.what"), n: profile.personality.result },
  ].filter((m) => m.n);
  const cw = workingText(profile.chaldean);
  const western: [string, W, string][] = [
    [t("namank.report.calc.destinyTitle"), profile.destiny, t("namank.report.calc.whatDestiny")],
    [t("namank.report.calc.soulUrgeTitle"), profile.soulUrge, t("namank.report.calc.whatSoulUrge")],
    [t("namank.report.calc.personalityTitle"), profile.personality, t("namank.report.calc.whatPersonality")],
  ];

  return (
    <div className="my-12 space-y-10" data-testid="nd-results">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#592209] mb-3">{t("namank.report.eyebrow")}</p>
        <h1 className="mb-1 text-3xl sm:text-5xl font-bold text-[#301607] break-words" style={heading}>{profile.name}</h1>
        <p className="text-[#4A2E1F]">{t("namank.report.born", { date: formatDob(profile.dob) })}</p>
      </header>

      <section aria-labelledby="nd-main-h" className="mx-auto w-full max-w-xl rounded-3xl bg-gradient-to-br from-[#592209] to-[#3b1706] p-6 text-center text-[#F5E9D6] shadow-lg sm:p-8" data-testid="nd-main">
        <h2 id="nd-main-h" className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E9B872]">{t("namank.report.main.heading")}</h2>
        <p className="mt-2 text-7xl font-extrabold leading-none sm:text-8xl" style={heading} data-testid="nd-main-number">{profile.chaldean.result}</p>
        <p className="mt-3 text-[15.5px] leading-relaxed">{numberInsight(profile.chaldean.result).strengths.join(" · ")}</p>
        <p className="mt-1 text-sm text-[#E9B872]">{t("namank.report.main.linked", { planet: planetName(profile.chaldean.result), symbol: planetForNumber(profile.chaldean.result).symbol })}</p>
      </section>

      <NaamankExplainer profile={profile} />

      <section aria-labelledby="nd-core-h" className="space-y-4" data-testid="nd-core">
        <h2 id="nd-core-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>{t("namank.report.core.heading")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => (
            <article key={c.key} data-testid="nd-number-card" aria-label={c.title} className="glass-card rounded-2xl p-5 text-center">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#592209]">{c.title} · {c.hindi}</h3>
              <p data-testid="nd-result" className="my-2 text-5xl font-extrabold leading-none text-[#301607]" style={heading}>{c.number}</p>
              <p className="text-sm text-[#4A2E1F]">{c.what}</p>
              <p className="mt-1 text-xs text-[#6B4A37]">{t("namank.report.core.planet", { planet: planetName(c.number), symbol: planetForNumber(c.number).symbol })}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="nd-mean-h" className="space-y-4" data-testid="nd-meanings">
        <h2 id="nd-mean-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>{t("namank.report.means.heading")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => { const i = numberInsight(c.number); return (
            <article key={c.key} className="glass-card rounded-2xl p-5" data-testid={`nd-meaning-${c.key}`}>
              <h3 className="font-bold text-[#592209]">{c.title} {c.number}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[#301607]">{i.meaning}</p>
              <p className="mt-2 text-sm"><strong className="text-[#592209]">{t("namank.report.means.strengths")}</strong> {i.strengths.join(", ")}</p>
              <p className="mt-1 text-sm"><strong className="text-[#592209]">{t("namank.report.means.challenge")}</strong> {i.shadow !== undefined ? t("namank.insight.shadowShort", { shadow: i.shadow }) : i.challenge}</p>
            </article>
          ); })}
        </div>
      </section>

      <section aria-labelledby="nd-tip-h" className="space-y-4" data-testid="nd-guidance">
        <h2 id="nd-tip-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>{t("namank.report.guidance.heading")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => (
            <article key={c.key} className="rounded-2xl border border-[#C9873A]/50 bg-[#FFF7E6] p-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#592209]">{t("namank.report.guidance.for", { title: c.title })}</h3>
              <p className="mt-1 text-[15.5px] leading-relaxed text-[#301607]">{numberInsight(c.number).tip}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="nd-more-h" className="space-y-3" data-testid="nd-western">
        <div className="text-center"><h2 id="nd-more-h" className="text-xl font-bold text-[#301607]" style={heading}>{t("namank.report.more.heading")}</h2><p className="text-sm text-[#4A2E1F]">{t("namank.report.more.sub")}</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          {more.map((m) => (
            <article key={m.title} className="flex items-center gap-3 rounded-2xl border border-[#592209]/25 bg-[#FBF5EC] p-4">
              <span className="text-4xl font-extrabold text-[#592209]" style={heading}>{m.n}</span>
              <div><h3 className="font-semibold text-[#301607]">{m.title}</h3><p className="text-sm text-[#4A2E1F]">{t("namank.report.more.line", { what: m.what, strength: numberInsight(m.n).strengths[0].toLowerCase() })}</p></div>
            </article>
          ))}
        </div>
      </section>

      <details className="glass-card rounded-2xl p-5 sm:p-6" data-testid="nd-calculations">
        <summary className="cursor-pointer text-xl font-bold text-[#592209]" style={heading}>{t("namank.report.calc.heading")}</summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-[#4A2E1F]">{t("namank.report.calc.intro", { note: planetNote })}</p>
          <Calc title={t("namank.report.calc.naamankTitle")} method={t("namank.report.calc.naamankMethod")} input={profile.letters}>
            <p>{t("namank.report.calc.letterValues", { value: cw.values })}</p><p>{t("namank.report.calc.addition", { value: cw.sum })}</p><p>{t("namank.report.calc.reduction", { value: cw.reduce })}</p><p>{t("namank.report.calc.result", { value: profile.chaldean.result })}</p>
          </Calc>
          <Calc title={t("namank.report.calc.mulankTitle")} method={t("namank.report.calc.mulankMethod")} input={t("namank.report.calc.birthDay", { day: profile.birth.day })}>
            <p>{t("namank.report.calc.reduction", { value: steps(profile.birth.chain) })}</p><p>{t("namank.report.calc.result", { value: profile.birth.result })}</p>
          </Calc>
          <Calc title={t("namank.report.calc.bhagyankTitle")} method={t("namank.report.calc.bhagyankMethod")} input={profile.dob}>
            <p>{t("namank.report.calc.digits", { digits: lp.digits.join(" + "), total: lp.total })}</p><p>{t("namank.report.calc.reduction", { value: steps(lp.chain) + (lp.result > 9 ? ` ${t("namank.report.calc.masterNote")}` : "") })}</p><p>{t("namank.report.calc.result", { value: lp.result })}</p>
          </Calc>
          {western.map(([title, w, what]) => {
            const wk = workingText(w);
            return (
              <Calc key={title} title={title} method={t("namank.report.calc.pythagorean", { what })} input={w.letters.map((l) => l.ch).join("") || t("namank.report.calc.none")}>
                {w.letters.length ? <><p>{t("namank.report.calc.letterValues", { value: wk.values })}</p><p>{t("namank.report.calc.addition", { value: wk.sum })}</p><p>{t("namank.report.calc.reduction", { value: wk.reduce })}</p><p>{t("namank.report.calc.result", { value: w.result })}</p></> : <p>{t("namank.report.calc.noLetters")}</p>}
              </Calc>
            );
          })}
          <p data-testid="nd-dates" className="text-sm text-[#4A2E1F]">
            <Trans i18nKey="namank.report.calc.dates" values={{ root, master: lp.result > 9 ? ` ${t("namank.report.calc.masterRoot", { n: lp.result })}` : "", dates: dates.join(", ") }} components={{ b: <strong className="text-[#301607]" /> }} />
          </p>
        </div>
      </details>

      <div className="flex justify-center">
        <button onClick={() => downloadBlueprintPDF(profile)}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#592209] transition-colors hover:bg-[#592209]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209]">
          <Download size={16} aria-hidden="true" /> {t("namank.report.download")}
        </button>
      </div>

      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-[#6B4A37]/80">
        {t("namank.report.disclaimer")}
      </p>
    </div>
  );
}
