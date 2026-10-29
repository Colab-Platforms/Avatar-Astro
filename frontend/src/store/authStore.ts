// Zustand auth store, persisted to localStorage.
//
// Holds the user plus the access/refresh token pair issued by the backend.
// authClient.ts reads and writes this store directly (via getState) so that
// token refresh works outside of React components too.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, AuthUser } from "@/features/auth/types";

/** Browser-stored personal results. Removed on sign-out so the next person on this device cannot see them. */
const PERSONAL_KEY_PREFIXES = ["iv_"];
export function clearPersonalLocalData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (PERSONAL_KEY_PREFIXES.some((p) => key.startsWith(p))) localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable */
  }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** True after Zustand persist has rehydrated from localStorage. */
  hasHydrated: boolean;

  setSession: (session: AuthSession) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: AuthUser) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setSession: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      logout: () => {
        clearPersonalLocalData();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[auth] failed to rehydrate session", error);
        }
        // Prefer mutating the rehydrated state object; fall back to setState.
        if (state) {
          state.setHasHydrated(true);
        } else {
          useAuthStore.setState({ hasHydrated: true });
        }
      },
    },
  ),
);

// Belt-and-suspenders: mark hydrated if rehydration already finished
// (common with sync storage / HMR), or when it finishes later.
const markHydrated = () => {
  if (!useAuthStore.getState().hasHydrated) {
    useAuthStore.setState({ hasHydrated: true });
  }
};

if (useAuthStore.persist.hasHydrated()) {
  markHydrated();
}

useAuthStore.persist.onFinishHydration(markHydrated);

/** @deprecated Prefer AuthUser from @/features/auth/types */
export type { AuthUser, AuthSession };
