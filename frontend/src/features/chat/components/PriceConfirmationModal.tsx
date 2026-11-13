import { useState } from "react";
import { Loader2, Sparkles, Wallet, Clock, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { Astrologer } from "@/data/astrologers";
import type { ChatEligibility } from "../api/chatApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  astrologer: Astrologer;
  eligibility: ChatEligibility | null;
  onConfirmStart: () => Promise<void>;
  onOpenRecharge: (minimumRupees?: number) => void;
}

export default function PriceConfirmationModal({
  open,
  onOpenChange,
  astrologer,
  eligibility,
  onConfirmStart,
  onOpenRecharge,
}: Props) {
  const [starting, setStarting] = useState(false);

  if (!eligibility) return null;

  const rateRupees = Math.round(eligibility.ratePerMinutePaise / 100);
  const balanceRupees = ((eligibility.walletBalancePaise ?? 0) / 100).toFixed(2);
  const freeMins = Math.floor((eligibility.freeAllowanceRemainingSeconds ?? 0) / 60);

  // Calculate affordable minutes
  let affordableMinutes = 0;
  if (eligibility.ratePerMinutePaise > 0) {
    const paidSeconds = Math.floor(((eligibility.walletBalancePaise ?? 0) / eligibility.ratePerMinutePaise) * 60);
    const totalSeconds = (eligibility.freeAllowanceRemainingSeconds ?? 0) + paidSeconds;
    affordableMinutes = Math.floor(totalSeconds / 60);
  } else {
    // Complimentary session
    affordableMinutes = freeMins || 7;
  }

  const minRupees = eligibility.minimumRequiredPaise ? Math.ceil(eligibility.minimumRequiredPaise / 100) : rateRupees * 5;

  async function handleStart() {
    setStarting(true);
    try {
      await onConfirmStart();
      onOpenChange(false);
    } finally {
      setStarting(false);
    }
  }

  function handleRechargeClick() {
    onOpenChange(false);
    onOpenRecharge(minRupees);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#592209]/20 bg-[#FBF5EC] p-6 text-[#301607] shadow-xl sm:rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            {astrologer.photo ? (
              <img
                src={astrologer.photo}
                alt={astrologer.name}
                className="h-12 w-12 rounded-full border border-[#592209]/20 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#592209]/10 text-base font-semibold text-[#592209]">
                {astrologer.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <DialogTitle className="font-home-serif text-lg font-bold text-[#301607]">
                  {astrologer.name}
                </DialogTitle>
                {astrologer.verified && (
                  <ShieldCheck className="h-4 w-4 text-emerald-700" aria-label="Verified Astrologer" />
                )}
              </div>
              <p className="truncate text-xs text-[#7A6658]">
                {astrologer.expertise.slice(0, 2).join(" · ")}
              </p>
            </div>
          </div>
          <DialogDescription className="text-xs text-[#7A6658]">
            Review consultation pricing and your wallet runway before connecting.
          </DialogDescription>
        </DialogHeader>

        {/* Pricing details card */}
        <div className="mt-2 space-y-3 rounded-xl border border-[#592209]/15 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7A6658]">Consultation Rate</span>
            <span className="font-semibold text-[#301607]">
              {eligibility.type === "COMPLIMENTARY" || rateRupees === 0
                ? "Free / Complimentary"
                : `₹${rateRupees} / min (or ${rateRupees} coins)`}
            </span>
          </div>

          {freeMins > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> Complimentary Allowance
              </span>
              <span className="font-semibold">{freeMins} mins free</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-[#7A6658]">
              <Wallet className="h-3.5 w-3.5 text-[#592209]" /> Wallet Balance
            </span>
            <span className="font-semibold text-[#592209]">₹{balanceRupees}</span>
          </div>

          <div className="border-t border-[#592209]/10 pt-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-[#7A6658]">
                <Clock className="h-3.5 w-3.5" /> Estimated Duration
              </span>
              <span className="font-medium text-[#301607]">
                {eligibility.canStart
                  ? `~${affordableMinutes} minutes`
                  : "Insufficient balance"}
              </span>
            </div>
          </div>
        </div>

        {/* Billing note */}
        <p className="text-[11px] leading-relaxed text-[#7A6658]">
          Charges are deducted per minute only while both you and the astrologer are actively connected.
          Unused lookahead reservations are immediately restored when you finish.
        </p>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          {eligibility.canStart ? (
            <>
              <button
                type="button"
                onClick={handleRechargeClick}
                className="rounded-xl border border-[#592209]/30 px-4 py-2 text-sm font-medium text-[#592209] transition hover:bg-[#592209]/10"
              >
                Top up Coins
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={starting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#592209] px-5 py-2 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906] disabled:opacity-50"
              >
                {starting && <Loader2 className="h-4 w-4 animate-spin" />}
                Start Consultation
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRechargeClick}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#592209] px-5 py-2.5 text-sm font-semibold text-[#F5E9D6] transition hover:bg-[#431906]"
            >
              <Wallet className="h-4 w-4" />
              Recharge ₹{minRupees} to Chat
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

