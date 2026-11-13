import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePanel, panelSend, errorMessage } from "../api";
import { QueryView } from "../QueryView";
import { Badge, Empty, fmtDate, ghostBtn, inputClass, isoDay, PageHeader, Pager, Stat, Table } from "../ui";
import {
  MessageSquare,
  Clock,
  Coins,
  Activity,
  User,
  Sparkles,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSessionItem {
  id: string;
  type: "PAID" | "FREE_TRIAL" | "COMPLIMENTARY";
  status: "REQUESTED" | "ACTIVE" | "PAUSED" | "ENDED";
  ratePerMinutePaise: number;
  freeLimitSeconds: number | null;
  freeSecondsUsed: number;
  billedSeconds: number;
  amountPaise: number;
  requestedAt: string;
  requestExpiresAt: string | null;
  acceptedAt: string | null;
  pausedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNo: string | null;
  };
  astrologerProfile: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
    pricePerMinute: number | null;
  };
  _count: {
    messages: number;
  };
}

interface ChatSessionDetail {
  session: ChatSessionItem & {
    messages: {
      id: string;
      senderRole: "USER" | "ASTROLOGER";
      content: string;
      createdAt: string;
      clientMessageId: string | null;
    }[];
  };
  reservation: {
    id: string;
    purpose: string;
    amountPaise: number;
    status: string;
    createdAt: string;
  } | null;
}

interface ChatSessionsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: {
    totalSessions: number;
    activeCount: number;
    requestedCount: number;
    pausedCount: number;
    endedCount: number;
    totalBilledSeconds: number;
    totalAmountPaise: number;
  };
  items: ChatSessionItem[];
}

const FILTER_KEYS = ["search", "status", "type", "startDate", "endDate"] as const;

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
          Active
        </span>
      );
    case "PAUSED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Paused
        </span>
      );
    case "REQUESTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
          Requested
        </span>
      );
    case "ENDED":
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-[#F4EEE6] px-2.5 py-0.5 text-xs font-medium text-[#4A423A]">
          Ended
        </span>
      );
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "COMPLIMENTARY":
      return <Badge tone="info">Complimentary</Badge>;
    case "FREE_TRIAL":
      return <Badge tone="neutral">Free trial</Badge>;
    case "PAID":
    default:
      return <Badge tone="success">Paid</Badge>;
  }
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export default function ConsultationsAdminPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [searchText, setSearchText] = useState(params.get("search") ?? "");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const apiQuery = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) apiQuery.set(k, v);
  }
  apiQuery.set("page", String(page));
  apiQuery.set("limit", "15");

  const q = usePanel<ChatSessionsResponse>(`/chat-sessions?${apiQuery.toString()}`, {
    placeholderData: (p) => p,
    refetchInterval: 10_000, // Live poll every 10s for active consultations
  });

  const filtersActive = FILTER_KEYS.some((k) => params.get(k));
  const sel = "w-auto min-w-[8.5rem]";

  const metrics = q.data?.metrics;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Consultation Sessions & Monitoring"
        subtitle="Live oversight of customer <-> astrologer consultations, durations, coin billing, holds, and conversation transcripts."
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Sessions"
          value={metrics?.totalSessions ?? "—"}
          hint={`${metrics?.endedCount ?? 0} completed`}
        />
        <Stat
          label="Active / Live Now"
          value={
            <span className="flex items-center gap-2 text-emerald-800">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600" />
              {metrics?.activeCount ?? 0}
            </span>
          }
          hint={`${metrics?.pausedCount ?? 0} paused · ${metrics?.requestedCount ?? 0} pending`}
        />
        <Stat
          label="Total Billed Minutes"
          value={metrics ? `${Math.round(metrics.totalBilledSeconds / 60)} min` : "—"}
          hint={`${metrics?.totalBilledSeconds ?? 0} seconds elapsed`}
        />
        <Stat
          label="Total Revenue Billed"
          value={metrics ? `₹${(metrics.totalAmountPaise / 100).toFixed(2)}` : "—"}
          hint={`${metrics ? metrics.totalAmountPaise : 0} paise`}
        />
      </div>

      {/* Filter and Search Bar */}
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-[#E8E3DC] bg-white p-4 shadow-[0_1px_2px_rgba(31,27,22,0.04)]"
        onSubmit={(e) => {
          e.preventDefault();
          set({ search: searchText.trim() || null });
        }}
        aria-label="Consultation filters"
      >
        <label className="text-xs font-medium text-[#6B6259]">
          Search
          <input
            className={`${inputClass} mt-1 w-64`}
            placeholder="User email, name, or session ID"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-[#6B6259]">
          Status
          <select
            className={`${inputClass} ${sel} mt-1`}
            value={params.get("status") ?? ""}
            onChange={(e) => set({ status: e.target.value || null })}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active (Live)</option>
            <option value="PAUSED">Paused</option>
            <option value="REQUESTED">Requested (Pending)</option>
            <option value="ENDED">Ended</option>
          </select>
        </label>
        <label className="text-xs font-medium text-[#6B6259]">
          Type
          <select
            className={`${inputClass} ${sel} mt-1`}
            value={params.get("type") ?? ""}
            onChange={(e) => set({ type: e.target.value || null })}
          >
            <option value="">All types</option>
            <option value="PAID">Paid</option>
            <option value="COMPLIMENTARY">Complimentary</option>
            <option value="FREE_TRIAL">Free trial</option>
          </select>
        </label>
        <label className="text-xs font-medium text-[#6B6259]">
          From date
          <input
            type="date"
            className={`${inputClass} ${sel} mt-1`}
            value={params.get("startDate") ?? ""}
            onChange={(e) => set({ startDate: e.target.value || null })}
          />
        </label>
        <label className="text-xs font-medium text-[#6B6259]">
          To date
          <input
            type="date"
            className={`${inputClass} ${sel} mt-1`}
            value={params.get("endDate") ?? ""}
            onChange={(e) => set({ endDate: e.target.value || null })}
          />
        </label>
        <button className={ghostBtn} type="submit">
          Apply
        </button>
        {filtersActive && (
          <button
            type="button"
            className={ghostBtn}
            onClick={() => {
              setSearchText("");
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            Clear filters
          </button>
        )}
      </form>

      {/* Main Table */}
      <QueryView q={q}>
        {(data) => (
          <div className="space-y-4">
            {data.items.length === 0 ? (
              <Empty
                title="No consultations found"
                hint={filtersActive ? "Try clearing or loosening your filters." : "No consultation sessions have occurred yet."}
              />
            ) : (
              <Table head={["Session", "Customer", "Astrologer", "Status", "Rate", "Duration", "Amount", "Started", "Action"]}>
                {data.items.map((s) => {
                  const customerName =
                    [s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.email;
                  return (
                    <tr key={s.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-xs font-semibold text-[#1F1B16]">{s.id.slice(0, 10)}…</div>
                        <div className="mt-0.5">{typeBadge(s.type)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[#1F1B16] text-xs">{customerName}</p>
                        <p className="text-[11px] text-[#6B6259]">{s.user.email}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {s.astrologerProfile.profilePhotoUrl ? (
                            <img
                              src={s.astrologerProfile.profilePhotoUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover border border-[#E8E3DC]"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F4EEE6] text-[10px] font-bold text-[#803003]">
                              {s.astrologerProfile.displayName.charAt(0)}
                            </span>
                          )}
                          <span className="text-xs font-medium text-[#1F1B16]">
                            {s.astrologerProfile.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{statusBadge(s.status)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#1F1B16]">
                        {s.type === "COMPLIMENTARY" ? "Free" : `₹${(s.ratePerMinutePaise / 100).toFixed(0)}/m`}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#1F1B16]">
                        <p className="font-semibold">{formatDuration(s.billedSeconds)}</p>
                        {s.freeSecondsUsed > 0 && (
                          <p className="text-[11px] text-[#6B6259]">({formatDuration(s.freeSecondsUsed)} free)</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-[#1F1B16]">
                        {s.amountPaise > 0 ? `₹${(s.amountPaise / 100).toFixed(2)}` : "₹0.00"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#6B6259] whitespace-nowrap">
                        {fmtDate(s.acceptedAt || s.requestedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionId(s.id)}
                          className="rounded-lg border border-[#DDD6CC] bg-white px-2.5 py-1 text-xs font-medium text-[#803003] hover:bg-[#F7F4EF] hover:border-[#803003]/40 transition"
                        >
                          View Details
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
                onPage={(p) => set({ page: String(p) })}
              />
            )}
          </div>
        )}
      </QueryView>

      {/* Session Details & Transcript Modal */}
      {selectedSessionId && (
        <SessionDetailDialog
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}

function SessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const q = usePanel<ChatSessionDetail>(`/chat-sessions/${sessionId}`);
  const [terminateMsg, setTerminateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const termMutation = useMutation({
    mutationFn: () => panelSend("POST", `/chat-sessions/${sessionId}/terminate`, { reason: "Admin console action" }),
    onSuccess: () => {
      setTerminateMsg({ ok: true, text: "Chat session terminated. Lookahead hold released/settled." });
      qc.invalidateQueries({ queryKey: ["admin-panel", `/chat-sessions/${sessionId}`] });
      qc.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (err) => setTerminateMsg({ ok: false, text: errorMessage(err) }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-[#E8E3DC] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1F1B16]">Consultation Audit & Transcript</h3>
            <p className="font-mono text-xs text-[#6B6259]">Session ID: {sessionId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B6259] hover:bg-[#F4EEE6] hover:text-[#1F1B16] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {terminateMsg && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-sm ${
                terminateMsg.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
              }`}
            >
              {terminateMsg.text}
            </p>
          )}

          <QueryView q={q}>
            {(detail) => {
              const s = detail.session;
              const r = detail.reservation;
              const isLive = s.status === "ACTIVE" || s.status === "PAUSED" || s.status === "REQUESTED";

              return (
                <div className="space-y-6">
                  {/* Overview Grid */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-4 text-xs">
                    <div>
                      <p className="text-[#6B6259]">Customer</p>
                      <p className="font-semibold text-[#1F1B16]">
                        {[s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || "No name"}
                      </p>
                      <p className="text-[#6B6259]">{s.user.email}</p>
                      {s.user.phoneNo && <p className="text-[#6B6259]">{s.user.phoneNo}</p>}
                    </div>
                    <div>
                      <p className="text-[#6B6259]">Astrologer</p>
                      <p className="font-semibold text-[#1F1B16]">{s.astrologerProfile.displayName}</p>
                      <p className="text-[#6B6259]">Rate: ₹{(s.ratePerMinutePaise / 100).toFixed(0)}/min</p>
                    </div>
                    <div>
                      <p className="text-[#6B6259]">Status & Type</p>
                      <div className="mt-1 flex items-center gap-2">
                        {statusBadge(s.status)}
                        {typeBadge(s.type)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#6B6259]">Duration & Charge</p>
                      <p className="font-semibold text-[#1F1B16]">
                        {formatDuration(s.billedSeconds)} billed · ₹{(s.amountPaise / 100).toFixed(2)}
                      </p>
                      {s.freeSecondsUsed > 0 && (
                        <p className="text-[#6B6259]">{formatDuration(s.freeSecondsUsed)} complimentary</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[#6B6259]">Requested / Accepted</p>
                      <p className="text-[#1F1B16]">{fmtDate(s.requestedAt)}</p>
                      <p className="text-[#6B6259]">
                        Accepted: {s.acceptedAt ? fmtDate(s.acceptedAt) : "Pending"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#6B6259]">Ended</p>
                      <p className="text-[#1F1B16]">{s.endedAt ? fmtDate(s.endedAt) : "Still active"}</p>
                      {s.endedReason && (
                        <p className="font-mono text-[11px] text-[#803003]">Reason: {s.endedReason}</p>
                      )}
                    </div>
                  </div>

                  {/* Reservation Hold Info */}
                  {r && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                      <p className="font-semibold">Lookahead Coin Reservation</p>
                      <p>
                        Status: <span className="font-mono font-medium">{r.status}</span> · Amount:{" "}
                        <span className="font-semibold">₹{(r.amountPaise / 100).toFixed(2)}</span>
                      </p>
                    </div>
                  )}

                  {/* Live Administrative Action */}
                  {isLive && (
                    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-red-900">Emergency Administrative Termination</p>
                        <p className="text-xs text-red-700">
                          Force-ends this active session, releases unused coin reservations, and cleans up timers.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={termMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to administratively terminate this active consultation?",
                            )
                          ) {
                            termMutation.mutate();
                          }
                        }}
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                      >
                        {termMutation.isPending ? "Terminating…" : "Force End Session"}
                      </button>
                    </div>
                  )}

                  {/* Conversation Transcript */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-[#1F1B16]">
                      Conversation Transcript ({s.messages.length} messages)
                    </h4>
                    {s.messages.length === 0 ? (
                      <p className="rounded-lg border border-[#E8E3DC] p-6 text-center text-xs text-[#6B6259]">
                        No messages were exchanged in this session.
                      </p>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-4 max-h-80 overflow-y-auto">
                        {s.messages.map((m) => {
                          const isUser = m.senderRole === "USER";
                          return (
                            <div
                              key={m.id}
                              className={cn("flex flex-col max-w-[80%]", isUser ? "mr-auto" : "ml-auto items-end")}
                            >
                              <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-[#6B6259]">
                                <span className="font-semibold text-[#1F1B16]">
                                  {isUser ? "Customer" : "Astrologer"}
                                </span>
                                <span>· {fmtDate(m.createdAt)}</span>
                              </div>
                              <div
                                className={cn(
                                  "rounded-xl px-3.5 py-2 text-xs leading-relaxed",
                                  isUser
                                    ? "bg-white text-[#1F1B16] border border-[#E8E3DC] rounded-tl-sm"
                                    : "bg-[#803003] text-white rounded-tr-sm",
                                )}
                              >
                                {m.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          </QueryView>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#E8E3DC] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#DDD6CC] bg-white px-4 py-1.5 text-xs font-medium text-[#1F1B16] hover:bg-[#F7F4EF]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

