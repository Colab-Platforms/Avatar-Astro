import { aiChat } from "@/lib/aiClient";
import i18n from "@/i18n";
import { isInLanguage } from "@/i18n/aiLanguage";
import { localeInfo, type LocaleCode } from "@/i18n/languages";

export class VoiceChatError extends Error {}

export interface VoiceTurn { role: "user" | "assistant"; content: string }

/**
 * One reply from Pandit Ji in the Voice Consultation.
 *
 * `language` is the language chosen in the Bhagya selector. It is sent to the server (which turns it into the instruction to write
 * directly in that language) and the reply is checked to really be in it. A reply in another language is not shown: the model is
 * asked once more, and if it still does not comply the caller gets a VoiceChatError. A failure is never turned into a made-up reply.
 *
 * `history` is the whole conversation so far, ending with the message being answered.
 */
export async function askPandit(history: VoiceTurn[], language: LocaleCode, systemPrompt: string): Promise<string> {
  const name = localeInfo(language).english;
  const once = async (retryNote: string): Promise<string> => {
    let res: Response;
    try {
      res = await aiChat({
        temperature: 0.75,
        max_tokens: 380, // the server enlarges this for Indian scripts
        language,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: `The seeker may speak or type in any language, and earlier turns may be in another language. Write your reply only in ${name}.${retryNote ? " " + retryNote : ""}` },
          ...history,
        ],
      });
    } catch {
      throw new VoiceChatError(i18n.t("voice.replyFailed", { lng: language }));
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) throw new VoiceChatError(i18n.t("voice.replyFailed", { lng: language }));
    const reply = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) throw new VoiceChatError(i18n.t("voice.replyFailed", { lng: language }));
    return reply;
  };

  const first = await once("");
  if (isInLanguage(first, language)) return first;
  const second = await once(`Your previous reply was not written in ${name}. Write the whole reply again, entirely in ${name} (${localeInfo(language).native}), in its own script.`);
  if (isInLanguage(second, language)) return second;
  throw new VoiceChatError(i18n.t("guru.errors.wrongLanguage", { lng: language }));
}
