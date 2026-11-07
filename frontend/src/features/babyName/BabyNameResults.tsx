import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Heart, Moon, Search, Sparkles, Star } from "lucide-react";
import { BABY_NAMES, type BabyName } from "./names";
import { filterKind, modernPicks, possibleSyllables, preferredNameFit, searchNames, suggestionsFor, KIND_LABEL, MIN_NAMES, type KindFilter } from "./matchNames";
import { useFavourites } from "./favourites";
import NameCard from "./NameCard";
import type { BabyNameResult, NamePreference } from "./types";
import type { Syllable } from "./syllables";

const heading = { fontFamily: "'Astra','Cinzel',serif" } as const;
const FIRST = 10;
const STEP = 12;

const STYLE_FILTERS: KindFilter[] = ["all", "modern", "traditional", "spiritual", "short", "unique", "nature", "mythology"];
const GENDER_FILTERS: { value: NamePreference; label: string }[] = [
  { value: "all", label: "All" },
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "neutral", label: "Gender-neutral" },
];

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3";

const Fact = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-[#592209]/12 bg-white/75 px-3 py-3.5 text-center shadow-sm">
    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A5A1E]">{label}</p>
    <p className="mt-1 text-lg font-bold leading-tight text-[#301607]">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-[#6B4A37]">{sub}</p>}
  </div>
);

const SectionTitle = ({ id, children, sub }: { id: string; children: React.ReactNode; sub?: string }) => (
  <div className="mb-5 text-center">
    <h2 id={id} className="text-2xl font-bold text-[#301607] sm:text-3xl" style={heading}>{children}</h2>
    <span aria-hidden="true" className="mx-auto mt-2 block h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-[#C9873A] to-transparent" />
    {sub && <p className="mx-auto mt-2 max-w-xl text-sm italic text-[#6B4A37]">{sub}</p>}
  </div>
);

/** A run of cards: the first ten, then "View More Names" reveals the rest in steps. */
function Group({ title, note, names, syllable, fav, first = FIRST }: { title?: string; note?: string; names: BabyName[]; syllable: Syllable; fav: ReturnType<typeof useFavourites>; first?: number }) {
  const [shown, setShown] = useState(first);
  return (
    <div className="mt-8 first:mt-6">
      {title && <h3 className="text-lg font-semibold text-[#592209]">{title}</h3>}
      {note && <p className="mb-1 text-sm text-[#4A2E1F]">{note}</p>}
      <ul className={`${GRID} mt-3`}>
        {names.slice(0, shown).map((n) => <NameCard key={n.name} n={n} syllable={syllable} saved={fav.isSaved(n.name)} onToggle={fav.toggle} />)}
      </ul>
      {names.length > shown && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + STEP)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#592209]/50 bg-white/60 px-7 py-2.5 text-sm font-bold uppercase tracking-wide text-[#592209] transition-colors hover:bg-[#592209] hover:text-[#F5E9D6]"
          >
            View More Names ({names.length - shown})
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function BabyNameResults({ result, preference, preferredName }: { result: BabyNameResult; preference: NamePreference; preferredName: string }) {
  const fav = useFavourites();
  const [gender, setGender] = useState<NamePreference>(preference);
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const { nakshatra, moonRashi, tithi, paksha, masa, vara, vikramSamvat } = result.panchang;
  const sg = useMemo(() => suggestionsFor(nakshatra.name, nakshatra.pada, gender), [nakshatra.name, nakshatra.pada, gender]);
  const picks = useMemo(() => (sg ? modernPicks(sg.primary, gender) : []), [sg, gender]);
  const refine = (names: BabyName[]) => searchNames(filterKind(names, kind), query);
  const possible = useMemo(() => possibleSyllables(result.window.padas), [result.window.padas]);
  const savedNames = BABY_NAMES.filter((n) => fav.saved.includes(n.name));

  if (!sg) {
    return (
      <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-[#9B2C1D]/30 p-5 text-center text-[#9B2C1D]">
        We could not match {nakshatra.name}, Pada {nakshatra.pada} to a naming syllable, so no names are shown. Please try again or ask your family priest.
      </section>
    );
  }

  const syl = sg.principal.syllable;
  const fit = preferredName ? preferredNameFit(preferredName, sg.principal) : null;
  const uncertain = result.nearPadaBoundary || result.timeApproximate;
  const primary = refine(sg.primary);
  const few = sg.primary.length < MIN_NAMES;
  const filtering = kind !== "all" || query.trim() !== "";

  return (
    <div data-testid="baby-results" className="space-y-12">
      {/* 1. The calculated birth details */}
      <section aria-labelledby="baby-birth-h" className="rounded-[2rem] border border-[#C9873A]/45 bg-gradient-to-b from-[#FFF7E6] to-[#FBF5EC] p-5 shadow-[0_18px_44px_-30px_rgba(89,34,9,0.5)] sm:p-8">
        <SectionTitle id="baby-birth-h" sub={`Born ${result.birth.dateOfBirth} at ${result.birth.timeOfBirth} in ${result.birth.place}`}>Your Baby&rsquo;s Birth Star</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Fact label="Janma Nakshatra" value={nakshatra.name} sub={`Lord: ${nakshatra.lord}`} />
          <Fact label="Nakshatra Pada" value={`Pada ${nakshatra.pada}`} />
          <Fact label="Chandra Rashi" value={moonRashi} />
          <Fact label="Tithi" value={tithi.name} sub={`${paksha === "shukla" ? "Shukla" : "Krishna"} Paksha`} />
          <Fact label="Hindu Month" value={`${masa.adhika ? "Adhika " : ""}${masa.name}`} sub={`Vikram Samvat ${vikramSamvat}`} />
          <Fact label="Vedic Weekday" value={vara.name} />
        </div>
        <p className="mt-4 text-center text-xs text-[#6B4A37]">Calculated from the exact date, time and birthplace. {result.method}.</p>
      </section>

      {/* 2. The naming syllable */}
      <section aria-labelledby="baby-syl-h" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#6B2A0C] via-[#4A1B07] to-[#2A1205] px-6 py-9 text-[#F5E9D6] shadow-[0_24px_50px_-28px_rgba(48,22,7,0.9)] sm:px-10">
        <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-[#C9873A]/25">
          <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <Sparkles aria-hidden="true" className="pointer-events-none absolute bottom-5 left-6 h-6 w-6 text-[#F7DC8A]/40" />
        <Moon aria-hidden="true" className="pointer-events-none absolute bottom-5 right-6 h-8 w-8 text-[#F7DC8A]/30" />

        <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:gap-10 md:text-left">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-2 border-[#C9873A]/80 bg-[#2A1205]/80 shadow-[0_0_0_10px_rgba(201,135,58,0.12),inset_0_0_30px_rgba(0,0,0,0.4)]">
            <p data-testid="baby-syllable" className="text-center text-[5.25rem] font-semibold leading-[1.4] text-[#FFF4DA]" style={{ fontFamily: "'Noto Serif Devanagari','Nirmala UI','Mangal',serif" }}>
              <span lang="hi">{syl.deva}</span>
            </p>
          </div>
          <div className="min-w-0">
            <h2 id="baby-syl-h" className="text-xs font-bold uppercase tracking-[0.24em] text-[#F7DC8A]">Recommended Naming Syllable</h2>
            <p className="mt-2 text-5xl font-bold leading-none" style={heading}>{syl.roman}</p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#F5E9D6]/90" data-testid="baby-syllable-basis">
              {nakshatra.name}, Pada {nakshatra.pada}: names traditionally begin with the sound &ldquo;{syl.roman}&rdquo;.
            </p>
            {sg.principal.alternates.length > 0 && (
              <p data-testid="baby-syllable-alt" className="mt-3 max-w-lg rounded-xl bg-white/10 p-3 text-sm leading-relaxed">
                {sg.principal.note} Other syllable for this pada: {sg.principal.alternates.map((a) => `${a.roman} (${a.deva})`).join(", ")}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Honest uncertainty */}
      {uncertain && (
        <section data-testid="baby-uncertain" role="note" className="rounded-2xl border border-[#C9873A] bg-[#FFF1CC] p-5 text-[#301607]">
          <h3 className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle size={18} aria-hidden="true" /> The syllable may depend on the exact minute</h3>
          <p className="text-sm">
            {result.nearPadaBoundary
              ? `The Moon changes Pada within ${result.window.minutesEitherSide} minutes of this birth time, so a small difference in the recorded time could change the syllable.`
              : `You said the birth time is approximate. Within ${result.window.minutesEitherSide} minutes either side, the Moon stays in the same Pada, so the syllable is the same across that window.`}
            {result.window.padas.length > 1 && " The syllables for each Pada the Moon was in are:"}
          </p>
          {result.window.padas.length > 1 && (
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {possible.map(({ ref, entry }) => (
                <li key={`${ref.nakshatra}${ref.pada}`} className="rounded-full bg-white/70 px-3 py-1">
                  {ref.nakshatra} Pada {ref.pada}: <strong>{entry ? `${entry.syllable.roman} (${entry.syllable.deva})` : "not in table"}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm">Please confirm the birth time from the birth record or hospital certificate if you can.</p>
        </section>
      )}

      {/* 4. The parent's own name, if given */}
      {fit && (
        <section data-testid="baby-fit" className="rounded-2xl border border-[#592209]/20 bg-white/70 p-4 text-[#301607]">
          <h3 className="font-bold text-[#592209]">Your preferred name: {preferredName}</h3>
          <p className="text-sm">
            {fit.fits
              ? `It begins with “${fit.matched!.roman}”, which matches the traditional syllable for this birth.`
              : `It does not begin with “${syl.roman}”, the traditional syllable for this birth. Many families still keep a cherished name and use the syllable for the formal naming (Namakarana) name.`}{" "}
            <span className="text-[#6B4A37]">This checks the spelling only; a priest may judge by sound.</span>
          </p>
        </section>
      )}

      {/* 5. Modern picks: matching the sound, checked meaning, modern, short (hidden when it would only repeat the list) */}
      {picks.length > 0 && picks.length < sg.primary.length && !filtering && (
        <section data-testid="modern-picks" aria-labelledby="baby-picks-h" className="rounded-[2rem] border border-[#C9873A]/60 bg-gradient-to-b from-[#FFF3D6] to-[#FBF5EC] p-5 shadow-[0_18px_44px_-30px_rgba(89,34,9,0.5)] sm:p-8">
          <SectionTitle id="baby-picks-h" sub={`Begin with “${syl.roman}”, have a checked meaning, and are short and easy to say.`}>
            <span className="inline-flex items-center gap-2"><Star size={22} aria-hidden="true" className="text-[#C9873A]" fill="currentColor" /> Modern Picks for Your Little One</span>
          </SectionTitle>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {picks.map((n) => <NameCard key={n.name} n={n} syllable={syl} saved={fav.isSaved(n.name)} onToggle={fav.toggle} />)}
          </ul>
        </section>
      )}

      {/* 6. The names */}
      <section aria-labelledby="baby-names-h">
        <SectionTitle id="baby-names-h" sub="A curated list, not a generated one. Every name has its Devanagari spelling, a meaning, its origin and how it was checked.">
          The Complete Collection: &ldquo;{syl.roman}&rdquo;
        </SectionTitle>

        <div className="mx-auto rounded-3xl border border-[#592209]/12 bg-white/55 p-4 shadow-sm sm:p-5">
          <label htmlFor="baby-search" className="sr-only">Search names or meanings</label>
          <div className="relative mx-auto max-w-xl">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B4A37]" />
            <input id="baby-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or meaning" className="w-full rounded-full border border-[#592209]/25 bg-[#FBF5EC] py-2.5 pl-10 pr-4 text-[15px] text-[#301607] outline-none focus:border-[#592209]" />
          </div>
          <div role="group" aria-label="Filter by gender" className="mt-3 flex flex-wrap justify-center gap-2">
            {GENDER_FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={gender === f.value} onClick={() => setGender(f.value)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${gender === f.value ? "border-[#592209] bg-[#592209] text-[#F5E9D6]" : "border-[#592209]/30 bg-white/60 text-[#592209] hover:bg-[#592209]/10"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Filter by style" className="mt-2 flex flex-wrap justify-center gap-2">
            {STYLE_FILTERS.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${kind === k ? "border-[#C9873A] bg-[#C9873A] text-[#301607]" : "border-[#592209]/30 bg-white/60 text-[#592209] hover:bg-[#592209]/10"}`}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-[#6B4A37]">
            Boy and Girl also include gender-neutral names. Every name here begins with &ldquo;{syl.roman}&rdquo;. &ldquo;Unique&rdquo; is an editorial pick for uncommon but meaningful names, not a popularity ranking.
          </p>
        </div>

        <p data-testid="baby-count" className="mt-5 text-center text-sm font-semibold text-[#592209]">
          {primary.length} {primary.length === 1 ? "name begins" : "names begin"} with &ldquo;{syl.roman}&rdquo;{gender !== "all" || filtering ? " with your current filters" : ""}.
        </p>

        {primary.length > 0 ? (
          <Group key={`${gender}|${kind}|${query}`} names={primary} syllable={syl} fav={fav} />
        ) : (
          <p data-testid="baby-none" className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#592209]/20 bg-white/70 p-4 text-center text-sm text-[#4A2E1F]">
            {sg.primary.length === 0
              ? `We do not yet have an established name beginning with “${syl.roman}” for this preference.`
              : "No names match these filters or this search. Try “All” or clear the search."}
          </p>
        )}

        {few && (
          <p data-testid="baby-few" className="mx-auto mt-8 max-w-2xl rounded-2xl bg-[#FFF1CC]/70 p-4 text-center text-sm leading-relaxed text-[#4A2E1F]">
            Fewer than {MIN_NAMES} established names begin with &ldquo;{syl.roman}&rdquo;. Families often choose from another Pada of {nakshatra.name} when a syllable has few names, so those are added below, each labelled with its own syllable.
          </p>
        )}

        {sg.alternates.map((g) => (
          <Group key={`${g.label}|${gender}|${kind}|${query}`} title={`Other tradition: ${g.label}`} note="Some traditions give this syllable for the same Pada." names={refine(g.names)} syllable={g.syllable} fav={fav} />
        ))}
        {sg.otherPadas.map((g) => (
          <Group key={`${g.label}|${gender}|${kind}|${query}`} title={`Other Pada of ${nakshatra.name}`} note={g.label} names={refine(g.names)} syllable={g.syllable} fav={fav} />
        ))}
      </section>

      {/* 7. Favourites */}
      {savedNames.length > 0 && (
        <section data-testid="baby-favourites" aria-labelledby="baby-fav-h" className="rounded-3xl border border-[#C9873A]/50 bg-[#FFF7E6] p-5">
          <h2 id="baby-fav-h" className="mb-3 flex items-center justify-center gap-2 text-xl font-bold text-[#301607]"><Heart size={20} aria-hidden="true" fill="currentColor" /> Your Favourite Names</h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {savedNames.map((n) => (
              <li key={n.name} className="inline-flex items-center gap-2 rounded-full bg-[#592209] py-1 pl-4 pr-1 text-sm text-[#F5E9D6]">
                {n.name} <span lang="hi" className="opacity-80">{n.deva}</span>
                <button type="button" onClick={() => fav.toggle(n.name)} aria-label={`Remove ${n.name} from favourites`} className="rounded-full px-2 py-0.5 hover:bg-white/20">×</button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center text-xs text-[#6B4A37]">Saved in this browser only.</p>
        </section>
      )}

      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-[#6B4A37]">
        Naming by Nakshatra is a traditional Hindu practice and is not scientifically proven. Traditions and regions differ, so please check with your family priest. Name meanings are given in brief; please confirm any name that matters to you before you choose it. Choosing a name from these suggestions does not promise any outcome for your child.
      </p>
    </div>
  );
}
