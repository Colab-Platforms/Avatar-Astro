import type { RatnaResult } from "./types";

// Session-scoped only: cleared when the tab closes, and whenever a new
// calculation starts. Never put birth details in the URL.
const KEY = "ratna-jyotish:result";

// Results saved by an older build (no `primary`, `analysis` or Hindi name) are ignored, never half-rendered.
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
    (r.status === "complete" ? !!r.recommendation?.analysis?.primary && !!r.primary.stone.hindi : !!r.dateBased && !!r.primary.stone.hindi)
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

/**
 * The birth-details form, kept for the browser session so Back from the result page (or "Back to
 * Birth Details") returns to the form as the user left it. Session-scoped, never in the URL.
 */
export interface RatnaDraft {
  fullName: string;
  gender: string;
  weight: string;
  date: string;
  time: string;
  timeUnknown: boolean;
  place: import("./types").PlaceResult | null;
}

const DRAFT_KEY = "ratna-jyotish:draft";

export const saveDraft = (draft: RatnaDraft): void => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
};

export const loadDraft = (): RatnaDraft | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<RatnaDraft>) : null;
    if (!v || typeof v !== "object") return null;
    return {
      fullName: typeof v.fullName === "string" ? v.fullName : "",
      gender: typeof v.gender === "string" ? v.gender : "",
      weight: typeof v.weight === "string" ? v.weight : "",
      date: typeof v.date === "string" ? v.date : "",
      time: typeof v.time === "string" ? v.time : "",
      timeUnknown: v.timeUnknown === true,
      place: v.place && typeof v.place === "object" ? (v.place as RatnaDraft["place"]) : null,
    };
  } catch {
    return null;
  }
};
