import { useState, useEffect } from "react";
import { Coins, HelpCircle, Loader2, Sparkles } from "lucide-react";
import { btn, card, field, IconChip, labelCls } from "@/features/dashboard/library/ui";
import { useUpdateAstrologerProfile } from "../../hooks/useAstrologerWorkspace";
import type { AstrologerProfileSelf } from "../../types";

interface PricingCardProps {
  profile: AstrologerProfileSelf;
}

export function PricingCard({ profile }: PricingCardProps) {
  const update = useUpdateAstrologerProfile();
  const [isFree, setIsFree] = useState(profile.pricePerMinute == null);
  const [value, setValue] = useState(profile.pricePerMinute?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsFree(profile.pricePerMinute == null);
    setValue(profile.pricePerMinute?.toString() ?? "");
  }, [profile.pricePerMinute]);

  const handleSave = () => {
    if (isFree) {
      setError(null);
      update.mutate({ pricePerMinute: null });
      return;
    }

    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n < 1 || n > 10_000) {
      setError("Please enter a whole rupee amount between ₹1 and ₹10,000 per minute.");
      return;
    }

    setError(null);
    update.mutate({ pricePerMinute: n });
  };

  return (
    <div className={`${card} p-5 sm:p-6 shadow-sm`}>
      <div className="mb-5 flex items-start gap-3.5 border-b border-[#E9DDC9] pb-4">
        <IconChip icon={Coins} tone="gold" size="sm" />
        <div className="min-w-0">
          <h2 className="font-home-serif text-lg font-semibold text-[#2A1A10]">
            Consultation Pricing
          </h2>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">
            Define how visitors are charged when initiating chat consultations with you.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle between Paid and Free */}
        <div className="rounded-xl border border-[#E9DDC9] bg-[#FAF6EE] p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => {
                setIsFree(e.target.checked);
                setError(null);
              }}
              className="mt-1 h-4 w-4 rounded border-[#D8C6A6] text-[#803003] focus:ring-[#A8803A]"
            />
            <div className="min-w-0">
              <span className="font-medium text-sm text-[#2A1A10]">
                Offer complimentary introductory chat
              </span>
              <p className="mt-0.5 text-xs text-[#6E5D4E]">
                Visitors get a one-time 7-minute free chat with you to ask questions. No wallet deduction or upfront payment required.
              </p>
            </div>
          </label>
        </div>

        {/* Price Input when Paid */}
        {!isFree ? (
          <div className="rounded-xl border border-[#E9DDC9] bg-white p-4">
            <label htmlFor="pricePerMinute" className={labelCls}>
              Rate per minute (INR)
            </label>
            <div className="mt-1.5 flex max-w-sm items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[#6E5D4E]">
                  ₹
                </span>
                <input
                  id="pricePerMinute"
                  type="number"
                  min={1}
                  max={10000}
                  className={`${field} pl-8`}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder="25"
                />
              </div>
              <span className="text-sm font-medium text-[#6E5D4E] shrink-0">
                / minute
              </span>
            </div>
            <p className="mt-2 text-[0.7rem] text-[#8C7A6B]">
              Standard platform fees apply. Clients must have sufficient wallet balance to connect.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-[#E8F3EB] px-3.5 py-2.5 text-xs font-medium text-[#2F7D4B]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Complimentary chat is active. Visitors can start a free 7-minute consultation.</span>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className={`${btn} min-w-[140px]`}
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Pricing
          </button>
        </div>
      </div>
    </div>
  );
}

