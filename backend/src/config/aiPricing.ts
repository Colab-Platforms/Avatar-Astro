/**
 * Token prices used ONLY to estimate cost when a provider does not report it.
 * Nothing is built in: prices change and an invented price is worse than no price. Configure them in
 * AI_PRICING_JSON as { "<provider>:<model>": { "inputPerM": <USD per 1M input tokens>, "outputPerM": <USD per 1M output tokens> } }.
 * "<provider>:*" applies to every model of that provider. A model with no configured price gets NO cost (null).
 */
export interface Price {
  inputPerM: number;
  outputPerM: number;
}

export function loadPricing(raw = process.env.AI_PRICING_JSON): Record<string, Price> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const out: Record<string, Price> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const i = Number(v?.inputPerM);
      const o = Number(v?.outputPerM);
      if (Number.isFinite(i) && Number.isFinite(o) && i >= 0 && o >= 0) out[k.toLowerCase()] = { inputPerM: i, outputPerM: o };
    }
    return out;
  } catch {
    console.warn("[ai-cost] AI_PRICING_JSON is not valid JSON; estimates are disabled");
    return {};
  }
}

/**
 * OpenRouter publishes every model's price in its public model list (USD per token). It is used ONLY when a response carries
 * tokens but no cost, so the result is an ESTIMATE; a configured AI_PRICING_JSON entry always wins. It is a cache in
 * memory, loaded without any API key, refreshed at most daily, and never required: if it cannot be loaded no estimate is made.
 */
const orCatalogue = new Map<string, Price>();
let orLoadedAt = 0;
let orAttemptAt = 0;
let orInFlight = false;
const DAY = 86_400_000;
const num = (v: unknown) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

export function setOpenRouterCatalogue(models: { id?: unknown; pricing?: { prompt?: unknown; completion?: unknown } }[]): number {
  const next = new Map<string, Price>();
  for (const m of models) {
    const prompt = num(m?.pricing?.prompt), completion = num(m?.pricing?.completion);
    if (typeof m?.id === "string" && prompt !== null && completion !== null) next.set(m.id.toLowerCase(), { inputPerM: prompt * 1e6, outputPerM: completion * 1e6 });
  }
  if (next.size) {
    orCatalogue.clear();
    next.forEach((v, k) => orCatalogue.set(k, v));
    orLoadedAt = Date.now();
  }
  return orCatalogue.size;
}
export const openRouterCatalogueSize = () => orCatalogue.size;
export const resetOpenRouterCatalogue = () => { orCatalogue.clear(); orLoadedAt = 0; orAttemptAt = 0; };

/** Fire-and-forget. `f` must be the ORIGINAL fetch so this lookup is never mistaken for a customer AI call. */
export function ensureOpenRouterCatalogue(f: typeof fetch): void {
  if (process.env.AI_OPENROUTER_PRICING === "off" || orInFlight) return;
  const now = Date.now();
  if (orLoadedAt && now - orLoadedAt < DAY) return;
  if (now - orAttemptAt < 15 * 60_000) return; // after a failure, retry at most every 15 minutes
  orAttemptAt = now;
  orInFlight = true;
  f("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(10_000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: any) => { if (Array.isArray(j?.data)) setOpenRouterCatalogue(j.data); })
    .catch(() => { /* no estimate without a price list; never an error for the customer */ })
    .finally(() => { orInFlight = false; });
}

export function priceFor(provider: string, model: string | null | undefined, table = loadPricing()): Price | null {
  const m = (model ?? "").toLowerCase();
  const configured = table[`${provider}:${m}`] ?? table[`${provider}:*`];
  if (configured) return configured;
  return provider === "openrouter" ? orCatalogue.get(m) ?? null : null;
}

/** USD, or null when the price or either token count is unknown. Never guesses a missing token count. */
export function estimateCostUsd(price: Price | null, inputTokens: number | null, outputTokens: number | null): number | null {
  if (!price || inputTokens == null || outputTokens == null) return null;
  return (inputTokens * price.inputPerM + outputTokens * price.outputPerM) / 1_000_000;
}

/** Display-only conversion; stored costs are always USD. Null unless USD_TO_INR_RATE is configured. */
export function usdToInrRate(): number | null {
  const r = Number(process.env.USD_TO_INR_RATE);
  return Number.isFinite(r) && r > 0 ? r : null;
}
