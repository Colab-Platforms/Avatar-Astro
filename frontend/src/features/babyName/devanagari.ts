/**
 * The opening sound of a Devanagari name, used to match names to a naming syllable.
 *
 * Published Nakshatra syllable lists are matched by SOUND, not by exact letter: cerebral and dental consonants
 * (ट/त, ड/द, ठ/थ, ण/न), the two sibilants (श/ष) and short/long vowels (इ/ई, उ/ऊ, अ/आ) share one English spelling in them.
 * This file encodes exactly that and nothing more. A conjunct opening (क्ष, ज्ञ, प्र, श्र ...) has no single-syllable
 * sound in the table, so it returns null and the name is never matched by guesswork.
 */

export interface Sound {
  /** Roman consonant sound ("" for a vowel-initial name). */
  onset: string;
  /** a, i, u, e, ai, o or au; length is ignored. */
  vowel: string;
}

const CONSONANT: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v",
  श: "sh", ष: "sh", स: "s", ह: "h",
};

const INDEPENDENT: Record<string, string> = {
  अ: "a", आ: "a", इ: "i", ई: "i", उ: "u", ऊ: "u", ए: "e", ऐ: "ai", ओ: "o", औ: "au",
};

const MATRA: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
};

const VIRAMA = "्";
const NUKTA = "़";

export function leadingSound(deva: string): Sound | null {
  const s = (deva || "").trim().replace(/^ॐ/, ""); // a leading Om sign is not a syllable
  const first = s.charAt(0);
  if (INDEPENDENT[first]) return { onset: "", vowel: INDEPENDENT[first] };
  // A word-initial ऋ is read "ri" in Hindi (Rishi, Ritu, Riddhi), so it belongs with the Ri syllables. The ृ sign after a
  // consonant (कृ, मृ ...) is deliberately NOT mapped: "Kri" is not "Ki".
  if (first === "ऋ") return { onset: "r", vowel: "i" };
  const onset = CONSONANT[first];
  if (!onset) return null;
  let i = 1;
  if (s.charAt(i) === NUKTA) i++;
  const next = s.charAt(i);
  if (next === VIRAMA) return null; // conjunct: not a single table syllable
  if (MATRA[next]) return { onset, vowel: MATRA[next] };
  if (/[ृॄॢॣ]/.test(next)) return null; // ृ ॄ ॢ ॣ (Kri, Mri ...): not a plain a-i-u-e-o syllable
  return { onset, vowel: "a" }; // inherent a (also covers a following anusvara or visarga)
}

export const sameSound = (a: Sound | null, b: Sound | null): boolean => !!a && !!b && a.onset === b.onset && a.vowel === b.vowel;
