import { authRequest } from "@/lib/authClient";
import type { AstrologerProfileSelf } from "../types";

const BASE = "/astrologer/profile";

export const astrologerWorkspaceApi = {
  getProfile() {
    return authRequest<AstrologerProfileSelf>(BASE);
  },

  updateProfile(patch: Record<string, unknown>) {
    return authRequest<AstrologerProfileSelf>(BASE, { method: "PATCH", body: patch });
  },

  setPublication(isPublished: boolean) {
    return authRequest<AstrologerProfileSelf>(`${BASE}/publish`, { method: "PATCH", body: { isPublished } });
  },

  uploadPhoto(file: File) {
    const form = new FormData();
    form.append("image", file);
    return authRequest<AstrologerProfileSelf>(`${BASE}/photo`, { method: "POST", body: form });
  },
};
