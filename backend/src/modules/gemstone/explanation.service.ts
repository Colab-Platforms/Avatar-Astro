/**
 * Personalised explanation. The gemstone is chosen by `recommendation.ts`;
 * this module only words the result. AI output is accepted only if it passes
 * validation against the calculated chart, otherwise a rule-based text built
 * from the same facts is returned. The response always states its source.
 */
import axios from "axios";
import { GEMSTONES, SIGNS, type Planet, type Sign } from "./gemstone.catalogue.js";
import type { Recommendation } from "./recommendation.js";

export interface ExplanationContext {
  recommendation: Recommendation;
  planetSigns: Partial<Record<Planet, Sign>>;
}

export interface Explanation {
  text: string;
  source: "ai" | "rules";
  /** Why AI output was not used (rules source only). */
  fallbackReason?: string;
}

const PLANET_RE = "Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu";
const SIGN_RE = SIGNS.join("|");

const STONE_PATTERNS: [RegExp, string][] = [
  [/\bruby\b/i, "ruby"],
  [/\bpearl\b/i, "pearl"],
  [/\b(red )?coral\b/i, "red-coral"],
  [/\bemerald\b/i, "emerald"],
  [/\byellow sapphire\b/i, "yellow-sapphire"],
  [/\bblue sapphire\b/i, "blue-sapphire"],
  [/\b(diamond|white sapphire)\b/i, "diamond"],
  [/\b(hessonite|gomed)\b/i, "hessonite"],
  [/\bcat'?s[- ]?eye\b/i, "cats-eye"],
];

const FORBIDDEN: RegExp[] = [
  /\bguarantee/i,
  /\bwill (definitely|certainly|surely|bring|ensure|make you|cure|heal|protect)/i,
  /\b(cure|cures|cured|heal|heals)\b/i,
  /\b(100%|assured|promise[sd]?)\b/i,
  /\b(get(ting)? (a )?(job|promotion|married)|win the lottery|become rich)\b/i,
  /\b(scientifically proven|clinically)\b/i,
];

export const validateExplanation = (
  text: unknown,
  ctx: ExplanationContext,
): string | null => {
  if (typeof text !== "string") return "not a string";
  const t = text.trim();
  if (t.length < 60 || t.length > 1600) return "length out of range";
  // Disclaimers such as "not a guarantee" are allowed; promises are not.
  const withoutDisclaimers = t.replace(
    /\b(not|no|nor|without|never)\b[^.]{0,30}?\b(guarantee[sd]?|promise[sd]?|cure[sd]?)\b/gi,
    "",
  );
  if (FORBIDDEN.some((re) => re.test(withoutDisclaimers))) {
    return "contains guaranteed-outcome language";
  }

  const rec = ctx.recommendation;
  const allowedStones = new Set([rec.primary.key, ...rec.secondary.map((s) => s.stone.key)]);
  for (const [re, key] of STONE_PATTERNS) {
    if (re.test(t) && !allowedStones.has(key)) return `mentions unsupported gemstone (${key})`;
  }
  if (!new RegExp(rec.primary.name.split(" or ")[0], "i").test(t)) {
    return "does not mention the calculated gemstone";
  }

  const allowedSigns = new Set<string>([
    rec.lagnaSign,
    rec.lagnaLordSign,
    ...rec.secondary.map((s) => s.sign),
    ...Object.values(ctx.planetSigns),
  ]);
  for (const m of t.matchAll(new RegExp(SIGN_RE, "g"))) {
    if (!allowedSigns.has(m[0])) return `mentions sign not in the chart (${m[0]})`;
  }
  for (const m of t.matchAll(new RegExp(`\\b(${PLANET_RE})\\b[^.]{0,25}?\\bin (${SIGN_RE})\\b`, "g"))) {
    const actual = ctx.planetSigns[m[1] as Planet];
    if (actual && actual !== m[2]) return `contradicts ${m[1]} placement`;
    if (!actual) return `invents ${m[1]} placement`;
  }
  for (const m of t.matchAll(new RegExp(`\\b(Ascendant|Lagna|rising sign)\\b[^.]{0,20}?\\b(${SIGN_RE})\\b`, "gi"))) {
    if (m[2] !== rec.lagnaSign) return "contradicts Ascendant sign";
  }
  return null;
};

export const buildRuleExplanation = (ctx: ExplanationContext): string => {
  const r = ctx.recommendation;
  const parts = [
    `Your Ascendant (Lagna) is ${r.lagnaSign}, whose ruler is ${r.lagnaLord}. Under the Parashari Lagna-lord method, the gemstone traditionally associated with ${r.lagnaLord} is ${r.primary.name}.`,
    `In your chart ${r.lagnaLord} is placed in ${r.lagnaLordSign}, in the ${r.lagnaLordHouse}${suffix(r.lagnaLordHouse)} house.`,
  ];
  if (r.secondary.length > 0) {
    parts.push(
      `As optional secondary perspectives, ${r.secondary
        .map((s) => `${s.planet} (${s.house}${suffix(s.house)} house lord, associated with ${s.stone.name})`)
        .join(" and ")} are also noted. These are not required.`,
    );
  }
  parts.push(
    "This is a traditional association, not a prediction or a guarantee. Other schools of Vedic astrology may weigh the chart differently.",
  );
  return parts.join(" ");
};

const suffix = (n: number) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

const buildPrompt = (ctx: ExplanationContext) => {
  const r = ctx.recommendation;
  const facts = {
    ascendant: r.lagnaSign,
    lagnaLord: r.lagnaLord,
    lagnaLordSign: r.lagnaLordSign,
    lagnaLordHouse: r.lagnaLordHouse,
    recommendedGemstone: r.primary.name,
    secondaryPerspectives: r.secondary.map((s) => ({
      house: s.house,
      planet: s.planet,
      gemstone: s.stone.name,
    })),
    cautions: r.cautions,
  };
  return [
    {
      role: "system",
      content:
        "You write short, careful explanations of a Vedic astrology gemstone result. The gemstone is already decided; never suggest another. Use only the supplied facts; never invent planetary positions or signs. Describe the stone as a traditional association. Never promise or guarantee outcomes (wealth, job, marriage, health, luck). Do not give medical advice. Reply as JSON: {\"explanation\": \"<two short paragraphs, 90-150 words>\"}.",
    },
    { role: "user", content: JSON.stringify(facts) },
  ];
};

export interface ExplainOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  post?: typeof axios.post;
}

export const generateExplanation = async (
  ctx: ExplanationContext,
  opts: ExplainOptions = {},
): Promise<Explanation> => {
  const rules = (fallbackReason: string): Explanation => ({
    text: buildRuleExplanation(ctx),
    source: "rules",
    fallbackReason,
  });
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) return rules("AI explanation not configured");

  try {
    const post = opts.post ?? axios.post;
    const res = await post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: opts.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: buildPrompt(ctx),
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: opts.timeoutMs ?? 8000,
      },
    );
    const content: unknown = res.data?.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(String(content));
    } catch {
      return rules("AI returned unparseable output");
    }
    const problem = validateExplanation(parsed?.explanation, ctx);
    if (problem) return rules(`AI output rejected: ${problem}`);
    return { text: parsed.explanation.trim(), source: "ai" };
  } catch {
    return rules("AI provider unavailable");
  }
};

export { GEMSTONES };
