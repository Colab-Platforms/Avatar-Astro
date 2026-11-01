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
  setSession: (session: DailyChatSession) => void;
  markExpired: (nextAvailableAt?: string | null) => void;
  tick: () => void;
}

export const useDailyChatLimitStore = create<DailyChatLimitState>((set, get) => ({
  status: "LOADING",
  startedAt: null,
  expiresAt: null,
  nextAvailableAt: null,
  remainingSeconds: 0,

  setSession: (session) =>
    set({
      status: session.status,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      nextAvailableAt: session.nextAvailableAt,
      remainingSeconds: session.remainingSeconds,
    }),

  markExpired: (nextAvailableAt) =>
    set((s) => ({ status: "EXPIRED", remainingSeconds: 0, nextAvailableAt: nextAvailableAt ?? s.nextAvailableAt })),

  tick: () => {
    const { status, expiresAt } = get();
    if (status !== "ACTIVE" || !expiresAt) return;
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      set({ status: "EXPIRED", remainingSeconds: 0 });
      return;
    }
    set({ remainingSeconds: Math.ceil(remainingMs / 1000) });
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
