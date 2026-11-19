import { authRequest } from "@/lib/authClient";
import type { BirthPlace, CentralProfile } from "./profile";

/** Birth-detail fields a feature may save. Only the keys present are sent; the server writes only those. */
export interface BirthPatch {
  dateOfBirth?: string | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  birthPlace?: BirthPlace | null;
  preferredLanguage?: string | null;
}

/** Name and gender live on the account and are saved through the existing profile endpoint. */
export interface AccountPatch { firstName?: string; lastName?: string | null; gender?: string | null }

export const profileApi = {
  get: () => authRequest<{ profile: CentralProfile }>("/me/profile/central").then((r) => r.profile),
  saveBirth: (patch: BirthPatch) => authRequest<{ profile: CentralProfile }>("/me/profile/birth", { method: "PATCH", body: patch }).then((r) => r.profile),
  saveAccount: (patch: AccountPatch) => authRequest("/me/profile", { method: "PATCH", body: patch }),
};
