import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/** Centred call-to-action card for the interactive solar-system page. */
const SolarSystemSection = () => (
  <section className="relative z-10 flex flex-col items-center px-6 py-16 text-center" aria-labelledby="home-solar-h">
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-home-line bg-home-card px-8 py-16 shadow-[0_16px_40px_rgba(208,95,47,0.14)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 35%, rgba(254,159,48,0.2) 0%, transparent 68%)" }}
      />

      <p className="relative mb-4 font-home-sans text-xs font-semibold uppercase tracking-[0.3em] text-home-deep">
        Interactive Experience
      </p>
      <h2
        id="home-solar-h"
        className="hl-serif relative mb-4 text-4xl font-bold uppercase leading-tight tracking-widest text-home-ink md:text-5xl"
      >
        Explore the{" "}
        <span className="block text-home-rust">Solar System</span>
      </h2>
      <p className="relative mx-auto mb-10 max-w-md font-home-sans text-sm leading-relaxed text-home-muted md:text-base">
        Journey through our cosmic neighbourhood — orbit planets, discover
        their mysteries, and feel the scale of the universe.
      </p>

      <Link to="/solar-system" className="hl-btn group relative min-h-[52px] px-8 uppercase tracking-[0.22em]">
        Launch Solar System
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  </section>
);

export default SolarSystemSection;
