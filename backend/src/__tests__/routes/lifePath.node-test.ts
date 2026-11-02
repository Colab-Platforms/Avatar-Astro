// Life Path Reading: provider failures map to understandable statuses. No database or network needed.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgresql://x:x@127.0.0.1:1/x";

test("life path provider failures become clear, retry-friendly responses", async () => {
  const { lifePathFailure } = await import("../../routes/innerVoiceRoutes.js");
  const e = (name: string, httpStatus?: number) => Object.assign(new Error("x"), { name, httpStatus });

  assert.deepEqual(lifePathFailure(e("TimeoutError")).status, 504);
  assert.equal(lifePathFailure(e("AbortError")).kind, "TIMEOUT");
  const busy = lifePathFailure(e("ProviderError", 429));
  assert.deepEqual([busy.status, busy.kind, busy.retryAfter], [429, "PROVIDER_BUSY", 60]);
  for (const st of [401, 402, 403]) assert.equal(lifePathFailure(e("ProviderError", st)).status, 503, `provider ${st} is an outage for the user, not their mistake`);
  assert.equal(lifePathFailure(e("ProviderError", 500)).status, 502);
  assert.equal(lifePathFailure(new Error("boom")).status, 502);
  for (const st of [504, 429, 503, 502]) {
    const m = lifePathFailure(e("ProviderError", st)).message;
    assert.doesNotMatch(m, /openrouter|gemma|api key|sk-/i, "no provider internals shown to users");
  }
});
