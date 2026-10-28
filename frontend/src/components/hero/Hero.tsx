import { Link } from "react-router-dom";
import { ArrowRight, Gem, ShieldCheck, Globe2, MapPinned } from "lucide-react";
import { useReducedMotion } from "framer-motion";

const stats = [
  { icon: Gem, value: "50,000+", label: "Happy Users" },
  { icon: ShieldCheck, value: "Verified", label: "Astrologers" },
  { icon: Globe2, value: "13+", label: "Languages" },
  { icon: MapPinned, value: "60+", label: "Countries" },
];

const CREAM = "255,243,236";

/**
 * Full-viewport hero: the solar-system video fills the section and the copy sits
 * on a cream wash on the left. The wash is strong enough under the text that ink
 * stays above 4.5:1 even if the video frame behind it is black.
 */
const Hero = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative -mt-8 flex min-h-screen w-full items-center overflow-hidden pb-12 pt-28 lg:pt-32"
      style={{ minHeight: "100svh" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ maskImage: "linear-gradient(#000 0%, #000 78%, transparent 100%)", WebkitMaskImage: "linear-gradient(#000 0%, #000 78%, transparent 100%)" }}
      >
        <video
          src="/images/temples/Solar_system.mp4"
          poster="/images/hero/solar-system-poster.jpg"
          autoPlay={!reduceMotion}
          loop
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* cream washes: even on small screens, graded left-to-right on large ones */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 lg:hidden" style={{ background: `rgba(${CREAM},0.88)` }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          background: `linear-gradient(90deg, rgba(${CREAM},0.95) 0%, rgba(${CREAM},0.88) 38%, rgba(${CREAM},0.3) 68%, rgba(${CREAM},0) 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: `linear-gradient(rgba(${CREAM},0.9) 0%, rgba(${CREAM},0) 100%)` }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="hl-rise mx-auto max-w-xl text-center lg:mx-0 lg:max-w-[34rem] lg:text-left">
          <h1 className="hl-serif mb-6 text-[1.65rem] font-bold leading-[1.14] tracking-[0.02em] text-home-ink min-[380px]:text-3xl sm:text-4xl xl:text-5xl">
            <span className="block">AI Astrology for</span>{" "}
            <span className="block text-home-rust">Every Moment of</span>{" "}
            <span className="block">Your Life</span>
          </h1>

          <p className="mx-auto mb-9 max-w-[30rem] font-home-sans text-[1rem] leading-[1.5] text-home-ink/85 md:text-[1.125rem] lg:mx-0">
            Get your Birth Chart, Tarot Reading, Name Analysis, Palm Reading,
            Compatibility Report, Live Darshan, and AI-powered spiritual
            guidance—all in one place.
          </p>

          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link to="/birth-chart" className="hl-btn group">
              Start Free Reading
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/zodiac" className="hl-btn-ghost bg-home-cream/60 backdrop-blur-sm">
              Explore Tools
            </Link>
          </div>

          <dl className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 lg:justify-start">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-6">
                <div className="flex items-center gap-2.5 text-left">
                  <s.icon className="h-5 w-5 shrink-0 text-home-rust" strokeWidth={1.75} aria-hidden="true" />
                  <div className="leading-tight">
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-home-sans text-base font-bold text-home-ink">{s.value}</dd>
                    <dd className="font-home-sans text-xs text-home-ink/75">{s.label}</dd>
                  </div>
                </div>
                {i < stats.length - 1 && <span aria-hidden="true" className="hidden h-8 w-px bg-home-ink/15 sm:block" />}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default Hero;
