import { create } from "zustand";
import { useAuthStore } from "@/store/authStore";
import { refreshAccessToken } from "@/lib/authClient";

/** Thrown when an action needs a signed-in user and there is no valid session. */
export class SignInRequiredError extends Error {
  constructor() {
    super("Please sign in to continue.");
    this.name = "SignInRequiredError";
  }
}

/** Drives the global "Sign in to continue" dialog (see components/SignInPrompt). */
interface SignInPromptState {
  open: boolean;
  show: () => void;
  hide: () => void;
}
export const useSignInPrompt = create<SignInPromptState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

export const isSignedIn = (): boolean => {
  const s = useAuthStore.getState();
  return Boolean(s.isAuthenticated && s.accessToken);
};

/** Opens the sign-in prompt and returns false when signed out. Use at the start of a protected action. */
export function requireSignIn(): boolean {
  if (isSignedIn()) return true;
  useSignInPrompt.getState().show();
  return false;
}

/**
 * fetch() for endpoints that require an account. Sends the access token, refreshes it once on a
 * 401, and on a final 401 clears the session and prompts for sign-in. The server is the real gate;
 * this just gives the user a clear path instead of a generic error.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!requireSignIn()) throw new SignInRequiredError();

  const send = (token: string) =>
    fetch(input, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });

  let res = await send(useAuthStore.getState().accessToken as string);
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
    if (res.status === 401) {
      useAuthStore.getState().logout();
      useSignInPrompt.getState().show();
      throw new SignInRequiredError();
    }
  }
  return res;
}
