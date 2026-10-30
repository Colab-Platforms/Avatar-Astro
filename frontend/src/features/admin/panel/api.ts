import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { authRequest, AuthApiError, AUTH_API_BASE_URL } from "@/lib/authClient";
import { authedFetch } from "@/lib/authedFetch";

/**
 * Thin client for the main-admin APIs (/api/admin/*). The backend is the only
 * place access is decided: these calls simply carry the signed-in user's token
 * and surface 401/403 as errors the pages render.
 */
export const panelGet = <T,>(path: string) => authRequest<T>(`/admin${path}`);

export const panelSend = <T,>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  authRequest<T>(`/admin${path}`, { method, body });

/** Downloads a CSV endpoint through the authenticated fetch and saves it. */
export async function panelDownloadCsv(path: string, fallbackName: string): Promise<void> {
  const res = await authedFetch(`${AUTH_API_BASE_URL}/admin${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AuthApiError(body?.message ?? `Export failed (${res.status})`, res.status);
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function usePanel<T>(path: string, options?: Partial<UseQueryOptions<T, Error>>) {
  return useQuery<T, Error>({
    queryKey: ["admin-panel", path],
    queryFn: () => panelGet<T>(path),
    retry: (count, err) => !(err instanceof AuthApiError && [401, 403, 404].includes(err.status)) && count < 1,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/** True only when the BACKEND confirms main-admin access (UI hint, not the control). */
export function useMainAdmin() {
  const q = usePanel<{ mainAdmin: boolean; email: string | null }>("/access");
  const denied = q.error instanceof AuthApiError && q.error.status === 403;
  return { isMain: q.data?.mainAdmin === true, denied, isLoading: q.isLoading, error: denied ? null : q.error };
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong.");
