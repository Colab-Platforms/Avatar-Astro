import { useMemo, useState } from "react";
import FeatureFaq from "@/components/FeatureFaq";
import { Loader2, Search } from "lucide-react";
import AstrologerCard from "@/components/astrologers/AstrologerCard";
import { usePublicAstrologers } from "@/features/astrologer/public/hooks";

type Availability = "all" | "online" | "offline";
type SortKey = "default" | "rating" | "experience";

const selectCls =
  "w-full rounded-lg border border-[#592209]/30 bg-[#FBF5EC] px-3 py-2.5 text-base text-[#301607] focus:border-[#E58A45] focus:outline-none focus:ring-2 focus:ring-[#E58A45]/40";

/** "Consult Astrologers": searchable, filterable directory, backed by the real published-profile API. */
const Astrologers = () => {
  const query = usePublicAstrologers({ pageSize: 50 });
  const astrologers = query.data?.items ?? [];

  const [search, setSearch] = useState("");
  const [expertise, setExpertise] = useState("");
  const [language, setLanguage] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");
  const [sort, setSort] = useState<SortKey>("default");

  const expertiseOptions = useMemo(() => [...new Set(astrologers.flatMap((a) => a.expertise))].sort(), [astrologers]);
  const languageOptions = useMemo(() => [...new Set(astrologers.flatMap((a) => a.languages))].sort(), [astrologers]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = astrologers.filter(
      (a) =>
        (!q || a.name.toLowerCase().includes(q)) &&
        (!expertise || a.expertise.includes(expertise)) &&
        (!language || a.languages.includes(language)) &&
        (availability === "all" || (availability === "online" ? a.online : !a.online)),
    );
    if (sort === "rating") return [...list].sort((x, y) => (y.rating ?? -1) - (x.rating ?? -1));
    if (sort === "experience") return [...list].sort((x, y) => (y.experienceYears ?? -1) - (x.experienceYears ?? -1));
    return list;
  }, [astrologers, search, expertise, language, availability, sort]);

  const clear = () => {
    setSearch("");
    setExpertise("");
    setLanguage("");
    setAvailability("all");
    setSort("default");
  };

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${selectCls} pl-9`}
          />
        </div>
        <div>
          <label htmlFor="ast-expertise" className="sr-only">
            Expertise
          </label>
          <select id="ast-expertise" className={selectCls} value={expertise} onChange={(e) => setExpertise(e.target.value)}>
            <option value="">All expertise</option>
            {expertiseOptions.map((x) => (
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
            {languageOptions.map((l) => (
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
          <select id="ast-sort" className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="default">Sort: featured</option>
            <option value="rating">Highest rating</option>
            <option value="experience">Most experience</option>
          </select>
        </div>
      </form>

      {query.isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#592209]" />
        </div>
      ) : (
        <>
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
        </>
      )}
      <FeatureFaq feature="astrologers" className="mt-6 px-0" />
    </section>
  );
};

export default Astrologers;
