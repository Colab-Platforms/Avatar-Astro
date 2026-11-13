// Run with: npm run test:db:run -- src/__tests__/financial/presenceStaleness.node-test.ts
//
// Checkpoint 1 follow-up: a heartbeat sent on a connection BEFORE that connection's own explicit leave or
// disconnect must never be allowed to resurrect presence after the server has already recorded the
// departure — even though, over a real socket, the heartbeat's async role lookup can resolve AFTER the
// departure has been applied. chat/billing.ts guards against this with a ConnectionIdentity: a stable
// connection id plus a sequence number the socket layer bumps SYNCHRONOUSLY the instant each raw event
// arrives (realtime/socketServer.ts's `nextConn`), so arrival order survives even when resolution order
// doesn't. These tests drive that mechanism directly, with explicit ConnectionIdentity objects standing in
// for what the socket layer would have captured.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, at, beat, runTicks,
  sessionRow, assertWalletSound, cumulative, type Ctx, type Live,
} from "./helpers.js";

let ctx: Ctx;
let seq = 0;
before(async () => { if (!skip) ctx = await boot("fin-stale"); });
after(async () => { if (!skip) await shutdown(ctx); });

async function liveChat(key: string): Promise<Live> {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await makeAstrologer(ctx, `q${++seq}`));
  await runTicks(ctx, s, 10, 5);
  beat(ctx, s, 13); // both sides' last (untracked, conn-less) heartbeat is at 13s
  return s;
}
const ms = (s: Live, seconds: number) => s.t0 + seconds * 1000;

test("a heartbeat that was in flight before chat:leave must not revive presence once the leave has landed", { skip }, async () => {
  const s = await liveChat("beforeleave");
  const connA = { id: "sockA", seq: 5 };
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 17), connA); // the explicit leave, seq 5

  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [17, cumulative(17)]);

  // The heartbeat was sent a moment earlier on the SAME connection (lower seq), but its handler's role
  // lookup only resolves now — after the leave already paused the chat.
  ctx.billing.recordHeartbeat(s.id, "USER", ms(s, 17.1), { id: "sockA", seq: 3 });
  await new Promise((r) => setTimeout(r, 100)); // let any (wrongly-triggered) async resume settle
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED", "a stale heartbeat from the departed connection must not resume the chat");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [17, cumulative(17)], "and nothing further was billed");

  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 100));
  await assertWalletSound(ctx, s.userId);
});

test("a heartbeat racing a socket disconnect loses if the disconnect's departure is applied first", { skip }, async () => {
  const s = await liveChat("racedisconnect");
  const connA = { id: "sockB", seq: 8 };
  await ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 16), connA); // "disconnecting" observed first

  let row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)]);

  // A heartbeat sent just before the disconnect (lower seq, same connection) resolves after.
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", ms(s, 16.05), { id: "sockB", seq: 7 });
  await new Promise((r) => setTimeout(r, 100));
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED", "the earlier-sent heartbeat does not win the race");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)]);
});

test("legitimate reconnect: a heartbeat from a NEW connection always restores presence, regardless of its own sequence number", { skip }, async () => {
  const s = await liveChat("reconnect-conn");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 17), { id: "sockC", seq: 5 });
  assert.equal((await sessionRow(ctx, s.id)).status, "PAUSED");

  const resumeFloor = Date.now();
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", undefined, { id: "sockAstro", seq: 1 }); // still present throughout
  ctx.billing.recordHeartbeat(s.id, "USER", undefined, { id: "sockD", seq: 1 }); // a brand-new connection, seq 1 — lower than sockC's 5, but a different connection entirely
  let row = await sessionRow(ctx, s.id);
  for (let i = 0; i < 40 && row.status !== "ACTIVE"; i++) { await new Promise((r) => setTimeout(r, 50)); row = await sessionRow(ctx, s.id); }
  ctx.billing.unregisterSession(s.id);
  assert.equal(row.status, "ACTIVE", "a new connection's heartbeat always takes over, however low its own sequence number");
  assert.ok(row.lastBilledAt.getTime() >= resumeFloor);
  assert.deepEqual([row.billedSeconds, row.amountPaise], [17, cumulative(17)]);
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

test("duplicate leave/disconnect events for the same connection are idempotent and bill nothing extra", { skip }, async () => {
  const s = await liveChat("dupdepart");
  const conn = { id: "sockE", seq: 9 };
  await Promise.all([
    ctx.billing.recordDeparture(s.id, "USER", ms(s, 16), conn),
    ctx.billing.recordDeparture(s.id, "USER", ms(s, 16), conn), // exact duplicate, same seq
  ]);
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");
  assert.deepEqual([row.billedSeconds, row.amountPaise], [16, cumulative(16)], "billed exactly once");

  // A second, later-timestamped but LOWER-seq departure report (e.g. a redundant disconnect event fired
  // from older code on the same connection) is rejected as stale, not reapplied.
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 50), { id: "sockE", seq: 2 });
  const after2 = await sessionRow(ctx, s.id);
  assert.deepEqual([after2.status, after2.billedSeconds], ["PAUSED", 16]);
  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 100));
});

test("a departure reported by a connection that has already been superseded by a newer one is ignored", { skip }, async () => {
  const s = await liveChat("superseded");
  // The astrologer reconnects: connF (seq 1) takes over from whatever the liveChat setup implied.
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", ms(s, 14), { id: "connF", seq: 1 });

  // An old, already-superseded connection's belated disconnect must not pause a session a newer connection owns.
  await ctx.billing.recordDeparture(s.id, "ASTROLOGER", ms(s, 14.5), { id: "connOld", seq: 99 });
  const row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "ACTIVE", "the stale connection's departure cannot override the current one");
});

test("no billing after an explicit departure accrues until a genuinely valid heartbeat restores presence", { skip }, async () => {
  const s = await liveChat("staypaused");
  await ctx.billing.recordDeparture(s.id, "USER", ms(s, 18), { id: "sockG", seq: 1 });
  let row = await sessionRow(ctx, s.id);
  assert.deepEqual([row.status, row.billedSeconds], ["PAUSED", 18]);

  // Time passes with no valid presence restored — ticking (if it even ran) must not advance billing.
  await ctx.billing.tick(s.id, at(s, 200));
  row = await sessionRow(ctx, s.id);
  assert.deepEqual([row.status, row.billedSeconds], ["PAUSED", 18], "a PAUSED session is never advanced by tick");

  // Stale heartbeats on the same connection keep changing nothing.
  ctx.billing.recordHeartbeat(s.id, "USER", ms(s, 18.1), { id: "sockG", seq: 1 });
  ctx.billing.recordHeartbeat(s.id, "USER", ms(s, 18.2), { id: "sockG", seq: 0 });
  await new Promise((r) => setTimeout(r, 100));
  row = await sessionRow(ctx, s.id);
  assert.equal(row.status, "PAUSED");

  await ctx.billing.endSession(s.id, "DISCONNECTED", at(s, 300));
  const ended = await sessionRow(ctx, s.id);
  assert.deepEqual([ended.status, ended.billedSeconds], ["ENDED", 18], "the long gap never got billed");
  await assertWalletSound(ctx, s.userId);
});
