import { motion, AnimatePresence } from "framer-motion";
import { scoreNameAgainstProfile, LUCKY_COLOR_BY_NUMBER } from "@/lib/numerology";
import type { UseNameReport } from "../useNameReport";

const COLOR_HEX: Record<string, string> = {
  Gold: "#f5c518", Orange: "#f97316", Amber: "#f59e0b",
  "Pearl White": "#e5e7eb", Silver: "#cbd5e1",
  Violet: "#8b5cf6", Lavender: "#c4b5fd",
  "Electric Blue": "#3b82f6", Grey: "#94a3b8",
  "Emerald Green": "#10b981", Turquoise: "#2dd4bf",
  "Rose Pink": "#f472b6", Ivory: "#fef3c7",
  "Sea Green": "#14b8a6", Champagne: "#fde68a",
  "Navy Blue": "#1e3a8a", Charcoal: "#334155",
  "Crimson Red": "#dc2626", Coral: "#fb7185",
  "Moonlight Blue": "#60a5fa", "Slate Grey": "#64748b",
  "Deep Indigo": "#4338ca", "Royal Purple": "#7c3aed", Sapphire: "#2563eb",
};

export default function AuraVisualization({ name, dob, report }: { name: string; dob: string; report: UseNameReport }) {
  const { selectedAuraSpelling, setSelectedAuraSpelling, topVariants } = report;
  const activeProfile = scoreNameAgainstProfile(selectedAuraSpelling, dob);
  const colors = LUCKY_COLOR_BY_NUMBER[activeProfile.destiny] || LUCKY_COLOR_BY_NUMBER[1];
  const auraColor = COLOR_HEX[colors[0]] || "#592209";

  const options = [name, ...topVariants.slice(0, 3).map((v) => v.spelling)];

  return (
    <div className="px-6 sm:px-10 pb-12">
      <h3
        className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        AI Aura Visualization
      </h3>
      <p className="text-center text-muted-foreground mb-6 text-sm">Select a spelling to see how your aura shifts.</p>

      <div className="flex justify-center mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedAuraSpelling + auraColor}
            className="relative w-56 h-56 rounded-full"
            style={{ background: `radial-gradient(circle, ${auraColor}55 0%, ${auraColor}22 45%, transparent 75%)` }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: [1, 1.06, 1], opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-8 rounded-full"
              style={{ background: `radial-gradient(circle, ${auraColor}aa 0%, ${auraColor}44 60%, transparent 100%)` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground bg-card/80 backdrop-blur px-3 py-1 rounded-full border border-border">
                {activeProfile.destinyPlanet}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelectedAuraSpelling(opt)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedAuraSpelling === opt ? "bg-gradient-to-r from-gold to-gold-dim text-cosmic-dark" : "bg-muted/60 text-foreground/70 hover:bg-muted"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
