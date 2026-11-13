// Run with: npm run test:db:run -- src/__tests__/financial/toolScoping.node-test.ts
//
// Checkpoint 1 — premium-tool execution ids are scoped to the user, a settled hold is never left HELD,
// and two simultaneous reservations for one id leak nothing.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, fund, assertWalletSound, walletRow, type Ctx } from "./helpers.js";

let ctx: Ctx;
const TOOL = "fin-test-tool";
const PRICE = 400;
before(async () => {
  if (skip) return;
  ctx = await boot("fin-tool");
  await ctx.prisma.toolPrice.upsert({ where: { toolKey: TOOL }, update: { coinPriceSubunits: PRICE, isActive: true }, create: { toolKey: TOOL, coinPriceSubunits: PRICE, isActive: true } });
});
after(async () => {
  if (skip) return;
  await ctx.prisma.toolPrice.deleteMany({ where: { toolKey: TOOL } });
  await shutdown(ctx);
});

const reqFor = (userId: string | undefined, key?: string) => ({ headers: key ? { "idempotency-key": key } : {}, user: userId ? { id: userId } : undefined });

test("getExecutionId scopes a client-supplied key to the user, so two users sending the same key get different executions", { skip }, async () => {
  const a = ctx.toolBilling.getExecutionId(reqFor("user-a", "same-key"));
  const b = ctx.toolBilling.getExecutionId(reqFor("user-b", "same-key"));
  assert.notEqual(a, b);
  assert.equal(a, ctx.toolBilling.getExecutionId(reqFor("user-a", "same-key")), "stable for retries by the same user");
  assert.ok(a.length <= 260);
  const anon1 = ctx.toolBilling.getExecutionId(reqFor(undefined));
  const anon2 = ctx.toolBilling.getExecutionId(reqFor(undefined));
  assert.notEqual(anon1, anon2, "no key + no user => a fresh random id each time");
});

test("another user can neither read nor mutate someone else's execution, even knowing its exact id", { skip }, async () => {
  const alice = await makeUser(ctx, "alice");
  const bob = await makeUser(ctx, "bob");
  await fund(ctx, alice, { purchased: 2000 });
  await fund(ctx, bob, { purchased: 2000 });

  const aliceId = ctx.toolBilling.getExecutionId(reqFor(alice, "K1"));
  const reserved = await ctx.toolBilling.reserveToolExecution(alice, TOOL, aliceId);
  assert.equal(reserved.alreadySettled, false);
  await ctx.toolBilling.settleToolExecution(aliceId, { reading: "alice-private-birth-chart-reading" });

  // Bob learns Alice's exact stored id and replays it.
  await assert.rejects(ctx.toolBilling.reserveToolExecution(bob, TOOL, aliceId), (e: any) => [403, 404, 409].includes(e?.statusCode));
  // Bob using the same RAW key gets his own, separate execution.
  const bobId = ctx.toolBilling.getExecutionId(reqFor(bob, "K1"));
  const bobRes = await ctx.toolBilling.reserveToolExecution(bob, TOOL, bobId);
  assert.equal(bobRes.alreadySettled, false, "Bob must not be handed Alice's settled result");
  assert.equal(bobRes.execution?.userId, bob);
  await ctx.toolBilling.releaseToolExecution(bobId, "RELEASED");

  const aliceRow = await ctx.prisma.toolExecution.findUniqueOrThrow({ where: { executionId: aliceId } });
  assert.equal(aliceRow.userId, alice);
  assert.equal(aliceRow.status, "SETTLED", "Alice's row was not touched");
  assert.equal(JSON.stringify(aliceRow.resultPayload).includes("alice-private"), true);
  assert.equal((await walletRow(ctx, bob)).balancePaise, 2000, "Bob was not charged for Alice's execution");
  await assertWalletSound(ctx, alice);
  await assertWalletSound(ctx, bob);
});

test("a settled tool execution leaves its reservation SETTLED with a timestamp — never a zero-amount HELD row", { skip }, async () => {
  const userId = await makeUser(ctx, "settled");
  await fund(ctx, userId, { purchased: 1000 });
  const id = ctx.toolBilling.getExecutionId(reqFor(userId, "S1"));
  const res = await ctx.toolBilling.reserveToolExecution(userId, TOOL, id);
  await ctx.toolBilling.settleToolExecution(id, { ok: true });

  const reservation = await ctx.prisma.walletReservation.findUniqueOrThrow({ where: { id: res.execution!.reservationId! } });
  assert.equal(reservation.status, "SETTLED");
  assert.ok(reservation.resolvedAt);
  assert.equal(reservation.amountPaise, 0);
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 1000 - PRICE);
  assert.equal(w.reservedBalancePaise, 0);

  // Retrying the settle is a no-op.
  await ctx.toolBilling.settleToolExecution(id, { ok: true });
  assert.equal((await walletRow(ctx, userId)).balancePaise, 1000 - PRICE, "no double charge on retry");
});

test("two simultaneous reservations for the SAME execution id: one wins, the other is rejected and leaks no hold", { skip }, async () => {
  for (let i = 0; i < 8; i++) {
    const userId = await makeUser(ctx, `dup${i}`);
    await fund(ctx, userId, { purchased: 2000 });
    const id = ctx.toolBilling.getExecutionId(reqFor(userId, `D${i}`));
    const results = await Promise.allSettled([
      ctx.toolBilling.reserveToolExecution(userId, TOOL, id),
      ctx.toolBilling.reserveToolExecution(userId, TOOL, id),
      ctx.toolBilling.reserveToolExecution(userId, TOOL, id),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1, `iteration ${i}: exactly one reservation wins`);
    const held = await ctx.prisma.walletReservation.findMany({ where: { wallet: { userId }, status: "HELD" } });
    assert.equal(held.length, 1, `iteration ${i}: exactly one HELD row (found ${held.length})`);
    const w = await assertWalletSound(ctx, userId);
    assert.equal(w.reservedBalancePaise, PRICE);
    await ctx.toolBilling.releaseToolExecution(id, "RELEASED");
    assert.equal((await walletRow(ctx, userId)).reservedBalancePaise, 0);
  }
});
