import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, type DarshanTempleStatus } from '@/lib/api';
import { DARSHAN_TEMPLES_QUERY_KEY } from './useDarshanTemples';
import { darshanTempleQueryKey } from './useDarshanTemple';

/**
 * Subscribes to the backend's /darshan/events Server-Sent Events stream and
 * patches the TanStack Query cache directly on every push — no polling.
 * EventSource reconnects automatically per spec if the connection drops.
 */
export function useDarshanLiveEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/darshan/events`);

    source.onmessage = (event) => {
      const updated: DarshanTempleStatus = JSON.parse(event.data);

      queryClient.setQueryData<DarshanTempleStatus[]>(DARSHAN_TEMPLES_QUERY_KEY, (prev) =>
        prev?.map((t) => (t.slug === updated.slug ? updated : t)),
      );
      queryClient.setQueryData<DarshanTempleStatus>(darshanTempleQueryKey(updated.slug), updated);
    };

    return () => source.close();
  }, [queryClient]);
}
