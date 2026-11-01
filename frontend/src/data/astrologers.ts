/**
 * Astrologer directory data (single source for the listing and profile pages).
 *
 * IMPORTANT: every entry below is a placeholder profile (`demo: true`) used to build and review the
 * consultation experience. Placeholder profiles are listed only in development builds, never in production. Names, ratings, experience, consultation counts and prices are
 * placeholders, not real people or real credentials, so they must not be published as real astrologers.
 *
 * To go live, replace this array (or load it from the backend) with real, verified astrologers:
 *  - set `demo: false` only for people whose details have been checked,
 *  - set `verified: true` and `recognition` only when that is actually true,
 *  - add a real `photo` URL (a portrait the astrologer has approved) and `gallery` images,
 *  - fill `qualifications` only from supplied documents; leave it empty otherwise.
 */

export type Expertise =
  | "Vedic Astrology"
  | "Tarot Reading"
  | "Prashna Astrology"
  | "Numerology"
  | "Face Reading"
  | "Palmistry"
  | "Relationship Guidance"
  | "Career Guidance"
  | "Horoscope Analysis";

export const EXPERTISE_OPTIONS: Expertise[] = [
  "Vedic Astrology",
  "Tarot Reading",
  "Prashna Astrology",
  "Numerology",
  "Face Reading",
  "Palmistry",
  "Relationship Guidance",
  "Career Guidance",
  "Horoscope Analysis",
];

/** Illustrated portrait used when no approved photo exists. */
export type AvatarStyle = "baba" | "male" | "female";

export type Recognition = "Celebrity" | "Top Choice" | "Rising Star";

export interface Astrologer {
  id: string;
  /** URL slug: /astrologers/:slug */
  slug: string;
  name: string;
  /** Sample profile: details are placeholders and not shown as verified. */
  /** Placeholder profile with invented details. Never published to the public site. */
  demo: boolean;
  verified: boolean;
  recognition: Recognition | null;
  /** Approved portrait URL under /public or https. Null shows a neutral monogram portrait. */
  photo: string | null;
  /** Which illustrated portrait to show while photo is null. */
  avatar: AvatarStyle;
  gallery: string[];
  online: boolean;
  expertise: Expertise[];
  languages: string[];
  experienceYears: number;
  rating: number;
  consultations: number;
  /** Rupees per minute. */
  pricePerMin: number;
  /** Shown struck through only when a genuine earlier price exists. */
  originalPricePerMin: number | null;
  about: string;
  /** Only from supplied documents; empty when unknown. */
  qualifications: string[];
  availability: string;
}

/**
 * Live chat and calls need a consultation service. Until one is connected this stays false and the
 * Chat/Call buttons are not shown at all (nothing implies a working service).
 */
export const CONSULTATION_ENABLED = false;

export const ALL_ASTROLOGERS: Astrologer[] = [
  {
    id: "a1",
    slug: "acharya-vihaan-sharma",
    name: "Acharya Vihaan Sharma",
    demo: true,
    verified: false,
    recognition: null,
    photo: "/images/astrologers/baba3.png",
    avatar: "male",
    gallery: [],
    online: true,
    expertise: ["Vedic Astrology", "Horoscope Analysis", "Career Guidance"],
    languages: ["Hindi", "English", "Sanskrit"],
    experienceYears: 15,
    rating: 4.8,
    consultations: 12000,
    pricePerMin: 25,
    originalPricePerMin: null,
    about:
      "Focuses on reading the Janma Kundali: Lagna, Chandra Rashi, Nakshatra and the Vimshottari dasha, and explaining them in plain language.",
    qualifications: [],
    availability: "weekdays, 10 AM to 8 PM IST.",
  },
  {
    id: "a2",
    slug: "ananya-iyer",
    name: "Ananya Iyer",
    demo: true,
    verified: false,
    recognition: null,
    photo: "/images/astrologers/female1.png",
    avatar: "female",
    gallery: [],
    online: true,
    expertise: ["Tarot Reading", "Relationship Guidance"],
    languages: ["English", "Hindi", "Tamil"],
    experienceYears: 8,
    rating: 4.7,
    consultations: 6400,
    pricePerMin: 18,
    originalPricePerMin: null,
    about:
      "Uses tarot as a way to reflect on relationships and decisions, with a calm, non-predictive approach.",
    qualifications: [],
    availability: "daily, 12 PM to 9 PM IST.",
  },
  {
    id: "a3",
    slug: "pandit-kishore-joshi",
    name: "Pandit Kishore Joshi",
    demo: true,
    verified: false,
    recognition: null,
    photo: "/images/astrologers/baba2.png",
    avatar: "baba",
    gallery: [],
    online: false,
    expertise: ["Prashna Astrology", "Vedic Astrology", "Palmistry"],
    languages: ["Hindi", "Marathi", "English"],
    experienceYears: 22,
    rating: 4.9,
    consultations: 21000,
    pricePerMin: 30,
    originalPricePerMin: null,
    about:
      "Answers specific questions through Prashna (horary) astrology and supports them with palm reading.",
    qualifications: [],
    availability: "Monday to Saturday, 9 AM to 6 PM IST.",
  },
  {
    id: "a4",
    slug: "dr-meera-kulkarni",
    name: "Dr. Meera Kulkarni",
    demo: true,
    verified: false,
    recognition: null,
    photo: "/images/astrologers/female2.png",
    avatar: "female",
    gallery: [],
    online: true,
    expertise: ["Numerology", "Face Reading", "Horoscope Analysis"],
    languages: ["English", "Hindi", "Gujarati"],
    experienceYears: 11,
    rating: 4.6,
    consultations: 4800,
    pricePerMin: 20,
    originalPricePerMin: null,
    about:
      "Works with name and birth-date numerology and face reading, explaining each step of the working.",
    qualifications: [],
    availability: "weekends, 10 AM to 7 PM IST.",
  },
  {
    id: "a5",
    slug: "swami-aditya-rao",
    name: "Swami Aditya Rao",
    demo: true,
    verified: false,
    recognition: null,
    photo: "/images/astrologers/baba1.png",
    avatar: "baba",
    gallery: [],
    online: false,
    expertise: ["Vedic Astrology", "Relationship Guidance", "Career Guidance"],
    languages: ["Hindi", "English", "Kannada", "Telugu"],
    experienceYears: 18,
    rating: 4.8,
    consultations: 15500,
    pricePerMin: 28,
    originalPricePerMin: null,
    about:
      "Looks at marriage and career timing through the dasha periods, with attention to what the chart can and cannot say.",
    qualifications: [],
    availability: "Tuesday to Sunday, 4 PM to 10 PM IST.",
  },
];

/**
 * What visitors see. Placeholder (demo) profiles are internal-preview only: shown in development builds,
 * never in production, so invented names, ratings and availability are not presented as real astrologers.
 * Real, approved profiles (demo: false) are always listed.
 */
export const ASTROLOGERS: Astrologer[] = ALL_ASTROLOGERS.filter((a) => !a.demo || import.meta.env.DEV);

/** True when there is at least one profile to show. */
export const hasAstrologers = (): boolean => ASTROLOGERS.length > 0;

export const getAstrologer = (slug: string | undefined): Astrologer | undefined =>
  ASTROLOGERS.find((a) => a.slug === slug);

export const ALL_LANGUAGES = [...new Set(ASTROLOGERS.flatMap((a) => a.languages))].sort();

/** Sorting is offered only when the numbers are real (not sample placeholders). */
export const hasReliableStats = (list: Astrologer[]): boolean => list.length > 0 && list.every((a) => !a.demo);

export const formatCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k+` : String(n);

export const initials = (name: string): string =>
  name
    .replace(/^(acharya|pandit|dr\.?|swami)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
