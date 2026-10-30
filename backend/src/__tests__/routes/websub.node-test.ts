// Run with: npm run test:websub   (node:test via tsx). No network, no database: the YouTube lookup is never reached.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { verifyWebSubSignature } from "../../modules/darshan/darshan.signature.js";

let server: Server;
let base = "";
const BODY = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abc123</yt:videoId></entry></feed>`;
const sign = (secret: string, body = BODY, algo = "sha1") => `${algo}=${crypto.createHmac(algo, secret).update(body).digest("hex")}`;

before(async () => {
  delete process.env.YOUTUBE_API_KEY; // no key: a verified notification stops before any outbound call
  const { default: darshanRoutes } = await import("../../modules/darshan/darshan.public.route.js");
  const app = express();
  app.use("/api/darshan", darshanRoutes);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());
beforeEach(() => { delete process.env.DARSHAN_WEBSUB_SECRET; });

const post = (headers: Record<string, string> = {}, body = BODY) =>
  fetch(`${base}/api/darshan/websub/callback`, { method: "POST", headers: { "Content-Type": "application/atom+xml", ...headers }, body });

test("signature check: accepts a correct HMAC, rejects wrong, missing and malformed values", () => {
  assert.equal(verifyWebSubSignature("s3cret", BODY, sign("s3cret")), true);
  assert.equal(verifyWebSubSignature("s3cret", BODY, sign("s3cret", BODY, "sha256")), true);
  assert.equal(verifyWebSubSignature("s3cret", BODY, sign("other")), false);
  assert.equal(verifyWebSubSignature("s3cret", BODY + " ", sign("s3cret")), false);
  assert.equal(verifyWebSubSignature("s3cret", BODY, undefined), false);
  assert.equal(verifyWebSubSignature("s3cret", BODY, "sha1=zz"), false);
  assert.equal(verifyWebSubSignature("s3cret", BODY, "md5=abcd"), false);
});

test("webhook with a secret configured: unsigned and forged notifications get 403, signed get 204", async () => {
  process.env.DARSHAN_WEBSUB_SECRET = "s3cret";
  assert.equal((await post()).status, 403);
  assert.equal((await post({ "X-Hub-Signature": sign("wrong") })).status, 403);
  assert.equal((await post({ "X-Hub-Signature": sign("s3cret") })).status, 204);
});

test("webhook without a secret keeps the previous behaviour (accepted, still not trusted)", async () => {
  assert.equal((await post()).status, 204);
});

test("verification handshake (GET) still echoes the challenge", async () => {
  process.env.DARSHAN_WEBSUB_SECRET = "s3cret";
  const r = await fetch(`${base}/api/darshan/websub/callback?hub.challenge=xyz`);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "xyz");
});
