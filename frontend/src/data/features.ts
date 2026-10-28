import type { LucideIcon } from "lucide-react";
import { Landmark, PartyPopper, Flame, BookOpen, Bell, Music2 } from "lucide-react";

export interface FeaturedSlide {
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

/** The four slides of the Featured carousel. */
export const featuredSlides: FeaturedSlide[] = [
  {
    badge: "Featured",
    title: "AI Birth Chart",
    description:
      "Generate your accurate Kundli in seconds with AI and get detailed planetary insights.",
    buttonLabel: "Generate Your Chart",
    buttonPath: "/birth-chart",
    image: "/images/tools/birth-chart-feature.jpg",
    imageAlt: "A printed natal chart being marked with a pen",
    checklist: [
      "Detailed Planet Positions",
      "Dasha & Predictions",
      "Strengths & Challenges",
      "Remedies & Guidance",
    ],
  },
  {
    badge: "Featured",
    title: "AI Tarot Reading",
    description:
      "Receive AI-powered tarot guidance for love, career, finance, and life's important decisions.",
    buttonLabel: "Start Your Reading",
    buttonPath: "/tarot",
    image: "/images/tools/tarot-feature.jpg",
    imageAlt: "Tarot cards and a lit candle on a wooden table",
    checklist: [
      "Life Timeline 5-card spread",
      "Karma Mirror 3-card reading",
      "Choose your question category",
      "Personalised AI interpretation",
    ],
  },
  {
    badge: "Featured",
    title: "Compatibility Report",
    description:
      "Discover relationship compatibility using advanced astrology matching.",
    buttonLabel: "Check Compatibility",
    buttonPath: "/compatibility",
    image: "/images/tools/compatibility-feature.jpg",
    imageAlt: "A couple sitting across a table by a lake",
    checklist: [
      "Overall compatibility score",
      "Love, chemistry & communication",
      "Green flags & red flags",
      "Marriage-window insight",
    ],
  },
  {
    badge: "Featured",
    title: "AI Palm Reading",
    description:
      "Upload your palm and receive an AI-generated palm analysis.",
    buttonLabel: "Scan Your Palm",
    buttonPath: "/palm-reading",
    image: "/images/tools/palm-reading-feature.jpg",
    imageAlt: "A palm being read during a consultation",
    checklist: [
      "Camera or photo hand scan",
      "Heart, head, life & fate lines",
      "Six planetary mounts",
      "Life-phase timeline",
    ],
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
  title: "AI Guru",
  description:
    "Ask anything, anytime. Get spiritual guidance, answers and clarity from our AI-powered guru.",
  image: "/images/tools/ai-guru.jpg",
  imageAlt: "A man meditating on the riverside steps at Varanasi in the early morning",
  inputPlaceholder: "Ask your question...",
  buttonLabel: "Talk to AI Guru",
  buttonPath: "/inner-voice/chat",
};

export interface DevotionItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export const devotionItems: DevotionItem[] = [
  { label: "Temples", icon: Landmark, path: "/avatar-live/darshan" },
  { label: "Festivals", icon: PartyPopper, path: "/puja" },
  { label: "Daily Aarti", icon: Flame, path: "/avatar-live/darshan" },
  { label: "Spiritual Books", icon: BookOpen, path: "/inner-voice/wisdom" },
  { label: "Puja & Remedies", icon: Bell, path: "/puja" },
  { label: "Mantras & Chants", icon: Music2, path: "/inner-voice/wisdom" },
];

export const devotionFeature = {
  title: "Devotion & Spirituality",
  description:
    "Temples, festivals, daily aarti, spiritual books, remedies and mantras in one place.",
  items: devotionItems,
  buttonLabel: "Explore All",
  buttonPath: "/puja",
};
