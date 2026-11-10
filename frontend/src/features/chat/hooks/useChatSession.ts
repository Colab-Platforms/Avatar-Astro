import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket } from "../lib/socket";
import { chatApi, astrologerChatApi, type ChatMessage, type ChatSenderRole, type ChatEndReason } from "../api/chatApi";

interface Options {
  sessionId: string;
  /** Which side of the conversation this viewer is on — picks the right REST namespace and participant check. */
  role: ChatSenderRole;
}

export function useChatSession({ sessionId, role }: Options) {
  const api = role === "USER" ? chatApi : astrologerChatApi;
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["chat", "session", sessionId],
    queryFn: () => api.getSession(sessionId),
    staleTime: Infinity,
  });

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", sessionId],
    queryFn: () => api.getMessages(sessionId),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"ACTIVE" | "ENDED">("ACTIVE");
  const [endedReason, setEndedReason] = useState<ChatEndReason | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (sessionQuery.data) {
      setStatus(sessionQuery.data.status);
      setEndedReason(sessionQuery.data.endedReason);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    const socket = connectSocket();

    socket.emit("chat:join", { sessionId }, (err?: string) => {
      if (err) toast.error(err);
    });

    const onMessage = (message: ChatMessage) => {
      if (message.sessionId !== sessionId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    };
    const onTimer = (payload: { sessionId: string; remainingSeconds: number; balancePaise: number | null }) => {
      if (payload.sessionId !== sessionId) return;
      setRemainingSeconds(payload.remainingSeconds);
      setBalancePaise(payload.balancePaise);
    };
    const onWarning = (payload: { sessionId: string; remainingSeconds: number }) => {
      if (payload.sessionId !== sessionId) return;
      toast.warning(`Less than a minute left — ${payload.remainingSeconds}s remaining.`);
    };
    const onEnded = (payload: { sessionId: string; reason: ChatEndReason }) => {
      if (payload.sessionId !== sessionId) return;
      setStatus("ENDED");
      setEndedReason(payload.reason);
      qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] });
    };
    const onTyping = (payload: { sessionId: string; isTyping: boolean; senderRole: ChatSenderRole }) => {
      if (payload.sessionId !== sessionId || payload.senderRole === role) return;
      setPeerTyping(payload.isTyping);
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:timer", onTimer);
    socket.on("chat:low-balance-warning", onWarning);
    socket.on("chat:ended", onEnded);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.emit("chat:leave", { sessionId });
      socket.off("chat:message", onMessage);
      socket.off("chat:timer", onTimer);
      socket.off("chat:low-balance-warning", onWarning);
      socket.off("chat:ended", onEnded);
      socket.off("chat:typing", onTyping);
    };
  }, [sessionId, role, qc]);

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const socket = connectSocket();
      socket.emit("chat:message", { sessionId, content: trimmed }, (err?: string) => {
        if (err) toast.error(err);
      });
    },
    [sessionId],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      connectSocket().emit("chat:typing", { sessionId, isTyping });
    },
    [sessionId],
  );

  const endChat = useCallback(() => {
    const socket = connectSocket();
    socket.emit("chat:end", { sessionId }, (err?: string) => {
      if (err) toast.error(err);
    });
  }, [sessionId]);

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading || messagesQuery.isLoading,
    error: sessionQuery.error,
    messages,
    status,
    endedReason,
    remainingSeconds,
    balancePaise,
    peerTyping,
    sendMessage,
    setTyping,
    endChat,
  };
}
