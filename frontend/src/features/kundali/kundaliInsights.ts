import type { KundaliResult } from "./types";
import { getTerm } from "@/lib/astroGlossary";

// Plain-language reading of a calculated Janma Kundali. Every item has two parts that are kept apart on screen:
//   fact    - read straight from the chart the server calculated (sign, house, lord, dignity, dasha). Never guessed.
//   meaning - the traditional Jyotish significance of that fact, from the fixed tables below. It is general, not a prediction.
// Nothing here recalculates the chart or adds a planetary position. If the chart lacks something (no birth time, no houses),
// the item is simply not produced and the guide says why.

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
const ord = (n: number) => { const v = n % 100; return `${n}${["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th"}`; };

export function buildKundaliGuide(k: KundaliResult): KundaliGuideData {
  const g: KundaliGuideData = { houses: !!k.lagna && !!k.planets, personality: [], career: [], relationships: [], strengths: [], challenges: [], important: [], notes: [] };
  const planets = k.planets ?? [];
  const where = (name: string) => planets.find((p) => p.planet === name);
  const lagnaSign = asSign(k.lagna?.rashi.sign);
  const houseSign = (house: number): Sign | null => (lagnaSign ? SIGNS[(SIGNS.indexOf(lagnaSign) + house - 1) % 12] : null);
  const occupants = (house: number) => planets.filter((p) => p.house === house).map((p) => p.planet);

  // ── Personality ──
  if (lagnaSign && k.lagna) {
    g.personality.push({
      title: "Your Lagna (rising sign)",
      fact: `${k.lagna.rashi.name} (${k.lagna.rashi.hindi}), ${k.lagna.degreeInSign}°.`,
      meaning: `${LAGNA_TEXT[lagnaSign]} The Lagna is the sign rising on the eastern horizon at your birth; it shapes how you present yourself.`,
    });
    const lord = LORD[lagnaSign];
    const lp = where(lord);
    if (lp) g.personality.push({
      title: "Your Lagna lord",
      fact: `${lord} rules your Lagna and sits in ${lp.rashi.name} in your ${ord(lp.house)} house.`,
      meaning: `The Lagna lord shows where your life energy tends to go. Being in the ${ord(lp.house)} house points toward ${HOUSE_TOPIC[lp.house]}.`,
    });
  }
  const moonSign = asSign(k.moon.rashi?.sign);
  if (moonSign && k.moon.rashi) g.personality.push({
    title: "Your Chandra Rashi (Moon sign)",
    fact: `${k.moon.rashi.name} (${k.moon.rashi.hindi})${k.moon.nakshatra ? `, in ${k.moon.nakshatra.name} nakshatra` : ""}.`,
    meaning: `${MOON_TEXT[moonSign]} In Jyotish the Moon sign is your Rashi, the sign most people mean when they ask "what is my Rashi?".`,
  });
  else if (k.moon.candidates.length) g.notes.push(`Your Moon changed sign on your birth date, so your Chandra Rashi could be ${k.moon.candidates.map((c) => c.name).join(" or ")}. Your exact birth time decides which one applies.`);

  if (g.houses && lagnaSign) {
    // ── Career ──
    const s10 = houseSign(10)!; const l10 = LORD[s10]; const p10 = where(l10);
    g.career.push({
      title: "Your 10th house (Karma Bhava)",
      fact: `Falls in ${s10}${occupants(10).length ? `; ${occupants(10).join(", ")} sit${occupants(10).length === 1 ? "s" : ""} there` : "; no planet sits there"}.`,
      meaning: `The 10th house is about ${HOUSE_TOPIC[10]}.`,
    });
    if (p10) g.career.push({
      title: "The lord of your 10th house",
      fact: `${l10} rules it and is placed in ${p10.rashi.name} in your ${ord(p10.house)} house.`,
      meaning: `Where the 10th lord sits shows which area of life your work is closely tied to: ${HOUSE_TOPIC[p10.house]}.`,
    });
    const s2 = houseSign(2)!, s11 = houseSign(11)!;
    g.career.push({
      title: "Income and gains (2nd and 11th houses)",
      fact: `The 2nd house is in ${s2} (ruled by ${LORD[s2]}) and the 11th house is in ${s11} (ruled by ${LORD[s11]}).`,
      meaning: `The 2nd house is about ${HOUSE_TOPIC[2]}; the 11th is about ${HOUSE_TOPIC[11]}.`,
    });

    // ── Relationships ──
    const s7 = houseSign(7)!; const l7 = LORD[s7]; const p7 = where(l7);
    g.relationships.push({
      title: "Your 7th house (Kalatra Bhava)",
      fact: `Falls in ${s7}${occupants(7).length ? `; ${occupants(7).join(", ")} sit${occupants(7).length === 1 ? "s" : ""} there` : "; no planet sits there"}.`,
      meaning: `The 7th house is about ${HOUSE_TOPIC[7]}.`,
    });
    if (p7) g.relationships.push({
      title: "The lord of your 7th house",
      fact: `${l7} rules it and is placed in ${p7.rashi.name} in your ${ord(p7.house)} house.`,
      meaning: `This links partnership with ${HOUSE_TOPIC[p7.house]}.`,
    });
    const venus = where("Venus");
    if (venus) g.relationships.push({
      title: "Venus (the graha of love and comfort)",
      fact: `Venus is in ${venus.rashi.name} in your ${ord(venus.house)} house.`,
      meaning: `Venus stands for ${GRAHA_TOPIC.Venus}. Its house shows where you look for affection and enjoyment.`,
    });

    // ── Strengths & challenges: classical dignity of each graha ──
    for (const p of planets) {
      const sign = asSign(p.rashi.sign);
      if (!sign || !GRAHA_TOPIC[p.planet] || p.planet === "Rahu" || p.planet === "Ketu") continue;
      if (EXALTED[p.planet] === sign) g.strengths.push({
        title: `${p.planet} is exalted (Uchcha)`,
        fact: `${p.planet} is in ${p.rashi.name}, its sign of exaltation, in your ${ord(p.house)} house.`,
        meaning: `A graha in its exaltation sign is traditionally considered strong and able to give good results for ${GRAHA_TOPIC[p.planet]}.`,
      });
      else if (OWN[p.planet]?.includes(sign)) g.strengths.push({
        title: `${p.planet} is in its own sign (Swakshetra)`,
        fact: `${p.planet} is in ${p.rashi.name}, a sign it rules, in your ${ord(p.house)} house.`,
        meaning: `A graha in its own sign is traditionally comfortable and steady, supporting ${GRAHA_TOPIC[p.planet]}.`,
      });
      else if (DEBILITATED[p.planet] === sign) g.challenges.push({
        title: `${p.planet} is in its weaker sign (Neecha)`,
        fact: `${p.planet} is in ${p.rashi.name}, its sign of debilitation, in your ${ord(p.house)} house.`,
        meaning: `Traditionally this asks for conscious effort in the area of ${GRAHA_TOPIC[p.planet]}. Other factors in the chart can soften it, so it is not a fixed verdict.`,
      });
    }
  }

  // ── Important insights ──
  if (k.dasha) g.important.push({
    title: "Your running Dasha (Vimshottari period)",
    fact: `${k.dasha.mahadasha.lord} Mahadasha (${k.dasha.mahadasha.start} to ${k.dasha.mahadasha.end}) with ${k.dasha.antardasha.lord} Antardasha, counted from your Moon in ${k.dasha.moonNakshatra}.`,
    meaning: `A Dasha is a long period of life read through one graha. ${k.dasha.mahadasha.lord} periods are traditionally linked with ${DASHA_THEME[k.dasha.mahadasha.lord] ?? "its own themes"}. It describes emphasis, not fixed events.`,
  });
  if (k.moon.nakshatra) g.important.push({
    title: "Your Janma Nakshatra",
    fact: `${k.moon.nakshatra.name}${k.moon.nakshatra.pada ? `, pada ${k.moon.nakshatra.pada}` : ""}, ruled by ${k.moon.nakshatra.lord}.`,
    meaning: "Your Janma Nakshatra is the lunar mansion the Moon was in at birth. It is used for the Dasha sequence, naming and traditional matching.",
  });
  if (!g.houses) g.notes.push("Houses, Lagna and the career and relationship sections need your exact birth time, so they are not shown for this chart. Add your birth time to see them.");
  return g;
}

/** Plain-language meanings of the terms used on a Kundali page. */
/** Terms listed under "Terms explained simply". Definitions come from the shared glossary so every tool says the same thing. */
export const KUNDALI_TERMS: [string, string][] = [
  "Janma Kundali", "Rashi", "Chandra Rashi", "Surya Rashi", "Lagna", "Bhava (house)", "Graha", "Nakshatra", "Navamsa (D9)", "Dasha", "Panchang",
].flatMap((t) => { const e = getTerm(t); return e ? [[e.term, e.meaning] as [string, string]] : []; });
