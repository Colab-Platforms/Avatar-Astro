import { chaldeanWorking, checkName, destinyWorking, reduceNumber, soulUrgeWorking, personalityWorking } from "./numerology";
import { comparePronunciation, soundKey } from "./namePronunciation";

/**
 * Spelling comparison for Namank Jyotish. Every number comes from the same calculators the rest of the page uses
 * (Pythagorean Destiny, Soul Urge, Personality and Chaldean), so a comparison can never disagree with the main report.
 */

export interface SpellingNumbers {
  destiny: number;
  soulUrge: number;
  personality: number;
  chaldean: number;
  /** Chaldean total before reduction (the "compound number"). */
  chaldeanTotal: number;
}

export function numbersFor(name: string): SpellingNumbers | null {
  const c = checkName(name);
  if (!c.ok) return null;
  const ch = chaldeanWorking(c.letters);
  return {
    destiny: destinyWorking(c.letters).result,
    soulUrge: soulUrgeWorking(c.letters).result,
    personality: personalityWorking(c.letters).result,
    chaldean: ch.result,
    chaldeanTotal: ch.total,
  };
}

type Op = { kind: "keep" | "add" | "remove"; ch: string };

/** Letter-by-letter edit script between two spellings (case and spacing ignored), from a longest-common-subsequence. */
function editScript(from: string, to: string): Op[] {
  const a = from.toLowerCase().replace(/[^a-z]/g, "");
  const b = to.toLowerCase().replace(/[^a-z]/g, "");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({ kind: "keep", ch: a[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push({ kind: "remove", ch: a[i++] });
    else ops.push({ kind: "add", ch: b[j++] });
  }
  while (i < a.length) ops.push({ kind: "remove", ch: a[i++] });
  while (j < b.length) ops.push({ kind: "add", ch: b[j++] });
  return ops;
}

export interface SpellingChange {
  added: string[];
  removed: string[];
  /** Plain-language description, e.g. `Adds “i”` or `Replaces “sh” with “s”`. Empty when the letters are identical. */
  summary: string;
}

export function describeChange(from: string, to: string): SpellingChange {
  const ops = editScript(from, to);
  const added = ops.filter((o) => o.kind === "add").map((o) => o.ch);
  const removed = ops.filter((o) => o.kind === "remove").map((o) => o.ch);
  // Group neighbouring removals and additions into one "replaces" step.
  const parts: string[] = [];
  for (let k = 0; k < ops.length; ) {
    if (ops[k].kind === "keep") { k++; continue; }
    let rem = "";
    let add = "";
    while (k < ops.length && ops[k].kind !== "keep") {
      if (ops[k].kind === "remove") rem += ops[k].ch;
      else add += ops[k].ch;
      k++;
    }
    parts.push(rem && add ? `Replaces “${rem}” with “${add}”` : add ? `Adds “${add}”` : `Removes “${rem}”`);
  }
  return { added, removed, summary: parts.join("; ") };
}

export interface SpellingSuggestion {
  spelling: string;
  numbers: SpellingNumbers;
  change: SpellingChange;
  /** Which name numbers now equal the Birth Number or Life Path. Empty for a "closest alternative". */
  reasons: string[];
  /** True when the spelling is pronounced the same as the original under the rules in namePronunciation.ts. */
  sameSound: boolean;
}

export interface Recommendations {
  /** Ranked best first. */
  items: SpellingSuggestion[];
  /** True when at least one item reaches the Birth Number or Life Path. When false, items are only the closest readable alternatives. */
  anyMatch: boolean;
  /** True when the name as typed already reaches the Birth Number or Life Path. */
  currentFits: boolean;
  birth: number;
  lifePath: number;
}

const VOWEL = /[aeiouy]/;
const DOUBLE_OK = /[aeioulnmrst]/;

/** True when a spelling could be read aloud: no tripled letters, no odd doubled consonants, no longer consonant runs than the original. */
export function isReadable(word: string, original = ""): boolean {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 2 || !VOWEL.test(w)) return false;
  if (/(.)\1\1/.test(w)) return false;
  for (const m of w.matchAll(/(.)\1/g)) if (!DOUBLE_OK.test(m[1])) return false;
  const run = (x: string) => Math.max(0, ...(x.match(/[^aeiouy]+/g) || []).map((r) => r.length));
  return run(w) <= Math.max(3, run(original.toLowerCase().replace(/[^a-z]/g, "")));
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * Candidate spellings. Each changes ONE word and keeps every other word exactly as typed, so the first name and surname are both
 * preserved. Techniques: doubling an inner consonant or the final vowel, removing one of a doubled pair, long/short vowel pairs (i↔ee, a↔aa, u↔oo),
 * a common sound swap (k/c, i/y, s/z, ph/f), and a changed final i/y. The first letter never changes. Unreadable results are dropped.
 */
export function candidateSpellings(name: string): string[] {
  const words = name.trim().split(/\s+/);
  const out = new Set<string>();
  words.forEach((word, idx) => {
    if (word.replace(/[^A-Za-z]/g, "").length < 3) return;
    const lower = word.toLowerCase();
    const put = (w: string) => {
      // The first letter always stays, so the name keeps its identity; unreadable results are dropped.
      if (!w || w.toLowerCase() === lower || w[0].toLowerCase() !== lower[0] || !isReadable(w, word)) return;
      out.add(words.map((x, i) => (i === idx ? cap(w.toLowerCase()) : x)).join(" "));
    };
    // Double an inner consonant, or the final vowel (Ektaa, Triptii). Never the first or last consonant.
    for (let i = 1; i < lower.length; i++) {
      const isV = /[aeiouy]/.test(lower[i]);
      if (isV ? i === lower.length - 1 : i < lower.length - 1) put(lower.slice(0, i + 1) + lower[i] + lower.slice(i + 1));
    }
    // Long-vowel spellings common in Indian names, one position at a time: a→aa (Sonaar), i→ee (Veena), u→oo (Roop).
    const longer: Record<string, string> = { a: "aa", i: "ee", u: "oo" };
    for (let i = 1; i < lower.length - 1; i++) {
      const prev = lower[i - 1];
      if (longer[lower[i]] && !/[aeiouy]/.test(prev)) put(lower.slice(0, i) + longer[lower[i]] + lower.slice(i + 1));
    }
    for (let i = 1; i < lower.length; i++) if (lower[i] === lower[i - 1]) put(lower.slice(0, i) + lower.slice(i + 1)); // undouble
    const swaps: [RegExp, string][] = [
      [/k/g, "c"], [/c/g, "k"], [/i$/g, "y"], [/y$/g, "i"], [/s/g, "z"], [/z/g, "s"], [/ph/g, "f"], [/f/g, "ph"],
      [/ee/g, "i"], [/i$/g, "ee"], [/ii/g, "i"], [/aa/g, "a"], [/uu|oo/g, "u"], [/u/g, "oo"], [/ai/g, "ay"], [/ay$/g, "ai"],
    ];
    for (const [re, rep] of swaps) put(lower.replace(re, rep));
  });
  return Array.from(out);
}

/**
 * Ranked spelling recommendations for the name exactly as submitted.
 *
 * Every candidate is run through the same calculators as the report. Ranking rules, in order:
 *   1. More matches with the Birth Number or Life Path (Chaldean name number or Destiny number equal to it).
 *   2. A spelling that sounds the same as the original comes before one that may sound different.
 *   3. Fewer letters changed.
 *   4. Alphabetical, so the order is always the same for the same input.
 * Spellings that sound alike AND give the same numbers are treated as duplicates and only the smallest change is kept.
 * If nothing reaches the Birth Number or Life Path, the closest readable alternatives are returned with anyMatch = false.
 */
export function recommendSpellings(name: string, birthNumber: number, lifePath: number, max = 8): Recommendations {
  const targets = [
    { label: "Birth Number", value: reduceNumber(birthNumber, false) },
    { label: "Life Path", value: reduceNumber(lifePath, false) },
  ];
  const hits = (n: SpellingNumbers) => {
    const found: string[] = [];
    for (const t of targets) {
      if (reduceNumber(n.chaldean, false) === t.value) found.push(`Its Chaldean name number is ${n.chaldean}, which matches your ${t.label} (${t.value}).`);
      if (reduceNumber(n.destiny, false) === t.value) found.push(`Its Destiny number is ${n.destiny}, which reduces to ${t.value} and matches your ${t.label}.`);
    }
    return found;
  };
  const base = numbersFor(name);
  const empty: Recommendations = { items: [], anyMatch: false, currentFits: false, birth: targets[0].value, lifePath: targets[1].value };
  if (!base) return empty;

  const all: SpellingSuggestion[] = [];
  for (const spelling of candidateSpellings(name)) {
    const numbers = numbersFor(spelling);
    if (!numbers) continue;
    all.push({ spelling, numbers, change: describeChange(name, spelling), reasons: hits(numbers), sameSound: comparePronunciation(name, spelling).same });
  }
  const size = (s: SpellingSuggestion) => s.change.added.length + s.change.removed.length;
  all.sort((x, y) => y.reasons.length - x.reasons.length || Number(y.sameSound) - Number(x.sameSound) || size(x) - size(y) || x.spelling.localeCompare(y.spelling));

  const seen = new Set<string>();
  const items: SpellingSuggestion[] = [];
  for (const s of all) {
    const key = `${s.spelling.split(" ").map(soundKey).join(" ")}|${s.numbers.chaldean}|${s.numbers.destiny}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(s);
    if (items.length === max) break;
  }
  return { ...empty, items, anyMatch: items.some((s) => s.reasons.length > 0), currentFits: hits(base).length > 0 };
}
