import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useAuthStore } from "@/store/authStore";

/**
 * Counts "the person using this browser changed". The app's pages remount when it goes up, so a form that was
 * filled from one person's saved profile can never still be on screen for the next person.
 * It goes up on an explicit logout and when one signed-in account is replaced by another. An expired session does
 * NOT bump it: the sign-in prompt deliberately keeps what the visitor typed.
 */
export const useAccountEpoch = create<{ epoch: number; bump: () => void }>((set) => ({ epoch: 0, bump: () => set((s) => ({ epoch: s.epoch + 1 })) }));

/** Call once near the top of the page tree; returns the epoch to use in a React `key`. */
export function useRemountOnAccountSwitch(): number {
  const id = useAuthStore((s) => s.user?.id ?? null);
  const prev = useRef(id);
  useEffect(() => {
    if (prev.current && id && prev.current !== id) useAccountEpoch.getState().bump();
    prev.current = id;
  }, [id]);
  return useAccountEpoch((s) => s.epoch);
}
