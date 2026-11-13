import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePanel, panelSend, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Card, fmtDate, ghostBtn, inputClass, Stat, Table } from "../ui";
import { Coins, PlusCircle, MinusCircle, X, History, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: string;
  amountPaise: number;
  balanceAfterPaise: number;
  referenceId: string | null;
  createdAt: string;
  allocations?: {
    id: string;
    bucket: "PURCHASED" | "PROMOTIONAL";
    amountPaise: number;
  }[];
}

interface WalletUserSummary {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNo: string | null;
  };
  balancePaise: number;
  purchasedBalancePaise: number;
  promotionalBalancePaise: number;
  reservedBalancePaise: number;
  transactions: WalletTransaction[];
}

export function CustomerWalletCard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const q = usePanel<WalletUserSummary>(`/wallet/user/${userId}`);

  return (
    <Card
      title="Coin Wallet & Financial Balance"
      description="Live ledger balance, purchased vs promotional breakdown, holds, and audited manual adjustments."
      actions={
        <button
          type="button"
          onClick={() => setAdjustOpen(true)}
          className="rounded-lg bg-[#803003] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6B2802] transition flex items-center gap-1.5"
        >
          <Coins className="h-3.5 w-3.5" /> Adjust Balance
        </button>
      }
    >
      <QueryView q={q}>
        {(data) => {
          const totalCoins = (data.balancePaise / 100).toFixed(2);
          const purchasedCoins = (data.purchasedBalancePaise / 100).toFixed(2);
          const promoCoins = (data.promotionalBalancePaise / 100).toFixed(2);
          const reservedCoins = (data.reservedBalancePaise / 100).toFixed(2);

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Total Coins Balance"
                  value={`₹${totalCoins}`}
                  hint="1 coin = ₹1 (available to spend)"
                />
                <Stat
                  label="Purchased Coins"
                  value={`₹${purchasedCoins}`}
                  hint="Customer recharges (Razorpay)"
                />
                <Stat
                  label="Promotional Coins"
                  value={`₹${promoCoins}`}
                  hint="Signup bonuses & promotional grants"
                />
                <Stat
                  label="Reserved in Active Holds"
                  value={`₹${reservedCoins}`}
                  hint="Held by active chat/tool reservations"
                />
              </div>

              {/* Transactions Mini Ledger */}
              <div>
                <h4 className="mb-2 text-xs font-semibold text-[#1F1B16] flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#6B6259]" /> Recent Wallet Ledger (Last 5)
                </h4>
                {data.transactions.length === 0 ? (
                  <p className="rounded-lg border border-[#E8E3DC] p-4 text-center text-xs text-[#6B6259]">
                    No wallet transactions recorded yet for this customer.
                  </p>
                ) : (
                  <Table head={["Type", "Reason", "Amount", "Balance After", "Recorded"]}>
                    {data.transactions.slice(0, 5).map((t) => {
                      const isCredit = t.type === "CREDIT";
                      return (
                        <tr key={t.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                                isCredit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                              )}
                            >
                              {isCredit ? (
                                <PlusCircle className="h-3 w-3" />
                              ) : (
                                <MinusCircle className="h-3 w-3" />
                              )}
                              {t.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-[#1F1B16]">
                            {t.reason}
                            {t.referenceId && (
                              <span className="ml-1 text-[10px] text-[#6B6259]">({t.referenceId.slice(0, 8)}…)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-[#1F1B16]">
                            {isCredit ? "+" : "-"}₹{(t.amountPaise / 100).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-[#6B6259]">
                            ₹{(t.balanceAfterPaise / 100).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-[#6B6259] whitespace-nowrap">
                            {fmtDate(t.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                )}
              </div>

              {adjustOpen && (
                <AdjustWalletDialog
                  userId={userId}
                  currentBalancePaise={data.balancePaise}
                  purchasedPaise={data.purchasedBalancePaise}
                  promotionalPaise={data.promotionalBalancePaise}
                  reservedPaise={data.reservedBalancePaise}
                  userName={userName}
                  onClose={() => setAdjustOpen(false)}
                />
              )}
            </div>
          );
        }}
      </QueryView>
    </Card>
  );
}

function AdjustWalletDialog({
  userId,
  currentBalancePaise,
  purchasedPaise,
  promotionalPaise,
  reservedPaise,
  userName,
  onClose,
}: {
  userId: string;
  currentBalancePaise: number;
  purchasedPaise: number;
  promotionalPaise: number;
  reservedPaise: number;
  userName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [coinsInput, setCoinsInput] = useState<string>("10");
  const [bucket, setBucket] = useState<"PURCHASED" | "PROMOTIONAL">("PURCHASED");
  const [reasonText, setReasonText] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const numCoins = Number(coinsInput) || 0;
  const amountPaise = Math.round(numCoins * 100);

  // Projected balance calculation
  const signedPaise = direction === "CREDIT" ? amountPaise : -amountPaise;
  const projectedBalancePaise = currentBalancePaise + signedPaise;
  const unreservedBalancePaise = currentBalancePaise - reservedPaise;

  const isInvalidDebit = direction === "DEBIT" && amountPaise > unreservedBalancePaise;

  const mutation = useMutation({
    mutationFn: () =>
      panelSend("POST", "/wallet/adjust", {
        userId,
        amountPaise: signedPaise,
        bucket,
        reasonText: reasonText.trim(),
        referenceId: referenceId.trim() || undefined,
      }),
    onSuccess: () => {
      setFeedback({ ok: true, text: "Wallet balance adjusted and audited successfully." });
      qc.invalidateQueries({ queryKey: ["admin-panel", `/wallet/user/${userId}`] });
      qc.invalidateQueries({ queryKey: ["admin-panel", `/customers/${userId}`] });
      setTimeout(onClose, 900);
    },
    onError: (err) => setFeedback({ ok: false, text: errorMessage(err) }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#E8E3DC] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#1F1B16]">Adjust Customer Wallet</h3>
            <p className="text-xs text-[#6B6259]">Target: {userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B6259] hover:bg-[#F4EEE6] hover:text-[#1F1B16] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {feedback && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                feedback.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
              }`}
            >
              {feedback.text}
            </p>
          )}

          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1.5">Adjustment Action</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("CREDIT")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition",
                  direction === "CREDIT"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-[#E8E3DC] bg-white text-[#6B6259] hover:bg-[#FAF8F5]",
                )}
              >
                <PlusCircle className="h-4 w-4" /> Credit Coins (+)
              </button>
              <button
                type="button"
                onClick={() => setDirection("DEBIT")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition",
                  direction === "DEBIT"
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-[#E8E3DC] bg-white text-[#6B6259] hover:bg-[#FAF8F5]",
                )}
              >
                <MinusCircle className="h-4 w-4" /> Debit Coins (-)
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
              Coins Amount (1 Coin = ₹1.00)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-semibold text-[#6B6259]">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                className={`${inputClass} pl-7 w-full font-mono text-sm`}
                value={coinsInput}
                onChange={(e) => setCoinsInput(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[11px] text-[#6B6259]">
              Equivalent: {amountPaise} paise
            </p>
          </div>

          {/* Bucket selection (for Credit) */}
          {direction === "CREDIT" ? (
            <div>
              <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
                Target Coin Bucket
              </label>
              <select
                className={`${inputClass} w-full text-xs`}
                value={bucket}
                onChange={(e) => setBucket(e.target.value as any)}
              >
                <option value="PURCHASED">PURCHASED Coins (Recharge equivalent)</option>
                <option value="PROMOTIONAL">PROMOTIONAL Coins (Non-withdrawable goodwill/bonus)</option>
              </select>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-900 leading-relaxed">
              <strong>Debit Rule:</strong> Debits promotional coins first, then purchased coins (Rule C). The balance can never go below ₹0.00 or dip into active holds.
            </p>
          )}

          {/* Projected Balance Preview */}
          <div className="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Current Available Balance:</span>
              <span className="font-mono font-medium text-[#1F1B16]">
                ₹{(currentBalancePaise / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Adjustment:</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  direction === "CREDIT" ? "text-emerald-700" : "text-red-700",
                )}
              >
                {direction === "CREDIT" ? "+" : "-"}₹{(amountPaise / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E8E3DC] pt-1">
              <span className="font-semibold text-[#1F1B16]">Projected Balance After:</span>
              <span
                className={cn(
                  "font-mono font-bold",
                  projectedBalancePaise < 0 ? "text-red-700" : "text-[#1F1B16]",
                )}
              >
                ₹{(projectedBalancePaise / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {isInvalidDebit && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Debit amount exceeds available unreserved balance (₹{(unreservedBalancePaise / 100).toFixed(2)}).
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
              Mandatory Audit Reason <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Support resolution for dropped consultation session #cs_123"
              className={`${inputClass} w-full text-xs`}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
          </div>

          {/* Optional Reference */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
              Reference / Ticket ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TICKET-9821 or REF-5521"
              className={`${inputClass} w-full text-xs`}
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E8E3DC] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#DDD6CC] bg-white px-3 py-1.5 text-xs font-medium text-[#1F1B16] hover:bg-[#F7F4EF]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              mutation.isPending ||
              amountPaise <= 0 ||
              reasonText.trim().length < 3 ||
              isInvalidDebit
            }
            onClick={() => mutation.mutate()}
            className="rounded-lg bg-[#803003] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#6B2802] disabled:opacity-50"
          >
            {mutation.isPending ? "Applying…" : "Confirm Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}

