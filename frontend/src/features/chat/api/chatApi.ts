import { authRequest } from "@/lib/authClient";

export type ChatSessionType = "PAID" | "FREE_TRIAL";
export type ChatSessionStatus = "ACTIVE" | "ENDED";
export type ChatEndReason = "USER_ENDED" | "ASTROLOGER_ENDED" | "BALANCE_EXHAUSTED" | "FREE_LIMIT_REACHED" | "TIMEOUT";
export type ChatSenderRole = "USER" | "ASTROLOGER";

export interface ChatSession {
  id: string;
  userId: string;
  astrologerProfileId: string;
  type: ChatSessionType;
  status: ChatSessionStatus;
  ratePerMinutePaise: number;
  freeLimitSeconds: number | null;
  startedAt: string;
  billedSeconds: number;
  amountPaise: number;
  endedAt: string | null;
  endedReason: ChatEndReason | null;
  /** Only present on GET /sessions/:id — the "peer" info each side needs to render a chat header. */
  astrologerProfile?: { userId: string; displayName: string; profilePhotoUrl: string | null; slug: string };
  user?: { firstName: string | null; lastName: string | null; profileImage: string | null };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderRole: ChatSenderRole;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface ChatEligibility {
  type: ChatSessionType;
  canStart: boolean;
  freeTrialAvailable: boolean;
  freeLimitSeconds: number | null;
  ratePerMinutePaise: number;
  walletBalancePaise: number | null;
  minimumRequiredPaise?: number;
}

export interface UserConversationSummary {
  sessionId: string;
  status: ChatSessionStatus;
  type: ChatSessionType;
  astrologer: { id: string; displayName: string; profilePhotoUrl: string | null; slug: string };
  lastMessage: ChatMessage | null;
  startedAt: string;
  endedAt: string | null;
}

export interface AstrologerConversationSummary {
  sessionId: string;
  status: ChatSessionStatus;
  type: ChatSessionType;
  user: { id: string; firstName: string | null; lastName: string | null; profileImage: string | null };
  lastMessage: ChatMessage | null;
  unreadCount: number;
  startedAt: string;
  endedAt: string | null;
}

export const chatApi = {
  getEligibility(astrologerProfileId: string) {
    return authRequest<ChatEligibility>(`/chat/eligibility/${astrologerProfileId}`);
  },
  startSession(astrologerProfileId: string) {
    return authRequest<ChatSession>("/chat/sessions", { method: "POST", body: { astrologerProfileId } });
  },
  getSession(sessionId: string) {
    return authRequest<ChatSession>(`/chat/sessions/${sessionId}`);
  },
  getMessages(sessionId: string, cursor?: string) {
    return authRequest<ChatMessage[]>(`/chat/sessions/${sessionId}/messages${cursor ? `?cursor=${cursor}` : ""}`);
  },
  endSession(sessionId: string) {
    return authRequest<ChatSession>(`/chat/sessions/${sessionId}/end`, { method: "POST" });
  },
  listMyConversations() {
    return authRequest<UserConversationSummary[]>("/chat/sessions");
  },
};

export const astrologerChatApi = {
  listConversations() {
    return authRequest<AstrologerConversationSummary[]>("/astrologer/chat/sessions");
  },
  getSession(sessionId: string) {
    return authRequest<ChatSession>(`/astrologer/chat/sessions/${sessionId}`);
  },
  getMessages(sessionId: string, cursor?: string) {
    return authRequest<ChatMessage[]>(`/astrologer/chat/sessions/${sessionId}/messages${cursor ? `?cursor=${cursor}` : ""}`);
  },
  endSession(sessionId: string) {
    return authRequest<ChatSession>(`/astrologer/chat/sessions/${sessionId}/end`, { method: "POST" });
  },
  setOnline(isOnline: boolean) {
    return authRequest<{ id: string; isOnline: boolean }>("/astrologer/chat/online", { method: "PATCH", body: { isOnline } });
  },
};
