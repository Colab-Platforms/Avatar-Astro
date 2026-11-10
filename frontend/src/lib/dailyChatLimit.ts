import { API_BASE_URL } from "@/lib/api";
import { authedFetch, SignInRequiredError } from "@/lib/authedFetch";
import i18n from "@/i18n";

export type DailyChatStatus = "NOT_STARTED" | "ACTIVE" | "EXPIRED";

export interface DailyChatSession {
  status: DailyChatStatus;
  allowed: boolean;
  remainingSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  nextAvailableAt: string | null;
  /** Server clock when this was produced; lets the countdown ignore a wrong browser clock. */
  serverNow?: string;
  /** Today's AI Guru conversation, if one was started in this session (status endpoint only). */
  activeConversationId?: string | null;
}

export class DailyChatLimitError extends Error {
  session: DailyChatSession | null;
  constructor(message: string, session: DailyChatSession | null = null) {
    super(message);
    this.session = session;
  }
}

/** Read-only: never starts the timer. Used on page load / tab focus. */
export async function fetchDailyChatStatus(): Promise<DailyChatSession> {
  const res = await authedFetch(`${API_BASE_URL}/inner-voice/chat/status`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new DailyChatLimitError(i18n.t("guru.limit.cannotCheck"));
  return data.data as DailyChatSession;
}

/**
 * Must be called right before sending a chat message. Starts today's session
 * on the first call of the day; throws DailyChatLimitError (with the latest
 * session) once the daily allowance is used up.
 */
export async function consumeDailyChatSession(): Promise<DailyChatSession> {
  let res: Response;
  try {
    res = await authedFetch(`${API_BASE_URL}/inner-voice/chat/consume`, { method: "POST" });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw e;
    throw new DailyChatLimitError(i18n.t("guru.limit.cannotReach"));
  }
  const data = await res.json().catch(() => null);
  if (res.status === 429 || data?.code === "DAILY_CHAT_LIMIT_REACHED") {
    throw new DailyChatLimitError(
      i18n.language === "en" ? data?.message || i18n.t("guru.limit.reached") : i18n.t("guru.limit.reached"),
      (data?.data as DailyChatSession) ?? null,
    );
  }
  if (!res.ok || !data?.success) throw new DailyChatLimitError(i18n.t("guru.limit.startFailed"));
  return data.data as DailyChatSession;
}
