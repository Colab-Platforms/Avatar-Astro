// Run with: npm run test:db:run -- src/__tests__/financial/presenceBilling.node-test.ts
//
// The finalized presence-based billing rules, pinned with exact numbers (simulated clock, real PostgreSQL):
//   1. EXPLICIT departure the server observes (disconnect / leave / end): billing stops at that event's timestamp.
//   2. SILENT loss (no event): billing stops at the last heartbeat + 10s (one vouched heartbeat interval).
//   3. The extra wait until a silent loss is DETECTED (15s timeout) is never billed.
//   4. Nothing is ever billed beyond what the user can afford.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, at, beat, runTicks,
  sessionRow, sessionDebits, heldReservations, assertWalletSound, cumulative, type Ctx, type Live,
} from "./helpers.js";

let ctx: Ctx;
let seq = 0;
before(async () => { if (!skip) ctx = await boot("fin-presence"); });
after(async () => { if (!skip) await shutdown(ctx); });

/** A funded, purely-paid live chat billed through 10s, with both sides' last heartbeat at 13s. */
async function liveChat(key: string, purchased = 5000): Promise<Live> {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { purchased });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await makeAstrologer(ctx, `p${++seq}`));
  await runTicks(ctx, s, 10, 5);
  beat(ctx, s, 13);
  return s;
}
const ms = (s: Live, seconds: number) => s.t0 + seconds * 1000;

// ---- 1. explicit departure ------------------------------------------------------------------------------
test("explicit disconnect: billing stops at the server-recorded event timestamp (17.4s => 17 completed seconds), not heartbeat + 10s (23s)", { skip }, async () => {
  const s = await liveChat("disc");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 17.4));

  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED", "paused immediately — nothing to wait for");
  assert.equal(row.billedSeconds, 17, "completed seconds up to the disconnect instant");
  assert.equal(row.amountPaise, cumulative(17));
  assert.equal(row.pausedAt!.getTime(), ms(s, 17.4), "pausedAt is the event timestamp");
  assert.equal(row.presenceGraceEndsAt!.getTime(), ms(s, 17.4) + 60_000, "reconnect grace runs from the event");
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(17));
  await assertWalletSound(ctx, s.userId);
});

test("explicit leave by the astrologer behaves identically: billed to the event timestamp", { skip }, async () => {
  const s = await liveChat("leave");
  await ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 15.0));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, 15);
  assert.equal(row.amountPaise, cumulative(15));
});

test("an explicit departure can never bill MORE than the heartbeat rule allows: an event at 27s with a last heartbeat at 13s is capped at 23s", { skip }, async () => {
  const s = await liveChat("latedisc");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 27)); // the transport only noticed 14s after the last heartbeat
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, 23, "min(event 27s, last heartbeat 13s + 10s) = 23s");
  assert.equal(row.amountPaise, cumulative(23));
});

// ---- 2 + 3. silent loss ---------------------------------------------------------------------------------
test("abrupt network loss (no event at all): billed through last heartbeat + 10s = 23s; the wait until detection at 30s is never billed", { skip }, async () => {
  const s = await liveChat("silent");
  await ctx.billing.tick(s.id, at(s, 20)); // heartbeats 7s old: still healthy, billed to the clock
  assert.equal((await sessionRow(ctx, s.id)).billedSeconds, 20);

  await ctx.billing.tick(s.id, at(s, 25)); // 12s old: not yet "lapsed" (<=15s), but only 23s is vouched for
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.billedSeconds, 23, "billing already stopped at heartbeat + 10s while the lapse is still undetected");

  await ctx.billing.tick(s.id, at(s, 30)); // 17s old: lapse detected => paused
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, 23, "detection added nothing");
  assert.equal(row.amountPaise, cumulative(23));
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(23));
});

test("only ONE side silently lost: the slower side's last heartbeat decides (user alive at 28s, astrologer silent since 13s => 23s)", { skip }, async () => {
  const s = await liveChat("oneside");
  ctx.billing.recordHeartbeat(s.id, "USER", ms(s, 18));
  ctx.billing.recordHeartbeat(s.id, "USER", ms(s, 28));
  await ctx.billing.tick(s.id, at(s, 30));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, 23);
});

// ---- pause semantics ------------------------------------------------------------------------------------
test("pause: nothing accrues while paused, a departed side stays absent until ITS OWN heartbeat, and the grace timeout adds nothing", { skip }, async () => {
  const s = await liveChat("paused");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 16));
  const paused = await sessionRow(ctx, s.id);
  assert.equal(paused.billedSeconds, 16);

  // The astrologer keeps heart-beating for a long time; the user is still gone.
  for (const t of [20, 30, 40, 50]) ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", ms(s, t));
  await new Promise((r) => setTimeout(r, 200));
  await ctx.billing.tick(s.id, at(s, 50));
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED", "one side's heartbeats cannot resume the chat on behalf of the other");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)], "no billing during the pause");

  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 200)); // grace expired
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)], "the disconnect timeout bills nothing");
  assert.equal((await heldReservations(ctx, s.id)).length, 0);
  await assertWalletSound(ctx, s.userId);
});

// ---- reconnect ------------------------------------------------------------------------------------------
test("reconnect: the departed side's next heartbeat resumes the chat; the gap is never billed and billing restarts from the resume instant", { skip }, async () => {
  const s = await liveChat("reconnect");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 17));
  assert.equal((await sessionRow(ctx, s.id)).billedSeconds, 17);

  const resumeFloor = Date.now();
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER"); // real clock: both sides confirm presence again
  ctx.billing.recordHeartbeat(s.id, "USER");
  let row = await sessionRow(ctx, s.id);
  for (let i = 0; i < 40 && row.status !== "ACTIVE"; i++) { await new Promise((r) => setTimeout(r, 50)); row = await sessionRow(ctx, s.id); }
  ctx.billing.unregisterSession(s.id); // back to the simulated clock
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.pausedAt, null);
  assert.ok(row.lastBilledAt.getTime() >= resumeFloor, "cursor reset to the resume moment");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [17, cumulative(17)], "the disconnected gap billed nothing");

  // Five more seconds of confirmed chat after resuming bill exactly five more seconds.
  const resumed: Live = { ...s, t0: row.lastBilledAt.getTime() };
  beat(ctx, resumed, 5);
  await ctx.billing.tick(s.id, at(resumed, 5));
  row = await sessionRow(ctx, s.id);
  assert.deepEqual([row.billedSeconds, row.amountPaise], [22, cumulative(22)]);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(resumed, 5));
  await assertWalletSound(ctx, s.userId);
});

test("a quick reconnect BEFORE any tick still excludes the gap: leave at 15s, back later — only 15s were billed", { skip }, async () => {
  const s = await liveChat("blip");
  await ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 15));
  ctx.billing.recordHeartbeat(s.id, "USER");
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER");
  let row = await sessionRow(ctx, s.id);
  for (let i = 0; i < 40 && row.status !== "ACTIVE"; i++) { await new Promise((r) => setTimeout(r, 50)); row = await sessionRow(ctx, s.id); }
  ctx.billing.unregisterSession(s.id);
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.billedSeconds, 15);
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

// ---- end ------------------------------------------------------------------------------------------------
test("explicit end: billed to the end event's timestamp (17.9s => 17 completed seconds)", { skip }, async () => {
  const s = await liveChat("end");
  await ctx.billing.endSession(s.id, "USER_ENDED", new Date(ms(s, 17.9)));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedAt!.getTime(), ms(s, 17.9));
  assert.deepEqual([row.billedSeconds, row.amountPaise], [17, cumulative(17)]);
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(17));
  await assertWalletSound(ctx, s.userId);
});

test("end while the OTHER side has silently vanished: the ender's click cannot bill time the other side never confirmed (capped at 23s, not 40s)", { skip }, async () => {
  const s = await liveChat("endsilent");
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 40)); // astrologer's last heartbeat was at 13s
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [23, cumulative(23)]);
});

test("end after the other side explicitly left: billing already stopped at the leave; ending adds nothing", { skip }, async () => {
  const s = await liveChat("endafterleave");
  await ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 14));
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 25));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.equal(row.endedReason, "USER_ENDED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [14, cumulative(14)]);
  assert.equal((await heldReservations(ctx, s.id)).length, 0);
});

// ---- 4. affordability always wins -----------------------------------------------------------------------
test("a departure never bills beyond the affordable duration: 700 paise buys 60s even if the disconnect comes at 100s", { skip }, async () => {
  const s = await liveChat("afford", 700);
  beat(ctx, s, 100);
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 100));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED", "funds ran out before the disconnect, so the chat is over rather than paused");
  assert.equal(row.endedReason, "BALANCE_EXHAUSTED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [60, 700]);
  const w = await assertWalletSound(ctx, s.userId);
  assert.equal(w.balancePaise, 0);
});

test("an explicit end never bills beyond the affordable duration either", { skip }, async () => {
  const s = await liveChat("affordend", 800);
  beat(ctx, s, 100);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, 100));
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [68, cumulative(68)]);
  assert.equal((await assertWalletSound(ctx, s.userId)).balancePaise, 6);
});

// ---- robustness -----------------------------------------------------------------------------------------
test("departure events are idempotent and harmless on a paused or ended chat", { skip }, async () => {
  const s = await liveChat("idem");
  await Promise.all([
    ctx.billing.recordDeparture(s.id, "USER", ms(s, 16)),
    ctx.billing.recordDeparture(s.id, "USER", ms(s, 16)),
    ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 16)),
  ]);
  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)], "billed exactly once");
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(16));

  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 100));
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 120)); // after the end: no-op
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ENDED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)]);
  await assertWalletSound(ctx, s.userId);
});
