import { motion } from "framer-motion";

/**
 * Purely decorative backdrop layered above StarCanvas: nebula glows, a slow-
 * rotating mandala ring, faint constellation lines and drifting gold
 * particles. Kept subtle/pointer-events-none so it never competes with
 * foreground content.
 */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 2 + (i % 3),
  duration: 14 + (i % 5) * 3,
  delay: (i % 7) * 0.8,
}));

const CosmicOverlay = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {/* Nebula glows */}
    <div
      className="absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full opacity-[0.14] blur-3xl"
      style={{ background: "radial-gradient(circle, #FF9D4D 0%, transparent 70%)" }}
    />
    <div
      className="absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full opacity-[0.10] blur-3xl"
      style={{ background: "radial-gradient(circle, #F5C76E 0%, transparent 70%)" }}
    />
    <div
      className="absolute top-1/3 right-1/4 h-[320px] w-[320px] rounded-full opacity-[0.08] blur-3xl"
      style={{ background: "radial-gradient(circle, #E88B3D 0%, transparent 70%)" }}
    />

    {/* Faint constellation lines */}
    <svg className="absolute inset-0 h-full w-full opacity-[0.08]" preserveAspectRatio="none">
      <line x1="8%" y1="12%" x2="22%" y2="28%" stroke="#F5C76E" strokeWidth="1" />
      <line x1="22%" y1="28%" x2="18%" y2="46%" stroke="#F5C76E" strokeWidth="1" />
      <line x1="78%" y1="10%" x2="92%" y2="22%" stroke="#F5C76E" strokeWidth="1" />
      <line x1="92%" y1="22%" x2="86%" y2="40%" stroke="#F5C76E" strokeWidth="1" />
      <line x1="70%" y1="70%" x2="84%" y2="82%" stroke="#F5C76E" strokeWidth="1" />
    </svg>

    {/* Slow-rotating mandala ring, centered behind the hero */}
    <motion.svg
      className="absolute left-1/2 top-[30%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
      viewBox="0 0 200 200"
      animate={{ rotate: 360 }}
      transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="100" cy="100" r="94" stroke="#F5C76E" strokeWidth="0.5" fill="none" />
      <circle cx="100" cy="100" r="76" stroke="#F5C76E" strokeWidth="0.5" fill="none" />
      <circle cx="100" cy="100" r="58" stroke="#F5C76E" strokeWidth="0.5" fill="none" />
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x1 = 100 + Math.cos(angle) * 58;
        const y1 = 100 + Math.sin(angle) * 58;
        const x2 = 100 + Math.cos(angle) * 94;
        const y2 = 100 + Math.sin(angle) * 94;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5C76E" strokeWidth="0.5" />;
      })}
    </motion.svg>

    {/* Drifting golden particles */}
    {PARTICLES.map((p) => (
      <motion.span
        key={p.id}
        className="absolute rounded-full bg-[#F5C76E]"
        style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
        animate={{ y: [0, -18, 0], opacity: [0.15, 0.55, 0.15] }}
        transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}

    {/* Temple silhouette, bottom edge */}
    <svg
      className="absolute bottom-0 left-1/2 h-40 w-full -translate-x-1/2 opacity-[0.05]"
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMax slice"
    >
      <path
        d="M0,100 L0,70 L40,70 L40,55 L60,55 L60,40 L75,20 L90,40 L90,55 L110,55 L110,70 L160,70 L160,45 L180,45 L200,15 L220,45 L240,45 L240,70 L290,70 L290,55 L310,55 L310,40 L325,20 L340,40 L340,55 L360,55 L360,70 L400,70 L400,100 Z"
        fill="#F5C76E"
      />
    </svg>
  </div>
);

export default CosmicOverlay;
