import type { ToolSlug } from "./astrologyAudio.config.js";

/**
 * English narration for each tool, copied verbatim from the intro block of the About section on the
 * tool page (title + first block heading + its paragraphs). It is only used to create the English
 * row the first time; after that the database row (editable in the admin) is the narration source.
 * src/__tests__/astrologyAudio.test.ts fails if any of this stops matching the page components.
 */
export interface SeedEntry {
  title: string;
  heading: string;
  paragraphs: string[];
  /** Frontend component (relative to frontend/src) the text comes from; used by the verbatim-match test. */
  source: string;
}

export const ENGLISH_SEED: Record<ToolSlug, SeedEntry> = {
  tarot: {
    title: "About Tarot Drishti",
    heading: "What Is Tarot Reading?",
    paragraphs: [
      "Tarot is a deck of illustrated cards used for reflection and storytelling. Each card carries traditional themes such as new beginnings, choices, endings or support. It is an aid for thinking a question through, not a way of proving what will happen.",
    ],
    source: "components/tarot/TarotEducation.tsx",
  },
  zodiac: {
    title: "About Rashi Chakra",
    heading: "What Are Zodiac Signs?",
    paragraphs: [
      "The zodiac is a belt of sky that the Sun, Moon and planets appear to travel through. Astrology divides that belt into twelve equal parts of 30 degrees each, and each part is called a sign. The signs carry the names of Aries, Taurus, Gemini and the rest, and each is associated with an element and a traditional set of themes.",
      "Your Sun sign is the sign the Sun was in when you were born. It is the sign most people mean when they say \"I'm a Leo\". It is a popular starting point for exploring astrology, and this page is useful if you are curious about the personality themes traditionally linked with each sign, or about the signs of people you know.",
    ],
    source: "components/ZodiacEducation.tsx",
  },
  "birth-chart": {
    title: "About Janma Kundali",
    heading: "What Is a Janma Kundali?",
    paragraphs: [
      "A Janma Kundali is the Vedic birth chart: a map of the sky at the exact moment and place you were born. Vedic astrologers read it from the signs (Rashis), lunar mansions (Nakshatras) and houses that the Sun, Moon and planets occupied.",
      "This Seva calculates the key parts of that chart: your Surya Rashi (Sun sign), Chandra Rashi (Moon sign), Janma Nakshatra and its pada, the Lagna (ascendant) with the planets in their Rashis and houses when you give an exact birth time, and the Panchang of your birth. It also shows a numerology Life Path number, which is a separate tradition.",
    ],
    source: "components/BirthChartEducation.tsx",
  },
  compatibility: {
    title: "About Jodi Jyotish",
    heading: "What Is Astrological Compatibility?",
    paragraphs: [
      "Astrological compatibility is the traditional practice of comparing two people's astrology to see how their themes fit together. The simplest form compares Sun signs. Fuller methods compare whole birth charts (called synastry in Western astrology) or, in Vedic astrology, use the Guna Milan or Ashtakoota system, which scores matches using the Moon sign and nakshatra.",
      "This Seva uses the simplest method, a comparison of two Sun signs. It suits you if you are curious how two signs traditionally relate, for a partner, friend, family member or colleague. It gives a written reading and no score.",
    ],
    source: "components/CompatibilityEducation.tsx",
  },
  "palm-reading": {
    title: "About Hasta Rekha",
    heading: "What Is Palm Reading?",
    paragraphs: [
      "Palm reading, or palmistry, is a traditional practice of interpreting the shape of the hand, the lines on the palm and the raised areas called mounts. It is found in many cultures, including the Indian tradition often called Hasta Samudrika Shastra.",
      "Palm reading is a belief system and is not scientifically proven. People use it for reflection and conversation. This Seva covers one small part of it, which is hand shape.",
    ],
    source: "components/palm/PalmEducation.tsx",
  },
  "name-numerology": {
    title: "About Naamank Jyotish",
    heading: "What Is Name Numerology?",
    paragraphs: [
      "Name numerology is a traditional practice that turns the letters of a name, and the digits of a birth date, into numbers, then reads each number as a symbol for personality themes. Different cultures have used it for centuries, including in India and the Greek and Hebrew traditions.",
      "The adding-up part is plain arithmetic that anyone can check. The meanings attached to the numbers are traditional beliefs, and they are not scientifically proven. Naamank Jyotish is useful if you are curious about the numbers in your name and birth date, and what numerologists say about them.",
    ],
    source: "components/NameNumerologyEducation.tsx",
  },
};

export const seedNarrationText = (e: SeedEntry): string => [`${e.title}.`, e.heading, ...e.paragraphs].join("\n\n");
