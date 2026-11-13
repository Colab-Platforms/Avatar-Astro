// Run with: npm run test:db:run -- src/__tests__/financial/chatSettlement.node-test.ts
//
// Checkpoint 1 — regression suite for the chat settlement mechanism. Each test names the defect it pins.
// Real PostgreSQL 17, real transactions and CHECK constraints, simulated clock (see helpers.ts).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, freeRemaining, activate, at, beat, runTicks,
  sessionRow, walletRow, sessionDebits, heldReservations, assertWalletSound, mulberry32, cumulative, WORKED_EXAMPLES,
  RATE_PAISE, type Ctx, type Astro,
} from "./helpers.js";

let ctx: Ctx;
let seq = 0;
/** A brand-new astrologer per use: an unfixed run that leaves a session ACTIVE must not cascade into later tests. */
const freshAstro = (rupees = 7): Promise<Astro> => makeAstrologer(ctx, `x${++seq}`, rupees);

before(async () => {
  if (skip) return;
  ctx = await boot("fin-settle");
});
after(async () => { if (!skip) await shutdown(ctx); });

// ---- DEFECT: no final settlement on any terminal path --------------------------------------------------
for (const [seconds, expectedPaise] of WORKED_EXAMPLES) {
  test(`final settlement: a user ending at ${seconds}s is billed exactly ${expectedPaise} paise (the finalized worked example)`, { skip }, async () => {
    const userId = await makeUser(ctx, `end${seconds}`);
    await fund(ctx, userId, { purchased: 5000 });
    await burnFree(ctx, userId); // pure paid billing
    const s = await activate(ctx, userId, await freshAstro());

    beat(ctx, s, seconds);
    await ctx.billing.endSession(s.id, "USER_ENDED", at(s, seconds));

    const row = await sessionRow(ctx, s.id);
    assert.equal(row.status, "ENDED");
    assert.equal(row.endedReason, "USER_ENDED");
    assert.equal(row.billedSeconds, seconds, "every completed second is accounted for");
    assert.equal(row.amountPaise, expectedPaise);
    const debits = await sessionDebits(ctx, s.id);
    assert.equal(debits.total, expectedPaise, "ledger debits == session charge");
    assert.equal((await heldReservations(ctx, s.id)).length, 0, "no reservation left HELD");
    const w = await assertWalletSound(ctx, userId);
    assert.equal(w.balancePaise, 5000 - expectedPaise);
    assert.equal(w.reservedBalancePaise, 0);
  });
}

test("final settlement is the SAME cumulative formula as a tick: ticks every 5s then an end at 43s == 502, not a sum of per-tick roundings", { skip }, async () => {
  const userId = await makeUser(ctx, "ticks43");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  await runTicks(ctx, s, 40, 5);
  beat(ctx, s, 43);
  await ctx.billing.endSession(s.id, "ASTROLOGER_ENDED", at(s, 43));

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.billedSeconds, 43);
  assert.equal(row.amountPaise, 502);
  assert.equal((await sessionDebits(ctx, s.id)).total, 502);
  await assertWalletSound(ctx, userId);
});

// ---- DEFECT: tick drift silently drops fractional seconds -----------------------------------------------
test("drift: 10 minutes of jittery ticks (5s ± 0.4s) bill every completed second — no fraction is ever lost", { skip }, async () => {
  const userId = await makeUser(ctx, "drift");
  await fund(ctx, userId, { purchased: 20_000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  const rand = mulberry32(20260101);
  let ms = 0;
  while (ms < 600_000) {
    ms += 4600 + Math.floor(rand() * 800); // 4.6s .. 5.4s between ticks
    ctx.billing.recordHeartbeat(s.id, "USER", s.t0 + ms);
    ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", s.t0 + ms);
    await ctx.billing.tick(s.id, new Date(s.t0 + ms));
  }
  const endMs = ms + 777;
  ctx.billing.recordHeartbeat(s.id, "USER", s.t0 + endMs);
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", s.t0 + endMs);
  await ctx.billing.endSession(s.id, "USER_ENDED", new Date(s.t0 + endMs));

  const completed = Math.floor(endMs / 1000);
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.billedSeconds, completed, `billed ${row.billedSeconds}s of ${completed}s completed`);
  assert.equal(row.amountPaise, cumulative(completed));
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(completed));
  await assertWalletSound(ctx, userId);
});

// ---- DEFECT: zero-balance user never consumes the global allowance -------------------------------------
test("zero-balance user: the 60s global allowance is actually consumed, then the chat ENDS — no unpaid grace", { skip }, async () => {
  const userId = await makeUser(ctx, "zero");
  const s = await activate(ctx, userId, await freshAstro()); // no funds at all; allowed because 60 free seconds remain

  await runTicks(ctx, s, 55, 5);
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.freeSecondsUsed, 55);
  assert.equal(await freeRemaining(ctx, userId), 5, "free seconds are really consumed from the global allowance");

  beat(ctx, s, 60);
  await ctx.billing.tick(s.id, at(s, 60));
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED", "free allowance exhausted + no paid coins => ends immediately");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.equal(row.billedSeconds, 60);
  assert.equal(row.freeSecondsUsed, 60);
  assert.equal(row.amountPaise, 0);
  assert.equal(await freeRemaining(ctx, userId), 0);
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 0);
});

test("zero-balance user cannot overrun the allowance with a late tick: capped at 60s, ended, nothing billed", { skip }, async () => {
  const userId = await makeUser(ctx, "zerolate");
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 65);
  await ctx.billing.tick(s.id, at(s, 65)); // 5s past the allowance in one jump

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.equal(row.billedSeconds, 60, "the 5 unpaid seconds are not counted as delivered or owed");
  assert.equal(row.amountPaise, 0);
  assert.equal(await freeRemaining(ctx, userId), 0);
  await assertWalletSound(ctx, userId);
});

test("the free allowance cannot be used indefinitely: a second chat for a user who spent it ends at once without coins", { skip }, async () => {
  const userId = await makeUser(ctx, "spent");
  await burnFree(ctx, userId);
  // No coins and no free seconds: the request itself is refused (cannot start a chat it cannot pay for).
  await assert.rejects(ctx.chat.startSession(userId, (await freshAstro()).profileId), (e: any) => e?.statusCode === 403);
});

// ---- free carry-forward + free -> paid transition ------------------------------------------------------
test("unused free seconds carry forward across astrologers, then paid billing starts exactly where free ends", { skip }, async () => {
  const userId = await makeUser(ctx, "carry");
  await fund(ctx, userId, { purchased: 5000 });

  const first = await activate(ctx, userId, await freshAstro());
  beat(ctx, first, 25);
  await ctx.billing.endSession(first.id, "USER_ENDED", at(first, 25));
  let row = await sessionRow(ctx, first.id);
  assert.deepEqual([row.billedSeconds, row.freeSecondsUsed, row.amountPaise], [25, 25, 0]);
  assert.equal(await freeRemaining(ctx, userId), 35, "the unused 35s carries forward");

  const second = await activate(ctx, userId, await freshAstro()); // a DIFFERENT astrologer — the allowance is global
  beat(ctx, second, 55);
  await ctx.billing.endSession(second.id, "USER_ENDED", at(second, 55));
  row = await sessionRow(ctx, second.id);
  assert.equal(row.billedSeconds, 55);
  assert.equal(row.freeSecondsUsed, 35, "35 free seconds left are used first");
  assert.equal(row.amountPaise, cumulative(20), "only the 20 paid seconds are charged");
  assert.equal(await freeRemaining(ctx, userId), 0);
  assert.equal((await sessionDebits(ctx, second.id)).total, cumulative(20));
  await assertWalletSound(ctx, userId);
});

test("free -> paid transition inside ONE tick charges only the post-allowance portion", { skip }, async () => {
  const userId = await makeUser(ctx, "cross");
  await fund(ctx, userId, { purchased: 5000 });
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 90);
  await ctx.billing.tick(s.id, at(s, 90));

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.billedSeconds, 90);
  assert.equal(row.freeSecondsUsed, 60);
  assert.equal(row.amountPaise, 350, "30 paid seconds at 7 coins/min = 3.50 coins");
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 90));
  assert.equal((await sessionRow(ctx, s.id)).amountPaise, 350, "ending adds nothing for time already billed");
  await assertWalletSound(ctx, userId);
});

// ---- promotional -> purchased crossover ----------------------------------------------------------------
test("promotional coins are spent before purchased coins, crossing over mid-session, with exact bucket allocations", { skip }, async () => {
  const userId = await makeUser(ctx, "promo");
  await fund(ctx, userId, { promo: 200, purchased: 1000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 30);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 30));

  const d = await sessionDebits(ctx, s.id);
  assert.equal(d.total, 350);
  assert.equal(d.promo, 200, "all promotional coins first");
  assert.equal(d.purchased, 150, "then purchased coins for the remainder");
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.promotionalBalancePaise, 0);
  assert.equal(w.purchasedBalancePaise, 850);
});

// ---- exact wallet exhaustion ---------------------------------------------------------------------------
test("exhaustion: funds of 800 paise afford exactly 68s (794 paise) — the chat stops there and the extra 6 paise are NOT taken", { skip }, async () => {
  const userId = await makeUser(ctx, "exact800");
  await fund(ctx, userId, { purchased: 800 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  beat(ctx, s, 100);
  await ctx.billing.tick(s.id, at(s, 100)); // far past what 800 paise buys

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.equal(row.billedSeconds, 68, "floor(800*60/700) = 68 whole seconds");
  assert.equal(row.amountPaise, cumulative(68)); // 794
  assert.ok(cumulative(69) > 800, "the 69th second is genuinely unaffordable");
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 6, "never drain funds for seconds that were not delivered");
  assert.equal(w.reservedBalancePaise, 0);
});

test("exhaustion at an exact boundary: 700 paise buys exactly 60s and the chat ends the instant it is spent (no 61st unpaid second)", { skip }, async () => {
  const userId = await makeUser(ctx, "exact700");
  await fund(ctx, userId, { purchased: 700 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  await runTicks(ctx, s, 55, 5);
  assert.equal((await sessionRow(ctx, s.id)).status, "ACTIVE");
  beat(ctx, s, 60);
  await ctx.billing.tick(s.id, at(s, 60));

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [60, 700]);
  assert.equal((await walletRow(ctx, userId)).balancePaise, 0);
  await assertWalletSound(ctx, userId);
});

// ---- DEFECT: ticks are not idempotent / not serialised ---------------------------------------------------
test("concurrent ticks for the same instant never double-charge", { skip }, async () => {
  const userId = await makeUser(ctx, "concticks");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 30);

  const results = await Promise.allSettled(Array.from({ length: 8 }, () => ctx.billing.tick(s.id, at(s, 30))));
  assert.ok(results.every((r) => r.status === "fulfilled"), "overlapping ticks must not error");

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.billedSeconds, 30);
  assert.equal(row.amountPaise, 350);
  assert.equal((await sessionDebits(ctx, s.id)).total, 350, "exactly one 350-paise charge reached the ledger");
  await assertWalletSound(ctx, userId);
});

test("tick/end race: a tick and two concurrent ends settle exactly once and release the hold exactly once", { skip }, async () => {
  const userId = await makeUser(ctx, "race");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 30);

  await Promise.allSettled([
    ctx.billing.tick(s.id, at(s, 30)),
    ctx.billing.endSession(s.id, "USER_ENDED", at(s, 30)),
    ctx.billing.endSession(s.id, "ASTROLOGER_ENDED", at(s, 30)),
  ]);

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.ok(["USER_ENDED", "ASTROLOGER_ENDED"].includes(row.endedReason), "first end wins; the other cannot overwrite it");
  assert.equal(row.amountPaise, 350);
  assert.equal((await sessionDebits(ctx, s.id)).total, 350);
  assert.equal((await heldReservations(ctx, s.id)).length, 0);
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.reservedBalancePaise, 0);
});

// ---- DEFECT: partially-committed ticks ----------------------------------------------------------------
test("failed transaction: if the ledger write fails, NOTHING persists — free seconds, session counters and wallet are all rolled back, and a retry charges once", { skip }, async () => {
  const userId = await makeUser(ctx, "rollback");
  await fund(ctx, userId, { purchased: 5000 }); // fresh allowance: the tick must claim 60 free seconds AND charge 30
  const s = await activate(ctx, userId, await freshAstro());
  beat(ctx, s, 90);

  const before = { wallet: await walletRow(ctx, userId), session: await sessionRow(ctx, s.id), free: await freeRemaining(ctx, userId) };
  // A real database fault: any chat settlement ledger insert is rejected by the database itself.
  await ctx.prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fin_fail_settle() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected ledger failure'; END; $$ LANGUAGE plpgsql`);
  await ctx.prisma.$executeRawUnsafe(`CREATE TRIGGER fin_fail_settle_trg BEFORE INSERT ON wallet_transactions FOR EACH ROW WHEN (NEW.reason = 'CHAT_CONSUMPTION') EXECUTE FUNCTION fin_fail_settle()`);
  try {
    await assert.rejects(ctx.billing.tick(s.id, at(s, 90)));
  } finally {
    await ctx.prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS fin_fail_settle_trg ON wallet_transactions`);
    await ctx.prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS fin_fail_settle()`);
  }

  const after = { wallet: await walletRow(ctx, userId), session: await sessionRow(ctx, s.id), free: await freeRemaining(ctx, userId) };
  assert.equal(after.free, before.free, "free seconds claimed inside the failed settlement were rolled back");
  assert.equal(after.session.billedSeconds, before.session.billedSeconds);
  assert.equal(after.session.freeSecondsUsed, before.session.freeSecondsUsed);
  assert.equal(after.session.amountPaise, before.session.amountPaise);
  assert.equal(after.session.lastBilledAt.getTime(), before.session.lastBilledAt.getTime(), "the billing cursor did not move");
  assert.equal(after.wallet.balancePaise, before.wallet.balancePaise);
  assert.equal(after.wallet.reservedBalancePaise, before.wallet.reservedBalancePaise);

  await ctx.billing.tick(s.id, at(s, 90)); // retry after the fault clears
  const row = await sessionRow(ctx, s.id);
  assert.deepEqual([row.billedSeconds, row.freeSecondsUsed, row.amountPaise], [90, 60, 350]);
  assert.equal((await sessionDebits(ctx, s.id)).total, 350, "charged exactly once");
  assert.equal(await freeRemaining(ctx, userId), 0);
  await assertWalletSound(ctx, userId);
});

// ---- pause / disconnect / restart ------------------------------------------------------------------------
test("pause bills only the interval the last heartbeats VOUCH for — never the 15s wait until the lapse is detected", { skip }, async () => {
  const userId = await makeUser(ctx, "pause");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  await runTicks(ctx, s, 10, 5); // billed through 10s
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", s.t0 + 12_000); // astrologer's last sign of life: 12s
  ctx.billing.recordHeartbeat(s.id, "USER", s.t0 + 20_000); // user kept beating until 20s
  await ctx.billing.tick(s.id, at(s, 30)); // astrologer overdue (18s > 15s) => paused

  // The slower side's last beat (12s) vouches for one heartbeat period => billed through 22s, NOT through 30s.
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, 22, "12s (last confirmed beat) + 10s (the interval it vouches for)");
  assert.equal(row.amountPaise, cumulative(22));
  assert.ok(row.presenceGraceEndsAt, "grace deadline persisted");
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(22));

  // Grace expires without reconnect: ending adds NOTHING for the disconnected gap.
  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 200));
  const ended = await sessionRow(ctx, s.id);
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.endedReason, "DISCONNECTED");
  assert.deepEqual([ended.billedSeconds, ended.amountPaise], [22, cumulative(22)]);
  assert.equal((await heldReservations(ctx, s.id)).length, 0);
  await assertWalletSound(ctx, userId);
});

test("a late heartbeat never bills past what it vouches for; billing catches up once heartbeats resume", { skip }, async () => {
  const userId = await makeUser(ctx, "late");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());

  beat(ctx, s, 0); // both beat at t=0, then nothing for a while
  await ctx.billing.tick(s.id, at(s, 14)); // 14s later: still "present" (<=15s) but only 10s are vouched for
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.billedSeconds, 10, "billed the vouched 10s, not the 14s on the clock");

  beat(ctx, s, 15); // heartbeats resume
  await ctx.billing.tick(s.id, at(s, 20));
  row = await sessionRow(ctx, s.id);
  assert.equal(row.billedSeconds, 20, "nothing was lost: billing caught up to the clock once presence was re-confirmed");
  assert.equal(row.amountPaise, cumulative(20));
  await assertWalletSound(ctx, userId);
});

test("server restart: ACTIVE sessions are paused without any charge for downtime, and resume only on fresh presence", { skip }, async () => {
  const userId = await makeUser(ctx, "restart");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  await runTicks(ctx, s, 10, 5);
  const beforeRestart = await sessionRow(ctx, s.id);

  await ctx.billing.resumeAllActiveSessions(); // what index.ts does on boot
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [beforeRestart.billedSeconds, beforeRestart.amountPaise], "downtime billed nothing");

  const resumeFloor = Date.now();
  ctx.billing.recordHeartbeat(s.id, "USER");
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER");
  for (let i = 0; i < 40; i++) { row = await sessionRow(ctx, s.id); if (row.status === "ACTIVE") break; await new Promise((r) => setTimeout(r, 50)); }
  assert.equal(row.status, "ACTIVE", "fresh heartbeats from both sides resume the session");
  assert.ok(row.lastBilledAt.getTime() >= resumeFloor, "cursor reset to the resume moment (real clock) — the downtime gap is never retro-billed");
  assert.equal(row.billedSeconds, beforeRestart.billedSeconds);
  ctx.billing.unregisterSession(s.id);
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

// ---- reservations ---------------------------------------------------------------------------------------
test("reservation lifecycle: a rolling hold during the chat, fully released (never left HELD) on every terminal path", { skip }, async () => {
  const userId = await makeUser(ctx, "resv");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  assert.equal((await heldReservations(ctx, s.id)).length, 1, "exactly one lookahead hold exists while ACTIVE");
  await runTicks(ctx, s, 20, 5);
  const held = await heldReservations(ctx, s.id);
  assert.equal(held.length, 1);
  assert.ok((await walletRow(ctx, userId)).reservedBalancePaise > 0);

  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 22));
  assert.equal((await heldReservations(ctx, s.id)).length, 0);
  const all = await ctx.prisma.walletReservation.findMany({ where: { referenceId: s.id } });
  assert.ok(all.every((r: any) => ["RELEASED", "SETTLED"].includes(r.status) && r.resolvedAt), "resolved with a final status and timestamp");
  assert.equal((await walletRow(ctx, userId)).reservedBalancePaise, 0);
  await assertWalletSound(ctx, userId);
});

test("rate is fixed at request creation: a price change before the astrologer accepts does not change the session's rate", { skip }, async () => {
  const astro = await freshAstro();
  const userId = await makeUser(ctx, "snapshot");
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const requested = await ctx.chat.startSession(userId, astro.profileId);
  assert.equal(requested.ratePerMinutePaise, RATE_PAISE);
  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { pricePerMinute: 12 } });
  const active = await ctx.chat.acceptSession(requested.id, astro.userId);
  ctx.billing.unregisterSession(active.id);
  assert.equal(active.ratePerMinutePaise, RATE_PAISE, "acceptance never silently changes the rate");
  const s = { id: active.id, userId, astro, t0: active.lastBilledAt.getTime() };
  beat(ctx, s, 30);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 30));
  assert.equal((await sessionRow(ctx, s.id)).amountPaise, 350, "billed at the snapshotted ₹7/min, not the new ₹12/min");
});
