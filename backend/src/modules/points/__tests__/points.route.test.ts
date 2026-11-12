import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createPointsRouter } from "../points.route.js";
import { fakeDb } from "./fakeDb.js";

/** Mounts the real router on a tiny app. A stub plays the part of auth("USER"): it sets req.user from a header, as the JWT middleware would. */
let server: Server, base = "", f: ReturnType<typeof fakeDb>;
const call = (path: string, user: string | null, init: RequestInit = {}) =>
  fetch(base + path, { ...init, headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) } }).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }));

before(async () => {
  f = fakeDb();
  f.t.readings.add("aries:" + new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const app = express();
  app.use(express.json());
  app.use((req: any, res, next) => { const u = req.headers["x-test-user"]; if (!u) return res.status(401).json({ status: false, message: "Unauthorized" }); req.user = { id: String(u) }; next(); });
  app.use("/me", createPointsRouter(f.db));
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode ?? 500).json({ status: false, message: err.message }));
  await new Promise<void>((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me`;
});
after(() => { server.close(); });

const STEPS = { read: true, shuffled: true, revealed: true };

describe("points routes", () => {
  it("require a signed-in user", async () => {
    for (const p of ["/rewards", "/rewards/transactions", "/rewards/totals", "/horoscope/streak", "/karma/summary"]) assert.equal((await call(p, null)).status, 401, p);
    assert.equal((await call("/horoscope/complete", null, { method: "POST", body: "{}" })).status, 401);
  });

  it("completing uses the token's user and ignores any points, user or date the client sends", async () => {
    const r = await call("/horoscope/complete", "alice", { method: "POST", body: JSON.stringify({ sign: "aries", steps: STEPS, points: 5000, userId: "bob", localDate: "2000-01-01" }) });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.balance, 10);
    assert.equal(f.t.ledger.every((l) => l.userId === "alice" && l.points === 10), true);
  });

  it("a repeat is a 200 'already completed' with nothing added", async () => {
    const r = await call("/horoscope/complete", "alice", { method: "POST", body: JSON.stringify({ sign: "aries", steps: STEPS }) });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.alreadyCompleted, true);
    assert.equal(r.body.data.balance, 10);
  });

  it("validation errors are 400 and a missing reading is 409", async () => {
    assert.equal((await call("/horoscope/complete", "carol", { method: "POST", body: JSON.stringify({ sign: "dragon", steps: STEPS }) })).status, 400);
    assert.equal((await call("/horoscope/complete", "carol", { method: "POST", body: JSON.stringify({ sign: "aries", steps: { read: true } }) })).status, 400);
    assert.equal((await call("/horoscope/complete", "carol", { method: "POST", body: JSON.stringify({ sign: "leo", steps: STEPS }) })).status, 409);
  });

  it("users never see each other's balance or transactions", async () => {
    assert.equal((await call("/rewards", "alice", {})).body.data.balance, 10);
    assert.equal((await call("/rewards", "bob", {})).body.data.balance, 0);
    assert.equal((await call("/rewards/transactions", "bob", {})).body.data.total, 0);
    assert.equal((await call("/rewards/transactions?userId=alice", "bob", {})).body.data.total, 0);
    const t = await call("/rewards/transactions", "alice", {});
    assert.equal(t.body.data.items.length, 1);
    assert.deepEqual((await call("/rewards/totals", "alice", {})).body.data.bySource, [{ source: "horoscope_daily", points: 10, count: 1 }]);
  });

  it("karma practices: only approved ids, amounts come from the server", async () => {
    const ok = await call("/karma/practices", "alice", { method: "POST", body: JSON.stringify({ practices: ["mantra"], points: 9999 }) });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.awarded.points, 8);
    assert.equal((await call("/karma/practices", "alice", { method: "POST", body: JSON.stringify({ practices: ["mantra"] }) })).body.data.awarded.points, 0);
    assert.equal((await call("/karma/practices", "alice", { method: "POST", body: JSON.stringify({ practices: ["nope"] }) })).status, 400);
    assert.equal((await call("/karma/summary", "alice", {})).body.data.todayPoints, 8);
    assert.equal((await call("/karma/summary", "bob", {})).body.data.totalPoints, 0);
  });
});
