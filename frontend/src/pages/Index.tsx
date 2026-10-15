import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ZodiacWheelSection from "@/components/ZodiacWheelSection";
import Hero from "@/components/hero/Hero";
import AstrologyToolsSection from "@/components/AstrologyToolsSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import HomeBlogSection from "@/components/HomeBlogSection";
import WhyAstrologySection from "@/components/WhyAstrologySection";
import FaqSection from "@/components/FaqSection";

/* ── Component ─────────────────────────────────────────────────────────── */

const Index = () => {
  return (
    <div className="relative">
      <div className="relative z-10">
        {/* ── HERO ──────────────────────────────────────────────────── */}
        <Hero />

        {/* ── ASTROLOGY TOOLS ──────────────────────────────────────── */}
        <AstrologyToolsSection />

        {/* ── EXPLORE SOLAR SYSTEM ──────────────────────────────────── */}
        <section className="relative z-10 py-16 flex flex-col items-center text-center px-6">
          <div
            className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden flex flex-col items-center justify-center py-16 px-8"
            style={{
              background:
                "linear-gradient(135deg, rgba(8,20,38,0.85) 0%, rgba(11,42,91,0.6) 50%, rgba(8,20,38,0.85) 100%)",
              border: "1px solid rgba(188,106,77,0.18)",
              boxShadow: "0 0 80px rgba(11,42,91,0.4)",
            }}
          >
            {/* Decorative orbit ring */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(18,58,117,0.25) 0%, transparent 70%)",
              }}
            />

            <p
              className="text-xs font-display tracking-[0.35em] uppercase mb-4"
              style={{ color: "#BC6A4D" }}
            >
              Interactive Experience
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-widest uppercase mb-4 leading-tight text-white">
              Explore the
              <span className="block" style={{ color: "#BC6A4D" }}>
                Solar System
              </span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mb-10 leading-relaxed">
              Journey through our cosmic neighbourhood — orbit planets, discover
              their mysteries, and feel the scale of the universe.
            </p>

            <Link
              to="/solar-system"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-display text-sm tracking-[0.22em] uppercase transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #BC6A4D, #D9895F)",
                color: "#020B1F",
                fontWeight: 700,
                boxShadow: "0 0 32px rgba(188,106,77,0.35)",
              }}
            >
              <span>Launch Solar System</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* ── FEATURE SHOWCASE ──────────────────────────────────────── */}
        <FeatureShowcase />

        {/* ── ZODIAC SIGNS CAROUSEL ─────────────────────────────────── */}
        <ZodiacWheelSection />

        {/* ── OUR ASTROLOGY (BLOG) ──────────────────────────────────── */}
        <HomeBlogSection />

        {/* ── WHY DO YOU NEED ASTROLOGY ─────────────────────────────── */}
        <WhyAstrologySection />

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <FaqSection />
      </div>
    </div>
  );
};

export default Index;
