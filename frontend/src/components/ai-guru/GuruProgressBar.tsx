import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GuruProgressBarProps {
  progress: number;
  readyForDiagnosis: boolean;
  onGenerateReport: () => void;
}

const GuruProgressBar = ({ progress, readyForDiagnosis, onGenerateReport }: GuruProgressBarProps) => (
  <div className="border-b border-primary/15 bg-[#FBF5EC]/60 px-4 py-3 md:px-6">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
      <div className="flex-1">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Spiritual Assessment Progress
          </span>
          <span className="text-xs font-medium text-[#592209]">{progress}% Complete</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-card">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#592209] to-[#592209]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
      {readyForDiagnosis && (
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-2 rounded-xl border border-[#592209]/40 bg-gradient-to-r from-[#592209]/20 to-[#592209]/12 px-4 py-2 text-xs font-semibold text-[#FF9D4D] transition-all hover:shadow-[0_0_20px_rgba(255,157,77,0.2)]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate Diagnosis Report
        </button>
      )}
    </div>
  </div>
);

export default GuruProgressBar;
