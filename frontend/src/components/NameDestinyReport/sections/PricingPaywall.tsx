import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

const FEATURES = [
  "Name Numerology Analysis",
  "Top 5 Optimized Name Spellings",
  "Planet Compatibility",
  "Destiny Score",
  "Career & Wealth Analysis",
  "Relationship Analysis",
  "Lucky Numbers",
  "Lucky Colors",
  "Personalized Remedies",
  "Signature Analysis",
  "Business Name Suggestions",
  "Future Timeline",
  "Premium PDF Download",
  "Lifetime Report Access",
];

export default function PricingPaywall({
  unlocked,
  onUnlock,
}: {
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const [justUnlocked, setJustUnlocked] = useState(false);

  function handleClick() {
    onUnlock();
    setJustUnlocked(true);
  }

  return (
    <div className="px-6 sm:px-10 pb-14">
      <div
        className="max-w-lg mx-auto rounded-3xl border border-gold/30 p-8 sm:p-10 text-center shadow-2xl"
        style={{ background: "var(--gradient-cosmic)" }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={12} /> Unlock Full Report
        </div>
        <h3
          className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 uppercase tracking-wide"
          style={{ fontFamily: "'Astra','Cinzel',serif" }}
        >
          Unlock Your Complete Cosmic Blueprint
        </h3>
        <div className="text-4xl font-extrabold text-gold mb-6">₹499</div>

        <ul className="text-left space-y-2 mb-8 max-w-sm mx-auto">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
              <Check size={16} className="mt-0.5 shrink-0 text-gold" />
              {f}
            </li>
          ))}
        </ul>

        {unlocked ? (
          <div className="rounded-2xl bg-gold/10 border border-gold/30 text-gold font-semibold py-3">✓ Report Unlocked</div>
        ) : (
          <>
            <button
              onClick={handleClick}
              className="ndr-glow-btn w-full rounded-2xl bg-gradient-to-r from-gold to-gold-dim text-cosmic-dark font-bold text-base uppercase tracking-wide py-4 hover:opacity-90 transition-opacity"
            >
              Unlock My Cosmic Blueprint
            </button>
            {justUnlocked ? null : (
              <p className="text-xs text-muted-foreground mt-3">Demo unlock — real payment coming soon.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
