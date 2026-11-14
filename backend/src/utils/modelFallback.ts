/**
 * OpenRouter's shared free pool and some paid models fail for a moment (429 rate limit, 502/503 upstream error, a hung request).
 * One call to one model is then a user-facing error. These helpers let a route try a second, different model before giving up.
 */
const FREE_MODEL = "google/gemma-4-31b-it:free";
const STABLE_MODEL = "google/gemma-3-27b-it"; // paid, priced in aiFeatureCost, and far less often rate limited than the free pool

/** True for failures worth trying another model for: rate limits, upstream/server errors and timeouts. Never for bad requests or auth. */
export function isRetryableProviderFailure(statusOrError: unknown): boolean {
  if (typeof statusOrError === "number") return statusOrError === 429 || statusOrError >= 500;
  const e = statusOrError as { name?: string; status?: number } | null;
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return true;
  return typeof e?.status === "number" && isRetryableProviderFailure(e.status);
}

/** The model to fall back to for `primary`: OPENROUTER_FALLBACK_MODEL if set, otherwise a different known-good model. Null if there is none. */
export function fallbackModelFor(primary: string, env: Record<string, string | undefined> = process.env): string | null {
  const configured = env.OPENROUTER_FALLBACK_MODEL?.trim();
  const pick = configured || (primary === STABLE_MODEL ? FREE_MODEL : primary === FREE_MODEL ? STABLE_MODEL : STABLE_MODEL);
  return pick && pick !== primary ? pick : null;
}
