import { API_BASE_URL } from "@/lib/api";
import { authedFetch, SignInRequiredError } from "@/lib/authedFetch";
import i18n from "@/i18n";

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
    throw new ChatScreenError(i18n.t("guru.errors.screenNetwork"));
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new ChatScreenError(data?.error || i18n.t("guru.errors.screenFailed"));
  return data.data as ScreenOutcome;
}
