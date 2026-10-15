import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Home,
  Mic,
  ClipboardList,
  BookOpen,
  Clock,
  Bookmark,
  Settings,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GuruTab = "consultation" | "voice" | "report";

interface ChatSession {
  id: number;
  text: string;
  date: string;
}

interface SavedMantra {
  id: number;
  sanskrit?: string;
  transliteration?: string;
  purpose?: string;
  date: string;
}

interface Profile {
  name?: string;
  sign?: string;
}

interface GuruSidebarProps {
  activeTab: GuruTab;
  onTabChange: (tab: GuruTab) => void;
  onNewConsultation: () => void;
  chatSessions: ChatSession[];
  savedMantras: SavedMantra[];
  activePanel: string | null;
  onTogglePanel: (name: "saved" | "recent") => void;
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
}

const navItems: { key: GuruTab; label: string; icon: typeof Home }[] = [
  { key: "consultation", label: "Home", icon: Home },
  { key: "voice", label: "Voice Consultation", icon: Mic },
  { key: "report", label: "Diagnosis & Remedies", icon: ClipboardList },
];

const GuruSidebar = ({
  activeTab,
  onTabChange,
  onNewConsultation,
  chatSessions,
  savedMantras,
  activePanel,
  onTogglePanel,
  profile,
  open,
  onClose,
}: GuruSidebarProps) => {
  const content = (
    <div className="flex h-full w-full flex-col bg-[#0F1015]/95 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF9D4D]/25 to-[#E88B3D]/10 text-lg ring-1 ring-[#FF9D4D]/30">
            🕉️
          </div>
          <div>
            <div className="font-['Cormorant_Garamond'] text-lg font-semibold leading-tight text-white">
              AI Guru
            </div>
            <div className="text-[11px] leading-tight text-[#6B7280]">Your Vedic Guide</div>
          </div>
        </div>
        <button
          className="rounded-lg p-1.5 text-[#A3A3B2] hover:bg-white/5 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewConsultation}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF9D4D] to-[#E88B3D] px-4 py-3 text-sm font-semibold text-[#1A0F08] shadow-[0_0_24px_rgba(255,157,77,0.35)] transition-shadow hover:shadow-[0_0_34px_rgba(255,157,77,0.5)]"
        >
          <Sparkles className="h-4 w-4" />
          New Consultation
        </motion.button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
        <div className="px-2 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
          Navigation
        </div>
        <ul className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                onClick={() => onTabChange(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm text-[#A3A3B2] transition-colors hover:bg-white/[0.06]",
                  activeTab === key &&
                    "border-[#FF9D4D]/25 bg-[#FF9D4D]/10 text-[#FF9D4D]",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
          <li>
            <Link
              to="/inner-voice/wisdom"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#A3A3B2] transition-colors hover:bg-white/[0.06]"
            >
              <BookOpen className="h-[18px] w-[18px] shrink-0" />
              <span>Remedies Library</span>
            </Link>
          </li>
        </ul>

        <div className="mt-4 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
          Recent Chats
        </div>
        <button
          onClick={() => onTogglePanel("recent")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#A3A3B2] transition-colors hover:bg-white/[0.06]",
            activePanel === "recent" && "bg-white/[0.06] text-white",
          )}
        >
          <Clock className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">
            {chatSessions.length > 0 ? `${chatSessions.length} conversations` : "No history yet"}
          </span>
        </button>
        {activePanel === "recent" && (
          <div className="mb-1 mt-1 space-y-1 rounded-xl bg-white/[0.03] p-2">
            {chatSessions.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs italic text-[#6B7280]">
                No recent chats yet.
              </div>
            ) : (
              chatSessions.map((s) => (
                <div
                  key={s.id}
                  className="truncate rounded-lg px-2.5 py-2 text-xs text-[#A3A3B2] hover:bg-white/[0.05]"
                >
                  {s.text}
                  <span className="ml-1 text-[#6B7280]">· {s.date}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-4 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
          Saved Remedies
        </div>
        <button
          onClick={() => onTogglePanel("saved")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#A3A3B2] transition-colors hover:bg-white/[0.06]",
            activePanel === "saved" && "bg-white/[0.06] text-white",
          )}
        >
          <Bookmark className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">
            {savedMantras.length > 0 ? `${savedMantras.length} saved` : "None saved yet"}
          </span>
        </button>
        {activePanel === "saved" && (
          <div className="mb-1 mt-1 space-y-1 rounded-xl bg-white/[0.03] p-2">
            {savedMantras.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs italic text-[#6B7280]">
                No saved remedies yet.
              </div>
            ) : (
              savedMantras.map((m) => (
                <div key={m.id} className="rounded-lg px-2.5 py-2 text-xs hover:bg-white/[0.05]">
                  <div className="truncate text-[#A3A3B2]">
                    {m.transliteration || m.sanskrit || "Mantra"}
                  </div>
                  <div className="text-[10px] text-[#6B7280]">
                    {m.purpose || ""} · {m.date}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => window.alert("Settings coming soon")}
          className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#A3A3B2] transition-colors hover:bg-white/[0.06]"
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Pandit profile card */}
      <div className="mx-3 mb-3 rounded-2xl border border-white/[0.08] bg-[#17181F] p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9D4D]/40 to-[#E88B3D]/20 text-xl ring-1 ring-[#FF9D4D]/30">
            🙏
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">Pandit Rameshwar Ji</div>
            <div className="text-[11px] text-[#6B7280]">40+ Years Experience</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="h-3 w-3 fill-[#F5C76E] text-[#F5C76E]" />
          ))}
          <span className="text-[11px] text-[#A3A3B2]">4.9 (12K+ Reviews)</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#22C55E]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
          </span>
          Online · Available for Consultation
        </div>
      </div>

      {/* Bottom user profile */}
      <Link
        to="/inner-voice"
        className="flex items-center gap-3 border-t border-white/[0.08] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 text-base ring-1 ring-white/10">
          🧑
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">
            {profile?.name || "Seeker"}
          </div>
          <div className="truncate text-[11px] text-[#6B7280]">
            {profile?.sign || "Vedic Guidance"}
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-[300px] shrink-0 border-r border-white/[0.08] lg:block">
        {content}
      </aside>

      {/* Mobile / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="absolute inset-y-0 left-0 w-[280px] max-w-[82vw]"
          >
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
};

export default GuruSidebar;
