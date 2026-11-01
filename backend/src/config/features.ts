/**
 * Registry of the backend features the admin panel can monitor and switch off.
 * `key` is stored in usage events and in the `feature.<key>.enabled` setting.
 * `mount` is where the feature is mounted in index.ts (documentation for admins).
 */
export interface FeatureDef {
  key: string;
  label: string;
  group: "astrology" | "inner-voice";
  mount: string;
  /** Provider the feature depends on, used by the integrations page. */
  provider: "openrouter" | "groq" | "sarvam" | "none";
}

export const FEATURES: FeatureDef[] = [
  { key: "tarot", label: "AI Tarot Reading", group: "astrology", mount: "/api/tarot", provider: "openrouter" },
  { key: "birth-chart", label: "Birth Chart", group: "astrology", mount: "/api/birthchart", provider: "openrouter" },
  { key: "compatibility", label: "Compatibility", group: "astrology", mount: "/api/compatibility", provider: "openrouter" },
  { key: "name-analysis", label: "Name Destiny Report", group: "astrology", mount: "/api/name-analysis", provider: "openrouter" },
  { key: "interpretation", label: "Horoscope & Chart Interpretation", group: "astrology", mount: "/api/interpretation", provider: "openrouter" },
  { key: "palm-reading", label: "Palm Reading", group: "astrology", mount: "/api/palm-reading", provider: "openrouter" },
  { key: "zodiac", label: "Zodiac Signs", group: "astrology", mount: "/api/zodiac", provider: "none" },
  { key: "gemstone", label: "Ratna Jyotish (gemstones)", group: "astrology", mount: "/api/gemstone-calculator", provider: "groq" },
  { key: "ai-chat", label: "AI chat (Know Your Karma, AI Guru, Sacred Shloka)", group: "inner-voice", mount: "/api/ai", provider: "groq" },
  { key: "inner-voice", label: "Future Life Path", group: "inner-voice", mount: "/api/inner-voice", provider: "openrouter" },
  { key: "tts", label: "Voice (text to speech)", group: "inner-voice", mount: "/api/tts", provider: "sarvam" },
];

export const FEATURE_KEYS = new Set(FEATURES.map((f) => f.key));
export const featureLabel = (key: string): string => FEATURES.find((f) => f.key === key)?.label ?? key;
export const featureSettingKey = (key: string): string => `feature.${key}.enabled`;
