import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useFeatureFlags } from "@/lib/featureFlags";
import { FEATURES } from "@/data/featureCatalog";

/** First section under the hero — the Astrology Tools block on this page. */
const NEXT_SECTION_ID = "astrology-tools";

/**
 * Static editorial hero. The artwork is a decorative local image: on desktop it fills
 * the section with the cream copy side kept clear by a left-only gradient; on mobile
 * it becomes its own band above the copy so the subject is never covered by text.
 */
const Hero = () => {
  const { isPathDisabled } = useFeatureFlags();
  const reduceMotion = useReducedMotion();

  const scrollToNext = (e: React.MouseEvent<HTMLElement>) => {
    const el = document.getElementById(NEXT_SECTION_ID);
    if (!el) return; // fall back to the href hash
    e.preventDefault();
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };

  return (
    <section
      className="relative isolate flex w-full flex-col overflow-hidden bg-home-parchment lg:min-h-[max(620px,calc(100svh-2rem))]"
      aria-label="Introduction"
    >
      {/* ── Artwork ─────────────────────────────────────────────── */}
      <div className="relative order-first h-[min(62vw,360px)] w-full shrink-0 overflow-hidden lg:absolute lg:inset-0 lg:-z-10 lg:h-auto">
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-inner">
            <img
              src="/images/hero/mybhagya-hero-base.webp"
              alt=""
              width={1672}
              height={941}
              decoding="async"
              {...{ fetchpriority: "high" }}
              className="block h-full w-full"
            />
            {/* the zodiac wheel only: its line-work cut from the artwork (the photo underneath has the static wheel smoothed away), turning slowly */}
            <div className="hero-wheel" />
          </div>
        </div>
        {/* desktop: cream wash on the copy side only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{ background: "linear-gradient(90deg, #F5E9D6 0%, rgba(245,233,214,0.95) 34%, rgba(245,233,214,0.68) 52%, rgba(245,233,214,0) 72%)" }}
        />
        {/* mobile / tablet: fade the band into the page */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 lg:hidden"
          style={{ background: "linear-gradient(to bottom, rgba(245,233,214,0), #F5E9D6)" }}
        />
      </div>

      {/* ── Copy ────────────────────────────────────────────────── */}
      <div className="container relative mx-auto flex flex-1 flex-col justify-center px-4 pb-16 pt-6 md:px-6 lg:pb-28 lg:pt-24">
        <div className="hl-rise max-w-[640px] lg:max-w-[min(60vw,860px)]">
          <h1 className="hl-serif mb-5 text-[1.85rem] font-semibold leading-[1.14] tracking-[-0.005em] text-home-ink sm:text-[2.4rem] lg:mb-7 lg:whitespace-nowrap lg:text-[clamp(2.4rem,3.3vw,3.4rem)] lg:leading-[1.1]">
            <span className="block">Discover Clarity,</span>
            <span className="block">Align Your Energy,</span>
            <span className="block text-home-gerua">Create a Better Tomorrow</span>
          </h1>

          <p className="mb-6 max-w-[34rem] font-home-sans text-base leading-relaxed text-home-muted md:text-lg lg:mb-7">
            Get accurate astrology insights, personalised guidance, and powerful Seva to help you make better decisions in love, career, health and life.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={`#${NEXT_SECTION_ID}`} onClick={scrollToNext} className="hl-btn group w-full sm:w-auto">
              Explore Astrology Seva
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </a>
            {!isPathDisabled(FEATURES.guru.path) && (
              <Link to={FEATURES.guru.path} className="hl-btn-ghost w-full sm:w-auto">
                Try {FEATURES.guru.name}
              </Link>
            )}
          </div>

        </div>
      </div>

    </section>
  );
};

export default Hero;
