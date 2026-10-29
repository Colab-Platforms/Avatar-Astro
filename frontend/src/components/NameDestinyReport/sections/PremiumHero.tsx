import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, CheckCircle2, ArrowRight, Star, Orbit, Hash, Gem, PenLine, type LucideIcon } from "lucide-react";

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

const FLOATING_CARDS: { Icon: LucideIcon; label: string; pos: CSSProperties; drift: number }[] = [
  { Icon: Star, label: "Name Energy Score", pos: { top: "3%", left: "0%" }, drift: 0 },
  { Icon: Orbit, label: "Dominant Planet", pos: { top: "17%", right: "0%" }, drift: 1 },
  { Icon: PenLine, label: "Best Professional Spelling", pos: { top: "47%", left: "-2%" }, drift: 2 },
  { Icon: Hash, label: "Destiny Number", pos: { bottom: "12%", right: "2%" }, drift: 3 },
  { Icon: Gem, label: "Lucky Name Vibration", pos: { bottom: "1%", left: "12%" }, drift: 4 },
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
            <span className="text-foreground/70 text-sm line-through decoration-white/25">{ex.name}</span>
            <ArrowRight className="text-[#592209]" size={14} />
            <span className="text-foreground font-semibold text-sm">{ex.variant}</span>
          </div>
          <div className="flex items-center justify-center gap-5">
            <div className="text-center">
              <div className="text-[10px] text-foreground/70 uppercase tracking-widest mb-1">Before</div>
              <div className="text-2xl font-extrabold text-foreground/70">{ex.before}%</div>
            </div>
            <div className="text-[#592209] text-xl">→</div>
            <div className="text-center">
              <div className="text-[10px] text-[#592209] uppercase tracking-widest mb-1">After</div>
              <div className="text-2xl font-extrabold text-foreground">
                <AnimatedScore value={ex.after} />%
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type FloatingCardData = (typeof FLOATING_CARDS)[number];

function CardBody({ card }: { card: FloatingCardData }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[#592209]/15 bg-[#FBF5EC]/95 py-2 pl-2 pr-4 shadow-[0_10px_24px_rgba(89,34,9,0.16)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#592209] text-[#F5E9D6]">
        <card.Icon size={15} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="whitespace-nowrap text-xs font-semibold text-[#301607]">{card.label}</span>
    </div>
  );
}

function FloatingCard({ card, reduce }: { card: FloatingCardData; reduce: boolean }) {
  return (
    <motion.div
      className="absolute z-10 hidden sm:block"
      style={card.pos}
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 3.4 + card.drift * 0.4, repeat: Infinity, ease: "easeInOut", delay: card.drift * 0.3 }}
    >
      <CardBody card={card} />
    </motion.div>
  );
}

function MandalaVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduce = !!useReducedMotion();

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
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
    <div>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative mx-auto aspect-square w-full max-w-[460px]"
      >
        <motion.div
          animate={{ x: tilt.x, y: tilt.y }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="relative flex h-full w-full items-center justify-center"
        >
          {/* soft warm halo */}
          <div
            aria-hidden="true"
            className="absolute inset-[8%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(229,138,69,0.28) 0%, rgba(229,138,69,0.08) 55%, transparent 72%)" }}
          />

          {/* outer dashed ring carrying the four seed syllables, kept upright */}
          <motion.div
            aria-hidden="true"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[3%] rounded-full"
            style={{ border: "1px dashed rgba(89,34,9,0.3)" }}
          />
          {SEED_SYLLABLES.map((glyph, i) => (
            <motion.div
              key={glyph}
              aria-hidden="true"
              className="absolute inset-[3%]"
              initial={{ rotate: i * 90 }}
              animate={reduce ? undefined : { rotate: i * 90 + 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            >
              <motion.span
                className="absolute left-1/2 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#592209]/25 bg-[#F5E9D6] text-base font-semibold text-[#592209]"
                style={{ x: "-50%", y: "-50%", fontFamily: "'Noto Sans Devanagari', 'DM Sans', system-ui, sans-serif" }}
                initial={{ rotate: -i * 90 }}
                animate={reduce ? undefined : { rotate: -i * 90 - 360 }}
                transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              >
                {glyph}
              </motion.span>
            </motion.div>
          ))}

          {/* inner thin ring */}
          <div aria-hidden="true" className="absolute inset-[14%] rounded-full" style={{ border: "1px solid rgba(89,34,9,0.18)" }} />

          {/* the astrolabe disc */}
          <motion.img
            src="/images/loader/astrolabe.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[17%] h-[66%] w-[66%] rounded-full"
            style={{ filter: "drop-shadow(0 18px 28px rgba(89,34,9,0.35))" }}
          />

          {/* pulsing sun glow over the disc centre */}
          <motion.div
            aria-hidden="true"
            animate={reduce ? undefined : { scale: [0.9, 1.15, 0.9], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full"
            style={{ inset: "41%", background: "radial-gradient(circle, rgba(255,236,170,0.8) 0%, rgba(255,200,110,0.35) 48%, transparent 74%)" }}
          />

          {FLOATING_CARDS.map((card) => (
            <FloatingCard key={card.label} card={card} reduce={reduce} />
          ))}
        </motion.div>
      </div>

      {/* phones: the same highlights as a tidy wrap beneath the disc */}
      <div className="mt-5 flex flex-wrap justify-center gap-2 sm:hidden">
        {FLOATING_CARDS.map((card) => (
          <CardBody key={card.label} card={card} />
        ))}
      </div>
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
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[rgba(255,126,71,0.12)] text-[#592209] text-xs font-semibold tracking-widest uppercase mb-5">
            <Sparkles size={12} /> Cosmic Blueprint
          </div>

          <h1
            className="uppercase"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: "clamp(30px,4.2vw,52px)",
              fontWeight: 700,
              color: "#301607",
              letterSpacing: "0.02em",
              lineHeight: 1.18,
              marginBottom: 18,
            }}
          >
            Can Your Name Unlock a Better Destiny?
          </h1>

          <p className="text-foreground/70 text-base md:text-lg max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
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
                background: "#592209",
                border: "none",
                borderRadius: 40,
                color: "#F5E9D6",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 0 30px rgba(89,34,9,0.35)",
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
                border: "1.5px solid rgba(89,34,9,0.4)",
                borderRadius: 40,
                color: "#592209",
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
              <div key={t} className="flex items-center gap-1.5 text-xs text-foreground/70">
                <CheckCircle2 size={13} className="text-[#592209]" /> {t}
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
