import prisma from "@root/prisma.js";

/**
 * Provider credit/usage checks, using ONLY official provider endpoints.
 *  - OpenRouter: GET /api/v1/key (key-level usage and limit) and, with a management key, GET /api/v1/credits (account credits).
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
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Never includes the provider's response text or the key: only a fixed, safe message. */
const fail = (e: any) => (e?.name === "AbortError" ? "The provider did not respond in time." : "Could not reach the provider.");

export async function checkOpenRouter(env: NodeJS.ProcessEnv, f: Fetch): Promise<ProviderBalance> {
  const out = blank("openrouter");
  const key = env.OPENROUTER_API_KEY;
  if (!key) return { ...out, balance: { ...out.balance, note: "OPENROUTER_API_KEY is not set on this server." } };
  const now = new Date().toISOString();
  out.lastCheckedAt = now;
  try {
    const k = await get(f, "https://openrouter.ai/api/v1/key", key);
    if (k.status === 401 || k.status === 403) return { ...out, connection: "rejected", error: "OpenRouter rejected the configured API key.", balance: { ...out.balance, note: "Key rejected." } };
    if (k.status !== 200 || !k.body?.data) return { ...out, connection: "error", error: `OpenRouter returned HTTP ${k.status}.`, balance: { ...out.balance, note: "Balance could not be read." } };
    const d = k.body.data;
    out.connection = "connected";
    out.lastSuccessAt = now;
    out.usage = { totalUsd: nn(d.usage), dailyUsd: nn(d.usage_daily), weeklyUsd: nn(d.usage_weekly), monthlyUsd: nn(d.usage_monthly), note: "Spend on this API key as reported by OpenRouter." };
    const limitRemaining = nn(d.limit_remaining);
    if (limitRemaining != null) {
      out.balance = { state: "available", remainingUsd: limitRemaining, unlimited: false, scope: "key", note: "Remaining credit limit set on this API key (not the whole account balance)." };
    } else {
      out.balance = { state: "unavailable", remainingUsd: null, unlimited: d.limit == null, scope: "key", note: "This key has no spending limit, so there is no key-level balance." };
    }
    const mgmt = env.OPENROUTER_MANAGEMENT_KEY;
    if (mgmt) {
      try {
        const c = await get(f, "https://openrouter.ai/api/v1/credits", mgmt);
        const total = nn(c.body?.data?.total_credits);
        const used = nn(c.body?.data?.total_usage);
        if (c.status === 200 && total != null && used != null) {
          out.balance = { state: "available", remainingUsd: total - used, unlimited: false, scope: "account", note: "Account credits purchased minus usage, from OpenRouter." };
        } else {
          out.balance.note += " Account credits could not be read with the management key.";
        }
      } catch (e) {
        out.balance.note += ` Account credits check failed: ${fail(e)}`;
      }
    } else {
      out.balance.note += " Set OPENROUTER_MANAGEMENT_KEY to also read the account balance.";
    }
    return out;
  } catch (e) {
    return { ...out, connection: "error", error: fail(e), balance: { ...out.balance, note: "Balance could not be read." } };
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

export async function checkAll(env: NodeJS.ProcessEnv = process.env, f: Fetch = fetch): Promise<ProviderBalance[]> {
  return Promise.all([checkOpenRouter(env, f), checkGroq(env, f), checkSarvam(env)]);
}

/** A failed check must not erase the last good reading: keep lastSuccessAt, and keep the previous usage/balance as stale facts only via lastSuccessAt. */
export function mergeWithPrevious(next: ProviderBalance[], prev: ProviderBalance[] | undefined): ProviderBalance[] {
  return next.map((n) => {
    const p = prev?.find((x) => x.id === n.id);
    return n.lastSuccessAt || !p?.lastSuccessAt ? n : { ...n, lastSuccessAt: p.lastSuccessAt };
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
  if (prev.refreshedAt && Date.now() - new Date(prev.refreshedAt).getTime() < MIN_REFRESH_MS) return { ...prev, throttled: true };
  const providers = mergeWithPrevious(await checkAll(env, f), prev.providers);
  const snapshot: BalanceSnapshot = { providers, refreshedAt: new Date().toISOString() };
  await prisma.platformSetting.upsert({
    where: { key: CACHE_KEY },
    update: { value: snapshot as any, updatedBy },
    create: { key: CACHE_KEY, value: snapshot as any, updatedBy },
  });
  return { ...snapshot, throttled: false };
}
