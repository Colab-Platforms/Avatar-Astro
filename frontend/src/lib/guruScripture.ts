import { SHLOKAS } from "@/data/shlokaCatalog";
import { calendarFacts, type TodayCalendar } from "@/lib/karmaCalendar";

/**
 * What Divya Margdarshak is allowed to quote.
 *
 * Verses come ONLY from the project's curated catalog (`shlokaCatalog.ts`), where the text, translation and
 * reference of each verse are stored together, so a verse is never recalled from a model's memory.
 * Stories come from a short fixed list of well-known Bhagavata Purana stories, retold in a few plain
 * sentences with no verse or canto numbers. The model may use only what is handed to it here, and a reply
 * that cites a chapter or verse that was not handed over is refused (see `findUnverifiedReferences`).
 */

export interface VerifiedVerse {
  id: string;
  /** The reference exactly as stored, e.g. "Chapter 2, Verse 47". */
  reference: string;
  /** "chapter.verse", used to check what a reply cites. */
  key: string;
  meaning: string;
  context: string;
  themes: string[];
}

const toKey = (reference: string): string => {
  const m = /chapter\s*(\d+)\D+verse\s*(\d+)/i.exec(reference);
  return m ? `${m[1]}.${m[2]}` : "";
};

/** The Bhagavad Gita verses from the curated catalog. */
export const GITA_VERSES: VerifiedVerse[] = SHLOKAS.filter((s) => s.source === "Bhagavad Gita").map((s) => ({
  id: s.id, reference: s.reference, key: toKey(s.reference), meaning: s.meaning, context: s.context, themes: s.themes,
}));

export interface BhagavataStory {
  id: string;
  title: string;
  /** A short retelling in plain words. It carries no verse, canto or chapter numbers on purpose. */
  summary: string;
  lesson: string;
  /** Words in the user's message that make this story relevant. */
  cues: string[];
}

export const BHAGAVATA_STORIES: BhagavataStory[] = [
  {
    id: "prahlada", title: "Prahlada",
    summary: "Prahlada was a young boy who loved Lord Vishnu. His father, the king, did not like this and tried to stop him many times. Prahlada stayed calm, kept his faith, and was not afraid.",
    lesson: "Faith and calmness can give us courage, even when people around us do not agree.",
    cues: ["fear", "afraid", "scared", "faith", "trust", "bully", "pressure", "opposes", "against me", "courage", "brave"],
  },
  {
    id: "dhruva", title: "Dhruva",
    summary: "Dhruva was a small prince who felt ignored and wished to be close to his father. His mother told him to turn to God. He went to the forest and prayed with a firm mind, and he became known for his steady determination.",
    lesson: "A steady mind and patient effort can take a person very far, even from a hard start.",
    cues: ["determination", "goal", "dream", "giving up", "give up", "focus", "ignored", "neglected", "unloved", "patience", "ambition"],
  },
  {
    id: "sudama", title: "Sudama and Krishna",
    summary: "Sudama was a poor friend of Krishna from childhood. He visited Krishna with only a small gift of flattened rice. Krishna welcomed him with great love and happily accepted it. Sudama did not ask for anything.",
    lesson: "Love and a sincere heart matter more than how big a gift is.",
    cues: ["poor", "money", "friend", "friendship", "humble", "gift", "gratitude", "grateful", "simple", "sincere"],
  },
  {
    id: "gajendra", title: "Gajendra the elephant",
    summary: "Gajendra, a strong elephant, was caught by a crocodile and could not free himself. When his own strength was not enough, he prayed with a full heart, and Lord Vishnu came to help him.",
    lesson: "It is fine to ask for help when we cannot manage alone, and prayer can give us hope.",
    cues: ["helpless", "stuck", "trapped", "surrender", "pray", "prayer", "overwhelmed", "hopeless", "cannot cope", "can't cope", "addiction"],
  },
];

/** Lower-case words with a plural "s" removed, so "exams" and "exam", "results" and "result" match. */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)).join(" ");
const words = (s: string): string => ` ${norm(s)} `;
const hit = (text: string, cue: string): boolean => text.includes(` ${norm(cue)} `);

/** The best matching verified verses for what the user wrote (none when nothing fits: nothing is forced). */
export function matchVerses(question: string, limit = 1): VerifiedVerse[] {
  const q = words(question);
  return GITA_VERSES.map((v) => ({ v, score: v.themes.filter((t) => hit(q, t)).length }))
    .filter((x) => x.score > 0 && x.v.key)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.v);
}

/** At most one matching story. */
export function matchStory(question: string): BhagavataStory | null {
  const q = words(question);
  const scored = BHAGAVATA_STORIES.map((s) => ({ s, score: s.cues.filter((c) => hit(q, c)).length })).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.s ?? null;
}

/** True when the question is about the Hindu calendar, so the verified calendar is fetched. Not forced on other questions. */
export function wantsCalendar(question: string): boolean {
  return /\b(tithi|nakshatra|panchang|panchangam|paksha|yoga today|karana|ekadashi|amavasya|purnima|pournami|poornima|festival|muhurat|muhurta|auspicious|shubh|subh|aaj ka din|today'?s (date|day|calendar)|hindu calendar|hindu date|which day is today|what day is today)\b/i.test(question);
}

export interface Grounding {
  verses: VerifiedVerse[];
  story: BhagavataStory | null;
  /** Only set when the user asked about the calendar. */
  calendar: TodayCalendar | null;
  calendarAsked: boolean;
}

export function buildGrounding(question: string, calendar: TodayCalendar | null, calendarAsked = wantsCalendar(question)): Grounding {
  return { verses: matchVerses(question), story: matchStory(question), calendar: calendarAsked ? calendar : null, calendarAsked };
}

/** The references (as "chapter.verse") a reply may cite. */
export const allowedReferences = (g: Grounding): string[] => g.verses.map((v) => v.key);

/** The instruction block sent with the question: only verified material, and the rules for using it. */
export function groundingPrompt(g: Grounding): string {
  const parts: string[] = [];
  if (g.verses.length) {
    parts.push(
      `Verified Bhagavad Gita verse you may use (the reference and meaning are checked; do not change them):\n` +
        g.verses.map((v) => `- Bhagavad Gita, ${v.reference}: ${v.meaning} (${v.context})`).join("\n") +
        `\nIf you use it, say the reference exactly as written and explain it in simple words.`,
    );
  }
  if (g.story) {
    parts.push(
      `A well-known Bhagavata story you may retell in 2 or 3 simple sentences (do not add details, and do not give any verse or canto number):\n- ${g.story.title}: ${g.story.summary} Lesson: ${g.story.lesson}`,
    );
  }
  if (g.calendarAsked) {
    parts.push(
      g.calendar
        ? `The user asked about the Hindu calendar. Today's calendar was calculated by our calendar service for ${g.calendar.place}. Use only these facts and add no other calendar fact:\n${calendarFacts(g.calendar).map((f) => `- ${f.label}: ${f.value}`).join("\n")}\nFestivals and auspicious timings are NOT available: if asked, say you do not have them.`
        : `The user asked about the Hindu calendar, but the calendar service is not available right now. Say so honestly. Do not state any tithi, nakshatra, yoga, karana, festival or auspicious time.`,
    );
  } else {
    parts.push(`Do not mention any tithi, nakshatra, yoga, karana, festival or auspicious time: no verified calendar was provided.`);
  }
  parts.push(
    `Scripture rules: quote or give a chapter and verse ONLY for the verified verse above. If no verse is given, you may share a general idea from Hindu teaching in simple words, but do not give any chapter, verse or canto number and do not say "the Gita says". Never invent a verse, a story or a reference. Keep what scripture teaches separate from your own gentle suggestions.`,
  );
  return parts.join("\n\n");
}

const CONTEXT = /(gita|bhagavad|bhagwad|bhagavata|bhagwat|verse|shloka|sloka|chapter|adhyay|canto|skandha)/i;

/**
 * Chapter/verse numbers that a reply cites but that were not handed to it. A reply with any of these is refused,
 * so an invented or misremembered reference never reaches the user.
 */
export function findUnverifiedReferences(text: string, allowed: string[]): string[] {
  const ok = new Set(allowed);
  const okChapters = new Set(allowed.map((k) => k.split(".")[0]));
  const okVerses = new Set(allowed.map((k) => k.split(".")[1]));
  const bad: string[] = [];
  const judged: [number, number][] = []; // spans already judged as a full "Chapter M, Verse N"
  const inJudged = (i: number) => judged.some(([a, b]) => i >= a && i < b);

  for (const m of text.matchAll(/chapter\s*(\d{1,2})\s*[,;:\-–]?\s*(?:and\s*)?verse(?:s)?\s*(\d{1,3})/gi)) {
    judged.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    if (!ok.has(`${m[1]}.${m[2]}`)) bad.push(`Chapter ${m[1]}, Verse ${m[2]}`);
  }
  for (const m of text.matchAll(/(\d{1,2})\s*[.:]\s*(\d{1,3})\b/g)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    if (!inJudged(m.index ?? 0) && CONTEXT.test(before) && !ok.has(`${m[1]}.${m[2]}`)) bad.push(`${m[1]}.${m[2]}`);
  }
  for (const m of text.matchAll(/\b(?:chapter|adhyay|adhyaya)\s*(\d{1,2})\b(?!\s*[,;:\-–]?\s*(?:and\s*)?verse)/gi)) {
    if (!inJudged(m.index ?? 0) && !okChapters.has(m[1])) bad.push(`Chapter ${m[1]}`);
  }
  for (const m of text.matchAll(/\bverse(?:s)?\s*(\d{1,3})\b/gi)) {
    if (!inJudged(m.index ?? 0) && !okVerses.has(m[1])) bad.push(`Verse ${m[1]}`);
  }
  for (const m of text.matchAll(/\b(?:canto|skandha)\s*(\d{1,2})\b/gi)) bad.push(`Canto ${m[1]}`);
  return [...new Set(bad)];
}
