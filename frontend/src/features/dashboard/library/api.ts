import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authRequest } from "@/lib/authClient";

/** Typed access to the signed-in user's library. The server derives identity from the token; nothing here sends a user id. */

export interface ReadingCard {
  id: string; feature: string; featureLabel: string; title: string; summary: string;
  isSaved: boolean; savedAt: string | null; provider: string | null; model: string | null; createdAt: string;
  inputMeta?: Record<string, unknown> | null;
}
export interface ReadingFull extends ReadingCard { output: unknown; updatedAt: string }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface ReadingsPage extends Page<ReadingCard> { features: { value: string; label: string }[] }

export interface ConversationCard { id: string; feature: string; featureLabel: string; title: string; preview: string; createdAt: string; lastMessageAt: string; messageCount: number }
export interface ConversationFull { id: string; feature: string; featureLabel: string; title: string; createdAt: string; lastMessageAt: string; messages: { id: string; role: "user" | "assistant"; content: string; createdAt: string }[] }

export interface TimelineItem { id: string; at: string; kind: string; label: string; feature: string | null; featureLabel: string; title: string | null; status: string; link: { type: "reading" | "conversation"; id: string } | null }
export interface TimelinePage { items: TimelineItem[]; nextBefore: string | null; kinds: { value: string; label: string }[] }

export interface Overview {
  stats: { readings: number; savedReadings: number; featuresExplored: number; conversations: number; lastActiveAt: string | null };
  continue: {
    reading: ReadingCard | null;
    conversation: { id: string; feature: string; featureLabel: string; title: string; preview: string; lastMessageAt: string } | null;
    lastFeature: { key: string; label: string } | null;
  };
  recentReadings: ReadingCard[];
  recentActivity: TimelineItem[];
}
export interface NotConfigured { configured: false; items: never[]; reason: string }

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && String(v) !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
};

const KEY = "library";
const retry = (count: number, err: unknown) => count < 1 && !(err instanceof Error && /not found|sign in|401|403/i.test(err.message));

export const useOverview = () =>
  useQuery<Overview, Error>({ queryKey: [KEY, "overview"], queryFn: () => authRequest<Overview>("/me/overview"), refetchOnWindowFocus: false, retry });

export const useReadings = (params: Record<string, string | number | undefined | null>) =>
  useQuery<ReadingsPage, Error>({
    queryKey: [KEY, "readings", params],
    queryFn: () => authRequest<ReadingsPage>(`/me/readings${qs(params)}`),
    placeholderData: keepPreviousData, refetchOnWindowFocus: false, retry,
  });

export const useReading = (id: string | undefined) =>
  useQuery<ReadingFull, Error>({ queryKey: [KEY, "reading", id], queryFn: () => authRequest<ReadingFull>(`/me/readings/${id}`), enabled: !!id, refetchOnWindowFocus: false, retry });

export function useSetSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => authRequest<{ id: string; isSaved: boolean }>(`/me/readings/${id}/save`, { method: "POST", body: { saved } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authRequest<{ deleted: boolean }>(`/me/readings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export const useConversations = (params: Record<string, string | number | undefined | null>) =>
  useQuery<Page<ConversationCard>, Error>({
    queryKey: [KEY, "conversations", params],
    queryFn: () => authRequest<Page<ConversationCard>>(`/me/conversations${qs(params)}`),
    placeholderData: keepPreviousData, refetchOnWindowFocus: false, retry,
  });

export const useConversation = (id: string | undefined) =>
  useQuery<ConversationFull, Error>({ queryKey: [KEY, "conversation", id], queryFn: () => authRequest<ConversationFull>(`/me/conversations/${id}`), enabled: !!id, refetchOnWindowFocus: false, retry });

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authRequest<{ deleted: boolean }>(`/me/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Cursor-paged timeline: each page asks for items older than the previous page's last item. */
export const useTimeline = (params: Record<string, string | undefined>) =>
  useInfiniteQuery<TimelinePage, Error, { pages: TimelinePage[] }, unknown[], string | undefined>({
    queryKey: [KEY, "timeline", params],
    queryFn: ({ pageParam }) => authRequest<TimelinePage>(`/me/activity${qs({ ...params, pageSize: 20, before: pageParam })}`),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    refetchOnWindowFocus: false, retry,
  });

export const useNotConfigured = (kind: "bookings" | "orders") =>
  useQuery<NotConfigured, Error>({ queryKey: [KEY, kind], queryFn: () => authRequest<NotConfigured>(`/me/${kind}`), refetchOnWindowFocus: false, retry });
