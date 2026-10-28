import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

const TRUST_INDICATORS = [
  "AI + Vedic Astrology Powered",
  "Personalized Name Analysis",
  "Trusted by Thousands of Users",
];

const DEMO_EXAMPLES = [
  { name: "Rohan Mehta", variant: "Rohhan Mehta", before: 68, after: 91 },
  { name: "Ananya Singh", variant: "Ananyaa Singh", before: 61, after: 88 },
  { name: "Karan Verma", variant: "Karran Verma", before: 72, after: 94 },
];

const FLOATING_CARDS = [
  { icon: "⭐", label: "Name Energy Score" },
  { icon: "🪐", label: "Dominant Planet" },
  { icon: "🔢", label: "Destiny Number" },
  { icon: "📿", label: "Lucky Name Vibration" },
  { icon: "✨", label: "Best Professional Spelling" },
];

const CARD_POSITIONS: CSSProperties[] = [
  { top: "-3%", left: "2%" },
  { top: "10%", right: "-10%" },
  { bottom: "8%", right: "-6%" },
  { bottom: "-5%", left: "14%" },
  { top: "42%", left: "-12%" },
];

const SEED_SYLLABLES = ["ॐ", "ऐं", "ह्रीं", "श्रीं"];

function useCycler(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(t);
  }, [length, intervalMs]);
  return index;
}

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setDisplay(0);
    let start = 0;
    const step = value / 20;
    const t = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(t);
      } else setDisplay(Math.round(start));
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

function NameTransformDemo() {
  const index = useCycler(DEMO_EXAMPLES.length, 4000);
  const ex = DEMO_EXAMPLES[index];
  return (
    <div className="glass-card rounded-2xl px-6 py-5 max-w-sm mx-auto lg:mx-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3 text-center mb-4">
            <span className="text-white/45 text-sm line-through decoration-white/25">{ex.name}</span>
            <ArrowRight className="text-[#ff7e47]" size={14} />
            <span className="text-white font-semibold text-sm">{ex.variant}</span>
          </div>
          <div className="flex items-center justify-center gap-5">
            <div className="text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Before</div>
              <div className="text-2xl font-extrabold text-white/40">{ex.before}%</div>
            </div>
            <div className="text-[#ff7e47] text-xl">→</div>
            <div className="text-center">
              <div className="text-[10px] text-[#ff7e47] uppercase tracking-widest mb-1">After</div>
              <div className="text-2xl font-extrabold text-white">
                <AnimatedScore value={ex.after} />%
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FloatingCard({ card, index }: { card: { icon: string; label: string }; index: number }) {
  return (
    <motion.div
      className="absolute z-10 hidden sm:block"
      style={CARD_POSITIONS[index]}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
    >
      <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
        <span className="text-base leading-none">{card.icon}</span>
        <span className="text-[11px] font-semibold text-white/80 whitespace-nowrap">{card.label}</span>
      </div>
    </motion.div>
  );
}

function MandalaVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px * 12, y: py * -12 });
  }
  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-square max-w-[420px] mx-auto"
    >
      <motion.div
        animate={{ x: tilt.x, y: tilt.y }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Rotating rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{ border: "1px dashed rgba(255,126,71,0.25)" }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute inset-10 rounded-full"
          style={{ border: "1px solid rgba(255,126,71,0.15)" }}
        />

        {/* Orbiting Sanskrit seed syllables */}
        {SEED_SYLLABLES.map((s, i) => (
          <motion.div
            key={s}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 30 + i * 7, repeat: Infinity, ease: "linear" }}
          >
            <span
              className="absolute text-[#ff7e47]/60 text-lg"
              style={{ fontFamily: "'Astra','Cinzel',serif", top: 0, left: "50%", transform: "translate(-50%,-50%)" }}
            >
              {s}
            </span>
          </motion.div>
        ))}

        {/* Central glowing core */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-40 h-40 rounded-full flex items-center justify-center"
          style={{ background: "radial-gradient(circle, rgba(255,126,71,0.35) 0%, rgba(255,126,71,0.08) 60%, transparent 80%)" }}
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(255,126,71,0.15)", border: "1px solid rgba(255,126,71,0.4)" }}>
            <Sparkles className="text-[#ff7e47]" size={28} />
          </div>
        </motion.div>

        {FLOATING_CARDS.map((card, i) => (
          <FloatingCard key={card.label} card={card} index={i} />
        ))}
      </motion.div>
    </div>
  );
}

export default function PremiumHero({
  onStart,
  onViewSample,
}: {
  onStart: () => void;
  onViewSample: () => void;
}) {
  return (
    <section className="relative py-10 md:py-16 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-8 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[rgba(255,126,71,0.12)] text-[#ff7e47] text-xs font-semibold tracking-widest uppercase mb-5">
            <Sparkles size={12} /> Cosmic Blueprint
          </div>

          <h1
            className="uppercase"
            style={{
              fontFamily: "'Astra','Cinzel',serif",
              fontSize: "clamp(30px,4.2vw,52px)",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.02em",
              lineHeight: 1.18,
              marginBottom: 18,
            }}
          >
            Can Your Name Unlock a Better Destiny?
          </h1>

          <p className="text-white/60 text-base md:text-lg max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
            According to Vedic astrology and numerology, every name carries a unique vibration.
            Discover whether your current name aligns with your birth chart, life path, and
            planetary energies.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-8">
            <button
              onClick={onStart}
              className="ndr-glow-btn"
              style={{
                padding: "17px 34px",
                background: "#ff7e47",
                border: "none",
                borderRadius: 40,
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 0 30px rgba(255,126,71,0.35)",
                transition: "transform 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Start Free Name Analysis
            </button>
            <button
              onClick={onViewSample}
              style={{
                padding: "17px 34px",
                background: "transparent",
                border: "1.5px solid rgba(255,126,71,0.4)",
                borderRadius: 40,
                color: "#ff7e47",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,126,71,0.08)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              View Sample Report
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mb-10">
            {TRUST_INDICATORS.map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-white/50">
                <CheckCircle2 size={13} className="text-[#ff7e47]" /> {t}
              </div>
            ))}
          </div>

          <NameTransformDemo />
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <MandalaVisualization />
        </motion.div>
      </div>
    </section>
  );
}
