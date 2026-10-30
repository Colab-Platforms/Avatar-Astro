import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Briefcase, Heart, HelpCircle, Sparkles } from "lucide-react";

interface SuggestedQuestion {
  text: string;
  icon: typeof Briefcase;
}

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { text: "Why am I facing career obstacles?", icon: Briefcase },
  { text: "When will I get married?", icon: Heart },
  { text: "Why do I feel unlucky?", icon: HelpCircle },
  { text: "Which mantra should I chant?", icon: Sparkles },
];

interface SuggestedQuestionsProps {
  /** Populates the composer with the picked question — never sends it. */
  onSelectSuggestion: (text: string) => void;
}

const SuggestedQuestions = ({ onSelectSuggestion }: SuggestedQuestionsProps) => {
  const [pulsedText, setPulsedText] = useState<string | null>(null);

  const handleClick = (text: string) => {
    setPulsedText(text);
    onSelectSuggestion(text);
    window.setTimeout(() => setPulsedText((prev) => (prev === text ? null : prev)), 300);
  };

  return (
    <div className="rounded-[20px] border border-primary/15 bg-[#FBF5EC]/70 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Suggested Questions
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map(({ text, icon: Icon }) => (
          <motion.button
            key={text}
            onClick={() => handleClick(text)}
            animate={{ opacity: pulsedText === text ? [1, 0.35, 1] : 1 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="group flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-[#FBF5EC] px-3.5 py-3 text-left text-sm text-muted-foreground transition-all hover:border-[#592209]/30 hover:bg-[#FBF5EC] hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0 text-[#592209]" />
            <span className="flex-1">{text}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#592209]" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
