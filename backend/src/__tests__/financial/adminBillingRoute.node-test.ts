// Run with: npm run test:db:run -- src/__tests__/financial/adminBillingRoute.node-test.ts
//
// Checkpoint 1 — the SUPERADMIN billing-failures router: a live chat's rolling hold is never listed as stuck and
// can never be released by mistake; orphaned holds are listed and releasable (audited); /reconciliation is a
// read-only books check. Mounted on a bare Express app with a stub admin (auth itself is covered elsewhere).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, beat, at, assertWalletSound, type Ctx } from "./helpers.js";

let ctx: Ctx;
let server: Server;
let base = "";
let adminId = "";

before(async () => {
  if (skip) return;
  ctx = await boot("fin-adminrt");
  adminId = await makeUser(ctx, "admin");
  const { createBillingFailuresRouter } = await import("../../modules/admin/billingFailures.route.js");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = { id: adminId, role: "SUPERADMIN" }; req.adminEmail = `admin${ctx.DOM}`; next(); });
  app.use("/billing-failures", createBillingFailuresRouter());
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode ?? 500).json({ status: false, message: err.message }));
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/billing-failures`;
});
after(async () => {
  if (skip) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await ctx.prisma.adminAuditLog.deleteMany({ where: { actorId: adminId } });
  await shutdown(ctx);
});

const OLD = () => new Date(Date.now() - 60 * 60 * 1000);

test("a live chat's hold is not listed as stuck and cannot be released (409) — the chat keeps its funds", { skip }, async () => {
  const userId = await makeUser(ctx, "livehold");
  await fund(ctx, userId, { purchased: 3000 });
  await burnFree(ctx, userId);
  const live = await activate(ctx, userId, await makeAstrologer(ctx, "live"));
  await ctx.prisma.walletReservation.updateMany({ where: { referenceId: live.id }, data: { createdAt: OLD() } });
  const hold = await ctx.prisma.walletReservation.findFirstOrThrow({ where: { referenceId: live.id, status: "HELD" } });

  const list = await (await fetch(base)).json();
  const listed = (list.data.reservations as any[]).map((r) => r.id);
  assert.ok(!listed.includes(hold.id), "an hour-old hold of a LIVE chat must not appear in the stuck list");

  const res = await fetch(`${base}/reservations/${hold.id}/release`, { method: "POST" });
  assert.equal(res.status, 409);
  const still = await ctx.prisma.walletReservation.findUniqueOrThrow({ where: { id: hold.id } });
  assert.equal(still.status, "HELD", "the live chat's hold is untouched");

  beat(ctx, live, 30);
  await ctx.billing.endSession(live.id, "USER_ENDED", at(live, 30));
  await assertWalletSound(ctx, userId);
});

test("an orphaned hold (its chat already ended) is listed with a reason and can be released, with an audit record", { skip }, async () => {
  const userId = await makeUser(ctx, "orphanhold");
  await fund(ctx, userId, { purchased: 3000 });
  await burnFree(ctx, userId);
  const live = await activate(ctx, userId, await makeAstrologer(ctx, "orph"));
  beat(ctx, live, 10);
  await ctx.billing.endSession(live.id, "USER_ENDED", at(live, 10));
  const w = await ctx.prisma.wallet.findUniqueOrThrow({ where: { userId } });
  const { reservation } = await ctx.wallet.createReservation(w.id, 200, "CHAT_LOOKAHEAD", live.id); // legacy-style leak
  await ctx.prisma.walletReservation.update({ where: { id: reservation!.id }, data: { createdAt: OLD() } });

  const list = await (await fetch(base)).json();
  const found = (list.data.reservations as any[]).find((r) => r.id === reservation!.id);
  assert.ok(found, "the orphan appears in the stuck list");
  assert.equal(found.reason, "ORPHAN_CHAT_HOLD");

  const res = await fetch(`${base}/reservations/${reservation!.id}/release`, { method: "POST" });
  assert.equal(res.status, 200);
  assert.equal((await ctx.prisma.walletReservation.findUniqueOrThrow({ where: { id: reservation!.id } })).status, "RELEASED");
  assert.equal(await ctx.prisma.adminAuditLog.count({ where: { actorId: adminId, action: "billing_failure.reservation_released", entityId: reservation!.id } }), 1);
  await assertWalletSound(ctx, userId);
});

test("GET /reconciliation is read-only and reports clean books for healthy data", { skip }, async () => {
  const userId = await makeUser(ctx, "recon");
  await fund(ctx, userId, { purchased: 3000 });
  await burnFree(ctx, userId);
  const live = await activate(ctx, userId, await makeAstrologer(ctx, "rec"));
  beat(ctx, live, 43);
  await ctx.billing.endSession(live.id, "USER_ENDED", at(live, 43));

  const before = await ctx.prisma.walletTransaction.count();
  const body = await (await fetch(`${base}/reconciliation`)).json();
  assert.equal(body.status, true);
  assert.ok(Array.isArray(body.data.issues));
  assert.ok(body.data.checkedWallets >= 1 && body.data.checkedSessions >= 1);
  const mine = (body.data.issues as any[]).filter((i) => i.userId === userId);
  assert.deepEqual(mine, [], "no discrepancies for a healthy user");
  assert.equal(await ctx.prisma.walletTransaction.count(), before, "the endpoint wrote nothing");
});
