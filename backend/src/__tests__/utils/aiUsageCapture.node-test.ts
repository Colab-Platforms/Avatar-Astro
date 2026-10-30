// Run with: npm run test:capture   (no database needed)
// Rules for turning a provider response into a usage record, using response bodies shaped like the providers' documented ones.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.AI_PRICING_JSON = JSON.stringify({ "groq:*": { inputPerM: 1, outputPerM: 2 }, "openrouter:configured/model": { inputPerM: 10, outputPerM: 20 } });
const { extractCall, summarizeCalls } = await import("../../utils/aiUsageCapture.js");
const { setOpenRouterCatalogue, resetOpenRouterCatalogue, priceFor } = await import("../../config/aiPricing.js");

// OpenRouter's documented non-streaming response: usage is always present and carries cost.
const orBody = (usage: any, model = "google/gemma-3-27b-it") => ({ id: "gen-1", provider: "Google", model, object: "chat.completion", choices: [{ message: { content: "x" } }], usage });
const full = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, cost: 0.0004, is_byok: false, cost_details: { upstream_inference_cost: null }, prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 0 } };

beforeEach(() => {
  resetOpenRouterCatalogue();
  setOpenRouterCatalogue([
    { id: "google/gemma-3-27b-it", pricing: { prompt: "0.00000008", completion: "0.00000035" } },
    { id: "google/gemma-4-31b-it:free", pricing: { prompt: "0", completion: "0" } },
    { id: "configured/model", pricing: { prompt: "0.000001", completion: "0.000001" } },
  ]);
});

test("OpenRouter: provider-reported cost is ACTUAL; tokens and model come from the response", () => {
  const c = extractCall("openrouter", "requested/model", true, orBody(full));
  assert.deepEqual([c.provider, c.model, c.inputTokens, c.outputTokens, c.totalTokens, c.costUsd, c.costBasis], ["openrouter", "google/gemma-3-27b-it", 1000, 500, 1500, 0.0004, "actual"]);
});

test("OpenRouter free model: a reported cost of 0 is a real ACTUAL zero (the provider said so), not 'missing'", () => {
  const c = extractCall("openrouter", "google/gemma-4-31b-it:free", true, orBody({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0 }, "google/gemma-4-31b-it:free"));
  assert.equal(c.costUsd, 0);
  assert.equal(c.costBasis, "actual");
});

test("OpenRouter tokens but NO cost field: ESTIMATED from OpenRouter's price list, never labelled actual", () => {
  const c = extractCall("openrouter", null, true, orBody({ prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }));
  assert.equal(c.costBasis, "estimated");
  assert.ok(Math.abs((c.costUsd as number) - (1000 * 0.08 + 500 * 0.35) / 1e6) < 1e-12);
});

test("OpenRouter cost null / negative / not a number is treated as missing, then estimated, never as zero", () => {
  for (const bad of [null, -1, "0.5", Number.NaN]) {
    const c = extractCall("openrouter", null, true, orBody({ prompt_tokens: 100, completion_tokens: 100, total_tokens: 200, cost: bad }));
    assert.equal(c.costBasis, "estimated", String(bad));
    assert.ok((c.costUsd as number) > 0);
  }
});

test("a price configured in AI_PRICING_JSON wins over the OpenRouter list", () => {
  const c = extractCall("openrouter", null, true, orBody({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }, "configured/model"));
  assert.equal(c.costUsd, (1000 * 10 + 1000 * 20) / 1e6);
  assert.equal(priceFor("openrouter", "configured/model")?.inputPerM, 10);
});

test("model unknown to every price source: cost stays NULL (not 0) and tokens are kept", () => {
  const c = extractCall("openrouter", null, true, orBody({ prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 }, "vendor/unknown-model"));
  assert.equal(c.totalTokens, 10);
  assert.equal(c.costUsd, null);
  assert.equal(c.costBasis, null);
});

test("no usage object at all: provider and model are kept, tokens and cost are null", () => {
  const c = extractCall("openrouter", "requested/model", true, { id: "gen-2", model: "google/gemma-3-27b-it", choices: [] });
  assert.deepEqual([c.model, c.inputTokens, c.totalTokens, c.costUsd, c.costBasis], ["google/gemma-3-27b-it", null, null, null, null]);
});

test("only a total (no split): tokens kept, cost NOT estimated (needs input and output separately)", () => {
  const c = extractCall("openrouter", null, true, orBody({ total_tokens: 500 }));
  assert.equal(c.totalTokens, 500);
  assert.equal(c.costUsd, null);
});

test("failed provider response (HTTP error body) keeps no invented usage", () => {
  const c = extractCall("openrouter", "google/gemma-3-27b-it", false, { error: { code: 402, message: "Insufficient credits" } });
  assert.deepEqual([c.ok, c.totalTokens, c.costUsd, c.costBasis], [false, null, null, null]);
});

test("Groq is unchanged: no cost field is ever trusted; estimate only from the configured price", () => {
  const body = { model: "openai/gpt-oss-120b", usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, cost: 99 } };
  const c = extractCall("groq", null, true, body);
  assert.equal(c.costBasis, "estimated");
  assert.equal(c.costUsd, (1000 * 1 + 500 * 2) / 1e6, "a stray cost field from a non-OpenRouter provider is ignored");
});

test("Sarvam is unchanged: a call with no tokens or cost is recorded as such", () => {
  const c = extractCall("sarvam", null, true, null);
  assert.deepEqual([c.provider, c.totalTokens, c.costUsd, c.costBasis], ["sarvam", null, null, null]);
});

test("summarizing a request: unknown costs never turn into zero, mixed actual+estimated is 'estimated'", () => {
  const a = extractCall("openrouter", null, true, orBody(full));
  const e = extractCall("groq", null, true, { model: "g", usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 } });
  const none = extractCall("openrouter", null, true, orBody({ prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, "vendor/unknown-model"));
  assert.equal(summarizeCalls([a]).costBasis, "actual");
  assert.equal(summarizeCalls([a, e]).costBasis, "estimated");
  assert.equal(summarizeCalls([none]).costUsd, null);
  const mixed = summarizeCalls([a, none]);
  assert.equal(mixed.costUsd, 0.0004, "the unknown call adds nothing; it is not counted as zero");
  assert.equal(mixed.aiCalls, 2);
  assert.equal(summarizeCalls([]).aiCalls, null);
});
