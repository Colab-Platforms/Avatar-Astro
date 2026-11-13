/**
 * The Mantras & Chants page lists these ten mantras and eleven categories. Only the names, categories and the words used to find
 * each mantra's uploaded record live here; audio, lyrics, meaning and cover art always come from the Devotion Library records the
 * admin uploaded. Nothing here supplies audio or text for a mantra, so a mantra with no upload shows "Audio coming soon".
 */
export const MANTRA_CATEGORIES = ["vedic", "shiva", "ganesha", "krishna", "hanuman", "devi", "morning", "meditation", "aarti", "stotras", "chalisa"] as const;
export type MantraCategory = (typeof MANTRA_CATEGORIES)[number];

/** English labels, used only when a translation is missing. */
export const CATEGORY_LABEL: Record<MantraCategory, string> = {
  vedic: "Vedic Mantras", shiva: "Shiva Mantras", ganesha: "Ganesha Mantras", krishna: "Krishna Mantras", hanuman: "Hanuman Mantras", devi: "Devi Mantras",
  morning: "Morning Prayers", meditation: "Meditation Chants", aarti: "Aarti", stotras: "Stotras", chalisa: "Chalisa",
};

export interface CatalogMantra {
  id: string;
  name: string;
  categories: MantraCategory[];
  /** Lower-case letters only: a record whose title contains one of these is this mantra's upload. */
  match: string[];
}

export const MANTRA_CATALOG: CatalogMantra[] = [
  { id: "gayatri", name: "Gayatri Mantra", categories: ["vedic", "morning", "meditation"], match: ["gayatri"] },
  { id: "mahamrityunjaya", name: "Maha Mrityunjaya Mantra", categories: ["vedic", "shiva", "meditation"], match: ["mrityunjaya", "mrityunjay", "mahamrityunjaya"] },
  { id: "omnamahshivaya", name: "Om Namah Shivaya", categories: ["shiva", "meditation"], match: ["namahshivaya", "namashivaya", "panchakshari"] },
  { id: "harekrishna", name: "Hare Krishna Mahamantra", categories: ["krishna", "meditation"], match: ["harekrishna", "krishnamahamantra"] },
  { id: "gamganapataye", name: "Om Gam Ganapataye Namah", categories: ["ganesha", "morning"], match: ["ganapataye", "ganpataye"] },
  { id: "hanuman", name: "Hanuman Mantra", categories: ["hanuman"], match: ["hanuman"] },
  { id: "mahalakshmi", name: "Mahalakshmi Mantra", categories: ["devi"], match: ["mahalakshmi", "mahalaxmi"] },
  { id: "saraswati", name: "Saraswati Vandana", categories: ["devi", "morning", "stotras"], match: ["saraswati", "sarasvati"] },
  { id: "vishnu", name: "Vishnu Mantra", categories: ["meditation", "stotras"], match: ["vishnumantra", "namonarayanaya", "namonarayan"] },
  { id: "shriramjairam", name: "Shri Ram Jai Ram", categories: ["meditation"], match: ["shriramjairam", "ramjairam", "jairam", "jayram"] },
];

export const normaliseTitle = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, "");
/** A title that names a different kind of text is never taken for one of the ten mantras (a "Hanuman Chalisa" is not the Hanuman Mantra). */
const OTHER_KIND = /aarti|arti|chalisa|stotra|sahasranam/;

export interface RecordLike { id: string; title: string; category: string; audioUrl: string | null }

/** Pairs each catalog mantra with its uploaded record (preferring one that has audio) and returns the records that match none. */
export function matchRecords<R extends RecordLike>(records: R[]): { matched: Map<string, R>; extras: R[] } {
  const matched = new Map<string, R>();
  const used = new Set<string>();
  for (const c of MANTRA_CATALOG) {
    const candidates = records.filter((r) => {
      const n = normaliseTitle(r.title);
      return !used.has(r.id) && !OTHER_KIND.test(n) && c.match.some((m) => n.includes(m));
    });
    const pick = candidates.find((r) => r.audioUrl) ?? candidates[0];
    if (pick) { matched.set(c.id, pick); used.add(pick.id); }
  }
  return { matched, extras: records.filter((r) => !used.has(r.id)) };
}

/** Which of the eleven categories an uploaded record outside the ten belongs to, from its own category and title. */
export function categoryOfRecord(r: Pick<RecordLike, "title" | "category">): MantraCategory | null {
  const t = normaliseTitle(`${r.category} ${r.title}`);
  const rules: [RegExp, MantraCategory][] = [
    [/chalisa/, "chalisa"], [/aarti|arti/, "aarti"], [/stotra|stotram|sahasranam/, "stotras"], [/vedic|veda/, "vedic"], [/shiva|shiv/, "shiva"],
    [/ganesh|ganapati|ganpati/, "ganesha"], [/krishna/, "krishna"], [/hanuman/, "hanuman"], [/devi|durga|lakshmi|laxmi|saraswati|kali/, "devi"],
    [/morning|prayer/, "morning"], [/meditation|chant|jaap|japa/, "meditation"],
  ];
  return rules.find(([re]) => re.test(t))?.[1] ?? null;
}
