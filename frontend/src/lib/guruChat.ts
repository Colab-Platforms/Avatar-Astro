import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";

export const MAX_GURU_INPUT_CHARS = 1000;
/** Only the most recent turns are sent, so a long chat never exceeds the backend's request limits. */
export const MAX_HISTORY_MESSAGES = 14;

export interface GuruTurn {
  type: "greeting" | "gathering";
  message: string;
  progress?: number;
  readyForDiagnosis?: boolean;
  /** Set by the server when the exchange was saved: pass it back to keep the same conversation. */
  conversationId?: string;
}

export class GuruChatError extends Error {}

export const GURU_CONSULTATION_SYSTEM = `You are "AI Guru", an AI guide that offers reflective guidance inspired by Vedic and Indian spiritual traditions (Bhagavad Gita, Upanishads, Jyotish, temple traditions). You are an AI, not a human pandit or astrologer. Never claim to be a real person, to have years of experience, or to see the user's birth chart.

How to answer:
- ALWAYS respond to what the user actually asked or said in your first sentences. If they ask a question, answer it directly and usefully first. Only then, if it would genuinely help, ask ONE short follow-up question.
- Warm, calm and specific to their words. No generic motivational slogans, no corporate coaching language, no repeating the same phrases between turns.
- Reply in the user's language (English, Hindi or Hinglish). Write Hindi in Roman script, not Devanagari.
- Keep it concise: usually 2 short paragraphs, or a short intro plus 3 to 4 "- " bullet points when giving options or steps. Put a blank line between paragraphs.
- Spiritual ideas (karma, dharma, mantras, planets, remedies) are offered as one perspective for reflection, never as fact or certainty. Do not name planets, doshas or dashas unless the user gives their own chart details or asks about them, and then say you cannot see their chart.
- Never predict guaranteed outcomes, diagnose illness, or use fear or guilt. Never suggest that a paid ritual or remedy is required.
- For health, mental-health crisis, legal or money emergencies, gently encourage them to speak to a qualified professional or someone they trust, in addition to any spiritual comfort. If someone may be in danger or considering self-harm, respond with care and urge them to contact local emergency services or a crisis helpline.
- If the user only greets you, greet them briefly and ask what they would like guidance on.

Return ONLY a JSON object:
{"type":"greeting" or "gathering","message":"your reply","progress":0-100,"readyForDiagnosis":true or false}
"progress" is how fully you understand their concern (0 for a greeting). Set "readyForDiagnosis" to true only after at least 3 exchanges about the same concern.`;

/** Turn a model reply into a GuruTurn. Falls back to the raw text rather than showing a fake canned answer. */
export function parseGuruReply(raw: string): GuruTurn | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const message = typeof obj.message === "string" ? obj.message.trim() : "";
      if (message) {
        const progress =
          typeof obj.progress === "number" && isFinite(obj.progress) ? Math.min(100, Math.max(0, Math.round(obj.progress))) : undefined;
        return {
          type: obj.type === "greeting" ? "greeting" : "gathering",
          message: message.slice(0, 2000),
          progress,
          readyForDiagnosis: obj.readyForDiagnosis === true,
        };
      }
    } catch {
      /* fall through */
    }
    // Looked like JSON but had no usable message: never show raw JSON to the user.
    return null;
  }
  return { type: "gathering", message: text.slice(0, 2000) };
}

export function trimHistory<T>(history: T[]): T[] {
  return history.length > MAX_HISTORY_MESSAGES ? history.slice(-MAX_HISTORY_MESSAGES) : history;
}

export async function askGuru(
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  languageDirective: string,
  conversationId?: string,
): Promise<GuruTurn> {
  let res: Response;
  try {
    res = await aiChat({
      temperature: 0.7,
      max_tokens: 900,
      json: true,
      library: { feature: "ai-guru", ...(conversationId ? { conversationId } : {}) },
      messages: [
        { role: "system", content: GURU_CONSULTATION_SYSTEM },
        { role: "system", content: languageDirective },
        ...trimHistory(history),
        { role: "user", content: userMessage.slice(0, MAX_GURU_INPUT_CHARS) },
      ],
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw new GuruChatError("Please sign in to continue.");
    throw new GuruChatError("We couldn't reach Divya Margdarshak. Check your connection and try again.");
  }
  if (res.status === 429) throw new GuruChatError("Too many messages. Please wait a minute and try again.");
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new GuruChatError("Divya Margdarshak is unavailable right now. Please try again in a moment.");
  const turn = parseGuruReply(data?.choices?.[0]?.message?.content ?? "");
  if (!turn) throw new GuruChatError("Divya Margdarshak's reply came back incomplete. Please try again.");
  const savedId = res.headers?.get?.("X-Conversation-Id");
  return savedId ? { ...turn, conversationId: savedId } : turn;
}
