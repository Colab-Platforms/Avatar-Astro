import { MotionConfig } from "framer-motion";
import ZodiacWheelSection from "@/components/ZodiacWheelSection";
import Hero from "@/components/hero/Hero";
import AstrologyToolsSection from "@/components/AstrologyToolsSection";
import HomeAstrologersSection from "@/components/HomeAstrologersSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import HomeBlogSection from "@/components/HomeBlogSection";
import WhyAstrologySection from "@/components/WhyAstrologySection";
import FaqSection from "@/components/FaqSection";
import PublishedBanners from "@/components/PublishedBanners";

/* ── Component ─────────────────────────────────────────────────────────── */

const Index = () => {
  return (
    // reducedMotion="user": framer-motion skips transform animations for users
    // who prefer reduced motion, so content simply appears.
    <MotionConfig reducedMotion="user">
      <div className="relative">
        <div className="relative z-10">
          {/* ── HERO ──────────────────────────────────────────────────── */}
          <Hero />

          {/* ── BANNERS PUBLISHED FROM THE ADMIN PANEL (renders nothing if none) ── */}
          <PublishedBanners />

          {/* ── ASTROLOGY TOOLS ──────────────────────────────────────── */}
          <AstrologyToolsSection />

          {/* ── CONSULT ASTROLOGERS ───────────────────────────────────── */}
          <HomeAstrologersSection />

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
    </MotionConfig>
  );
};

export default Index;
