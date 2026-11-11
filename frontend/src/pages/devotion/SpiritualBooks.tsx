import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookMarked, BookOpen, ChevronLeft, ChevronRight, Compass, Download, Flower2, Leaf, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { Diya, KrishnaIllustration, LotusDivider, LotusFlower } from "@/components/devotion/BookshelfArt";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useSpiritualBooks } from "@/features/devotionLibrary/hooks";

/** Lower-case letters and digits only, so a category from the data maps to a stable dictionary key. */
const catKey = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, "");
const CATEGORY_ICON: Record<string, typeof BookOpen> = { bhagavadgita: Sparkles, vedicwisdom: Flower2, astrology: Star, spiritualguide: BookMarked };

/** The existing Divya Shloka screen: scripture verses with their meanings. */
const EXPLORE_ROUTE = "/inner-voice/wisdom";

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SpiritualBooksPage() {
  const { t } = useTranslation();
  const { data: books, isLoading, isError } = useSpiritualBooks();
  const [active, setActive] = useState<string | null>(null); // null = All Books

  // Filters come from the categories that really exist in the data, so none can return an empty shelf.
  const categories = useMemo(() => [...new Set((books ?? []).map((b) => b.category).filter(Boolean))], [books]);
  const catLabel = (c: string) => t(`spiritualBooks.category.${catKey(c)}`, { defaultValue: c });
  const shown = useMemo(() => (active ? (books ?? []).filter((b) => b.category === active) : books ?? []), [books, active]);

  // Shelf browsing: the books sit in one scrolling row; the arrows move it by most of a screenful.
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    rail.current?.scrollTo?.({ left: 0 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown, measure]);
  const go = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const benefits: [typeof BookOpen, string][] = [
    [BookOpen, t("spiritualBooks.benefits.knowledge")],
    [Flower2, t("spiritualBooks.benefits.growth")],
    [Leaf, t("spiritualBooks.benefits.peace")],
    [Compass, t("spiritualBooks.benefits.guidance")],
  ];

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-[78rem] px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        {/* Hero: words on the left, Krishna on the right (above the words on small screens) */}
        <header className="grid items-center gap-2 md:grid-cols-[1.1fr_0.9fr]">
          <div className="order-2 text-center md:order-1 md:text-left">
            <h1 className="hl-serif text-4xl font-semibold leading-tight text-[#592209] sm:text-5xl lg:text-6xl">{t("spiritualBooks.title")}</h1>
            <div className="mt-3 flex justify-center md:justify-start"><LotusDivider label={t("spiritualBooks.dividerAlt")} /></div>
            <p className="mx-auto mt-4 max-w-md font-home-sans text-base leading-relaxed text-[#5b3a2a] md:mx-0 md:text-lg">{t("spiritualBooks.intro")}</p>
          </div>
          <div className="order-1 mx-auto h-56 w-56 sm:h-64 sm:w-64 md:order-2 md:ml-auto md:h-80 md:w-80">
            <KrishnaIllustration label={t("spiritualBooks.heroAlt")} />
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
          <>
            {/* Category filters: pill buttons that scroll sideways on small screens */}
            <div role="group" aria-label={t("spiritualBooks.filtersLabel")} className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 py-3 sm:mx-0 sm:justify-center sm:px-0" data-testid="book-filters">
              {[null, ...categories].map((c) => {
                const on = active === c;
                const Icon = c === null ? BookOpen : CATEGORY_ICON[catKey(c)] ?? BookMarked;
                return (
                  <button
                    key={c ?? "__all"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive(c)}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-home-sans text-sm font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2 ${on ? "bg-[#7A1F14] text-[#FFF6E6] shadow-md" : "bg-[#FFF6E6]/80 text-[#592209] hover:bg-[#FFEFD2]"}`}
                  >
                    <Icon className={`h-4 w-4 ${on ? "text-[#F6C86A]" : "text-[#D9772F]"}`} aria-hidden="true" />
                    {c === null ? t("spiritualBooks.all") : catLabel(c)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
              {/* The shelf */}
              <section aria-label={t("spiritualBooks.shelfLabel")} className="relative [--bw:9.5rem] md:[--bw:11.5rem]" data-testid="bookshelf">
                {!shown.length ? (
                  <p className="py-10 text-home-muted">{t("spiritualBooks.noneInCategory")}</p>
                ) : (
                  <>
                    <div
                      ref={rail}
                      onScroll={measure}
                      tabIndex={0}
                      className="scroll-pl-7 sm:scroll-pl-9 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D]"
                      style={{ scrollSnapType: "x proximity" }}
                    >
                      <div className="relative flex w-max min-w-full items-start gap-6 px-6 sm:gap-8 sm:px-8">
                        {/* the wooden shelf runs the full width of the row, behind and under the covers */}
                        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-1 top-[calc(var(--bw)*1.5)] h-6 rounded-sm" style={{ background: "linear-gradient(#D9A066 0 28%, #B9763A 28% 70%, #8C5527 70%)", boxShadow: "0 16px 18px -10px rgba(89,34,9,.5), inset 0 1px 0 rgba(255,255,255,.35)" }} />

                        <div className="flex h-[calc(var(--bw)*1.5)] shrink-0 snap-start items-end" aria-hidden="true"><Diya /></div>

                        {shown.map((book) => (
                          <article key={book.id} className="flex w-[var(--bw)] shrink-0 snap-start flex-col" data-testid="book-card">
                            <div className="h-[calc(var(--bw)*1.5)] w-full">
                              {book.coverImageUrl ? (
                                <img src={book.coverImageUrl} alt={book.title} width={400} height={600} className="h-full w-full object-contain object-bottom drop-shadow-[0_6px_8px_rgba(60,30,10,0.45)]" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-sm border border-[#592209]/20 bg-[#FBF5EC] shadow-md"><BookOpen className="h-8 w-8 text-home-gerua/40" aria-hidden="true" /></div>
                              )}
                            </div>
                            <div className="mt-10 flex flex-1 flex-col">
                              <p className="font-home-sans text-[11px] font-semibold uppercase tracking-wide text-[#C2622B]">{catLabel(book.category)}</p>
                              <h2 className="hl-serif mt-1 line-clamp-3 break-words text-base font-semibold leading-snug text-[#2C1810]">{book.title}</h2>
                              {book.author && <p className="mt-0.5 line-clamp-2 break-words font-home-sans text-sm text-home-muted">{t("spiritualBooks.by", { author: book.author })}</p>}
                              <div className="mt-3">
                                {book.hasFile ? (
                                  <a
                                    href={devotionLibraryApi.bookDownloadUrl(book.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={t("spiritualBooks.downloadAria", { title: book.title })}
                                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#7A1F14] px-3.5 py-2 font-home-sans text-sm font-semibold text-[#FFF6E6] shadow-sm transition-colors hover:bg-[#8E2A1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2"
                                  >
                                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span>{t("spiritualBooks.download")}</span>
                                  </a>
                                ) : (
                                  <p className="font-home-sans text-xs text-home-muted">{t("spiritualBooks.pdfPending")}</p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label={t("spiritualBooks.prev")} data-testid="shelf-prev" className="absolute left-0 top-[calc(1rem+var(--bw)*0.75)] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#592209] shadow-md transition-opacity hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] disabled:pointer-events-none disabled:opacity-0">
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label={t("spiritualBooks.next")} data-testid="shelf-next" className="absolute right-0 top-[calc(1rem+var(--bw)*0.75)] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#592209] shadow-md transition-opacity hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] disabled:pointer-events-none disabled:opacity-0">
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </section>

              {/* Ancient Wisdom: beside the shelf on large screens, below it on small ones */}
              <aside className="rounded-xl border border-[#C9A24A]/50 bg-gradient-to-b from-[#FFF8E8] to-[#F8E7C4] p-6 text-center shadow-sm outline outline-1 -outline-offset-[6px] outline-[#C9A24A]/40" data-testid="ancient-wisdom">
                <LotusFlower />
                <h2 className="hl-serif mt-2 text-2xl font-semibold leading-tight text-[#592209]">{t("spiritualBooks.wisdom.title")}</h2>
                <p className="mt-3 font-home-sans text-sm leading-relaxed text-[#5b3a2a]">{t("spiritualBooks.wisdom.description")}</p>
                <Link to={EXPLORE_ROUTE} className="mt-5 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#7A1F14] px-5 py-2 font-home-sans text-sm font-semibold text-[#FFF6E6] transition-colors hover:bg-[#8E2A1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2">
                  {t("spiritualBooks.wisdom.explore")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </aside>
            </div>

            {/* Quiet benefits strip */}
            <ul aria-label={t("spiritualBooks.benefitsLabel")} className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-y-4 rounded-2xl bg-[#FFF6E6]/80 px-4 py-4 shadow-sm sm:grid-cols-4 sm:gap-y-0 sm:py-5" data-testid="benefits">
              {benefits.map(([Icon, label], i) => (
                <li key={label} className={`flex items-center justify-center gap-2.5 px-2 text-center font-home-sans text-sm text-[#592209] sm:text-left ${i > 0 ? "sm:border-l sm:border-[#C9A24A]/40" : ""}`}>
                  <Icon className="h-6 w-6 shrink-0 text-[#D9772F]" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </DevotionLayout>
  );
}
