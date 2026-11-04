import { authRequest } from "@/lib/authClient";
import type { AgreementType, AstrologerApplication, AstrologerConfig } from "../types";

const BASE = "/astrologer";

export const astrologerApi = {
  getConfig() {
    return authRequest<AstrologerConfig>(`${BASE}/config`);
  },

  getApplication() {
    return authRequest<AstrologerApplication | null>(`${BASE}/application`);
  },

  startApplication() {
    return authRequest<AstrologerApplication>(`${BASE}/application`, { method: "POST" });
  },

  updateApplication(patch: Record<string, unknown>) {
    return authRequest<AstrologerApplication>(`${BASE}/application`, { method: "PATCH", body: patch });
  },

  setSpecialties(items: { specialtyOptionId: string; isPrimary?: boolean }[]) {
    return authRequest<AstrologerApplication>(`${BASE}/application/specialties`, { method: "PUT", body: { specialties: items } });
  },

  acceptAgreements(items: AgreementType[]) {
    return authRequest<{ accepted: boolean }>(`${BASE}/application/agreements`, {
      method: "POST",
      body: { agreements: items.map((agreementType) => ({ agreementType })) },
    });
  },

  uploadPhoto(file: File) {
    const form = new FormData();
    form.append("image", file);
    return authRequest<{ profilePhotoUrl: string }>(`${BASE}/application/photo`, { method: "POST", body: form });
  },

  removePhoto() {
    return authRequest<{ removed: boolean }>(`${BASE}/application/photo`, { method: "DELETE" });
  },

  uploadDocument(file: File, requirementId: string) {
    const form = new FormData();
    form.append("document", file);
    form.append("requirementId", requirementId);
    return authRequest<{ id: string; requirementId: string | null; fileName: string; version: number; verificationStatus: string }>(
      `${BASE}/application/documents`,
      { method: "POST", body: form },
    );
  },

  submitApplication() {
    return authRequest<{ status: string; submittedAt: string | null }>(`${BASE}/application/submit`, { method: "POST" });
  },

  withdrawApplication() {
    return authRequest<{ status: string }>(`${BASE}/application/withdraw`, { method: "POST" });
  },
};
