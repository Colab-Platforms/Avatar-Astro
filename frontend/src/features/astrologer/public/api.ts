import { authRequest } from "@/lib/authClient";
import type { Astrologer } from "@/data/astrologers";

export interface PublicAstrologerListResult {
  items: Astrologer[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE = "/astrologers";

export const publicAstrologerApi = {
  list(params: { page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    // sendTokenIfPresent: attribute usage when signed in, but never block/redirect an
    // anonymous visitor — this directory is public.
    return authRequest<PublicAstrologerListResult>(`${BASE}${qs ? `?${qs}` : ""}`, { sendTokenIfPresent: true });
  },

  get(slug: string) {
    return authRequest<Astrologer>(`${BASE}/${slug}`, { sendTokenIfPresent: true });
  },
};
