import { OPENROUTER_MODEL } from "@/config/aiModels.js";
import { estimateCostUsd, loadPricing, priceFor, usdToInrRate, type Price } from "@/config/aiPricing.js";

/**
 * AI Feature Cost Breakdown. Pure functions only (no database, no network, no provider call) so every number is testable.
 * Actual figures come from usage_events rows that already carry the provider-reported cost; this module never writes
 * a cost record. Reference prices below are used ONLY to price token counts that were recorded without a cost, and
 * every one of them carries its source and the date it was checked.
 */

export type Classification = "free" | "free-model" | "paid" | "estimated" | "unknown";

export interface ReferenceRate {
  /** USD per 1M tokens (token-billed models). */
  inputPerM?: number;
  outputPerM?: number;
  /** INR per 1,000 characters (character-billed text to speech). Sarvam publishes its price in rupees. */
  inrPer1kChars?: number;
  source: string;
  verifiedAt: string;
}

/** Checked against the provider pages on 2026-10-31. A model that is absent here has NO known price (it is never guessed). */
export const REFERENCE_RATES: Record<string, ReferenceRate> = {
  "openrouter:google/gemma-3-27b-it": { inputPerM: 0.08, outputPerM: 0.35, source: "https://openrouter.ai/api/v1/models (pricing.prompt / pricing.completion)", verifiedAt: "2026-10-31" },
  "openrouter:google/gemma-4-31b-it:free": { inputPerM: 0, outputPerM: 0, source: "https://openrouter.ai/api/v1/models (':free' variant, prompt 0 / completion 0)", verifiedAt: "2026-10-31" },
  "groq:openai/gpt-oss-120b": { inputPerM: 0.15, outputPerM: 0.6, source: "https://console.groq.com/docs/models ($0.15 input / $0.60 output per 1M)", verifiedAt: "2026-10-31" },
  "sarvam:bulbul:v3": { inrPer1kChars: 3, source: "https://www.sarvam.ai/api-pricing (Bulbul V3 text to speech, pay as you go, INR 3.00 per 1,000 characters)", verifiedAt: "2026-10-31" },
};

/** Reference exchange rate, used only when USD_TO_INR_RATE is not configured. */
export const REFERENCE_FX = { rate: 95.073571, asOf: "2026-10-31", source: "https://open.er-api.com/v6/latest/USD" } as const;

export interface FxInfo { rate: number; kind: "configured" | "reference"; asOf: string | null; source: string }
export function resolveFx(configured: number | null = usdToInrRate()): FxInfo {
  if (configured) return { rate: configured, kind: "configured", asOf: null, source: "USD_TO_INR_RATE environment variable" };
  return { rate: REFERENCE_FX.rate, kind: "reference", asOf: REFERENCE_FX.asOf, source: REFERENCE_FX.source };
}

export interface OperationDef {
  id: string;
  feature: string; // usage_events.feature
  label: string; // user-facing feature
  operation: string;
  route: string; // as stored in usage_events.metadata.route
  provider: "openrouter" | "groq" | "sarvam";
  /** Resolved the same way the code does it, so the report shows the model that will actually be requested. */
  model: () => { id: string; from: "code" | "environment" };
  maxOutputTokens?: number;
  /** Character-billed operation: the most characters one request can send. */
  maxChars?: number;
  /** Several user-facing features share this endpoint, so its usage rows cannot be split between them. */
  sharedEndpoint?: boolean;
  note?: string;
}

const fixed = (id: string) => () => ({ id, from: "code" as const });
const OR_FREE = "google/gemma-4-31b-it:free";
const orModel = () => ({ id: OPENROUTER_MODEL, from: process.env.OPENROUTER_MODEL ? ("environment" as const) : ("code" as const) });
/** aiProxyRoutes uses `||`; the gemstone service uses `??`. Both are reproduced exactly. */
const groqOr = (dflt: string) => () => (process.env.GROQ_MODEL ? { id: process.env.GROQ_MODEL, from: "environment" as const } : { id: dflt, from: "code" as const });
const groqNullish = (dflt: string) => () => (process.env.GROQ_MODEL !== undefined ? { id: process.env.GROQ_MODEL, from: "environment" as const } : { id: dflt, from: "code" as const });

/** Every AI-calling operation found in the backend (traced to its handler). Source file noted per entry. */
export const OPERATIONS: OperationDef[] = [
  { id: "tarot.reading", feature: "tarot", label: "Tarot", operation: "Tarot reading", route: "/api/tarot/reading", provider: "openrouter", model: fixed("google/gemma-3-27b-it"), maxOutputTokens: 2000, note: "routes/tarotRoutes.ts (model hard-coded)" },
  { id: "interp.birth-chart", feature: "interpretation", label: "Chart Interpretation", operation: "Birth chart interpretation", route: "/api/interpretation/birth-chart", provider: "openrouter", model: orModel, maxOutputTokens: 1500, note: "services/chatgptService.ts" },
  { id: "interp.horoscope", feature: "interpretation", label: "Daily Horoscope", operation: "Daily horoscope", route: "/api/interpretation/horoscope/:sign", provider: "openrouter", model: orModel, maxOutputTokens: 800, note: "services/chatgptService.ts" },
  { id: "interp.compat", feature: "interpretation", label: "Compatibility", operation: "AI compatibility analysis (interpretation API)", route: "/api/interpretation/compatibility", provider: "openrouter", model: orModel, maxOutputTokens: 1000, note: "services/chatgptService.ts" },
  { id: "interp.chart-chat", feature: "interpretation", label: "Chart Interpretation", operation: "Chart chat", route: "/api/interpretation/chart-chat", provider: "openrouter", model: orModel, maxOutputTokens: 800, note: "controllers/chartChatController.ts" },
  { id: "birthchart.analyze", feature: "birth-chart", label: "Birth Chart", operation: "Birth chart AI analysis", route: "/api/birthchart/analyze", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 1800, note: "routes/birthChartRoutes.ts (model hard-coded)" },
  { id: "birthchart.chat", feature: "birth-chart", label: "Birth Chart", operation: "Birth chart chat", route: "/api/birthchart/chat", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 400, note: "routes/birthChartRoutes.ts (model hard-coded)" },
  { id: "compat.analyze", feature: "compatibility", label: "Compatibility", operation: "Compatibility AI analysis", route: "/api/compatibility/analyze", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 1200, note: "routes/compatibilityRoutes.ts (model hard-coded)" },
  { id: "name.narrative", feature: "name-analysis", label: "Name Analysis", operation: "Name destiny narrative", route: "/api/name-analysis/narrative", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 900, note: "routes/nameAnalysisRoutes.ts (model hard-coded)" },
  { id: "palm.reading", feature: "palm-reading", label: "Palm Reading", operation: "Palm reading (image, server endpoint)", route: "/api/palm-reading", provider: "openrouter", model: fixed("anthropic/claude-3.5-sonnet"), maxOutputTokens: 3000, note: "index.ts. The current Palm Reading page analyses the photo in the browser and does not call this endpoint." },
  { id: "gemstone.explain", feature: "gemstone", label: "Gemstone Calculator", operation: "Gemstone explanation wording", route: "/api/gemstone-calculator/calculate", provider: "groq", model: groqNullish("llama-3.3-70b-versatile"), maxOutputTokens: 500, note: "modules/gemstone/explanation.service.ts. Falls back to rule-based text (no AI call) when GROQ_API_KEY is missing or the reply is rejected." },
  { id: "chat.karma", feature: "ai-chat", label: "Karma", operation: "Know Your Karma reading", route: "/api/ai/chat", provider: "groq", model: groqOr("openai/gpt-oss-120b"), maxOutputTokens: 4000, sharedEndpoint: true, note: "routes/aiProxyRoutes.ts (max_tokens default 1000, capped at 4000)" },
  { id: "chat.guru", feature: "ai-chat", label: "AI Guru", operation: "AI Guru chat", route: "/api/ai/chat", provider: "groq", model: groqOr("openai/gpt-oss-120b"), maxOutputTokens: 4000, sharedEndpoint: true, note: "routes/aiProxyRoutes.ts" },
  { id: "chat.shloka", feature: "ai-chat", label: "Shloka", operation: "Sacred Shloka wisdom", route: "/api/ai/chat", provider: "groq", model: groqOr("openai/gpt-oss-120b"), maxOutputTokens: 4000, sharedEndpoint: true, note: "routes/aiProxyRoutes.ts" },
  { id: "iv.diagnose", feature: "inner-voice", label: "Inner Voice", operation: "Diagnose", route: "/api/inner-voice/diagnose", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 900, note: "routes/innerVoiceRoutes.ts (model hard-coded)" },
  { id: "iv.guru-chat", feature: "inner-voice", label: "Inner Voice", operation: "Guru chat", route: "/api/inner-voice/guru-chat", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 800, note: "routes/innerVoiceRoutes.ts" },
  { id: "iv.journal", feature: "inner-voice", label: "Inner Voice", operation: "Analyze journal", route: "/api/inner-voice/analyze-journal", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 700, note: "routes/innerVoiceRoutes.ts" },
  { id: "iv.wisdom", feature: "inner-voice", label: "Inner Voice", operation: "Wisdom", route: "/api/inner-voice/wisdom", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 900, note: "routes/innerVoiceRoutes.ts" },
  { id: "iv.life-path", feature: "inner-voice", label: "Inner Voice", operation: "Future life path", route: "/api/inner-voice/life-path", provider: "openrouter", model: fixed(OR_FREE), maxOutputTokens: 1200, note: "routes/innerVoiceRoutes.ts" },
  { id: "tts.main", feature: "tts", label: "Text-to-Speech", operation: "Voice (text to speech)", route: "/api/tts", provider: "sarvam", model: fixed("bulbul:v3"), maxChars: 500, note: "index.ts. Billed per character; the text is cut to 500 characters." },
  { id: "tts.inner-voice", feature: "inner-voice", label: "Text-to-Speech", operation: "Inner Voice mantra voice", route: "/api/inner-voice/tts", provider: "sarvam", model: fixed("bulbul:v3"), maxChars: 500, note: "routes/innerVoiceRoutes.ts. Billed per character; the text is cut to 500 characters." },
];

/** Features whose request path makes no AI/provider call at all. */
export const FREE_OPERATIONS: { id: string; feature: string; label: string; operation: string; note: string }[] = [
  { id: "free.birth-chart-calc", feature: "birth-chart", label: "Birth Chart", operation: "Chart calculation", note: "Astronomical calculation on the server" },
  { id: "free.compat-calc", feature: "compatibility", label: "Compatibility", operation: "Guna Milan score", note: "Rule-based calculation" },
  { id: "free.name-calc", feature: "name-analysis", label: "Name Analysis", operation: "Numerology calculation", note: "Rule-based calculation" },
  { id: "free.gemstone-calc", feature: "gemstone", label: "Gemstone Calculator", operation: "Recommendation calculation", note: "Rule-based; only the wording step above can call Groq" },
  { id: "free.zodiac", feature: "zodiac", label: "Zodiac Signs", operation: "Zodiac data", note: "Static data" },
  { id: "free.palm-browser", feature: "palm-reading", label: "Palm Reading", operation: "Palm Reading page (in-browser analysis)", note: "Photo is analysed in the browser; no server or provider call" },
];

/** Aggregated usage_events rows for one (feature, route, provider, model). */
export interface ObservedGroup {
  feature: string;
  route: string | null;
  provider: string | null;
  model: string | null;
  requests: number;
  calls: number;
  failed: number;
  actualRequests: number;
  actualUsd: number;
  estimatedRequests: number;
  estimatedUsd: number;
  /** requests that reported both token counts and have no stored cost, with the token totals */
  tokenOnlyRequests: number;
  tokenOnlyInput: number;
  tokenOnlyOutput: number;
  /** requests that reported both token counts (any cost state), with the token totals */
  tokenRequests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CostRow {
  id: string;
  feature: string;
  label: string;
  operation: string;
  route: string | null;
  provider: string | null;
  model: string | null;
  modelFrom: "code" | "environment" | "recorded" | null;
  classification: Classification;
  /** how the per-generation number was obtained; null when there is none */
  costBasis: "actual" | "estimated" | "bounded" | null;
  reason: string;
  requests: number;
  avgCalls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costPerGenerationUsd: number | null;
  costPerGenerationInr: number | null;
  cost100Usd: number | null;
  cost100Inr: number | null;
  cost1000Usd: number | null;
  cost1000Inr: number | null;
  /** character-billed operations: the most one request can cost (text is capped) */
  maxCostPerGenerationUsd: number | null;
  rate: { inputPerM: number | null; outputPerM: number | null; inrPer1kChars: number | null; source: string; verifiedAt: string | null } | null;
  sharedEndpoint: boolean;
  note: string | null;
}

export const scale = (v: number | null, n: number) => (v == null ? null : v * n);
export const usdToInr = (usd: number | null, rate: number) => (usd == null ? null : usd * rate);

/** `origin` says where a price came from so the report never claims a source it did not use. */
function rateFor(provider: string, model: string | null): { price: Price | null; ref: ReferenceRate | null; origin: "configured" | "live-list" | "reference" | null } {
  const table = loadPricing();
  const m = (model ?? "").toLowerCase();
  const fromTable = table[`${provider}:${m}`] ?? table[`${provider}:*`];
  const found = priceFor(provider, model);
  const ref = REFERENCE_RATES[`${provider}:${m}`] ?? null;
  if (found) return { price: found, ref: null, origin: fromTable ? "configured" : "live-list" };
  if (ref && ref.inputPerM !== undefined && ref.outputPerM !== undefined) return { price: { inputPerM: ref.inputPerM, outputPerM: ref.outputPerM }, ref, origin: "reference" };
  return { price: null, ref, origin: null };
}

const isZero = (p: Price) => p.inputPerM === 0 && p.outputPerM === 0;

/** Builds one row from an operation definition (or an unlisted observed group) and what has been recorded for it. */
export function buildRow(
  def: { id: string; feature: string; label: string; operation: string; route: string | null; provider: string | null; maxChars?: number; sharedEndpoint?: boolean; note?: string | null },
  model: { id: string | null; from: CostRow["modelFrom"] },
  g: ObservedGroup | null,
  fx: FxInfo,
): CostRow {
  const provider = def.provider;
  const base: CostRow = {
    id: def.id, feature: def.feature, label: def.label, operation: def.operation, route: def.route, provider, model: model.id, modelFrom: model.from,
    classification: "unknown", costBasis: null, reason: "", requests: g?.requests ?? 0, avgCalls: g && g.requests ? g.calls / g.requests : null,
    inputTokens: null, outputTokens: null, totalTokens: null, costPerGenerationUsd: null, costPerGenerationInr: null, cost100Usd: null, cost100Inr: null,
    cost1000Usd: null, cost1000Inr: null, maxCostPerGenerationUsd: null, rate: null, sharedEndpoint: !!def.sharedEndpoint, note: def.note ?? null,
  };
  const SHARED = " Karma, AI Guru and Shloka share one endpoint and usage is not recorded per feature, so this is the shared average, not a per-feature figure.";
  const finish = (usd: number | null, basis: CostRow["costBasis"], classification: Classification, reason: string): CostRow => ({
    ...base, classification, costBasis: basis, reason: def.sharedEndpoint ? reason + SHARED : reason, costPerGenerationUsd: usd, costPerGenerationInr: usdToInr(usd, fx.rate),
    cost100Usd: scale(usd, 100), cost100Inr: usdToInr(scale(usd, 100), fx.rate), cost1000Usd: scale(usd, 1000), cost1000Inr: usdToInr(scale(usd, 1000), fx.rate),
  });
  if (!provider) return { ...finish(0, null, "free", "No AI or provider call on this path."), costPerGenerationUsd: 0, costPerGenerationInr: 0, cost100Usd: 0, cost100Inr: 0, cost1000Usd: 0, cost1000Inr: 0 };

  const { price, ref, origin } = rateFor(provider, model.id);
  const configured = origin === "configured";
  const rate: CostRow["rate"] = price || ref
    ? { inputPerM: price?.inputPerM ?? null, outputPerM: price?.outputPerM ?? null, inrPer1kChars: ref?.inrPer1kChars ?? null, source: origin === "configured" ? "AI_PRICING_JSON (configured)" : origin === "live-list" ? "OpenRouter public price list (fetched live by the server)" : ref!.source, verifiedAt: origin === "reference" ? ref!.verifiedAt : null }
    : null;
  base.rate = rate;

  // Observed averages (requests that reported both token counts).
  if (g && g.tokenRequests > 0) {
    base.inputTokens = g.inputTokens / g.tokenRequests;
    base.outputTokens = g.outputTokens / g.tokenRequests;
    base.totalTokens = base.inputTokens + base.outputTokens;
  }

  // Character-billed (text to speech): the price is per character and the character count is not recorded.
  if (ref?.inrPer1kChars !== undefined && !price) {
    const maxUsd = def.maxChars ? (def.maxChars / 1000) * ref.inrPer1kChars / fx.rate : null;
    return { ...finish(null, null, "unknown", `Billed per character (INR ${ref.inrPer1kChars.toFixed(2)} per 1,000). Characters per request are not recorded, so the real average is unknown.${maxUsd != null ? " The ceiling per request is shown instead." : ""}`), maxCostPerGenerationUsd: maxUsd };
  }

  // Provider-reported cost on recorded requests wins over every calculation.
  if (g && g.actualRequests > 0) {
    const avg = g.actualUsd / g.actualRequests;
    if (avg === 0 && price && isZero(price)) return finish(0, "actual", "free-model", "Free model; the provider reported $0 on recorded requests.");
    return finish(avg, "actual", "paid", `Average of ${g.actualRequests} request${g.actualRequests === 1 ? "" : "s"} whose cost the provider reported.${g.estimatedRequests ? " Some other requests were priced by estimate and are not in this figure." : ""}`);
  }
  if (price && isZero(price)) return finish(0, null, "free-model", "Free model: the verified price is $0 for input and output.");
  if (g && g.estimatedRequests > 0) {
    return finish(g.estimatedUsd / g.estimatedRequests, "estimated", "estimated", `Average of ${g.estimatedRequests} request${g.estimatedRequests === 1 ? "" : "s"} priced as tokens x configured price.`);
  }
  if (price && g && g.tokenRequests > 0) {
    const usd = estimateCostUsd(price, base.inputTokens, base.outputTokens);
    return finish(usd, "estimated", "estimated", `Average ${Math.round(base.inputTokens!)} input + ${Math.round(base.outputTokens!)} output tokens x ${configured ? "the configured" : "the verified"} price.`);
  }
  if (!price) return finish(null, null, "unknown", "No verified price for this model, and the provider reported no cost. Add it to AI_PRICING_JSON once you have confirmed it.");
  return finish(null, null, "unknown", "Price is known, but no request has been recorded with token counts yet.");
}

export interface ReportFilters { feature?: string; provider?: string; model?: string }

export interface FeatureCostReport {
  fx: FxInfo;
  pricingVerifiedAt: string;
  rows: CostRow[];
  counts: Record<Classification, number>;
  totals: { actualUsd: number; actualInr: number; estimatedUsd: number; estimatedInr: number; requestsWithActual: number; requestsWithEstimate: number; unpricedRequests: number };
  providerModel: { provider: string; model: string; operations: number; requests: number; actualUsd: number; estimatedUsd: number }[];
  formula: string;
}

/** Sums over distinct observed groups (never over rows) so a shared endpoint is not counted once per feature name. */
export function buildReport(groups: ObservedGroup[], filters: ReportFilters = {}, fx: FxInfo = resolveFx()): FeatureCostReport {
  const used = new Set<ObservedGroup>();
  const byRoute = (op: OperationDef) => groups.filter((g) => g.feature === op.feature && g.route === op.route);
  const rows: CostRow[] = [];

  for (const op of OPERATIONS) {
    const mine = byRoute(op);
    const expected = op.model();
    const defBase = { id: op.id, feature: op.feature, label: op.label, operation: op.operation, route: op.route, provider: op.provider as string | null, maxChars: op.maxChars, sharedEndpoint: op.sharedEndpoint, note: op.note };
    if (!mine.length) { rows.push(buildRow(defBase, expected, null, fx)); continue; }
    for (const g of mine) {
      used.add(g);
      rows.push(buildRow({ ...defBase, provider: g.provider ?? op.provider }, g.model ? { id: g.model, from: g.model.toLowerCase() === expected.id.toLowerCase() ? expected.from : "recorded" } : expected, g, fx));
    }
  }
  for (const f of FREE_OPERATIONS) rows.push(buildRow({ ...f, route: null, provider: null }, { id: null, from: null }, null, fx));
  // Recorded AI usage on a route this catalogue does not know about: still shown, never dropped.
  for (const g of groups) {
    if (used.has(g) || OPERATIONS.some((o) => o.feature === g.feature && o.route === g.route)) continue;
    used.add(g);
    rows.push(buildRow({ id: `observed.${g.feature}.${g.route ?? "unknown"}`, feature: g.feature, label: g.feature, operation: "Not in the operation catalogue", route: g.route, provider: g.provider }, { id: g.model, from: "recorded" }, g, fx));
  }

  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (!norm(filters.feature) || r.feature === norm(filters.feature)) &&
    (!norm(filters.provider) || norm(r.provider ?? "none") === norm(filters.provider)) &&
    (!norm(filters.model) || norm(r.model ?? "").includes(norm(filters.model))),
  );

  const counts: FeatureCostReport["counts"] = { free: 0, "free-model": 0, paid: 0, estimated: 0, unknown: 0 };
  for (const r of filtered) counts[r.classification]++;

  let actualUsd = 0, estimatedUsd = 0, requestsWithActual = 0, requestsWithEstimate = 0, unpriced = 0;
  const pm = new Map<string, FeatureCostReport["providerModel"][number]>();
  const visible = groups.filter((g) => filtered.some((r) => r.feature === g.feature && r.route === g.route && (!g.model || norm(r.model ?? "") === norm(g.model))));
  for (const g of new Set(visible)) {
    const { price } = rateFor(g.provider ?? "", g.model);
    // Stored estimates, plus a verified-price estimate for requests that have tokens but no stored cost.
    const tokenOnlyEstimate = price && g.tokenOnlyRequests ? estimateCostUsd(price, g.tokenOnlyInput, g.tokenOnlyOutput) ?? 0 : 0;
    const est = g.estimatedUsd + tokenOnlyEstimate;
    actualUsd += g.actualUsd;
    estimatedUsd += est;
    requestsWithActual += g.actualRequests;
    requestsWithEstimate += g.estimatedRequests + (price ? g.tokenOnlyRequests : 0);
    unpriced += g.requests - g.actualRequests - g.estimatedRequests - (price ? g.tokenOnlyRequests : 0);
    const key = `${g.provider ?? "unknown"}|${g.model ?? "unknown"}`;
    const cur = pm.get(key) ?? { provider: g.provider ?? "unknown", model: g.model ?? "unknown", operations: 0, requests: 0, actualUsd: 0, estimatedUsd: 0 };
    cur.requests += g.requests; cur.actualUsd += g.actualUsd; cur.estimatedUsd += est;
    pm.set(key, cur);
  }
  for (const r of filtered) if (r.provider && r.model) { const c = pm.get(`${r.provider}|${r.model}`) ?? { provider: r.provider, model: r.model, operations: 0, requests: 0, actualUsd: 0, estimatedUsd: 0 }; c.operations++; pm.set(`${r.provider}|${r.model}`, c); }

  const dates = Object.values(REFERENCE_RATES).map((r) => r.verifiedAt).sort();
  return {
    fx,
    pricingVerifiedAt: dates[dates.length - 1] ?? "",
    rows: filtered,
    counts,
    totals: { actualUsd, actualInr: actualUsd * fx.rate, estimatedUsd, estimatedInr: estimatedUsd * fx.rate, requestsWithActual, requestsWithEstimate, unpricedRequests: Math.max(0, unpriced) },
    providerModel: [...pm.values()].sort((a, b) => b.actualUsd + b.estimatedUsd - (a.actualUsd + a.estimatedUsd) || a.provider.localeCompare(b.provider)),
    formula: "Cost = (input tokens x input price + output tokens x output price) / 1,000,000",
  };
}

export const FEATURE_COST_CSV_HEADERS = [
  "feature", "operation", "route", "provider", "model", "classification", "cost_basis", "requests", "avg_input_tokens", "avg_output_tokens", "avg_total_tokens",
  "cost_per_generation_usd", "cost_per_generation_inr", "cost_100_usd", "cost_100_inr", "cost_1000_usd", "cost_1000_inr", "max_cost_per_generation_usd",
  "input_price_per_m_usd", "output_price_per_m_usd", "inr_per_1k_chars", "price_source", "price_verified", "usd_to_inr", "fx_kind", "fx_as_of", "reason",
];

export function featureCostCsvRows(rep: FeatureCostReport): (string | number | null)[][] {
  const n = (v: number | null, d = 8) => (v == null ? "" : Number(v.toFixed(d)));
  return rep.rows.map((r) => [
    r.label, r.operation, r.route, r.provider ?? "none", r.model, r.classification, r.costBasis, r.requests,
    r.inputTokens == null ? "" : Math.round(r.inputTokens), r.outputTokens == null ? "" : Math.round(r.outputTokens), r.totalTokens == null ? "" : Math.round(r.totalTokens),
    n(r.costPerGenerationUsd), n(r.costPerGenerationInr, 6), n(r.cost100Usd), n(r.cost100Inr, 4), n(r.cost1000Usd), n(r.cost1000Inr, 4), n(r.maxCostPerGenerationUsd),
    r.rate?.inputPerM ?? "", r.rate?.outputPerM ?? "", r.rate?.inrPer1kChars ?? "", r.rate?.source ?? "", r.rate?.verifiedAt ?? "",
    rep.fx.rate, rep.fx.kind, rep.fx.asOf ?? "", r.reason,
  ]);
}
