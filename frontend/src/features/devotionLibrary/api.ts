import { AUTH_API_BASE_URL, authRequest } from "@/lib/authClient";
import type { PublicMantraChant, PublicSpiritualBook } from "./types";

/**
 * Reuses the shared fetch wrapper for its response-envelope unwrapping and
 * error mapping, with `skipAuth` because these endpoints are public — sending
 * a stale token would otherwise trigger a pointless refresh round-trip.
 */
export const devotionLibraryApi = {
  listBooks() {
    return authRequest<PublicSpiritualBook[]>("/devotion-library/books", { skipAuth: true });
  },

  getBookBySlug(slug: string) {
    return authRequest<PublicSpiritualBook>(`/devotion-library/books/${encodeURIComponent(slug)}`, { skipAuth: true });
  },

  /** Direct URL (not a fetch) — the backend 302-redirects to the file and increments the counter. */
  bookDownloadUrl(bookId: string) {
    return `${AUTH_API_BASE_URL}/devotion-library/books/${bookId}/download`;
  },

  listMantras() {
    return authRequest<PublicMantraChant[]>("/devotion-library/mantras", { skipAuth: true });
  },

  getMantraBySlug(slug: string) {
    return authRequest<PublicMantraChant>(`/devotion-library/mantras/${encodeURIComponent(slug)}`, { skipAuth: true });
  },

  registerMantraPlay(mantraId: string) {
    return authRequest<null>(`/devotion-library/mantras/${mantraId}/play`, { method: "POST", skipAuth: true });
  },

  mantraDownloadUrl(mantraId: string) {
    return `${AUTH_API_BASE_URL}/devotion-library/mantras/${mantraId}/download`;
  },
};
