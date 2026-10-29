import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

const SPANS = [
  { key: "1m", label: "1 Month" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "3y", label: "3 Years" },
] as const;

const SPAN_COPY: Record<string, { current: string; recommended: string }> = {
  "1m": {
    current: "A steady, familiar rhythm continues — small wins, few surprises.",
    recommended: "Early shifts in how people respond to you may start to appear.",
  },
  "6m": {
    current: "Growth stays within your usual patterns and comfort zone.",
    recommended: "Momentum tends to build in career and social opportunities.",
  },
  "1y": {
    current: "Progress continues at a moderate, predictable pace.",
    recommended: "A stronger alignment between effort and outcome may emerge.",
  },
  "3y": {
    current: "Long-term trajectory follows your established life pattern.",
    recommended: "Compounding alignment may support bigger milestones — directional, not guaranteed.",
  },
};

export default function FutureTimeline({
  name,
  profile,
  topVariant,
}: {
  name: string;
  profile: NameProfileScore;
  topVariant?: NameVariant;
}) {
  const [active, setActive] = useState<(typeof SPANS)[number]["key"]>("6m");
  const copy = SPAN_COPY[active];

  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        Future Timeline
      </h3>
      <p className="text-center text-muted-foreground mb-6 text-sm">Projected alignment — directional guidance, not a guarantee.</p>

      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {SPANS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              active === s.key ? "bg-gradient-to-r from-gold to-gold-dim text-cosmic-dark" : "bg-muted/60 text-foreground/70 hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="rounded-2xl border border-border p-5">
            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Current — "{name}"</div>
            <p className="text-sm text-foreground/80">{copy.current}</p>
          </div>
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
            <div className="text-xs font-bold text-gold uppercase mb-2">
              Recommended{topVariant ? ` — "${topVariant.spelling}"` : ""}
            </div>
            <p className="text-sm text-foreground/90">{copy.recommended}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
