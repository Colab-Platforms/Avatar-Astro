import { API_BASE_URL } from "@/lib/api";
import { authedFetch } from "@/lib/authedFetch";

export interface AiChatBody {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
  /** Ask the model for a JSON object response. */
  json?: boolean;
  /** Labels the result for the user's library (My Readings / My Conversations). A label only: the saved content is the provider's reply. */
  library?: { feature: "karma" | "shloka" | "ai-guru" | "guru-report"; conversationId?: string };
  /**
   * Ask the model to write its reply in this language (one of the ten supported codes; the server checks it). Pass
   * `chosenLanguage()` from "@/i18n/aiLanguage" to follow the visitor's choice. Leave it out for a feature that manages its own reply
   * language (Know Your Karma, AI Guru): the server then adds nothing.
   */
  language?: string;
}

/**
 * Sends a chat request through the backend AI proxy (the provider key lives on
 * the server). Requires a signed-in user: throws SignInRequiredError otherwise. Resolves to the raw Response; on success the body has the
 * OpenAI shape `{ choices: [{ message: { content } }] }`, on failure
 * `{ error: { message } }`.
 */
export function aiChat(body: AiChatBody): Promise<Response> {
  return authedFetch(`${API_BASE_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
