/** Features whose generated output is kept in the user's reading library. Keys are validated against this list on every write. */
export const READING_FEATURES = {
  tarot: "Tarot",
  horoscope: "Daily Horoscope",
  "birth-chart": "Birth Chart",
  compatibility: "Compatibility",
  "name-analysis": "Name Analysis",
  "palm-reading": "Palm Reading",
  gemstone: "Gemstone (Ratna Jyotish)",
  karma: "Know Your Karma",
  shloka: "Sacred Shloka",
  "life-path": "Future Life Path",
  journal: "Journal Insight",
  "guru-report": "AI Guru Report",
} as const;
export type ReadingFeature = keyof typeof READING_FEATURES;
export const READING_FEATURE_KEYS = Object.keys(READING_FEATURES) as ReadingFeature[];
export const isReadingFeature = (v: unknown): v is ReadingFeature => typeof v === "string" && v in READING_FEATURES;

/** Conversational features whose messages are kept. */
export const CONVERSATION_FEATURES = { "ai-guru": "AI Guru", "inner-voice": "Inner Voice" } as const;
export type ConversationFeature = keyof typeof CONVERSATION_FEATURES;
export const isConversationFeature = (v: unknown): v is ConversationFeature => typeof v === "string" && v in CONVERSATION_FEATURES;

export const ACTIVITY_KINDS = [
  "reading.generated",
  "reading.saved",
  "reading.unsaved",
  "reading.removed",
  "conversation.started",
  "conversation.continued",
  "conversation.removed",
  "feature.opened",
  "profile.updated",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  "reading.generated": "Reading generated",
  "reading.saved": "Reading saved",
  "reading.unsaved": "Reading unsaved",
  "reading.removed": "Reading removed",
  "conversation.started": "Conversation started",
  "conversation.continued": "Conversation continued",
  "conversation.removed": "Conversation removed",
  "feature.opened": "Feature opened",
  "profile.updated": "Profile updated",
};

/** Label for any feature key the dashboard can show. */
export const featureName = (key: string | null | undefined): string => {
  if (!key) return "Account";
  if (key in READING_FEATURES) return READING_FEATURES[key as ReadingFeature];
  if (key in CONVERSATION_FEATURES) return CONVERSATION_FEATURES[key as ConversationFeature];
  return key;
};
