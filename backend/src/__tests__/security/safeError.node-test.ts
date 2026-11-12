// Run with: npm run test:security
// Checkpoint 0 — log scrubbing: provider errors must keep their diagnostic value but never carry
// credentials or the request body (which can contain birth details).
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeError, logError, redactSecrets } from "../../utils/safeError.js";

// A faithful miniature of an axios error: config holds the Authorization header and the prompt.
function axiosLikeError() {
  const err: any = new Error("Request failed with status code 401");
  err.name = "AxiosError";
  err.code = "ERR_BAD_REQUEST";
  err.config = {
    headers: { Authorization: "Bearer sk-or-v1-THISISASECRETKEY1234567890abcdef" },
    data: JSON.stringify({ messages: [{ role: "user", content: "Born 14 Mar 1991 at 06:42 in Pune, name: Asha Verma" }] }),
  };
  err.request = { _header: "Authorization: Bearer sk-or-v1-THISISASECRETKEY1234567890abcdef" };
  err.response = { status: 401, data: { error: { message: "Invalid API key provided: sk-or-v1-THISISASECRETKEY1234567890abcdef" } } };
  return err;
}

test("describeError keeps useful diagnostics: class, message, code, HTTP status, provider message, stack", () => {
  const info = describeError(axiosLikeError());
  assert.equal(info.name, "AxiosError");
  assert.equal(info.code, "ERR_BAD_REQUEST");
  assert.equal(info.status, 401);
  assert.match(info.message, /status code 401/);
  assert.match(info.providerMessage ?? "", /Invalid API key provided/);
  assert.ok(info.stack && info.stack.split("\n").length <= 6, "stack is kept but bounded");
});

test("describeError never carries credentials, request headers or the request body (birth details)", () => {
  const serialised = JSON.stringify(describeError(axiosLikeError()));
  assert.ok(!serialised.includes("THISISASECRETKEY"), "API key must be redacted even inside the provider's own message");
  assert.ok(!/Authorization/i.test(serialised), "request headers must not be logged");
  assert.ok(!serialised.includes("Asha Verma"), "request body (prompt) must not be logged");
  assert.ok(!serialised.includes("06:42"), "birth time must not be logged");
});

test("describeError copes with non-Error throwables without throwing", () => {
  for (const thrown of [undefined, null, "just a string", 42, {}, { message: 5 }, [], Symbol.for("s")]) {
    assert.doesNotThrow(() => describeError(thrown), String(typeof thrown));
  }
  assert.equal(describeError("plain").message, "plain");
});

test("describeError bounds the provider message and omits unrecognised response bodies", () => {
  const huge: any = new Error("boom");
  huge.response = { status: 500, data: "x".repeat(5000) };
  assert.ok((describeError(huge).providerMessage ?? "").length <= 301);

  const odd: any = new Error("boom");
  odd.response = { status: 502, data: { someUnexpectedShape: { echoedPrompt: "Asha Verma born in Pune" } } };
  const out = JSON.stringify(describeError(odd));
  assert.ok(!out.includes("Asha Verma"), "an unknown body shape is omitted rather than dumped");
});

test("redactSecrets strips bearer tokens, JWTs, provider keys, key=value secrets and DB passwords", () => {
  const dirty = [
    "Authorization: Bearer abcDEF1234567890xyz",
    "token eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1Njc4In0.c2lnbmF0dXJlMTIz",
    "key gsk_abcdefghijklmnop1234",
    "api_key=ZZZZ-super-secret-9999",
    "postgresql://neondb_owner:hunter2hunter2@host/db",
  ].join(" | ");
  const clean = redactSecrets(dirty);
  for (const leaked of ["abcDEF1234567890xyz", "c2lnbmF0dXJlMTIz", "gsk_abcdefghijklmnop1234", "ZZZZ-super-secret-9999", "hunter2hunter2"]) {
    assert.ok(!clean.includes(leaked), `leaked: ${leaked}`);
  }
});

test("logError emits a single scrubbed object (what actually reaches the console)", () => {
  const captured: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void captured.push(args);
  try {
    logError("Birth chart analyze error:", axiosLikeError());
  } finally {
    console.error = original;
  }
  assert.equal(captured.length, 1);
  assert.equal(captured[0][0], "Birth chart analyze error:");
  const out = JSON.stringify(captured[0]);
  assert.ok(!out.includes("THISISASECRETKEY") && !out.includes("Asha Verma"));
  assert.match(out, /401/);
});
