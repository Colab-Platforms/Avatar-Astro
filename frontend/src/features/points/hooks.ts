import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { pointsApi, type KarmaAward } from "./api";

export const POINTS_KEYS = { horoscope: ["points", "horoscope"], karma: ["points", "karma"], rewards: ["points", "rewards"] } as const;

export const useHoroscopeStreak = () => {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  return useQuery({ queryKey: POINTS_KEYS.horoscope, queryFn: pointsApi.horoscope, enabled: signedIn, refetchOnWindowFocus: false, retry: false });
};

/** Karma Reward Points summary plus `award(id)`: tell the server a practice was ticked. It never blocks or changes the on-screen score. */
export function useKarmaRewards() {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: POINTS_KEYS.karma, queryFn: pointsApi.karma, enabled: signedIn, refetchOnWindowFocus: false, retry: false });
  const [last, setLast] = useState<KarmaAward["awarded"] | null>(null);
  const award = useCallback(async (id: string) => {
    if (!signedIn) return;
    try {
      const r = await pointsApi.karmaPractices([id]);
      qc.setQueryData(POINTS_KEYS.karma, r.summary);
      void qc.invalidateQueries({ queryKey: POINTS_KEYS.rewards });
      setLast(r.awarded.points > 0 || r.awarded.milestone ? r.awarded : null);
    } catch { /* Reward Points are an extra; the practice tick itself is unaffected */ }
  }, [signedIn, qc]);
  return { summary: q.data, isError: q.isError, isLoading: q.isLoading, refetch: q.refetch, last, award, signedIn };
}
