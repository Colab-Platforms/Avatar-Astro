import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

function CircularGauge({ value, color, label, sub }: { value: number; color: string; label: string; sub: string }) {
  const [animated, setAnimated] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(value);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative w-40 h-40 sm:w-44 sm:h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{animated}%</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

export default function DestinyHero({
  profile,
  topVariant,
}: {
  profile: NameProfileScore;
  topVariant?: NameVariant;
}) {
  return (
    <div className="px-6 sm:px-10 pt-10 pb-8 text-center">
      <div className="inline-block px-4 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-semibold tracking-widest uppercase mb-4">
        ✨ Cosmic Blueprint
      </div>
      <h2
        className="ndr-gradient-text text-3xl sm:text-5xl font-extrabold leading-tight mb-3 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        Your Cosmic Blueprint
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-base sm:text-lg">
        Your name carries a unique vibration. Our AI combines Astrology, Numerology and Planetary
        Analysis to discover the spelling that aligns with your life path.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
        <CircularGauge value={profile.overallScore} color="#592209" label="Current Alignment" sub={`"${profile?.destinyPlanet}" energy`} />
        {topVariant && (
          <CircularGauge value={topVariant.score} color="#ff7e47" label="Recommended Alignment" sub={`"${topVariant.spelling}"`} />
        )}
      </div>
    </div>
  );
}
