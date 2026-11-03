import { createHash } from "node:crypto";
import prisma from "@root/prisma.js";

/**
 * Provider credit/usage checks, using ONLY official provider endpoints.
 *  - OpenRouter: GET /api/v1/key, authenticated with OPENROUTER_API_KEY itself (key-level usage and limit). Account-wide credits are not read.
 *  - Groq: no balance/credits API exists; a read-only /models call verifies the key only.
 *  - Sarvam: no balance API exists and no read-only endpoint to verify a key; reported as configured but unverified.
 * Results are cached in platform_settings. Page loads read the cache; only an explicit refresh calls providers.
 * A balance is never derived by subtracting our own tracked spend from anything.
 */
export type BalanceState = "available" | "unsupported" | "unavailable";

export interface ProviderBalance {
  id: "openrouter" | "groq" | "sarvam";
  name: string;
  /** configured = key present; connected = provider accepted it on the last check; rejected = provider refused it; error = could not reach/parse; unverified = present but no way to verify */
  connection: "not_configured" | "connected" | "rejected" | "error" | "unverified";
  balance: {
    state: BalanceState;
    remainingUsd: number | null;
    /** true when the provider says there is no limit (not the same as zero) */
    unlimited: boolean;
    scope: "account" | "key" | null;
    note: string;
  };
  usage: { totalUsd: number | null; dailyUsd: number | null; weeklyUsd: number | null; monthlyUsd: number | null; note: string | null };
  lastCheckedAt: string | null;
  /** last time a check returned usable data; kept when a later check fails */
  lastSuccessAt: string | null;
  error: string | null;
  /** OpenRouter only: usage of the configured OPENROUTER_API_KEY. */
  keyUsage?: OpenRouterKeyUsage;
}

/** Usage of the one API key configured as OPENROUTER_API_KEY (GET /api/v1/key). Never estimated; no secret or key fragment is ever stored. */
export interface OpenRouterKeyUsage {
  /** ok = fetched now; not_configured = no OPENROUTER_API_KEY; unauthorized = OpenRouter said 401/403; rate_limited = 429; unavailable = network/timeout/5xx/unreadable. On failure the numbers, if any, are the last good ones and `stale` is true. */
  status: "ok" | "not_configured" | "unauthorized" | "rate_limited" | "unavailable";
  /** the key's display name, only when it is safe to show (never anything that looks like, or contains part of, the secret) */
  label: string | null;
  /** total spent on this key in USD */
  usage: number | null;
  /** spending limit set on this key in USD; null when the key has none */
  limit: number | null;
  /** true only when OpenRouter reported the key has no spending limit */
  unlimited: boolean;
  /** limit minus usage; only when a limit is known */
  remaining: number | null;
  usageDaily: number | null;
  usageWeekly: number | null;
  usageMonthly: number | null;
  /** how often OpenRouter resets the limit (daily/weekly/monthly), or null */
  limitReset: string | null;
  /** when the numbers were fetched from OpenRouter */
  fetchedAt: string | null;
  stale: boolean;
  error: string | null;
  /** rate_limited only: earliest time another attempt is made */
  retryAt: string | null;
  /** one-way fingerprint of the key so a permanent failure is not retried until the key changes */
  keyId: string | null;
}

export interface BalanceSnapshot {
  providers: ProviderBalance[];
  refreshedAt: string | null;
}

export const CACHE_KEY = "provider_balance_cache";
export const MIN_REFRESH_MS = 60_000;
const TIMEOUT_MS = 10_000;

type Fetch = typeof fetch;
const nn = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const NAMES = { openrouter: "OpenRouter", groq: "Groq", sarvam: "Sarvam" } as const;

const blank = (id: ProviderBalance["id"]): ProviderBalance => ({
  id,
  name: NAMES[id],
  connection: "not_configured",
  balance: { state: "unavailable", remainingUsd: null, unlimited: false, scope: null, note: "" },
  usage: { totalUsd: null, dailyUsd: null, weeklyUsd: null, monthlyUsd: null, note: null },
  lastCheckedAt: null,
  lastSuccessAt: null,
  error: null,
});

async function get(f: Fetch, url: string, key: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await f(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: ctrl.signal });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, body, retryAfter: Number(res.headers?.get?.("retry-after")) || null };
  } finally {
    clearTimeout(timer);
  }
}

/** Never includes the provider's response text or the key: only a fixed, safe message. */
const fail = (e: any) => (e?.name === "AbortError" ? "The provider did not respond in time." : "Could not reach the provider.");

const emptyUsage = (status: OpenRouterKeyUsage["status"], error: string | null = null, extra: Partial<OpenRouterKeyUsage> = {}): OpenRouterKeyUsage => ({
  status, label: null, usage: null, limit: null, unlimited: false, remaining: null, usageDaily: null, usageWeekly: null, usageMonthly: null, limitReset: null,
  fetchedAt: null, stale: false, error, retryAt: null, keyId: null, ...extra,
});

const keyFingerprint = (k: string) => createHash("sha256").update(k).digest("hex").slice(0, 8);
const DEFAULT_RETRY_MS = 60_000;

/** OpenRouter's default key label is a masked copy of the secret (sk-or-v1-abc...xyz). Show a label only if it clearly is not. */
export function safeKeyLabel(label: unknown, secret: string): string | null {
  if (typeof label !== "string") return null;
  const l = label.trim();
  if (!l || l.length > 60) return null;
  if (/sk-|\.\.\.|…|\*{3}/i.test(l)) return null;
  const compact = secret.replace(/[^A-Za-z0-9]/g, "");
  for (let i = 0; i + 6 <= compact.length; i += 3) if (l.includes(compact.slice(i, i + 6))) return null;
  if (l.includes(secret.slice(0, 8))) return null;
  return l;
}

/**
 * Reads the usage and limit of OPENROUTER_API_KEY. `prev` (last saved result) lets a permanent failure (key refused) or an active
 * rate-limit wait be reported again without calling OpenRouter, so a broken setup is not hammered.
 */
export async function checkOpenRouter(env: NodeJS.ProcessEnv, f: Fetch, prev?: OpenRouterKeyUsage | null): Promise<ProviderBalance> {
  const out = blank("openrouter");
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) return { ...out, balance: { ...out.balance, note: "OPENROUTER_API_KEY is not set on this server." }, keyUsage: emptyUsage("not_configured") };
  const keyId = keyFingerprint(key);
  const now = new Date().toISOString();
  out.lastCheckedAt = now;
  const done = (ku: OpenRouterKeyUsage, o: ProviderBalance = out): ProviderBalance => ({ ...o, keyUsage: ku });

  if (prev && prev.keyId === keyId) {
    if (prev.status === "unauthorized") return done({ ...prev, stale: prev.fetchedAt != null }, { ...out, connection: "rejected", error: prev.error });
    if (prev.status === "rate_limited" && prev.retryAt && Date.parse(prev.retryAt) > Date.now()) return done({ ...prev, stale: prev.fetchedAt != null }, { ...out, connection: "error", error: prev.error });
  }
  try {
    const k = await get(f, "https://openrouter.ai/api/v1/key", key);
    if (k.status === 401 || k.status === 403) {
      const error = "OpenRouter rejected the configured API key.";
      return done(emptyUsage("unauthorized", error, { keyId }), { ...out, connection: "rejected", error, balance: { ...out.balance, note: "Key rejected." } });
    }
    if (k.status === 429) {
      const wait = k.retryAfter && k.retryAfter > 0 ? k.retryAfter * 1000 : DEFAULT_RETRY_MS;
      const error = "OpenRouter is rate limiting usage checks (429).";
      return done(emptyUsage("rate_limited", error, { keyId, retryAt: new Date(Date.now() + wait).toISOString() }), { ...out, connection: "error", error });
    }
    const d = k.body?.data;
    const usage = nn(d?.usage);
    if (k.status !== 200 || !d || usage == null) {
      const error = `OpenRouter returned HTTP ${k.status}.`;
      return done(emptyUsage("unavailable", error, { keyId }), { ...out, connection: "error", error, balance: { ...out.balance, note: "Balance could not be read." } });
    }
    out.connection = "connected";
    out.lastSuccessAt = now;
    out.usage = { totalUsd: usage, dailyUsd: nn(d.usage_daily), weeklyUsd: nn(d.usage_weekly), monthlyUsd: nn(d.usage_monthly), note: "Spend on this API key as reported by OpenRouter." };
    const limit = nn(d.limit);
    const unlimited = d.limit == null;
    // limit_remaining is OpenRouter's own figure; limit - usage is used only when it is absent and a limit is known.
    const remaining = limit == null ? null : (nn(d.limit_remaining) ?? limit - usage);
    out.balance = remaining != null
      ? { state: "available", remainingUsd: remaining, unlimited: false, scope: "key", note: "Remaining credit limit set on this API key (not the whole account balance)." }
      : { state: "unavailable", remainingUsd: null, unlimited, scope: "key", note: "This key has no spending limit, so there is no key-level balance." };
    return done({
      status: "ok", label: safeKeyLabel(d.label, key), usage, limit, unlimited, remaining,
      usageDaily: nn(d.usage_daily), usageWeekly: nn(d.usage_weekly), usageMonthly: nn(d.usage_monthly),
      limitReset: typeof d.limit_reset === "string" ? d.limit_reset : null,
      fetchedAt: now, stale: false, error: null, retryAt: null, keyId,
    });
  } catch (e) {
    const error = fail(e);
    return done(emptyUsage("unavailable", error, { keyId }), { ...out, connection: "error", error, balance: { ...out.balance, note: "Balance could not be read." } });
  }
}

export async function checkGroq(env: NodeJS.ProcessEnv, f: Fetch): Promise<ProviderBalance> {
  const out = blank("groq");
  const unsupported = "Not available through API. Groq does not publish a balance or usage endpoint; see the Groq console (Usage and Billing).";
  const key = env.GROQ_API_KEY;
  if (!key) return { ...out, balance: { ...out.balance, state: "unsupported", note: unsupported } };
  const now = new Date().toISOString();
  out.lastCheckedAt = now;
  out.balance = { ...out.balance, state: "unsupported", note: unsupported };
  out.usage.note = "Not available through API.";
  try {
    const r = await get(f, "https://api.groq.com/openai/v1/models", key);
    if (r.status === 401 || r.status === 403) return { ...out, connection: "rejected", error: "Groq rejected the configured API key." };
    if (r.status !== 200) return { ...out, connection: "error", error: `Groq returned HTTP ${r.status}.` };
    return { ...out, connection: "connected", lastSuccessAt: now };
  } catch (e) {
    return { ...out, connection: "error", error: fail(e) };
  }
}

export async function checkSarvam(env: NodeJS.ProcessEnv): Promise<ProviderBalance> {
  const out = blank("sarvam");
  const note = "Not available through API. Sarvam does not publish a balance endpoint; see the Sarvam dashboard (Billing).";
  out.balance = { ...out.balance, state: "unsupported", note };
  out.usage.note = "Not available through API.";
  if (!env.SARVAM_API_KEY) return out;
  // No read-only endpoint exists to verify the key without generating (and paying for) output, so no call is made.
  return { ...out, connection: "unverified" };
}

export async function checkAll(env: NodeJS.ProcessEnv = process.env, f: Fetch = fetch, prev?: ProviderBalance[]): Promise<ProviderBalance[]> {
  return Promise.all([checkOpenRouter(env, f, prev?.find((x) => x.id === "openrouter")?.keyUsage), checkGroq(env, f), checkSarvam(env)]);
}

/** A failed check must not erase the last good reading: keep lastSuccessAt, and keep the previous usage/balance as stale facts only via lastSuccessAt. */
export function mergeWithPrevious(next: ProviderBalance[], prev: ProviderBalance[] | undefined): ProviderBalance[] {
  return next.map((n) => {
    const p = prev?.find((x) => x.id === n.id);
    const merged = n.lastSuccessAt || !p?.lastSuccessAt ? n : { ...n, lastSuccessAt: p.lastSuccessAt };
    // A failed key-usage fetch keeps the last good numbers (marked stale) instead of blanking or inventing them.
    const c = merged.keyUsage;
    if (c && c.status !== "ok" && c.status !== "not_configured" && c.usage == null && p?.keyUsage?.fetchedAt) {
      const o = p.keyUsage;
      return { ...merged, keyUsage: { ...c, label: o.label, usage: o.usage, limit: o.limit, unlimited: o.unlimited, remaining: o.remaining, usageDaily: o.usageDaily, usageWeekly: o.usageWeekly, usageMonthly: o.usageMonthly, limitReset: o.limitReset, fetchedAt: o.fetchedAt, stale: true } };
    }
    return merged;
  });
}

export async function readSnapshot(): Promise<BalanceSnapshot> {
  const row = await prisma.platformSetting.findUnique({ where: { key: CACHE_KEY } });
  const v = row?.value as BalanceSnapshot | null | undefined;
  if (v && Array.isArray(v.providers)) return v;
  return { providers: [], refreshedAt: null };
}

/** Calls providers (at most once per MIN_REFRESH_MS) and stores the result. `throttled` means the cached result was returned. */
export async function refreshSnapshot(updatedBy: string, env: NodeJS.ProcessEnv = process.env, f: Fetch = fetch): Promise<BalanceSnapshot & { throttled: boolean }> {
  const prev = await readSnapshot();
  // A changed API key (added, replaced or removed, e.g. after a restart with new env) is checked right away, not held back by the throttle.
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  const savedKey = prev.providers.find((x) => x.id === "openrouter")?.keyUsage?.keyId ?? null;
  const keyChanged = (apiKey ? keyFingerprint(apiKey) : null) !== savedKey;
  if (!keyChanged && prev.refreshedAt && Date.now() - new Date(prev.refreshedAt).getTime() < MIN_REFRESH_MS) return { ...prev, throttled: true };
  const providers = mergeWithPrevious(await checkAll(env, f, prev.providers), prev.providers);
  const snapshot: BalanceSnapshot = { providers, refreshedAt: new Date().toISOString() };
  await prisma.platformSetting.upsert({
    where: { key: CACHE_KEY },
    update: { value: snapshot as any, updatedBy },
    create: { key: CACHE_KEY, value: snapshot as any, updatedBy },
  });
  return { ...snapshot, throttled: false };
}
