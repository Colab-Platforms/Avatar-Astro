import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowDown, ChevronDown, Sparkles, Star, Volume2 } from "lucide-react";
import { chaldeanWorking, checkName, destinyWorking, type NameProfile, type Working } from "@/lib/numerology";
import { comparePronunciation, pronunciationOf } from "@/lib/namePronunciation";
import { recommendSpellings, type SpellingSuggestion } from "@/lib/nameSpelling";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { changeText, pronunciationText, reasonText } from "../lib/engineText";

const INITIAL = 3;
const heading = { fontFamily: "'Astra','Cinzel',serif" } as const;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Label = ({ children }: { children: string }) => <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">{children}</p>;

const Sum = ({ w, label }: { w: Working; label: string }) => (
  <p className="text-sm">
    <span className="font-semibold">{label}: </span>
    {w.letters.map((l, i) => <span key={i}>{i ? " + " : ""}{l.ch.toUpperCase()}{l.value}</span>)} = {w.total}
    {w.chain.length > 1 && <> → {w.chain.slice(1).join(" → ")}</>}
  </p>
);

const Working_ = ({ names }: { names: string[] }) => {
  const { t } = useTranslation();
  return (
  <details className="mt-3 rounded-xl border border-[#592209]/15 bg-white/60 p-2.5">
    <summary className="cursor-pointer text-sm font-semibold text-[#592209]">{t("namank.spell.showCalc")}</summary>
    <div className="mt-2 space-y-3">
      {names.map((n, i) => {
        const c = checkName(n);
        if (!c.ok) return null;
        return (
          <div key={n}>
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B4A37]">{t("namank.spell.label", { label: i === 0 ? t("namank.spell.yourSpelling") : t("namank.spell.recommendedShort"), name: n })}</p>
            <Sum w={chaldeanWorking(c.letters)} label={t("namank.spell.chaldean")} />
            <Sum w={destinyWorking(c.letters)} label={t("namank.spell.destinyPyth")} />
          </div>
        );
      })}
    </div>
  </details>
  );
};

function Card({ s, rank, original, delay }: { s: SpellingSuggestion; rank: number; original: string; delay: number }) {
  const { t } = useTranslation();
  const tts = useTextToSpeech();
  const p = pronunciationOf(s.spelling);
  const cmp = comparePronunciation(original, s.spelling);
  const best = rank === 1;
  return (
    <motion.li
      data-testid="recommendation"
      initial={reducedMotion() ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`relative flex flex-col overflow-hidden rounded-3xl border bg-gradient-to-b from-[#FFF9EC] to-[#F8EBD3] p-5 shadow-[0_14px_34px_-20px_rgba(89,34,9,0.55)] ${best ? "border-[#C9873A]" : "border-[#592209]/20"}`}
    >
      <Star aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 text-[#C9873A]/15" />
      <div className="mb-3 flex items-center gap-3">
        <span aria-label={t("namank.spell.recommendation", { rank })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#592209] text-base font-bold text-[#F7DC8A] ring-2 ring-[#C9873A]/60">{rank}</span>
        {best && <span className="rounded-full bg-[#C9873A] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#301607]">{t("namank.spell.bestMatch")}</span>}
        {!best && s.reasons.length === 0 && <span className="rounded-full bg-[#592209]/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#592209]">{t("namank.spell.closest")}</span>}
      </div>

      <Label>{t("namank.spell.recommended")}</Label>
      <p className="text-center text-sm text-[#6B4A37]">{original}</p>
      <ArrowDown size={16} aria-label={t("namank.spell.changesTo")} role="img" className="mx-auto my-0.5 text-[#C9873A]" />
      <p data-testid="recommendation-name" className="mb-3 break-words text-center text-3xl font-bold leading-tight text-[#301607]" style={heading}>{s.spelling}</p>

      <div className="mb-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-[#592209] p-2.5 text-[#F5E9D6]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#F7DC8A]">{t("namank.spell.nameNumber")}</p>
          <p data-testid="recommendation-number" className="text-4xl font-extrabold leading-none" style={heading}>{s.numbers.chaldean}</p>
          <p className="mt-0.5 text-[11px] opacity-80">{t("namank.spell.chaldeanNaamank")}</p>
        </div>
        <div className="rounded-2xl border border-[#592209]/20 bg-white/70 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A5A1E]">{t("namank.spell.destiny")}</p>
          <p className="text-4xl font-extrabold leading-none text-[#301607]" style={heading}>{s.numbers.destiny}</p>
          <p className="mt-0.5 text-[11px] text-[#6B4A37]">{t("namank.spell.pythagorean")}</p>
        </div>
      </div>

      <div className="space-y-3 text-[15px] leading-snug text-[#301607]">
        <div data-testid="recommendation-pronunciation">
          <Label>{t("namank.spell.pronunciation")}</Label>
          <p className="font-semibold">{p.respelling}</p>
          <Label>{t("namank.spell.syllables")}</Label>
          <p>{p.breakdown}</p>
          <p className="mt-1 text-sm text-[#4A2E1F]">{pronunciationText(cmp.text)}</p>
          {tts.supported && (
            <button type="button" onClick={() => (tts.speaking ? tts.stop() : tts.speak(s.spelling, "en-IN"))} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#592209]/30 px-3 py-1 text-sm font-semibold text-[#592209] hover:bg-[#592209]/10">
              <Volume2 size={14} aria-hidden="true" /> {tts.speaking ? t("namank.spell.stop") : t("namank.spell.listen")}
            </button>
          )}
        </div>

        <div>
          <Label>{t("namank.spell.why")}</Label>
          {s.reasons.length > 0 ? (
            <ul className="list-disc pl-5">{s.reasons.map((r) => <li key={r}>{reasonText(r)}</li>)}</ul>
          ) : (
            <p>{t("namank.spell.noReach")}</p>
          )}
        </div>

        <div>
          <Label>{t("namank.spell.whatChanged")}</Label>
          <p data-testid="recommendation-change" className="font-semibold text-[#592209]">{changeText(s.change.summary)}</p>
        </div>
      </div>

      <Working_ names={[original, s.spelling]} />
    </motion.li>
  );
}

/**
 * Spelling recommendations for the name the person already entered. Nothing here is typed in or fixed: recommendSpellings()
 * generates readable variations and runs each through the same calculators as the report.
 */
export default function RecommendedSpellings({ profile }: { profile: NameProfile }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const rec = useMemo(() => recommendSpellings(profile.name, profile.birth.result, profile.lifePath.result), [profile.name, profile.birth.result, profile.lifePath.result]);
  const shown = all ? rec.items : rec.items.slice(0, INITIAL);

  return (
    <section data-testid="recommendations" aria-labelledby="rec-h" className="relative mx-auto my-10 max-w-5xl overflow-hidden rounded-[2rem] border border-[#C9873A]/50 bg-gradient-to-b from-[#FFF7E6] to-[#FBF5EC] px-4 py-8 sm:px-8">
      <Sparkles aria-hidden="true" className="pointer-events-none absolute left-4 top-4 h-6 w-6 text-[#C9873A]/40" />
      <Sparkles aria-hidden="true" className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 text-[#C9873A]/30" />
      <h2 id="rec-h" className="text-center text-2xl font-bold text-[#301607] sm:text-3xl" style={heading}>{t("namank.spell.heading")}</h2>
      <p className="mx-auto mt-1 max-w-xl text-center text-base italic text-[#6B4A37]">{t("namank.spell.sub")}</p>

      <p data-testid="recommendation-intro" className="mx-auto mt-4 max-w-2xl text-center text-sm text-[#4A2E1F]">
        {rec.items.length === 0
          ? t("namank.spell.introNone", { name: profile.name })
          : rec.anyMatch
            ? t("namank.spell.introMatch", { name: profile.name, birth: profile.birth.result, lifePath: profile.lifePath.result }) + (rec.currentFits ? ` ${t("namank.spell.currentFits")}` : "")
            : t("namank.spell.introNoMatch", { name: profile.name, birth: rec.birth, lifePath: rec.lifePath })}
      </p>

      {rec.items.length > 0 && (
        <>
          <ol className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((s, i) => <Card key={s.spelling} s={s} rank={i + 1} original={profile.name} delay={reducedMotion() ? 0 : (i % INITIAL) * 0.08} />)}
          </ol>

          {rec.items.length > INITIAL && (
            <div className="mt-6 text-center">
              <button
                type="button"
                aria-expanded={all}
                onClick={() => setAll((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#592209] hover:bg-[#592209]/10"
              >
                {all ? t("namank.spell.showFewer") : t("namank.spell.viewMore", { count: rec.items.length - INITIAL })}
                <ChevronDown size={16} aria-hidden="true" className={all ? "rotate-180" : ""} />
              </button>
            </div>
          )}

          <details className="mx-auto mt-5 max-w-2xl text-sm text-[#4A2E1F]">
            <summary className="cursor-pointer text-center font-semibold text-[#592209]">{t("namank.spell.howChosen")}</summary>
            <p className="mt-2">
              {t("namank.spell.howChosenText")}
            </p>
          </details>
        </>
      )}

      <p className="mx-auto mt-5 max-w-2xl text-center text-xs italic leading-relaxed text-[#6B4A37]">
        {t("namank.spell.disclaimer")}
      </p>
    </section>
  );
}
