/**
 * Personalised explanation. The gemstone is chosen by `recommendation.ts`;
 * this module only words the result. AI output is accepted only if it passes
 * validation against the calculated chart, otherwise a rule-based text built
 * from the same facts is returned. The response always states its source.
 */
import axios from "axios";
import { GEMSTONES, SIGNS, type GemstoneInfo, type Planet, type Sign } from "./gemstone.catalogue.js";
import type { Recommendation } from "./recommendation.js";
import { NAKSHATRAS } from "./analysis.js";

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

/** Disclaimers such as "not a guarantee" are allowed; promises are not. */
const hasOutcomePromise = (t: string) => {
  const withoutDisclaimers = t.replace(
    /\b(not|no|nor|without|never)\b[^.]{0,30}?\b(guarantee[sd]?|promise[sd]?|cure[sd]?)\b/gi,
    "",
  );
  return FORBIDDEN.some((re) => re.test(withoutDisclaimers));
};

export const validateExplanation = (
  text: unknown,
  ctx: ExplanationContext,
): string | null => {
  if (typeof text !== "string") return "not a string";
  const t = text.trim();
  if (t.length < 60 || t.length > 1600) return "length out of range";
  if (hasOutcomePromise(t)) return "contains guaranteed-outcome language";

  const rec = ctx.recommendation;
  const allowedStones = new Set([rec.primary.key, ...rec.secondary.map((s) => s.stone.key)]);
  for (const [re, key] of STONE_PATTERNS) {
    if (re.test(t) && !allowedStones.has(key)) return `mentions unsupported gemstone (${key})`;
  }
  if (!new RegExp(rec.primary.name.split(" or ")[0], "i").test(t)) {
    return "does not mention the calculated Ratna";
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
  const allowedNak = new Set<string>(
    [rec.analysis.primary, ...rec.analysis.alternatives].map((a) => a.profile.nakshatra),
  );
  allowedNak.add(rec.analysis.lagna.nakshatra);
  allowedNak.add(rec.analysis.moon.nakshatra);
  for (const n of NAKSHATRAS) {
    if (new RegExp(`\\b${n}\\b`, "i").test(t) && !allowedNak.has(n)) return `mentions nakshatra not in the chart (${n})`;
  }
  if (/\d+(\.\d+)?\s?(%|percent)|\bshadbala\b|\bstrength score\b/i.test(t)) return "states a strength figure that was not calculated";
  for (const m of t.matchAll(new RegExp(`\\b(${PLANET_RE})\\b[^.]{0,30}?\\b(Mahadasha|Antardasha)\\b`, "g"))) {
    const d = rec.analysis.dasha;
    if (!d || (d.mahadasha.lord !== m[1] && d.antardasha.lord !== m[1])) return `invents a dasha period (${m[1]})`;
  }
  for (const m of t.matchAll(new RegExp(`\\b(Ascendant|Lagna|rising sign)\\b[^.]{0,20}?\\b(${SIGN_RE})\\b`, "gi"))) {
    if (m[2] !== rec.lagnaSign) return "contradicts Ascendant sign";
  }
  return null;
};

export const buildRuleExplanation = (ctx: ExplanationContext): string => {
  const r = ctx.recommendation;
  const parts = [
    `Your Ascendant (Lagna) is ${r.lagnaSign}, whose ruler is ${r.lagnaLord}. Under the Parashari Lagna-lord method, the Ratna traditionally associated with ${r.lagnaLord} is ${r.primary.name}.`,
    `In your chart ${r.lagnaLord} is placed in ${r.lagnaLordSign}, in the ${r.lagnaLordHouse}${suffix(r.lagnaLordHouse)} house, in ${r.analysis.primary.profile.nakshatra} nakshatra (pada ${r.analysis.primary.profile.pada}).`,
  ];
  const dignity = r.analysis.primary.profile.dignity;
  if (dignity !== "not assessed" && dignity !== "neutral sign") parts.push(`${r.lagnaLord} is in ${dignity === "exalted" ? "its sign of exaltation" : dignity === "debilitated" ? "its sign of debilitation" : dignity === "mooltrikona" ? "its mooltrikona sign" : dignity}.`);
  const dn = r.analysis.primary.dashaNote;
  if (dn) parts.push(dn);
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
    lagnaLordNakshatra: `${r.analysis.primary.profile.nakshatra} pada ${r.analysis.primary.profile.pada}`,
    lagnaLordDignity: r.analysis.primary.profile.dignity,
    currentDasha: r.analysis.dasha ? `${r.analysis.dasha.mahadasha.lord} Mahadasha / ${r.analysis.dasha.antardasha.lord} Antardasha` : "not calculated",
    chartReasons: r.analysis.primary.reasons,
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
        "You write short, careful explanations of a Vedic astrology Ratna result. The Ratna is already decided; never suggest another. Use only the supplied facts; never invent planetary positions, signs, nakshatras, dasha periods or strength percentages. Describe the stone as a traditional association. Never promise or guarantee outcomes (wealth, job, marriage, health, luck). Do not give medical advice. Reply as JSON: {\"explanation\": \"<two short paragraphs, 90-150 words>\"}.",
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

/** Asks Groq for wording and returns it only if `validate` accepts it. */
const askGroq = async (
  messages: { role: string; content: string }[],
  validate: (text: unknown) => string | null,
  opts: ExplainOptions,
): Promise<Explanation | { fallbackReason: string }> => {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) return { fallbackReason: "AI explanation not configured" };

  try {
    const post = opts.post ?? axios.post;
    const res = await post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: opts.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages,
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
      return { fallbackReason: "AI returned unparseable output" };
    }
    const problem = validate(parsed?.explanation);
    if (problem) return { fallbackReason: `AI output rejected: ${problem}` };
    return { text: parsed.explanation.trim(), source: "ai" };
  } catch {
    return { fallbackReason: "AI provider unavailable" };
  }
};

export const generateExplanation = async (
  ctx: ExplanationContext,
  opts: ExplainOptions = {},
): Promise<Explanation> => {
  const res = await askGroq(buildPrompt(ctx), (t) => validateExplanation(t, ctx), opts);
  if ("source" in res) return res;
  return { text: buildRuleExplanation(ctx), source: "rules", fallbackReason: res.fallbackReason };
};

/* ------------------------------------------------------------------ */
/* Unknown birth time: wording for the Birth-Date & Place method.      */
/* ------------------------------------------------------------------ */

export interface DateExplanationContext {
  stone: GemstoneInfo;
  weekday: string;
  weekdayLord: Planet;
  /** Only set when the lord's sign did not change during the local date. */
  weekdayLordSign: Sign | null;
  stableSigns: { planet: Planet; sign: Sign }[];
  place: string;
  localDate: string;
}

const WEEKDAY_RE = "Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday";
const CHART_CLAIM_RE = /\b(ascendant|lagna|rising sign|houses?|[0-9]+(?:st|nd|rd|th) house)\b/i;
const NEGATION_RE = /\b(not|no|cannot|can't|without|unknown|neither|nor|isn't|doesn't|does not|unavailable)\b/i;

export const validateDateExplanation = (
  text: unknown,
  ctx: DateExplanationContext,
): string | null => {
  if (typeof text !== "string") return "not a string";
  const t = text.trim();
  if (t.length < 60 || t.length > 1600) return "length out of range";
  if (hasOutcomePromise(t)) return "contains guaranteed-outcome language";

  for (const [re, key] of STONE_PATTERNS) {
    if (re.test(t) && key !== ctx.stone.key) return `mentions unsupported gemstone (${key})`;
  }
  if (!new RegExp(ctx.stone.name.split(" or ")[0], "i").test(t)) {
    return "does not mention the calculated Ratna";
  }

  // Ascendant / house statements are only acceptable as statements of what is NOT known.
  for (const sentence of t.split(/(?<=[.!?])\s+/)) {
    if (CHART_CLAIM_RE.test(sentence) && !NEGATION_RE.test(sentence)) {
      return "claims Ascendant or house information";
    }
  }

  const planetSigns: Partial<Record<Planet, Sign>> = {};
  for (const s of ctx.stableSigns) planetSigns[s.planet] = s.sign;
  const allowedSigns = new Set<string>(Object.values(planetSigns));
  for (const m of t.matchAll(new RegExp(SIGN_RE, "g"))) {
    if (!allowedSigns.has(m[0])) return `mentions sign not established for the date (${m[0]})`;
  }
  for (const m of t.matchAll(new RegExp(`\\b(${PLANET_RE})\\b[^.]{0,25}?\\bin (${SIGN_RE})\\b`, "g"))) {
    const actual = planetSigns[m[1] as Planet];
    if (!actual) return `invents ${m[1]} placement`;
    if (actual !== m[2]) return `contradicts ${m[1]} placement`;
  }
  for (const m of t.matchAll(new RegExp(`\\b(${WEEKDAY_RE})\\b`, "g"))) {
    if (m[1] !== ctx.weekday) return `mentions a different weekday (${m[1]})`;
  }
  return null;
};

export const buildDateRuleExplanation = (ctx: DateExplanationContext): string => {
  const parts = [
    `Using your local birth date and birthplace, you were born on a ${ctx.weekday} (${ctx.localDate}) in ${ctx.place}. In the traditional weekday-ruler convention, ${ctx.weekday} belongs to ${ctx.weekdayLord}, and the Ratna traditionally associated with ${ctx.weekdayLord} is ${ctx.stone.name}.`,
  ];
  if (ctx.weekdayLordSign) {
    parts.push(
      `Across that whole date ${ctx.weekdayLord} stayed in ${ctx.weekdayLordSign} (sidereal zodiac), which is noted as background context only.`,
    );
  }
  parts.push(
    "Because your exact birth time is unknown, no Ascendant or houses were used, so this reading is less specific than a full birth-chart reading. It is a traditional association, not a prediction or a guarantee, and other schools of Vedic astrology may choose a different Ratna.",
  );
  return parts.join(" ");
};

const buildDatePrompt = (ctx: DateExplanationContext) => [
  {
    role: "system",
    content:
      "You write short, careful explanations of a Vedic astrology Ratna result that was chosen from the birth DATE and PLACE only, because the birth time is unknown. The Ratna is already decided by the weekday-ruler rule; never suggest another. Use only the supplied facts; never invent planetary positions, signs, weekdays or timings. Do not mention an Ascendant, rising sign, Lagna or houses except to say they are not known. Say plainly that the reading is less specific than a full birth chart. Describe the stone as a traditional association. Never promise or guarantee outcomes (wealth, job, marriage, health, luck). Do not give medical advice. Reply as JSON: {\"explanation\": \"<two short paragraphs, 90-150 words>\"}.",
  },
  {
    role: "user",
    content: JSON.stringify({
      localBirthDate: ctx.localDate,
      birthplace: ctx.place,
      birthTimeKnown: false,
      weekday: ctx.weekday,
      weekdayRulingPlanet: ctx.weekdayLord,
      rule: "The ruling planet of the local birth weekday gives its traditional Ratna.",
      recommendedGemstone: ctx.stone.name,
      weekdayLordSignAllDay: ctx.weekdayLordSign,
      planetarySignsUnchangedAllDay: ctx.stableSigns.map((s) => `${s.planet} in ${s.sign}`),
    }),
  },
];

export const generateDateExplanation = async (
  ctx: DateExplanationContext,
  opts: ExplainOptions = {},
): Promise<Explanation> => {
  const res = await askGroq(buildDatePrompt(ctx), (t) => validateDateExplanation(t, ctx), opts);
  if ("source" in res) return res;
  return { text: buildDateRuleExplanation(ctx), source: "rules", fallbackReason: res.fallbackReason };
};

export { GEMSTONES };
