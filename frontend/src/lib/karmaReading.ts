import { aiChat } from "@/lib/aiClient";
import { SignInRequiredError } from "@/lib/authedFetch";
import { calendarFacts, namesAnyCalendarTerm, type TodayCalendar } from "@/lib/karmaCalendar";
import { PAKSHA_IDEA, replyDirective } from "@/lib/karmaLanguage";
import i18n from "@/i18n";
import { isInLanguage, replyLanguage } from "@/i18n/aiLanguage";
import { localeInfo, type LocaleCode } from "@/i18n/languages";

export const MIN_SITUATION_CHARS = 3;
export const MAX_SITUATION_CHARS = 1500;

/** A short, plain-language answer. An empty field is never shown. */
export interface KarmaAnswer {
  thought: string;
  action: string;
  remember: string;
}

/**
 * The model is given the person's question, the reply language, and (when available) today's verified calendar as
 * background. It writes only three short parts: a thought that answers the question, one small action and one
 * encouraging line. It may NOT name any tithi, nakshatra or weekday, or say what any of them "means": the app shows
 * the calendar and its explanation itself, exactly, from the calculation.
 */
export function buildKarmaPrompt(calendar: TodayCalendar | null, lang: LocaleCode = replyLanguage()): string {
  const calendarBlock = calendar
    ? `Background (verified, for you only; do NOT name any of it in your reply). Today's Hindu calendar for ${calendar.place}:\n${calendarFacts(calendar).map((f) => `- ${f.label}: ${f.value}`).join("\n")}\nIf it helps, you may use ONLY this idea about the Moon: ${PAKSHA_IDEA[calendar.paksha]}.`
    : `Today's Hindu calendar is not available right now. Do not mention any tithi, nakshatra, yoga, karana, month or festival. Say nothing about today's calendar.`;
  return `You are a calm, kind guide for the Know Your Karma feature. Karma here simply means our actions and choices. You give one short reflection. It is a thought to reflect on, never a fact or a prediction.

${calendarBlock}

Rules:
- Answer the person's question directly and logically. Connect it to their own actions and choices.
- Use very simple words and short sentences, so a child can understand. No hard Sanskrit words unless you explain them in a few simple words.
- ${replyDirective(lang)}
- Never name any tithi, nakshatra, yoga, karana, month, festival or weekday, and never say what any of them means. If asked about a date or festival, say you do not have it.
- Do not quote any scripture, chapter or verse. Do not invent facts.
- Never predict what will happen. No fear, guilt or "karmic debt".
- For health, money or relationship distress, gently suggest talking to someone they trust or a qualified person.
- Do not repeat the same idea in different parts.

Return ONLY a JSON object with exactly these keys:
{
  "thought": "1 or 2 short sentences: a karma thought that answers this person's question",
  "action": "ONE small, practical good action they can do today, in one short sentence",
  "remember": "ONE short, encouraging sentence"
}`;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

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

const CITES_SCRIPTURE = /\b(chapter|verse|shloka|sloka|adhyay|adhyaya|canto|skandha|gita|bhagavad|bhagwad|bhagavata|purana)\b|अध्याय|श्लोक|गीता|भगवद्|पुराण|\b\d{1,2}\s*[.:]\s*\d{1,3}\b/i;

type Checked = { answer: KarmaAnswer; reason?: undefined } | { answer: null; reason: "bad" | "wrongLanguage" };

/** Validate a model reply: the structure, the safety rules, then the language. */
function checkKarmaAnswer(raw: string, lang: LocaleCode): Checked {
  const obj = extractJson(raw) as Record<string, unknown> | null;
  if (!obj || typeof obj !== "object") return { answer: null, reason: "bad" };
  const answer: KarmaAnswer = {
    thought: str(obj.thought, 300),
    action: str(obj.action, 200),
    remember: str(obj.remember, 130),
  };
  // The reflection and the action are the core of the answer.
  if (!answer.thought || !answer.action) return { answer: null, reason: "bad" };
  const written = [answer.thought, answer.action, answer.remember].join(" ");
  if (namesAnyCalendarTerm(written) || CITES_SCRIPTURE.test(written)) return { answer: null, reason: "bad" };
  if (!isInLanguage(written, lang)) return { answer: null, reason: "wrongLanguage" };
  return { answer };
}

/**
 * Validate a model reply into a KarmaAnswer, or null when it is unusable. It is refused when it names any calendar
 * term or weekday, quotes scripture, or is not written in the chosen language. (The calendar and its explanation are
 * shown by the app itself, once, from the calculation; they are not part of the model's answer.)
 */
export function parseKarmaAnswer(raw: string, _calendar: TodayCalendar | null = null, lang: LocaleCode = replyLanguage()): KarmaAnswer | null {
  return checkKarmaAnswer(raw, lang).answer;
}

export class KarmaReadingError extends Error {}

export interface KarmaTurn {
  question: string;
  answer: KarmaAnswer;
}

/** Ask one question. Throws KarmaReadingError with a message (in the reply language) that is safe to show. */
export async function askKarma(question: string, calendar: TodayCalendar | null, previous: KarmaTurn[] = [], lang: LocaleCode = replyLanguage()): Promise<KarmaAnswer> {
  const err = (key: string) => new KarmaReadingError(i18n.t(`karma.errors.${key}`, { lng: lang }));
  const text = question.trim().slice(0, MAX_SITUATION_CHARS);
  // A little context from the last two exchanges keeps follow-up questions natural.
  const history = previous.slice(-2).flatMap((t) => [
    { role: "user" as const, content: t.question },
    { role: "assistant" as const, content: [t.answer.thought, t.answer.action].filter(Boolean).join(" ") },
  ]);
  let failure: "bad" | "wrongLanguage" = "bad";
  // A reply that fails the checks is asked for once more (firmly, if it was in the wrong language) before the person sees an error.
  for (let attempt = 0; attempt < 2; attempt++) {
    const name = localeInfo(lang).english;
    const note = attempt > 0 && failure === "wrongLanguage"
      ? [{ role: "system" as const, content: `Your previous reply was not written in ${name}. Write the whole reply again, entirely in ${name} (${localeInfo(lang).native}), in its own script.` }]
      : [];
    let res: Response;
    try {
      res = await aiChat({
        language: lang, // the server turns this into the instruction to write directly in that language
        temperature: 0.5,
        // A ceiling only: some models think before they write. The answer itself is capped above.
        max_tokens: 900,
        json: true,
        library: { feature: "karma" },
        messages: [{ role: "system", content: buildKarmaPrompt(calendar, lang) }, ...note, ...history, { role: "user", content: text }],
      });
    } catch (e) {
      if (e instanceof SignInRequiredError) throw err("signIn");
      throw err("network");
    }
    if (res.status === 429) throw err("rate");
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) throw err("unavailable");
    const checked = checkKarmaAnswer(data?.choices?.[0]?.message?.content ?? "", lang);
    if (checked.answer) return checked.answer;
    failure = checked.reason ?? "bad";
  }
  // Never show an answer in another language: say so, in the reply language.
  throw failure === "wrongLanguage" ? err("wrongLanguage") : err("bad");
}
