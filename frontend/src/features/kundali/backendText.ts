/**
 * Display translation for sentences WRITTEN BY THE BACKEND (Guna Milan / Mangal / Panchang). The backend returns fixed English
 * sentences, some with numbers and names filled in. Nothing here changes a calculation: each exact sentence (or fixed template) is
 * mapped to a dictionary key; the extracted numbers and names are re-rendered through that key. A sentence that is not recognised
 * is returned unchanged (English), which is the safe fallback.
 *
 * Keys live under gunaText.* and panchangText.*. The English dictionary holds the exact English sentence, so English output is
 * identical to what the backend sent.
 */
import type { TFunction } from "i18next";

export type GlossKind = "rashi" | "planet" | "nakshatra" | "tithi" | "paksha" | "weekday" | "yoga" | "karana" | "masa";
/** A value to substitute into a template: plain, or a name that is shown through the glossary / a name key. */
export type Val = string | number | { k: GlossKind | "own" | "plabel" | "tithiNum" | "ord"; v: string };
export type Gloss = (kind: GlossKind, name: string, fallback?: string) => string;
export interface Match { key: string; values: Record<string, Val> }

// ---- Fixed sentences: key -> exact English text.
export const STATIC_TEXT: Record<string, string> = {
  // Koota notes
  "gunaText.note.varnaHigher": "First person's class is equal to or higher than the second's.",
  "gunaText.note.varnaLower": "First person's class is lower than the second's.",
  "gunaText.note.vashya": "Group of each Moon sign and how well the two groups influence each other.",
  "gunaText.note.yoniSame": "Same animal symbol.",
  "gunaText.note.yoniEnemy": "Natural enemy animals.",
  "gunaText.note.grahaMaitri": "Friendship between the rulers of the two Moon signs.",
  "gunaText.note.gana": "Temperament type of each Nakshatra.",
  "gunaText.note.bhakoot2and12": "Moon signs are 2 and 12 signs apart (Bhakoot Dosha).",
  "gunaText.note.bhakoot5and9": "Moon signs are 5 and 9 signs apart (Bhakoot Dosha).",
  "gunaText.note.bhakoot6and8": "Moon signs are 6 and 8 signs apart (Bhakoot Dosha).",
  "gunaText.note.bhakootOk": "Moon signs are in a favourable position to each other.",
  "gunaText.note.nadiSame": "Both share the same Nadi (Nadi Dosha).",
  "gunaText.note.nadiDiffer": "The two Nadis differ.",
  // Dosha notes
  "gunaText.dosha.nadiAbsent": "Not present: the two Nadis differ.",
  "gunaText.dosha.nadiCancelled": "Present but a classical exception applies (same Nakshatra with different padas, or same Moon sign with different Nakshatras).",
  "gunaText.dosha.nadiPresent": "Present: both have the same Nadi and no common exception was found. Traditionally families consult an astrologer about this.",
  "gunaText.dosha.bhakootAbsent": "Not present.",
  "gunaText.dosha.bhakootCancelled": "Present but the Moon-sign lords are the same or mutual friends, a classical cancellation.",
  "gunaText.dosha.bhakootPresent": "Present: the Moon signs are in an unfavourable position and the lords are not mutual friends.",
  // Bands
  "gunaText.band.below": "Below the usual 18-point minimum",
  "gunaText.band.acceptable": "Acceptable (18 to 24)",
  "gunaText.band.good": "Good (25 to 31)",
  "gunaText.band.veryGood": "Very good (32 to 36)",
  // Method
  "gunaText.method.0": "Scored from each person's Moon sign and Nakshatra using the standard Parashari (North Indian) Ashtakoota tables.",
  "gunaText.method.1": "Varna, Vashya, Tara, Gana and Graha Maitri depend on who is counted first, so the pair is ordered groom first when genders are given as male and female, otherwise in the order entered.",
  "gunaText.method.2": "Yoni uses the full 14-by-14 animal grid (0 to 4 points).",
  "gunaText.method.3": "Tara gives 1.5 points for each direction whose count (remainder after dividing by 9) is not 3, 5 or 7, the classical Vipat, Pratyak and Vadha taras.",
  "gunaText.method.4": "Varna uses the common element rule: water signs Brahmin, fire Kshatriya, earth Vaishya, air Shudra. Some software swaps Vaishya and Shudra.",
  "gunaText.method.5": "Vashya and Gana have more than one published table. This calculation uses one widely published Vashya grid and gives Gana 6 when the first person is Deva and the second Manushya (5 the other way round); other sources reverse that pair.",
  "gunaText.method.6": "Because published tables differ, this score can differ from other Guna Milan calculators. It is a Bhagya calculation and is not claimed to match any particular calculator.",
  "gunaText.method.7": "Sagittarius and Capricorn Vashya groups are split at 15 degrees of the sign.",
  "gunaText.method.8": "Dosha cancellations shown are the commonly cited classical ones; a family astrologer may apply more.",
  // Mangal
  "gunaText.mangal.notCalculated": "Not calculated.",
  "gunaText.mangal.verdictBoth": "Both charts show Mangal Dosha. Tradition commonly treats this as balancing out.",
  "gunaText.mangal.verdictOne": "Only one chart shows Mangal Dosha. Tradition suggests consulting an astrologer about remedies and exceptions.",
  "gunaText.mangal.verdictNone": "Neither chart shows Mangal Dosha.",
  // Panchang sentences (kundali panchang, birth panchang, today)
  "panchangText.uncertain.pada": "Nakshatra pada changes during this date; the exact pada needs your birth time.",
  "panchangText.uncertain.month": "The Hindu month or Vikram Samvat year changes during this date.",
  "panchangText.note.sunrise": "Birth time is unknown, so the Panchang is reckoned at local sunrise on your birth date (the traditional udaya reckoning).",
  "panchangText.note.noon": "Birth time is unknown and no sunrise could be calculated at this latitude, so local noon was used.",
  "panchangText.note.varaFromSunrise": "Reckoned from sunrise on the birth date. A birth before sunrise would belong to the previous weekday.",
  "panchangText.note.birthChanging": "No birth time was given, so values are for local sunrise. Those marked \"at sunrise\" change during your birth date, so add your birth time for exact ones.",
  "panchangText.note.birthSunriseOnly": "No birth time was given, so the values are for local sunrise on your birth date.",
  "panchangText.note.noFestivals": "Festivals and observances are not calculated here, so none are shown.",
  "panchangText.convention.label": "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal",
  "panchangText.convention.note": "Months run new moon to new moon and the year begins at Chaitra Shukla Pratipada (the Drik / Maharashtra-South convention). The Purnimanta month name is shown beside it.",
  "panchangText.block.birthTitle": "Your birth Panchang",
  "panchangText.block.todayTitle": "Today's Panchang",
  "panchangText.fact.shukla": "Shukla (bright half)",
  "panchangText.fact.krishna": "Krishna (dark half)",
  "panchangText.error.months": "Could not locate lunar months for that year.",
  "panchangText.error.anchor": "Could not anchor the Vikram Samvat year.",
  "panchangText.error.place": "Could not place that instant in a lunar month.",
  "panchangText.error.tithi": "Could not compute the tithi boundaries.",
  "panchangText.error.timezone": "Unrecognised time zone for the selected birthplace.",
};

// ---- Templates: a regex over the exact English, the key, its English template, and how to read the values out.
interface Template { key: string; en: string; re: RegExp; vals: (m: RegExpExecArray) => Record<string, Val> }
const own = (v: string): Val => ({ k: "own", v });
const FAV = "(favourable|unfavourable)";
const UNC_LABELS = "Tithi|Nakshatra|Moon Rashi|Yoga|Karana";
const HALF_B = "bright half \\(Shukla Paksha\\), when the Moon grows bigger each night";
const HALF_D = "dark half \\(Krishna Paksha\\), when the Moon grows smaller each night";
const uncertainValue = (label: string, x: string): Val => {
  if (label === "Tithi") return { k: "tithiNum", v: x };
  const kind: GlossKind = label === "Nakshatra" ? "nakshatra" : label === "Moon Rashi" ? "rashi" : label === "Yoga" ? "yoga" : "karana";
  return { k: kind, v: x };
};

export const TEMPLATES: Template[] = [
  {
    key: "gunaText.note.tara",
    en: "Counting from the first person's star the relation is {{first}}; from the second's it is {{second}}.",
    re: new RegExp(`^Counting from the first person's star the relation is ${FAV}; from the second's it is ${FAV}\\.$`),
    vals: (m) => ({ first: own(m[1]), second: own(m[2]) }),
  },
  {
    key: "gunaText.note.yoniDifferent",
    en: "Different animal symbols ({{score}} of 4 in the traditional grid).",
    re: /^Different animal symbols \((\d+(?:\.\d+)?) of 4 in the traditional grid\)\.$/,
    vals: (m) => ({ score: m[1] }),
  },
  {
    key: "gunaText.cell.lord",
    en: "{{planet}} (lord of {{sign}})",
    re: /^(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn) \(lord of ([A-Za-z]+)\)$/,
    vals: (m) => ({ planet: { k: "planet", v: m[1] }, sign: { k: "rashi", v: m[2] } }),
  },
  {
    key: "gunaText.mangal.inHouse",
    en: "Mars is in house {{house}} from the Lagna, one of the houses (1, 2, 4, 7, 8, 12) that tradition calls Mangal Dosha.",
    re: /^Mars is in house (\d+) from the Lagna, one of the houses \(1, 2, 4, 7, 8, 12\) that tradition calls Mangal Dosha\.$/,
    vals: (m) => ({ house: m[1] }),
  },
  {
    key: "gunaText.mangal.notInHouse",
    en: "Mars is in house {{house}} from the Lagna, which is not one of the Mangal Dosha houses (1, 2, 4, 7, 8, 12).",
    re: /^Mars is in house (\d+) from the Lagna, which is not one of the Mangal Dosha houses \(1, 2, 4, 7, 8, 12\)\.$/,
    vals: (m) => ({ house: m[1] }),
  },
  {
    key: "gunaText.error.needsBirthTime",
    en: "Ashtakoota needs the exact birth time of both people. The {{who}} person's birth time is missing, so no Guna score was calculated.",
    re: /^Ashtakoota needs the exact birth time of both people\. The (first|second) person's birth time is missing, so no Guna score was calculated\.$/,
    vals: (m) => ({ who: own(m[1]) }),
  },
  {
    key: "panchangText.uncertain.changes",
    en: "{{label}} changes during this date ({{from}} to {{to}}); the exact value needs your birth time.",
    re: new RegExp(`^(${UNC_LABELS}) changes during this date \\((.+?) to (.+)\\); the exact value needs your birth time\\.$`),
    vals: (m) => ({ label: { k: "plabel", v: m[1] }, from: uncertainValue(m[1], m[2]), to: uncertainValue(m[1], m[3]) }),
  },
  {
    key: "panchangText.note.varaBeforeSunrise",
    en: "Born before local sunrise ({{time}}), so the Vedic weekday is {{vedic}}, not {{civil}}.",
    re: /^Born before local sunrise \((\d{2}:\d{2})\), so the Vedic weekday is (\w+), not (\w+)\.$/,
    vals: (m) => ({ time: m[1], vedic: { k: "weekday", v: m[2] }, civil: { k: "weekday", v: m[3] } }),
  },
  {
    key: "panchangText.note.birthBeforeSunrise",
    en: "Born before sunrise ({{time}}), so the Vedic weekday is {{vedic}}.",
    re: /^Born before sunrise \((\d{2}:\d{2})\), so the Vedic weekday is (\w+)\.$/,
    vals: (m) => ({ time: m[1], vedic: { k: "weekday", v: m[2] } }),
  },
  {
    key: "panchangText.block.birthSummary",
    en: "{{lead}} the {{half}}. {{tithi}} is the {{ord}} day of that half.",
    re: new RegExp(`^(You were born in|At sunrise on your birth date it was) the (${HALF_B}|${HALF_D})\\. (.+) is the (\\d+(?:st|nd|rd|th)) day of that half\\.$`),
    vals: (m) => ({ lead: { k: "own", v: m[1] }, half: { k: "own", v: m[2] }, tithi: { k: "tithi", v: m[3] }, ord: { k: "ord", v: m[4] } }),
  },
  {
    key: "panchangText.block.todaySummary",
    en: "Today is {{vara}}: {{tithi}}, the {{ord}} day of the {{half}} half.",
    re: /^Today is (\w+): (.+), the (\d+(?:st|nd|rd|th)) day of the (bright|dark) half\.$/,
    vals: (m) => ({ vara: { k: "weekday", v: m[1] }, tithi: { k: "tithi", v: m[2] }, ord: { k: "ord", v: m[3] }, half: { k: "own", v: m[4] } }),
  },
  {
    key: "panchangText.block.reckonedAt",
    en: "{{date}} at {{time}}, {{place}}",
    re: /^(\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2}), (.+)$/,
    vals: (m) => ({ date: m[1], time: m[2], place: m[3] }),
  },
  {
    key: "panchangText.block.reckonedSunrise",
    en: "Sunrise on {{date}}, {{place}}",
    re: /^Sunrise on (\d{4}-\d{2}-\d{2}), (.+)$/,
    vals: (m) => ({ date: m[1], place: m[2] }),
  },
  {
    key: "panchangText.fact.atSunrise",
    en: "{{label}} (at sunrise)",
    re: /^(Tithi|Paksha|Nakshatra|Yoga) \(at sunrise\)$/,
    vals: (m) => ({ label: { k: "plabel", v: m[1] } }),
  },
  {
    key: "panchangText.fact.nakshatraPada",
    en: "{{name}}, pada {{pada}}",
    re: /^(.+), pada (\d)$/,
    vals: (m) => ({ name: { k: "nakshatra", v: m[1] }, pada: m[2] }),
  },
  {
    key: "panchangText.fact.adhika",
    en: "Adhika {{name}}",
    re: /^Adhika (.+)$/,
    vals: (m) => ({ name: { k: "masa", v: m[1] } }),
  },
];

/** Own names the templates and cells use (English -> key suffix is the name itself). */
export const OWN_NAMES: string[] = [
  "Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi", "Nadi Dosha", "Bhakoot Dosha",
  "Brahmin", "Kshatriya", "Vaishya", "Shudra",
  "Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta",
  "Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion",
  "Deva", "Manushya", "Rakshasa", "Adi", "Madhya", "Antya",
  "favourable", "unfavourable", "first", "second", "bright", "dark",
];
export const PANCHANG_LABELS = ["Tithi", "Nakshatra", "Moon Rashi", "Yoga", "Karana", "Paksha", "Day", "Hindu month", "Vedic weekday"];
export const ORDINALS: Record<string, string> = { st: "{{n}}st", nd: "{{n}}nd", rd: "{{n}}rd", th: "{{n}}th" };
export const OWN_PHRASE_KEYS: Record<string, string> = {
  "You were born in": "panchangText.lead.born",
  "At sunrise on your birth date it was": "panchangText.lead.sunrise",
  "bright half (Shukla Paksha), when the Moon grows bigger each night": "panchangText.half.bright",
  "dark half (Krishna Paksha), when the Moon grows smaller each night": "panchangText.half.dark",
};

const STATIC_BY_TEXT = new Map<string, string>(Object.entries(STATIC_TEXT).map(([k, v]) => [v, k]));

/** Which key (and values) an exact backend sentence maps to, or null when it is not a known sentence. */
export function matchBackend(text: string): Match | null {
  const s = STATIC_BY_TEXT.get(text);
  if (s) return { key: s, values: {} };
  for (const tpl of TEMPLATES) {
    const m = tpl.re.exec(text);
    if (m) return { key: tpl.key, values: tpl.vals(m) };
  }
  return null;
}

const ENGLISH_BY_KEY: Record<string, string> = {
  ...STATIC_TEXT,
  ...Object.fromEntries(TEMPLATES.map((x) => [x.key, x.en])),
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const resolveVal = (t: TFunction, g: Gloss, v: Val): string | number => {
  if (typeof v !== "object") return v;
  switch (v.k) {
    case "own": {
      const phrase = OWN_PHRASE_KEYS[v.v];
      return phrase ? t(phrase, { defaultValue: v.v }) : t(`gunaText.name.${v.v}`, { defaultValue: v.v });
    }
    case "plabel":
      return t(`panchangText.label.${v.v}`, { defaultValue: v.v });
    case "ord": {
      const m = /^(\d+)(st|nd|rd|th)$/.exec(v.v);
      return m ? t(`panchangText.ordinal.${m[2]}`, { n: m[1], defaultValue: ORDINALS[m[2]] }) : v.v;
    }
    case "tithiNum": {
      // The engine reports "shukla 5": keep the English text when the language has no name for the paksha.
      const m = /^(shukla|krishna) (\d+)$/.exec(v.v);
      if (!m) return v.v;
      const name = cap(m[1]);
      const shown = g("paksha", name);
      return `${shown === name ? m[1] : shown} ${m[2]}`;
    }
    default:
      return g(v.k, v.v);
  }
};

/** Shows a backend sentence in the chosen language. Unknown text is returned unchanged. */
export function tb(t: TFunction, g: Gloss, text: string): string {
  if (!text) return text;
  const m = matchBackend(text);
  if (!m) return text;
  const values: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(m.values)) values[k] = resolveVal(t, g, v);
  return t(m.key, { defaultValue: ENGLISH_BY_KEY[m.key], ...values }) as string;
}

/** A name used by the Guna table (koota, class, group, animal, gana, nadi, dosha). Unknown names stay English. */
export function tbName(t: TFunction, name: string): string {
  return OWN_NAMES.includes(name) ? (t(`gunaText.name.${name}`, { defaultValue: name }) as string) : name;
}

const CELL_KIND: Record<string, GlossKind | "own" | null> = {
  Varna: "own", Vashya: "own", Tara: "nakshatra", Yoni: "own", "Graha Maitri": null, Gana: "own", Bhakoot: "rashi", Nadi: "own",
};
/** The two partner cells of a Koota row (a / b): Moon sign, Nakshatra, class, animal, lord template and so on. */
export function tbCell(t: TFunction, g: Gloss, koota: string, text: string): string {
  const kind = CELL_KIND[koota];
  if (kind === "own") return tbName(t, text);
  if (kind) return g(kind, text);
  return tb(t, g, text);
}

/** The label of a Panchang fact (birth / today block). */
export function tbFactLabel(t: TFunction, g: Gloss, label: string): string {
  if (PANCHANG_LABELS.includes(label)) return t(`panchangText.label.${label}`, { defaultValue: label }) as string;
  return tb(t, g, label);
}

/** The value of a Panchang fact, chosen by its (English) label. */
export function tbFactValue(t: TFunction, g: Gloss, label: string, value: string): string {
  const base = label.replace(/ \(at sunrise\)$/, "");
  const special = tb(t, g, value);
  if (special !== value) return special;
  const kind: Record<string, GlossKind> = {
    Tithi: "tithi", Nakshatra: "nakshatra", Yoga: "yoga", Karana: "karana", "Hindu month": "masa", Day: "weekday", "Vedic weekday": "weekday",
  };
  return kind[base] ? g(kind[base], value) : value;
}

/** All English keys this module relies on, nested, ready to merge into the English dictionary. */
export function backendEnglishKeys(): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const put = (key: string, value: string) => {
    const parts = key.split(".");
    let cur = root;
    for (const p of parts.slice(0, -1)) cur = (cur[p] ??= {}) as Record<string, unknown>;
    cur[parts[parts.length - 1]] = value;
  };
  for (const [k, v] of Object.entries(ENGLISH_BY_KEY)) put(k, v);
  for (const n of OWN_NAMES) put(`gunaText.name.${n}`, n);
  for (const [text, key] of Object.entries(OWN_PHRASE_KEYS)) put(key, text);
  for (const l of PANCHANG_LABELS) put(`panchangText.label.${l}`, l);
  for (const [k, v] of Object.entries(ORDINALS)) put(`panchangText.ordinal.${k}`, v);
  return root;
}
