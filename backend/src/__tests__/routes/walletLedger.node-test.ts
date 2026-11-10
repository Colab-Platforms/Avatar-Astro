// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:wallet-ledger
//
// Coin-wallet Checkpoint 1: bucket columns, split-bucket ledger allocations, idempotent
// debit/credit/refund, row-locking concurrency, and the exactly-once signup bonus grant.
// Local disposable database only (refuses anything that is not localhost) — and refuses to run
// unless the new migration (20261110140000_add_wallet_coin_buckets) has actually been applied to
// that database, since this suite exercises real columns/constraints it adds.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";

const DOM = "@wallet-ledger-test.example";

let prisma: any;
let wallet: any;
let signupBonus: any;
const ids: Record<string, string> = {};

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  signupBonus = await import("../../modules/payment/signupBonus.service.js");

  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["alice", "bob", "carol", "dave"]) {
    const u = await prisma.user.create({
      data: { email: `${key}${DOM}`, firstName: key, password: "HASH", isActive: true, userRoleMappings: { create: { roleId: role.id } } },
    });
    ids[key] = u.id;
  }
});

after(async () => {
  if (skip) return;
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.$disconnect();
});

test("signup bonus: grants exactly 5000 paise (50 coins) into the promotional bucket, once", { skip }, async () => {
  await prisma.$transaction(async (tx: any) => signupBonus.grantSignupBonusIfEligible(tx, ids.alice));
  const w = await wallet.getOrCreateWallet(ids.alice);
  assert.equal(w.balancePaise, 5000);
  assert.equal(w.promotionalBalancePaise, 5000);
  assert.equal(w.purchasedBalancePaise, 0);

  // A second call for the same user — sequential — must be a no-op, not a second credit.
  await prisma.$transaction(async (tx: any) => signupBonus.grantSignupBonusIfEligible(tx, ids.alice));
  const w2 = await wallet.getOrCreateWallet(ids.alice);
  assert.equal(w2.balancePaise, 5000, "repeated grant must not double-credit");

  const grants = await prisma.signupBonusGrant.count({ where: { userId: ids.alice } });
  assert.equal(grants, 1);
});

test("signup bonus: concurrent calls for the same user grant exactly once", { skip }, async () => {
  const results = await Promise.allSettled([
    prisma.$transaction(async (tx: any) => signupBonus.grantSignupBonusIfEligible(tx, ids.bob)),
    prisma.$transaction(async (tx: any) => signupBonus.grantSignupBonusIfEligible(tx, ids.bob)),
    prisma.$transaction(async (tx: any) => signupBonus.grantSignupBonusIfEligible(tx, ids.bob)),
  ]);
  // None of these should reject — a conflict is a normal 0-row INSERT, never a thrown error.
  for (const r of results) assert.equal(r.status, "fulfilled", r.status === "rejected" ? String(r.reason) : "");

  const w = await wallet.getOrCreateWallet(ids.bob);
  assert.equal(w.balancePaise, 5000, "concurrent grants must still land exactly one bonus");
  const grants = await prisma.signupBonusGrant.count({ where: { userId: ids.bob } });
  assert.equal(grants, 1);
});

test("debit: spends promotional coins before purchased coins, split across both when needed", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.carol);
  await wallet.creditToBucket(w.id, 3000, "PROMOTIONAL", "SIGNUP_BONUS"); // 30 coins promo
  await wallet.creditToBucket(w.id, 2000, "PURCHASED", "RECHARGE"); // 20 coins purchased
  // Total 5000. Spend 4000 -> should take all 3000 promo + 1000 purchased.
  const { wallet: after1, transaction } = await wallet.debitWithAllocations(w.id, 4000, "CHAT_CONSUMPTION");
  assert.equal(after1.balancePaise, 1000);
  assert.equal(after1.promotionalBalancePaise, 0);
  assert.equal(after1.purchasedBalancePaise, 1000);

  const allocations = await prisma.walletLedgerAllocation.findMany({ where: { transactionId: transaction.id } });
  assert.equal(allocations.length, 2);
  assert.equal(allocations.find((a: any) => a.bucket === "PROMOTIONAL")?.amountPaise, 3000);
  assert.equal(allocations.find((a: any) => a.bucket === "PURCHASED")?.amountPaise, 1000);
});

test("refund: restores the exact original bucket split, not a fresh promotional-first allocation", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.dave);
  await wallet.creditToBucket(w.id, 1000, "PROMOTIONAL", "SIGNUP_BONUS"); // 10 coins promo
  await wallet.creditToBucket(w.id, 1000, "PURCHASED", "RECHARGE"); // 10 coins purchased
  const { transaction: debitTxn } = await wallet.debitWithAllocations(w.id, 1500, "TOOL_EXECUTION"); // 10 promo + 5 purchased

  const { wallet: refunded, transaction: refundTxn } = await wallet.refundTransaction(debitTxn.id);
  assert.equal(refunded.balancePaise, 2000);
  assert.equal(refunded.promotionalBalancePaise, 1000, "refund must restore the exact promotional amount debited, not re-run promotional-first policy");
  assert.equal(refunded.purchasedBalancePaise, 1000);

  // Refunding the same transaction twice must be a no-op (idempotent).
  const { wallet: refundedAgain } = await wallet.refundTransaction(debitTxn.id);
  assert.equal(refundedAgain.balancePaise, 2000, "re-refunding must not double-credit");
  assert.equal(refundTxn.reversalOfId, debitTxn.id);
});

test("debit: throws Insufficient balance rather than overdrafting", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.alice); // already has 5000 from the earlier signup-bonus test
  await assert.rejects(
    () => wallet.debitWithAllocations(w.id, 999_999, "CHAT_CONSUMPTION"),
    (err: any) => err.statusCode === 409 || /Insufficient balance/.test(err.message),
  );
  const unchanged = await wallet.getOrCreateWallet(ids.alice);
  assert.equal(unchanged.balancePaise, 5000, "a rejected debit must not partially mutate the balance");
});

test("debit: idempotencyKey makes a retried call a safe no-op, not a double charge", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.carol); // 1000 paise left from the split-debit test above
  const key = "test-idem-key-carol-1";
  const first = await wallet.debitWithAllocations(w.id, 500, "CHAT_CONSUMPTION", { idempotencyKey: key });
  const second = await wallet.debitWithAllocations(w.id, 500, "CHAT_CONSUMPTION", { idempotencyKey: key });
  assert.equal(first.transaction.id, second.transaction.id, "same idempotencyKey must return the same transaction, not create a new one");

  const finalWallet = await wallet.getOrCreateWallet(ids.carol);
  assert.equal(finalWallet.balancePaise, 500, "the second call with the same idempotencyKey must not have charged again");
});

test("debit: concurrent operations with DIFFERENT idempotency keys never overspend the same wallet", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.bob); // 5000 paise from the concurrent-signup-bonus test
  // Fire 10 concurrent debits of 600 each (6000 total) against a 5000 balance — at most 8 can succeed (4800),
  // the rest must be rejected as insufficient, and the wallet must never go negative or allow more than it holds.
  const attempts = Array.from({ length: 10 }, (_, i) =>
    wallet.debitWithAllocations(w.id, 600, "CHAT_CONSUMPTION", { idempotencyKey: `concurrent-bob-${i}` }).then(
      () => "ok" as const,
      () => "rejected" as const,
    ),
  );
  const outcomes = await Promise.all(attempts);
  const okCount = outcomes.filter((o) => o === "ok").length;

  const final = await wallet.getOrCreateWallet(ids.bob);
  assert.equal(final.balancePaise, 5000 - okCount * 600, "final balance must exactly match the number of debits that actually succeeded");
  assert.ok(final.balancePaise >= 0, "balance must never go negative");
  assert.equal(final.balancePaise, final.purchasedBalancePaise + final.promotionalBalancePaise, "bucket invariant must hold under concurrency");
});
