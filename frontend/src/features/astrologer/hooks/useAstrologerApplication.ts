import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/authClient";
import { astrologerApi } from "../api/astrologerApi";
import type { AgreementType } from "../types";

export const ASTROLOGER_CONFIG_QUERY_KEY = ["astrologer", "config"] as const;
export const ASTROLOGER_APPLICATION_QUERY_KEY = ["astrologer", "application"] as const;

const errorMessage = (error: unknown, fallback: string) => (error instanceof AuthApiError || error instanceof Error ? error.message : fallback);

/** Auth failures are terminal here — ProtectedRoute already handles the redirect. */
const retryUnlessAuthError = (failureCount: number, error: unknown) => {
  if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) return false;
  return failureCount < 1;
};

export function useAstrologerConfig() {
  return useQuery({
    queryKey: ASTROLOGER_CONFIG_QUERY_KEY,
    queryFn: () => astrologerApi.getConfig(),
    retry: retryUnlessAuthError,
    staleTime: 5 * 60_000,
  });
}

export function useAstrologerApplication(enabled = true) {
  return useQuery({
    queryKey: ASTROLOGER_APPLICATION_QUERY_KEY,
    queryFn: () => astrologerApi.getApplication(),
    retry: retryUnlessAuthError,
    staleTime: 10_000,
    enabled,
  });
}

function useInvalidateApplication() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ASTROLOGER_APPLICATION_QUERY_KEY });
}

export function useStartApplication() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: () => astrologerApi.startApplication(),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorMessage(e, "Could not start your application")),
  });
}

export function useUpdateApplication() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => astrologerApi.updateApplication(patch),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorMessage(e, "Could not save your changes")),
  });
}

export function useSetSpecialties() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (items: { specialtyOptionId: string; isPrimary?: boolean; customLabel?: string }[]) => astrologerApi.setSpecialties(items),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorMessage(e, "Could not save your specialties")),
  });
}

export function useAcceptAgreements() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (items: AgreementType[]) => astrologerApi.acceptAgreements(items),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorMessage(e, "Could not record your agreement")),
  });
}

export function useUploadProfilePhoto() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: (file: File) => astrologerApi.uploadPhoto(file),
    onSuccess: () => {
      invalidate();
      toast.success("Profile photograph updated");
    },
    onError: (e) => toast.error(errorMessage(e, "Photo upload failed")),
  });
}

export function useRemoveProfilePhoto() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: () => astrologerApi.removePhoto(),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorMessage(e, "Could not remove photo")),
  });
}

export function useUploadDocument() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: ({ file, requirementId }: { file: File; requirementId: string }) => astrologerApi.uploadDocument(file, requirementId),
    onSuccess: () => {
      invalidate();
      toast.success("Document uploaded");
    },
    onError: (e) => toast.error(errorMessage(e, "Document upload failed")),
  });
}

export function useSubmitApplication() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: () => astrologerApi.submitApplication(),
    onSuccess: () => {
      invalidate();
      toast.success("Application submitted");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not submit your application")),
  });
}

export function useWithdrawApplication() {
  const invalidate = useInvalidateApplication();
  return useMutation({
    mutationFn: () => astrologerApi.withdrawApplication(),
    onSuccess: () => {
      invalidate();
      toast.success("Application withdrawn");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not withdraw your application")),
  });
}
