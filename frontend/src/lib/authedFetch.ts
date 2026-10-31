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

/**
 * Drives the global sign-in dialog (see components/SignInPrompt).
 *
 * `pending` is the action the visitor was trying to run (for example "generate my reading"). It is kept
 * in memory, so the page and everything typed into it stay exactly as they were while the dialog is open.
 * After a successful sign-in the dialog calls `resume()`, which clears `pending` before running it, so the
 * action runs once. Closing the dialog (`hide`) drops it without running anything.
 */
interface SignInPromptState {
  open: boolean;
  pending: (() => void) | null;
  show: (resume?: () => void) => void;
  hide: () => void;
  resume: () => void;
}
export const useSignInPrompt = create<SignInPromptState>((set, get) => ({
  open: false,
  pending: null,
  show: (resume) => set({ open: true, pending: resume ?? null }),
  hide: () => set({ open: false, pending: null }),
  resume: () => {
    const fn = get().pending;
    set({ open: false, pending: null });
    fn?.();
  },
}));

export const isSignedIn = (): boolean => {
  const s = useAuthStore.getState();
  return Boolean(s.isAuthenticated && s.accessToken);
};

/**
 * Opens the sign-in prompt and returns false when signed out. Use at the start of a protected action.
 * Pass `resume` to run the action automatically (once) after the visitor signs in; the form is untouched.
 */
export function requireSignIn(resume?: () => void): boolean {
  if (isSignedIn()) return true;
  useSignInPrompt.getState().show(resume);
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
