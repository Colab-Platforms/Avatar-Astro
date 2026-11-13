import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Download, Music, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { LotusDivider, LotusFlower } from "@/components/devotion/BookshelfArt";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useSpiritualBooks } from "@/features/devotionLibrary/hooks";

/** Lower-case letters and digits only, so a category from the data maps to a stable dictionary key. */
const catKey = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The existing Divya Shloka screen: scripture verses with their meanings. */
const SHLOKA_ROUTE = "/inner-voice/wisdom";

/**
 * The page offers five filters. Stored categories are never changed; each one is mapped onto a filter here.
 * Known categories map exactly; anything new an admin types is matched by keyword. A book that fits no group is
 * still listed under All Books.
 */
const GROUPS = ["scripture", "zodiac", "selfDiscovery", "spirituality"] as const;
type Group = (typeof GROUPS)[number];
const EXACT: Record<string, Group> = { bhagavadgita: "scripture", vedicwisdom: "scripture", astrology: "zodiac", spiritualguide: "spirituality" };
const KEYWORDS: [Group, RegExp][] = [
  ["zodiac", /zodiac|astro|jyotish|horoscope|rashi|sign/],
  ["scripture", /scriptur|gita|veda|vedic|upanishad|purana|shastra|shloka|ramayan|mahabharat/],
  ["selfDiscovery", /self|discover|growth|mind|karma|purpose|wellbeing/],
  ["spirituality", /spiritual|yoga|meditat|devotion|bhakti|dharma/],
];
const groupOf = (category: string): Group | null => {
  const k = catKey(category);
  if (EXACT[k]) return EXACT[k];
  const lower = category.toLowerCase();
  return KEYWORDS.find(([, re]) => re.test(lower))?.[0] ?? null;
};

/** A description clamped to two lines, with Read More / Read Less shown only when something is actually hidden. */
function Description({ text }: { text: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, open]);

  return (
    <div className="mt-2">
      <p ref={ref} className={`break-words font-home-sans text-sm leading-relaxed text-[#5b3a2a] ${open ? "" : "line-clamp-2"}`}>{text}</p>
      {(overflows || open) && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-1 font-home-sans text-sm font-semibold text-[#B8892B] underline-offset-2 hover:text-[#7A1F14] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D]">
          {open ? t("spiritualBooks.readLess") : t("spiritualBooks.readMore")}
        </button>
      )}
    </div>
  );
}

export default function SpiritualBooksPage() {
  const { t } = useTranslation();
  const { data: books, isLoading, isError } = useSpiritualBooks();
  const [active, setActive] = useState<Group | null>(null); // null = All Books
  const [query, setQuery] = useState("");

  const catLabel = (c: string) => t(`spiritualBooks.category.${catKey(c)}`, { defaultValue: c });
  // Only groups that contain at least one real book are offered, so none can be empty.
  const groups = useMemo(() => GROUPS.filter((g) => (books ?? []).some((b) => groupOf(b.category) === g)), [books]);
  useEffect(() => { if (active && !groups.includes(active)) setActive(null); }, [groups, active]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (books ?? []).filter((b) => (!active || groupOf(b.category) === active) && (!q || b.title.toLowerCase().includes(q) || (b.author ?? "").toLowerCase().includes(q))),
    [books, active, q],
  );

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-[88rem] px-4 pb-14 pt-28 sm:px-6 sm:pt-24 lg:px-10">
        <header className="max-w-3xl">
          <h1 className="hl-serif text-4xl font-semibold leading-tight text-[#592209] sm:text-5xl">{t("spiritualBooks.title")}</h1>
          <div className="mt-2"><LotusDivider label={t("spiritualBooks.dividerAlt")} /></div>
          <p className="mt-3 font-home-sans text-base leading-relaxed text-[#5b3a2a] md:text-lg">{t("spiritualBooks.intro")}</p>
          {/* Library Switcher */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#BC6A4D] px-4 py-1.5 text-xs font-semibold text-[#FFF8F2] shadow-sm">
              <BookOpen size={13} aria-hidden="true" /> {t("nav.spiritualBooks", { defaultValue: "Spiritual Books" })}
            </span>
            <Link to="/devotion/mantras-chants" className="inline-flex items-center gap-1.5 rounded-full border border-[#592209]/20 bg-[#592209]/5 px-4 py-1.5 text-xs font-medium text-[#592209] transition-colors hover:bg-[#592209]/10">
              <Music size={13} aria-hidden="true" /> {t("nav.mantrasChants", { defaultValue: "Mantras & Chants" })}
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader /></div>
        ) : isError ? (
          <p className="py-10 text-home-muted">{t("spiritualBooks.loadError")}</p>
        ) : !books?.length ? (
          <div className="flex flex-col items-start gap-3 py-16">
            <BookOpen className="h-9 w-9 text-home-gerua" />
            <p className="text-home-muted">{t("spiritualBooks.empty")}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 lg:items-start">
            <div>
              {/* Filters and search share one row on desktop; the filters swipe sideways (no scrollbar) when they do not fit */}
              <div className="flex flex-col gap-3 border-b border-[#C9A24A]/40 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div role="group" aria-label={t("spiritualBooks.filtersLabel")} className="-mx-4 flex min-w-0 gap-6 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" data-testid="book-filters">
                  {[null, ...groups].map((g) => {
                    const on = active === g;
                    return (
                      <button
                        key={g ?? "__all"}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setActive(g)}
                        className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 font-home-sans text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] ${on ? "border-[#C9A24A] text-[#592209]" : "border-transparent text-[#5b3a2a]/70 hover:text-[#592209]"}`}
                      >
                        {g === null ? t("spiritualBooks.all") : t(`spiritualBooks.groups.${g}`)}
                      </button>
                    );
                  })}
                </div>
                <div className="relative w-full pb-3 lg:w-80 lg:shrink-0 xl:w-96 lg:pb-0">
                  <Search className="pointer-events-none absolute left-3 top-[calc(50%-0.375rem)] h-4 w-4 -translate-y-1/2 text-[#B8892B] lg:top-1/2" aria-hidden="true" />
                  <input
                    type="text"
                    inputMode="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t("spiritualBooks.search.label")}
                    placeholder={t("spiritualBooks.search.placeholder")}
                    data-testid="book-search"
                    className="h-10 w-full rounded-full border border-[#C9A24A]/50 bg-[#FFF8E8]/70 pl-9 pr-9 font-home-sans text-sm text-[#2C1810] placeholder:text-[#5b3a2a]/55 focus:border-[#C9A24A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D]"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label={t("spiritualBooks.search.clear")} className="absolute right-2 top-[calc(50%-0.375rem)] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#592209] hover:bg-[#592209]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] lg:top-1/2">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {!shown.length ? (
                <p className="py-10 text-home-muted" role="status">{t("spiritualBooks.noResults")}</p>
              ) : (
                <ul aria-label={t("spiritualBooks.shelfLabel")} className="divide-y divide-[#592209]/10" data-testid="bookshelf">
                  {shown.map((book) => (
                    <li key={book.id} className="group flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-6" data-testid="book-card">
                      <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
                        <div className="aspect-[2/3] w-20 shrink-0 sm:w-24">
                          {book.coverImageUrl ? (
                            <img src={book.coverImageUrl} alt={book.title} width={400} height={600} className="h-full w-full object-contain object-top drop-shadow-[0_3px_5px_rgba(60,30,10,0.28)] transition-[transform,filter] duration-300 group-hover:-translate-y-1 group-hover:drop-shadow-[0_8px_10px_rgba(60,30,10,0.4)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-sm border border-[#592209]/15 bg-[#FBF5EC] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"><BookOpen className="h-6 w-6 text-home-gerua/40" aria-hidden="true" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-home-sans text-[11px] font-semibold uppercase tracking-wider text-[#B8892B]">{catLabel(book.category)}</p>
                          <h2 className="hl-serif mt-1 break-words text-xl font-semibold leading-snug text-[#592209] transition-colors duration-300 group-hover:text-[#7A1F14]">{book.title}</h2>
                          {book.author && <p className="mt-0.5 break-words font-home-sans text-sm text-home-muted">{t("spiritualBooks.by", { author: book.author })}</p>}
                          {book.description && <Description text={book.description} />}
                        </div>
                      </div>
                      <div className="shrink-0 sm:pl-2">
                        {book.hasFile ? (
                          <a
                            href={devotionLibraryApi.bookDownloadUrl(book.id)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t("spiritualBooks.downloadAria", { title: book.title })}
                            className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#7A1F14] px-4 py-2 font-home-sans text-sm font-semibold text-[#FFF6E6] transition-colors duration-300 hover:bg-[#8E2A1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2 sm:w-auto"
                          >
                            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{t("spiritualBooks.download")}</span>
                          </a>
                        ) : (
                          <p className="font-home-sans text-xs text-home-muted">{t("spiritualBooks.pdfPending")}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Explore Divya Shlokas: beside the list on large screens, below it on small ones */}
            <aside className="rounded-lg bg-[#FFF8E8]/80 p-6 text-center ring-1 ring-[#C9A24A]/40 lg:sticky lg:top-24" data-testid="divya-shloka-promo">
              <LotusFlower />
              <h2 className="hl-serif mt-2 text-xl font-semibold leading-tight text-[#592209]">{t("spiritualBooks.shloka.title")}</h2>
              <p className="mt-2 font-home-sans text-sm leading-relaxed text-[#5b3a2a]">{t("spiritualBooks.shloka.description")}</p>
              <Link to={SHLOKA_ROUTE} className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#7A1F14] px-4 py-2 font-home-sans text-sm font-semibold text-[#FFF6E6] transition-colors duration-300 hover:bg-[#8E2A1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2">
                {t("spiritualBooks.shloka.button")}
                <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        )}
      </div>
    </DevotionLayout>
  );
}
