import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket } from "../lib/socket";
import { chatApi, astrologerChatApi, type ChatMessage, type ChatSenderRole, type ChatEndReason, type ChatSessionStatus } from "../api/chatApi";

interface Options {
  sessionId: string;
  /** Which side of the conversation this viewer is on — picks the right REST namespace and participant check. */
  role: ChatSenderRole;
}

/** Matches backend/src/modules/chat/chat.constants.ts's HEARTBEAT_INTERVAL_MS — kept as a
 * separate constant here since the frontend has no shared import path into the backend. */
const HEARTBEAT_INTERVAL_MS = 10_000;

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
  const [status, setStatus] = useState<ChatSessionStatus>("REQUESTED");
  const [endedReason, setEndedReason] = useState<ChatEndReason | null>(null);
  // The server only pushes chat:timer once per BILLING_TICK_MS (5s) — displaying that number
  // verbatim makes the clock look frozen, then jump, instead of ticking. Keep the server's value
  // (remainingSecondsBase) plus the moment it arrived (remainingSyncedAt), and derive a smoothly
  // decreasing display value every second via `clockTick`, which only exists to force a re-render.
  const [remainingSecondsBase, setRemainingSecondsBase] = useState<number | null>(null);
  const [remainingSyncedAt, setRemainingSyncedAt] = useState<number>(0);
  const [clockTick, setClockTick] = useState(0);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [freeSecondsRemaining, setFreeSecondsRemaining] = useState<number | null>(null);
  const [pauseGraceEndsAt, setPauseGraceEndsAt] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);

  useEffect(() => {
    if (remainingSecondsBase == null || status !== "ACTIVE") return;
    const id = setInterval(() => setClockTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [remainingSecondsBase, status]);

  const remainingSeconds =
    remainingSecondsBase == null
      ? null
      : Math.max(0, remainingSecondsBase - Math.floor((Date.now() - remainingSyncedAt) / 1000));
  // clockTick is read here only to satisfy the linter's "used" check for the interval above —
  // the actual re-render it causes is what makes `remainingSeconds` above recompute every second.
  void clockTick;

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
    const onTimer = (payload: { sessionId: string; remainingSeconds: number | null; balancePaise: number | null; freeSecondsRemaining?: number }) => {
      if (payload.sessionId !== sessionId) return;
      setRemainingSecondsBase(payload.remainingSeconds);
      setRemainingSyncedAt(Date.now());
      setBalancePaise(payload.balancePaise);
      if (payload.freeSecondsRemaining !== undefined) setFreeSecondsRemaining(payload.freeSecondsRemaining);
    };
    const onWarning = (payload: { sessionId: string; remainingSeconds: number }) => {
      if (payload.sessionId !== sessionId) return;
      toast.warning(`Less than a minute left — ${payload.remainingSeconds}s remaining.`);
    };
    const onAccepted = (payload: { sessionId: string }) => {
      if (payload.sessionId !== sessionId) return;
      setStatus("ACTIVE");
      qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] });
    };
    const onPaused = (payload: { sessionId: string; graceEndsAt: string }) => {
      if (payload.sessionId !== sessionId) return;
      setStatus("PAUSED");
      setPauseGraceEndsAt(payload.graceEndsAt);
    };
    const onResumed = (payload: { sessionId: string }) => {
      if (payload.sessionId !== sessionId) return;
      setStatus("ACTIVE");
      setPauseGraceEndsAt(null);
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
    socket.on("chat:accepted", onAccepted);
    socket.on("chat:paused", onPaused);
    socket.on("chat:resumed", onResumed);
    socket.on("chat:ended", onEnded);
    socket.on("chat:typing", onTyping);

    // Keeps this participant's presence alive server-side (see billing.ts's PRESENCE_TIMEOUT_MS) —
    // without a recurring heartbeat, a session would be paused ~15s after the join-time heartbeat.
    const heartbeat = setInterval(() => socket.emit("chat:heartbeat", { sessionId }), HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
      socket.emit("chat:leave", { sessionId });
      socket.off("chat:message", onMessage);
      socket.off("chat:timer", onTimer);
      socket.off("chat:low-balance-warning", onWarning);
      socket.off("chat:accepted", onAccepted);
      socket.off("chat:paused", onPaused);
      socket.off("chat:resumed", onResumed);
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

  const acceptRequest = useCallback(async () => {
    await astrologerChatApi.acceptSession(sessionId);
    setStatus("ACTIVE");
    qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] });
  }, [sessionId, qc]);

  const rejectRequest = useCallback(async () => {
    await astrologerChatApi.rejectSession(sessionId);
    setStatus("ENDED");
    setEndedReason("REJECTED");
    qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] });
  }, [sessionId, qc]);

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading || messagesQuery.isLoading,
    error: sessionQuery.error,
    messages,
    status,
    endedReason,
    remainingSeconds,
    balancePaise,
    freeSecondsRemaining,
    pauseGraceEndsAt,
    peerTyping,
    sendMessage,
    setTyping,
    endChat,
    acceptRequest,
    rejectRequest,
  };
}
