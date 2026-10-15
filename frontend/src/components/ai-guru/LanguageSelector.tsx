import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { LanguageOption } from "./languages";

interface LanguageSelectorProps<T extends string> {
  label: string;
  value: T;
  options: LanguageOption<T>[];
  onChange: (value: T) => void;
}

/** Generic pill dropdown — used for both the Input and Reply language pickers. */
function LanguageSelector<T extends string>({ label, value, options, onChange }: LanguageSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.code === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#17181F] px-3 py-1.5 text-xs text-[#A3A3B2] transition-colors hover:border-[#FF9D4D]/30 hover:text-white"
      >
        <span className="text-[#6B7280]">{label}:</span>
        <span className="font-medium text-white">{current.label}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-[#6B7280] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            className="absolute bottom-full left-0 z-20 mb-2 min-w-[168px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#17181F] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
          >
            {options.map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={opt.code === value}
                onClick={() => {
                  onChange(opt.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  opt.code === value
                    ? "bg-[#FF9D4D]/12 text-[#FF9D4D]"
                    : "text-[#A3A3B2] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSelector;
