import { FEATURES } from "./featureCatalog";

export interface DevotionSlide {
  /** Small label above the title. */
  badge: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonPath: string;
  /** Path under /public. */
  image: string;
  imageAlt: string;
  checklist: string[];
}

/** The Devotion & Spirituality carousel: Temples, Daily Aarti, Spiritual Books, Mantras & Chants. */
export const devotionSlides: DevotionSlide[] = [
  {
    badge: "Devotion & Spirituality",
    title: "Temples",
    description: "Visit India's sacred temples through live darshan and feel divine blessings from anywhere.",
    buttonLabel: "Watch Live Darshan",
    buttonPath: "/avatar-live/darshan",
    image: "/placeholders/golden-temple.webp",
    imageAlt: "The Golden Temple glowing beside its sacred pool",
    checklist: ["Live darshan from sacred temples", "Watch from anywhere", "Feel the blessings at home"],
  },
  {
    badge: "Devotion & Spirituality",
    title: "Daily Aarti",
    description: "Begin and end your day with devotion by joining the aarti as it happens.",
    buttonLabel: "Join the Aarti",
    buttonPath: "/avatar-live/darshan",
    image: "/placeholders/iskon.webp",
    imageAlt: "A temple lit up for the evening aarti",
    checklist: ["Live aarti from temples", "Simple to join, nothing to install", "A calm start or end to your day"],
  },
  {
    badge: "Devotion & Spirituality",
    title: "Spiritual Books",
    description: "Read sacred verses with their meanings and timeless wisdom for everyday life.",
    buttonLabel: "Read Divya Shloka",
    buttonPath: "/devotion/books",
    image: "/placeholders/guruji.webp",
    imageAlt: "A guru sharing spiritual wisdom",
    checklist: ["Sacred verses and their meanings", "Wisdom for everyday life", "Easy to read and reflect on"],
  },
  {
    badge: "Devotion & Spirituality",
    title: "Mantras & Chants",
    description: "Discover mantras, chants and verses to bring peace and focus to your day.",
    buttonLabel: "Explore Mantras",
    buttonPath: "/devotion/mantras-chants",
    image: "/placeholders/mahalaskhmi-temple.webp",
    imageAlt: "A temple with lamps lit for prayer",
    checklist: ["Mantras and sacred chants", "Verses with their meanings", "Peace and focus through the day"],
  },
];

export interface LiveDarshanFeature {
  title: string;
  liveLabel: string;
  description: string;
  image: string;
  thumbnails: string[];
  buttonLabel: string;
  buttonPath: string;
}

export const liveDarshanFeature: LiveDarshanFeature = {
  title: "Live Darshan",
  liveLabel: "LIVE",
  description:
    "Watch live darshan from India's sacred temples and feel divine blessings from anywhere.",
  image: "/placeholders/golden-temple.webp",
  thumbnails: [
    "/placeholders/iskon.webp",
    "/placeholders/mahalaskhmi-temple.webp",
    "/placeholders/ram-mandir.webp",
  ],
  buttonLabel: "Watch Live",
  buttonPath: "/avatar-live/darshan",
};

export interface AIGuruFeature {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  inputPlaceholder: string;
  buttonLabel: string;
  buttonPath: string;
}

export const aiGuruFeature: AIGuruFeature = {
  title: FEATURES.guru.name,
  description: FEATURES.guru.subtitle,
  image: "/images/tools/ai-guru.jpg",
  imageAlt: "A man meditating on the riverside steps at Varanasi in the early morning",
  inputPlaceholder: "Ask your question...",
  buttonLabel: "Talk to Divya Margdarshak",
  buttonPath: "/inner-voice/chat",
};
