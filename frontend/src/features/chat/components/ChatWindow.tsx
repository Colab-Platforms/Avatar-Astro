import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, PhoneOff, Send, Wallet } from "lucide-react";
import { useChatSession } from "../hooks/useChatSession";
import { chatApi, type ChatSenderRole } from "../api/chatApi";
import RechargeModal from "@/features/wallet/components/RechargeModal";

const END_REASON_LABEL: Record<string, string> = {
  USER_ENDED: "You ended this chat.",
  ASTROLOGER_ENDED: "The astrologer ended this chat.",
  BALANCE_EXHAUSTED: "Your wallet balance ran out.",
  FREE_LIMIT_REACHED: "Your 7-minute free session has ended.",
  TIMEOUT: "This chat timed out.",
};

function formatTime(seconds: number | null): string {
  if (seconds == null) return "--:--";
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRupees(paise: number | null): string {
  if (paise == null) return "";
  return `₹${(paise / 100).toFixed(2)}`;
}

interface Props {
  sessionId: string;
  role: ChatSenderRole;
  onBack?: () => void;
}

export default function ChatWindow({ sessionId, role, onBack }: Props) {
  const navigate = useNavigate();
  const { session, isLoading, messages, status, endedReason, remainingSeconds, balancePaise, peerTyping, sendMessage, setTyping, endChat } =
    useChatSession({ sessionId, role });
  const [draft, setDraft] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend() {
    if (!draft.trim() || status !== "ACTIVE") return;
    sendMessage(draft);
    setDraft("");
    setTyping(false);
  }

  async function startNewSessionAfterRecharge() {
    if (!session) return;
    setStartingNew(true);
    try {
      const next = await chatApi.startSession(session.astrologerProfileId);
      navigate(`/chat/${next.id}`, { replace: true });
    } finally {
      setStartingNew(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[#6B4A37]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const isPaid = session && session.ratePerMinutePaise > 0;
  const peerName =
    role === "USER"
      ? session?.astrologerProfile?.displayName ?? "Astrologer"
      : [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(" ") || "User";
  const peerPhotoUrl = role === "USER" ? session?.astrologerProfile?.profilePhotoUrl : session?.user?.profileImage;

  return (
    <div className="relative flex h-full flex-col bg-[#FBF5EC]">
      <header className="flex items-center justify-between gap-3 border-b border-[#592209]/15 bg-[#F5E9D6] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-full p-1.5 text-[#592209] hover:bg-[#592209]/10 md:hidden" aria-label="Back">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {peerPhotoUrl ? (
            <img src={peerPhotoUrl} alt={peerName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#592209]/10 font-home-serif font-semibold text-[#592209]">
              {peerName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-home-serif font-semibold text-[#301607]">{peerName}</p>
            {peerTyping && status === "ACTIVE" && <p className="text-xs text-[#6B4A37]">typing…</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "ACTIVE" && (
            <span className="rounded-full bg-[#592209]/10 px-3 py-1 text-sm font-semibold text-[#592209]" aria-live="polite">
              {formatTime(remainingSeconds)}
              {isPaid && balancePaise != null && <span className="ml-1.5 font-normal text-[#6B4A37]">· {formatRupees(balancePaise)}</span>}
            </span>
          )}
          {status === "ACTIVE" && (
            <button
              type="button"
              onClick={endChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#592209]/30 px-3 py-1.5 text-sm font-medium text-[#592209] hover:bg-[#592209]/10"
            >
              <PhoneOff className="h-4 w-4" aria-hidden="true" /> End
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderRole === role ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                m.senderRole === role ? "bg-[#592209] text-[#F5E9D6]" : "border border-[#592209]/15 bg-white text-[#2C1810]"
              }`}
            >
              {m.content}
              <span className={`mt-1 block text-[10px] ${m.senderRole === role ? "text-[#F5E9D6]/70" : "text-[#6B4A37]"}`}>
                {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {status === "ENDED" ? (
        <div className="border-t border-[#592209]/15 bg-[#F5E9D6] p-4 text-center">
          <p className="text-sm font-medium text-[#301607]">{endedReason ? END_REASON_LABEL[endedReason] : "This chat has ended."}</p>
          {role === "USER" && endedReason === "BALANCE_EXHAUSTED" && (
            <button
              type="button"
              onClick={() => setRechargeOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#592209] px-4 py-2 text-sm font-semibold text-[#F5E9D6] hover:bg-[#431906]"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" /> Recharge &amp; continue
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-[#592209]/15 bg-[#F5E9D6] p-3">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setTyping(e.target.value.length > 0);
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message…"
            className="flex-1 rounded-xl border border-[#592209]/25 bg-white px-3.5 py-2.5 text-sm text-[#2C1810] placeholder:text-[#2C1810]/40 focus:border-[#592209] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#592209]/30"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#592209] text-[#F5E9D6] transition hover:bg-[#431906] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <RechargeModal
        open={rechargeOpen}
        onOpenChange={setRechargeOpen}
        onSuccess={() => {
          setRechargeOpen(false);
          startNewSessionAfterRecharge();
        }}
      />
      {startingNew && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Loader2 className="h-6 w-6 animate-spin text-[#592209]" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
