/**
 * Single source of truth for the user-facing names and subtitles of the twelve
 * astrology and Inner Voice Seva. Routes and ids are unchanged; only the display
 * language lives here. Use this everywhere a feature name or subtitle is shown.
 */

export type FeatureCategory = "astrology" | "inner-voice";

export interface FeatureMeta {
  /** Internal identifier (stable; never shown). */
  id: string;
  /** Approved display name. */
  name: string;
  /** Approved subtitle. */
  subtitle: string;
  /** Existing route (unchanged). */
  path: string;
  category: FeatureCategory;
}

export const FEATURES = {
  tarot: {
    id: "tarot",
    name: "Tarot Drishti",
    subtitle: "Discover the messages within the cards and find clarity for the questions on your mind.",
    path: "/tarot",
    category: "astrology",
  },
  zodiac: {
    id: "zodiac",
    name: "Rashi Chakra",
    subtitle: "Explore your zodiac sign, planetary influences and the qualities that shape your personality.",
    path: "/zodiac",
    category: "astrology",
  },
  birthChart: {
    id: "birth-chart",
    name: "Janma Kundali",
    subtitle: "Understand your life's cosmic blueprint through the positions of planets at your birth.",
    path: "/birth-chart",
    category: "astrology",
  },
  compatibility: {
    id: "compatibility",
    name: "Jodi Jyotish",
    subtitle: "Explore your connection, compatibility and relationship harmony through Vedic astrology.",
    path: "/compatibility",
    category: "astrology",
  },
  palm: {
    id: "palm-reading",
    name: "Hasta Rekha",
    subtitle: "Discover what the lines and patterns of your palm reveal in traditional palmistry.",
    path: "/palm-reading",
    category: "astrology",
  },
  ratna: {
    id: "ratna-jyotish",
    name: "Ratna Jyotish",
    subtitle: "Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali.",
    path: "/ratna-jyotish",
    category: "astrology",
  },
  numerology: {
    id: "name-numerology",
    name: "Naamank Jyotish",
    subtitle: "Discover what your name and date of birth reveal through traditional numerology.",
    path: "/name-destiny-report",
    category: "astrology",
  },
  karma: {
    id: "know-your-karma",
    name: "Know Your Karma",
    subtitle: "Reflect on your actions, choices and the karmic patterns shaping your journey.",
    path: "/inner-voice",
    category: "inner-voice",
  },
  guru: {
    id: "ai-guru",
    name: "Divya Margdarshak",
    subtitle: "Find thoughtful spiritual guidance and answers to the questions guiding your life.",
    path: "/inner-voice/chat",
    category: "inner-voice",
  },
  karmaScore: {
    id: "karma-score",
    name: "Karma Sankhya",
    subtitle: "Explore your karma score through your actions, intentions and personal reflections.",
    path: "/inner-voice/dashboard",
    category: "inner-voice",
  },
  futurePath: {
    id: "future-life-path",
    name: "Bhavishya Marg",
    subtitle: "Explore possible life paths and discover traditional astrological insights for your future.",
    path: "/inner-voice/future-path",
    category: "inner-voice",
  },
  shloka: {
    id: "sacred-shloka",
    name: "Divya Shloka",
    subtitle: "Discover sacred verses, their meanings and timeless wisdom for everyday life.",
    path: "/inner-voice/wisdom",
    category: "inner-voice",
  },
} as const satisfies Record<string, FeatureMeta>;

export type FeatureKey = keyof typeof FEATURES;

/** Navigation group labels. "Seva" replaces "Tools" across the site. */
export const ASTROLOGY_SEVA_LABEL = "Astrology Seva";
export const INNER_VOICE_LABEL = "Inner Voice";

/** Navbar order, per group. */
export const ASTROLOGY_SEVA_NAV: FeatureMeta[] = [
  FEATURES.tarot,
  FEATURES.zodiac,
  FEATURES.birthChart,
  FEATURES.compatibility,
  FEATURES.palm,
  FEATURES.ratna,
  FEATURES.numerology,
];

export const INNER_VOICE_NAV: FeatureMeta[] = [
  FEATURES.karma,
  FEATURES.guru,
  FEATURES.karmaScore,
  FEATURES.futurePath,
  FEATURES.shloka,
];

/** Look a feature up by its route (exact match). */
export const featureByPath = (path: string): FeatureMeta | undefined =>
  Object.values(FEATURES).find((f) => f.path === path);
