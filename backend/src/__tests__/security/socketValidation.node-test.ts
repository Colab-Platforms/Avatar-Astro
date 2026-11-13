// Run with: npm run test:security
// Checkpoint 0 — pure validation of Socket.IO chat payloads and the defensive ack plumbing.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SocketPayloadError,
  codeForStatus,
  parseMessagePayload,
  parseSessionPayload,
  parseTypingPayload,
  splitArgs,
} from "../../realtime/socketValidation.js";

const GOOD_ID = "cmabc123_DEF-456";

// Everything a hostile or buggy client can send in place of a payload object.
const NOT_AN_OBJECT: unknown[] = [undefined, null, 0, 42, NaN, true, false, "", "sessionId", [], [{ sessionId: GOOD_ID }], () => undefined, Symbol("x")];

test("parseSessionPayload accepts a well-formed payload", () => {
  assert.deepEqual(parseSessionPayload({ sessionId: GOOD_ID }), { sessionId: GOOD_ID });
  assert.deepEqual(parseSessionPayload({ sessionId: GOOD_ID, extra: "ignored" }), { sessionId: GOOD_ID });
});

test("parseSessionPayload rejects every non-object payload with a typed error, never a TypeError", () => {
  for (const bad of NOT_AN_OBJECT) {
    assert.throws(() => parseSessionPayload(bad), (e: unknown) => e instanceof SocketPayloadError && e.code === "BAD_PAYLOAD", `payload ${String(typeof bad)}`);
  }
});

test("parseSessionPayload rejects bad session ids", () => {
  const badIds: unknown[] = [undefined, null, 123, {}, [], { $ne: 1 }, "", " ", "has space", "../../etc", "a/b", "a:b", "x".repeat(65), "emoji😀", "line\nbreak"];
  for (const sessionId of badIds) {
    assert.throws(() => parseSessionPayload({ sessionId }), SocketPayloadError, JSON.stringify(sessionId));
  }
});

test("parseMessagePayload requires string content (no silent coercion of numbers/objects/null)", () => {
  assert.deepEqual(parseMessagePayload({ sessionId: GOOD_ID, content: "hello" }), { sessionId: GOOD_ID, content: "hello" });
  assert.deepEqual(parseMessagePayload({ sessionId: GOOD_ID, content: "" }), { sessionId: GOOD_ID, content: "" }); // emptiness is the service's call
  for (const content of [undefined, null, 5, true, {}, [], ["a"]]) {
    assert.throws(() => parseMessagePayload({ sessionId: GOOD_ID, content }), SocketPayloadError, JSON.stringify(content));
  }
  for (const bad of NOT_AN_OBJECT) assert.throws(() => parseMessagePayload(bad), SocketPayloadError);
});

test("parseTypingPayload requires a real boolean", () => {
  assert.deepEqual(parseTypingPayload({ sessionId: GOOD_ID, isTyping: false }), { sessionId: GOOD_ID, isTyping: false });
  for (const isTyping of [undefined, null, "true", 1, 0, {}, []]) {
    assert.throws(() => parseTypingPayload({ sessionId: GOOD_ID, isTyping }), SocketPayloadError, JSON.stringify(isTyping));
  }
});

test("splitArgs separates payload from ack, and handles a client that sends only a callback", () => {
  const calls: unknown[][] = [];
  const cb = (...a: unknown[]) => void calls.push(a);

  const withBoth = splitArgs([{ sessionId: GOOD_ID }, cb]);
  assert.deepEqual(withBoth.payload, { sessionId: GOOD_ID });
  withBoth.ack("boom", { code: "BAD_PAYLOAD" });
  withBoth.ack(undefined, { ok: 1 });
  assert.deepEqual(calls, [["boom", { code: "BAD_PAYLOAD" }], [undefined, { ok: 1 }]]);

  const onlyCallback = splitArgs([cb]);
  assert.equal(onlyCallback.payload, undefined, "a lone callback must not be mistaken for the payload");

  const noArgs = splitArgs([]);
  assert.equal(noArgs.payload, undefined);
  assert.doesNotThrow(() => noArgs.ack("nobody is listening"));

  const noAck = splitArgs([{ sessionId: GOOD_ID }]);
  assert.deepEqual(noAck.payload, { sessionId: GOOD_ID });
  assert.doesNotThrow(() => noAck.ack("no callback was supplied"));
});

test("a client callback that throws can never propagate out of ack()", () => {
  const { ack } = splitArgs([{}, () => { throw new Error("client callback exploded"); }]);
  assert.doesNotThrow(() => ack("x", { code: "INTERNAL" }));
  assert.doesNotThrow(() => ack());
});

test("codeForStatus maps HTTP-style statuses to socket error codes", () => {
  assert.equal(codeForStatus(400), "BAD_REQUEST");
  assert.equal(codeForStatus(401), "UNAUTHORIZED");
  assert.equal(codeForStatus(403), "FORBIDDEN");
  assert.equal(codeForStatus(404), "NOT_FOUND");
  assert.equal(codeForStatus(409), "CONFLICT");
  assert.equal(codeForStatus(429), "RATE_LIMITED");
  assert.equal(codeForStatus(500), "INTERNAL");
  assert.equal(codeForStatus(undefined), "INTERNAL");
});
