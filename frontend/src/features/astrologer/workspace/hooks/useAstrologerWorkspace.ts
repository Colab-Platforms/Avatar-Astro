import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthApiError } from "@/lib/authClient";
import { astrologerWorkspaceApi } from "../api/astrologerWorkspaceApi";

export const ASTROLOGER_PROFILE_QUERY_KEY = ["astrologer", "profile", "self"] as const;

const errorMessage = (error: unknown, fallback: string) => (error instanceof AuthApiError || error instanceof Error ? error.message : fallback);

/**
 * "Am I an astrologer" check, modeled on features/admin/panel/api.ts's useMainAdmin(): the
 * backend's requireAstrologer middleware returns 403 for anyone without an approved,
 * non-suspended astrologer profile — that 403 is the real, server-enforced signal, not a
 * client-side role guess. This hook just turns it into a friendly "denied" flag.
 */
export function useAstrologerAccess() {
  const q = useQuery({
    queryKey: ASTROLOGER_PROFILE_QUERY_KEY,
    queryFn: () => astrologerWorkspaceApi.getProfile(),
    retry: (failureCount, error) => {
      if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
  const denied = q.error instanceof AuthApiError && q.error.status === 403;
  return { profile: q.data ?? null, hasAccess: Boolean(q.data), denied, isLoading: q.isLoading, error: denied ? null : q.error, refetch: q.refetch };
}

function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ASTROLOGER_PROFILE_QUERY_KEY });
}

export function useUpdateAstrologerProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => astrologerWorkspaceApi.updateProfile(patch),
    onSuccess: () => { invalidate(); toast.success("Profile updated"); },
    onError: (e) => toast.error(errorMessage(e, "Could not update your profile")),
  });
}

export function useSetOwnPublication() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (isPublished: boolean) => astrologerWorkspaceApi.setPublication(isPublished),
    onSuccess: (profile) => { invalidate(); toast.success(profile.isPublished ? "Profile published" : "Profile unpublished"); },
    onError: (e) => toast.error(errorMessage(e, "Could not update publication")),
  });
}

export function useUploadAstrologerPhoto() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (file: File) => astrologerWorkspaceApi.uploadPhoto(file),
    onSuccess: () => { invalidate(); toast.success("Profile photograph updated"); },
    onError: (e) => toast.error(errorMessage(e, "Photo upload failed")),
  });
}
