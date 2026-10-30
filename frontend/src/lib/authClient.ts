// Auth-aware fetch wrapper for the Express/Prisma auth backend.
//
// Mirrors the backend's rotating refresh-token design: every request carries
// the access token, and a 401 triggers a single refresh + retry. Refreshes are
// deduplicated so a burst of parallel 401s only rotates the token once —
// rotating twice would invalidate the first new token and log the user out.

import { z } from "zod";
import { useAuthStore } from "@/store/authStore";

export const AUTH_API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/** Envelope returned by the backend's sendResponse() helper. */
export const apiEnvelopeSchema = z.object({
  status: z.boolean(),
  data: z.unknown().nullable(),
  message: z.string(),
});

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) return null;

      const response = await fetch(`${AUTH_API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const body = await response.json();
      const tokens = body?.data;
      if (!tokens?.accessToken || !tokens?.refreshToken) return null;

      useAuthStore.getState().setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      return tokens.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface AuthRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the Authorization header (used for login/register/refresh). */
  skipAuth?: boolean;
  /**
   * For PUBLIC endpoints: send the access token when the user is signed in so the server can attribute the activity to them,
   * but never refresh, retry or sign the user out on a 401. Anonymous visitors send no header at all.
   */
  sendTokenIfPresent?: boolean;
}

/**
 * Performs a request and unwraps the backend envelope, returning `data`.
 * Throws AuthApiError with the backend's own message on failure.
 */
export async function authRequest<T = unknown>(
  endpoint: string,
  options: AuthRequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { body, skipAuth, sendTokenIfPresent, headers, ...rest } = options;

  // FormData must set its own Content-Type so the multipart boundary is
  // included — forcing application/json would make the upload unparseable.
  const isFormData = body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((headers as Record<string, string>) ?? {}),
  };

  const accessToken = useAuthStore.getState().accessToken;
  if ((!skipAuth || sendTokenIfPresent) && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(
      "Network error. Please check your connection.",
      0,
    );
  }

  // Only retry when we actually sent a token — an unauthenticated 401 is a
  // genuine credential failure, not an expired session.
  if (
    response.status === 401 &&
    !skipAuth &&
    !sendTokenIfPresent &&
    !isRetry &&
    Boolean(requestHeaders.Authorization)
  ) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return authRequest<T>(endpoint, options, true);
    }
    useAuthStore.getState().logout();
  }

  const rawBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthApiError(
      rawBody?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  const parsed = apiEnvelopeSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new AuthApiError("Unexpected response from server.", response.status);
  }

  if (!parsed.data.status) {
    throw new AuthApiError(parsed.data.message, response.status);
  }

  return parsed.data.data as T;
}
