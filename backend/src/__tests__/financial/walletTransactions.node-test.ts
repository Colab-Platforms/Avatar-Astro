// Run with: npm run test:db:run -- src/__tests__/financial/walletTransactions.node-test.ts
//
// Checkpoint 1 — wallet functions given a transaction client must JOIN that transaction. (Before the fix,
// wallet.service.ts mis-detected Prisma 7's transaction client as the top-level client and silently opened a
// separate sibling transaction, so a caller's rollback left the wallet change committed — and a caller holding
// a row lock deadlocked against its own sibling.)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, fund, walletRow, assertWalletSound, type Ctx } from "./helpers.js";

let ctx: Ctx;
before(async () => { if (!skip) ctx = await boot("fin-wtx"); });
after(async () => { if (!skip) await shutdown(ctx); });

const ROLLBACK = new Error("deliberate rollback");

test("a debit made inside an outer transaction rolls back with it", { skip }, async () => {
  const userId = await makeUser(ctx, "debit");
  await fund(ctx, userId, { purchased: 1000 });
  const w = await walletRow(ctx, userId);

  await assert.rejects(
    ctx.prisma.$transaction(async (tx: any) => {
      await ctx.wallet.debitWithAllocations(w.id, 400, "TOOL_EXECUTION", { idempotencyKey: "wtx-debit-1" }, tx);
      throw ROLLBACK;
    }),
    (e: unknown) => e === ROLLBACK,
  );

  assert.equal((await walletRow(ctx, userId)).balancePaise, 1000, "the debit did not survive the rollback");
  assert.equal(await ctx.prisma.walletTransaction.count({ where: { idempotencyKey: "wtx-debit-1" } }), 0, "no ledger row survived either");
  await assertWalletSound(ctx, userId);
});

test("a reservation made inside an outer transaction rolls back with it", { skip }, async () => {
  const userId = await makeUser(ctx, "reserve");
  await fund(ctx, userId, { purchased: 1000 });
  const w = await walletRow(ctx, userId);

  await assert.rejects(
    ctx.prisma.$transaction(async (tx: any) => {
      const { reservation } = await ctx.wallet.createReservation(w.id, 300, "TOOL_EXECUTION", "wtx-ref-1", tx);
      assert.ok(reservation);
      throw ROLLBACK;
    }),
    (e: unknown) => e === ROLLBACK,
  );

  assert.equal((await walletRow(ctx, userId)).reservedBalancePaise, 0);
  assert.equal(await ctx.prisma.walletReservation.count({ where: { referenceId: "wtx-ref-1" } }), 0);
  await assertWalletSound(ctx, userId);
});

test("a caller that already holds the wallet row lock can call wallet functions without deadlocking against itself", { skip }, async () => {
  const userId = await makeUser(ctx, "lock");
  await fund(ctx, userId, { purchased: 1000 });
  const w = await walletRow(ctx, userId);

  const started = Date.now();
  await ctx.prisma.$transaction(async (tx: any) => {
    await ctx.wallet.lockWallet(tx, w.id); // take the lock first, exactly as settlement does
    const { reservation } = await ctx.wallet.createReservation(w.id, 300, "TOOL_EXECUTION", "wtx-ref-2", tx);
    await ctx.wallet.settleFromReservation(reservation!.id, 300, "TOOL_EXECUTION", { idempotencyKey: "wtx-settle-2", finalize: true }, tx);
  });
  assert.ok(Date.now() - started < 4000, "completed promptly instead of waiting out a lock timeout");

  const after = await assertWalletSound(ctx, userId);
  assert.equal(after.balancePaise, 700);
  assert.equal(after.reservedBalancePaise, 0);
});

test("called WITHOUT a transaction client, each wallet function still opens its own atomic transaction", { skip }, async () => {
  const userId = await makeUser(ctx, "standalone");
  await fund(ctx, userId, { purchased: 1000 });
  const w = await walletRow(ctx, userId);
  await ctx.wallet.debitWithAllocations(w.id, 250, "TOOL_EXECUTION", { idempotencyKey: "wtx-standalone" });
  assert.equal((await walletRow(ctx, userId)).balancePaise, 750);
  await assertWalletSound(ctx, userId);
});
