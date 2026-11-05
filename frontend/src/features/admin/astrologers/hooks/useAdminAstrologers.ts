import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/authClient";
import type { DocumentVerificationStatus } from "@/features/astrologer/types";
import { astrologerAdminApi, type ListApplicationsParams } from "../api/astrologerAdminApi";
import type { AstrologerApplicationStatus } from "../types";

export const ADMIN_ASTROLOGERS_QUERY_KEY = ["admin", "astrologers"] as const;

const errorMessage = (error: unknown, fallback: string) => (error instanceof AuthApiError || error instanceof Error ? error.message : fallback);

const retryUnlessAuthError = (failureCount: number, error: unknown) => {
  if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) return false;
  return failureCount < 1;
};

function useInvalidateAstrologers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ADMIN_ASTROLOGERS_QUERY_KEY });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "overview"] as const,
    queryFn: () => astrologerAdminApi.getOverview(),
    retry: retryUnlessAuthError,
    staleTime: 15_000,
  });
}

export function useAdminApplications(params: ListApplicationsParams) {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "list", params] as const,
    queryFn: () => astrologerAdminApi.listApplications(params),
    retry: retryUnlessAuthError,
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
}

export function useAdminApplication(id: string) {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "detail", id] as const,
    queryFn: () => astrologerAdminApi.getApplication(id),
    retry: retryUnlessAuthError,
    enabled: Boolean(id),
  });
}

export function useAdminReadiness(id: string) {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "readiness", id] as const,
    queryFn: () => astrologerAdminApi.getReadiness(id),
    retry: retryUnlessAuthError,
    enabled: Boolean(id),
  });
}

export function useTransitionStatus(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: ({ toStatus, reason }: { toStatus: AstrologerApplicationStatus; reason?: string }) => astrologerAdminApi.transitionStatus(id, toStatus, reason),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(errorMessage(e, "Could not update status")),
  });
}

export function useApproveApplication(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: () => astrologerAdminApi.approve(id),
    onSuccess: () => { invalidate(); toast.success("Application approved"); },
    onError: (e) => toast.error(errorMessage(e, "Could not approve the application")),
  });
}

export function useRejectApplication(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: (reason: string) => astrologerAdminApi.reject(id, reason),
    onSuccess: () => { invalidate(); toast.success("Application rejected"); },
    onError: (e) => toast.error(errorMessage(e, "Could not reject the application")),
  });
}

export function useSuspendAstrologer(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: (reason: string) => astrologerAdminApi.suspend(id, reason),
    onSuccess: () => { invalidate(); toast.success("Astrologer suspended"); },
    onError: (e) => toast.error(errorMessage(e, "Could not suspend")),
  });
}

export function useReinstateAstrologer(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: () => astrologerAdminApi.reinstate(id),
    onSuccess: () => { invalidate(); toast.success("Astrologer reinstated"); },
    onError: (e) => toast.error(errorMessage(e, "Could not reinstate")),
  });
}

export function useSetPublication(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: (isPublished: boolean) => astrologerAdminApi.setPublication(id, isPublished),
    onSuccess: () => { invalidate(); toast.success("Publication updated"); },
    onError: (e) => toast.error(errorMessage(e, "Could not update publication")),
  });
}

export function useAddNote(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: (note: string) => astrologerAdminApi.addNote(id, note),
    onSuccess: () => { invalidate(); toast.success("Note added"); },
    onError: (e) => toast.error(errorMessage(e, "Could not add note")),
  });
}

export function useRecordInterview(id: string) {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => astrologerAdminApi.recordInterview(id, input),
    onSuccess: () => { invalidate(); toast.success("Interview recorded"); },
    onError: (e) => toast.error(errorMessage(e, "Could not record interview")),
  });
}

export function useReviewDocument() {
  const invalidate = useInvalidateAstrologers();
  return useMutation({
    mutationFn: ({ documentId, verificationStatus, rejectionReason, reviewNotes }: { documentId: string; verificationStatus: DocumentVerificationStatus; rejectionReason?: string; reviewNotes?: string }) =>
      astrologerAdminApi.reviewDocument(documentId, { verificationStatus, rejectionReason, reviewNotes }),
    onSuccess: () => { invalidate(); toast.success("Document review recorded"); },
    onError: (e) => toast.error(errorMessage(e, "Could not record document review")),
  });
}

export function useViewSignedDocument() {
  return useMutation({
    mutationFn: (documentId: string) => astrologerAdminApi.getDocumentSignedUrl(documentId),
    onSuccess: (res) => {
      window.open(res.url, "_blank", "noopener,noreferrer");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not open document")),
  });
}

export function useScanningSetting() {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "scanning"] as const,
    queryFn: () => astrologerAdminApi.getScanningSetting(),
    retry: retryUnlessAuthError,
  });
}

export function useSetScanningSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => astrologerAdminApi.setScanningSetting(enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "scanning"] });
      toast.success("Scanning setting updated");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not update setting")),
  });
}

export function useSpecialtyOptionsAdmin() {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "specialties"] as const,
    queryFn: () => astrologerAdminApi.listSpecialtyOptions(),
    retry: retryUnlessAuthError,
  });
}

export function useUpsertSpecialtyOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; label: string; isActive?: boolean; sortOrder?: number }) => astrologerAdminApi.upsertSpecialtyOption(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "specialties"] });
      toast.success("Specialty saved");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not save specialty")),
  });
}

export function useDocumentRequirementsAdmin() {
  return useQuery({
    queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "document-requirements"] as const,
    queryFn: () => astrologerAdminApi.listDocumentRequirements(),
    retry: retryUnlessAuthError,
  });
}

export function useUpsertDocumentRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => astrologerAdminApi.upsertDocumentRequirement(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ADMIN_ASTROLOGERS_QUERY_KEY, "settings", "document-requirements"] });
      toast.success("Document requirement saved");
    },
    onError: (e) => toast.error(errorMessage(e, "Could not save document requirement")),
  });
}
