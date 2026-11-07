/**
 * Traditional naming syllables (Namakarana akshara) for each Nakshatra and Pada.
 *
 * One entry per pada, 27 x 4 = 108. The principal table follows the "Complete Nakshatra Syllable Table" published by
 * DekhoPanchang (attributed there to Muhurta Chintamani, Namakarana), cross-checked pada by pada against the
 * lists published by Vedic Marga, Vedic Birth, Vedadhara and Astromedha. Where those sources genuinely disagree, the most
 * widely published syllable is the principal one and the others are kept in `alternates` with a note, so nothing is hidden:
 *   - Ardra pada 4: Chha (most lists); Jha and Na appear in others.
 *   - Shravana: Khi, Khu, Khe, Kho (most lists); Ju, Je, Jo, Gha in the Muhurta Chintamani list quoted by DekhoPanchang.
 * Regional traditions (especially South Indian) can differ; a family priest has the final say. Keys are the Nakshatra
 * names exactly as the Panchang engine returns them (backend analysis.ts NAKSHATRAS).
 *
 * Needs expert review before launch: see the note in the project report.
 */
import { leadingSound, type Sound } from "./devanagari";

export interface Syllable {
  /** English transliteration, e.g. "Chu". */
  roman: string;
  /** Devanagari akshara, e.g. "चू". */
  deva: string;
  /** The opening sound, derived from `deva`, used to match names. */
  sound: Sound;
}

export interface PadaSyllable {
  syllable: Syllable;
  alternates: Syllable[];
  /** Plain-language note shown when traditions differ for this pada. */
  note?: string;
}

const syl = (roman: string, deva: string): Syllable => {
  const sound = leadingSound(deva);
  if (!sound) throw new Error(`Syllable ${roman} has no single opening sound`);
  return { roman, deva, sound };
};

type Cell = [string, string];
const pada = (c: Cell, alt: Cell[] = [], note?: string): PadaSyllable => ({ syllable: syl(c[0], c[1]), alternates: alt.map((a) => syl(a[0], a[1])), note });

const row = (a: Cell, b: Cell, c: Cell, d: Cell): PadaSyllable[] => [pada(a), pada(b), pada(c), pada(d)];

export const NAKSHATRA_SYLLABLES: Record<string, PadaSyllable[]> = {
  Ashwini: row(["Chu", "चू"], ["Che", "चे"], ["Cho", "चो"], ["La", "ला"]),
  Bharani: row(["Li", "ली"], ["Lu", "लू"], ["Le", "ले"], ["Lo", "लो"]),
  Krittika: row(["A", "अ"], ["I", "इ"], ["U", "उ"], ["E", "ए"]),
  Rohini: row(["O", "ओ"], ["Va", "वा"], ["Vi", "वी"], ["Vu", "वू"]),
  Mrigashira: row(["Ve", "वे"], ["Vo", "वो"], ["Ka", "का"], ["Ki", "की"]),
  Ardra: [
    pada(["Ku", "कू"]),
    pada(["Gha", "घ"]),
    pada(["Ng", "ङ"]),
    pada(["Chha", "छ"], [["Jha", "झ"], ["Na", "ञ"]], "Traditions differ for this pada. Chha is the most widely published; some lists give Jha or Na."),
  ],
  Punarvasu: row(["Ke", "के"], ["Ko", "को"], ["Ha", "हा"], ["Hi", "ही"]),
  Pushya: row(["Hu", "हू"], ["He", "हे"], ["Ho", "हो"], ["Da", "डा"]),
  Ashlesha: row(["Di", "डी"], ["Du", "डू"], ["De", "डे"], ["Do", "डो"]),
  Magha: row(["Ma", "मा"], ["Mi", "मी"], ["Mu", "मू"], ["Me", "मे"]),
  "Purva Phalguni": row(["Mo", "मो"], ["Ta", "टा"], ["Ti", "टी"], ["Tu", "टू"]),
  "Uttara Phalguni": row(["Te", "टे"], ["To", "टो"], ["Pa", "पा"], ["Pi", "पी"]),
  Hasta: row(["Pu", "पू"], ["Sha", "ष"], ["Na", "ण"], ["Tha", "ठ"]),
  Chitra: row(["Pe", "पे"], ["Po", "पो"], ["Ra", "रा"], ["Ri", "री"]),
  Swati: row(["Ru", "रू"], ["Re", "रे"], ["Ro", "रो"], ["Ta", "ता"]),
  Vishakha: row(["Ti", "ती"], ["Tu", "तू"], ["Te", "ते"], ["To", "तो"]),
  Anuradha: row(["Na", "ना"], ["Ni", "नी"], ["Nu", "नू"], ["Ne", "ने"]),
  Jyeshtha: row(["No", "नो"], ["Ya", "या"], ["Yi", "यी"], ["Yu", "यू"]),
  Mula: row(["Ye", "ये"], ["Yo", "यो"], ["Bha", "भा"], ["Bhi", "भी"]),
  "Purva Ashadha": row(["Bhu", "भू"], ["Dha", "धा"], ["Pha", "फा"], ["Dha", "ढा"]),
  "Uttara Ashadha": row(["Bhe", "भे"], ["Bho", "भो"], ["Ja", "जा"], ["Ji", "जी"]),
  Shravana: [
    pada(["Khi", "खी"], [["Ju", "जू"]], "Traditions differ for Shravana. Khi, Khu, Khe, Kho are the most widely published; the Muhurta Chintamani list quoted by DekhoPanchang gives Ju, Je, Jo, Gha."),
    pada(["Khu", "खू"], [["Je", "जे"]], "Traditions differ for Shravana. Khi, Khu, Khe, Kho are the most widely published; the Muhurta Chintamani list quoted by DekhoPanchang gives Ju, Je, Jo, Gha."),
    pada(["Khe", "खे"], [["Jo", "जो"]], "Traditions differ for Shravana. Khi, Khu, Khe, Kho are the most widely published; the Muhurta Chintamani list quoted by DekhoPanchang gives Ju, Je, Jo, Gha."),
    pada(["Kho", "खो"], [["Gha", "घ"]], "Traditions differ for Shravana. Khi, Khu, Khe, Kho are the most widely published; the Muhurta Chintamani list quoted by DekhoPanchang gives Ju, Je, Jo, Gha."),
  ],
  Dhanishta: row(["Ga", "गा"], ["Gi", "गी"], ["Gu", "गू"], ["Ge", "गे"]),
  Shatabhisha: row(["Go", "गो"], ["Sa", "सा"], ["Si", "सी"], ["Su", "सू"]),
  "Purva Bhadrapada": row(["Se", "से"], ["So", "सो"], ["Da", "दा"], ["Di", "दी"]),
  "Uttara Bhadrapada": row(["Du", "दू"], ["Tha", "थ"], ["Jha", "झ"], ["Na", "ञ"]),
  Revati: row(["De", "दे"], ["Do", "दो"], ["Cha", "चा"], ["Chi", "ची"]),
};

export const NAKSHATRA_NAMES = Object.keys(NAKSHATRA_SYLLABLES);

/** The principal syllable and any alternates for a Nakshatra and pada (1-4), or null if the pair is not in the table. */
export function syllableFor(nakshatra: string, padaNumber: number): PadaSyllable | null {
  const rows = NAKSHATRA_SYLLABLES[nakshatra];
  if (!rows || !Number.isInteger(padaNumber) || padaNumber < 1 || padaNumber > 4) return null;
  return rows[padaNumber - 1];
}
