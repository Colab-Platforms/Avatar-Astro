import { useEffect, useState } from "react";
import { Check, X, Clock, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { ChatSession } from "../api/chatApi";

interface Props {
  open: boolean;
  session: ChatSession | null;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onClose: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function IncomingRequestModal({ open, session, onAccept, onReject, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!open || !session) return;

    const calc = () => {
      if (session.requestExpiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(session.requestExpiresAt).getTime() - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          onClose();
        }
      } else {
        // Fallback default 60s
        setSecondsLeft(60);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [open, session, onClose]);

  if (!session) return null;

  const clientName = [session.user?.firstName, session.user?.lastName].filter(Boolean).join(" ") || "Client";
  const clientPhoto = session.user?.profileImage;
  const rateRupees = Math.round(session.ratePerMinutePaise / 100);

  async function handleAcceptClick() {
    setActionPending(true);
    try {
      await onAccept();
    } finally {
      setActionPending(false);
    }
  }

  async function handleRejectClick() {
    setActionPending(true);
    try {
      await onReject();
    } finally {
      setActionPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !actionPending) onClose(); }}>
      <DialogContent className="max-w-md border-[#592209]/20 bg-[#FBF5EC] p-6 text-[#301607] shadow-2xl sm:rounded-2xl">
        <DialogHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#592209]/20 bg-[#F5E9D6]">
            {clientPhoto ? (
              <img src={clientPhoto} alt={clientName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="font-home-serif text-xl font-bold text-[#592209]">
                {clientName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <DialogTitle className="font-home-serif text-xl font-bold text-[#301607]">
            New Consultation Request
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7A6658]">
            {clientName} wants to start a live consultation with you.
          </DialogDescription>
        </DialogHeader>

        {/* Info card */}
        <div className="my-3 space-y-3 rounded-xl border border-[#592209]/15 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7A6658]">Consultation Rate</span>
            <span className="font-bold text-[#301607]">
              {session.type === "COMPLIMENTARY" || rateRupees === 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5" /> Complimentary
                </span>
              ) : (
                `₹${rateRupees} / min`
              )}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#592209]/10 pt-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-[#7A6658]">
              <Clock className="h-4 w-4 text-[#592209]" /> Time to Respond
            </span>
            <span className={`font-mono text-base font-bold ${secondsLeft <= 15 ? "text-red-600 animate-pulse" : "text-[#592209]"}`}>
              {formatCountdown(secondsLeft)}
            </span>
          </div>
        </div>

        <DialogFooter className="mt-2 flex gap-3 sm:justify-stretch">
          <button
            type="button"
            onClick={handleRejectClick}
            disabled={actionPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#592209]/30 px-4 py-2.5 text-sm font-semibold text-[#592209] transition hover:bg-[#592209]/10 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Decline
          </button>
          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={actionPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#592209] px-4 py-2.5 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906] disabled:opacity-50"
          >
            {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept & Chat
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

