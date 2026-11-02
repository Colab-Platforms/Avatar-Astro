// Zustand store for the Inner Voice chat free-tier timer (/inner-voice/chat).
//
// The backend (DailyChatUsage row) is the only source of truth for
// startedAt/expiresAt; this store just mirrors the latest session it was
// given and ticks a 1-second local countdown derived from expiresAt — it
// never invents or extends a deadline on its own.
import { create } from "zustand";
import { useEffect } from "react";
import type { DailyChatSession, DailyChatStatus } from "@/lib/dailyChatLimit";

interface DailyChatLimitState {
  status: "LOADING" | DailyChatStatus;
  startedAt: string | null;
  expiresAt: string | null;
  nextAvailableAt: string | null;
  remainingSeconds: number;
  /** serverTime - browserTime (ms) at the last sync; 0 when the server sent no clock. */
  clockSkewMs: number;
  setSession: (session: DailyChatSession) => void;
  markExpired: (nextAvailableAt?: string | null) => void;
  tick: () => void;
}

/** Whole seconds left until expiresAt on the server's clock, never below 0 and never above `cap`. */
function secondsLeft(expiresAt: string, skewMs: number, cap = Infinity): number {
  const ms = new Date(expiresAt).getTime() - (Date.now() + skewMs);
  if (!(ms > 0)) return 0;
  return Math.min(Math.ceil(ms / 1000), cap);
}

export const useDailyChatLimitStore = create<DailyChatLimitState>((set, get) => ({
  status: "LOADING",
  startedAt: null,
  expiresAt: null,
  nextAvailableAt: null,
  remainingSeconds: 0,
  clockSkewMs: 0,

  setSession: (session) => {
    // The expiry timestamp is authoritative: recompute from it (against the server clock) rather than
    // trusting a remainingSeconds number that may already be stale by the time it arrives.
    const serverMs = session.serverNow ? new Date(session.serverNow).getTime() : NaN;
    const skew = Number.isFinite(serverMs) ? serverMs - Date.now() : get().clockSkewMs;
    if (session.status === "ACTIVE" && session.expiresAt) {
      const left = secondsLeft(session.expiresAt, skew);
      set({
        status: left > 0 ? "ACTIVE" : "EXPIRED",
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        nextAvailableAt: left > 0 ? session.nextAvailableAt : get().nextAvailableAt,
        remainingSeconds: left,
        clockSkewMs: skew,
      });
      return;
    }
    set({
      status: session.status,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      nextAvailableAt: session.nextAvailableAt,
      remainingSeconds: session.status === "EXPIRED" ? 0 : Math.max(0, session.remainingSeconds),
      clockSkewMs: skew,
    });
  },

  markExpired: (nextAvailableAt) =>
    set((s) => ({ status: "EXPIRED", remainingSeconds: 0, nextAvailableAt: nextAvailableAt ?? s.nextAvailableAt })),

  tick: () => {
    const { status, expiresAt, clockSkewMs, remainingSeconds } = get();
    if (status !== "ACTIVE" || !expiresAt) return;
    const left = secondsLeft(expiresAt, clockSkewMs, remainingSeconds); // can only go down between syncs
    if (left <= 0) {
      set({ status: "EXPIRED", remainingSeconds: 0 });
      return;
    }
    if (left !== remainingSeconds) set({ remainingSeconds: left });
  },
}));

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

/**
 * Starts the single shared 1s countdown interval for as long as at least one
 * component using this hook is mounted. Safe to call from more than one
 * component at once (e.g. a header badge and the composer) — only one
 * interval ever runs, and it clears itself once the last subscriber unmounts.
 */
export function useDailyChatCountdownTicker(): void {
  useEffect(() => {
    subscriberCount += 1;
    if (!intervalHandle) {
      intervalHandle = setInterval(() => useDailyChatLimitStore.getState().tick(), 1000);
    }
    return () => {
      subscriberCount -= 1;
      if (subscriberCount <= 0 && intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
    };
  }, []);
}

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
