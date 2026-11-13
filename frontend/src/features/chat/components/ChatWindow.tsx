import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, PhoneOff, Send, Wallet, WifiOff, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useChatSession } from "../hooks/useChatSession";
import { chatApi, type ChatSenderRole } from "../api/chatApi";
import { AuthApiError } from "@/lib/authClient";
import RechargeModal from "@/features/wallet/components/RechargeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const END_REASON_LABEL: Record<string, string> = {
  USER_ENDED: "You ended this chat.",
  ASTROLOGER_ENDED: "The astrologer ended this chat.",
  BALANCE_EXHAUSTED: "Your wallet balance ran out.",
  FREE_LIMIT_REACHED: "Your free session has ended.",
  TIMEOUT: "This chat timed out.",
  REJECTED: "The astrologer declined this request.",
  CANCELLED: "This request was cancelled.",
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

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const GROUP_GAP_MS = 5 * 60 * 1000;

interface Props {
  sessionId: string;
  role: ChatSenderRole;
  onBack?: () => void;
  /** Route prefix used when navigating to a freshly-started session (e.g. "chat again"). Lets
   * this component be mounted both at the standalone /chat/:id route and inside the dashboard's
   * split-pane /dashboard/chats/:id route without hardcoding either. */
  basePath?: string;
}

export default function ChatWindow({ sessionId, role, onBack, basePath = "/chat" }: Props) {
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
    isConnected,
    lowBalanceAlert,
    freeToPaidAlert,
    dismissFreeToPaidAlert,
    sendMessage,
    setTyping,
    endChat,
    cancelRequest,
    acceptRequest,
    rejectRequest,
  } = useChatSession({ sessionId, role });
  const [draft, setDraft] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [minimumRupees, setMinimumRupees] = useState<number | undefined>(undefined);
  const [startingNew, setStartingNew] = useState(false);
  const [requestActionPending, setRequestActionPending] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [requestCountdown, setRequestCountdown] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (status !== "REQUESTED" || !session?.requestExpiresAt) {
      setRequestCountdown(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(session.requestExpiresAt!).getTime() - Date.now()) / 1000));
      setRequestCountdown(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status, session?.requestExpiresAt]);

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
      navigate(`${basePath}/${next.id}`, { replace: true });
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
      /* Handled in hook */
    } finally {
      setRequestActionPending(false);
    }
  }

  async function handleReject() {
    setRequestActionPending(true);
    try {
      await rejectRequest();
    } catch {
      /* Handled in hook */
    } finally {
      setRequestActionPending(false);
    }
  }

  async function handleCancelRequest() {
    setRequestActionPending(true);
    try {
      await cancelRequest();
      toast.success("Consultation request cancelled");
    } catch (err) {
      toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not cancel request");
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
          <div className="relative shrink-0">
            {peerPhotoUrl ? (
              <img src={peerPhotoUrl} alt={peerName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#592209]/10 font-home-serif font-semibold text-[#592209]">
                {peerName.charAt(0).toUpperCase()}
              </span>
            )}
            {status === "ACTIVE" && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#F5E9D6] bg-emerald-500"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-home-serif font-semibold text-[#301607]">{peerName}</p>
            <p className="h-4 text-xs text-[#6B4A37]">
              {peerTyping && status === "ACTIVE" ? "typing…" : status === "ACTIVE" ? "Active now" : ""}
            </p>
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
              {/* Privacy Guard: User wallet balance is NEVER shown to astrologers */}
              {isPaid && role === "USER" && balancePaise != null && (
                <span className="ml-1.5 font-normal text-[#6B4A37]">· {formatRupees(balancePaise)}</span>
              )}
              {freeSecondsRemaining != null && freeSecondsRemaining > 0 && (
                <span className="ml-1.5 font-normal text-emerald-800">· {freeSecondsRemaining}s free left</span>
              )}
            </span>
          )}
          {(status === "ACTIVE" || status === "PAUSED") && (
            <button
              type="button"
              onClick={() => setEndConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#592209]/30 px-3 py-1.5 text-sm font-medium text-[#592209] hover:bg-[#592209]/10"
            >
              <PhoneOff className="h-4 w-4" aria-hidden="true" /> End
            </button>
          )}
        </div>
      </header>

      {/* Network reconnecting banner */}
      {!isConnected && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Network connection lost. Reconnecting to live consultation…</span>
        </div>
      )}

      {/* Free-to-paid transition banner */}
      {freeToPaidAlert && status === "ACTIVE" && (
        <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              Your complimentary minutes have ended. The consultation is now active at ₹
              {Math.round(session?.ratePerMinutePaise ? session.ratePerMinutePaise / 100 : 0)}/min.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissFreeToPaidAlert}
            className="ml-2 font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Low balance banner with 1-click in-chat recharge */}
      {lowBalanceAlert && role === "USER" && status === "ACTIVE" && (
        <div className="flex items-center justify-between border-b border-[#592209]/20 bg-[#F5E9D6] px-4 py-2 text-xs text-[#301607]">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-[#592209] shrink-0" />
            <span>
              Low balance ({formatTime(remainingSeconds)} remaining). Top up coins to keep chatting without interruption.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRechargeOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#592209] px-2.5 py-1 text-xs font-semibold text-[#F5E9D6] transition hover:bg-[#431906]"
          >
            Recharge
          </button>
        </div>
      )}

      {/* Messages History */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && status !== "REQUESTED" && (
          <p className="pt-10 text-center text-sm text-[#6B4A37]">No messages yet.</p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDateSeparator = !prev || !isSameDay(prev.createdAt, m.createdAt);
          const isMine = m.senderRole === role;
          const groupStart =
            !prev ||
            showDateSeparator ||
            prev.senderRole !== m.senderRole ||
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS;

          return (
            <div key={m.id}>
              {showDateSeparator && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-[#592209]/8 px-3 py-1 text-[11px] font-medium text-[#6B4A37]">
                    {dateSeparatorLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} ${groupStart ? "mt-3" : "mt-1"}`}>
                {!isMine && (
                  <div className="h-6 w-6 shrink-0">
                    {groupStart &&
                      (peerPhotoUrl ? (
                        <img src={peerPhotoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#592209]/10 text-[10px] font-semibold text-[#592209]">
                          {peerName.charAt(0).toUpperCase()}
                        </span>
                      ))}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                    isMine ? "bg-[#592209] text-[#F5E9D6]" : "border border-[#592209]/15 bg-white text-[#2C1810]"
                  }`}
                >
                  {m.content}
                  <span className={`mt-1 block text-[10px] ${isMine ? "text-[#F5E9D6]/70" : "text-[#6B4A37]"}`}>
                    {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
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
              <Loader2 className="h-4 w-4 animate-spin text-[#592209]" aria-hidden="true" />
              Waiting for {peerName} to accept…
              {requestCountdown != null && (
                <span className="font-semibold text-[#592209]">({formatTime(requestCountdown)} remaining)</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={requestActionPending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#592209]/30 px-3 py-1.5 text-sm font-medium text-[#592209] transition hover:bg-[#592209]/10 disabled:opacity-50"
            >
              Cancel Request
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-[#592209]/15 bg-[#F5E9D6] p-3">
            <span className="text-sm font-medium text-[#301607]">
              {peerName} wants to chat
              {requestCountdown != null && (
                <span className="font-bold text-[#592209]"> ({formatTime(requestCountdown)} left)</span>
              )}
              {" "}— nothing is charged until you accept.
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={requestActionPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#592209]/30 px-3 py-2 text-sm font-medium text-[#592209] transition hover:bg-[#592209]/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={requestActionPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#592209] px-3 py-2 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906] disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Accept
              </button>
            </div>
          </div>
        )
      ) : status === "ENDED" ? (
        <div className="border-t border-[#592209]/15 bg-[#F5E9D6] p-5 text-center">
          <div className="mx-auto max-w-sm rounded-2xl border border-[#592209]/15 bg-white p-4 text-left shadow-sm">
            <div className="flex items-center justify-between border-b border-[#592209]/10 pb-3">
              <div>
                <p className="text-xs font-medium text-[#7A6658]">Consultation Summary</p>
                <p className="font-home-serif text-sm font-bold text-[#301607]">{peerName}</p>
              </div>
              <span className="rounded-full bg-[#592209]/10 px-2.5 py-1 text-[11px] font-semibold text-[#592209]">
                {endedReason ? END_REASON_LABEL[endedReason] : "Session Ended"}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#7A6658]">
                <span>Duration Billed</span>
                <span className="font-semibold text-[#301607]">{formatTime(session?.billedSeconds ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-[#7A6658]">
                <span>Coins Deducted</span>
                <span className="font-semibold text-[#301607]">
                  {session?.amountPaise ? `₹${(session.amountPaise / 100).toFixed(2)}` : "Free"}
                </span>
              </div>
              {role === "USER" && balancePaise != null && (
                <div className="flex items-center justify-between border-t border-[#592209]/10 pt-2 text-[#7A6658]">
                  <span>Remaining Wallet Balance</span>
                  <span className="font-semibold text-[#592209]">₹{(balancePaise / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            {role === "USER" && (
              <div className="mt-4 flex gap-2">
                {endedReason === "BALANCE_EXHAUSTED" ? (
                  <button
                    type="button"
                    onClick={() => setRechargeOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#592209] px-4 py-2.5 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906]"
                  >
                    <Wallet className="h-4 w-4" /> Recharge & Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={chatAgain}
                    disabled={startingNew}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#592209] px-4 py-2.5 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906] disabled:opacity-60"
                  >
                    {startingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Consult Again
                  </button>
                )}
              </div>
            )}
          </div>
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

      {/* End Chat Confirmation Alert Dialog */}
      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent className="border-[#592209]/20 bg-[#FBF5EC] text-[#301607] sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-home-serif text-lg font-bold text-[#301607]">
              End this consultation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#7A6658]">
              Are you sure you want to end your chat with {peerName}? Unused lookahead reservations will be returned to your wallet immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="border-[#592209]/30 text-[#592209] hover:bg-[#592209]/10">
              Continue Chatting
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEndConfirmOpen(false);
                endChat();
              }}
              className="bg-[#592209] text-[#F5E9D6] hover:bg-[#431906]"
            >
              End Consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
