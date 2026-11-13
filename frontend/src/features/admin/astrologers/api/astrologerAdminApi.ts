import { authRequest } from "@/lib/authClient";
import type {
  AdminApplicationDetail,
  AdminApplicationListResult,
  AdminOverview,
  AstrologerApplicationStatus,
  DocumentRequirementAdmin,
  DocumentVerificationStatus,
  ReadinessResult,
  SpecialtyOptionAdmin,
} from "../types";

const BASE = "/admin/astrologers";

export interface ListApplicationsParams {
  status?: AstrologerApplicationStatus;
  specialty?: string;
  language?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const astrologerAdminApi = {
  getOverview() {
    return authRequest<AdminOverview>(`${BASE}/overview`);
  },

  listApplications({ status, specialty, language, search, page = 1, pageSize = 20 }: ListApplicationsParams = {}) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) query.set("status", status);
    if (specialty) query.set("specialty", specialty);
    if (language) query.set("language", language);
    if (search?.trim()) query.set("search", search.trim());
    return authRequest<AdminApplicationListResult>(`${BASE}/applications?${query.toString()}`);
  },

  getApplication(id: string) {
    return authRequest<AdminApplicationDetail>(`${BASE}/applications/${id}`);
  },

  getReadiness(id: string) {
    return authRequest<ReadinessResult>(`${BASE}/applications/${id}/readiness`);
  },

  transitionStatus(id: string, toStatus: AstrologerApplicationStatus, reason?: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/status`, { method: "PATCH", body: { toStatus, reason } });
  },

  approve(id: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/approve`, { method: "POST" });
  },

  reject(id: string, reason: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/reject`, { method: "POST", body: { reason } });
  },

  suspend(id: string, reason: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/suspend`, { method: "POST", body: { reason } });
  },

  reinstate(id: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/reinstate`, { method: "POST" });
  },

  setPublication(id: string, isPublished: boolean) {
    return authRequest<unknown>(`${BASE}/applications/${id}/publish`, { method: "PATCH", body: { isPublished } });
  },

  setComplimentary(id: string, isComplimentary: boolean, complimentaryMaxSeconds: number | null) {
    return authRequest<unknown>(`${BASE}/applications/${id}/complimentary`, {
      method: "PATCH",
      body: { isComplimentary, complimentaryMaxSeconds },
    });
  },

  addNote(id: string, note: string) {
    return authRequest<unknown>(`${BASE}/applications/${id}/notes`, { method: "POST", body: { note } });
  },

  recordInterview(id: string, input: Record<string, unknown>) {
    return authRequest<unknown>(`${BASE}/applications/${id}/interviews`, { method: "POST", body: input });
  },

  reviewDocument(documentId: string, input: { verificationStatus: DocumentVerificationStatus; rejectionReason?: string; reviewNotes?: string }) {
    return authRequest<unknown>(`${BASE}/documents/${documentId}`, { method: "PATCH", body: input });
  },

  getDocumentSignedUrl(documentId: string) {
    return authRequest<{ url: string; expiresInSeconds: number }>(`${BASE}/documents/${documentId}/signed-url`);
  },

  getScanningSetting() {
    return authRequest<{ enabled: boolean }>(`${BASE}/settings/scanning`);
  },

  setScanningSetting(enabled: boolean) {
    return authRequest<{ enabled: boolean }>(`${BASE}/settings/scanning`, { method: "PATCH", body: { enabled } });
  },

  listSpecialtyOptions() {
    return authRequest<SpecialtyOptionAdmin[]>(`${BASE}/settings/specialties`);
  },

  upsertSpecialtyOption(input: { key: string; label: string; isActive?: boolean; sortOrder?: number }) {
    return authRequest<SpecialtyOptionAdmin>(`${BASE}/settings/specialties`, { method: "POST", body: input });
  },

  listDocumentRequirements() {
    return authRequest<DocumentRequirementAdmin[]>(`${BASE}/settings/document-requirements`);
  },

  upsertDocumentRequirement(input: Record<string, unknown>) {
    return authRequest<DocumentRequirementAdmin>(`${BASE}/settings/document-requirements`, { method: "POST", body: input });
  },

  getRateBounds() {
    return authRequest<{ minRatePerMinuteRupees: number; maxRatePerMinuteRupees: number; defaultRatePerMinuteRupees: number }>(`${BASE}/settings/rate-bounds`);
  },

  setRateBounds(input: { minRatePerMinuteRupees?: number; maxRatePerMinuteRupees?: number; defaultRatePerMinuteRupees?: number }) {
    return authRequest<{ minRatePerMinuteRupees: number; maxRatePerMinuteRupees: number; defaultRatePerMinuteRupees: number }>(`${BASE}/settings/rate-bounds`, { method: "PATCH", body: input });
  },
};
