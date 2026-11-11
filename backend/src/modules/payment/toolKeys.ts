/** Canonical toolKey identifiers for every premium AI operation — matching the ids already used
 * by the internal AI-cost registry (modules/admin/aiFeatureCost.ts's OPERATIONS[]) so a future
 * price/cost report can join against the same key, not a second parallel naming scheme. */
export const TOOL_KEYS = {
  TAROT_READING: "tarot.reading",
  INTERP_BIRTH_CHART: "interp.birth-chart",
  INTERP_COMPAT: "interp.compat",
  INTERP_CHART_CHAT: "interp.chart-chat",
  BIRTHCHART_ANALYZE: "birthchart.analyze",
  BIRTHCHART_CHAT: "birthchart.chat",
  COMPAT_ANALYZE: "compat.analyze",
  NAME_NARRATIVE: "name.narrative",
  GEMSTONE_EXPLAIN: "gemstone.explain",
  CHAT_KARMA: "chat.karma",
  CHAT_GURU: "chat.guru",
  CHAT_SHLOKA: "chat.shloka",
  IV_DIAGNOSE: "iv.diagnose",
  IV_GURU_CHAT: "iv.guru-chat",
  IV_JOURNAL: "iv.journal",
  IV_WISDOM: "iv.wisdom",
  IV_LIFE_PATH: "iv.life-path",
  TTS_MAIN: "tts.main",
  TTS_INNER_VOICE: "tts.inner-voice",
} as const;

export type ToolKey = (typeof TOOL_KEYS)[keyof typeof TOOL_KEYS];

/** interp.horoscope is deliberately NOT billable: generateAIDailyHoroscope (interpretationController.ts)
 * actually serves `dailyHoroscopeService.ts`'s once-per-sign-per-day cached reading, not a per-request
 * AI call — chatgptService.ts's own generateDailyHoroscope export is unused dead code. Billing a shared
 * daily asset per user request would charge for something that cost nothing marginal to serve.
 *
 * palm.reading is deliberately NOT included: confirmed dormant (Section "Finalized decisions") —
 * excluded from initial launch.
 *
 * birthchart.analyze/chat, compat.analyze, and name.narrative ARE wired below despite being on
 * routes explicitly commented as dormant/not-called-by-the-current-frontend ("do not build on it") —
 * wiring is cheap/harmless (ToolPrice.isActive defaults false) and future-proofs them, but they should
 * stay inactive, same treatment as Palm Reading, until/unless those pages are revived.
 */
export const KARMA_GURU_SHLOKA_TOOL_KEYS: ReadonlySet<string> = new Set([
  TOOL_KEYS.CHAT_KARMA,
  TOOL_KEYS.CHAT_GURU,
  TOOL_KEYS.CHAT_SHLOKA,
]);
