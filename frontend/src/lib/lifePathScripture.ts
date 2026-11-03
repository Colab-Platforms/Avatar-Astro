import { matchVerses, type VerifiedVerse } from "@/lib/guruScripture";

/**
 * The Bhagavad Gita teaching shown beside a Bhavishya Marg reading.
 *
 * It is NEVER written by the model: the verse, its reference and its meaning come from the curated catalog
 * (`shlokaCatalog.ts`), chosen by the area of interest. It is shown as a separate, labelled card because it is
 * a teaching, not part of the calendar or of the personal guidance. When nothing fits, nothing is shown.
 */
// Relationships has no Bhagavad Gita verse in the catalog (its only fit is an Upanishad), so nothing is shown there
// rather than forcing an unrelated verse.
const FOCUS_THEMES: Record<string, string> = {
  career: "career work effort",
  "personal-growth": "motivation discipline",
  finance: "financial worry",
  general: "balance equanimity",
};

export function scriptureForFocus(focus: string): VerifiedVerse | null {
  const query = FOCUS_THEMES[focus];
  return query ? (matchVerses(query)[0] ?? null) : null;
}
