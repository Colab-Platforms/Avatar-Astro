import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, Download, Flame, Flower2, Moon, Mountain, Music, Pause, Play, Shell, Sparkles, Sun, Sunrise } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useMantrasChants } from "@/features/devotionLibrary/hooks";
import type { PublicMantraChant } from "@/features/devotionLibrary/types";
import { CATEGORY_LABEL, MANTRA_CATALOG, MANTRA_CATEGORIES, categoryOfRecord, matchRecords, type MantraCategory } from "@/data/mantraCatalog";

const ICON: Record<string, LucideIcon> = {
  gayatri: Sun, mahamrityunjaya: Moon, omnamahshivaya: Mountain, harekrishna: Music, gamganapataye: Sparkles,
  hanuman: Flame, mahalakshmi: Flower2, saraswati: BookOpen, vishnu: Shell, shriramjairam: Sunrise,
};

interface Card {
  id: string;
  /** Catalog id (translated name) or null for an extra uploaded record, which keeps its own title. */
  catalogId: string | null;
  name: string;
  categories: MantraCategory[];
  record: PublicMantraChant | null;
}

export default function MantrasChantsPage() {
  const { t } = useTranslation();
  const { data: records, isLoading, isError } = useMantrasChants();
  const [active, setActive] = useState<MantraCategory | null>(null); // null = All
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // One audio element for the whole page: starting a mantra replaces whatever was playing, so only one can ever play.
  const audio = useRef<HTMLAudioElement | null>(null);
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => () => { audio.current?.pause(); }, []);

  // The ten mantras always appear. Audio, lyrics and artwork come from the matching uploaded record; other uploaded records follow them.
  const cards = useMemo<Card[]>(() => {
    const { matched, extras } = matchRecords(records ?? []);
    const base: Card[] = MANTRA_CATALOG.map((c) => ({ id: c.id, catalogId: c.id, name: c.name, categories: c.categories, record: matched.get(c.id) ?? null }));
    const more: Card[] = extras.map((r) => { const cat = categoryOfRecord(r); return { id: `rec-${r.id}`, catalogId: null, name: r.title, categories: cat ? [cat] : [], record: r }; });
    return [...base, ...more];
  }, [records]);
  const shown = useMemo(() => (active ? cards.filter((c) => c.categories.includes(active)) : cards), [cards, active]);

  const toggle = (c: Card) => {
    const el = audio.current;
    const url = c.record?.audioUrl;
    if (!el || !url) return;
    setFailed(null);
    if (playing === c.id) { el.pause(); return; }
    el.pause();
    el.src = url;
    setPlaying(c.id);
    const started = el.play();
    if (started && typeof started.catch === "function") started.catch(() => { setPlaying(null); setFailed(c.id); });
    if (c.record && !counted.current.has(c.record.id)) { // one counted play per visit, as before
      counted.current.add(c.record.id);
      devotionLibraryApi.registerMantraPlay(c.record.id).catch(() => {});
    }
  };

  const catLabel = (k: MantraCategory) => t(`mantras.categories.${k}`, { defaultValue: CATEGORY_LABEL[k] });

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-14 pt-28 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="mb-2 inline-block font-home-sans text-[0.75rem] font-bold uppercase tracking-[0.2em] text-home-gerua">{t("mantras.eyebrow")}</span>
          <h1 className="hl-serif mb-3 text-3xl font-semibold text-home-ink sm:text-4xl">{t("mantras.title")}</h1>
          <p className="font-home-sans text-home-muted">{t("mantras.subtitle")}</p>
        </div>

        {/* One shared audio element (hidden): the cards' Play buttons drive it */}
        {/* A pause event that arrives after the next mantra has already started is ignored (the element is no longer paused). */}
        <audio ref={audio} preload="none" onPause={(e) => { if (e.currentTarget.paused) setPlaying(null); }} onEnded={() => setPlaying(null)} onError={() => { setFailed((f) => f ?? playing); setPlaying(null); }} />

        {/* Categories: pill buttons; one row that swipes sideways on small screens (no visible scrollbar) and wraps on wide ones */}
        <div role="group" aria-label={t("mantras.filtersLabel")} data-testid="mantra-filters" className="-mx-4 mb-8 flex gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {([null, ...MANTRA_CATEGORIES] as (MantraCategory | null)[]).map((k) => {
            const on = active === k;
            return (
              <button
                key={k ?? "__all"}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(k)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-home-sans text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2 ${on ? "border-[#7A1F14] bg-[#7A1F14] text-[#FFF6E6]" : "border-[#C9A24A]/60 bg-[#FFF8E8]/70 text-[#592209] hover:bg-[#FFEFD2]"}`}
              >
                {k === null ? t("mantras.all") : catLabel(k)}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader /></div>
        ) : isError ? (
          <p className="text-center text-home-muted">{t("mantras.loadError")}</p>
        ) : !shown.length ? (
          <p className="py-10 text-center text-home-muted" role="status" data-testid="mantra-empty">{t("mantras.none")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" data-testid="mantra-grid">
            {shown.map((c) => {
              const name = c.catalogId ? t(`mantras.items.${c.catalogId}`, { defaultValue: c.name }) : c.name;
              const Icon = (c.catalogId && ICON[c.catalogId]) || Music;
              const hasAudio = Boolean(c.record?.audioUrl);
              const isPlaying = playing === c.id;
              const open = expanded === c.id;
              const hasLyrics = Boolean(c.record?.lyricsText || c.record?.meaning);
              return (
                <li key={c.id} data-testid="mantra-card" data-mantra={c.id} className="hl-card flex flex-col rounded-xl border border-home-line p-3.5 sm:p-4">
                  <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#C9A24A]/50 bg-home-ivory text-home-gerua sm:h-14 sm:w-14">
                      {c.record?.coverImageUrl ? <img src={c.record.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon className="h-6 w-6" aria-hidden="true" />}
                    </div>
                    <h2 className="hl-serif line-clamp-3 min-w-0 text-base font-semibold leading-snug text-home-ink sm:text-lg">{name}</h2>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {hasAudio ? (
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        aria-pressed={isPlaying}
                        aria-label={t(isPlaying ? "mantras.pauseAria" : "mantras.playAria", { name })}
                        data-testid="mantra-play"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#7A1F14] px-4 py-2 font-home-sans text-sm font-semibold text-[#FFF6E6] transition-colors hover:bg-[#8E2A1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D] focus-visible:ring-offset-2"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                        {t(isPlaying ? "mantras.pause" : "mantras.play")}
                      </button>
                    ) : (
                      <span data-testid="mantra-soon" className="inline-flex min-h-[40px] items-center rounded-full border border-dashed border-home-line px-3 font-home-sans text-xs text-home-muted">{t("mantras.audioSoon")}</span>
                    )}
                    {hasAudio && c.record && (
                      <a href={devotionLibraryApi.mantraDownloadUrl(c.record.id)} target="_blank" rel="noreferrer" aria-label={t("mantras.downloadAria", { name })} title={t("mantras.download")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C9A24A]/60 text-[#592209] transition-colors hover:bg-[#FFEFD2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D]">
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                    {hasLyrics && (
                      <button type="button" onClick={() => setExpanded(open ? null : c.id)} aria-expanded={open} className="inline-flex items-center gap-1 font-home-sans text-xs font-semibold text-home-ink/70 hover:text-home-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC6A4D]">
                        {t(open ? "mantras.hideLyrics" : "mantras.lyrics")} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {failed === c.id && <p role="alert" className="mt-2 font-home-sans text-xs text-[#9C2A1B]">{t("mantras.audioError")}</p>}

                  {open && c.record && (
                    <div className="mt-3 space-y-2 rounded-lg bg-home-ivory/60 p-3 text-sm">
                      {c.record.lyricsText && <p className="whitespace-pre-line text-home-ink">{c.record.lyricsText}</p>}
                      {c.record.meaning && <p className="whitespace-pre-line text-home-ink/70">{c.record.meaning}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DevotionLayout>
  );
}
