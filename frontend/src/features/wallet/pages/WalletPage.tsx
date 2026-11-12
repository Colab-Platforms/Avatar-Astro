import { useState } from "react";
import { Coins, Lock, PlusCircle, ShieldCheck } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import type { WalletTransaction } from "../api/walletApi";
import RechargeModal from "../components/RechargeModal";
import { card, Empty, ErrorBox, fmtDateTime, Loading, PageHeader, StatCard } from "@/features/dashboard/library/ui";

const REASON_LABEL: Record<WalletTransaction["reason"], string> = {
  RECHARGE: "Wallet recharge",
  CHAT_CONSUMPTION: "Astrologer chat",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
  SIGNUP_BONUS: "Signup bonus",
  TOOL_EXECUTION: "AI tool",
  RESERVATION_RELEASE: "Reservation released",
};

function formatRupees(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(paise) / 100).toFixed(2)}`;
}

export default function WalletPage() {
  const { data, isLoading, error, refetch } = useWallet();
  const [rechargeOpen, setRechargeOpen] = useState(false);

  if (isLoading) return <Loading label="Loading your wallet…" />;
  if (error || !data) return <ErrorBox error={error} onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title="Wallet"
        sub="1 coin = ₹1. Promotional coins are always spent before purchased ones."
        actions={
          <button type="button" onClick={() => setRechargeOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3A1C0C] px-4 py-2 text-sm font-medium text-[#FBF3E4] shadow-sm transition-colors hover:bg-[#2A1308]">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add coins
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Coins} tone="gold" value={formatRupees(data.balancePaise)} label="Total balance" />
        <StatCard icon={ShieldCheck} tone="sage" value={formatRupees(data.purchasedBalancePaise)} label="Purchased" />
        <StatCard icon={PlusCircle} tone="brown" value={formatRupees(data.promotionalBalancePaise)} label="Promotional" hint="Spent first" />
        <StatCard icon={Lock} tone="plum" value={formatRupees(data.reservedBalancePaise)} label="Held in reservations" hint="In an active chat or AI tool run" />
      </div>

      <div className={`mt-6 ${card}`}>
        <div className="border-b border-[#E9DDC9] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#2A1A10]">Recent transactions</h2>
        </div>
        {data.transactions.length === 0 ? (
          <Empty icon={Coins} title="No transactions yet" body="Recharges, chats and AI tool usage will show up here." />
        ) : (
          <ul className="divide-y divide-[#E9DDC9]">
            {data.transactions.map((t) => {
              const isCredit = t.type === "CREDIT";
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2A1A10]">{REASON_LABEL[t.reason] ?? t.reason}</p>
                    <p className="mt-0.5 text-xs text-[#8C7A6B]">
                      {fmtDateTime(t.createdAt)}
                      {t.allocations.length > 0 && (
                        <span className="ml-1.5">
                          ·{" "}
                          {t.allocations
                            .map((a) => `${a.bucket === "PROMOTIONAL" ? "promo" : "purchased"} ${formatRupees(a.amountPaise)}`)
                            .join(" + ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${isCredit ? "text-emerald-700" : "text-[#2A1A10]"}`}>
                    {isCredit ? "+" : "-"}
                    {formatRupees(t.amountPaise)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RechargeModal open={rechargeOpen} onOpenChange={setRechargeOpen} />
    </div>
  );
}
