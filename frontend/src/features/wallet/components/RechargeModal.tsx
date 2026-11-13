import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthApiError } from "@/lib/authClient";
import { useRecharge } from "../hooks/useWallet";

const PRESETS_RUPEES = [49, 99, 199, 499];

const inputCls =
  "w-full rounded-lg border border-[#592209]/30 bg-white px-3 py-2.5 text-base text-[#2C1810] placeholder:text-[#2C1810]/35 focus:border-[#592209] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#592209]/40";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Minimum amount (rupees) the chat actually needs, shown as a hint when set. */
  minimumRupees?: number;
  onSuccess?: (balancePaise: number) => void;
}

export default function RechargeModal({ open, onOpenChange, minimumRupees, onSuccess }: Props) {
  const [selected, setSelected] = useState<number | null>(PRESETS_RUPEES[1]);
  const [custom, setCustom] = useState("");
  const [isCheckoutActive, setIsCheckoutActive] = useState(false);
  const recharge = useRecharge();

  const amountRupees = custom.trim() ? Number(custom) : selected;
  const valid = Boolean(amountRupees && Number.isFinite(amountRupees) && amountRupees >= 20 && amountRupees <= 10_000);

  function pay() {
    if (!valid || !amountRupees) return;
    recharge.mutate(
      {
        amountPaise: Math.round(amountRupees * 100),
        onBeforeOpen: () => setIsCheckoutActive(true),
        onDismiss: () => setIsCheckoutActive(false),
      },
      {
        onSuccess: (result) => {
          setIsCheckoutActive(false);
          toast.success(`₹${amountRupees} added to your wallet`);
          onSuccess?.(result.balancePaise);
          onOpenChange(false);
          setCustom("");
        },
        onError: (err) => {
          setIsCheckoutActive(false);
          const msg =
            err instanceof AuthApiError || err instanceof Error
              ? err.message
              : "Recharge failed. Please try again.";
          if (msg !== "Payment cancelled by user") {
            toast.error(msg);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open && !isCheckoutActive} onOpenChange={(next) => !recharge.isPending && onOpenChange(next)}>
      <DialogContent
        className="max-w-md border-[#592209]/15 bg-[#FBF5EC] sm:rounded-2xl"
        onInteractOutside={(e) => {
          if (isCheckoutActive) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-home-serif text-xl text-[#301607]">
            <Wallet className="h-5 w-5 text-[#592209]" aria-hidden="true" /> Recharge your wallet
          </DialogTitle>
          <DialogDescription className="text-[#6B4A37]">
            {minimumRupees
              ? `You need at least ₹${minimumRupees} to start this chat. Add funds below to continue.`
              : "Add funds to start chatting with astrologers. Minutes are deducted at each astrologer's own rate."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS_RUPEES.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setSelected(amt);
                setCustom("");
              }}
              className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                selected === amt && !custom
                  ? "border-[#592209] bg-[#592209] text-[#F5E9D6]"
                  : "border-[#592209]/25 bg-white text-[#592209] hover:bg-[#592209]/5"
              }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="custom-amount" className="mb-1 block text-sm font-semibold text-[#2C1810]">
            Or enter a custom amount (₹)
          </label>
          <input
            id="custom-amount"
            type="number"
            min={20}
            max={10000}
            inputMode="numeric"
            placeholder="e.g. 150"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setSelected(null);
            }}
            className={inputCls}
          />
          {custom && !valid && <p className="mt-1 text-sm text-red-700">Enter an amount between ₹20 and ₹10,000.</p>}
        </div>

        <button
          type="button"
          onClick={pay}
          disabled={!valid || recharge.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#592209] px-5 py-3 text-base font-semibold text-[#F5E9D6] transition hover:bg-[#431906] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {recharge.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {recharge.isPending
            ? "Processing..."
            : `Pay ₹${amountRupees && Number.isFinite(amountRupees) ? amountRupees : "—"}`}
        </button>
        <p className="text-center text-xs text-[#6B4A37]">
          Secure payments powered by Razorpay (UPI, Cards, NetBanking). 100% encrypted.
        </p>
      </DialogContent>
    </Dialog>
  );
}
