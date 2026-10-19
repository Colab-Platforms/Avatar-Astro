import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

export const darshanTempleQueryKey = (slug: string) => ['darshan', 'temple', slug] as const;

/** Live status for a single temple. See useDarshanTemples for the staleTime rationale. */
export function useDarshanTemple(slug: string | undefined) {
  return useQuery({
    queryKey: darshanTempleQueryKey(slug ?? 'none'),
    queryFn: async () => {
      const res = await apiService.getDarshanTemple(slug as string);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load temple');
      return res.data;
    },
    enabled: Boolean(slug),
    staleTime: Infinity,
  });
}
