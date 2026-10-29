import { motion } from "framer-motion";
import type { NameProfileScore, NameVariant } from "@/lib/numerology";

function seedOffset(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 17;
  return h - 8; // -8..8
}

const CATEGORIES = ["Money", "Career", "Relationships", "Confidence", "Health", "Luck"];

export default function BeforeAfterCompare({
  name,
  profile,
  topVariant,
}: {
  name: string;
  profile: NameProfileScore;
  topVariant?: NameVariant;
}) {
  const currentOverall = profile.overallScore;
  const recommendedOverall = topVariant ? topVariant.score : currentOverall;

  const rows = [
    ...CATEGORIES.map((cat) => {
      const offset = seedOffset(name + cat);
      const current = Math.max(15, Math.min(96, currentOverall + offset));
      const recommended = Math.max(15, Math.min(98, recommendedOverall + offset + 4));
      return { cat, current, recommended };
    }),
    { cat: "Overall", current: currentOverall, recommended: recommendedOverall },
  ];

  return (
    <div className="px-6 sm:px-10 pb-10">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        Before vs After
      </h3>
      <p className="text-center text-muted-foreground mb-8 text-sm">
        {topVariant ? `"${name}" vs recommended spelling "${topVariant.spelling}"` : `"${name}" profile`}
      </p>
      <div className="max-w-2xl mx-auto space-y-5">
        {rows.map((r) => (
          <div key={r.cat}>
            <div className="flex justify-between text-sm font-medium text-foreground/80 mb-1.5">
              <span>{r.cat}</span>
              <span className="text-muted-foreground">
                {r.current}% <span className="mx-1">→</span>
                <span className="text-gold font-semibold">{r.recommended}%</span>
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-border/40 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-border"
                initial={{ width: 0 }}
                whileInView={{ width: `${r.current}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-gold-dim opacity-90"
                initial={{ width: 0 }}
                whileInView={{ width: `${r.recommended}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
