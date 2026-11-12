/**
 * Single source of truth for the user-facing names and subtitles of the twelve
 * astrology and Inner Voice Seva. Routes and ids are unchanged; only the display
 * language lives here. Use this everywhere a feature name or subtitle is shown.
 */

import i18n from "@/i18n";

/** Subtitle in the chosen language (features.<id>.subtitle); the English below is the fallback. Read at render time, so it follows the language. */
const localizedSubtitle = (id: string, english: string): string => i18n.t(`features.${id}.subtitle`, { defaultValue: english });

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
    name: "Tarot Prediction",
    subtitle: "Discover the messages within the cards and find clarity for the questions on your mind.",
    path: "/tarot",
    category: "astrology",
  },
  zodiac: {
    id: "zodiac",
    name: "Daily Horoscope",
    get subtitle() {
      return localizedSubtitle("zodiac", "Explore your zodiac sign, planetary influences and the qualities that shape your personality.");
    },
    path: "/zodiac",
    category: "astrology",
  },
  birthChart: {
    id: "birth-chart",
    name: "Janma Kundali",
    get subtitle() {
      return localizedSubtitle("birth-chart", "Understand your life's cosmic blueprint through the positions of planets at your birth.");
    },
    path: "/birth-chart",
    category: "astrology",
  },
  compatibility: {
    id: "compatibility",
    name: "Love Compatibility",
    get subtitle() {
      return localizedSubtitle("compatibility", "Explore your connection, compatibility and relationship harmony through Vedic astrology.");
    },
    path: "/compatibility",
    category: "astrology",
  },
  palm: {
    id: "palm-reading",
    name: "Hasta Rekha (Palmistry)",
    subtitle: "Discover what the lines and patterns of your palm reveal in traditional palmistry.",
    path: "/palm-reading",
    category: "astrology",
  },
  ratna: {
    id: "ratna-jyotish",
    name: "Ratna Jyotish (Lucky Gemstone)",
    subtitle: "Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali.",
    path: "/ratna-jyotish",
    category: "astrology",
  },
  numerology: {
    id: "name-numerology",
    name: "Namank Jyotish (Lucky Name)",
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

/**
 * Baby Name Jyotish. Defined beside, not inside, FEATURES: that object is the approved twelve and a test locks its size.
 * It is listed in the Astrology Seva navigation and has a card in the home-page Astrology Seva grid.
 */
export const BABY_NAME_FEATURE = {
  id: "baby-name-jyotish",
  name: "Baby Name Jyotish",
  subtitle: "Discover a meaningful name for your little one through Nakshatra and Vedic naming traditions.",
  path: "/baby-name-jyotish",
  category: "astrology",
} as const satisfies FeatureMeta;

/** Lucky Vehicle Number (Vahana Ank Jyotish). Defined beside FEATURES for the same reason as Baby Name Jyotish. */
export const LUCKY_VEHICLE_FEATURE = {
  id: "lucky-vehicle-number",
  name: "Lucky Vehicle Number",
  subtitle: "Find meaningful vehicle number combinations inspired by your birth details and traditional numerology.",
  path: "/lucky-vehicle-number",
  category: "astrology",
} as const satisfies FeatureMeta;

/**
 * Muhurat Finder. Defined beside FEATURES for the same reason as the two above. It is listed in the Astrology Seva navigation
 * and has a card in the home-page Astrology Seva grid.
 */
export const MUHURAT_FEATURE = {
  id: "muhurat-finder",
  name: "Muhurat Finder",
  subtitle: "Find an auspicious time for life's important beginnings.",
  path: "/muhurat-finder",
  category: "astrology",
} as const satisfies FeatureMeta;

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
  BABY_NAME_FEATURE,
  LUCKY_VEHICLE_FEATURE,
  MUHURAT_FEATURE,
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
