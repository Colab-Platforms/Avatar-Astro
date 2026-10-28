import type { RatnaResult } from "./types";

// Session-scoped only: cleared when the tab closes, and whenever a new
// calculation starts. Never put birth details in the URL.
const KEY = "ratna-jyotish:result";

// Results saved by an older build (no `primary`) are ignored, never half-rendered.
const looksLikeResult = (v: unknown): v is RatnaResult => {
  const r = v as RatnaResult | null;
  return (
    !!r &&
    typeof r === "object" &&
    (r.status === "complete" || r.status === "date_based") &&
    !!r.birth &&
    !!r.method &&
    !!r.explanation &&
    !!r.primary?.stone?.key &&
    Array.isArray(r.primary.stone.themes) &&
    (r.status === "complete" ? !!r.recommendation : !!r.dateBased)
  );
};

export const saveResult = (result: RatnaResult): void => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* storage unavailable: router state still carries the result */
  }
};

export const loadResult = (): RatnaResult | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return looksLikeResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const clearResult = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export { looksLikeResult };
