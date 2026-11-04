import type { AstrologerApplicationStatus } from "@prisma/client";

export type TransitionActor = "APPLICANT" | "ADMIN";

/** Reappliable terminal statuses: a user may start a new attempt only when every one
 *  of their existing rows is in this set. Mirrored exactly by the DB partial unique
 *  index in prisma/sql/astrologer_partial_indexes.sql — keep both in sync if this ever changes. */
export const REAPPLIABLE_STATUSES: AstrologerApplicationStatus[] = ["REJECTED", "WITHDRAWN"];

export const ASTROLOGER_TRANSITIONS: Record<AstrologerApplicationStatus, { to: AstrologerApplicationStatus; actor: TransitionActor }[]> = {
  DRAFT: [{ to: "SUBMITTED", actor: "APPLICANT" }, { to: "WITHDRAWN", actor: "APPLICANT" }],
  SUBMITTED: [{ to: "UNDER_REVIEW", actor: "ADMIN" }, { to: "WITHDRAWN", actor: "APPLICANT" }],
  UNDER_REVIEW: [
    { to: "MORE_INFORMATION_REQUIRED", actor: "ADMIN" },
    { to: "INTERVIEW_PENDING", actor: "ADMIN" },
    { to: "APPROVED", actor: "ADMIN" },
    { to: "REJECTED", actor: "ADMIN" },
    { to: "WITHDRAWN", actor: "APPLICANT" },
  ],
  MORE_INFORMATION_REQUIRED: [{ to: "UNDER_REVIEW", actor: "ADMIN" }, { to: "WITHDRAWN", actor: "APPLICANT" }],
  INTERVIEW_PENDING: [
    { to: "UNDER_REVIEW", actor: "ADMIN" },
    { to: "APPROVED", actor: "ADMIN" },
    { to: "REJECTED", actor: "ADMIN" },
    { to: "WITHDRAWN", actor: "APPLICANT" },
  ],
  APPROVED: [{ to: "SUSPENDED", actor: "ADMIN" }],
  SUSPENDED: [{ to: "APPROVED", actor: "ADMIN" }],
  REJECTED: [],
  WITHDRAWN: [],
};

export function isTransitionAllowed(from: AstrologerApplicationStatus, to: AstrologerApplicationStatus, actor: TransitionActor): boolean {
  return ASTROLOGER_TRANSITIONS[from]?.some((t) => t.to === to && t.actor === actor) ?? false;
}

export interface DocumentRequirementSnapshotItem {
  id: string;
  group: string;
  key: string;
  label: string;
  category: "IDENTITY" | "SUPPORTING";
  isRequired: boolean;
}

export interface ReadinessResult {
  ready: boolean;
  blockers: string[];
}
