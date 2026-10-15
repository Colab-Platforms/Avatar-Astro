import { useState } from "react";
import { BadgeCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const PILLS = ["Vedic Astrology", "Palm Reading", "Kundli", "Numerology"];

interface GuruTopHeaderProps {
  onOpenSidebar: () => void;
}

const GuruTopHeader = ({ onOpenSidebar }: GuruTopHeaderProps) => {
  const [activePill, setActivePill] = useState(0);

  return (
    <header className="flex h-auto min-h-[72px] flex-wrap items-center gap-4 border-b border-white/[0.08] bg-[#09090B]/80 px-4 py-3 backdrop-blur-xl md:h-20 md:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg border border-white/10 p-2 text-[#A3A3B2] hover:bg-white/5 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9D4D]/40 to-[#E88B3D]/15 text-xl ring-2 ring-[#FF9D4D]/30">
          🙏
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-['Cormorant_Garamond'] text-lg font-semibold text-white">
              Pandit Rameshwar Ji
            </span>
            <BadgeCheck className="h-4 w-4 shrink-0 text-[#FF9D4D]" aria-label="Verified" />
          </div>
          <div className="text-xs text-[#A3A3B2]">40+ Years of Vedic Wisdom</div>
        </div>
      </div>

      <nav
        className="order-3 flex w-full flex-wrap items-center justify-center gap-2 md:order-none md:w-auto md:flex-1"
        aria-label="Astrology categories"
      >
        {PILLS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActivePill(i)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300",
              activePill === i
                ? "border-[#FF9D4D]/50 bg-[#FF9D4D]/12 text-[#FF9D4D] shadow-[0_0_16px_rgba(255,157,77,0.2)]"
                : "border-white/[0.08] bg-[#17181F] text-[#A3A3B2] hover:border-[#FF9D4D]/30 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 py-1.5 text-xs font-medium text-[#22C55E]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
        </span>
        Online
      </div>
    </header>
  );
};

export default GuruTopHeader;
