import { API_BASE_URL } from "@/lib/api";
import { authedFetch, SignInRequiredError } from "@/lib/authedFetch";

export interface ScreenOutcome {
  action: "ALLOW" | "ESCALATED" | "OFF_TOPIC";
  reply?: string;
}

export class ChatScreenError extends Error {}

/**
 * Asked before every chat message. ESCALATED = stored for the team to contact the user (no AI reply);
 * OFF_TOPIC = fixed refusal. Throws on failure so the caller never falls through to the AI unscreened.
 */
export async function screenChatMessage(message: string, lastGuruReply?: string): Promise<ScreenOutcome> {
  let res: Response;
  try {
    res = await authedFetch(`${API_BASE_URL}/inner-voice/chat/screen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lastGuruReply }),
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw e;
    throw new ChatScreenError("We couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new ChatScreenError(data?.error || "Could not process your message. Please try again.");
  return data.data as ScreenOutcome;
}
