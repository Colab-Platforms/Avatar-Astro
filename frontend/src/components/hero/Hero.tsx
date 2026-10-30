import { Link } from "react-router-dom";
import { ArrowRight, Gem, ShieldCheck, Globe2, MapPinned, Sparkles } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useFeatureFlags } from "@/lib/featureFlags";

const stats = [
  { icon: Gem, value: "50,000+", label: "Happy Users" },
  { icon: ShieldCheck, value: "Verified", label: "Astrologers" },
  { icon: Globe2, value: "13+", label: "Languages" },
  { icon: MapPinned, value: "60+", label: "Countries" },
];

/** A few tiny stars: position (% of the section), size in px. Decorative only. */
const STARS: [number, number, number][] = [
  [7, 22, 3], [14, 64, 2], [46, 12, 2], [92, 18, 3], [88, 74, 2], [58, 90, 2],
];

/**
 * Two-column hero. The solar-system video keeps its dark space artwork inside a
 * rounded frame; everything around it is light, with lavender washes and thin
 * orbital rings as the only decoration.
 */
const Hero = () => {
  const { isPathDisabled } = useFeatureFlags();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate w-full overflow-hidden pb-12 pt-24 lg:pb-20 lg:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
          background:
            "radial-gradient(55% 50% at 88% 18%, rgba(250,247,241,0.95) 0%, transparent 70%), radial-gradient(40% 45% at 8% 4%, rgba(185,154,100,0.22) 0%, transparent 70%), radial-gradient(45% 40% at 60% 95%, rgba(250,247,241,0.7) 0%, transparent 70%)",
        }}
      />
      {/* thin orbital rings */}
      <div aria-hidden="true" className="hl-orbit pointer-events-none absolute -right-[18%] top-[-30%] -z-10 hidden h-[900px] w-[900px] lg:block" />
      <div aria-hidden="true" className="hl-orbit pointer-events-none absolute -right-[8%] top-[-12%] -z-10 hidden h-[620px] w-[620px] lg:block" />
      <div aria-hidden="true" className="hl-orbit pointer-events-none absolute -left-[12%] bottom-[-35%] -z-10 h-[520px] w-[520px]" />
      {STARS.map(([x, y, s], i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute -z-10 rounded-full bg-home-gold ${i > 3 ? "hidden sm:block" : ""}`}
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s }}
        />
      ))}

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* ── Left: copy ─────────────────────────────────────────── */}
          <div className="hl-rise text-center lg:text-left">
            <p className="hl-eyebrow mb-5 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-home-gold" aria-hidden="true" />
              AI astrology &amp; spiritual guidance
            </p>

            <h1 className="hl-serif mb-6 text-[2.2rem] font-bold leading-[1.12] tracking-[0.01em] text-home-ink sm:text-5xl xl:text-[3.4rem]">
              <span className="block">AI Astrology for</span>{" "}
              <span className="block text-home-gerua">Every Moment of</span>{" "}
              <span className="block">Your Life</span>
            </h1>

            <p className="mx-auto mb-9 max-w-xl font-home-sans text-base leading-relaxed text-home-muted md:text-lg lg:mx-0">
              Get your Birth Chart, Tarot Reading, Name Analysis, Palm Reading,
              Compatibility Report, Live Darshan, and AI-powered spiritual
              guidance—all in one place.
            </p>

            <div className="mb-12 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              {!isPathDisabled("/birth-chart") && (
                <Link to="/birth-chart" className="hl-btn group w-full sm:w-auto">
                  Start Free Reading
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )}
              {!isPathDisabled("/zodiac") && (
                <Link to="/zodiac" className="hl-btn-ghost w-full sm:w-auto">
                  Explore Tools
                </Link>
              )}
            </div>

            <dl className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 lg:justify-start">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  <div className="flex items-center gap-2.5 text-left">
                    <s.icon className="h-5 w-5 shrink-0 text-home-gerua" strokeWidth={1.75} aria-hidden="true" />
                    <div className="leading-tight">
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="font-home-sans text-base font-bold text-home-ink">{s.value}</dd>
                      <dd className="font-home-sans text-xs text-home-muted">{s.label}</dd>
                    </div>
                  </div>
                  {i < stats.length - 1 && <span aria-hidden="true" className="hidden h-8 w-px bg-home-line sm:block" />}
                </div>
              ))}
            </dl>
          </div>

          {/* ── Right: rounded solar-system image ──────────────────── */}
          <div className="hl-rise relative mx-auto w-full max-w-[640px]" style={{ animationDelay: "120ms" }}>
            <div
              aria-hidden="true"
              className="absolute -inset-3 -z-10 rotate-2 rounded-[2rem] sm:-inset-4"
              style={{ background: "linear-gradient(135deg, #EFE5D7 0%, #B99A64 100%)", opacity: 0.6 }}
            />
            <div className="relative aspect-video overflow-hidden rounded-[1.75rem] border-4 border-home-ivory shadow-[0_24px_50px_rgba(140,63,24,0.28)]">
              <video
                src="/images/temples/Solar_system.mp4"
                poster="/images/hero/solar-system-poster.jpg"
                autoPlay={!reduceMotion}
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            </div>
            <Sparkles aria-hidden="true" className="absolute -right-2 -top-6 h-9 w-9 text-home-gold sm:-right-5" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
