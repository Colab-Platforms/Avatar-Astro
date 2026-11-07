import { useMemo, useState } from "react";
import { ChevronDown, Heart, Plus, Star, X } from "lucide-react";
import { birthNumberWorking, lifePathWorking, PLANET_BY_DIGIT, reduceNumber, themeFor } from "@/lib/numerology";
import NumberCard, { LABEL_STYLE, reducedText } from "./NumberCard";
import NumberPlate from "./NumberPlate";
import { digitsFor, parseRegistration, SCOPE_LABEL, type Scope } from "./registration";
import { FANCY_RULES, recommendWithInfo, SOURCE_LABEL } from "./recommend";
import { compatibility, evaluateDigits, explain, relationBetween, type Compatibility, type Evaluation } from "./vehicleNumerology";
import { useVehicleFavourites } from "./favourites";
import { VEHICLE_TYPE_LABEL, type VehicleProfileResult, type VehicleQuery } from "./types";

const heading = { fontFamily: "'Astra','Cinzel',Georgia,serif" } as const;
const FIRST = 5;
const MAX_COMPARE = 3;
const GRID = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

const SectionTitle = ({ id, children, sub }: { id: string; children: React.ReactNode; sub?: string }) => (
  <div className="mb-5 text-center">
    <h2 id={id} className="text-2xl font-bold text-[#301607] sm:text-3xl" style={heading}>{children}</h2>
    <span aria-hidden="true" className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-[#C9873A] to-transparent" />
    {sub && <p className="mx-auto mt-2 max-w-2xl text-sm italic text-[#6B4A37]">{sub}</p>}
  </div>
);

const Fact = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-[#592209]/12 bg-white/75 px-3 py-3.5 text-center shadow-sm">
    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">{label}</p>
    <p className="mt-1 text-lg font-bold leading-tight text-[#301607]">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-[#6B4A37]">{sub}</p>}
  </div>
);

const LabelChip = ({ compat }: { compat: Compatibility }) => (
  <span data-testid="compat-label" className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${LABEL_STYLE[compat.label]}`}>{compat.label}</span>
);

/** One registration, evaluated with the same rules as every other number on the page. */
export interface Entry {
  key: string;
  display: string;
  digits: string;
  note?: string;
  ev: Evaluation;
  compat: Compatibility;
}

export function entryFromRaw(raw: string, scope: Scope, person: { birth: number; lifePath: number }): Entry | { error: string } {
  const r = parseRegistration(raw);
  if (!r.ok) return { error: r.error };
  const { digits, note } = digitsFor(r.value, scope);
  const ev = evaluateDigits(digits);
  if (!ev) return { error: "That number has no digits to evaluate." };
  const padNote = r.value.padded ? `Shown as ${r.value.number}: registration numbers are printed with four digits.` : undefined;
  return { key: r.value.kind === "number" ? r.value.number : r.value.display, display: r.value.display, digits, note: [note, padNote].filter(Boolean).join(" ") || undefined, ev, compat: compatibility(ev, person) };
}

const working = (ev: Evaluation) => `${ev.digits.split("").join(" + ")} = ${ev.total}${ev.chain.length > 1 ? ` → ${ev.chain.slice(1).join(" → ")}` : ""}`;

/** Digits whose planet the person's planet regards as the same or as a natural friend. */
const friendlyDigits = (refNumber: number) => {
  const root = reduceNumber(refNumber, false);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => ["same", "friend"].includes(relationBetween(root, d).relation));
};

function ComparePanel({ entries, onRemove, onAdd }: { entries: Entry[]; onRemove: (k: string) => void; onAdd: (raw: string) => string | null }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const add = () => {
    const e = onAdd(text);
    setErr(e ?? "");
    if (!e) setText("");
  };
  return (
    <section data-testid="compare-panel" aria-labelledby="veh-cmp-h" className="rounded-[2rem] border border-[#C9873A]/50 bg-gradient-to-b from-[#FFF7E6] to-[#FBF5EC] p-5 sm:p-8">
      <SectionTitle id="veh-cmp-h" sub="Up to three numbers, side by side, all read with exactly the same rules.">Compare Numbers</SectionTitle>
      {entries.length < MAX_COMPARE && (
        <div className="mx-auto mb-5 flex max-w-md items-start gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="veh-cmp-add" className="sr-only">Add a number to compare</label>
            <input id="veh-cmp-add" value={text} maxLength={20} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add a number, e.g. 0786 or MH 12 AB 0007" className="w-full rounded-xl border border-[#592209]/25 bg-white/70 px-4 py-2.5 text-[15px] text-[#301607] outline-none focus:border-[#592209]" />
            {err && <p role="alert" className="mt-1 text-sm text-[#9B2C1D]">⚠ {err}</p>}
          </div>
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-xl bg-[#592209] px-4 py-2.5 text-sm font-bold text-[#F5E9D6]"><Plus size={14} aria-hidden="true" /> Add</button>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-center text-sm text-[#4A2E1F]">Add a number above, or press Compare on any suggested number.</p>
      ) : (
        <ul className={`grid grid-cols-1 gap-5 ${entries.length === 1 ? "" : entries.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {entries.map((e) => (
            <li key={e.key} data-testid="compare-column" className="flex flex-col gap-3 rounded-3xl border border-[#592209]/15 bg-[#FFFCF5] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <LabelChip compat={e.compat} />
                <button type="button" onClick={() => onRemove(e.key)} aria-label={`Remove ${e.display} from comparison`} className="rounded-full p-1 text-[#592209] hover:bg-[#592209]/10"><X size={16} aria-hidden="true" /></button>
              </div>
              <NumberPlate number={e.display} size="sm" />
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A5A1E]">Digits evaluated</dt><dd className="font-semibold text-[#301607]">{e.digits}</dd></div>
                <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A5A1E]">Digit sum</dt><dd className="font-semibold text-[#301607]">{e.ev.total}</dd></div>
                <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A5A1E]">Numerology number</dt><dd className="font-semibold text-[#301607]">{reducedText(e.ev)}</dd></div>
                <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A5A1E]">Planet</dt><dd className="font-semibold text-[#301607]">{e.ev.symbol} {e.ev.planet}</dd></div>
              </dl>
              <p className="text-sm text-[#301607]"><span className="font-semibold text-[#592209]">{e.ev.theme.keywords}.</span> {e.ev.theme.text}</p>
              <ul className="space-y-1 text-[13.5px] leading-snug text-[#4A2E1F]">{explain(e.ev, e.compat).map((l) => <li key={l}>{l}</li>)}</ul>
              {e.note && <p className="text-xs text-[#6B4A37]">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function VehicleResults({ profile, query }: { profile: VehicleProfileResult; query: VehicleQuery }) {
  const fav = useVehicleFavourites();
  const [more, setMore] = useState(false);
  const bw = useMemo(() => birthNumberWorking(query.dateOfBirth), [query.dateOfBirth]);
  const lw = useMemo(() => lifePathWorking(query.dateOfBirth), [query.dateOfBirth]);
  const person = useMemo(() => ({ birth: bw.result, lifePath: lw.result }), [bw.result, lw.result]);
  const { nakshatra, moonRashi, tithi, paksha, masa, vara, vikramSamvat } = profile.panchang;

  const info = useMemo(() => recommendWithInfo({ person, dob: query.dateOfBirth, preferred: query.preferred || undefined, range: query.range ?? undefined, limit: 8 }), [person, query.dateOfBirth, query.preferred, query.range]);
  const recs = info.items;
  const existing = useMemo(() => (query.mode === "check" ? entryFromRaw(query.existing, query.scope, person) : null), [query, person]);

  const initial = useMemo(() => {
    const out: Entry[] = [];
    for (const raw of query.compare) { const e = entryFromRaw(raw, query.scope, person); if (!("error" in e) && !out.some((x) => x.key === e.key)) out.push(e); }
    return out.slice(0, MAX_COMPARE);
  }, [query.compare, query.scope, person]);
  const [compare, setCompare] = useState<Entry[]>(initial);

  const addByRaw = (raw: string): string | null => {
    const e = entryFromRaw(raw, query.scope, person);
    if ("error" in e) return e.error;
    if (compare.some((x) => x.key === e.key)) return "That number is already in the comparison.";
    if (compare.length >= MAX_COMPARE) return "You can compare up to three numbers.";
    setCompare((c) => [...c, e]);
    return null;
  };
  const toggleCompare = (n: string) => {
    if (compare.some((x) => x.key === n)) setCompare((c) => c.filter((x) => x.key !== n));
    else addByRaw(n);
  };
  const removeCompare = (k: string) => setCompare((c) => c.filter((x) => x.key !== k));

  const shown = more ? recs : recs.slice(0, FIRST);
  const cardFor = (c: (typeof recs)[number]) => (
    <NumberCard
      key={c.number}
      number={c.number}
      evaluation={c.evaluation}
      compat={c.compat}
      tag={c.source === "everyday" ? undefined : SOURCE_LABEL[c.source]}
      everyday
      saved={fav.isSaved(c.number)}
      onToggleSave={fav.toggle}
      inCompare={compare.some((x) => x.key === c.number)}
      compareFull={compare.length >= MAX_COMPARE}
      onToggleCompare={toggleCompare}
    />
  );

  const savedEntries = fav.saved.map((n) => entryFromRaw(n, "number", person)).filter((e): e is Entry => !("error" in e));
  const first = query.name.trim().split(/\s+/)[0];
  const birthTheme = themeFor(person.birth);
  const lifeTheme = themeFor(person.lifePath);
  const birthRoot = reduceNumber(person.birth, false);
  const lifeRoot = reduceNumber(person.lifePath, false);
  const nodeNote = [birthRoot, lifeRoot].some((r) => r === 4 || r === 7);

  return (
    <div data-testid="vehicle-results" className="space-y-12">
      {/* A. Your birth profile */}
      <section aria-labelledby="veh-birth-h" className="rounded-[2rem] border border-[#C9873A]/45 bg-gradient-to-b from-[#FFF7E6] to-[#FBF5EC] p-5 shadow-[0_18px_44px_-30px_rgba(89,34,9,0.5)] sm:p-8">
        <SectionTitle id="veh-birth-h" sub={`${first ? `${first}, born` : "Born"} ${profile.birth.dateOfBirth} at ${profile.birth.timeOfBirth} in ${profile.birth.place}`}>Your Birth Profile</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Fact label="Janma Nakshatra" value={nakshatra.name} sub={`Lord: ${nakshatra.lord}`} />
          <Fact label="Nakshatra Pada" value={`Pada ${nakshatra.pada}`} />
          <Fact label="Chandra Rashi" value={moonRashi} />
          <Fact label="Tithi" value={tithi.name} sub={`${paksha === "shukla" ? "Shukla" : "Krishna"} Paksha`} />
          <Fact label="Hindu Month" value={`${masa.adhika ? "Adhika " : ""}${masa.name}`} sub={`Vikram Samvat ${vikramSamvat}`} />
          <Fact label="Vedic Weekday" value={vara.name} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div data-testid="birth-number" className="rounded-2xl border border-[#592209]/12 bg-white/75 p-4 text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">Birth Number</p>
            <p className="text-3xl font-bold text-[#301607]" style={heading}>{person.birth}</p>
            <p className="text-xs text-[#6B4A37]">Day of birth {bw.day}{bw.chain.length > 1 ? ` → ${bw.chain.slice(1).join(" → ")}` : ""} · {PLANET_BY_DIGIT[birthRoot].symbol} {PLANET_BY_DIGIT[birthRoot].planet}</p>
          </div>
          <div data-testid="life-path" className="rounded-2xl border border-[#592209]/12 bg-white/75 p-4 text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">Life Path Number</p>
            <p className="text-3xl font-bold text-[#301607]" style={heading}>{person.lifePath}</p>
            <p className="text-xs text-[#6B4A37]">{lw.digits.join(" + ")} = {lw.total}{lw.chain.length > 1 ? ` → ${lw.chain.slice(1).join(" → ")}` : ""} · {PLANET_BY_DIGIT[lifeRoot].symbol} {PLANET_BY_DIGIT[lifeRoot].planet}</p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm leading-relaxed text-[#4A2E1F]">
          Your Nakshatra, Pada, Rashi, Tithi, month and weekday are calculated from your exact date, time and birthplace ({profile.method}). Your Birth Number and Life Path come from your date of birth. The Panchang details describe you; they are not part of the number calculation, because no verified traditional rule links a Nakshatra to registration digits.
        </p>
        {query.vehicleType && <p className="mt-1 text-center text-xs text-[#6B4A37]">Vehicle type: {VEHICLE_TYPE_LABEL[query.vehicleType]}</p>}
      </section>

      {/* B. Your vehicle number profile */}
      <section aria-labelledby="veh-method-h" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#6B2A0C] via-[#4A1B07] to-[#2A1205] px-5 py-9 text-[#F5E9D6] shadow-[0_24px_50px_-28px_rgba(48,22,7,0.9)] sm:px-10">
        <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-[#C9873A]/25">
          <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="relative">
          <h2 id="veh-method-h" className="text-center text-2xl font-bold text-[#FFF4DA] sm:text-3xl" style={heading}>Your Vehicle Number Profile</h2>
          <p className="mx-auto mt-1 max-w-2xl text-center text-sm text-[#F5E9D6]/85">How a vehicle number is read, and the two numbers of yours it is read against.</p>

          <ol className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[["Digits", "The evaluated digits, leading zeros kept"], ["Total", "Add the digits"], ["Reduce", "Add again to one digit (11, 22, 33 stay)"], ["Planet", "Each digit has its planet"]].map(([t, d], i) => (
              <li key={t} className="rounded-2xl bg-white/10 px-3 py-3">
                <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9873A] text-sm font-bold text-[#301607]">{i + 1}</span>
                <p className="font-semibold text-[#F7DC8A]">{t}</p>
                <p className="text-xs leading-snug text-[#F5E9D6]/85">{d}</p>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {[["Birth Number", person.birth, birthTheme, birthRoot], ["Life Path", person.lifePath, lifeTheme, lifeRoot]].map(([label, n, theme, root]) => (
              <div key={label as string} className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F7DC8A]">{label as string} {n as number} · {PLANET_BY_DIGIT[root as number].symbol} {PLANET_BY_DIGIT[root as number].planet}</p>
                <p className="mt-1 text-sm font-semibold">{(theme as { keywords: string }).keywords}</p>
                <p className="mt-1 text-sm leading-snug text-[#F5E9D6]/90">{(theme as { text: string }).text}</p>
                <p className="mt-2 text-xs text-[#F7DC8A]">Numbers friendly to it: {friendlyDigits(n as number).join(", ")}</p>
              </div>
            ))}
          </div>

          <p data-testid="method-summary" className="mx-auto mt-6 max-w-4xl text-center text-sm leading-relaxed text-[#F5E9D6]/90">
            <strong>Numerology method, not a Panchang calculation.</strong> A number's digits are added and reduced to one number, which maps to a planet by the common Indian numerology table (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars). That planet is compared with the planets of your Birth Number and your Life Path using natural planetary friendship from Brihat Parashara Hora Shastra. The scoring (the same number +2, a natural friend +1, neutral 0, not a natural friend −1) and the labels (3 or 4 Strong, 2 Good, 0 or 1 Neutral, below 0 Less aligned) are MyBhagya's own way of summarising that comparison, not a classical rule. No percentages are used.
            {nodeNote && " Rahu (4) and Ketu (7) are not in that text, so they are read by a common convention, like Saturn and Mars."}
          </p>
          <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-[#F5E9D6]/75">Evaluating: {SCOPE_LABEL[query.scope].toLowerCase()}. This is traditional numerology, not a guarantee of any outcome.</p>
        </div>
      </section>

      {/* D. Check an existing vehicle number */}
      {query.mode === "check" && existing && !("error" in existing) && (
        <section data-testid="existing-check" aria-labelledby="veh-existing-h" className="rounded-[2rem] border border-[#C9873A]/60 bg-gradient-to-b from-[#FFF3D6] to-[#FBF5EC] p-5 shadow-[0_18px_44px_-30px_rgba(89,34,9,0.5)] sm:p-8">
          <SectionTitle id="veh-existing-h">Your Existing Vehicle Number</SectionTitle>
          <NumberPlate number={existing.display} size="lg" />
          <div className="mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            <Fact label="Digits evaluated" value={existing.digits} />
            <Fact label="Digit sum" value={String(existing.ev.total)} sub={working(existing.ev)} />
            <Fact label="Numerology number" value={reducedText(existing.ev)} sub={existing.ev.master ? "A master number" : undefined} />
            <Fact label="Planet" value={`${existing.ev.symbol} ${existing.ev.planet}`} />
          </div>
          {existing.note && <p className="mt-3 text-center text-xs text-[#6B4A37]">{existing.note}</p>}
          <div className="mx-auto mt-5 max-w-4xl space-y-3 rounded-2xl bg-white/70 p-5">
            <div className="flex flex-wrap items-center gap-2"><LabelChip compat={existing.compat} /><span className="text-sm font-semibold text-[#592209]">{existing.ev.theme.keywords}</span></div>
            <p className="text-[15px] leading-snug text-[#301607]">{existing.ev.theme.text}</p>
            <ul className="space-y-1.5 text-[14.5px] leading-snug text-[#301607]">{explain(existing.ev, existing.compat).map((l) => <li key={l}>{l}</li>)}</ul>
            <p data-testid="existing-meaning" className="text-[14.5px] leading-relaxed text-[#4A2E1F]">
              {existing.compat.label === "Strong match" || existing.compat.label === "Good match"
                ? "Under this method, your number sits comfortably with your Birth Number and Life Path."
                : existing.compat.label === "Neutral match"
                  ? "Under this method, your number is neither especially close to nor far from your Birth Number and Life Path."
                  : `Under this method this number scores below neutral, because ${existing.compat.lines.filter((l) => l.relation === "enemy").map((l) => `your ${l.ref} ${l.refNumber} (${l.refPlanet}) does not regard ${existing.ev.planet} as a natural friend`).join(" and ")}. That is one traditional reading of two numbers. It says nothing about the vehicle itself, and nothing here suggests you should change your number.`}{" "}
              This is traditional numerology, not a guarantee of any outcome.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggleCompare(existing.key)} className="rounded-full border border-[#592209]/30 px-4 py-1.5 text-sm font-semibold text-[#592209] hover:bg-[#592209]/10">{compare.some((x) => x.key === existing.key) ? "Remove from comparison" : "Compare with other numbers"}</button>
            </div>
          </div>
        </section>
      )}

      {/* Comparison first when that is what the user came to do */}
      {query.mode === "compare" && <ComparePanel entries={compare} onRemove={removeCompare} onAdd={addByRaw} />}

      {/* C. Your recommended vehicle numbers */}
      <section aria-labelledby="veh-rec-h">
        <SectionTitle id="veh-rec-h" sub={query.mode === "find" ? "Everyday four-digit numbers, best matches first, each worked out with the same rule used to check an existing number." : "Other everyday numbers you could explore, worked out with the same rule."}>
          <span className="inline-flex items-center gap-2"><Star size={22} aria-hidden="true" className="text-[#C9873A]" fill="currentColor" /> Your Recommended Vehicle Numbers</span>
        </SectionTitle>
        {info.rangeFallback && <p data-testid="range-note" className="mx-auto mb-4 max-w-2xl rounded-xl bg-[#FFF1CC]/70 p-3 text-center text-sm text-[#4A2E1F]">There are no everyday numbers in your preferred range, so we looked across all four-digit numbers instead.</p>}
        {info.preferredFancy.length > 0 && <p data-testid="preferred-note" className="mx-auto mb-4 max-w-2xl rounded-xl bg-[#FFF1CC]/70 p-3 text-center text-sm text-[#4A2E1F]">Your preferred number {query.preferred} is a special-pattern number ({info.preferredFancy.join(", ").toLowerCase()}). Numbers like this are often premium, so we do not recommend them, but you can still read it with “Check my existing vehicle number” or add it to Compare.</p>}
        {recs.length === 0 ? (
          <p data-testid="rec-none" className="mx-auto max-w-xl rounded-2xl border border-[#592209]/20 bg-white/70 p-4 text-center text-sm text-[#4A2E1F]">We could not find a number to suggest for this profile.</p>
        ) : (
          <>
            <ul data-testid="rec-list" className={GRID}>{shown.map(cardFor)}</ul>
            <details data-testid="left-out" className="mx-auto mt-5 max-w-2xl rounded-xl border border-[#592209]/15 bg-white/50 p-3 text-sm text-[#4A2E1F]">
              <summary className="cursor-pointer text-center font-semibold text-[#592209]">Which numbers are left out, and why?</summary>
              <p className="mt-2">We suggest everyday numbers. These patterns are often sold as premium or fancy numbers, so we leave them out of the suggestions. You can still check any of them yourself.</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">{FANCY_RULES.map((r) => <li key={r.id}><span className="font-semibold">{r.label}</span>, {r.description}</li>)}</ul>
              <p className="mt-2 text-xs text-[#6B4A37]">A number that simply contains a repeated digit, such as 2655 or 3118, is not left out.</p>
            </details>
            {recs.length > FIRST && (
              <div className="mt-6 text-center">
                <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 bg-white/60 px-7 py-2.5 text-sm font-bold uppercase tracking-wide text-[#592209] transition-colors hover:bg-[#592209] hover:text-[#F5E9D6]">
                  {more ? "Show Fewer Numbers" : `View More Numbers (${recs.length - FIRST})`}
                  <ChevronDown size={16} aria-hidden="true" className={more ? "rotate-180" : ""} />
                </button>
              </div>
            )}
          </>
        )}
        <p data-testid="availability-note" className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-[#6B4A37]">
          These are numerology-based suggestions. Actual registration-number availability and allocation depend on your RTO.
        </p>
      </section>

      {query.mode !== "compare" && compare.length > 0 && <ComparePanel entries={compare} onRemove={removeCompare} onAdd={addByRaw} />}

      {/* Saved numbers */}
      {savedEntries.length > 0 && (
        <section data-testid="saved-numbers" aria-labelledby="veh-saved-h" className="rounded-3xl border border-[#C9873A]/50 bg-[#FFF7E6] p-5">
          <h2 id="veh-saved-h" className="mb-3 flex items-center justify-center gap-2 text-xl font-bold text-[#301607]"><Heart size={20} aria-hidden="true" fill="currentColor" /> Your Saved Numbers</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedEntries.map((e) => (
              <li key={e.key} className="flex flex-col items-center gap-2 rounded-2xl border border-[#592209]/15 bg-white/70 p-3">
                <NumberPlate number={e.display} size="sm" />
                <LabelChip compat={e.compat} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggleCompare(e.key)} disabled={!compare.some((x) => x.key === e.key) && compare.length >= MAX_COMPARE} aria-label={`Compare saved number ${e.display}`} className="rounded-full border border-[#592209]/30 px-3 py-1 text-xs font-semibold text-[#592209] hover:bg-[#592209]/10 disabled:opacity-50">{compare.some((x) => x.key === e.key) ? "In comparison" : "Compare"}</button>
                  <button type="button" onClick={() => fav.toggle(e.key)} aria-label={`Remove ${e.display} from saved numbers`} className="rounded-full border border-[#592209]/30 px-3 py-1 text-xs font-semibold text-[#592209] hover:bg-[#592209]/10">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-[#6B4A37]">Saved in this browser only. They are not attached to your MyBhagya account.</p>
        </section>
      )}

      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-[#6B4A37]">
        Numerology is a traditional belief system and is not scientifically proven. A traditional reading of a number does not promise good or bad fortune for you or your vehicle, and it should never be a reason to worry about the number you have.
      </p>
    </div>
  );
}
