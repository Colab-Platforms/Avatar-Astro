import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, makeAstrologer, walletRow, assertWalletSound, type Ctx } from "./helpers.js";

let ctx: Ctx;
before(async () => {
  if (!skip) ctx = await boot("fin-admin-oversight");
});
after(async () => {
  if (!skip) await shutdown(ctx);
});

test("Superadmin wallet adjustment credits into purchased and promotional buckets", { skip }, async () => {
  const userId = await makeUser(ctx, "admin-adj-credit");
  const w = await ctx.wallet.getOrCreateWallet(userId);

  // Credit 5000 paise (₹50) to PURCHASED
  const credit1 = await ctx.wallet.creditToBucket(w.id, 5000, "PURCHASED", "ADJUSTMENT", {
    referenceId: "ticket-101",
    idempotencyKey: `adj-test-${Date.now()}-1`,
  });

  assert.equal(credit1.wallet.balancePaise, 5000);
  assert.equal(credit1.wallet.purchasedBalancePaise, 5000);
  assert.equal(credit1.wallet.promotionalBalancePaise, 0);
  assert.equal(credit1.transaction.reason, "ADJUSTMENT");

  // Credit 2000 paise (₹20) to PROMOTIONAL
  const credit2 = await ctx.wallet.creditToBucket(w.id, 2000, "PROMOTIONAL", "ADJUSTMENT", {
    referenceId: "goodwill-bonus",
    idempotencyKey: `adj-test-${Date.now()}-2`,
  });

  assert.equal(credit2.wallet.balancePaise, 7000);
  assert.equal(credit2.wallet.purchasedBalancePaise, 5000);
  assert.equal(credit2.wallet.promotionalBalancePaise, 2000);
  assert.equal(credit2.transaction.reason, "ADJUSTMENT");

  await assertWalletSound(ctx, userId);
});

test("Superadmin wallet adjustment debits obey Rule C (promotional spent first)", { skip }, async () => {
  const userId = await makeUser(ctx, "admin-adj-debit");
  const w = await ctx.wallet.getOrCreateWallet(userId);

  // Seed with 3000 purchased and 2000 promotional (total 5000)
  await ctx.wallet.creditToBucket(w.id, 3000, "PURCHASED", "RECHARGE");
  await ctx.wallet.creditToBucket(w.id, 2000, "PROMOTIONAL", "SIGNUP_BONUS");

  // Debit 3500 paise with reason ADJUSTMENT: should consume all 2000 promotional and 1500 purchased
  const debit = await ctx.wallet.debitWithAllocations(w.id, 3500, "ADJUSTMENT", {
    referenceId: "admin-chargeback-recouped",
    idempotencyKey: `adj-test-${Date.now()}-3`,
  });

  assert.equal(debit.wallet.balancePaise, 1500);
  assert.equal(debit.wallet.promotionalBalancePaise, 0);
  assert.equal(debit.wallet.purchasedBalancePaise, 1500);

  const tx = await ctx.prisma.walletTransaction.findUniqueOrThrow({
    where: { id: debit.transaction.id },
    include: { allocations: true },
  });

  assert.equal(tx.reason, "ADJUSTMENT");
  const promoAlloc = tx.allocations.find((a: any) => a.bucket === "PROMOTIONAL");
  const purchasedAlloc = tx.allocations.find((a: any) => a.bucket === "PURCHASED");
  assert.equal(promoAlloc?.amountPaise, 2000);
  assert.equal(purchasedAlloc?.amountPaise, 1500);

  await assertWalletSound(ctx, userId);
});

test("Superadmin wallet adjustment debit cannot overdraft below zero", { skip }, async () => {
  const userId = await makeUser(ctx, "admin-adj-overdraft");
  const w = await ctx.wallet.getOrCreateWallet(userId);

  await ctx.wallet.creditToBucket(w.id, 1000, "PURCHASED", "RECHARGE");

  await assert.rejects(
    ctx.wallet.debitWithAllocations(w.id, 2500, "ADJUSTMENT", {
      idempotencyKey: `adj-test-${Date.now()}-4`,
    }),
    (err: any) => err.statusCode === 409 || err.message?.includes("Insufficient balance"),
  );

  const after = await walletRow(ctx, userId);
  assert.equal(after.balancePaise, 1000, "balance remained untouched on rejected overdraft");
  await assertWalletSound(ctx, userId);
});

test("Astrologer rate bounds dynamically validate and constrain prices", { skip }, async () => {
  const rateBoundsModule = await import("../../modules/admin/astrologers/rateBounds.js");
  const astroService = await import("../../modules/astrologer/astrologer.service.js");

  // Create an astrologer
  const astro = await makeAstrologer(ctx, "rate-bounds", 10);

  // Set rate bounds: min ₹5, max ₹100, default ₹15
  const mockReq: any = { user: { id: astro.userId }, ip: "127.0.0.1" };
  await rateBoundsModule.setRateBoundsSetting(
    { minRatePerMinuteRupees: 5, maxRatePerMinuteRupees: 100, defaultRatePerMinuteRupees: 15 },
    mockReq,
  );

  const bounds = await rateBoundsModule.getRateBoundsSetting();
  assert.equal(bounds.minRatePerMinuteRupees, 5);
  assert.equal(bounds.maxRatePerMinuteRupees, 100);

  // Attempting to set rate to ₹2 should fail (below min 5)
  await assert.rejects(
    astroService.updateOwnAstrologerProfile(astro.userId, { pricePerMinute: 2 }),
    (err: any) => err.statusCode === 400 && err.message.includes("between ₹5 and ₹100"),
  );

  // Attempting to set rate to ₹200 should fail (above max 100)
  await assert.rejects(
    astroService.updateOwnAstrologerProfile(astro.userId, { pricePerMinute: 200 }),
    (err: any) => err.statusCode === 400 && err.message.includes("between ₹5 and ₹100"),
  );

  // Setting rate to ₹25 should succeed
  const updated = await astroService.updateOwnAstrologerProfile(astro.userId, { pricePerMinute: 25 });
  assert.equal(updated.pricePerMinute, 25);
});

test("Payment refund admin review lifecycle", { skip }, async () => {
  const userId = await makeUser(ctx, "refund-admin");
  const order = await ctx.prisma.paymentOrder.create({
    data: {
      userId,
      provider: "RAZORPAY",
      providerOrderId: `order_adm_${Date.now()}`,
      providerPaymentId: `pay_adm_${Date.now()}`,
      amountPaise: 5000,
      currency: "INR",
      status: "PAID",
    },
  });

  // Create refund record as webhook would
  const refund = await ctx.prisma.paymentRefund.create({
    data: {
      paymentOrderId: order.id,
      kind: "REFUND",
      providerRefundId: `rfnd_adm_${Date.now()}`,
      amountPaise: 5000,
      providerStatus: "processed",
      handling: "ACTION_REQUIRED",
    },
  });

  assert.equal(refund.handling, "ACTION_REQUIRED");

  // Admin updates handling to PROCESSED with review note
  const updated = await ctx.prisma.paymentRefund.update({
    where: { id: refund.id },
    data: {
      handling: "PROCESSED",
      handledBy: "superadmin@mybhagya.com",
      handledAt: new Date(),
      notes: "Verified gateway refund; customer notified.",
    },
  });

  assert.equal(updated.handling, "PROCESSED");
  assert.equal(updated.handledBy, "superadmin@mybhagya.com");
  assert.equal(updated.notes, "Verified gateway refund; customer notified.");
});

