import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

// These tests only exercise the role check inside auth("ADMIN") itself (a pure JWT-claim
// check, no database call) — never requireMainAdmin's DB re-check, which this process has
// no migrated database to exercise. That composition (auth + requireMainAdmin together) is
// covered by the existing admin test suite (test:admin) against a real throwaway database
// once this domain's migration has been applied — see the implementation report for what's
// blocked and why.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-only-jwt-secret";

const { auth } = await import("../../../../middleware/authMiddleware.js");
const { createAstrologerAdminRouter } = await import("../astrologerAdmin.route.js");
const { requireMainAdmin } = await import("../../../../middleware/mainAdmin.js");

const userToken = jwt.sign({ id: "test-user", role: "USER" }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ id: "test-admin", role: "ADMIN" }, process.env.JWT_SECRET);

let server: Server;
let base = "";
before(() => {
  const app = express();
  app.use(express.json());
  // Mirrors admin.route.ts's router.use(noStore, auth("ADMIN"), requireMainAdmin) composition,
  // minus noStore (irrelevant to authorization), so the astrologer admin router is tested the
  // same way it is actually mounted.
  const router = express.Router();
  router.use(auth("ADMIN"), requireMainAdmin);
  router.use(createAstrologerAdminRouter());
  app.use("/api/admin/astrologers", router);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || err.status || 500).json({ status: false, error: err.message });
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const call = (method: string, path: string, token?: string) =>
  fetch(`${base}/api/admin/astrologers${path}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });

test("GET /overview: 401 without a token", async () => {
  assert.equal((await call("GET", "/overview")).status, 401);
});

test("GET /overview: a plain USER is forbidden (never reaches requireMainAdmin's DB check)", async () => {
  assert.equal((await call("GET", "/overview", userToken)).status, 403);
});

test("POST /applications/:id/approve: a plain USER cannot approve", async () => {
  assert.equal((await call("POST", "/applications/any-id/approve", userToken)).status, 403);
});

test("POST /applications/:id/suspend: a plain USER cannot suspend", async () => {
  assert.equal((await call("POST", "/applications/any-id/suspend", userToken)).status, 403);
});

test("PATCH /settings/scanning: a plain USER cannot toggle malware scanning", async () => {
  assert.equal((await call("PATCH", "/settings/scanning", userToken)).status, 403);
});

test("GET /overview: an ADMIN-role token without being the DB-verified SUPERADMIN gets refused once requireMainAdmin runs", async () => {
  // auth("ADMIN") lets this token past the JWT-claim check (ADMIN is allowed, and SUPERADMIN
  // is auto-added to the effective role list) — the real decision is requireMainAdmin's DB
  // re-check, which fails here because there's no reachable database in this unit test. It
  // must still refuse, not silently allow through: 503 (DB unreachable, fails closed) or 403
  // (not main admin) are both acceptable refusals; 200 would be the actual bug this guards.
  const res = await call("GET", "/overview", adminToken);
  assert.ok([403, 503].includes(res.status), `expected a refusal, got ${res.status}`);
});
