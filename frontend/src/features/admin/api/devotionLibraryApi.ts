import { authRequest } from "@/lib/authClient";
import type {
  AdminListResult,
  AdminMantraChant,
  AdminSpiritualBook,
  BookFormValues,
  DevotionLibraryStats,
  MantraFormValues,
} from "../types/devotionLibrary";

const BASE = "/admin/devotion-library";

export interface ListDevotionLibraryParams {
  search?: string;
  page?: number;
  limit?: number;
}

const toQuery = ({ search, page = 1, limit = 20 }: ListDevotionLibraryParams) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search?.trim()) query.set("search", search.trim());
  return query.toString();
};

export const devotionLibraryApi = {
  getStats() {
    return authRequest<DevotionLibraryStats>(`${BASE}/stats`);
  },

  // Books
  listBooks(params: ListDevotionLibraryParams = {}) {
    return authRequest<AdminListResult<AdminSpiritualBook>>(`${BASE}/books?${toQuery(params)}`);
  },

  getBook(bookId: string) {
    return authRequest<AdminSpiritualBook>(`${BASE}/books/${bookId}`);
  },

  createBook(values: BookFormValues) {
    return authRequest<AdminSpiritualBook>(`${BASE}/books`, { method: "POST", body: values });
  },

  updateBook(bookId: string, values: Partial<BookFormValues>) {
    return authRequest<AdminSpiritualBook>(`${BASE}/books/${bookId}`, { method: "PUT", body: values });
  },

  deleteBook(bookId: string) {
    return authRequest<null>(`${BASE}/books/${bookId}`, { method: "DELETE" });
  },

  uploadBookFile(bookId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return authRequest<AdminSpiritualBook>(`${BASE}/books/${bookId}/file`, { method: "POST", body: formData });
  },

  uploadBookCover(bookId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return authRequest<AdminSpiritualBook>(`${BASE}/books/${bookId}/cover`, { method: "POST", body: formData });
  },

  // Mantras & Chants
  listMantras(params: ListDevotionLibraryParams = {}) {
    return authRequest<AdminListResult<AdminMantraChant>>(`${BASE}/mantras?${toQuery(params)}`);
  },

  getMantra(mantraId: string) {
    return authRequest<AdminMantraChant>(`${BASE}/mantras/${mantraId}`);
  },

  createMantra(values: MantraFormValues) {
    return authRequest<AdminMantraChant>(`${BASE}/mantras`, { method: "POST", body: values });
  },

  updateMantra(mantraId: string, values: Partial<MantraFormValues>) {
    return authRequest<AdminMantraChant>(`${BASE}/mantras/${mantraId}`, { method: "PUT", body: values });
  },

  deleteMantra(mantraId: string) {
    return authRequest<null>(`${BASE}/mantras/${mantraId}`, { method: "DELETE" });
  },

  uploadMantraAudio(mantraId: string, file: File) {
    const formData = new FormData();
    formData.append("audio", file);
    return authRequest<AdminMantraChant>(`${BASE}/mantras/${mantraId}/audio`, { method: "POST", body: formData });
  },

  uploadMantraCover(mantraId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return authRequest<AdminMantraChant>(`${BASE}/mantras/${mantraId}/cover`, { method: "POST", body: formData });
  },
};
