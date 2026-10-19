import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

export const DARSHAN_TEMPLES_QUERY_KEY = ['darshan', 'temples'] as const;

/**
 * Live status for every temple. staleTime: Infinity because updates arrive
 * via useDarshanLiveEvents' SSE push, which patches this query's cache
 * directly — there's nothing to gain from a background refetch.
 */
export function useDarshanTemples() {
  return useQuery({
    queryKey: DARSHAN_TEMPLES_QUERY_KEY,
    queryFn: async () => {
      const res = await apiService.getDarshanTemples();
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load temples');
      return res.data;
    },
    staleTime: Infinity,
  });
}
