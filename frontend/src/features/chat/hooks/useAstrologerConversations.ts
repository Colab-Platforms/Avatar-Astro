import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket } from "../lib/socket";
import { astrologerChatApi } from "../api/chatApi";
import { AuthApiError } from "@/lib/authClient";
import { ASTROLOGER_PROFILE_QUERY_KEY } from "@/features/astrologer/workspace/hooks/useAstrologerWorkspace";

export const ASTROLOGER_CONVERSATIONS_QUERY_KEY = ["chat", "conversations", "astrologer"] as const;

/** The astrologer workspace's conversation list — updates live as new sessions start and
 * as messages arrive, via `chat:new-session` / `chat:message` on the astrologer's own
 * Socket.IO room (joined automatically on connect — see realtime/socketServer.ts). */
export function useAstrologerConversations() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ASTROLOGER_CONVERSATIONS_QUERY_KEY,
    queryFn: () => astrologerChatApi.listConversations(),
    staleTime: 10_000,
  });

  useEffect(() => {
    const socket = connectSocket();
    const invalidate = () => qc.invalidateQueries({ queryKey: ASTROLOGER_CONVERSATIONS_QUERY_KEY });
    socket.on("chat:new-session", invalidate);
    socket.on("chat:message", invalidate);
    socket.on("chat:session-ended", invalidate);
    socket.on("chat:paused", invalidate);
    socket.on("chat:resumed", invalidate);
    return () => {
      socket.off("chat:new-session", invalidate);
      socket.off("chat:message", invalidate);
      socket.off("chat:session-ended", invalidate);
      socket.off("chat:paused", invalidate);
      socket.off("chat:resumed", invalidate);
    };
  }, [qc]);

  return query;
}

export function useSetAstrologerOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isOnline: boolean) => astrologerChatApi.setOnline(isOnline),
    onSuccess: (data, isOnline) => {
      qc.setQueryData(ASTROLOGER_PROFILE_QUERY_KEY, (old: Record<string, unknown> | null | undefined) =>
        old ? { ...old, isOnline } : old
      );
      qc.invalidateQueries({ queryKey: ASTROLOGER_PROFILE_QUERY_KEY });
      toast.success(isOnline ? "You are now online for chats" : "You are now offline");
    },
    onError: (err) =>
      toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not update your status"),
  });
}
