import { API_BASE_URL } from "@/lib/api";

export interface AiChatBody {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
  /** Ask the model for a JSON object response. */
  json?: boolean;
}

/**
 * Sends a chat request through the backend AI proxy (the provider key lives on
 * the server). Resolves to the raw Response; on success the body has the
 * OpenAI shape `{ choices: [{ message: { content } }] }`, on failure
 * `{ error: { message } }`.
 */
export function aiChat(body: AiChatBody): Promise<Response> {
  return fetch(`${API_BASE_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
