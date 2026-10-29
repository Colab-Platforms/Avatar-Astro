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
    <header className="flex h-auto min-h-[72px] flex-wrap items-center gap-4 border-b border-primary/15 bg-[#FBF5EC]/80 px-4 py-3 backdrop-blur-xl md:h-20 md:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg border border-primary/15 p-2 text-muted-foreground hover:bg-primary/10 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#592209]/40 to-[#592209]/15 text-xl ring-2 ring-[#592209]/30">
          🙏
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-home-serif text-lg font-semibold text-foreground">
              Pandit Rameshwar Ji
            </span>
            <BadgeCheck className="h-4 w-4 shrink-0 text-[#592209]" aria-label="Verified" />
          </div>
          <div className="text-xs text-muted-foreground">40+ Years of Vedic Wisdom</div>
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
                ? "border-[#592209]/50 bg-[#592209]/12 text-[#FF9D4D] shadow-[0_0_16px_rgba(255,157,77,0.2)]"
                : "border-primary/15 bg-[#FBF5EC] text-muted-foreground hover:border-[#592209]/30 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 rounded-full border border-[#E0C8B0]/25 bg-[#592209]/10 px-3 py-1.5 text-xs font-medium text-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#592209] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#592209]" />
        </span>
        Online
      </div>
    </header>
  );
};

export default GuruTopHeader;
