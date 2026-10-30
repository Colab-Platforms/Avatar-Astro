import { useMemo } from "react";
import { motion } from "framer-motion";

interface Particle {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  peakOpacity: number;
}

const PARTICLE_COUNT = 36;

// Deterministic pseudo-random so the layout doesn't reshuffle on re-render.
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Hero-local decoration layered above the app-wide CosmicBackground: a
 * couple of soft nebula gradients plus a handful of slow-drifting, gently
 * twinkling particles. Kept intentionally sparse so it reads as premium
 * detail rather than clutter.
 */
const Stars = () => {
  const particles = useMemo<Particle[]>(() => {
    const rand = seeded(0x51a2f1);
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      left: rand() * 100,
      top: rand() * 100,
      size: 1 + rand() * 1.8,
      duration: 4 + rand() * 6,
      delay: rand() * 5,
      peakOpacity: 0.25 + rand() * 0.5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Nebula gradients */}
      <div
        className="absolute -top-24 right-0 w-[42rem] h-[42rem] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(89,34,9,0.5) 0%, rgba(89,34,9,0) 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[34rem] h-[34rem] rounded-full opacity-[0.12] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(76,110,220,0.55) 0%, rgba(76,110,220,0) 70%)",
        }}
      />

      {/* Floating twinkling particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#f5e6d3]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            opacity: [0, p.peakOpacity, 0],
            y: [0, -14, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default Stars;
