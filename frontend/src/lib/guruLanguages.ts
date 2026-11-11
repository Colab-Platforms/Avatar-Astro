import { LOCALES } from "@/i18n/languages";
import type { Astrologer } from "@/data/astrologers";

/**
 * Languages the AI Guru can really converse in: the ten site languages. For each of them the language travels to the model request,
 * the reply is generated directly in that language and script, a wrong-language reply is retried once and then refused, and the
 * script of the reply is checked (and, for Hindi/Marathi etc., real model output was reviewed in the live checks).
 *
 * Sanskrit is deliberately NOT here. It is not one of the site's response languages, nothing can request it, and a Sanskrit reply
 * cannot be told apart from Hindi by the script check (both are Devanagari). It stays in the profile data and can be listed again
 * once a Sanskrit reviewer has verified real replies.
 */
export const VERIFIED_GURU_LANGUAGES: readonly string[] = LOCALES.map((l) => l.english);

/** The languages a guidance profile may advertise: its own list, limited to those the AI Guru can actually reply in. */
export const guruLanguages = (persona: Pick<Astrologer, "languages">): string[] =>
  persona.languages.filter((l) => VERIFIED_GURU_LANGUAGES.includes(l));
