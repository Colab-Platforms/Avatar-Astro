import { useRef, useState } from "react";
import { ChevronDown, Download, Music } from "lucide-react";
import DevotionLayout from "@/components/DevotionLayout";
import Loader from "@/components/Loader/Loader";
import { devotionLibraryApi } from "@/features/devotionLibrary/api";
import { useMantrasChants } from "@/features/devotionLibrary/hooks";

export default function MantrasChantsPage() {
  const { data: mantras, isLoading, isError } = useMantrasChants();
  const [expanded, setExpanded] = useState<string | null>(null);
  const playedRef = useRef<Set<string>>(new Set());

  const handlePlay = (mantraId: string) => {
    // Count one play per page visit, not once per replay/seek.
    if (playedRef.current.has(mantraId)) return;
    playedRef.current.add(mantraId);
    devotionLibraryApi.registerMantraPlay(mantraId).catch(() => {});
  };

  return (
    <DevotionLayout>
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-2 inline-block font-home-sans text-[0.75rem] font-bold uppercase tracking-[0.2em] text-home-gerua">
            Devotion & Spirituality
          </span>
          <h1 className="hl-serif mb-3 text-3xl font-semibold text-home-ink sm:text-4xl">Mantras & Chants</h1>
          <p className="font-home-sans text-home-muted">
            Discover mantras, chants and verses to bring peace and focus to your day.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : isError ? (
          <p className="text-center text-home-muted">Could not load mantras right now. Please try again shortly.</p>
        ) : !mantras?.length ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Music className="h-10 w-10 text-home-gerua" />
            <p className="text-home-muted">No mantras have been published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mantras.map((mantra) => {
              const isOpen = expanded === mantra.id;
              return (
                <div key={mantra.id} className="hl-card overflow-hidden rounded-xl border border-home-line p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-home-line bg-home-ivory">
                      {mantra.coverImageUrl ? (
                        <img src={mantra.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-6 w-6 text-home-gerua/50" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-home-sans text-xs font-semibold uppercase tracking-wide text-home-gerua">{mantra.category}</span>
                      <h2 className="hl-serif text-lg font-semibold text-home-ink">{mantra.title}</h2>
                      {mantra.deity && <p className="text-sm text-home-muted">{mantra.deity}</p>}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {mantra.audioUrl && (
                        <a
                          href={devotionLibraryApi.mantraDownloadUrl(mantra.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-home-gerua px-3 py-1.5 text-xs font-semibold text-home-gerua transition-colors hover:bg-home-gerua hover:text-home-ivory"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      )}
                      {(mantra.lyricsText || mantra.meaning) && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : mantra.id)}
                          aria-expanded={isOpen}
                          className="inline-flex items-center gap-1 text-xs font-medium text-home-ink/70 hover:text-home-ink"
                        >
                          Lyrics <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {mantra.audioUrl && (
                    <audio controls preload="none" src={mantra.audioUrl} onPlay={() => handlePlay(mantra.id)} className="mt-3 w-full" />
                  )}

                  {isOpen && (
                    <div className="mt-3 space-y-2 rounded-lg bg-home-ivory/60 p-3 text-sm">
                      {mantra.lyricsText && <p className="whitespace-pre-line text-home-ink">{mantra.lyricsText}</p>}
                      {mantra.meaning && <p className="whitespace-pre-line text-home-ink/70">{mantra.meaning}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DevotionLayout>
  );
}
