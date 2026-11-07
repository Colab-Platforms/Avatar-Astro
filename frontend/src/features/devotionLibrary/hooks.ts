import { useQuery } from "@tanstack/react-query";
import { AuthApiError } from "@/lib/authClient";
import { devotionLibraryApi } from "./api";

export const DEVOTION_BOOKS_QUERY_KEY = ["devotion-library", "books"] as const;
export const DEVOTION_MANTRAS_QUERY_KEY = ["devotion-library", "mantras"] as const;

const retryUnlessNotFound = (failureCount: number, error: unknown) => {
  if (error instanceof AuthApiError && error.status === 404) return false;
  return failureCount < 1;
};

export function useSpiritualBooks() {
  return useQuery({
    queryKey: DEVOTION_BOOKS_QUERY_KEY,
    queryFn: () => devotionLibraryApi.listBooks(),
    retry: retryUnlessNotFound,
    staleTime: 60_000,
  });
}

export function useSpiritualBook(slug: string | undefined) {
  return useQuery({
    queryKey: [...DEVOTION_BOOKS_QUERY_KEY, slug] as const,
    queryFn: () => devotionLibraryApi.getBookBySlug(slug as string),
    enabled: Boolean(slug),
    retry: retryUnlessNotFound,
    staleTime: 60_000,
  });
}

export function useMantrasChants() {
  return useQuery({
    queryKey: DEVOTION_MANTRAS_QUERY_KEY,
    queryFn: () => devotionLibraryApi.listMantras(),
    retry: retryUnlessNotFound,
    staleTime: 60_000,
  });
}

export function useMantraChant(slug: string | undefined) {
  return useQuery({
    queryKey: [...DEVOTION_MANTRAS_QUERY_KEY, slug] as const,
    queryFn: () => devotionLibraryApi.getMantraBySlug(slug as string),
    enabled: Boolean(slug),
    retry: retryUnlessNotFound,
    staleTime: 60_000,
  });
}
