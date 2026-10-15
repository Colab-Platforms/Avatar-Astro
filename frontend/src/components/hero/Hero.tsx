import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, Gem, ShieldCheck, Globe2, MapPinned } from "lucide-react";
import Stars from "./Stars";

const stats = [
  { icon: Gem, value: "50,000+", label: "Happy Users" },
  { icon: ShieldCheck, value: "Verified", label: "Astrologers" },
  { icon: Globe2, value: "13+", label: "Languages" },
  { icon: MapPinned, value: "60+", label: "Countries" },
];

const Hero = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springX = useSpring(mvX, { stiffness: 60, damping: 18, mass: 0.6 });
  const springY = useSpring(mvY, { stiffness: 60, damping: 18, mass: 0.6 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    mvX.set(relX * 22);
    mvY.set(relY * 22);
  };

  const handleMouseLeave = () => {
    mvX.set(0);
    mvY.set(0);
  };

  return (
    <section className="relative w-full overflow-hidden pt-28 pb-6 lg:pt-32 lg:pb-0 flex items-start">
      <Stars />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-[2fr_3fr] gap-14 lg:gap-6 items-center">
          {/* ── Left: copy ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            {/* Heading */}
            <h1 className="font-['Inter'] normal-case font-bold tracking-tight leading-[1.08] text-4xl sm:text-5xl xl:text-6xl mb-6">
              <span className="block text-white">AI Astrology for</span>
              <span className="block text-[#e8935f]">Every Moment of</span>
              <span className="block text-white">Your Life</span>
            </h1>

            {/* Description */}
            <p className="font-['Inter'] text-white/60 text-base md:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-9">
              Get your Birth Chart, Tarot Reading, Name Analysis, Palm Reading,
              Compatibility Report, Live Darshan, and AI-powered spiritual
              guidance—all in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12">
              <Link
                to="/birth-chart"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-['Inter'] font-semibold text-sm text-[#1a0f08] transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #f2a35f, #d9895f)",
                  boxShadow: "0 0 32px rgba(217,137,95,0.35)",
                }}
              >
                Start Free Reading
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/zodiac"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 font-['Inter'] font-semibold text-sm text-white/90 transition-colors duration-300 hover:border-white/40 hover:bg-white/[0.04]"
              >
                Explore Tools
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-7 gap-y-4">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  <div className="flex items-center gap-2.5">
                    <s.icon className="w-5 h-5 text-[#bc6a4d] shrink-0" strokeWidth={1.75} />
                    <div className="text-left leading-tight">
                      <div className="font-['Inter'] font-bold text-white text-base">
                        {s.value}
                      </div>
                      <div className="font-['Inter'] text-white/45 text-xs">
                        {s.label}
                      </div>
                    </div>
                  </div>
                  {i < stats.length - 1 && (
                    <span className="hidden sm:block h-8 w-px bg-white/10" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: solar system video ──────────────────────────── */}
          <div
            ref={sceneRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative flex items-center justify-center min-h-[320px] lg:min-h-[560px]"
          >
            <motion.div
              style={{ x: springX, y: springY }}
              className="relative w-full max-w-[720px] aspect-video overflow-hidden rounded-3xl"
            >
              <video
                src="/images/temples/Solar_system.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
