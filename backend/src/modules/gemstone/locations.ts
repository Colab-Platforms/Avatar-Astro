/**
 * Birthplace search via the Open-Meteo geocoding API, which returns
 * coordinates and the IANA time zone in one call.
 *
 * Licensing: the free endpoint (geocoding-api.open-meteo.com) is for
 * non-commercial use only. In production the adapter therefore refuses to
 * use it unless a commercial key is configured (OPEN_METEO_API_KEY, which
 * switches to customer-geocoding-api.open-meteo.com), or the operator
 * explicitly accepts the free terms with GEOCODER_ALLOW_FREE=true.
 * Credentials stay server-side and are never logged.
 */
import axios from "axios";
import { isValidTimeZone } from "./birth.time.js";

export interface PlaceResult {
  id: string;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
}

export type LocationErrorKind =
  | "not_configured" // production without a licensed provider
  | "auth" // provider rejected the key (401/403)
  | "rate_limited" // 429
  | "timeout"
  | "network" // DNS / connection failure
  | "http" // other provider HTTP error
  | "bad_format"; // response not in the expected shape

export class LocationProviderError extends Error {
  constructor(
    public kind: LocationErrorKind,
    message: string,
    public providerStatus?: number,
  ) {
    super(message);
  }
}

export type HttpGet = (
  url: string,
  params: Record<string, string | number>,
  timeoutMs: number,
) => Promise<{ status: number; data: unknown }>;

const defaultGet: HttpGet = (url, params, timeout) =>
  axios.get(url, { params, timeout, validateStatus: () => true });

const FREE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const PAID_URL = "https://customer-geocoding-api.open-meteo.com/v1/search";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; value: PlaceResult[] }>();
export const clearLocationCache = () => cache.clear();

export const toPlaceResult = (r: any): (PlaceResult & { district?: string }) | null => {
  if (
    !r ||
    typeof r.name !== "string" ||
    !Number.isFinite(r.latitude) ||
    !Number.isFinite(r.longitude) ||
    Math.abs(r.latitude) > 90 ||
    Math.abs(r.longitude) > 180 ||
    typeof r.timezone !== "string" ||
    !isValidTimeZone(r.timezone)
  ) {
    return null;
  }
  const admin1 = typeof r.admin1 === "string" ? r.admin1 : null;
  const country = typeof r.country === "string" ? r.country : null;
  return {
    id: String(r.id ?? `${r.latitude},${r.longitude}`),
    name: r.name,
    admin1,
    country,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    label: [r.name, admin1, country].filter(Boolean).join(", "),
    ...(typeof r.admin2 === "string" && r.admin2 !== r.name ? { district: r.admin2 } : {}),
  };
};

/** Adds the district to labels that would otherwise look identical. */
const disambiguate = (list: (PlaceResult & { district?: string })[]): PlaceResult[] => {
  const counts = new Map<string, number>();
  for (const p of list) counts.set(p.label, (counts.get(p.label) ?? 0) + 1);
  return list.map(({ district, ...p }) =>
    (counts.get(p.label) ?? 0) > 1 && district
      ? { ...p, label: [p.name, district, p.admin1, p.country].filter(Boolean).join(", ") }
      : p,
  );
};

export interface SearchOptions {
  get?: HttpGet;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export const searchLocations = async (
  query: string,
  opts: SearchOptions = {},
): Promise<PlaceResult[]> => {
  const env = opts.env ?? process.env;
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const apiKey = env.OPEN_METEO_API_KEY;
  const isProd = env.NODE_ENV === "production";
  if (!apiKey && isProd && env.GEOCODER_ALLOW_FREE !== "true") {
    throw new LocationProviderError(
      "not_configured",
      "No licensed geocoding provider is configured (set OPEN_METEO_API_KEY).",
    );
  }

  const params: Record<string, string | number> = {
    name: q,
    count: 8,
    language: "en",
    format: "json",
    ...(apiKey ? { apikey: apiKey } : {}),
  };

  let res: { status: number; data: unknown };
  try {
    res = await (opts.get ?? defaultGet)(apiKey ? PAID_URL : FREE_URL, params, opts.timeoutMs ?? 6000);
  } catch (e: any) {
    if (e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT") {
      throw new LocationProviderError("timeout", "Geocoding provider timed out.");
    }
    throw new LocationProviderError("network", `Geocoding provider unreachable (${e?.code ?? "unknown"}).`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new LocationProviderError("auth", "Geocoding provider rejected the credentials.", res.status);
  }
  if (res.status === 429) {
    throw new LocationProviderError("rate_limited", "Geocoding provider rate limit reached.", 429);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new LocationProviderError("http", `Geocoding provider returned HTTP ${res.status}.`, res.status);
  }

  const body = res.data as { results?: unknown } | null;
  if (!body || typeof body !== "object") {
    throw new LocationProviderError("bad_format", "Geocoding provider returned an unexpected response.");
  }
  // Open-Meteo omits `results` entirely when nothing matches.
  if (body.results === undefined) {
    cache.set(key, { at: Date.now(), value: [] });
    return [];
  }
  if (!Array.isArray(body.results)) {
    throw new LocationProviderError("bad_format", "Geocoding provider returned an unexpected response.");
  }
  const parsed = body.results.map(toPlaceResult).filter((p): p is NonNullable<typeof p> => p !== null);
  const value = disambiguate(parsed);
  if (body.results.length > 0 && parsed.length === 0) {
    throw new LocationProviderError("bad_format", "Geocoding results were missing coordinates or time zones.");
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
};
