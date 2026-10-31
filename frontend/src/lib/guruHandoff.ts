import { useAuthStore } from "@/store/authStore";

/**
 * Carries a follow-up question and a short summary of the user's own result from a feature page to
 * Divya Margdarshak. It lives in sessionStorage (this tab only, never in the URL), is tied to the signed-in
 * user, expires after 30 minutes and is removed the moment it is read, so it can run only once.
 */
export interface GuruHandoff {
  question: string;
  feature: string;
  featureName: string;
  context: string;
}

interface Stored extends GuruHandoff {
  userId: string | null;
  at: number;
}

const KEY = "guru:handoff";
const MAX_AGE_MS = 30 * 60 * 1000;
export const MAX_CONTEXT_CHARS = 1800;

const currentUserId = (): string | null => (useAuthStore.getState().user as { id?: string } | null)?.id ?? null;

export const saveHandoff = (h: GuruHandoff): void => {
  try {
    const stored: Stored = { ...h, context: h.context.slice(0, MAX_CONTEXT_CHARS), userId: currentUserId(), at: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable: the question simply is not carried over */
  }
};

/** Reads and removes the pending handoff. Returns null if none, expired, or saved by a different account. */
export const takeHandoff = (): GuruHandoff | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    if (typeof v.question !== "string" || !v.question.trim()) return null;
    if (typeof v.at !== "number" || Date.now() - v.at > MAX_AGE_MS) return null;
    const uid = currentUserId();
    if (v.userId && uid && v.userId !== uid) return null;
    return {
      question: v.question,
      feature: typeof v.feature === "string" ? v.feature : "",
      featureName: typeof v.featureName === "string" ? v.featureName : "",
      context: typeof v.context === "string" ? v.context.slice(0, MAX_CONTEXT_CHARS) : "",
    };
  } catch {
    return null;
  }
};

export const clearHandoff = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
