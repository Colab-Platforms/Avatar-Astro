import { useState } from "react";
import { Menu } from "lucide-react";
import { PersonaHeader } from "./PersonaCard";
import type { Astrologer } from "@/data/astrologers";
import { cn } from "@/lib/utils";

const PILLS = ["Vedic Astrology", "Palm Reading", "Kundli", "Numerology"];

interface GuruTopHeaderProps {
  onOpenSidebar: () => void;
  persona?: Astrologer | null;
}

const GuruTopHeader = ({ onOpenSidebar, persona }: GuruTopHeaderProps) => {
  const [activePill, setActivePill] = useState(0);

  return (
    <header className="flex h-auto min-h-[72px] flex-wrap items-center gap-4 border-b border-primary/15 bg-[#FBF5EC]/80 px-4 py-3 backdrop-blur-xl md:h-20 md:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg border border-primary/15 p-2 text-muted-foreground hover:bg-primary/10 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <PersonaHeader persona={persona ?? null} />

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
                ? "border-[#592209]/50 bg-[#592209]/12 text-[#FF9D4D] shadow-[0_0_16px_rgba(255,157,77,0.2)]"
                : "border-primary/15 bg-[#FBF5EC] text-muted-foreground hover:border-[#592209]/30 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

    </header>
  );
};

export default GuruTopHeader;
