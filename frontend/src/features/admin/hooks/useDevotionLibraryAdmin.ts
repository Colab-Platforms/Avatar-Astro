import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/authClient";
import { devotionLibraryApi, type ListDevotionLibraryParams } from "../api/devotionLibraryApi";
import type { BookFormValues, MantraFormValues } from "../types/devotionLibrary";

export const ADMIN_DEVOTION_LIBRARY_KEY = ["admin", "devotion-library"] as const;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof AuthApiError || error instanceof Error ? error.message : fallback;

/** Auth failures are terminal here — AdminRoute handles the redirect. */
const retryUnlessAuthError = (failureCount: number, error: unknown) => {
  if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) return false;
  return failureCount < 1;
};

function useInvalidator() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_DEVOTION_LIBRARY_KEY });
}

export function useDevotionLibraryStats() {
  return useQuery({
    queryKey: [...ADMIN_DEVOTION_LIBRARY_KEY, "stats"] as const,
    queryFn: () => devotionLibraryApi.getStats(),
    retry: retryUnlessAuthError,
    staleTime: 30_000,
  });
}

// ── Books ────────────────────────────────────────────────────────────────────

export function useAdminBooks(params: ListDevotionLibraryParams) {
  return useQuery({
    queryKey: [...ADMIN_DEVOTION_LIBRARY_KEY, "books", "list", params] as const,
    queryFn: () => devotionLibraryApi.listBooks(params),
    retry: retryUnlessAuthError,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function useCreateBook() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (values: BookFormValues) => devotionLibraryApi.createBook(values),
    onSuccess: (book) => {
      invalidate();
      toast.success(`${book.title} created`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create the book")),
  });
}

export function useUpdateBook() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ bookId, values }: { bookId: string; values: Partial<BookFormValues> }) =>
      devotionLibraryApi.updateBook(bookId, values),
    onSuccess: (book) => {
      invalidate();
      toast.success(`${book.title} updated`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update the book")),
  });
}

export function useDeleteBook() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (bookId: string) => devotionLibraryApi.deleteBook(bookId),
    onSuccess: () => {
      invalidate();
      toast.success("Book deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete the book")),
  });
}

export function useUploadBookFile() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ bookId, file }: { bookId: string; file: File }) => devotionLibraryApi.uploadBookFile(bookId, file),
    onSuccess: () => {
      invalidate();
      toast.success("Book file uploaded");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not upload the book file")),
  });
}

export function useUploadBookCover() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ bookId, file }: { bookId: string; file: File }) => devotionLibraryApi.uploadBookCover(bookId, file),
    onSuccess: () => {
      invalidate();
      toast.success("Cover image uploaded");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not upload the cover image")),
  });
}

// ── Mantras & Chants ─────────────────────────────────────────────────────────

export function useAdminMantras(params: ListDevotionLibraryParams) {
  return useQuery({
    queryKey: [...ADMIN_DEVOTION_LIBRARY_KEY, "mantras", "list", params] as const,
    queryFn: () => devotionLibraryApi.listMantras(params),
    retry: retryUnlessAuthError,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function useCreateMantra() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (values: MantraFormValues) => devotionLibraryApi.createMantra(values),
    onSuccess: (mantra) => {
      invalidate();
      toast.success(`${mantra.title} created`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create the mantra")),
  });
}

export function useUpdateMantra() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ mantraId, values }: { mantraId: string; values: Partial<MantraFormValues> }) =>
      devotionLibraryApi.updateMantra(mantraId, values),
    onSuccess: (mantra) => {
      invalidate();
      toast.success(`${mantra.title} updated`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update the mantra")),
  });
}

export function useDeleteMantra() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (mantraId: string) => devotionLibraryApi.deleteMantra(mantraId),
    onSuccess: () => {
      invalidate();
      toast.success("Mantra deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete the mantra")),
  });
}

export function useUploadMantraAudio() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ mantraId, file }: { mantraId: string; file: File }) =>
      devotionLibraryApi.uploadMantraAudio(mantraId, file),
    onSuccess: () => {
      invalidate();
      toast.success("Audio uploaded");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not upload the audio file")),
  });
}

export function useUploadMantraCover() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: ({ mantraId, file }: { mantraId: string; file: File }) =>
      devotionLibraryApi.uploadMantraCover(mantraId, file),
    onSuccess: () => {
      invalidate();
      toast.success("Cover image uploaded");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not upload the cover image")),
  });
}
