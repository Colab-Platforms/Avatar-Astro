/**
 * A simple, rule-based pronunciation guide for names written in English letters. It splits a name into syllables and gives an
 * English-style respelling for the clear cases only. It is a reading aid, not a dictionary: stress and regional accent are not
 * modelled, which is why the page also offers a Listen button where the browser can speak.
 */

const isVowel = (u: string) => /^[aeiouy]/.test(u);
const DIGRAPH = /^(?:sh|ch|th|kh|gh|ph|dh|bh|jh)/;

function units(w: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    const d = DIGRAPH.test(w.slice(i)) ? w.slice(i, i + 2) : w[i];
    out.push(d);
    i += d.length;
  }
  return out;
}

/** Splits one word at its vowel groups: one consonant between vowels starts the next syllable; with two or more, the first ends the previous one. */
export function syllables(word: string): string[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return [];
  // Letters grouped into consonant runs and vowel runs.
  const runs: { vowel: boolean; units: string[] }[] = [];
  for (const u of units(w)) {
    const v = isVowel(u) && !(u === "y" && runs.length === 0);
    const last = runs[runs.length - 1];
    if (last && last.vowel === v) last.units.push(u);
    else runs.push({ vowel: v, units: [u] });
  }
  if (!runs.some((r) => r.vowel)) return [w];
  const out: string[] = [];
  let cur = "";
  runs.forEach((r, i) => {
    const text = r.units.join("");
    if (r.vowel) { cur += text; return; }
    const between = i > 0 && i < runs.length - 1; // consonants with a vowel on both sides
    if (!between) { cur += text; return; } // leading consonants join the first syllable, trailing ones the last
    if (r.units.length === 1) { out.push(cur); cur = text; }
    else { cur += r.units[0]; out.push(cur); cur = r.units.slice(1).join(""); }
  });
  if (cur) out.push(cur);
  return out;
}

/** English-style respelling of one syllable. Only the clear cases change: long double vowels and "ph". */
const respell = (s: string) => s.replace(/aa/g, "ah").replace(/ee|ii/g, "ee").replace(/oo|uu/g, "oo").replace(/ph/g, "f");

/** Letters that sound alike under this guide, collapsed so two spellings can be compared by sound. */
export const soundKey = (word: string) =>
  word.toLowerCase().replace(/[^a-z]/g, "")
    .replace(/ph/g, "f").replace(/ee|ii|y/g, "i").replace(/aa/g, "a").replace(/oo|uu/g, "u")
    .replace(/c(?![eiy])/g, "k").replace(/z/g, "s").replace(/(.)\1+/g, "$1");

export interface Pronunciation {
  /** Syllables joined by hyphens, one entry per word, e.g. "so-naar". */
  breakdown: string;
  /** English-style respelling, e.g. "so-nahr". */
  respelling: string;
}

export function pronunciationOf(name: string): Pronunciation {
  const words = name.trim().split(/\s+/).filter(Boolean).map(syllables);
  return {
    breakdown: words.map((s) => s.join("-")).join("  ·  "),
    respelling: words.map((s) => s.map(respell).join("-")).join("  ·  "),
  };
}

/** Whether two spellings sound the same under this guide's rules, with a plain explanation either way. */
export function comparePronunciation(from: string, to: string): { same: boolean; text: string } {
  const key = (n: string) => n.trim().split(/\s+/).map(soundKey).join(" ");
  return key(from) === key(to)
    ? { same: true, text: "The pronunciation stays the same. Only the written spelling changes." }
    : { same: false, text: "The suggested spelling may sound slightly different. Compare the syllables and use Listen where it is available." };
}
