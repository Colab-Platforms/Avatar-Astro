import { motion } from "framer-motion";
import type { NameProfileScore } from "@/lib/numerology";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Tier = "best" | "growth" | "average" | "risk";

const TIER_STYLE: Record<Tier, { bg: string; label: string }> = {
  best: { bg: "bg-emerald-500", label: "Best Month" },
  growth: { bg: "bg-gold", label: "Growth Month" },
  average: { bg: "bg-muted", label: "Average Month" },
  risk: { bg: "bg-rose-400", label: "Risk Month" },
};

function tierForMonth(destiny: number, monthIndex: number): Tier {
  const v = (destiny * (monthIndex + 3)) % 10;
  if (v >= 8) return "best";
  if (v >= 6) return "growth";
  if (v <= 1) return "risk";
  return "average";
}

export default function LifeHeatmap({ profile }: { profile: NameProfileScore }) {
  const tiers = MONTHS.map((m, i) => ({ month: m, tier: tierForMonth(profile.destiny, i) }));

  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        AI Life Heatmap
      </h3>
      <p className="text-center text-muted-foreground mb-6 text-sm">A 12-month directional outlook based on your numerology profile.</p>

      <div className="max-w-2xl mx-auto grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
        {tiers.map((t, i) => (
          <motion.div
            key={t.month}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className={`rounded-xl ${TIER_STYLE[t.tier].bg} border border-border/50 aspect-square flex items-center justify-center text-foreground text-xs font-bold`}
          >
            {t.month}
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        {(Object.keys(TIER_STYLE) as Tier[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${TIER_STYLE[k].bg}`} />
            {TIER_STYLE[k].label}
          </div>
        ))}
      </div>
    </div>
  );
}
