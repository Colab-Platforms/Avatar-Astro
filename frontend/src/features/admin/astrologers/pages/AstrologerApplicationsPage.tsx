import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Empty, ErrorState, fmtDate, inputClass, Loading, PageHeader, Pager, Table } from "@/features/admin/panel/ui";
import { useAdminApplications } from "../hooks/useAdminAstrologers";
import type { AstrologerApplicationStatus } from "../types";

const STATUS_OPTIONS: AstrologerApplicationStatus[] = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "INTERVIEW_PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "SUSPENDED",
];

const STATUS_TONE: Record<AstrologerApplicationStatus, "neutral" | "good" | "bad" | "warn"> = {
  DRAFT: "neutral", SUBMITTED: "neutral", UNDER_REVIEW: "warn", MORE_INFORMATION_REQUIRED: "warn",
  INTERVIEW_PENDING: "warn", APPROVED: "good", REJECTED: "bad", WITHDRAWN: "neutral", SUSPENDED: "bad",
};

export default function AstrologerApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const status = (params.get("status") as AstrologerApplicationStatus | null) ?? undefined;
  const page = Number(params.get("page")) || 1;

  const query = useAdminApplications({ status, search: search || undefined, page, pageSize: 20 });

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Applications" subtitle="Every astrologer application submitted on the platform." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setFilter("search", search); }}
          onBlur={() => setFilter("search", search)}
        />
        <select className={`${inputClass} max-w-[220px]`} value={status ?? ""} onChange={(e) => setFilter("status", e.target.value || null)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {query.isLoading && <Loading />}
      {query.error && <ErrorState message="Could not load applications." onRetry={() => query.refetch()} />}
      {query.data && query.data.items.length === 0 && <Empty title="No applications match these filters" />}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table head={["Applicant", "Email", "Phone", "Specialty", "Experience", "Status", "Documents", "Applied", ""]}>
            {query.data.items.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2.5">{a.displayName || a.fullLegalName || "—"}</td>
                <td className="px-3 py-2.5">{a.email || "—"}</td>
                <td className="px-3 py-2.5">{a.phone || "—"}</td>
                <td className="px-3 py-2.5">{a.primarySpecialty || "—"}</td>
                <td className="px-3 py-2.5">{a.yearsOfExperience != null ? `${a.yearsOfExperience} yrs` : "—"}</td>
                <td className="px-3 py-2.5"><Badge tone={STATUS_TONE[a.status]}>{a.status.replace(/_/g, " ")}</Badge></td>
                <td className="px-3 py-2.5">{a.documentsVerified} verified / {a.documentsPending} pending</td>
                <td className="px-3 py-2.5">{fmtDate(a.submittedAt ?? a.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <Link to={`/admin/astrologers/applications/${a.id}`} className="text-sm font-medium text-[#803003] underline">Open</Link>
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={query.data.page} totalPages={Math.max(1, Math.ceil(query.data.total / query.data.pageSize))} total={query.data.total} onPage={(p) => setFilter("page", String(p))} />
        </>
      )}
    </div>
  );
}
