import { Link } from "react-router-dom";
import { ErrorState, Loading, PageHeader, Stat } from "@/features/admin/panel/ui";
import { useAdminOverview } from "../hooks/useAdminAstrologers";
import type { AstrologerApplicationStatus } from "../types";

const STATUS_ORDER: { key: AstrologerApplicationStatus; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "MORE_INFORMATION_REQUIRED", label: "More info required" },
  { key: "INTERVIEW_PENDING", label: "Interview pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
  { key: "SUSPENDED", label: "Suspended" },
];

export default function AstrologersOverviewPage() {
  const overview = useAdminOverview();

  return (
    <div>
      <PageHeader
        title="Astrologers"
        subtitle="Applications, verification and approved astrologers."
        actions={<Link to="/admin/astrologers/applications" className="text-sm font-medium text-[#803003] underline">View all applications</Link>}
      />
      {overview.isLoading && <Loading label="Loading overview…" />}
      {overview.error && <ErrorState message="Could not load the overview." onRetry={() => overview.refetch()} />}
      {overview.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATUS_ORDER.map(({ key, label }) => (
            <Stat
              key={key}
              label={label}
              value={overview.data!.counts[key] ?? 0}
              to={`/admin/astrologers/applications?status=${key}`}
              tone={key === "SUSPENDED" || key === "REJECTED" ? "bad" : "default"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
