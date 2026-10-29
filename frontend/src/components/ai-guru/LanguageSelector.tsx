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
        className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-[#FBF5EC] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#592209]/30 hover:text-foreground"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-foreground">{current.label}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            className="absolute bottom-full left-0 z-20 mb-2 min-w-[168px] overflow-hidden rounded-xl border border-primary/15 bg-[#FBF5EC] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
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
                    ? "bg-[#592209]/12 text-[#FF9D4D]"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
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
