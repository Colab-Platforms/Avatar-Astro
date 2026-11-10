import i18n from "@/i18n";

// ── Clearly off-topic — ONLY these patterns are rejected ─────────────────────
// Anything not matching here is accepted (spiritual questions are always personal)
const OFF_TOPIC: RegExp[] = [
  // Programming / tech
  /\b(python|javascript|typescript|java|c\+\+|golang|rust|php|ruby|swift|kotlin)\b/i,
  /\b(html|css|sql|react|angular|vue|node\.?js|express|django|flask)\b/i,
  /\b(write.*code|generate.*code|code.*for|debug|compile|syntax error|algorithm)\b/i,
  /\b(create.*website|build.*app|make.*program|develop.*software)\b/i,
  /\b(machine learning|neural network|deep learning|artificial intelligence|chatgpt|openai|gemini)\b/i,
  // Sports / trivia / news
  /\b(ipl|cricket.*score|football.*score|match.*result|sports.*score)\b/i,
  /\b(tell.*joke|jokes|funny story|comedy)\b/i,
  /\b(recipe|how.*cook|cooking.*steps|ingredients)\b/i,
  // Finance/geo facts (not personal)
  /\bgdp\b.*\b(india|country|state)\b/i,
  /\b(stock.*market.*predict|share.*price.*today|nifty.*sensex)\b/i,
  /\b(weather.*forecast|temperature.*today)\b/i,
  /\b(translate.*document|translate.*text)\b/i,
];

/**
 * The guard only turns away messages that are clearly off-topic (code, jokes, recipes, scores...). It no longer rejects a short
 * message: a greeting such as "hi" or a request such as "talk in Tamil" is a real message and goes to the assistant, whose prompt
 * already has a greeting rule. (A word-count rule here used to answer "hi" with the off-topic refusal, so it never reached the AI.)
 */
export function useConsultationGuard() {
  const isAllowedTopic = (text: string): boolean => {
    const q = text.toLowerCase().trim();
    if (!q) return false;
    return !OFF_TOPIC.some((p) => p.test(q));
  };

  /** The refusal, in the language chosen in the MyBhagya selector. */
  const getRejectionMessage = (): string => i18n.t("voice.offTopic");

  return { isAllowedTopic, getRejectionMessage };
}
