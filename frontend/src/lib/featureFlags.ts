import { useEffect, useSyncExternalStore } from "react";

/**
 * Which tools the main admin has switched off (GET /api/public/config).
 *
 * The SERVER enforces the switch (a disabled feature's API answers 503); this
 * module only lets the UI hide links and show a clear notice instead of a
 * broken page. It fails OPEN: if the config cannot be loaded, nothing is hidden
 * and the API remains the source of truth.
 */
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const REFRESH_AFTER_MS = 30_000;
const TIMEOUT_MS = 4_000;

/** Page path -> backend feature key. Longest match wins; unlisted paths are never gated. */
const PATH_FEATURES: [string, string][] = [
  ["/tarot", "tarot"],
  ["/zodiac", "zodiac"],
  ["/birth-chart", "birth-chart"],
  ["/compatibility", "compatibility"],
  ["/palm-reading", "palm-reading"],
  ["/name-destiny-report", "name-analysis"],
  ["/ratna-jyotish", "gemstone"],
  ["/gemstone-calculator", "gemstone"],
  ["/horoscopes", "interpretation"],
  ["/inner-voice/chat", "ai-chat"],
  ["/inner-voice/wisdom", "ai-chat"],
  ["/inner-voice/future-path", "inner-voice"],
];

/** Links that name a feature but live on a shared page (the Inner Voice hub hosts Know Your Karma). */
const LINK_ONLY_FEATURES: [string, string][] = [["/inner-voice", "ai-chat"]];

export function featureForPath(path: string, linkOnly = false): string | null {
  const candidates = linkOnly ? [...PATH_FEATURES, ...LINK_ONLY_FEATURES] : PATH_FEATURES;
  let best: [string, string] | null = null;
  for (const entry of candidates) {
    const [prefix] = entry;
    const exact = linkOnly && LINK_ONLY_FEATURES.includes(entry);
    const hit = exact ? path === prefix : path === prefix || path.startsWith(prefix + "/");
    if (hit && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}

interface State {
  disabled: readonly string[];
  /** "idle" before the first request, "loading" during it, then "ready" or "failed". */
  status: "idle" | "loading" | "ready" | "failed";
  fetchedAt: number;
}

let state: State = { disabled: [], status: "idle", fetchedAt: 0 };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export function refreshFeatureFlags(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.status === "ready" && Date.now() - state.fetchedAt < REFRESH_AFTER_MS) return Promise.resolve();
  if (state.status === "idle") set({ status: "loading" });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  inflight = fetch(`${API}/public/config`, { signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((b) => {
      const list = Array.isArray(b?.data?.disabledFeatures) ? (b.data.disabledFeatures as unknown[]).filter((x): x is string => typeof x === "string") : [];
      set({ disabled: list, status: "ready", fetchedAt: Date.now() });
    })
    .catch(() => {
      // Keep whatever we knew before (initially nothing hidden).
      set({ status: state.status === "ready" ? "ready" : "failed", fetchedAt: Date.now() });
    })
    .finally(() => {
      clearTimeout(timer);
      inflight = null;
    });
  return inflight;
}

// Returning to the tab (or window) re-checks the switches, throttled by REFRESH_AFTER_MS: no polling timers.
if (typeof document !== "undefined" && typeof window !== "undefined") {
  const onReturn = () => {
    if (document.visibilityState === "visible" && listeners.size > 0) void refreshFeatureFlags();
  };
  document.addEventListener("visibilitychange", onReturn);
  window.addEventListener("focus", onReturn);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getState = () => state;

export function useFeatureFlags(refreshKey?: string) {
  const s = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => {
    void refreshFeatureFlags();
  }, [refreshKey]);
  return {
    status: s.status,
    disabled: s.disabled,
    /** True when `path` belongs to a tool the admin switched off. `linkOnly` also covers hub-page links. */
    isPathDisabled: (path: string, linkOnly = false) => {
      const key = featureForPath(path, linkOnly);
      return key !== null && s.disabled.includes(key);
    },
  };
}

/** Test hook. */
export function __resetFeatureFlags() {
  state = { disabled: [], status: "idle", fetchedAt: 0 };
  inflight = null;
  listeners.forEach((l) => l());
}
