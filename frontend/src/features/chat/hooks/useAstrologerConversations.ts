import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket } from "../lib/socket";
import { astrologerChatApi } from "../api/chatApi";
import { AuthApiError } from "@/lib/authClient";

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
    return () => {
      socket.off("chat:new-session", invalidate);
      socket.off("chat:message", invalidate);
      socket.off("chat:session-ended", invalidate);
    };
  }, [qc]);

  return query;
}

export function useSetAstrologerOnline() {
  return useMutation({
    mutationFn: (isOnline: boolean) => astrologerChatApi.setOnline(isOnline),
    onError: (err) => toast.error(err instanceof AuthApiError || err instanceof Error ? err.message : "Could not update your status"),
  });
}
