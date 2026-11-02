import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";
import { calendarFacts, namesOtherCalendarFacts, type TodayCalendar } from "@/lib/karmaCalendar";

export const MIN_SITUATION_CHARS = 3;
export const MAX_SITUATION_CHARS = 1500;

/** A short, plain-language answer. An empty field is never shown. */
export interface KarmaAnswer {
  meaning: string;
  thought: string;
  action: string;
  remember: string;
}

/**
 * The calendar facts are given to the model as verified input. It is told to use only those facts, to keep
 * the words very simple, and to return four short fields. It is NOT asked to work out any calendar value.
 */
export function buildKarmaPrompt(calendar: TodayCalendar | null): string {
  const calendarBlock = calendar
    ? `Today's Hindu calendar (calculated for ${calendar.place}; these facts are verified, do not change them and do not add any other calendar fact):\n${calendarFacts(calendar).map((f) => `- ${f.label}: ${f.value}`).join("\n")}`
    : `Today's Hindu calendar is not available right now. Do not mention any tithi, nakshatra, yoga, karana, month or festival. Say nothing about today's calendar.`;
  return `You are a calm, kind guide for the Know Your Karma feature. You give one short reflection. It is a thought to reflect on, never a fact or a prediction.

${calendarBlock}

Rules:
- Use very simple words and short sentences, so a child can understand. No hard Sanskrit words unless you explain them in a few simple words.
- Reply in the same language the person used. If they write Hindi or Hinglish, reply in Hinglish. Otherwise use plain English.
- Never name a tithi, nakshatra, yoga, karana, month or festival other than the verified ones above. If asked about a date or festival you were not given, say you do not have it.
- Never predict what will happen. No fear, guilt or "karmic debt". Karma here means our actions and choices.
- For health, money or relationship distress, gently suggest talking to someone they trust or a qualified person.
- Do not repeat the same idea in different fields.

Return ONLY a JSON object with exactly these keys:
{
  "meaning": "${calendar ? "2 or 3 short sentences: what today's calendar facts (tithi, paksha, nakshatra) mean in simple words" : "leave this as an empty string"}",
  "thought": "1 or 2 short sentences: a karma thought for this person's question",
  "action": "ONE small, practical good action they can do today",
  "remember": "ONE short, encouraging sentence"
}`;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Validate a model reply into a KarmaAnswer, or null when it is unusable. It is also refused when it names a
 * calendar fact that is not the verified one, and the "meaning" field is dropped when no calendar was available.
 */
export function parseKarmaAnswer(raw: string, calendar: TodayCalendar | null = null): KarmaAnswer | null {
  const obj = extractJson(raw) as Record<string, unknown> | null;
  if (!obj || typeof obj !== "object") return null;
  const answer: KarmaAnswer = {
    meaning: calendar ? str(obj.meaning, 420) : "",
    thought: str(obj.thought, 320),
    action: str(obj.action, 240),
    remember: str(obj.remember, 160),
  };
  // The reflection and the action are the core of the answer.
  if (!answer.thought || !answer.action) return null;
  if (namesOtherCalendarFacts(Object.values(answer).join(" "), calendar)) return null;
  return answer;
}

export class KarmaReadingError extends Error {}

export interface KarmaTurn {
  question: string;
  answer: KarmaAnswer;
}

/** Ask one question. Throws KarmaReadingError with a message that is safe to show. */
export async function askKarma(question: string, calendar: TodayCalendar | null, previous: KarmaTurn[] = []): Promise<KarmaAnswer> {
  const text = question.trim().slice(0, MAX_SITUATION_CHARS);
  // A little context from the last two exchanges keeps follow-up questions natural.
  const history = previous.slice(-2).flatMap((t) => [
    { role: "user" as const, content: t.question },
    { role: "assistant" as const, content: [t.answer.thought, t.answer.action].filter(Boolean).join(" ") },
  ]);
  let res: Response;
  try {
    res = await aiChat({
      temperature: 0.5,
      max_tokens: 600,
      json: true,
      library: { feature: "karma" },
      messages: [{ role: "system", content: buildKarmaPrompt(calendar) }, ...history, { role: "user", content: text }],
    });
  } catch (e) {
    if (e instanceof SignInRequiredError) throw new KarmaReadingError("Please sign in to continue.");
    throw new KarmaReadingError("We couldn't reach the guide. Check your connection and try again.");
  }
  if (res.status === 429) throw new KarmaReadingError("Too many questions at once. Please wait a minute and try again.");
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new KarmaReadingError("The guide is not available right now. Please try again in a moment.");
  const answer = parseKarmaAnswer(data?.choices?.[0]?.message?.content ?? "", calendar);
  if (!answer) throw new KarmaReadingError("That answer didn't come out right. Please ask again.");
  return answer;
}
