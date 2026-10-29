import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

function DeltaPill({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${positive ? "bg-emerald-500/10 text-emerald-800" : "bg-rose-500/10 text-rose-800"}`}>
      {positive ? "+" : ""}
      {value}% {label}
    </span>
  );
}

export default function NameSimulationDeltas({
  name,
  profile,
  topVariants,
}: {
  name: string;
  profile: NameProfileScore;
  topVariants: NameVariant[];
}) {
  return (
    <div className="px-6 sm:px-10 pb-12">
      <div className="flex items-center justify-center gap-2 mb-2">
        <TrendingUp size={22} className="text-gold" />
        <h3
          className="text-2xl sm:text-3xl font-bold text-foreground text-center uppercase tracking-wide"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          AI Name Simulation
        </h3>
      </div>
      <p className="text-center text-muted-foreground mb-1 text-sm max-w-xl mx-auto">
        Simulated directional impact of each spelling — an alignment signal, not a guaranteed real-world outcome.
      </p>

      <div className="max-w-3xl mx-auto mt-6">
        <div className="rounded-2xl bg-muted/50 border border-border px-5 py-3 mb-4 text-center">
          <span className="text-xs font-bold text-muted-foreground uppercase">Current Name</span>
          <div className="font-semibold text-foreground">{name} · {profile.overallScore}% Alignment</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topVariants.slice(0, 4).map((v, i) => (
            <motion.div
              key={v.spelling}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground">Option {i + 1}: {v.spelling}</span>
                <span className="text-sm font-extrabold text-gold">{v.score}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <DeltaPill label="Career" value={v.deltas.career} />
                <DeltaPill label="Business" value={v.deltas.business} />
                <DeltaPill label="Wealth" value={v.deltas.wealth} />
                <DeltaPill label="Relationships" value={v.deltas.relationship} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
