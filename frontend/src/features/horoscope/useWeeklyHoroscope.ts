import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { currentWeek } from "./week";

export interface WeeklySections {
  overview: string; career: string; love: string; finance: string; health: string; family: string; advice: string;
  lucky?: { color?: string; number?: string };
}
export interface WeeklyHoroscopeData {
  sign: string; weekStart: string; weekEnd: string; timezone: string; system: string; sections: WeeklySections; cached: boolean;
}

/** Why a weekly reading could not be shown. Each one has its own message (horoscope.weekly.errors.<kind>). */
export type WeeklyErrorKind = "notReady" | "providerDown" | "invalid" | "auth" | "notDeployed" | "network" | "timeout" | "generic";
export class WeeklyHoroscopeError extends Error {
  constructor(public kind: WeeklyErrorKind, public status?: number) { super(kind); this.name = "WeeklyHoroscopeError"; }
}

/** Decides the kind from what the server said. The server's `code` wins; otherwise the HTTP status. */
export function classifyFailure(status: number, code?: string): WeeklyErrorKind {
  if (code === "WEEKLY_NOT_READY") return "notReady";
  if (code === "HOROSCOPE_UNAVAILABLE") return "providerDown";
  if (code === "HOROSCOPE_INVALID") return "invalid";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "notDeployed"; // this server does not have the weekly route yet
  if (status === 429) return "providerDown";
  return "generic";
}

const TIMEOUT_MS = 70_000; // a first reading of the week is generated on request; the server allows up to 45s

async function fetchWeekly(sign: string): Promise<WeeklyHoroscopeData> {
  const token = useAuthStore.getState().accessToken;
  // AbortController + timer rather than AbortSignal.timeout, which older browsers do not have.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
  let res: Response;
  let body: { data?: unknown; code?: string } | null;
  try {
    res = await fetch(`${API_BASE_URL}/interpretation/horoscope/weekly/${sign}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
    body = await res.json().catch(() => null);
  } catch {
    throw new WeeklyHoroscopeError(timedOut ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new WeeklyHoroscopeError(classifyFailure(res.status, body?.code), res.status);
  const d = body?.data as WeeklyHoroscopeData | undefined;
  // A reading is only shown if it is for the sign that was asked for and has every section.
  const s = d?.sections;
  const fields = s as unknown as Record<string, unknown> | undefined;
  const complete = !!fields && ["overview", "career", "love", "finance", "health", "family", "advice"].every((k) => typeof fields[k] === "string" && (fields[k] as string).trim() !== "");
  if (!d || !complete || d.sign !== sign || typeof d.weekStart !== "string" || typeof d.weekEnd !== "string") throw new WeeklyHoroscopeError("invalid", res.status);
  return d;
}

/**
 * The stored weekly reading for one Sun sign. Cached per sign and per week, so switching tabs or signs back and forth
 * does not call the server again, and a new week (the key changes on Monday, IST) is fetched fresh. A failure is never
 * cached as a result, and retrying only asks again: the server stores each reading once and reuses it.
 */
export function useWeeklyHoroscope(sign: string | null, enabled = true) {
  const week = currentWeek().start;
  return useQuery<WeeklyHoroscopeData, WeeklyHoroscopeError>({
    queryKey: ["weekly-horoscope", sign, week],
    enabled: enabled && !!sign,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: () => fetchWeekly(sign as string),
  });
}
