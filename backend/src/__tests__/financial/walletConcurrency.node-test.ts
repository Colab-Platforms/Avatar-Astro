// Run with: npm run test:db:run -- src/__tests__/financial/walletConcurrency.node-test.ts
//
// Checkpoint 1 — concurrent spending: a live chat and premium tools share one wallet and can never
// overspend it, spend each other's held coins, or drive any balance negative.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, at, beat, runTicks, sessionRow, walletRow, sessionDebits, assertWalletSound, mulberry32, cumulative, type Ctx, type Astro } from "./helpers.js";

let ctx: Ctx;
let seq = 0;
const freshAstro = (): Promise<Astro> => makeAstrologer(ctx, `y${++seq}`);
const TOOL = "fin-conc-tool";
const PRICE = 400;

before(async () => {
  if (skip) return;
  ctx = await boot("fin-conc");
  await ctx.prisma.toolPrice.upsert({ where: { toolKey: TOOL }, update: { coinPriceSubunits: PRICE, isActive: true }, create: { toolKey: TOOL, coinPriceSubunits: PRICE, isActive: true } });
});
after(async () => {
  if (skip) return;
  await ctx.prisma.toolPrice.deleteMany({ where: { toolKey: TOOL } });
  await shutdown(ctx);
});

const execId = (userId: string, key: string) => ctx.toolBilling.getExecutionId({ headers: { "idempotency-key": key }, user: { id: userId } });

test("a live chat's hold cannot be spent by premium tools: 5 simultaneous 400-paise tool runs against 1000 paise with a 350 chat hold => exactly 1 succeeds", { skip }, async () => {
  const userId = await makeUser(ctx, "share");
  await fund(ctx, userId, { purchased: 1000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro()); // chat holds 350 (30s lookahead at 700/min)
  assert.equal((await walletRow(ctx, userId)).reservedBalancePaise, 350);

  const runs = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => ctx.toolBilling.reserveToolExecution(userId, TOOL, execId(userId, `T${i}`))));
  const won = runs.filter((r) => r.status === "fulfilled").length;
  assert.equal(won, 1, "only floor((1000-350)/400) = 1 tool run fits beside the chat's hold");
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.reservedBalancePaise, 350 + PRICE);

  // The chat still has everything it was promised: it can run its full hold window.
  beat(ctx, s, 30);
  await ctx.billing.tick(s.id, at(s, 30));
  assert.equal((await sessionRow(ctx, s.id)).amountPaise, 350);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 30));
  await assertWalletSound(ctx, userId);
});

test("tools running DURING a chat: the chat cannot overdraw into a tool's hold; funds exhaust at the exact boundary", { skip }, async () => {
  const userId = await makeUser(ctx, "squeeze");
  await fund(ctx, userId, { purchased: 1100 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  const tool = await ctx.toolBilling.reserveToolExecution(userId, TOOL, execId(userId, "mid"));
  assert.ok(tool.execution);

  // The chat may only use the 700 paise not held by the tool (1100 - 400).
  beat(ctx, s, 120);
  await ctx.billing.tick(s.id, at(s, 120));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.equal(row.billedSeconds, 60, "700 paise buys 60s; the tool's 400 were untouchable");
  assert.equal(row.amountPaise, 700);
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 400);
  assert.equal(w.reservedBalancePaise, 400, "the tool's hold is intact");

  await ctx.toolBilling.settleToolExecution(execId(userId, "mid"), { ok: true });
  const final = await assertWalletSound(ctx, userId);
  assert.equal(final.balancePaise, 0);
});

test("stress: 40 concurrent random debits, credits, reservations, releases and settles never produce a negative or inconsistent wallet", { skip }, async () => {
  const userId = await makeUser(ctx, "stress");
  await fund(ctx, userId, { promo: 700, purchased: 2300 });
  const w0 = await ctx.wallet.getOrCreateWallet(userId);
  const rand = mulberry32(7);

  const ops = Array.from({ length: 40 }, (_, i) => async () => {
    const amount = 50 + Math.floor(rand() * 400);
    switch (i % 5) {
      case 0: return ctx.wallet.debitWithAllocations(w0.id, amount, "TOOL_EXECUTION", { idempotencyKey: `stress-d-${i}` });
      case 1: return ctx.wallet.creditToBucket(w0.id, amount, i % 2 ? "PURCHASED" : "PROMOTIONAL", "RECHARGE", { idempotencyKey: `stress-c-${i}` });
      case 2: { const { reservation } = await ctx.wallet.createReservation(w0.id, amount, "TOOL_EXECUTION", `stress-r-${i}`); if (reservation) await ctx.wallet.releaseReservation(reservation.id); return; }
      case 3: { const { reservation } = await ctx.wallet.createReservation(w0.id, amount, "TOOL_EXECUTION", `stress-s-${i}`); if (reservation) await ctx.wallet.settleFromReservation(reservation.id, amount, "TOOL_EXECUTION", { idempotencyKey: `stress-ss-${i}`, finalize: true }); return; }
      default: return ctx.wallet.debitWithAllocations(w0.id, amount, "TOOL_EXECUTION", { idempotencyKey: `stress-e-${i}` });
    }
  });
  const results = await Promise.allSettled(ops.map((op) => op()));
  // Insufficient-balance rejections are legitimate; anything else is a bug.
  for (const r of results) if (r.status === "rejected") assert.equal((r.reason as any)?.statusCode, 409, `unexpected failure: ${(r.reason as any)?.message}`);
  const w = await assertWalletSound(ctx, userId);
  assert.ok(w.balancePaise >= 0);
  const settledHeld = await ctx.prisma.walletReservation.count({ where: { walletId: w.id, status: "HELD", amountPaise: 0 } });
  assert.equal(settledHeld, 0, "no zero-amount reservation is left HELD after settlement");
});

test("many concurrent chats on different wallets bill independently and exactly", { skip }, async () => {
  const sessions = [];
  for (let i = 0; i < 6; i++) {
    const a = await makeAstrologer(ctx, `par${i}`);
    const userId = await makeUser(ctx, `par${i}`);
    await fund(ctx, userId, { purchased: 3000 });
    await burnFree(ctx, userId);
    sessions.push({ userId, s: await activate(ctx, userId, a), seconds: 17 + i * 11 });
  }
  await Promise.all(sessions.map(async ({ s, seconds }) => { await runTicks(ctx, s, Math.floor(seconds / 5) * 5, 5); beat(ctx, s, seconds); await ctx.billing.endSession(s.id, "USER_ENDED", at(s, seconds)); }));
  for (const { userId, s, seconds } of sessions) {
    const row = await sessionRow(ctx, s.id);
    assert.equal(row.billedSeconds, seconds);
    assert.equal(row.amountPaise, cumulative(seconds));
    assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(seconds));
    await assertWalletSound(ctx, userId);
  }
});
