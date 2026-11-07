import { useQuery } from "@tanstack/react-query";
import { publicAstrologerApi } from "./api";

export const PUBLIC_ASTROLOGERS_QUERY_KEY = ["astrologers", "public"] as const;

export function usePublicAstrologers(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: [...PUBLIC_ASTROLOGERS_QUERY_KEY, "list", params] as const,
    queryFn: () => publicAstrologerApi.list(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function usePublicAstrologer(slug: string | undefined) {
  return useQuery({
    queryKey: [...PUBLIC_ASTROLOGERS_QUERY_KEY, "detail", slug] as const,
    queryFn: () => publicAstrologerApi.get(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}
