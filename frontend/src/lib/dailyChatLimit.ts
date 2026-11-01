import { API_BASE_URL } from "@/lib/api";
import { authedFetch, SignInRequiredError } from "@/lib/authedFetch";

export type DailyChatStatus = "NOT_STARTED" | "ACTIVE" | "EXPIRED";

export interface DailyChatSession {
  status: DailyChatStatus;
  allowed: boolean;
  remainingSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  nextAvailableAt: string | null;
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
  if (!res.ok || !data?.success) throw new DailyChatLimitError("Could not check today's chat session.");
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
    throw new DailyChatLimitError("Could not reach the chat session service.");
  }
  const data = await res.json().catch(() => null);
  if (res.status === 429 || data?.code === "DAILY_CHAT_LIMIT_REACHED") {
    throw new DailyChatLimitError(
      data?.message || "Your daily AI astrology chat limit has been reached.",
      (data?.data as DailyChatSession) ?? null,
    );
  }
  if (!res.ok || !data?.success) throw new DailyChatLimitError("Could not start the chat session.");
  return data.data as DailyChatSession;
}
