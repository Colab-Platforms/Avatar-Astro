/** Mirrors backend/src/modules/astrologer/astrologer.service.ts's toApplicantSafe() shape. */

export type AstrologerApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "INTERVIEW_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "SUSPENDED";

export type DocumentVerificationStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED";

export type AgreementType = "TERMS_AND_CONDITIONS" | "PRIVACY_NOTICE" | "VERIFICATION_CONSENT" | "PROFESSIONAL_CONDUCT_POLICY";

export interface SpecialtyOption {
  id: string;
  key: string;
  label: string;
}

export interface DocumentRequirement {
  id: string;
  group: string;
  key: string;
  label: string;
  category: "IDENTITY" | "SUPPORTING";
  isRequired: boolean;
  acceptedMimeTypes: string[];
  maxSizeMb: number;
}

export interface AstrologerConfig {
  specialties: SpecialtyOption[];
  documentRequirements: DocumentRequirement[];
}

export interface ApplicationSpecialty {
  id: string;
  key: string;
  label: string;
  isPrimary: boolean;
}

export interface ApplicationDocument {
  id: string;
  requirementId: string | null;
  fileName: string;
  mimeType: string;
  version: number;
  verificationStatus: DocumentVerificationStatus;
  rejectionReason: string | null;
  uploadedAt: string;
}

export interface ApplicationAgreement {
  agreementType: AgreementType;
  version: string;
  acceptedAt: string;
}

export interface ApplicationTimelineEntry {
  fromStatus: AstrologerApplicationStatus | null;
  toStatus: AstrologerApplicationStatus;
  reason: string | null;
  at: string;
}

export interface ApplicationInterviewSummary {
  isRequired: boolean;
  isWaived: boolean;
  scheduledAt: string | null;
  outcome: "PENDING" | "PASS" | "FAIL" | "RESCHEDULE";
}

export interface AstrologerApplication {
  id: string;
  attemptNumber: number;
  status: AstrologerApplicationStatus;
  fullLegalName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  yearsOfExperience: number | null;
  educationBackground: string | null;
  certificationsText: string | null;
  professionalIntro: string | null;
  consultationExperience: string | null;
  areasOfExpertise: string | null;
  languages: string[];
  submittedAt: string | null;
  specialties: ApplicationSpecialty[];
  documents: ApplicationDocument[];
  agreements: ApplicationAgreement[];
  timeline: ApplicationTimelineEntry[];
  interview: ApplicationInterviewSummary | null;
}

export const EDITABLE_STATUSES: AstrologerApplicationStatus[] = ["DRAFT", "MORE_INFORMATION_REQUIRED"];

export const STATUS_LABELS: Record<AstrologerApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  MORE_INFORMATION_REQUIRED: "More information required",
  INTERVIEW_PENDING: "Interview pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SUSPENDED: "Suspended",
};

export const AGREEMENT_LABELS: Record<AgreementType, string> = {
  TERMS_AND_CONDITIONS: "Astrologer Terms & Conditions",
  PRIVACY_NOTICE: "Privacy Notice",
  VERIFICATION_CONSENT: "Verification Consent",
  PROFESSIONAL_CONDUCT_POLICY: "Professional Conduct Policy",
};

export const ALL_AGREEMENT_TYPES: AgreementType[] = [
  "TERMS_AND_CONDITIONS",
  "PRIVACY_NOTICE",
  "VERIFICATION_CONSENT",
  "PROFESSIONAL_CONDUCT_POLICY",
];
