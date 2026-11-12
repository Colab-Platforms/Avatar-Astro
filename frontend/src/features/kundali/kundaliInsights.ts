import type { KundaliResult } from "./types";
import { getTerm } from "@/lib/astroGlossary";
import i18n from "@/i18n";
import { glossName } from "@/i18n/glossary";

// Plain-language reading of a calculated Janma Kundali. Every item has two parts that are kept apart on screen:
//   fact    - read straight from the chart the server calculated (sign, house, lord, dignity, dasha). Never guessed.
//   meaning - the traditional Jyotish significance of that fact, from the fixed tables below. It is general, not a prediction.
// Nothing here recalculates the chart or adds a planetary position. If the chart lacks something (no birth time, no houses),
// the item is simply not produced and the guide says why.
// The sentences live in the dictionary (kundali.insight.*); this file decides WHICH sentence applies and fills in the calculated parts.

const T = (key: string, values?: Record<string, string | number>): string => i18n.t(key, values) as string;
/** Static English text looked up by a stable key; the English text is the fallback. */
const D = (key: string, english: string): string => i18n.t(key, { defaultValue: english }) as string;

/** Displayed name of a Rashi. The server's Sanskrit name is shown as is in English; other languages use the glossary entry of the sign. */
export const rashiName = (r: { sign: string; name: string }): string =>
  (i18n.language ?? "en").startsWith("en") ? r.name : glossName("rashi", r.sign, r.name);
/** Displayed names of calculated values (the calculated value itself never changes). */
export const planetName = (p: string): string => glossName("planet", p);
export const nakshatraName = (n: string): string => glossName("nakshatra", n);
export const signName = (s: string): string => glossName("rashi", s);

export interface Insight { title: string; fact: string; meaning: string }
export interface KundaliGuideData {
  houses: boolean; // houses/Lagna were calculated (exact birth time known)
  personality: Insight[];
  career: Insight[];
  relationships: Insight[];
  strengths: Insight[];
  challenges: Insight[];
  important: Insight[];
  notes: string[];
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
type Sign = (typeof SIGNS)[number];

const LORD: Record<Sign, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const EXALTED: Record<string, Sign> = { Sun: "Aries", Moon: "Taurus", Mars: "Capricorn", Mercury: "Virgo", Jupiter: "Cancer", Venus: "Pisces", Saturn: "Libra" };
const DEBILITATED: Record<string, Sign> = { Sun: "Libra", Moon: "Scorpio", Mars: "Cancer", Mercury: "Pisces", Jupiter: "Capricorn", Venus: "Virgo", Saturn: "Aries" };
const OWN: Record<string, Sign[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mars: ["Aries", "Scorpio"], Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"], Venus: ["Taurus", "Libra"], Saturn: ["Capricorn", "Aquarius"],
};

/** What each house is about, in everyday words. */
export const HOUSE_TOPIC: Record<number, string> = {
  1: "you yourself: body, temperament and how you meet the world",
  2: "family, speech, savings and what you value",
  3: "courage, effort, siblings and communication",
  4: "home, mother, comfort and inner peace",
  5: "creativity, children, learning and romance",
  6: "daily work, service, health habits and obstacles",
  7: "marriage, partnerships and close one-to-one relationships",
  8: "change, shared resources and deep transformation",
  9: "fortune, higher learning, teachers and faith (Bhagya)",
  10: "career, status and your public work (Karma)",
  11: "income, gains, friends and fulfilment of goals",
  12: "rest, expenses, solitude and letting go",
};

/** Traditional description of the rising sign (Lagna), in plain words. */
const LAGNA_TEXT: Record<Sign, string> = {
  Aries: "A Mesha Lagna is traditionally linked with energy, courage and a direct, self-starting nature.",
  Taurus: "A Vrishabha Lagna is traditionally linked with steadiness, patience and a love of comfort and beauty.",
  Gemini: "A Mithuna Lagna is traditionally linked with curiosity, quick thinking and a talkative, adaptable nature.",
  Cancer: "A Karka Lagna is traditionally linked with caring, sensitivity and a strong attachment to home and family.",
  Leo: "A Simha Lagna is traditionally linked with confidence, warmth and a natural wish to lead.",
  Virgo: "A Kanya Lagna is traditionally linked with care for detail, practicality and a wish to be useful.",
  Libra: "A Tula Lagna is traditionally linked with fairness, charm and a search for balance and harmony.",
  Scorpio: "A Vrishchika Lagna is traditionally linked with intensity, determination and privacy about feelings.",
  Sagittarius: "A Dhanu Lagna is traditionally linked with optimism, honesty and a love of learning and freedom.",
  Capricorn: "A Makara Lagna is traditionally linked with discipline, responsibility and steady, long-term effort.",
  Aquarius: "A Kumbha Lagna is traditionally linked with independent thinking, friendliness and an interest in the wider community.",
  Pisces: "A Meena Lagna is traditionally linked with imagination, compassion and a gentle, intuitive nature.",
};

/** Traditional description of the Moon sign (Chandra Rashi): the mind and emotions. */
const MOON_TEXT: Record<Sign, string> = {
  Aries: "Mesha Moon: emotions are quick and honest; you may feel best when you are active and free to act.",
  Taurus: "Vrishabha Moon: emotions are steady; you may feel settled with comfort, routine and loyal people.",
  Gemini: "Mithuna Moon: the mind is lively; you may feel best when talking, learning and moving between ideas.",
  Cancer: "Karka Moon: feelings run deep; you may need a safe home and close family to feel at peace. (Moon is in its own sign here.)",
  Leo: "Simha Moon: you may need appreciation and a sense of dignity, and you tend to feel things warmly and openly.",
  Virgo: "Kanya Moon: the mind is analytical; you may feel calm when things are orderly and useful.",
  Libra: "Tula Moon: you may seek harmony and dislike conflict; relationships matter a great deal to your peace of mind.",
  Scorpio: "Vrishchika Moon: feelings are strong and private; you may take time to trust but are loyal once you do.",
  Sagittarius: "Dhanu Moon: you may feel best with hope, purpose and room to explore ideas and beliefs.",
  Capricorn: "Makara Moon: you may keep feelings controlled and feel secure when you are making steady progress.",
  Aquarius: "Kumbha Moon: you may feel most at ease with space to think independently and friends who share your ideas.",
  Pisces: "Meena Moon: you may be sensitive and imaginative, and feel deeply for other people.",
};

/** What each graha stands for, simply. */
const GRAHA_TOPIC: Record<string, string> = {
  Sun: "self-confidence, authority and vitality",
  Moon: "the mind, emotions and care",
  Mars: "energy, courage and drive",
  Mercury: "intellect, speech and business sense",
  Jupiter: "wisdom, growth, teachers and good fortune",
  Venus: "love, comfort, art and relationships",
  Saturn: "discipline, patience and long-term effort",
  Rahu: "ambition, worldly desires and unusual paths",
  Ketu: "detachment, intuition and letting go",
};

/** A running period (Mahadasha) is traditionally read through the nature of its lord. */
export const DASHA_THEME: Record<string, string> = {
  Sun: "self-confidence, status and taking responsibility",
  Moon: "emotions, home life, care for others and the mind",
  Mars: "energy, effort, courage and taking action",
  Mercury: "learning, communication, trade and skills",
  Jupiter: "growth, learning, family and guidance",
  Venus: "relationships, comfort, creativity and enjoyment",
  Saturn: "hard work, discipline, patience and responsibility",
  Rahu: "ambition, change and unconventional experiences",
  Ketu: "reflection, detachment and spiritual interests",
};

const asSign = (s: string | undefined): Sign | null => (SIGNS as readonly string[]).includes(s ?? "") ? (s as Sign) : null;
const ordEn = (n: number) => { const v = n % 100; return `${n}${["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th"}`; };
const ord = (n: number) => D(`kundali.ordinal.${n}`, ordEn(n));

/** Lookups of the static tables above by stable key (English text is the fallback). */
export const houseTopic = (n: number): string => D(`kundali.houseTopic.${n}`, HOUSE_TOPIC[n]);
export const dashaTheme = (lord: string): string | undefined => (DASHA_THEME[lord] ? D(`kundali.dashaTheme.${lord}`, DASHA_THEME[lord]) : undefined);
const lagnaText = (s: Sign) => D(`kundali.lagnaText.${s}`, LAGNA_TEXT[s]);
const moonText = (s: Sign) => D(`kundali.moonText.${s}`, MOON_TEXT[s]);
const grahaTopic = (p: string) => D(`kundali.grahaTopic.${p}`, GRAHA_TOPIC[p]);

export function buildKundaliGuide(k: KundaliResult): KundaliGuideData {
  const g: KundaliGuideData = { houses: !!k.lagna && !!k.planets, personality: [], career: [], relationships: [], strengths: [], challenges: [], important: [], notes: [] };
  const planets = k.planets ?? [];
  const where = (name: string) => planets.find((p) => p.planet === name);
  const lagnaSign = asSign(k.lagna?.rashi.sign);
  const houseSign = (house: number): Sign | null => (lagnaSign ? SIGNS[(SIGNS.indexOf(lagnaSign) + house - 1) % 12] : null);
  const occupants = (house: number) => planets.filter((p) => p.house === house).map((p) => p.planet);
  /** "Falls in <sign>; <planets> sit(s) there" or "; no planet sits there". */
  const houseFact = (house: number, sign: Sign) => {
    const n = occupants(house).length;
    return T(n === 0 ? "kundali.insight.houseFact.none" : n === 1 ? "kundali.insight.houseFact.one" : "kundali.insight.houseFact.other", {
      sign: signName(sign),
      planets: occupants(house).map(planetName).join(", "),
    });
  };

  // ── Personality ──
  if (lagnaSign && k.lagna) {
    g.personality.push({
      title: T("kundali.insight.lagna.title"),
      fact: T("kundali.insight.lagna.fact", { rashi: rashiName(k.lagna.rashi), hindi: k.lagna.rashi.hindi, degree: k.lagna.degreeInSign }),
      meaning: T("kundali.insight.lagna.meaning", { text: lagnaText(lagnaSign) }),
    });
    const lord = LORD[lagnaSign];
    const lp = where(lord);
    if (lp) g.personality.push({
      title: T("kundali.insight.lagnaLord.title"),
      fact: T("kundali.insight.lagnaLord.fact", { lord: planetName(lord), rashi: rashiName(lp.rashi), ord: ord(lp.house) }),
      meaning: T("kundali.insight.lagnaLord.meaning", { ord: ord(lp.house), topic: houseTopic(lp.house) }),
    });
  }
  const moonSign = asSign(k.moon.rashi?.sign);
  if (moonSign && k.moon.rashi) g.personality.push({
    title: T("kundali.insight.moon.title"),
    fact: k.moon.nakshatra
      ? T("kundali.insight.moon.factWithNakshatra", { rashi: rashiName(k.moon.rashi), hindi: k.moon.rashi.hindi, nakshatra: nakshatraName(k.moon.nakshatra.name) })
      : T("kundali.insight.moon.fact", { rashi: rashiName(k.moon.rashi), hindi: k.moon.rashi.hindi }),
    meaning: T("kundali.insight.moon.meaning", { text: moonText(moonSign) }),
  });
  else if (k.moon.candidates.length) g.notes.push(T("kundali.insight.moon.uncertainNote", { list: k.moon.candidates.map((c) => rashiName(c)).join(T("kundali.insight.or")) }));

  if (g.houses && lagnaSign) {
    // ── Career ──
    const s10 = houseSign(10)!; const l10 = LORD[s10]; const p10 = where(l10);
    g.career.push({
      title: T("kundali.insight.house10.title"),
      fact: houseFact(10, s10),
      meaning: T("kundali.insight.house10.meaning", { topic: houseTopic(10) }),
    });
    if (p10) g.career.push({
      title: T("kundali.insight.lord10.title"),
      fact: T("kundali.insight.lord10.fact", { lord: planetName(l10), rashi: rashiName(p10.rashi), ord: ord(p10.house) }),
      meaning: T("kundali.insight.lord10.meaning", { topic: houseTopic(p10.house) }),
    });
    const s2 = houseSign(2)!, s11 = houseSign(11)!;
    g.career.push({
      title: T("kundali.insight.income.title"),
      fact: T("kundali.insight.income.fact", { sign2: signName(s2), lord2: planetName(LORD[s2]), sign11: signName(s11), lord11: planetName(LORD[s11]) }),
      meaning: T("kundali.insight.income.meaning", { topic2: houseTopic(2), topic11: houseTopic(11) }),
    });

    // ── Relationships ──
    const s7 = houseSign(7)!; const l7 = LORD[s7]; const p7 = where(l7);
    g.relationships.push({
      title: T("kundali.insight.house7.title"),
      fact: houseFact(7, s7),
      meaning: T("kundali.insight.house7.meaning", { topic: houseTopic(7) }),
    });
    if (p7) g.relationships.push({
      title: T("kundali.insight.lord7.title"),
      fact: T("kundali.insight.lord7.fact", { lord: planetName(l7), rashi: rashiName(p7.rashi), ord: ord(p7.house) }),
      meaning: T("kundali.insight.lord7.meaning", { topic: houseTopic(p7.house) }),
    });
    const venus = where("Venus");
    if (venus) g.relationships.push({
      title: T("kundali.insight.venus.title"),
      fact: T("kundali.insight.venus.fact", { rashi: rashiName(venus.rashi), ord: ord(venus.house) }),
      meaning: T("kundali.insight.venus.meaning", { topic: grahaTopic("Venus") }),
    });

    // ── Strengths & challenges: classical dignity of each graha ──
    for (const p of planets) {
      const sign = asSign(p.rashi.sign);
      if (!sign || !GRAHA_TOPIC[p.planet] || p.planet === "Rahu" || p.planet === "Ketu") continue;
      const vals = { planet: planetName(p.planet), rashi: rashiName(p.rashi), ord: ord(p.house), topic: grahaTopic(p.planet) };
      if (EXALTED[p.planet] === sign) g.strengths.push({
        title: T("kundali.insight.exalted.title", vals),
        fact: T("kundali.insight.exalted.fact", vals),
        meaning: T("kundali.insight.exalted.meaning", vals),
      });
      else if (OWN[p.planet]?.includes(sign)) g.strengths.push({
        title: T("kundali.insight.own.title", vals),
        fact: T("kundali.insight.own.fact", vals),
        meaning: T("kundali.insight.own.meaning", vals),
      });
      else if (DEBILITATED[p.planet] === sign) g.challenges.push({
        title: T("kundali.insight.debilitated.title", vals),
        fact: T("kundali.insight.debilitated.fact", vals),
        meaning: T("kundali.insight.debilitated.meaning", vals),
      });
    }
  }

  // ── Important insights ──
  if (k.dasha) g.important.push({
    title: T("kundali.insight.dasha.title"),
    fact: T("kundali.insight.dasha.fact", {
      mahadasha: planetName(k.dasha.mahadasha.lord), start: k.dasha.mahadasha.start, end: k.dasha.mahadasha.end,
      antardasha: planetName(k.dasha.antardasha.lord), nakshatra: nakshatraName(k.dasha.moonNakshatra),
    }),
    meaning: T("kundali.insight.dasha.meaning", { lord: planetName(k.dasha.mahadasha.lord), theme: dashaTheme(k.dasha.mahadasha.lord) ?? T("kundali.insight.dasha.ownThemes") }),
  });
  if (k.moon.nakshatra) g.important.push({
    title: T("kundali.insight.nakshatra.title"),
    fact: k.moon.nakshatra.pada
      ? T("kundali.insight.nakshatra.factWithPada", { nakshatra: nakshatraName(k.moon.nakshatra.name), pada: k.moon.nakshatra.pada, lord: planetName(k.moon.nakshatra.lord) })
      : T("kundali.insight.nakshatra.fact", { nakshatra: nakshatraName(k.moon.nakshatra.name), lord: planetName(k.moon.nakshatra.lord) }),
    meaning: T("kundali.insight.nakshatra.meaning"),
  });
  if (!g.houses) g.notes.push(T("kundali.insight.noHousesNote"));
  return g;
}

/** Plain-language meanings of the terms used on a Kundali page. */
/** Terms listed under "Terms explained simply". Definitions come from the shared glossary so every tool says the same thing. */
export const KUNDALI_TERMS: [string, string][] = [
  "Janma Kundali", "Rashi", "Chandra Rashi", "Surya Rashi", "Lagna", "Bhava (house)", "Graha", "Nakshatra", "Navamsa (D9)", "Dasha", "Panchang",
].flatMap((t) => { const e = getTerm(t); return e ? [[e.term, e.meaning] as [string, string]] : []; });
