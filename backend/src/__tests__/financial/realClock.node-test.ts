// Run with: npm run test:db:run -- src/__tests__/financial/realClock.node-test.ts   (~25s of real time)
//
// Checkpoint 1 — end-to-end on the REAL clock: real 5-second billing timers, real heartbeats, and the
// exact-boundary exhaustion guard. The simulated-clock suites prove the arithmetic; this proves the wiring
// (timer -> tick -> settleSession -> publish) stops a chat at the boundary SECOND, not up to one tick late.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, assertWalletSound, sessionRow, type Ctx } from "./helpers.js";

let ctx: Ctx;
before(async () => { if (!skip) ctx = await boot("fin-real"); });
after(async () => { if (!skip) await shutdown(ctx); });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Starts an ACTIVE session directly (so a deliberately tiny runway can be tested) and runs it on real timers. */
async function startLive(userId: string, ratePaise: number) {
  const astro = await makeAstrologer(ctx, `r${Math.random().toString(36).slice(2, 8)}`);
  const startedAt = new Date();
  const s = await ctx.prisma.chatSession.create({
    data: { userId, astrologerProfileId: astro.profileId, type: "PAID", status: "ACTIVE", ratePerMinutePaise: ratePaise, acceptedAt: startedAt, startedAt, lastBilledAt: startedAt },
  });
  const beats = setInterval(() => { ctx.billing.recordHeartbeat(s.id, "USER"); ctx.billing.recordHeartbeat(s.id, "ASTROLOGER"); }, 1000);
  ctx.billing.recordHeartbeat(s.id, "USER");
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER");
  ctx.billing.registerSession(s.id);
  return { id: s.id, startedAt: startedAt.getTime(), stop: () => clearInterval(beats) };
}

async function waitEnded(id: string, maxMs: number) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const row = await sessionRow(ctx, id);
    if (row.status === "ENDED") return row;
    await sleep(100);
  }
  return sessionRow(ctx, id);
}

test("real clock: a user with 12 free seconds left and no coins is cut off at ~12.0s — not at the next 5s tick (15s)", { skip }, async () => {
  const userId = await makeUser(ctx, "free12");
  await ctx.free.getOrCreateFreeAllowance(userId);
  await ctx.prisma.chatFreeAllowance.update({ where: { userId }, data: { consumedSeconds: 48 } }); // 12s left
  const live = await startLive(userId, 700);
  try {
    const row = await waitEnded(live.id, 25_000);
    assert.equal(row.status, "ENDED");
    assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
    assert.equal(row.billedSeconds, 12, "exactly the 12 free seconds were delivered");
    assert.equal(row.freeSecondsUsed, 12);
    assert.equal(row.amountPaise, 0);
    const lived = row.endedAt!.getTime() - live.startedAt;
    assert.ok(lived >= 11_500 && lived <= 13_800, `ended after ${lived}ms; expected ~12000ms (a plain 5s tick would have ended it at ~15000ms)`);
    const allowance = await ctx.prisma.chatFreeAllowance.findUniqueOrThrow({ where: { userId } });
    assert.equal(allowance.consumedSeconds, 60);
    await assertWalletSound(ctx, userId);
  } finally { live.stop(); }
});

test("real clock: paid funds that buy exactly 6 seconds end the chat at ~6.0s, billing exactly the funds — never a coin more", { skip }, async () => {
  const userId = await makeUser(ctx, "paid6");
  await fund(ctx, userId, { purchased: 600 });
  await burnFree(ctx, userId);
  const live = await startLive(userId, 6000); // ₹60/min => 600 paise buys exactly 6 seconds
  try {
    const row = await waitEnded(live.id, 25_000);
    assert.equal(row.status, "ENDED");
    assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
    assert.equal(row.billedSeconds, 6);
    assert.equal(row.amountPaise, 600);
    const lived = row.endedAt!.getTime() - live.startedAt;
    assert.ok(lived >= 5_500 && lived <= 7_800, `ended after ${lived}ms; expected ~6000ms`);
    const w = await assertWalletSound(ctx, userId);
    assert.equal(w.balancePaise, 0);
    assert.equal(w.reservedBalancePaise, 0);
  } finally { live.stop(); }
});

test("real clock: a session whose participants stop heart-beating is paused by the real timer and bills only through the last confirmed instant", { skip }, async () => {
  const userId = await makeUser(ctx, "lapse");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const live = await startLive(userId, 700);
  await sleep(4000);
  live.stop(); // both sides vanish; the last heartbeat was ~4s in
  const deadline = Date.now() + 30_000;
  let row = await sessionRow(ctx, live.id);
  while (Date.now() < deadline && row.status === "ACTIVE") { await sleep(500); row = await sessionRow(ctx, live.id); }
  ctx.billing.unregisterSession(live.id);
  assert.equal(row.status, "PAUSED");
  // The last heartbeat landed ~3-4s in and vouches for one 10s period => billed ~13-14s. The old behaviour billed 15s+
  // (every tick inside the 15s presence timeout billed to "now"), and the lapse is only noticed at ~20s.
  assert.ok(row.billedSeconds >= 12 && row.billedSeconds <= 14.6, `billed ${row.billedSeconds}s; expected ~13-14s (last beat + one vouched 10s interval), not the ~20s until the lapse was noticed`);
  assert.ok(row.pausedAt && row.presenceGraceEndsAt);
  await ctx.billing.endSession(live.id, "DISCONNECTED");
  const ended = await sessionRow(ctx, live.id);
  assert.equal(ended.billedSeconds, row.billedSeconds, "the disconnect adds nothing");
  await assertWalletSound(ctx, userId);
});
