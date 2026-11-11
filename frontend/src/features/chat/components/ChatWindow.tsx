import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, PhoneOff, Send, Wallet, WifiOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useChatSession } from "../hooks/useChatSession";
import { chatApi, type ChatSenderRole } from "../api/chatApi";
import { AuthApiError } from "@/lib/authClient";
import RechargeModal from "@/features/wallet/components/RechargeModal";

const END_REASON_LABEL: Record<string, string> = {
  USER_ENDED: "You ended this chat.",
  ASTROLOGER_ENDED: "The astrologer ended this chat.",
  BALANCE_EXHAUSTED: "Your wallet balance ran out.",
  FREE_LIMIT_REACHED: "Your free session has ended.",
  TIMEOUT: "This chat timed out.",
  REJECTED: "The astrologer declined this request.",
  DISCONNECTED: "This chat ended because the connection was lost for too long.",
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
  const {
    session,
    isLoading,
    messages,
    status,
    endedReason,
    remainingSeconds,
    balancePaise,
    freeSecondsRemaining,
    peerTyping,
    sendMessage,
    setTyping,
    endChat,
    acceptRequest,
    rejectRequest,
  } = useChatSession({ sessionId, role });
  const [draft, setDraft] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [minimumRupees, setMinimumRupees] = useState<number | undefined>(undefined);
  const [startingNew, setStartingNew] = useState(false);
  const [requestActionPending, setRequestActionPending] = useState(false);
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

  /** The general "talk to this astrologer again" action from an ENDED screen, for any end
   * reason — not just a balance recharge. Re-checks eligibility first (mirrors StartChatButton)
   * so an insufficient balance opens the recharge modal instead of a confusing 403 from startSession. */
  async function chatAgain() {
    if (!session) return;
    setStartingNew(true);
    try {
      const eligibility = await chatApi.getEligibility(session.astrologerProfileId);
      if (!eligibility.canStart) {
        setMinimumRupees(eligibility.minimumRequiredPaise ? Math.ceil(eligibility.minimumRequiredPaise / 100) : undefined);
        setRechargeOpen(true);
        return;
      }
      const next = await chatApi.startSession(session.astrologerProfileId);
      navigate(`/chat/${next.id}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not start a new chat right now.");
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

  async function handleAccept() {
    setRequestActionPending(true);
    try {
      await acceptRequest();
    } catch {
      /* onError below is not wired here — a toast is unnecessary for a tap that simply failed to accept in time */
    } finally {
      setRequestActionPending(false);
    }
  }

  async function handleReject() {
    setRequestActionPending(true);
    try {
      await rejectRequest();
    } finally {
      setRequestActionPending(false);
    }
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
          {status === "PAUSED" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900" aria-live="polite">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> Reconnecting…
            </span>
          )}
          {status === "ACTIVE" && (
            <span className="rounded-full bg-[#592209]/10 px-3 py-1 text-sm font-semibold text-[#592209]" aria-live="polite">
              {formatTime(remainingSeconds)}
              {isPaid && balancePaise != null && <span className="ml-1.5 font-normal text-[#6B4A37]">· {formatRupees(balancePaise)}</span>}
              {freeSecondsRemaining != null && freeSecondsRemaining > 0 && (
                <span className="ml-1.5 font-normal text-emerald-800">· {freeSecondsRemaining}s free left</span>
              )}
            </span>
          )}
          {(status === "ACTIVE" || status === "PAUSED") && (
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

      {/* History (this session plus every earlier session with the same peer — see
          chat.service.ts's peerSessionIds) always renders regardless of status, so starting a
          new request with someone you've chatted with before never hides the old conversation
          behind a waiting screen. */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && status !== "REQUESTED" && (
          <p className="pt-10 text-center text-sm text-[#6B4A37]">No messages yet.</p>
        )}
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

      {status === "PAUSED" && (
        <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Connection lost — billing is paused. The chat will resume automatically once both sides reconnect.
        </p>
      )}

      {status === "REQUESTED" ? (
        role === "USER" ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#592209]/15 bg-[#F5E9D6] p-3">
            <span className="flex items-center gap-2 text-sm text-[#301607]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Waiting for {peerName} to respond…
            </span>
            <button
              type="button"
              onClick={endChat}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#592209]/30 px-3 py-1.5 text-sm font-medium text-[#592209] hover:bg-[#592209]/10"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-[#592209]/15 bg-[#F5E9D6] p-3">
            <span className="text-sm font-medium text-[#301607]">{peerName} wants to chat — nothing is charged until you accept.</span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={requestActionPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#592209]/30 px-3 py-2 text-sm font-medium text-[#592209] hover:bg-[#592209]/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={requestActionPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#592209] px-3 py-2 text-sm font-semibold text-[#F5E9D6] hover:bg-[#431906] disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Accept
              </button>
            </div>
          </div>
        )
      ) : status === "ENDED" ? (
        <div className="border-t border-[#592209]/15 bg-[#F5E9D6] p-4 text-center">
          <p className="text-sm font-medium text-[#301607]">{endedReason ? END_REASON_LABEL[endedReason] : "This chat has ended."}</p>
          {role === "USER" && (
            <button
              type="button"
              onClick={endedReason === "BALANCE_EXHAUSTED" ? () => setRechargeOpen(true) : chatAgain}
              disabled={startingNew}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#592209] px-4 py-2 text-sm font-semibold text-[#F5E9D6] hover:bg-[#431906] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingNew ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : endedReason === "BALANCE_EXHAUSTED" ? (
                <Wallet className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {endedReason === "BALANCE_EXHAUSTED" ? "Recharge & continue" : "Chat again"}
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
        minimumRupees={minimumRupees}
        onSuccess={() => {
          setRechargeOpen(false);
          chatAgain();
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
