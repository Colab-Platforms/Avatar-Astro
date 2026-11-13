import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { AuthApiError } from "@/lib/authClient";
import type { Astrologer } from "@/data/astrologers";
import { chatApi } from "../api/chatApi";
import RechargeModal from "@/features/wallet/components/RechargeModal";

interface Props {
  astrologer: Astrologer;
  compact?: boolean;
  className?: string;
}

/** The single entry point into the chat feature from anywhere an astrologer is shown
 * (home card, directory card, profile page). Resolves free-trial vs paid eligibility
 * server-side before ever creating a session — nothing here decides billing, it only
 * routes the click to the right next step. */
export default function StartChatButton({ astrologer, compact, className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [minimumRupees, setMinimumRupees] = useState<number | undefined>(undefined);

  // Demo/placeholder rows (dev-only preview content) have no real AstrologerProfile to
  // start a session against.
  if (astrologer.demo) {
    return (
      <button
        type="button"
        disabled
        title="This is a placeholder profile and cannot be chatted with."
        className={disabledCls(compact, className)}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat
      </button>
    );
  }

  async function handleClick() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setLoading(true);
    try {
      const eligibility = await chatApi.getEligibility(astrologer.id);

      // `canStart` already accounts for an existing pending/active session being resumable
      // even when the balance would otherwise block a *new* one — check that, not the raw
      // balance flag, or a user can never get back into a chat they already started.
      if (!eligibility.canStart) {
        setMinimumRupees(eligibility.minimumRequiredPaise ? Math.ceil(eligibility.minimumRequiredPaise / 100) : undefined);
        setRechargeOpen(true);
        return;
      }

      const session = await chatApi.startSession(astrologer.id);
      navigate(`/dashboard/chats/${session.id}`);
    } catch (err) {
      toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not start chat right now.");
    } finally {
      setLoading(false);
    }
  }

  async function afterRecharge() {
    setRechargeOpen(false);
    setLoading(true);
    try {
      const session = await chatApi.startSession(astrologer.id);
      navigate(`/dashboard/chats/${session.id}`);
    } catch (err) {
      toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not start chat right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading} className={activeCls(compact, className)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageCircle className="h-4 w-4" aria-hidden="true" />}
        Chat
      </button>
      <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} minimumRupees={minimumRupees} onSuccess={afterRecharge} />
    </>
  );
}

const base = (compact?: boolean) =>
  `inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border font-semibold ${compact ? "px-3 py-2 text-sm" : "px-5 py-3 text-base"}`;

const activeCls = (compact?: boolean, className?: string) =>
  `${base(compact)} border-[#592209]/40 bg-[#FBF5EC] text-[#592209] hover:bg-[#592209]/10 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`;

const disabledCls = (compact?: boolean, className?: string) =>
  `${base(compact)} cursor-not-allowed border-[#592209]/20 bg-[#FBF5EC]/60 text-[#592209]/50 ${className ?? ""}`;
