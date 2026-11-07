import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";
import { CELEBRITY_NAME_CHANGES } from "../lib/celebrityData";
import { describeChange, numbersFor } from "@/lib/nameSpelling";

const AUTO_PLAY_MS = 6000;

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Real-life celebrity examples. The names and photos are fixed, documented data; every number and every letter change
 * shown on a card is calculated here with the same numerology functions as the rest of the page.
 * Self-contained: no API call, so it always renders on first paint.
 */
export default function CelebrityCarousel() {
  const items = CELEBRITY_NAME_CHANGES;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIndex(((next % items.length) + items.length) % items.length);
    },
    [items.length]
  );
  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Re-armed on every index change, so autoplay never collides with a manual click or swipe.
  useEffect(() => {
    if (paused || reducedMotion()) return;
    const t = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % items.length);
    }, AUTO_PLAY_MS);
    return () => clearTimeout(t);
  }, [paused, items.length, index]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) next();
    else if (info.offset.x > 60) prev();
  }

  const c = items[index];
  const calc = useMemo(
    () => ({ before: numbersFor(c.previousSpelling), after: numbersFor(c.currentName), change: describeChange(c.previousSpelling, c.currentName) }),
    [c]
  );

  const arrowBtn =
    "absolute z-20 top-[38%] flex h-10 w-10 items-center justify-center rounded-full border border-[#592209]/25 bg-[#FBF5EC]/95 text-[#592209] shadow-lg transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A]";

  return (
    <section data-testid="celebrity-section" aria-labelledby="celeb-h" className="px-2 py-12 sm:px-6">
      <h2 id="celeb-h" className="mb-2 text-center text-2xl font-bold uppercase tracking-wide text-[#301607] sm:text-3xl" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        Real-Life Celebrity Examples
      </h2>
      <p className="mx-auto mb-1 max-w-2xl text-center text-base italic text-[#6B4A37]">
        Explore how different name spellings are interpreted through traditional numerology.
      </p>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-[#4A2E1F]">
        Explore the power of name numerology through familiar celebrity examples.
      </p>

      <div className="relative mx-auto max-w-[460px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
        <button type="button" onClick={prev} aria-label="Previous celebrity" className={`${arrowBtn} left-1 sm:-left-14`}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" onClick={next} aria-label="Next celebrity" className={`${arrowBtn} right-1 sm:-right-14`}>
          <ChevronRight size={20} />
        </button>

        <div className="overflow-hidden rounded-3xl">
          <AnimatePresence custom={direction} mode="wait" initial={false}>
            <motion.div
              key={c.currentName}
              data-testid="celebrity-card"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reducedMotion() ? 0 : 0.35, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="cursor-grab overflow-hidden rounded-3xl border border-[#592209]/20 bg-[#FBF5EC] shadow-xl active:cursor-grabbing"
            >
              <div className="relative aspect-[4/5] w-full bg-[#301607]">
                <img src={c.photo} alt={`${c.currentName}, ${c.profession}`} loading="lazy" draggable={false} className="pointer-events-none h-full w-full select-none object-cover object-top" />
                <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">{c.profession}</span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-5 pb-5 pt-20 text-center text-white">
                  <p data-testid="celebrity-before" className="text-lg font-medium leading-tight text-white/85">{c.previousSpelling}</p>
                  <ArrowDown size={18} className="mx-auto my-1.5 text-[#F7DC8A]" aria-label="changed to" role="img" />
                  <p data-testid="celebrity-after" className="text-3xl font-extrabold uppercase leading-tight tracking-wide sm:text-4xl" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {c.currentName}
                  </p>
                </div>
              </div>

              <div className="p-4 text-[#301607]">
                {calc.change.summary && (
                  <p data-testid="celebrity-change" className="mb-3 text-center text-sm font-semibold text-[#592209]">Spelling change: {calc.change.summary}</p>
                )}
                {calc.before && calc.after && (
                  <dl data-testid="celebrity-numbers" className="mb-3 grid grid-cols-2 gap-2 text-center text-sm">
                    {([["Chaldean number", calc.before.chaldean, calc.after.chaldean], ["Destiny number", calc.before.destiny, calc.after.destiny]] as const).map(([label, a, b]) => (
                      <div key={label} className="rounded-xl border border-[#592209]/15 bg-white/70 p-2">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[#6B4A37]">{label}</dt>
                        <dd className="mt-0.5 font-semibold">{a} → {b}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="text-center text-sm leading-relaxed text-[#4A2E1F]">{c.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center" role="tablist" aria-label="Celebrity carousel navigation">
        {items.map((it, i) => (
          <button
            key={it.currentName}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to ${it.currentName}`}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            className="relative -mx-2.5 flex items-center justify-center rounded-full p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9873A]"
          >
            <span className={`block rounded-full transition-all duration-300 ${i === index ? "h-3 w-8 bg-[#C9873A]" : "h-3 w-3 bg-[#592209]/25 hover:bg-[#592209]/40"}`} />
          </button>
        ))}
      </div>

      <p className="mx-auto mt-3 max-w-2xl text-center text-xs italic leading-relaxed text-[#6B4A37]">
        These are publicly known professional spellings used in film and media credits. The numbers are calculated here with traditional numerology. They are for curiosity and education only, and do not show that a spelling caused anyone’s success.
      </p>
    </section>
  );
}
