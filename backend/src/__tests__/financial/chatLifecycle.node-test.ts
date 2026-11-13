// Run with: npm run test:db:run -- src/__tests__/financial/chatLifecycle.node-test.ts
//
// Checkpoint 2 — chat lifecycle: the CANCELLED end reason (user withdraws a still-REQUESTED
// consultation), the offline/busy gates on starting a chat, suspension landing mid-consultation,
// per-send auth re-validation, clientMessageId exactly-once sends, and deterministic message order.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, at, runTicks,
  sessionRow, assertWalletSound, cumulative, type Ctx, type Astro,
} from "./helpers.js";

let ctx: Ctx;
let seq = 0;
before(async () => { if (!skip) ctx = await boot("fin-lifecycle"); });
after(async () => { if (!skip) await shutdown(ctx); });

async function fundedUser(key: string): Promise<string> {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  return userId;
}
const newAstro = () => makeAstrologer(ctx, `lc${++seq}`);

// ---- CANCELLED --------------------------------------------------------------------------------------------
test("the user cancels their own REQUESTED session: ENDED with reason CANCELLED, nothing reserved, nothing billed", { skip }, async () => {
  const userId = await fundedUser("cancel");
  const astro = await newAstro();
  const requested = await ctx.chat.startSession(userId, astro.profileId);
  assert.equal(requested.status, "REQUESTED");

  const cancelled = await ctx.chat.cancelSession(requested.id, userId);
  assert.equal(cancelled.status, "ENDED");
  assert.equal(cancelled.endedReason, "CANCELLED");
  assert.ok(cancelled.endedAt);
  assert.deepEqual([cancelled.billedSeconds, cancelled.amountPaise], [0, 0]);
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.reservedBalancePaise, 0, "a request never held anything, so cancelling releases nothing");
});

test("duplicate cancel is an idempotent no-op; cancelling someone else's request is FORBIDDEN", { skip }, async () => {
  const userId = await fundedUser("cancel-dup");
  const stranger = await makeUser(ctx, "cancel-stranger");
  const astro = await newAstro();
  const requested = await ctx.chat.startSession(userId, astro.profileId);

  await assert.rejects(ctx.chat.cancelSession(requested.id, stranger), /do not have access/);

  await ctx.chat.cancelSession(requested.id, userId);
  const again = await ctx.chat.cancelSession(requested.id, userId); // retry after a dropped response
  assert.equal(again.endedReason, "CANCELLED");
});

test("cancel after accept is refused — and of a concurrent cancel/accept race exactly one wins", { skip }, async () => {
  const userId = await fundedUser("cancel-accepted");
  const astro = await newAstro();
  const s1 = await ctx.chat.startSession(userId, astro.profileId);
  await ctx.chat.acceptSession(s1.id, astro.userId);
  ctx.billing.unregisterSession(s1.id);
  await assert.rejects(ctx.chat.cancelSession(s1.id, userId), /no longer pending/);
  await ctx.billing.endSession(s1.id, "USER_ENDED");

  // The race: fire accept and cancel together against a fresh request.
  const s2 = await ctx.chat.startSession(userId, astro.profileId);
  const [acceptRes, cancelRes] = await Promise.allSettled([
    ctx.chat.acceptSession(s2.id, astro.userId),
    ctx.chat.cancelSession(s2.id, userId),
  ]);
  const fulfilled = [acceptRes, cancelRes].filter((r) => r.status === "fulfilled");
  assert.equal(fulfilled.length, 1, "exactly one side of the race succeeds");
  const row = await sessionRow(ctx, s2.id);
  if (acceptRes.status === "fulfilled") {
    assert.equal(row.status, "ACTIVE");
    ctx.billing.unregisterSession(s2.id);
    await ctx.billing.endSession(s2.id, "USER_ENDED");
    const held = await ctx.prisma.walletReservation.findMany({ where: { referenceId: s2.id, status: "HELD" } });
    assert.equal(held.length, 0);
  } else {
    assert.deepEqual([row.status, row.endedReason], ["ENDED", "CANCELLED"]);
    const held = await ctx.prisma.walletReservation.findMany({ where: { referenceId: s2.id, status: "HELD" } });
    assert.equal(held.length, 0, "the losing accept left no hold behind");
  }
  await assertWalletSound(ctx, userId);
});

// ---- offline / busy gates ---------------------------------------------------------------------------------
test("startSession refuses an OFFLINE astrologer; eligibility says canStart=false; flipping online opens the gate", { skip }, async () => {
  const userId = await fundedUser("offline");
  const astro = await newAstro();
  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { isOnline: false } });

  const elig = await ctx.chat.getEligibility(userId, astro.profileId);
  assert.equal(elig.canStart, false, "wallet is funded — only the offline state blocks it");
  assert.equal(elig.isOnline, false);
  await assert.rejects(ctx.chat.startSession(userId, astro.profileId), /offline/);

  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { isOnline: true } });
  const requested = await ctx.chat.startSession(userId, astro.profileId);
  assert.equal(requested.status, "REQUESTED");
  await ctx.chat.cancelSession(requested.id, userId);
});

test("an astrologer already in a consultation is 'busy': a second user's request gets the busy message, not the generic one", { skip }, async () => {
  const user1 = await fundedUser("busy1");
  const user2 = await fundedUser("busy2");
  const astro = await newAstro();
  const s = await ctx.chat.startSession(user1, astro.profileId);
  await ctx.chat.acceptSession(s.id, astro.userId);
  ctx.billing.unregisterSession(s.id);

  await assert.rejects(ctx.chat.startSession(user2, astro.profileId), /another consultation/);
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

// ---- suspension mid-chat ----------------------------------------------------------------------------------
test("suspension mid-consultation: the ACTIVE chat is settled through the confirmed instant and ends ASTROLOGER_ENDED; a pending request to them is REJECTED", { skip }, async () => {
  const userId = await fundedUser("suspend-live");
  const otherUser = await fundedUser("suspend-pending");
  const astro = await newAstro();

  const live = await activate(ctx, userId, astro);
  await runTicks(ctx, live, 10, 5); // 10 confirmed, billed seconds

  // A second astrologer the pending request can target (one live session per astrologer is DB-enforced).
  const astro2 = await makeAstrologer(ctx, `lc${++seq}`);
  const pending = await ctx.chat.startSession(otherUser, astro2.profileId);

  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { suspendedAt: new Date(), isPublished: false } });
  await ctx.prisma.astrologerProfile.update({ where: { id: astro2.profileId }, data: { suspendedAt: new Date(), isPublished: false } });
  await ctx.chat.endLiveSessionsForAstrologer(astro.profileId);
  await ctx.chat.endLiveSessionsForAstrologer(astro2.profileId);

  const endedLive = await sessionRow(ctx, live.id);
  assert.equal(endedLive.status, "ENDED");
  assert.equal(endedLive.endedReason, "ASTROLOGER_ENDED");
  assert.equal(endedLive.billedSeconds, 10, "the user pays exactly for the time delivered before the suspension");
  assert.equal(endedLive.amountPaise, cumulative(10));

  const endedPending = await sessionRow(ctx, pending.id);
  assert.deepEqual([endedPending.status, endedPending.endedReason], ["ENDED", "REJECTED"]);
  assert.deepEqual([endedPending.billedSeconds, endedPending.amountPaise], [0, 0]);

  assert.equal((await ctx.prisma.walletReservation.findMany({ where: { referenceId: live.id, status: "HELD" } })).length, 0);
  await assertWalletSound(ctx, userId);
  await assertWalletSound(ctx, otherUser);
});

// ---- per-send auth re-validation --------------------------------------------------------------------------
test("a deactivated account cannot keep sending through a live session; neither can a suspended astrologer", { skip }, async () => {
  const userId = await fundedUser("revalidate");
  const astro = await newAstro();
  const live = await activate(ctx, userId, astro);

  assert.ok(await ctx.chat.postMessage(live.id, userId, "hello"), "healthy accounts send normally");

  await ctx.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  await assert.rejects(ctx.chat.postMessage(live.id, userId, "still here?"), /no longer active/);
  await ctx.prisma.user.update({ where: { id: userId }, data: { isActive: true } });

  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { suspendedAt: new Date() } });
  await assert.rejects(ctx.chat.postMessage(live.id, astro.userId, "reply"), /suspended/);
  await ctx.prisma.astrologerProfile.update({ where: { id: astro.profileId }, data: { suspendedAt: null } });

  await ctx.billing.endSession(live.id, "USER_ENDED");
});

// ---- clientMessageId: exactly-once sends ------------------------------------------------------------------
test("a retried send with the same clientMessageId stores ONE message and returns the first one; different ids and id-less sends are all distinct", { skip }, async () => {
  const userId = await fundedUser("dedupe");
  const astro = await newAstro();
  const live = await activate(ctx, userId, astro);

  const first = await ctx.chat.postMessage(live.id, userId, "namaste", "cmid-1");
  const retry = await ctx.chat.postMessage(live.id, userId, "namaste", "cmid-1"); // the client never saw the ack
  assert.equal(retry.id, first.id, "the retry returns the SAME stored message");

  const second = await ctx.chat.postMessage(live.id, userId, "a second thought", "cmid-2");
  assert.notEqual(second.id, first.id);

  // The other participant may coincidentally use the same id — scoped per sender, so it still stores.
  const fromAstro = await ctx.chat.postMessage(live.id, astro.userId, "welcome", "cmid-1");
  assert.notEqual(fromAstro.id, first.id);

  // Old clients send no id at all: identical content, no dedupe, both rows stored.
  const plain1 = await ctx.chat.postMessage(live.id, userId, "ok");
  const plain2 = await ctx.chat.postMessage(live.id, userId, "ok");
  assert.notEqual(plain1.id, plain2.id);

  assert.equal(await ctx.prisma.chatMessage.count({ where: { sessionId: live.id } }), 5);
  await ctx.billing.endSession(live.id, "USER_ENDED");
});

// ---- deterministic ordering -------------------------------------------------------------------------------
test("messages created in the same millisecond come back in a stable order (id tiebreaker), identical on every read", { skip }, async () => {
  const userId = await fundedUser("ordering");
  const astro = await newAstro();
  const live = await activate(ctx, userId, astro);

  const instant = new Date();
  for (const n of [1, 2, 3, 4, 5]) {
    await ctx.prisma.chatMessage.create({
      data: { sessionId: live.id, senderRole: "USER", senderId: userId, content: `m${n}`, createdAt: instant },
    });
  }
  const read1 = (await ctx.chat.getMessages(live.id, userId)).map((m: { id: string }) => m.id);
  const read2 = (await ctx.chat.getMessages(live.id, userId)).map((m: { id: string }) => m.id);
  assert.deepEqual(read1, read2, "same order on every read");
  const sorted = [...read1].sort();
  assert.deepEqual(read1, sorted, "the tiebreaker is the id, ascending with createdAt ascending");
  await ctx.billing.endSession(live.id, "USER_ENDED");
});
