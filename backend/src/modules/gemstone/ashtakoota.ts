/**
 * Ashtakoota (Guna Milan) matching: 8 Kootas, 36 points.
 *
 * Pure calculation from each person's Moon sidereal longitude (so Moon Rashi + Nakshatra). Nothing is estimated:
 * the caller must supply an exact Moon longitude (birth time and place known). Tables are the standard North-Indian
 * (Parashari) ones. Partner "a" is the groom/first person and "b" the bride/second person for the directional Kootas.
 *
 * Kootas and maximum points: Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8 = 36.
 */
import { SIGNS, SIGN_LORD, type Planet, type Sign } from "./gemstone.catalogue.js";
import { NAKSHATRAS, nakshatraOf } from "./analysis.js";

export interface KootaScore {
  koota: string;
  max: number;
  score: number;
  a: string;
  b: string;
  note: string;
}

export interface MatchDosha {
  name: "Nadi Dosha" | "Bhakoot Dosha";
  present: boolean;
  cancelled: boolean;
  note: string;
}

export interface AshtakootaResult {
  total: number;
  max: 36;
  kootas: KootaScore[];
  doshas: MatchDosha[];
  /** Conventions used, so the result can show exactly how it was scored. */
  method: string[];
  band: "Below the usual 18-point minimum" | "Acceptable (18 to 24)" | "Good (25 to 31)" | "Very good (32 to 36)";
  moons: {
    a: { sign: Sign; nakshatra: string; pada: number };
    b: { sign: Sign; nakshatra: string; pada: number };
  };
}

const idx = (s: Sign) => SIGNS.indexOf(s);

// ---- Varna (1): Brahmin 4 > Kshatriya 3 > Vaishya 2 > Shudra 1, by Moon sign.
const VARNA: Record<Sign, number> = {
  Cancer: 4, Scorpio: 4, Pisces: 4,
  Aries: 3, Leo: 3, Sagittarius: 3,
  Taurus: 2, Virgo: 2, Capricorn: 2,
  Gemini: 1, Libra: 1, Aquarius: 1,
};
const VARNA_NAME = ["", "Shudra", "Vaishya", "Kshatriya", "Brahmin"];

// ---- Vashya (2): groups by Moon sign.
type Vashya = "Chatushpada" | "Manava" | "Jalachara" | "Vanachara" | "Keeta";
const VASHYA: Record<Sign, Vashya> = {
  Aries: "Chatushpada", Taurus: "Chatushpada", Gemini: "Manava", Cancer: "Jalachara", Leo: "Vanachara", Virgo: "Manava",
  Libra: "Manava", Scorpio: "Keeta", Sagittarius: "Manava", Capricorn: "Chatushpada", Aquarius: "Manava", Pisces: "Jalachara",
};
/** Sagittarius and Capricorn change group halfway through the sign (Dhanu: Manava then Chatushpada; Makara: Chatushpada then Jalachara). */
const vashyaOf = (sign: Sign, degreeInSign: number): Vashya =>
  sign === "Sagittarius" ? (degreeInSign < 15 ? "Manava" : "Chatushpada")
  : sign === "Capricorn" ? (degreeInSign < 15 ? "Chatushpada" : "Jalachara")
  : VASHYA[sign];
// VASHYA_TABLE[second person's group][first person's group] (standard table)
const VASHYA_ORDER: Vashya[] = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"];
const VASHYA_TABLE: number[][] = [
  [2, 1, 1, 1.5, 1],
  [1, 2, 1.5, 0, 1],
  [1, 1.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

// ---- Yoni (4): animal per Nakshatra (index 0..26) and enemy pairs.
const YONI = [
  "Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Sheep", "Cat", "Rat", "Rat", "Cow", "Buffalo", "Tiger",
  "Buffalo", "Tiger", "Deer", "Deer", "Dog", "Monkey", "Mongoose", "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant",
];
/** Full Yoni compatibility grid (0 worst to 4 same animal), rows and columns in this order. Symmetric. */
const YONI_ORDER = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
const YONI_GRID: number[][] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
const yoniScore = (x: string, y: string): number => YONI_GRID[YONI_ORDER.indexOf(x)][YONI_ORDER.indexOf(y)];

// ---- Graha Maitri (5): natural friendship between sign lords.
const FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"], Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};
const relation = (from: string, to: string): "friend" | "neutral" | "enemy" =>
  from === to ? "friend" : FRIENDS[from]?.includes(to) ? "friend" : ENEMIES[from]?.includes(to) ? "enemy" : "neutral";
const maitriScore = (x: string, y: string): number => {
  if (x === y) return 5;
  const r1 = relation(x, y);
  const r2 = relation(y, x);
  const rank = (r: string) => (r === "friend" ? 2 : r === "neutral" ? 1 : 0);
  const sum = rank(r1) + rank(r2);
  if (sum === 4) return 5;
  if (sum === 3) return 4;
  if (sum === 2) return r1 === "neutral" && r2 === "neutral" ? 3 : 1; // N+N = 3; F+E = 1
  if (sum === 1) return 0.5; // N+E
  return 0;
};

// ---- Gana (6): Deva / Manushya / Rakshasa per Nakshatra.
const GANA = [
  "Deva", "Manushya", "Rakshasa", "Manushya", "Deva", "Manushya", "Deva", "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya",
  "Deva", "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Rakshasa",
  "Manushya", "Manushya", "Deva",
];
// First person = groom side, second = bride side. Deva+Manushya 6 / 5, Deva+Rakshasa 1 / 0, Manushya+Rakshasa 0 (common convention).
const ganaScore = (a: string, b: string): number => {
  if (a === b) return 6;
  if (a === "Deva" && b === "Manushya") return 6;
  if (a === "Manushya" && b === "Deva") return 5;
  if (a === "Deva" && b === "Rakshasa") return 1;
  return 0;
};

// ---- Nadi (8): Adi / Madhya / Antya by Nakshatra (index mod 6 pattern).
const NADI_BY_POS = ["Adi", "Madhya", "Antya", "Antya", "Madhya", "Adi"];
const nadiOf = (n: number) => NADI_BY_POS[n % 6];

const rel = (a: number, b: number): number => ((b - a + 12) % 12) + 1;

export const koota = (aMoonLon: number, bMoonLon: number): AshtakootaResult => {
  const na = nakshatraOf(aMoonLon);
  const nb = nakshatraOf(bMoonLon);
  const sa = SIGNS[Math.floor((((aMoonLon % 360) + 360) % 360) / 30)];
  const sb = SIGNS[Math.floor((((bMoonLon % 360) + 360) % 360) / 30)];

  const out: KootaScore[] = [];

  // Varna: 1 if groom's varna >= bride's.
  const va = VARNA[sa];
  const vb = VARNA[sb];
  out.push({
    koota: "Varna", max: 1, score: va >= vb ? 1 : 0, a: VARNA_NAME[va], b: VARNA_NAME[vb],
    note: va >= vb ? "First person's class is equal to or higher than the second's." : "First person's class is lower than the second's.",
  });

  // Vashya
  const gva = vashyaOf(sa, (((aMoonLon % 360) + 360) % 360) % 30);
  const gvb = vashyaOf(sb, (((bMoonLon % 360) + 360) % 360) % 30);
  const vs = VASHYA_TABLE[VASHYA_ORDER.indexOf(gvb)][VASHYA_ORDER.indexOf(gva)];
  out.push({ koota: "Vashya", max: 2, score: vs, a: gva, b: gvb, note: "Group of each Moon sign and how well the two groups influence each other." });

  // Tara: count Nakshatra a->b and b->a, remainder over 9, favourable unless 3, 5, 7.
  const taraOk = (from: number, to: number) => {
    const r = ((to - from + 27) % 27 + 1) % 9;
    return !(r === 3 || r === 5 || r === 7);
  };
  const t1 = taraOk(na.index, nb.index);
  const t2 = taraOk(nb.index, na.index);
  out.push({
    koota: "Tara", max: 3, score: (t1 ? 1.5 : 0) + (t2 ? 1.5 : 0), a: NAKSHATRAS[na.index], b: NAKSHATRAS[nb.index],
    note: `Counting from the first person's star the relation is ${t1 ? "favourable" : "unfavourable"}; from the second's it is ${t2 ? "favourable" : "unfavourable"}.`,
  });

  // Yoni
  const ya = YONI[na.index];
  const yb = YONI[nb.index];
  const yScore = yoniScore(ya, yb);
  out.push({
    koota: "Yoni", max: 4, score: yScore, a: ya, b: yb,
    note: ya === yb ? "Same animal symbol." : yScore === 0 ? "Natural enemy animals." : `Different animal symbols (${yScore} of 4 in the traditional grid).`,
  });

  // Graha Maitri
  const la = SIGN_LORD[sa] as Planet;
  const lb = SIGN_LORD[sb] as Planet;
  out.push({ koota: "Graha Maitri", max: 5, score: maitriScore(la, lb), a: `${la} (lord of ${sa})`, b: `${lb} (lord of ${sb})`, note: "Friendship between the rulers of the two Moon signs." });

  // Gana
  const ga = GANA[na.index];
  const gb = GANA[nb.index];
  out.push({ koota: "Gana", max: 6, score: ganaScore(ga, gb), a: ga, b: gb, note: "Temperament type of each Nakshatra." });

  // Bhakoot: signs 2/12, 5/9 and 6/8 apart are the unfavourable pairs.
  const d = rel(idx(sa), idx(sb));
  const dosha = d === 2 || d === 12 || d === 5 || d === 9 || d === 6 || d === 8;
  out.push({
    koota: "Bhakoot", max: 7, score: dosha ? 0 : 7, a: sa, b: sb,
    note: dosha ? `Moon signs are ${d === 2 || d === 12 ? "2 and 12" : d === 5 || d === 9 ? "5 and 9" : "6 and 8"} signs apart (Bhakoot Dosha).` : "Moon signs are in a favourable position to each other.",
  });

  // Nadi
  const nda = nadiOf(na.index);
  const ndb = nadiOf(nb.index);
  out.push({ koota: "Nadi", max: 8, score: nda === ndb ? 0 : 8, a: nda, b: ndb, note: nda === ndb ? "Both share the same Nadi (Nadi Dosha)." : "The two Nadis differ." });

  const total = out.reduce((s, k) => s + k.score, 0);

  // Dosha cancellation (commonly cited classical conditions, stated rather than applied silently).
  const nadiDosha = nda === ndb;
  const nadiCancelled = nadiDosha && ((na.index === nb.index && na.pada !== nb.pada) || (sa === sb && na.index !== nb.index));
  const bhakootDosha = dosha;
  const bhakootCancelled = bhakootDosha && (la === lb || relation(la, lb) === "friend" && relation(lb, la) === "friend");
  const doshas: MatchDosha[] = [
    {
      name: "Nadi Dosha", present: nadiDosha, cancelled: nadiCancelled,
      note: !nadiDosha ? "Not present: the two Nadis differ."
        : nadiCancelled ? "Present but a classical exception applies (same Nakshatra with different padas, or same Moon sign with different Nakshatras)."
        : "Present: both have the same Nadi and no common exception was found. Traditionally families consult an astrologer about this.",
    },
    {
      name: "Bhakoot Dosha", present: bhakootDosha, cancelled: bhakootCancelled,
      note: !bhakootDosha ? "Not present."
        : bhakootCancelled ? "Present but the Moon-sign lords are the same or mutual friends, a classical cancellation."
        : "Present: the Moon signs are in an unfavourable position and the lords are not mutual friends.",
    },
  ];

  const band =
    total >= 32 ? "Very good (32 to 36)" : total >= 25 ? "Good (25 to 31)" : total >= 18 ? "Acceptable (18 to 24)" : "Below the usual 18-point minimum";

  return {
    total, max: 36, kootas: out, doshas, band,
    method: [
      "Scored from each person's Moon sign and Nakshatra using the standard Parashari (North Indian) Ashtakoota tables.",
      "Varna, Vashya, Tara, Gana and Graha Maitri depend on who is counted first, so the pair is ordered groom first when genders are given as male and female, otherwise in the order entered.",
      "Yoni uses the full 14-by-14 animal grid (0 to 4 points).",
      "Tara gives 1.5 points for each direction whose count (remainder after dividing by 9) is not 3, 5 or 7, the classical Vipat, Pratyak and Vadha taras.",
      "Varna uses the common element rule: water signs Brahmin, fire Kshatriya, earth Vaishya, air Shudra. Some software swaps Vaishya and Shudra.",
      "Vashya and Gana have more than one published table. This calculation uses one widely published Vashya grid and gives Gana 6 when the first person is Deva and the second Manushya (5 the other way round); other sources reverse that pair.",
      "Because published tables differ, this score can differ from other Guna Milan calculators. It is a MyBhagya calculation and is not claimed to match any particular calculator.",
      "Sagittarius and Capricorn Vashya groups are split at 15 degrees of the sign.",
      "Dosha cancellations shown are the commonly cited classical ones; a family astrologer may apply more.",
    ],
    moons: { a: { sign: sa, nakshatra: NAKSHATRAS[na.index], pada: na.pada }, b: { sign: sb, nakshatra: NAKSHATRAS[nb.index], pada: nb.pada } },
  };
};
