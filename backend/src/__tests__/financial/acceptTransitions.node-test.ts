// Run with: npm run test:db:run -- src/__tests__/financial/acceptTransitions.node-test.ts
//
// Checkpoint 1 — accept / reject / end transitions are atomic where financial correctness depends on it:
// a lost race must never leave a leaked reservation, a double hold, or a resurrected session.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, sessionRow, walletRow, assertWalletSound, type Ctx } from "./helpers.js";

let ctx: Ctx;
before(async () => { if (!skip) ctx = await boot("fin-accept"); });
after(async () => { if (!skip) await shutdown(ctx); });

async function freshRequest(key: string) {
  const astro = await makeAstrologer(ctx, key);
  const userId = await makeUser(ctx, `u-${key}`);
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  const session = await ctx.chat.startSession(userId, astro.profileId);
  return { astro, userId, session };
}
const holds = (sessionId: string) => ctx.prisma.walletReservation.findMany({ where: { referenceId: sessionId, status: "HELD" } });

test("double accept: exactly one transition and exactly ONE reservation (the loser gets a 409, not a second hold)", { skip }, async () => {
  for (let i = 0; i < 12; i++) {
    const { astro, userId, session } = await freshRequest(`dbl${i}`);
    const results = await Promise.allSettled([
      ctx.chat.acceptSession(session.id, astro.userId),
      ctx.chat.acceptSession(session.id, astro.userId),
      ctx.chat.acceptSession(session.id, astro.userId),
    ]);
    ctx.billing.unregisterSession(session.id);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    assert.equal(ok.length, 1, `iteration ${i}: exactly one accept wins`);
    assert.ok(failed.every((r) => r.reason?.statusCode === 409), `iteration ${i}: losers are clean 409s`);
    const n = (await holds(session.id)).length;
    assert.equal(n, 1, `iteration ${i}: one hold, not ${n}`);
    assert.equal((await sessionRow(ctx, session.id)).status, "ACTIVE");
    await assertWalletSound(ctx, userId);
    await ctx.billing.endSession(session.id, "USER_ENDED");
    assert.equal((await walletRow(ctx, userId)).reservedBalancePaise, 0, "everything released at the end");
  }
});

test("accept vs reject race: one outcome wins; a rejected session never keeps a hold, an accepted one is never overwritten to ENDED", { skip }, async () => {
  for (let i = 0; i < 12; i++) {
    const { astro, userId, session } = await freshRequest(`ar${i}`);
    const [a, r] = await Promise.allSettled([ctx.chat.acceptSession(session.id, astro.userId), ctx.chat.rejectSession(session.id, astro.userId)]);
    ctx.billing.unregisterSession(session.id);
    const row = await sessionRow(ctx, session.id);
    const n = (await holds(session.id)).length;
    if (a.status === "fulfilled") {
      assert.equal(r.status, "rejected", `iteration ${i}: reject must lose when accept won`);
      assert.equal(row.status, "ACTIVE", `iteration ${i}: an accepted session must not be overwritten to ENDED`);
      assert.equal(n, 1);
      await ctx.billing.endSession(session.id, "USER_ENDED");
    } else {
      assert.equal(r.status, "fulfilled", `iteration ${i}: if accept lost, reject won`);
      assert.equal(row.status, "ENDED");
      assert.equal(row.endedReason, "REJECTED");
      assert.equal(n, 0, `iteration ${i}: a rejected request leaks no reservation`);
    }
    const w = await assertWalletSound(ctx, userId);
    assert.equal(w.reservedBalancePaise, 0, `iteration ${i}: nothing left reserved`);
  }
});

test("accept vs cancel race: never ACTIVE-with-ended-state, never an orphaned hold on an ENDED session", { skip }, async () => {
  for (let i = 0; i < 12; i++) {
    const { astro, userId, session } = await freshRequest(`ac${i}`);
    await Promise.allSettled([ctx.chat.acceptSession(session.id, astro.userId), ctx.billing.endSession(session.id, "USER_ENDED")]);
    ctx.billing.unregisterSession(session.id);
    const row = await sessionRow(ctx, session.id);
    const n = (await holds(session.id)).length;
    if (row.status === "ENDED") {
      assert.equal(n, 0, `iteration ${i}: ENDED session must hold nothing (found ${n})`);
    } else {
      assert.equal(row.status, "ACTIVE");
      assert.equal(n, 1);
      await ctx.billing.endSession(session.id, "USER_ENDED");
    }
    const w = await assertWalletSound(ctx, userId);
    assert.equal(w.reservedBalancePaise, 0, `iteration ${i}`);
  }
});

test("accepting an ended or expired request is a 409 and creates no hold", { skip }, async () => {
  const { astro, userId, session } = await freshRequest("late");
  await ctx.billing.endSession(session.id, "USER_ENDED");
  await assert.rejects(ctx.chat.acceptSession(session.id, astro.userId), (e: any) => e?.statusCode === 409);
  assert.equal((await holds(session.id)).length, 0);

  const second = await freshRequest("expired");
  await ctx.prisma.chatSession.update({ where: { id: second.session.id }, data: { requestExpiresAt: new Date(Date.now() - 1000) } });
  await assert.rejects(ctx.chat.acceptSession(second.session.id, second.astro.userId), (e: any) => e?.statusCode === 409);
  assert.equal((await holds(second.session.id)).length, 0);
  await ctx.billing.endSession(second.session.id, "TIMEOUT");
  await assertWalletSound(ctx, userId);
});

test("only the session's own astrologer can accept or reject", { skip }, async () => {
  const { session } = await freshRequest("owner");
  const other = await makeAstrologer(ctx, "intruder");
  await assert.rejects(ctx.chat.acceptSession(session.id, other.userId), (e: any) => e?.statusCode === 403);
  await assert.rejects(ctx.chat.rejectSession(session.id, other.userId), (e: any) => e?.statusCode === 403);
  assert.equal((await sessionRow(ctx, session.id)).status, "REQUESTED");
  await ctx.billing.endSession(session.id, "USER_ENDED");
});

test("a zero-balance user with free seconds can be accepted without a wallet hold (free-only session)", { skip }, async () => {
  const astro = await makeAstrologer(ctx, "freeonly");
  const userId = await makeUser(ctx, "u-freeonly");
  const session = await ctx.chat.startSession(userId, astro.profileId);
  const active = await ctx.chat.acceptSession(session.id, astro.userId);
  ctx.billing.unregisterSession(active.id);
  assert.equal(active.status, "ACTIVE");
  assert.equal((await holds(active.id)).length, 0, "no funds, so no hold — the session runs on the free allowance alone");
  await ctx.billing.endSession(active.id, "USER_ENDED");
  await assertWalletSound(ctx, userId);
});
