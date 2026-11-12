/**
 * Central reward configuration for the shared Reward Points ledger. Every point value is decided here, on the server;
 * no route accepts an amount from the client. To add a feature, add a source and its values here.
 */
export const SOURCES = {
  horoscopeDaily: "horoscope_daily",
  horoscopeMilestone: "horoscope_milestone",
  karmaPractice: "karma_practice",
  karmaMilestone: "karma_milestone",
} as const;
export type Source = (typeof SOURCES)[keyof typeof SOURCES];
export const SOURCE_LIST: Source[] = Object.values(SOURCES);

/** The calendar every "day" is counted in. User accounts store no timezone, and the daily horoscope itself is dated in this zone. */
export const REWARD_TIME_ZONE = "Asia/Kolkata";

/** Streak milestones (consecutive days) and their one-time bonus points. */
export type MilestoneTable = readonly { days: number; bonus: number }[];

export const HOROSCOPE_REWARDS = {
  dailyPoints: 10,
  milestones: [
    { days: 3, bonus: 15 },
    { days: 7, bonus: 30 },
    { days: 14, bonus: 50 },
    { days: 30, bonus: 100 },
    { days: 60, bonus: 200 },
    { days: 100, bonus: 350 },
  ] as MilestoneTable,
} as const;

/**
 * Karma Sankhya practices. Weights are the same as the browser's karmaScore.ts (the 0-100 score is untouched; these are
 * the Reward Points values). The ids are the approved list: anything else is rejected. A parity test keeps the two in step.
 */
export const KARMA_PRACTICES: Readonly<Record<string, number>> = {
  mantra: 8, meditation: 5, truth: 6, feed: 10, fast: 12, pooja: 9, anger: 7, charity: 11,
  surya: 6, tulsi: 4, scripture: 7, bhajan: 5, elders: 6, gratitude: 5, kindword: 4, forgive: 8, yoga: 6, silence: 5, birds: 5, nature: 9,
};

/**
 * A Karma day is a day on which at least one approved practice was recorded in the Reward Points ledger (the same "any practice" rule
 * the on-screen streak uses). Its milestone ladder is separate from the horoscope one: different source, different refKey.
 */
export const KARMA_REWARDS = {
  milestones: [
    { days: 3, bonus: 10 },
    { days: 7, bonus: 25 },
    { days: 14, bonus: 40 },
    { days: 30, bonus: 80 },
    { days: 60, bonus: 150 },
    { days: 100, bonus: 250 },
  ] as MilestoneTable,
} as const;

export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
