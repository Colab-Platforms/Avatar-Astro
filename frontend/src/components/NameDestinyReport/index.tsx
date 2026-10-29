import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { buildProfile, datesForNumber, planetForNumber, reduceNumber, themeFor, type NameProfile } from "@/lib/numerology";
import { downloadBlueprintPDF, numberRows } from "./lib/pdfExport";

const heading = { fontFamily: "'Astra','Cinzel',serif" } as const;

function formatDob(dob: string) {
  const [y, m, d] = dob.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function NumberCard({ row, defaultOpen }: { row: ReturnType<typeof numberRows>[number]; defaultOpen?: boolean }) {
  const planet = planetForNumber(row.result);
  const theme = themeFor(row.result);
  return (
    <article data-testid="nd-number-card" className="glass-card rounded-2xl p-6 flex flex-col" aria-label={row.title}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#592209] mb-1">{row.title}</h3>
      <p className="text-xs text-[#6B4A37] mb-4">{row.basis}</p>
      {row.empty ? (
        <p className="text-sm text-[#4A2E1F]">{row.empty}</p>
      ) : (
        <>
          <div className="flex items-end gap-3 mb-4">
            <span data-testid="nd-result" className="text-5xl font-extrabold text-[#301607] leading-none" style={heading}>
              {row.result}
            </span>
            <span className="mb-1 rounded-full border border-[#592209]/40 bg-[#592209]/10 px-3 py-1 text-xs text-[#592209]">
              Traditional planet: {planet.planet} {planet.symbol}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#4A2E1F] mb-1">{theme.keywords}</p>
          <p className="text-sm leading-relaxed text-[#4A2E1F] mb-4">{theme.text}</p>
          <details open={defaultOpen} className="mt-auto text-sm">
            <summary className="cursor-pointer text-[#592209] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209]">Show the calculation</summary>
            <p data-testid="nd-working" className="mt-2 break-words rounded-lg border border-[#592209]/15 bg-[#592209]/5 p-3 font-mono text-xs leading-relaxed text-[#4A2E1F]">
              {row.working}
            </p>
          </details>
        </>
      )}
    </article>
  );
}

function SpellingLab({ profile }: { profile: NameProfile }) {
  const [alt, setAlt] = useState("");
  const altProfile = useMemo(() => (alt.trim() ? buildProfile(alt, profile.dob) : null), [alt, profile.dob]);
  const valid = altProfile && !("error" in altProfile) ? altProfile : null;
  const error = altProfile && "error" in altProfile ? altProfile.error : "";

  const rows: [string, number, number | undefined][] = [
    ["Destiny", profile.destiny.result, valid?.destiny.result],
    ["Soul Urge", profile.soulUrge.result, valid?.soulUrge.result],
    ["Personality", profile.personality.result, valid?.personality.result],
    ["Chaldean", profile.chaldean.result, valid?.chaldean.result],
  ];

  return (
    <section aria-labelledby="nd-lab-h" className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 id="nd-lab-h" className="text-xl sm:text-2xl text-[#592209] mb-2" style={heading}>Try a Different Spelling</h2>
      <p className="text-sm text-[#6B4A37] mb-5">
        Type another spelling or form of your name to see how the name-based numbers change. Your Life Path and Birth Number come from your date of birth, so spelling does not affect them.
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
        A changed number only shows that the arithmetic changed. This tool does not rate one spelling as better than another, and no spelling is proven to change a person's life.
      </p>
    </section>
  );
}

export default function NameDestinyReport({ profile }: { profile: NameProfile }) {
  const rows = useMemo(() => numberRows(profile), [profile]);
  const dates = datesForNumber(profile.lifePath.result);
  const root = reduceNumber(profile.lifePath.result, false);

  return (
    <div className="my-12 space-y-10" data-testid="nd-results">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#592209] mb-3">Your Cosmic Blueprint</p>
        <h1 className="mb-3 text-3xl sm:text-5xl font-bold text-[#301607] break-words" style={heading}>{profile.name}</h1>
        <p className="text-[#4A2E1F]">
          Born {formatDob(profile.dob)} · {profile.zodiac} Sun (Western, by date)
        </p>
      </header>

      <div className="mx-auto max-w-3xl rounded-2xl border border-[#592209]/35 bg-[#592209]/5 p-5 text-sm leading-relaxed text-[#4A2E1F]">
        <strong className="text-[#592209]">How this was made.</strong> Each number is simple arithmetic on the letters of your name or the digits of your birth date, and the working is shown for every one. The descriptions are fixed traditional meanings written for each number. No AI, score or prediction is involved.
      </div>

      <section aria-label="Your numbers" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, i) => (
          <NumberCard key={r.title} row={r} defaultOpen={i === 0} />
        ))}
      </section>

      <section className="glass-card rounded-2xl p-6 sm:p-8" aria-labelledby="nd-dates-h">
        <h2 id="nd-dates-h" className="text-xl sm:text-2xl text-[#592209] mb-2" style={heading}>Dates That Match Your Life Path</h2>
        <p data-testid="nd-dates" className="text-[#4A2E1F]">
          Days of the month whose digits reduce to {root}{profile.lifePath.result > 9 ? ` (the root of your master Life Path ${profile.lifePath.result})` : ""}: <strong className="text-[#301607]">{dates.join(", ")}</strong>.
        </p>
        <p className="mt-2 text-xs text-[#6B4A37]">In numerology these are the dates said to resonate with your Life Path number. It is a traditional association, not a forecast of lucky days.</p>
      </section>

      <SpellingLab profile={profile} />

      <div className="flex justify-center">
        <button
          onClick={() => downloadBlueprintPDF(profile)}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#592209] transition-colors hover:bg-[#592209]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#592209]"
        >
          <Download size={16} aria-hidden="true" /> Download as PDF
        </button>
      </div>

      <p className="mx-auto max-w-2xl text-center text-sm italic leading-relaxed text-[#6B4A37]">
        This reading is for personal interest and reflection. Numerology is a traditional belief system that is not scientifically proven, and the result is not a prediction or professional advice.
      </p>
    </div>
  );
}
