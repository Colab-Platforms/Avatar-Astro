import type { RatnaResult } from "./types";

// Session-scoped only: cleared when the tab closes, and whenever a new
// calculation starts. Never put birth details in the URL.
const KEY = "ratna-jyotish:result";

const looksLikeResult = (v: unknown): v is RatnaResult => {
  const r = v as RatnaResult | null;
  return (
    !!r &&
    typeof r === "object" &&
    (r.status === "complete" || r.status === "limited") &&
    !!r.birth &&
    !!r.method &&
    !!r.explanation &&
    (r.status === "limited" || !!r.recommendation)
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
