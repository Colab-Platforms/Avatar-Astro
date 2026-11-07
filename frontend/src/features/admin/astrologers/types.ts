import type {
  AgreementType,
  AstrologerApplicationStatus,
  DocumentVerificationStatus,
} from "@/features/astrologer/types";

export type { AstrologerApplicationStatus, DocumentVerificationStatus, AgreementType };

export interface AdminApplicationListItem {
  id: string;
  fullLegalName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  yearsOfExperience: number | null;
  primarySpecialty: string | null;
  status: AstrologerApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
  documentsPending: number;
  documentsVerified: number;
}

export interface AdminApplicationListResult {
  items: AdminApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOverview {
  counts: Partial<Record<AstrologerApplicationStatus, number>>;
}

export interface AdminDocument {
  id: string;
  requirementId: string | null;
  requirement: { id: string; key: string; label: string; group: string; category: "IDENTITY" | "SUPPORTING" } | null;
  fileName: string;
  mimeType: string;
  version: number;
  isCurrent: boolean;
  verificationStatus: DocumentVerificationStatus;
  scanStatus: "PENDING" | "CLEAN" | "INFECTED" | "SCAN_FAILED" | "SKIPPED";
  rejectionReason: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  uploadedAt: string;
}

export interface AdminInterview {
  id: string;
  isRequired: boolean;
  isWaived: boolean;
  scheduledAt: string | null;
  conductedAt: string | null;
  communicationScore: number | null;
  domainKnowledgeScore: number | null;
  professionalConductScore: number | null;
  outcome: "PENDING" | "PASS" | "FAIL" | "RESCHEDULE";
  notes: string | null;
  createdAt: string;
}

export interface AdminNote {
  id: string;
  authorId: string;
  note: string;
  createdAt: string;
}

export interface AdminStatusHistoryEntry {
  id: string;
  fromStatus: AstrologerApplicationStatus | null;
  toStatus: AstrologerApplicationStatus;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminAgreement {
  agreementType: AgreementType;
  version: string;
  acceptedAt: string;
}

export interface AdminApplicationDetail {
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
  createdAt: string;
  specialties: { specialtyOptionId: string; isPrimary: boolean; customLabel: string | null; specialty: { key: string; label: string } }[];
  documents: AdminDocument[];
  statusHistory: AdminStatusHistoryEntry[];
  notes: AdminNote[];
  agreements: AdminAgreement[];
  interviews: AdminInterview[];
  profile: { id: string; isPublished: boolean; suspendedAt: string | null; suspensionReason: string | null } | null;
  user: { id: string; email: string; firstName: string | null; lastName: string | null; isActive: boolean };
}

export interface ReadinessResult {
  ready: boolean;
  blockers: string[];
}

export interface SpecialtyOptionAdmin {
  id: string;
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DocumentRequirementAdmin {
  id: string;
  group: string;
  key: string;
  label: string;
  category: "IDENTITY" | "SUPPORTING";
  acceptedMimeTypes: string[];
  maxSizeMb: number;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}
