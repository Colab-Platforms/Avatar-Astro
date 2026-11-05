import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { buildProfile, CHALDEAN_MAP, datesForNumber, numberInsight, planetForNumber, reduceNumber, type NameProfile } from "@/lib/numerology";
import { downloadBlueprintPDF } from "./lib/pdfExport";

const heading = { fontFamily: "'Astra','Cinzel',serif" } as const;

function formatDob(dob: string) {
  const [y, m, d] = dob.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function SpellingLab({ profile }: { profile: NameProfile }) {
  const [alt, setAlt] = useState("");
  const altProfile = useMemo(() => (alt.trim() ? buildProfile(alt, profile.dob) : null), [alt, profile.dob]);
  const valid = altProfile && !("error" in altProfile) ? altProfile : null;
  const error = altProfile && "error" in altProfile ? altProfile.error : "";

  const rows: [string, number, number | undefined][] = [
    ["Destiny (Pythagorean)", profile.destiny.result, valid?.destiny.result],
    ["Soul Urge", profile.soulUrge.result, valid?.soulUrge.result],
    ["Personality", profile.personality.result, valid?.personality.result],
    ["Naamank (Chaldean)", profile.chaldean.result, valid?.chaldean.result],
  ];

  return (
    <section aria-labelledby="nd-lab-h" className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 id="nd-lab-h" className="text-xl sm:text-2xl text-[#592209] mb-2" style={heading}>Try Another Name Spelling</h2>
      <p className="text-sm text-[#6B4A37] mb-5">
        Try another spelling of your name to see what changes. Only the numbers made from your name (Naamank, Destiny, Soul Urge, Personality) can change. Mulank and Bhagyank come from your date of birth, so a new spelling never changes them.
      </p>
      <label htmlFor="nd-alt" className="mb-2 block text-sm font-semibold text-[#592209]">Alternative spelling</label>
      <input
        id="nd-alt"
        value={alt}
        maxLength={60}
        onChange={(e) => setAlt(e.target.value)}
        placeholder={profile.name}
        className="mb-4 w-full rounded-xl border border-[#592209]/15 bg-[#592209]/5 px-4 py-3 text-base text-[#301607] placeholder:text-white/30 focus:border-[#592209] focus:outline-none"
      />
      {error && <p role="alert" className="mb-4 text-sm text-red-300">⚠ {error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[#592209]/15">
        <table data-testid="nd-lab-table" className="w-full min-w-[300px] text-center text-sm">
          <thead>
            <tr className="bg-[#592209]/10 text-[#592209]">
              <th scope="col" className="px-3 py-2 text-left font-semibold">Number</th>
              <th scope="col" className="px-3 py-2 font-semibold">{profile.name}</th>
              <th scope="col" className="px-3 py-2 font-semibold">{valid ? valid.name : "Alternative"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cur, other]) => (
              <tr key={label} className="odd:bg-[#592209]/5">
                <td className="px-3 py-2 text-left text-[#4A2E1F]">{label}</td>
                <td className="px-3 py-2 text-[#301607]">{cur || "–"}</td>
                <td className={`px-3 py-2 ${other !== undefined && other !== cur ? "font-bold text-[#592209]" : "text-[#4A2E1F]"}`}>{other === undefined ? "–" : other || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[#6B4A37]">
        A changed number only shows that the arithmetic changed. This Seva does not rate one spelling as better than another, and no spelling is proven to change a person's life.
      </p>
    </section>
  );
}

/** Collapsible, plain-language walk-through of how the name becomes the Naamank (Chaldean). Uses the real name and values. */
function NaamankExplainer({ profile }: { profile: NameProfile }) {
  const w = profile.chaldean;
  const groups = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, letters: Object.entries(CHALDEAN_MAP).filter(([, v]) => v === n).map(([l]) => l) }));
  const used = new Set(w.letters.map((l) => l.ch));
  const chainSteps = w.chain.slice(0, -1).map((c, i) => `${String(c).split("").join(" + ")} = ${w.chain[i + 1]}`);
  return (
    <details className="glass-card mx-auto w-full max-w-3xl rounded-2xl p-5 sm:p-6" data-testid="nd-explainer">
      <summary className="cursor-pointer text-lg font-bold text-[#592209]" style={heading}>How is this calculated?</summary>
      <div className="mt-4 space-y-6 text-[15.5px] leading-relaxed text-[#301607]">
        <section>
          <h3 className="text-lg font-bold text-[#592209]">How Is Your Naamank Calculated?</h3>
          <p className="mt-1"><strong>What is Chaldean numerology?</strong> It is an old system in which every letter is given a traditional number from 1 to 8 (there is no 9 on letters). Your name is turned into one number by adding the values of its letters. These are traditional Chaldean assignments, <em>not</em> the ordinary position of a letter in the English alphabet (for example, S is 3 here, not 19, and H is 5, not 8).</p>
        </section>

        <section aria-label="Chaldean letter guide" data-testid="nd-letter-guide">
          <h3 className="font-bold text-[#592209]">Chaldean Letter Guide</h3>
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
          <p className="mt-1 text-xs text-[#6B4A37]">Letters that appear in your name are highlighted.</p>
        </section>

        <section aria-label="Your name breakdown" data-testid="nd-breakdown">
          <h3 className="font-bold text-[#592209]">Your Name Breakdown</h3>
          <p className="text-sm text-[#4A2E1F]">Name used: <strong>{profile.letters}</strong></p>
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
          <h3 className="font-bold text-[#592209]">Step-by-Step Addition</h3>
          <p className="mt-1 break-words rounded-lg border border-[#592209]/15 bg-[#592209]/5 p-3 font-mono text-sm">{w.letters.map((l) => l.value).join(" + ")} = <strong>{w.total}</strong></p>
        </section>

        <section data-testid="nd-reduction">
          <h3 className="font-bold text-[#592209]">Final Reduction</h3>
          <p className="mt-1">{w.chain.length === 1 ? `${w.total} is already a single digit, so no reduction is needed.` : "A Naamank is a single digit, so the digits of the total are added again until one digit is left:"}</p>
          {chainSteps.length > 0 && <ul className="mt-1 list-disc pl-5 font-mono text-sm">{chainSteps.map((c) => <li key={c}>{c}</li>)}</ul>}
          <p className="mt-2 rounded-xl border border-[#C9873A]/50 bg-[#FFF7E6] p-3">Your Naamank is <strong className="text-xl text-[#592209]">{w.result}</strong>.</p>
        </section>
      </div>
    </details>
  );
}


const PLANET_NOTE = "In Indian numerology each number from 1 to 9 is linked with one of the nine grahas (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars). This is a traditional association, not a calculation.";

type Core = { key: string; hindi: string; title: string; what: string; number: number };
type W = { letters: { ch: string; value: number }[]; total: number; chain: number[]; result: number };

const steps = (chain: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < chain.length - 1; i++) out.push(`${String(chain[i]).split("").join(" + ")} = ${chain[i + 1]}`);
  return out.length ? out.join(" → ") : "Already a single digit";
};
const workingText = (w: W) => ({ values: w.letters.map((l) => `${l.ch}=${l.value}`).join("  "), sum: `${w.letters.map((l) => l.value).join(" + ")} = ${w.total}`, reduce: steps(w.chain) });

function Calc({ title, method, input, children }: { title: string; method: string; input: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#592209]/15 bg-[#592209]/5 p-4">
      <h4 className="font-semibold text-[#592209]">{title}</h4>
      <p className="text-xs text-[#6B4A37]">Method: {method}</p>
      <p className="mt-1 text-sm text-[#301607]"><strong>Input used:</strong> {input}</p>
      <div className="mt-2 space-y-1 break-words font-mono text-xs leading-relaxed text-[#4A2E1F]" data-testid="nd-working">{children}</div>
    </div>
  );
}

export default function NameDestinyReport({ profile }: { profile: NameProfile }) {
  const dates = datesForNumber(profile.lifePath.result);
  const root = reduceNumber(profile.lifePath.result, false);
  const lp = profile.lifePath;

  const core: Core[] = [
    { key: "naamank", hindi: "नामांक", title: "Naamank", what: "From the letters of your name (Chaldean method).", number: profile.chaldean.result },
    { key: "mulank", hindi: "मूलांक", title: "Mulank", what: `From your birth day (${profile.birth.day}).`, number: profile.birth.result },
    { key: "bhagyank", hindi: "भाग्यांक", title: "Bhagyank", what: "From your full date of birth.", number: lp.result },
  ];
  const more = [
    { title: "Destiny (Expression)", what: "Your talents and how you express them. From every letter of your name.", n: profile.destiny.result },
    { title: "Soul Urge", what: "What you want deep inside. From the vowels of your name.", n: profile.soulUrge.result },
    { title: "Personality", what: "How others tend to see you. From the consonants of your name.", n: profile.personality.result },
  ].filter((m) => m.n);
  const cw = workingText(profile.chaldean);
  const western: [string, W, string][] = [
    ["Destiny (Expression)", profile.destiny, "every letter"],
    ["Soul Urge", profile.soulUrge, "the vowels A E I O U"],
    ["Personality", profile.personality, "the consonants (Y counts as a consonant)"],
  ];

  return (
    <div className="my-12 space-y-10" data-testid="nd-results">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#592209] mb-3">Your Namank Jyotish</p>
        <h1 className="mb-1 text-3xl sm:text-5xl font-bold text-[#301607] break-words" style={heading}>{profile.name}</h1>
        <p className="text-[#4A2E1F]">Born {formatDob(profile.dob)}</p>
      </header>

      <section aria-labelledby="nd-main-h" className="mx-auto w-full max-w-xl rounded-3xl bg-gradient-to-br from-[#592209] to-[#3b1706] p-6 text-center text-[#F5E9D6] shadow-lg sm:p-8" data-testid="nd-main">
        <h2 id="nd-main-h" className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E9B872]">Your Name Number (Naamank)</h2>
        <p className="mt-2 text-7xl font-extrabold leading-none sm:text-8xl" style={heading} data-testid="nd-main-number">{profile.chaldean.result}</p>
        <p className="mt-3 text-[15.5px] leading-relaxed">{numberInsight(profile.chaldean.result).strengths.join(" · ")}</p>
        <p className="mt-1 text-sm text-[#E9B872]">Linked with {planetForNumber(profile.chaldean.result).planet} {planetForNumber(profile.chaldean.result).symbol} · Chaldean method</p>
      </section>

      <NaamankExplainer profile={profile} />

      <section aria-labelledby="nd-core-h" className="space-y-4" data-testid="nd-core">
        <h2 id="nd-core-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>Your Three Core Numbers</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => (
            <article key={c.key} data-testid="nd-number-card" aria-label={c.title} className="glass-card rounded-2xl p-5 text-center">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#592209]">{c.title} · {c.hindi}</h3>
              <p data-testid="nd-result" className="my-2 text-5xl font-extrabold leading-none text-[#301607]" style={heading}>{c.number}</p>
              <p className="text-sm text-[#4A2E1F]">{c.what}</p>
              <p className="mt-1 text-xs text-[#6B4A37]">Planet: {planetForNumber(c.number).planet} {planetForNumber(c.number).symbol}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="nd-mean-h" className="space-y-4" data-testid="nd-meanings">
        <h2 id="nd-mean-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>What Your Numbers Mean</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => { const i = numberInsight(c.number); return (
            <article key={c.key} className="glass-card rounded-2xl p-5" data-testid={`nd-meaning-${c.key}`}>
              <h3 className="font-bold text-[#592209]">{c.title} {c.number}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[#301607]">{i.meaning}</p>
              <p className="mt-2 text-sm"><strong className="text-[#592209]">Strengths:</strong> {i.strengths.join(", ")}</p>
              <p className="mt-1 text-sm"><strong className="text-[#592209]">Challenge:</strong> {i.challenge.replace(/^The shadow side is /, "")}</p>
            </article>
          ); })}
        </div>
      </section>

      <section aria-labelledby="nd-tip-h" className="space-y-4" data-testid="nd-guidance">
        <h2 id="nd-tip-h" className="text-center text-2xl font-bold text-[#301607]" style={heading}>Your Practical Guidance</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {core.map((c) => (
            <article key={c.key} className="rounded-2xl border border-[#C9873A]/50 bg-[#FFF7E6] p-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#592209]">For your {c.title}</h3>
              <p className="mt-1 text-[15.5px] leading-relaxed text-[#301607]">{numberInsight(c.number).tip}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="nd-more-h" className="space-y-3" data-testid="nd-western">
        <div className="text-center"><h2 id="nd-more-h" className="text-xl font-bold text-[#301607]" style={heading}>More Name Insights</h2><p className="text-sm text-[#4A2E1F]">Western (Pythagorean) method, shown separately so the two systems are not mixed.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          {more.map((m) => (
            <article key={m.title} className="flex items-center gap-3 rounded-2xl border border-[#592209]/25 bg-[#FBF5EC] p-4">
              <span className="text-4xl font-extrabold text-[#592209]" style={heading}>{m.n}</span>
              <div><h3 className="font-semibold text-[#301607]">{m.title}</h3><p className="text-sm text-[#4A2E1F]">{m.what} Often linked with {numberInsight(m.n).strengths[0].toLowerCase()}.</p></div>
            </article>
          ))}
        </div>
      </section>

      <details className="glass-card rounded-2xl p-5 sm:p-6" data-testid="nd-calculations">
        <summary className="cursor-pointer text-xl font-bold text-[#592209]" style={heading}>Show Calculations</summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-[#4A2E1F]">{PLANET_NOTE} Each number is plain arithmetic: take each letter's value, add them, then add the digits of the total until one digit is left. Nothing here is generated text.</p>
          <Calc title="Naamank (Name Number)" method="Chaldean (letters A to Z valued 1 to 8)" input={profile.letters}>
            <p>Letter values: {cw.values}</p><p>Addition: {cw.sum}</p><p>Reduction: {cw.reduce}</p><p>Result: {profile.chaldean.result}</p>
          </Calc>
          <Calc title="Mulank (Birth Number)" method="Day of the month" input={`Birth day ${profile.birth.day}`}>
            <p>Reduction: {steps(profile.birth.chain)}</p><p>Result: {profile.birth.result}</p>
          </Calc>
          <Calc title="Bhagyank (Life Path)" method="All digits of the date of birth" input={profile.dob}>
            <p>Digits: {lp.digits.join(" + ")} = {lp.total}</p><p>Reduction: {steps(lp.chain)}{lp.result > 9 ? " (11, 22 and 33 are kept as master numbers)" : ""}</p><p>Result: {lp.result}</p>
          </Calc>
          {western.map(([t, w, what]) => {
            const wk = workingText(w);
            return (
              <Calc key={t} title={`${t} Number`} method={`Pythagorean (A=1 to I=9, then repeating), ${what}`} input={w.letters.map((l) => l.ch).join("") || "none"}>
                {w.letters.length ? <><p>Letter values: {wk.values}</p><p>Addition: {wk.sum}</p><p>Reduction: {wk.reduce}</p><p>Result: {w.result}</p></> : <p>This name has no such letters.</p>}
              </Calc>
            );
          })}
          <p data-testid="nd-dates" className="text-sm text-[#4A2E1F]">
            Dates whose digits reduce to {root}{lp.result > 9 ? ` (the root of master Bhagyank ${lp.result})` : ""}: <strong className="text-[#301607]">{dates.join(", ")}</strong>. A traditional association, not a forecast of lucky days.
          </p>
        </div>
      </details>

      <SpellingLab profile={profile} />

      <div className="flex justify-center">
        <button onClick={() => downloadBlueprintPDF(profile)}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#592209] transition-colors hover:bg-[#592209]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209]">
          <Download size={16} aria-hidden="true" /> Download as PDF
        </button>
      </div>

      <p className="mx-auto max-w-2xl text-center text-sm italic leading-relaxed text-[#6B4A37]">
        This reading is for personal interest and reflection. Numerology is a traditional belief system that is not scientifically proven, and the result is not a prediction or professional advice.
      </p>
    </div>
  );
}
