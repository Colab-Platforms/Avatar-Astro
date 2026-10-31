import { motion } from "framer-motion";
import { ScrollText, Orbit, Hourglass, BookOpen, Sparkles } from "lucide-react";

const STEPS = [
  { icon: ScrollText, label: "Reading Birth Chart" },
  { icon: Orbit, label: "Checking Planetary\nPositions" },
  { icon: Hourglass, label: "Calculating Dasha\n& Transits" },
  { icon: BookOpen, label: "Consulting Ancient\nScriptures" },
  { icon: Sparkles, label: "Generating Guidance\n& Remedies" },
];

const AnalysisTimeline = () => (
  <div className="rounded-[20px] border border-primary/15 bg-[#FBF5EC]/70 px-6 py-8">
    <h3 className="mb-8 text-center font-home-serif text-xl font-semibold text-foreground">
      How Divya Margdarshak Analyses Your Question
    </h3>
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between md:gap-2">
      {STEPS.map(({ icon: Icon, label }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="relative flex flex-1 flex-col items-center text-center"
        >
          {i < STEPS.length - 1 && (
            <div
              className="absolute left-1/2 top-6 hidden h-px w-full bg-gradient-to-r from-[#592209]/40 to-[#592209]/5 md:block"
              aria-hidden="true"
            />
          )}
          <div className="relative z-10 mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#592209]/30 bg-[#FBF5EC] text-[#301607] shadow-[0_0_18px_rgba(255,157,77,0.15)]">
            <Icon className="h-5 w-5" />
          </div>
          <span className="max-w-[120px] whitespace-pre-line text-xs leading-snug text-muted-foreground">
            {label}
          </span>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AnalysisTimeline;
