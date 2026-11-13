import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePanel, panelSend, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Empty, fmtDate, ghostBtn, inputClass, PageHeader, Pager, Stat, Table } from "../ui";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentRefundItem {
  id: string;
  paymentOrderId: string;
  kind: "REFUND" | "DISPUTE";
  providerRefundId: string | null;
  providerDisputeId: string | null;
  amountPaise: number;
  providerStatus: string;
  handling: "ACTION_REQUIRED" | "PROCESSED" | "DISMISSED";
  handledBy: string | null;
  handledAt: string | null;
  notes: string | null;
  createdAt: string;
  paymentOrder?: {
    id: string;
    amountPaise: number;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    user?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phoneNo: string | null;
    };
  };
}

interface PaymentRefundsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: PaymentRefundItem[];
}

function handlingBadge(handling: string) {
  switch (handling) {
    case "ACTION_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <AlertTriangle className="h-3 w-3" /> Action Required
        </span>
      );
    case "PROCESSED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Processed
        </span>
      );
    case "DISMISSED":
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-[#F4EEE6] px-2.5 py-0.5 text-xs font-medium text-[#6B6259]">
          Dismissed
        </span>
      );
  }
}

export default function PaymentRefundsAdminPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const currentHandling = params.get("handling") || "";
  const [selectedRefund, setSelectedRefund] = useState<PaymentRefundItem | null>(null);

  const setHandlingFilter = (val: string) => {
    const next = new URLSearchParams(params);
    if (val) next.set("handling", val);
    else next.delete("handling");
    next.delete("page");
    setParams(next, { replace: true });
  };

  const apiPath = `/refunds?page=${page}&limit=20${currentHandling ? `&handling=${currentHandling}` : ""}`;
  const q = usePanel<PaymentRefundsResponse>(apiPath, {
    placeholderData: (p) => p,
  });

  const totalItems = q.data?.total ?? 0;
  const actionRequiredCount =
    q.data?.items.filter((i) => i.handling === "ACTION_REQUIRED").length ?? 0;
  const totalAmount =
    q.data?.items.reduce((sum, item) => sum + item.amountPaise, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Payment Refunds & Disputes"
        subtitle="Gateway refunds and chargeback disputes recorded via verified webhooks. Per platform financial policy, refunds are reviewed and handled without unapproved wallet debits."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Total Recorded Events"
          value={totalItems}
          hint="Webhook audit trail"
        />
        <Stat
          label="Action Required"
          value={actionRequiredCount}
          tone={actionRequiredCount > 0 ? "bad" : "default"}
          hint="Awaiting administrative review"
        />
        <Stat
          label="Total Page Amount"
          value={`₹${(totalAmount / 100).toFixed(2)}`}
          hint="Across retrieved records"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[#E8E3DC]">
        {[
          { label: "All events", val: "" },
          { label: "Action required", val: "ACTION_REQUIRED" },
          { label: "Processed", val: "PROCESSED" },
          { label: "Dismissed", val: "DISMISSED" },
        ].map((tab) => (
          <button
            key={tab.val}
            type="button"
            onClick={() => setHandlingFilter(tab.val)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-medium transition",
              currentHandling === tab.val
                ? "border-[#803003] text-[#803003]"
                : "border-transparent text-[#6B6259] hover:text-[#1F1B16]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <QueryView q={q}>
        {(data) => (
          <div className="space-y-4">
            {data.items.length === 0 ? (
              <Empty
                title="No refunds or disputes recorded"
                hint={
                  currentHandling
                    ? "No records match this filter."
                    : "No gateway refund or dispute webhooks have been received."
                }
              />
            ) : (
              <Table
                head={[
                  "Kind",
                  "Provider ID",
                  "Customer",
                  "Amount",
                  "Gateway Status",
                  "Handling",
                  "Recorded",
                  "Action",
                ]}
              >
                {data.items.map((r) => {
                  const cust = r.paymentOrder?.user;
                  const customerName = cust
                    ? [cust.firstName, cust.lastName].filter(Boolean).join(" ") || cust.email
                    : "Unknown";

                  return (
                    <tr key={r.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                            r.kind === "DISPUTE"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800",
                          )}
                        >
                          {r.kind}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-xs font-medium text-[#1F1B16]">
                          {r.providerRefundId || r.providerDisputeId || "—"}
                        </p>
                        <p className="font-mono text-[10px] text-[#6B6259]">
                          Order: {r.paymentOrderId.slice(0, 10)}…
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-medium text-[#1F1B16]">{customerName}</p>
                        {cust?.email && <p className="text-[11px] text-[#6B6259]">{cust.email}</p>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-[#1F1B16]">
                        ₹{(r.amountPaise / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-[#F4EEE6] px-2 py-0.5 font-mono text-[11px] font-medium text-[#4A423A]">
                          {r.providerStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{handlingBadge(r.handling)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B6259] whitespace-nowrap">
                        {fmtDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRefund(r)}
                          className="rounded-lg border border-[#DDD6CC] bg-white px-2.5 py-1 text-xs font-medium text-[#803003] hover:bg-[#F7F4EF] hover:border-[#803003]/40 transition"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}

            {data.totalPages > 1 && (
              <Pager
                page={data.page}
                totalPages={data.totalPages}
                onPage={(p) => {
                  const next = new URLSearchParams(params);
                  next.set("page", String(p));
                  setParams(next, { replace: true });
                }}
              />
            )}
          </div>
        )}
      </QueryView>

      {/* Review Modal */}
      {selectedRefund && (
        <RefundReviewDialog
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
        />
      )}
    </div>
  );
}

function RefundReviewDialog({
  refund,
  onClose,
}: {
  refund: PaymentRefundItem;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [handling, setHandling] = useState<"ACTION_REQUIRED" | "PROCESSED" | "DISMISSED">(
    refund.handling,
  );
  const [notes, setNotes] = useState(refund.notes || "");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      panelSend("PATCH", `/refunds/${refund.id}`, {
        handling,
        notes,
      }),
    onSuccess: () => {
      setFeedback({ ok: true, text: "Refund record updated successfully." });
      qc.invalidateQueries({ queryKey: ["admin-panel", "/refunds"] });
      setTimeout(onClose, 800);
    },
    onError: (err) => setFeedback({ ok: false, text: errorMessage(err) }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#E8E3DC] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#1F1B16]">
              Review {refund.kind === "DISPUTE" ? "Chargeback Dispute" : "Payment Refund"}
            </h3>
            <p className="font-mono text-xs text-[#6B6259]">ID: {refund.id}</p>
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

          <div className="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Provider Reference:</span>
              <span className="font-mono font-medium text-[#1F1B16]">
                {refund.providerRefundId || refund.providerDisputeId || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Amount:</span>
              <span className="font-semibold text-[#1F1B16]">
                ₹{(refund.amountPaise / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Provider Status:</span>
              <span className="font-mono text-[#1F1B16]">{refund.providerStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6259]">Recorded:</span>
              <span className="text-[#1F1B16]">{fmtDate(refund.createdAt)}</span>
            </div>
            {refund.handledBy && (
              <div className="flex justify-between">
                <span className="text-[#6B6259]">Last Handled By:</span>
                <span className="text-[#1F1B16]">{refund.handledBy}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
              Admin Handling Resolution
            </label>
            <select
              className={`${inputClass} w-full`}
              value={handling}
              onChange={(e) => setHandling(e.target.value as any)}
            >
              <option value="ACTION_REQUIRED">ACTION REQUIRED (Needs attention)</option>
              <option value="PROCESSED">PROCESSED (Resolved / Handled)</option>
              <option value="DISMISSED">DISMISSED (Rejected / No action needed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F1B16] mb-1">
              Resolution Notes & Audit Reason
            </label>
            <textarea
              rows={3}
              className={`${inputClass} w-full text-xs`}
              placeholder="Record reason or steps taken for financial audit trail…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="rounded-lg bg-[#803003] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#6B2802] disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : "Save Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}

