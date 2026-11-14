// Run with: npm run test:model-fallback   (pure logic, no network, no database)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackModelFor, isRetryableProviderFailure } from "../../utils/modelFallback.js";

test("rate limits, provider 5xx errors and timeouts are worth another model", () => {
  for (const s of [429, 500, 502, 503, 504]) assert.equal(isRetryableProviderFailure(s), true, String(s));
  assert.equal(isRetryableProviderFailure(Object.assign(new Error("t"), { name: "TimeoutError" })), true);
  assert.equal(isRetryableProviderFailure(Object.assign(new Error("a"), { name: "AbortError" })), true);
  assert.equal(isRetryableProviderFailure({ status: 503 }), true);
});

test("bad requests, bad keys and ordinary errors are never retried on another model", () => {
  for (const s of [400, 401, 402, 403, 404, 422]) assert.equal(isRetryableProviderFailure(s), false, String(s));
  assert.equal(isRetryableProviderFailure(new Error("unreadable")), false);
  assert.equal(isRetryableProviderFailure(null), false);
});

test("the fallback is always a different model from the one that failed", () => {
  assert.equal(fallbackModelFor("google/gemma-4-31b-it:free", {}), "google/gemma-3-27b-it");
  assert.equal(fallbackModelFor("google/gemma-3-27b-it", {}), "google/gemma-4-31b-it:free");
  assert.equal(fallbackModelFor("openai/gpt-oss-120b", {}), "google/gemma-3-27b-it");
});

test("OPENROUTER_FALLBACK_MODEL overrides the default, but never equals the failed model", () => {
  assert.equal(fallbackModelFor("google/gemma-4-31b-it:free", { OPENROUTER_FALLBACK_MODEL: " openai/gpt-oss-120b " }), "openai/gpt-oss-120b");
  assert.equal(fallbackModelFor("openai/gpt-oss-120b", { OPENROUTER_FALLBACK_MODEL: "openai/gpt-oss-120b" }), null);
});
