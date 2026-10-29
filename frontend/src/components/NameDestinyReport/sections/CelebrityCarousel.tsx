import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";
import { CELEBRITY_NAME_CHANGES } from "../lib/celebrityData";

const AUTO_PLAY_MS = 4000;

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 70 : -70, scale: 0.94 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -70 : 70, scale: 0.94 }),
};

/**
 * Landing-page component — intentionally self-contained with only local
 * component state. Must never depend on report generation, unlock state,
 * or any API/backend call, so it always renders on first paint.
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

  // Re-arms on every index change (including manual nav), so autoplay never
  // fires within a few hundred ms of a manual click/swipe — that collision
  // was overlapping two transitions and ghosting the exiting slide's text.
  useEffect(() => {
    if (paused) return;
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

  return (
    <div className="px-6 sm:px-10 py-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        ⭐ Real-Life Celebrity Name Changes
      </h3>
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8 text-sm sm:text-base">
        Discover how several celebrities use a different professional name spelling in their credits.
        Your AI report analyzes whether your own name spelling is aligned with your birth chart and
        numerology.
      </p>

      <div
        className="relative max-w-[480px] mx-auto"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button
          type="button"
          onClick={prev}
          aria-label="Previous celebrity"
          className="absolute z-20 top-1/2 -translate-y-1/2 left-1 sm:-left-14 w-10 h-10 rounded-full bg-card/90 border border-border backdrop-blur shadow-lg flex items-center justify-center text-gold hover:bg-card transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next celebrity"
          className="absolute z-20 top-1/2 -translate-y-1/2 right-1 sm:-right-14 w-10 h-10 rounded-full bg-card/90 border border-border backdrop-blur shadow-lg flex items-center justify-center text-gold hover:bg-card transition-colors"
        >
          <ChevronRight size={20} />
        </button>

        <div className="overflow-hidden rounded-2xl">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={c.currentName}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted cursor-grab active:cursor-grabbing"
            >
              <div className="relative aspect-[4/5] w-full">
                <img
                  src={c.photo}
                  alt={`${c.currentName} portrait`}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />

                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur text-white text-[11px] font-semibold uppercase tracking-wide">
                  {c.profession}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-6 pt-16 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-center">
                  {c.isStageName && (
                    <div className="text-foreground/70 text-[10px] font-semibold uppercase tracking-widest mb-1">Birth Name</div>
                  )}
                  <div className="text-foreground/80 text-lg font-medium leading-tight">{c.previousSpelling}</div>
                  <div className="flex justify-center my-2">
                    <ArrowDown size={16} className="text-foreground/70" />
                  </div>
                  <div
                    className="text-foreground font-extrabold text-3xl sm:text-4xl leading-tight uppercase tracking-wide mb-3"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    {c.currentName}
                    {c.isStageName && <span className="block text-xs tracking-widest text-foreground/70 normal-case mt-1">(Stage Name)</span>}
                  </div>
                  <p className="text-foreground/85 text-sm leading-relaxed">{c.description}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination dots — each button carries a 44x44 touch target (16px
          padding around the visible dot); adjacent buttons pull together
          with -mx-2.5 so the VISIBLE gap between dots stays 12px even
          though their invisible hit areas overlap slightly. */}
      <div className="flex justify-center items-center mt-2" role="tablist" aria-label="Celebrity carousel navigation">
        {items.map((it, i) => (
          <button
            key={it.currentName}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to ${it.currentName}`}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            className="relative flex items-center justify-center p-4 -mx-2.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <span
              className={`block rounded-full transition-all duration-[350ms] ease-out ${
                i === index
                  ? "w-8 h-3 bg-gold opacity-100 shadow-[0_0_10px_2px_hsl(var(--gold)/0.6)]"
                  : "w-3 h-3 bg-primary/10 opacity-100 hover:bg-primary/10"
              }`}
            />
          </button>
        ))}
      </div>

      <p className="text-center text-muted-foreground max-w-2xl mx-auto mt-3 text-xs italic leading-relaxed">
        These examples reflect publicly known professional name spellings used in film and media
        credits. They are shown for educational purposes only and should not be interpreted as
        evidence that a spelling change alone determines success.
      </p>
    </div>
  );
}
