import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { connectSocket } from "../lib/socket";
import { chatApi } from "../api/chatApi";

export const USER_CONVERSATIONS_QUERY_KEY = ["chat", "conversations", "mine"] as const;

/** The signed-in user's own chat list — lets them resume an active session or revisit history. */
export function useConversations() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: USER_CONVERSATIONS_QUERY_KEY,
    queryFn: () => chatApi.listMyConversations(),
    staleTime: 15_000,
  });

  useEffect(() => {
    const socket = connectSocket();
    const invalidate = () => qc.invalidateQueries({ queryKey: USER_CONVERSATIONS_QUERY_KEY });
    socket.on("chat:message", invalidate);
    socket.on("chat:ended", invalidate);
    return () => {
      socket.off("chat:message", invalidate);
      socket.off("chat:ended", invalidate);
    };
  }, [qc]);

  return query;
}
