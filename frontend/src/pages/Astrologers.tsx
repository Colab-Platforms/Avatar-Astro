import { useMemo, useState } from "react";
import FeatureFaq from "@/components/FeatureFaq";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import AstrologerCard from "@/components/astrologers/AstrologerCard";
import {
  ALL_LANGUAGES,
  ASTROLOGERS,
  EXPERTISE_OPTIONS,
  hasReliableStats,
  type Expertise,
} from "@/data/astrologers";

type Availability = "all" | "online" | "offline";
type SortKey = "default" | "rating" | "experience";

const selectCls =
  "w-full rounded-lg border border-[#592209]/30 bg-[#FBF5EC] px-3 py-2.5 text-base text-[#301607] focus:border-[#E58A45] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/40";

/** "Consult Astrologers": searchable, filterable directory of astrologer profiles. */
const Astrologers = () => {
  const [query, setQuery] = useState("");
  const [expertise, setExpertise] = useState<Expertise | "">("");
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");
  const [sort, setSort] = useState<SortKey>("default");

  const sortable = hasReliableStats(ASTROLOGERS);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ASTROLOGERS.filter(
      (a) =>
        (!q || a.name.toLowerCase().includes(q)) &&
        (!expertise || a.expertise.includes(expertise)) &&
        (!language || a.languages.includes(language)) &&
        (availability === "all" || (availability === "online" ? a.online : !a.online)),
    );
    if (sortable && sort === "rating") return [...list].sort((x, y) => y.rating - x.rating);
    if (sortable && sort === "experience") return [...list].sort((x, y) => y.experienceYears - x.experienceYears);
    return list;
  }, [query, expertise, language, availability, sort, sortable]);

  const clear = () => {
    setQuery("");
    setExpertise("");
    setLanguage("");
    setAvailability("all");
    setSort("default");
  };

  // Nothing real to list yet: send visitors home instead of showing an empty or unfinished page.
  if (ASTROLOGERS.length === 0) return <Navigate to="/" replace />;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6" data-testid="astrologers-page">
      <header className="text-center">
        <h1 className="font-home-serif text-4xl font-semibold text-[#592209] sm:text-5xl">Consult Astrologers</h1>
        <span aria-hidden="true" className="mx-auto mt-3 block h-[3px] w-14 rounded-full bg-[#E58A45]" />
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4A2E1F]">
          Browse astrologers by expertise and language, and read each profile before you decide.
        </p>
      </header>

      <form
        role="search"
        aria-label="Find an astrologer"
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 grid gap-3 rounded-2xl border border-[#592209]/20 bg-[#F5E9D6]/60 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label htmlFor="ast-search" className="sr-only">
            Search by name
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B4A37]" aria-hidden="true" />
          <input
            id="ast-search"
            type="search"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${selectCls} pl-9`}
          />
        </div>
        <div>
          <label htmlFor="ast-expertise" className="sr-only">
            Expertise
          </label>
          <select id="ast-expertise" className={selectCls} value={expertise} onChange={(e) => setExpertise(e.target.value as Expertise | "")}>
            <option value="">All expertise</option>
            {EXPERTISE_OPTIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ast-language" className="sr-only">
            Language
          </label>
          <select id="ast-language" className={selectCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">All languages</option>
            {ALL_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ast-availability" className="sr-only">
            Availability
          </label>
          <select id="ast-availability" className={selectCls} value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
            <option value="all">Online and offline</option>
            <option value="online">Online now</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div>
          <label htmlFor="ast-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="ast-sort"
            className={selectCls}
            value={sort}
            disabled={!sortable}
            title={sortable ? undefined : "Sorting is available once astrologers have real ratings and experience data"}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="default">{sortable ? "Sort: featured" : "Sort (needs real data)"}</option>
            <option value="rating">Highest rating</option>
            <option value="experience">Most experience</option>
          </select>
        </div>
      </form>

      <p className="mt-4 text-sm text-[#6B4A37]" role="status" aria-live="polite" data-testid="astrologer-count">
        {shown.length} {shown.length === 1 ? "astrologer" : "astrologers"} found
      </p>

      {shown.length > 0 ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((a) => (
            <AstrologerCard key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-8 text-center" data-testid="astrologers-empty">
          <p className="text-lg text-[#301607]">No astrologers match these filters.</p>
          <button type="button" onClick={clear} className="mt-3 text-sm font-semibold text-[#592209] underline underline-offset-2">
            Clear filters
          </button>
        </div>
      )}
      <FeatureFaq feature="astrologers" className="mt-6 px-0" />
    </section>
  );
};

export default Astrologers;
