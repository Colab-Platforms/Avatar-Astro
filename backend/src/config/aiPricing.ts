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

export function priceFor(provider: string, model: string | null | undefined, table = loadPricing()): Price | null {
  const m = (model ?? "").toLowerCase();
  return table[`${provider}:${m}`] ?? table[`${provider}:*`] ?? null;
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
