import { Link } from "react-router-dom";
import { Sparkles, UserCog } from "lucide-react";
import { card, ghost, IconChip } from "@/features/dashboard/library/ui";
import { useAstrologerApplication } from "../hooks/useAstrologerApplication";
import { EDITABLE_STATUSES, STATUS_LABELS } from "../types";

/** Part 8: "Astrologer Application" section inside the existing USER dashboard — added alongside existing cards, nothing replaced. */
export function AstrologerStatusCard() {
  const { data: application, isLoading } = useAstrologerApplication();

  if (isLoading) return null;

  if (!application) {
    return (
      <div className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <IconChip icon={Sparkles} tone="gold" size="sm" />
        <div>
          <h3 className="font-home-serif text-base font-semibold text-[#2A1A10]">Become an Astrologer</h3>
          <p className="mt-1 text-sm text-[#6E5D4E]">Share your astrology expertise with seekers on MyBhagya. Applications are reviewed manually.</p>
        </div>
        <Link to="/become-astrologer" className={ghost}>Learn more</Link>
      </div>
    );
  }

  const editable = EDITABLE_STATUSES.includes(application.status);
  const isApprovedOrSuspended = application.status === "APPROVED" || application.status === "SUSPENDED";
  const pendingDocs = application.documents.filter((d) => d.verificationStatus === "RESUBMISSION_REQUIRED" || d.verificationStatus === "REJECTED");

  return (
    <div className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <IconChip icon={UserCog} tone="brown" size="sm" />
      <div>
        <h3 className="font-home-serif text-base font-semibold text-[#2A1A10]">Astrologer Application</h3>
        <p className="mt-1 text-sm text-[#6E5D4E]">
          Status: <span className="font-medium text-[#2A1A10]">{STATUS_LABELS[application.status]}</span>
        </p>
        {pendingDocs.length > 0 && (
          <p className="mt-1 text-sm text-amber-700">{pendingDocs.length} document(s) need your attention.</p>
        )}
      </div>
      <Link to={isApprovedOrSuspended ? "/astrologer-dashboard" : "/astrologer-application"} className={ghost}>
        {isApprovedOrSuspended ? "Open astrologer workspace" : editable ? "Continue application" : "View status"}
      </Link>
    </div>
  );
}
