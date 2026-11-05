import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

// Set before any import that constructs the Prisma adapter (module-load time), so
// construction doesn't throw for these auth-only tests, which never reach a real query.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-only-jwt-secret";

const { createAstrologerRouter } = await import("../astrologer.route.js");
const { setAccountStatusChecker } = await import("../../../middleware/authMiddleware.js");

setAccountStatusChecker(async (id) => id !== "gone-user");
const userToken = jwt.sign({ id: "test-user", role: "USER" }, process.env.JWT_SECRET);
const goneToken = jwt.sign({ id: "gone-user", role: "USER" }, process.env.JWT_SECRET);

let server: Server;
let base = "";
before(() => {
  const app = express();
  app.use(express.json());
  app.use("/api/astrologer", createAstrologerRouter());
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || err.status || 500).json({ status: false, error: err.message });
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = (path: string, token?: string) =>
  fetch(`${base}/api/astrologer${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test("GET /application: 401 without a token", async () => {
  assert.equal((await get("/application")).status, 401);
});

test("GET /application: a forged or garbage token is rejected", async () => {
  assert.equal((await get("/application", "not-a-jwt")).status, 401);
  const forged = jwt.sign({ id: "test-user", role: "USER" }, "some-other-secret");
  assert.equal((await get("/application", forged)).status, 401);
});

test("GET /application: a deactivated account is refused", async () => {
  assert.ok([401, 403].includes((await get("/application", goneToken)).status));
});

test("GET /config: requires sign-in (not a public endpoint)", async () => {
  assert.equal((await get("/config")).status, 401);
});

test("POST /application/submit: 401 without a token", async () => {
  const res = await fetch(`${base}/api/astrologer/application/submit`, { method: "POST" });
  assert.equal(res.status, 401);
});

test("PATCH /application: 401 without a token", async () => {
  const res = await fetch(`${base}/api/astrologer/application`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(res.status, 401);
});
