import { motion } from "framer-motion";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

function buildBars(seed: number, count = 28) {
  const bars: number[] = [];
  let v = seed || 1;
  for (let i = 0; i < count; i++) {
    v = (v * 9301 + 49297) % 233280;
    bars.push(20 + (v / 233280) * 80);
  }
  return bars;
}

function Wave({ seed, color }: { seed: number; color: string }) {
  const bars = buildBars(seed);
  return (
    <div className="flex items-end justify-center gap-1 h-24">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full"
          style={{ background: color }}
          initial={{ height: 6 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.02, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.2 }}
        />
      ))}
    </div>
  );
}

export default function NameFrequencyWave({
  profile,
  topVariant,
}: {
  profile: NameProfileScore;
  topVariant?: NameVariant;
}) {
  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        Name Frequency Wave
      </h3>
      <p className="text-center text-muted-foreground mb-6 text-sm">A visual representation of your name's energetic vibration.</p>

      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-3 text-center">Current Wave</div>
          <Wave seed={profile.destiny * 17 + profile.chaldean} color="#8a7360" />
        </div>
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <div className="text-xs font-bold text-gold uppercase mb-3 text-center">Recommended Wave</div>
          <Wave seed={(topVariant?.score || profile.overallScore) * 23 + 7} color="#592209" />
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto mt-6">
        {topVariant
          ? `Shifting toward "${topVariant.spelling}" tends to produce a steadier, more resonant wave pattern — a directional signal, not a measurable acoustic property.`
          : "Your current name produces a distinct energetic pattern shaped by its numerology."}
      </p>
    </div>
  );
}
