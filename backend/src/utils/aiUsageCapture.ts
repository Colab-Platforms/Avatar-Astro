import { AsyncLocalStorage } from "node:async_hooks";
import axios from "axios";
import { ensureOpenRouterCatalogue, estimateCostUsd, priceFor } from "@/config/aiPricing.js";
import { diag, markCaptureInstalled } from "@/utils/aiDiagnostics.js";

/**
 * Captures what each AI provider call actually reported (tokens, cost) and attributes it to the customer
 * request that caused it. Only provider response metadata is read; prompts and completions are never stored.
 */
export type CostBasis = "actual" | "estimated";

export interface AiCall {
  provider: string;
  model: string | null;
  ok: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  costBasis: CostBasis | null;
}

export interface UsageStore {
  calls: AiCall[];
  servedFromCache: boolean;
  /** which feature this request belongs to (diagnostics only) */
  feature?: string;
}

const als = new AsyncLocalStorage<UsageStore>();

export const runWithUsageStore = <T>(store: UsageStore, fn: () => T): T => als.run(store, fn);
export const newUsageStore = (feature?: string): UsageStore => ({ calls: [], servedFromCache: false, feature });
/** Call from a code path that answers from a stored result instead of generating. */
export const markServedFromCache = () => {
  const s = als.getStore();
  if (s) s.servedFromCache = true;
};

export function providerOf(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (host === "openrouter.ai") return "openrouter";
  if (host === "api.groq.com") return "groq";
  if (host === "api.sarvam.ai") return "sarvam";
  if (host === "generativelanguage.googleapis.com") return "google";
  return null;
}

const isChatCompletion = (url: string) => /\/chat\/completions\/?(\?|$)/.test(url);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** Pure: turn one provider response into a call record. Missing information stays null; nothing is invented. */
export function extractCall(provider: string, requestedModel: string | null, ok: boolean, body: any): AiCall {
  const u = body?.usage;
  const input = num(u?.prompt_tokens) ?? num(u?.input_tokens);
  const output = num(u?.completion_tokens) ?? num(u?.output_tokens);
  const total = num(u?.total_tokens) ?? (input != null && output != null ? input + output : null);
  const model: string | null = typeof body?.model === "string" ? body.model : requestedModel;
  let costUsd: number | null = null;
  let costBasis: CostBasis | null = null;
  const reported = provider === "openrouter" ? num(u?.cost) : null;
  if (reported != null) {
    costUsd = reported;
    costBasis = "actual";
  } else {
    const est = estimateCostUsd(priceFor(provider, model), input, output);
    if (est != null) {
      costUsd = est;
      costBasis = "estimated";
    }
  }
  return { provider, model, ok, inputTokens: input, outputTokens: output, totalTokens: total, costUsd, costBasis };
}

function record(call: AiCall) {
  const store = als.getStore();
  if (store) store.calls.push(call);
  diag({
    stage: "provider_call", provider: call.provider, feature: store?.feature, hasRequestContext: !!store, httpOk: call.ok,
    modelFound: !!call.model, tokensFound: call.totalTokens != null, costFound: call.costUsd != null, costBasis: call.costBasis,
    reason: store ? undefined : "no_request_context",
  });
}

/**
 * For AI clients that do NOT go through global fetch or axios (a provider SDK with its own HTTP stack, an internal
 * gateway). Reports one finished provider call into the current request. Only pass what the provider actually reported:
 * omit usage fields you do not have. Do not call this for requests that fetch/axios already capture (that would count twice).
 */
export function reportAiCall(c: { provider: string; model?: string | null; ok?: boolean; inputTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null; costUsd?: number | null }): void {
  if (process.env.AI_USAGE_ACCOUNTING === "off") return;
  const input = num(c.inputTokens), output = num(c.outputTokens);
  const total = num(c.totalTokens) ?? (input != null && output != null ? input + output : null);
  const reported = num(c.costUsd);
  let costUsd = reported, costBasis: CostBasis | null = reported != null ? "actual" : null;
  if (reported == null) {
    const est = estimateCostUsd(priceFor(c.provider, c.model), input, output);
    if (est != null) { costUsd = est; costBasis = "estimated"; }
  }
  record({ provider: c.provider, model: c.model ?? null, ok: c.ok !== false, inputTokens: input, outputTokens: output, totalTokens: total, costUsd, costBasis });
}

/** Asks OpenRouter to include the exact cost in the response. Adds one field; never changes the prompt. */
function withUsageAccounting(body: any): any {
  if (body && typeof body === "object" && !Array.isArray(body) && body.usage === undefined) return { ...body, usage: { include: true } };
  return body;
}

const enabled = () => process.env.AI_USAGE_ACCOUNTING !== "off";

let installed = false;
/** Wraps global fetch and the default axios instance once. Safe to call repeatedly. Provider logic stays here, not in route files. */
export function installAiUsageCapture(): void {
  if (installed) return;
  installed = true;
  markCaptureInstalled();

  const origFetch = globalThis.fetch.bind(globalThis);
  // Prices for the "tokens but no cost" case. Needs no key; skipped when no OpenRouter key is configured on this server.
  const warmCatalogue = () => { if (process.env.OPENROUTER_API_KEY && enabled()) ensureOpenRouterCatalogue(origFetch); };
  warmCatalogue();
  globalThis.fetch = (async (input: any, init?: any) => {
    const url: string | undefined = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    const provider = enabled() && url ? providerOf(url) : null;
    if (!url || !provider) return origFetch(input, init);
    if (!als.getStore()) {
      // Not inside a customer request (background job, or the request context was lost). Not counted, but visible.
      diag({ stage: "provider_call", provider, hasRequestContext: false, reason: "no_request_context" });
      return origFetch(input, init);
    }
    let reqModel: string | null = null;
    let nextInit = init;
    if (isChatCompletion(url) && typeof init?.body === "string") {
      try {
        const parsed = JSON.parse(init.body);
        reqModel = typeof parsed?.model === "string" ? parsed.model : null;
        if (provider === "openrouter") nextInit = { ...init, body: JSON.stringify(withUsageAccounting(parsed)) };
      } catch {
        /* leave the request untouched */
      }
    }
    let res: Response;
    try {
      res = await origFetch(input, nextInit);
    } catch (err) {
      record({ provider, model: reqModel, ok: false, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null, costBasis: null });
      throw err;
    }
    if (provider === "openrouter") warmCatalogue();
    if (isChatCompletion(url)) {
      try {
        record(extractCall(provider, reqModel, res.ok, await res.clone().json()));
      } catch {
        record(extractCall(provider, reqModel, res.ok, null));
      }
    } else {
      // Non-token endpoints (e.g. Sarvam TTS): the call is real, but it reports no tokens or cost, so none are recorded.
      record(extractCall(provider, null, res.ok, null));
    }
    return res;
  }) as typeof fetch;

  axios.interceptors.request.use((config) => {
    const url = (config.baseURL ?? "") + (config.url ?? "");
    if (enabled() && als.getStore() && providerOf(url) === "openrouter" && isChatCompletion(url) && config.data && typeof config.data === "object") {
      config.data = withUsageAccounting(config.data);
    }
    return config;
  });
  const onDone = (config: any, ok: boolean, body: any) => {
    const url = (config?.baseURL ?? "") + (config?.url ?? "");
    const provider = enabled() ? providerOf(url) : null;
    if (!provider) return;
    if (!als.getStore()) {
      diag({ stage: "provider_call", provider, hasRequestContext: false, reason: "no_request_context" });
      return;
    }
    let reqModel: string | null = null;
    try {
      const d = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      reqModel = typeof d?.model === "string" ? d.model : null;
    } catch {
      /* ignore */
    }
    record(extractCall(provider, reqModel, ok, isChatCompletion(url) ? body : null));
  };
  axios.interceptors.response.use(
    (res) => {
      onDone(res.config, true, res.data);
      return res;
    },
    (err) => {
      if (err?.config) onDone(err.config, false, err.response?.data);
      return Promise.reject(err);
    },
  );
}

export interface RequestAiSummary {
  aiProvider: string | null;
  aiModel: string | null;
  aiCalls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  costBasis: CostBasis | null;
}

/**
 * Merges every provider call made for one customer request into the single usage row. Sums only what is known:
 * a call without token counts adds nothing to the token totals, and the cost is "actual" only if EVERY costed call
 * was provider-reported ("estimated" if any costed call was estimated). Returns all-null when no AI was called.
 */
export function summarizeCalls(calls: AiCall[]): RequestAiSummary {
  if (!calls.length) {
    return { aiProvider: null, aiModel: null, aiCalls: null, inputTokens: null, outputTokens: null, totalTokens: null, costUsd: null, costBasis: null };
  }
  const sum = (pick: (c: AiCall) => number | null) => {
    const v = calls.map(pick).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  };
  const costed = calls.filter((c) => c.costUsd != null);
  const providers = [...new Set(calls.map((c) => c.provider))];
  const models = [...new Set(calls.map((c) => c.model).filter((m): m is string => !!m))];
  return {
    aiProvider: providers.join("+"),
    aiModel: models.length === 0 ? null : models.join("+").slice(0, 120),
    aiCalls: calls.length,
    inputTokens: sum((c) => c.inputTokens),
    outputTokens: sum((c) => c.outputTokens),
    totalTokens: sum((c) => c.totalTokens),
    costUsd: costed.length ? costed.reduce((a, c) => a + (c.costUsd as number), 0) : null,
    costBasis: costed.length ? (costed.every((c) => c.costBasis === "actual") ? "actual" : "estimated") : null,
  };
}
