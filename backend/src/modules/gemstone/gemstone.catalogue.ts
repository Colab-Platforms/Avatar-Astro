/**
 * Single source of truth for the traditional Navaratna associations used by
 * Ratna Jyotish. These are traditional/astrological associations, not
 * evidence that a gemstone changes life outcomes.
 */

export const PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;
export type Planet = (typeof PLANETS)[number];

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

/** Classical sign rulers (nodes own no sign under this method). */
export const SIGN_LORD: Record<Sign, Planet> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

export const EXALTATION_SIGN: Partial<Record<Planet, Sign>> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
};

export const DEBILITATION_SIGN: Partial<Record<Planet, Sign>> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
};

export interface GemstoneInfo {
  /** URL-safe key, also used by the products endpoint. */
  key: string;
  planet: Planet;
  name: string;
  sanskrit: string;
  /** Lower-case words used to find matching catalogue products. */
  aliases: string[];
  colour: string;
  weekday: string;
  weekdayIndex: number; // 0 = Sunday
  /** Commonly cited customs; these vary between traditions. */
  customs: { metal: string; finger: string };
  /** Plain-language traditional significance. */
  significance: string[];
  /** Rudraksha mukhi in the (conventional, not universal) mukhi→planet map. */
  rudrakshaMukhi: number | null;
}

export const GEMSTONES: Record<string, GemstoneInfo> = {
  ruby: {
    key: "ruby",
    planet: "Sun",
    name: "Ruby",
    sanskrit: "Manikya",
    aliases: ["ruby", "manik", "manikya"],
    colour: "#c8102e",
    weekday: "Sunday",
    weekdayIndex: 0,
    customs: { metal: "Gold or copper", finger: "Ring finger" },
    significance: [
      "Traditionally associated with the Sun, linked in Vedic texts with vitality, authority and self-confidence.",
      "Often worn in the belief that it supports a sense of purpose and leadership.",
    ],
    rudrakshaMukhi: 1,
  },
  pearl: {
    key: "pearl",
    planet: "Moon",
    name: "Pearl",
    sanskrit: "Moti",
    aliases: ["pearl", "moti"],
    colour: "#e8e4dc",
    weekday: "Monday",
    weekdayIndex: 1,
    customs: { metal: "Silver", finger: "Little finger" },
    significance: [
      "Traditionally associated with the Moon, linked with the mind, emotions and calm.",
      "Often worn in the belief that it supports emotional steadiness and a peaceful temperament.",
    ],
    rudrakshaMukhi: 2,
  },
  "red-coral": {
    key: "red-coral",
    planet: "Mars",
    name: "Red Coral",
    sanskrit: "Moonga",
    aliases: ["coral", "moonga", "munga"],
    colour: "#d2442c",
    weekday: "Tuesday",
    weekdayIndex: 2,
    customs: { metal: "Gold or copper", finger: "Ring finger" },
    significance: [
      "Traditionally associated with Mars, linked with energy, courage and drive.",
      "Often worn in the belief that it supports determination and confidence.",
    ],
    rudrakshaMukhi: 3,
  },
  emerald: {
    key: "emerald",
    planet: "Mercury",
    name: "Emerald",
    sanskrit: "Panna",
    aliases: ["emerald", "panna"],
    colour: "#1f9d6a",
    weekday: "Wednesday",
    weekdayIndex: 3,
    customs: { metal: "Gold or silver", finger: "Little finger" },
    significance: [
      "Traditionally associated with Mercury, linked with communication, learning and analysis.",
      "Often worn in the belief that it supports clear expression and intellectual focus.",
    ],
    rudrakshaMukhi: 4,
  },
  "yellow-sapphire": {
    key: "yellow-sapphire",
    planet: "Jupiter",
    name: "Yellow Sapphire",
    sanskrit: "Pukhraj",
    aliases: ["yellow sapphire", "pukhraj", "pukhraaj", "pushkaraj"],
    colour: "#f2b705",
    weekday: "Thursday",
    weekdayIndex: 4,
    customs: { metal: "Gold", finger: "Index finger" },
    significance: [
      "Traditionally associated with Jupiter, linked with wisdom, learning and goodwill.",
      "Often worn in the belief that it supports reflection, guidance and optimism.",
    ],
    rudrakshaMukhi: 5,
  },
  diamond: {
    key: "diamond",
    planet: "Venus",
    name: "Diamond or White Sapphire",
    sanskrit: "Heera / Safed Pukhraj",
    aliases: ["diamond", "heera", "hira", "white sapphire", "zircon"],
    colour: "#dfe9f5",
    weekday: "Friday",
    weekdayIndex: 5,
    customs: { metal: "Platinum or silver", finger: "Middle or ring finger" },
    significance: [
      "Traditionally associated with Venus, linked with harmony, aesthetics and relationships.",
      "Often worn in the belief that it supports appreciation of beauty and balance. White sapphire is the customary, more accessible alternative.",
    ],
    rudrakshaMukhi: 6,
  },
  "blue-sapphire": {
    key: "blue-sapphire",
    planet: "Saturn",
    name: "Blue Sapphire",
    sanskrit: "Neelam",
    aliases: ["blue sapphire", "neelam", "neelmani"],
    colour: "#1e3fa8",
    weekday: "Saturday",
    weekdayIndex: 6,
    customs: { metal: "Silver or panchdhatu", finger: "Middle finger" },
    significance: [
      "Traditionally associated with Saturn, linked with discipline, patience and perseverance.",
      "Traditional sources treat it as a stone to be approached with care, often on a trial basis, because Saturn's influence is considered strong.",
    ],
    rudrakshaMukhi: 7,
  },
  hessonite: {
    key: "hessonite",
    planet: "Rahu",
    name: "Hessonite (Gomed)",
    sanskrit: "Gomed",
    aliases: ["hessonite", "gomed", "gomedh"],
    colour: "#b5651d",
    weekday: "Saturday",
    weekdayIndex: 6,
    customs: { metal: "Silver or panchdhatu", finger: "Middle finger" },
    significance: [
      "Traditionally associated with Rahu, the ascending lunar node.",
    ],
    rudrakshaMukhi: 8,
  },
  "cats-eye": {
    key: "cats-eye",
    planet: "Ketu",
    name: "Cat's Eye",
    sanskrit: "Lehsunia",
    aliases: ["cat's eye", "cats eye", "cat eye", "lehsunia", "chrysoberyl"],
    colour: "#8a9a3b",
    weekday: "Tuesday",
    weekdayIndex: 2,
    customs: { metal: "Silver or panchdhatu", finger: "Middle finger" },
    significance: [
      "Traditionally associated with Ketu, the descending lunar node.",
    ],
    rudrakshaMukhi: 9,
  },
};

export const STONE_FOR_PLANET: Record<Planet, GemstoneInfo> = {
  Sun: GEMSTONES.ruby,
  Moon: GEMSTONES.pearl,
  Mars: GEMSTONES["red-coral"],
  Mercury: GEMSTONES.emerald,
  Jupiter: GEMSTONES["yellow-sapphire"],
  Venus: GEMSTONES.diamond,
  Saturn: GEMSTONES["blue-sapphire"],
  Rahu: GEMSTONES.hessonite,
  Ketu: GEMSTONES["cats-eye"],
};

export const getGemstone = (key: string): GemstoneInfo | undefined =>
  Object.prototype.hasOwnProperty.call(GEMSTONES, key)
    ? GEMSTONES[key]
    : undefined;
