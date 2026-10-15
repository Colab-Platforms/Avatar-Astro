import { motion, useIsPresent } from "framer-motion";
import { Briefcase, Heart, Leaf, Flower2, ArrowRight } from "lucide-react";

export interface CategorySuggestion {
  title: string;
  sub: string;
}

interface CategoryCardsProps {
  suggestions: CategorySuggestion[];
  onSelect: (sub: string) => void;
}

const STYLES = [
  {
    icon: Briefcase,
    gradient: "from-[#7C3AED]/25 via-[#4C1D95]/10 to-transparent",
    ring: "group-hover:ring-[#7C3AED]/40",
    ctaLabel: "Ask about your career growth",
  },
  {
    icon: Heart,
    gradient: "from-[#EC4899]/25 via-[#831843]/10 to-transparent",
    ring: "group-hover:ring-[#EC4899]/40",
    ctaLabel: "Ask about your relationship",
  },
  {
    icon: Leaf,
    gradient: "from-[#14B8A6]/25 via-[#134E4A]/10 to-transparent",
    ring: "group-hover:ring-[#14B8A6]/40",
    ctaLabel: "Ask about your health",
  },
  {
    icon: Flower2,
    gradient: "from-[#FF9D4D]/25 via-[#7C2D12]/10 to-transparent",
    ring: "group-hover:ring-[#FF9D4D]/40",
    ctaLabel: "Ask about your health path",
  },
];

const CategoryCards = ({ suggestions, onSelect }: CategoryCardsProps) => {
  // While this component is exiting (AnimatePresence removing the welcome
  // screen after the first message), suppress hover/tap so the outgoing
  // cards don't visually "react" mid-transition.
  const isPresent = useIsPresent();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {suggestions.map((s, i) => {
        const style = STYLES[i % STYLES.length];
        const Icon = style.icon;
        return (
          <motion.button
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }}
            exit={{ opacity: 0, y: -30, scale: 0.98, transition: { duration: 0.3, delay: i * 0.05, ease: "easeInOut" } }}
            whileHover={isPresent ? { y: -4, scale: 1.03 } : undefined}
            whileTap={isPresent ? { scale: 0.99 } : undefined}
            onClick={() => onSelect(s.sub)}
            className={`group relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-gradient-to-br ${style.gradient} bg-[#17181F] p-5 text-left ring-1 ring-transparent transition-all duration-300 ${style.ring}`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="mb-1.5 font-['Cormorant_Garamond'] text-xl font-semibold text-white">
              {s.title}
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-[#A3A3B2]">{s.sub}</p>
            <div className="flex items-center gap-2 text-xs font-medium text-white/85">
              {style.ctaLabel}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:border-[#FF9D4D]">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryCards;
