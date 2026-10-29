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
    gradient: "from-[#592209]/25 via-[#F5E9D6] to-transparent",
    ring: "group-hover:ring-[#E0C8B0]/40",
    ctaLabel: "Ask about your career growth",
  },
  {
    icon: Heart,
    gradient: "from-[#EC4899]/25 via-[#F5E9D6] to-transparent",
    ring: "group-hover:ring-[#EC4899]/40",
    ctaLabel: "Ask about your relationship",
  },
  {
    icon: Leaf,
    gradient: "from-[#592209]/25 via-[#F5E9D6] to-transparent",
    ring: "group-hover:ring-[#E0C8B0]/40",
    ctaLabel: "Ask about your health",
  },
  {
    icon: Flower2,
    gradient: "from-[#592209]/25 via-[#F5E9D6] to-transparent",
    ring: "group-hover:ring-[#592209]/40",
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
            className={`group relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br ${style.gradient} bg-[#FBF5EC] p-5 text-left ring-1 ring-transparent transition-all duration-300 ${style.ring}`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-card">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="mb-1.5 font-home-serif text-xl font-semibold text-foreground">
              {s.title}
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{s.sub}</p>
            <div className="flex items-center gap-2 text-xs font-medium text-foreground/85">
              {style.ctaLabel}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:border-[#592209]">
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
