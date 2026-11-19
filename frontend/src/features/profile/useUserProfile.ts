import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { profileApi, type AccountPatch, type BirthPatch } from "./api";
import { hasNeed, missingNeeds, type CentralProfile, type ProfileNeed } from "./profile";

export const profileQueryKey = (userId: string | undefined) => ["user-profile", userId ?? "anon"] as const;
/** Invalidate prefix: refreshes the central profile after any account edit made elsewhere. */
export const PROFILE_QUERY_PREFIX = ["user-profile"] as const;

/**
 * The signed-in user's central profile, shared by every feature.
 *
 * One cached copy per user: opening another feature reuses it (no new request) for ten minutes, and it is
 * refreshed straight after any save. Signed-out visitors never trigger a request. The server scopes the
 * data by the verified token; the user id here only keeps one account's cache from showing under another.
 */
export function useUserProfile() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const signedIn = useAuthStore((s) => s.isAuthenticated && !!s.accessToken);
  const key = profileQueryKey(userId);

  const query = useQuery<CentralProfile, Error>({
    queryKey: key,
    queryFn: profileApi.get,
    enabled: signedIn && !!userId,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    // A failed load must not hold the form back: every feature falls back to asking, exactly as before.
    retry: false,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation<CentralProfile | undefined, Error, { birth?: BirthPatch; account?: AccountPatch }>({
    mutationFn: async ({ birth, account }) => {
      // Account fields first: if it fails nothing else is written.
      if (account && Object.keys(account).length) await profileApi.saveAccount(account);
      if (birth && Object.keys(birth).length) return profileApi.saveBirth(birth);
      return undefined;
    },
    onSuccess: (saved) => {
      if (saved) qc.setQueryData(key, saved);
      // Names/gender come back from the account endpoint, and the dashboard shows them too.
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["my-dashboard"] });
    },
  });

  const profile = query.data ?? null;
  const save = useCallback((patch: { birth?: BirthPatch; account?: AccountPatch }) => mutation.mutateAsync(patch), [mutation]);
  const missing = useCallback((needs: readonly ProfileNeed[]) => missingNeeds(profile, needs), [profile]);
  const has = useCallback((need: ProfileNeed) => hasNeed(profile, need), [profile]);

  return {
    profile,
    /** True only while the very first load is pending (a cached profile never shows a spinner). */
    isLoading: signedIn && query.isPending,
    error: query.error,
    signedIn,
    save,
    isSaving: mutation.isPending,
    saveError: mutation.error,
    missing,
    has,
    refetch: query.refetch,
  };
}
