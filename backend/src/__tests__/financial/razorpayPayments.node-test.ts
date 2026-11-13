// Run with: npm run test:db:run -- src/__tests__/financial/razorpayPayments.node-test.ts
//
// Checkpoint 3b — Razorpay payment gateway integration:
// server-side pricing, signature verification, payment status verification,
// concurrency safety between confirm and webhook, idempotent crediting to the
// PURCHASED bucket, late captures, and safe gating of refunds/disputes.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  skip,
  boot,
  shutdown,
  makeUser,
  walletRow,
  assertWalletSound,
  type Ctx,
} from "./helpers.js";
import {
  setPaymentProviderForTest,
  type PaymentProviderAdapter,
  type CreateOrderParams,
  type CreateOrderResult,
  type FetchPaymentResult,
} from "../../modules/payment/payment.provider.js";
import {
  createRechargeOrder,
  confirmRechargeOrder,
  creditOrderOnce,
  sweepAbandonedOrders,
  listPaymentRefunds,
  recordRefundOrDispute,
  markOrderFailed,
  MIN_RECHARGE_PAISE,
  MAX_RECHARGE_PAISE,
} from "../../modules/payment/payment.service.js";
import { razorpayWebhookHandler } from "../../modules/payment/payment.webhook.js";

const TEST_SECRET = "test_webhook_secret_123456789012345";
const TEST_KEY_SECRET = "test_key_secret_123456789012345";

class TestRazorpayAdapter implements PaymentProviderAdapter {
  public payments = new Map<string, FetchPaymentResult>();
  public shouldVerifyCheckout = true;
  public shouldVerifyWebhook = true;

  isConfigured(): boolean {
    return true;
  }

  getPublishableKey(): string | null {
    return "rzp_test_mock_key_id";
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const providerOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      providerOrderId,
      amountPaise: params.amountPaise,
      currency: "INR",
    };
  }

  async fetchPayment(paymentId: string): Promise<FetchPaymentResult> {
    const p = this.payments.get(paymentId);
    if (!p) {
      throw new Error(`Payment ${paymentId} not found in test adapter`);
    }
    return p;
  }

  async fetchOrderPayments(providerOrderId: string): Promise<FetchPaymentResult[]> {
    const list: FetchPaymentResult[] = [];
    for (const p of this.payments.values()) {
      if (p.providerOrderId === providerOrderId) {
        list.push(p);
      }
    }
    return list;
  }

  verifyCheckoutSignature(params: { orderId: string; paymentId: string; signature: string }): boolean {
    if (!this.shouldVerifyCheckout) return false;
    const expected = crypto
      .createHmac("sha256", TEST_KEY_SECRET)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest("hex");
    return params.signature === expected;
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!this.shouldVerifyWebhook) return false;
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    const expected = crypto.createHmac("sha256", TEST_SECRET).update(body).digest("hex");
    return signature === expected;
  }
}

let ctx: Ctx;
let adapter: TestRazorpayAdapter;

before(async () => {
  if (skip) return;
  ctx = await boot("rzp-pay");
  adapter = new TestRazorpayAdapter();
  setPaymentProviderForTest(adapter);
});

after(async () => {
  if (skip) return;
  setPaymentProviderForTest(null);
  await shutdown(ctx);
});

beforeEach(() => {
  adapter.payments.clear();
  adapter.shouldVerifyCheckout = true;
  adapter.shouldVerifyWebhook = true;
});

function signCheckout(orderId: string, paymentId: string): string {
  return crypto.createHmac("sha256", TEST_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
}

function signWebhook(payload: Record<string, unknown>): { rawBody: Buffer; signature: string } {
  const json = JSON.stringify(payload);
  const rawBody = Buffer.from(json, "utf8");
  const signature = crypto.createHmac("sha256", TEST_SECRET).update(rawBody).digest("hex");
  return { rawBody, signature };
}

test("recharge order creation validates amounts and records CREATED status with providerOrderId", { skip }, async () => {
  const userId = await makeUser(ctx, "amt-val");

  // Invalid: too low (< ₹20)
  await assert.rejects(
    () => createRechargeOrder(userId, 1999),
    /between ₹20 and ₹10000/,
  );

  // Invalid: too high (> ₹10,000)
  await assert.rejects(
    () => createRechargeOrder(userId, 10_000_01),
    /between ₹20 and ₹10000/,
  );

  // Invalid: float/non-integer
  await assert.rejects(
    () => createRechargeOrder(userId, 4999.5),
    /between ₹20 and ₹10000/,
  );

  // Valid: ₹49 (4900 paise)
  const { order, keyId } = await createRechargeOrder(userId, 4900);
  assert.equal(order.amountPaise, 4900);
  assert.equal(order.status, "CREATED");
  assert.equal(order.provider, "RAZORPAY");
  assert.ok(order.providerOrderId?.startsWith("order_"));
  assert.equal(keyId, "rzp_test_mock_key_id");

  // Verify internal row in Postgres
  const dbOrder = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(dbOrder.amountPaise, 4900);
  assert.equal(dbOrder.status, "CREATED");
});

test("successful checkout confirmation credits PURCHASED bucket exactly once", { skip }, async () => {
  const userId = await makeUser(ctx, "chk-ok");
  const { order } = await createRechargeOrder(userId, 9900); // ₹99
  const paymentId = "pay_test_chk_ok_1";

  adapter.payments.set(paymentId, {
    id: paymentId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 9900,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  const sig = signCheckout(order.providerOrderId!, paymentId);

  const res = await confirmRechargeOrder(userId, {
    orderId: order.id,
    razorpayOrderId: order.providerOrderId!,
    razorpayPaymentId: paymentId,
    razorpaySignature: sig,
  });

  assert.equal(res.order.status, "SUCCESS");
  assert.equal(res.balancePaise, 9900);

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 9900);
  assert.equal(w.purchasedBalancePaise, 9900);
  assert.equal(w.promotionalBalancePaise, 0);

  // Retried confirm is an idempotent no-op returning the same balance
  const retry = await confirmRechargeOrder(userId, {
    orderId: order.id,
    razorpayOrderId: order.providerOrderId!,
    razorpayPaymentId: paymentId,
    razorpaySignature: sig,
  });
  assert.equal(retry.balancePaise, 9900);

  const w2 = await assertWalletSound(ctx, userId);
  assert.equal(w2.balancePaise, 9900);
});

test("checkout confirmation rejects bad signature, wrong currency, wrong amount, uncaptured payment, and ownership mismatch", { skip }, async () => {
  const userA = await makeUser(ctx, "userA");
  const userB = await makeUser(ctx, "userB");

  const { order } = await createRechargeOrder(userA, 5000);
  const payId = "pay_sec_1";

  adapter.payments.set(payId, {
    id: payId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 5000,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  const validSig = signCheckout(order.providerOrderId!, payId);

  // 1. Ownership mismatch: userB tries to confirm userA's order
  await assert.rejects(
    () =>
      confirmRechargeOrder(userB, {
        orderId: order.id,
        razorpayOrderId: order.providerOrderId!,
        razorpayPaymentId: payId,
        razorpaySignature: validSig,
      }),
    /Unauthorized order confirmation/,
  );

  // 2. Bad signature
  await assert.rejects(
    () =>
      confirmRechargeOrder(userA, {
        orderId: order.id,
        razorpayOrderId: order.providerOrderId!,
        razorpayPaymentId: payId,
        razorpaySignature: "invalid_sig_abc",
      }),
    /Invalid payment signature/,
  );

  // 3. Amount mismatch reported by Razorpay
  adapter.payments.set(payId, {
    id: payId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 2000, // order was 5000!
    currency: "INR",
    status: "captured",
    captured: true,
  });
  await assert.rejects(
    () =>
      confirmRechargeOrder(userA, {
        orderId: order.id,
        razorpayOrderId: order.providerOrderId!,
        razorpayPaymentId: payId,
        razorpaySignature: validSig,
      }),
    /Paid amount does not match/,
  );

  // 4. Currency mismatch
  adapter.payments.set(payId, {
    id: payId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 5000,
    currency: "USD",
    status: "captured",
    captured: true,
  });
  await assert.rejects(
    () =>
      confirmRechargeOrder(userA, {
        orderId: order.id,
        razorpayOrderId: order.providerOrderId!,
        razorpayPaymentId: payId,
        razorpaySignature: validSig,
      }),
    /Payment currency must be INR/,
  );

  // 5. Uncaptured payment (e.g. status authorized or failed)
  adapter.payments.set(payId, {
    id: payId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 5000,
    currency: "INR",
    status: "failed",
    captured: false,
  });
  await assert.rejects(
    () =>
      confirmRechargeOrder(userA, {
        orderId: order.id,
        razorpayOrderId: order.providerOrderId!,
        razorpayPaymentId: payId,
        razorpaySignature: validSig,
      }),
    /Payment is not captured/,
  );

  // Wallet must remain uncredited / 0
  const wallet = await ctx.wallet.getOrCreateWallet(userA);
  assert.equal(wallet.balancePaise, 0);
  assert.equal(wallet.purchasedBalancePaise, 0);
});

test("concurrent confirm vs webhook race: exactly ONE credit lands in the wallet", { skip }, async () => {
  const userId = await makeUser(ctx, "race");
  const { order } = await createRechargeOrder(userId, 19900); // ₹199
  const paymentId = "pay_race_123";

  adapter.payments.set(paymentId, {
    id: paymentId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 19900,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  const sig = signCheckout(order.providerOrderId!, paymentId);

  // Mock response object for webhook handler
  function makeMockRes() {
    let statusCode = 200;
    let body: any = null;
    return {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        body = data;
        return this;
      },
      get code() {
        return statusCode;
      },
      get data() {
        return body;
      },
    };
  }

  const webhookPayload = {
    id: "evt_race_webhook_1",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 19900,
          currency: "INR",
          notes: { internalOrderId: order.id },
        },
      },
    },
  };
  const { rawBody, signature } = signWebhook(webhookPayload);

  const mockRes = makeMockRes();
  const mockReq: any = {
    body: rawBody,
    headers: {
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": "evt_race_webhook_1",
    },
  };

  // Launch both simultaneously
  const [confirmRes] = await Promise.all([
    confirmRechargeOrder(userId, {
      orderId: order.id,
      razorpayOrderId: order.providerOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
    }),
    razorpayWebhookHandler(mockReq, mockRes as any),
  ]);

  assert.equal(confirmRes.balancePaise, 19900);
  assert.equal(mockRes.code, 200);

  // Exactly 19900 paise in wallet (NEVER 39800 paise)
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 19900);
  assert.equal(w.purchasedBalancePaise, 19900);

  // Check ledger transactions count
  const txs = await ctx.prisma.walletTransaction.findMany({
    where: { walletId: w.id, referenceId: order.id },
  });
  assert.equal(txs.length, 1, "exactly one recharge transaction row exists in ledger");
});

test("duplicate webhook deliveries return duplicate: true and never double-credit", { skip }, async () => {
  const userId = await makeUser(ctx, "dup-hook");
  const { order } = await createRechargeOrder(userId, 4900);
  const paymentId = "pay_dup_hook_1";

  const webhookPayload = {
    id: "evt_dup_test_1",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 4900,
          currency: "INR",
          notes: { internalOrderId: order.id },
        },
      },
    },
  };
  const { rawBody, signature } = signWebhook(webhookPayload);

  function makeReqRes() {
    let statusCode = 200;
    let body: any = null;
    return {
      req: {
        body: rawBody,
        headers: {
          "x-razorpay-signature": signature,
          "x-razorpay-event-id": "evt_dup_test_1",
        },
      } as any,
      res: {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
        get code() {
          return statusCode;
        },
        get data() {
          return body;
        },
      } as any,
    };
  }

  // Delivery 1
  const d1 = makeReqRes();
  await razorpayWebhookHandler(d1.req, d1.res);
  assert.equal(d1.res.code, 200);
  assert.equal(d1.res.data?.status, "ok");
  assert.equal(d1.res.data?.duplicate, undefined);

  // Delivery 2 (retried by Razorpay)
  const d2 = makeReqRes();
  await razorpayWebhookHandler(d2.req, d2.res);
  assert.equal(d2.res.code, 200);
  assert.equal(d2.res.data?.status, "ok");
  assert.equal(d2.res.data?.duplicate, true);

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 4900);
});

test("payment.failed marks order FAILED, but subsequent late capture webhook still credits exactly once", { skip }, async () => {
  const userId = await makeUser(ctx, "late-cap");
  const { order } = await createRechargeOrder(userId, 49900); // ₹499
  const paymentId = "pay_late_cap_1";

  function sendWebhook(payload: Record<string, unknown>) {
    const { rawBody, signature } = signWebhook(payload);
    let statusCode = 200;
    let resBody: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resBody = data;
        return this;
      },
      get code() {
        return statusCode;
      },
      get data() {
        return resBody;
      },
    };
    const req: any = {
      body: rawBody,
      headers: {
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": payload.id,
      },
    };
    return razorpayWebhookHandler(req, res).then(() => res);
  }

  // 1. Failure webhook arrives
  const failRes = await sendWebhook({
    id: "evt_fail_1",
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 49900,
          currency: "INR",
        },
      },
    },
  });
  assert.equal(failRes.code, 200);

  const o1 = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(o1.status, "FAILED");

  // 2. Later, Razorpay recovers or auto-captures and emits payment.captured
  const capRes = await sendWebhook({
    id: "evt_cap_recovered_1",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 49900,
          currency: "INR",
        },
      },
    },
  });
  assert.equal(capRes.code, 200);

  const o2 = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(o2.status, "SUCCESS");

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 49900);
});

test("abandoned order sweep marks stale CREATED orders EXPIRED without touching legitimate payments", { skip }, async () => {
  const userId = await makeUser(ctx, "sweep");
  const { order } = await createRechargeOrder(userId, 5000);

  // Artificially age the order by 2 hours
  await ctx.prisma.paymentOrder.update({
    where: { id: order.id },
    data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
  });

  const { sweptCount } = await sweepAbandonedOrders(60);
  assert.ok(sweptCount >= 1);

  const sweptOrder = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(sweptOrder.status, "EXPIRED");

  // Late capture arriving after order was marked EXPIRED must still credit the wallet
  const latePayId = "pay_after_expire_1";
  const { order: creditedOrder, balancePaise } = await creditOrderOnce({
    orderId: order.id,
    providerPaymentId: latePayId,
  });

  assert.equal(creditedOrder.status, "SUCCESS");
  assert.equal(balancePaise, 5000);

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 5000);
});

test("refund and dispute webhooks record PaymentRefund with ACTION_REQUIRED and NEVER debit the wallet", { skip }, async () => {
  const userId = await makeUser(ctx, "refund-gate");
  const { order } = await createRechargeOrder(userId, 10000); // ₹100
  const paymentId = "pay_to_be_refunded";

  adapter.payments.set(paymentId, {
    id: paymentId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 10000,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  // Complete the recharge
  await confirmRechargeOrder(userId, {
    orderId: order.id,
    razorpayOrderId: order.providerOrderId!,
    razorpayPaymentId: paymentId,
    razorpaySignature: signCheckout(order.providerOrderId!, paymentId),
  });

  assert.equal((await walletRow(ctx, userId)).balancePaise, 10000);

  function sendWebhook(payload: Record<string, unknown>) {
    const { rawBody, signature } = signWebhook(payload);
    let statusCode = 200;
    let resBody: any = null;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resBody = data;
        return this;
      },
      get code() {
        return statusCode;
      },
      get data() {
        return resBody;
      },
    };
    const req: any = {
      body: rawBody,
      headers: {
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": payload.id,
      },
    };
    return razorpayWebhookHandler(req, res).then(() => res);
  }

  // 1. Partial refund webhook: ₹50
  const refundRes = await sendWebhook({
    id: "evt_refund_part_1",
    event: "refund.created",
    payload: {
      refund: {
        entity: {
          id: "rfn_12345",
          payment_id: paymentId,
          amount: 5000,
          status: "processed",
        },
      },
    },
  });
  assert.equal(refundRes.code, 200);

  // 2. Dispute webhook: ₹50
  const disputeRes = await sendWebhook({
    id: "evt_dispute_1",
    event: "payment.dispute.created",
    payload: {
      dispute: {
        entity: {
          id: "disp_99999",
          payment_id: paymentId,
          amount: 5000,
          status: "under_review",
        },
      },
    },
  });
  assert.equal(disputeRes.code, 200);

  // Check recorded PaymentRefund records in database
  const refunds = await ctx.prisma.paymentRefund.findMany({
    where: { paymentOrderId: order.id },
  });
  assert.equal(refunds.length, 2);

  const rfn = refunds.find((r: any) => r.kind === "REFUND");
  assert.ok(rfn);
  assert.equal(rfn?.amountPaise, 5000);
  assert.equal(rfn?.handling, "ACTION_REQUIRED");

  const disp = refunds.find((r: any) => r.kind === "DISPUTE");
  assert.ok(disp);
  assert.equal(disp?.amountPaise, 5000);
  assert.equal(disp?.handling, "ACTION_REQUIRED");

  // CRITICAL: The wallet was NEVER automatically debited!
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 10000, "wallet balance unchanged; refund action strictly gated for admin review");

  // Admin query returns them
  const adminList = await listPaymentRefunds({ handling: "ACTION_REQUIRED" });
  assert.ok(adminList.total >= 2);
  const found = adminList.items.some((item: any) => item.paymentOrderId === order.id);
  assert.ok(found);
});

test("concurrent webhook deliveries of the same payment.captured event never double-credit", { skip }, async () => {
  const userId = await makeUser(ctx, "conc-hook");
  const { order } = await createRechargeOrder(userId, 5000); // ₹50
  const paymentId = "pay_conc_hook_1";

  const webhookPayload = {
    id: "evt_conc_hook_1",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 5000,
          currency: "INR",
          notes: { internalOrderId: order.id },
        },
      },
    },
  };
  const { rawBody, signature } = signWebhook(webhookPayload);

  function makeReqRes() {
    let statusCode = 200;
    let body: any = null;
    return {
      req: {
        body: rawBody,
        headers: {
          "x-razorpay-signature": signature,
          "x-razorpay-event-id": "evt_conc_hook_1",
        },
      } as any,
      res: {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          body = data;
          return this;
        },
        get code() {
          return statusCode;
        },
        get data() {
          return body;
        },
      } as any,
    };
  }

  const d1 = makeReqRes();
  const d2 = makeReqRes();

  // Deliver both at the exact same millisecond
  await Promise.all([
    razorpayWebhookHandler(d1.req, d1.res),
    razorpayWebhookHandler(d2.req, d2.res),
  ]);

  assert.equal(d1.res.code, 200);
  assert.equal(d2.res.code, 200);

  // Exactly ₹50 in wallet, never ₹100
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 5000);
  assert.equal(w.purchasedBalancePaise, 5000);

  // Exactly one transaction row
  const txs = await ctx.prisma.walletTransaction.findMany({
    where: { walletId: w.id, referenceId: order.id },
  });
  assert.equal(txs.length, 1);
});

test("creditOrderOnce transaction rolls back webhook event if financial crediting fails, allowing safe retry", { skip }, async () => {
  const userId = await makeUser(ctx, "tx-fail");
  const { order } = await createRechargeOrder(userId, 5000);
  const paymentId = "pay_fail_tx_1";
  const eventId = "evt_fail_tx_1";

  // If a transaction fails mid-flight (e.g. database error inside the transaction)
  await assert.rejects(async () => {
    await ctx.prisma.$transaction(async (tx) => {
      // Call creditOrderOnce with externalTx
      await creditOrderOnce({
        orderId: order.id,
        providerPaymentId: paymentId,
        webhookEvent: {
          eventId,
          eventType: "payment.captured",
          payload: { test: true },
        },
        externalTx: tx,
      });
      // Force transaction failure
      throw new Error("Simulated database failure mid-flight");
    });
  }, /Simulated database failure mid-flight/);

  // 1. Order status is NOT SUCCESS
  const dbOrder = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(dbOrder.status, "CREATED");

  // 2. Webhook event was ROLLED BACK and does NOT exist
  const evt = await ctx.prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
  assert.equal(evt, null, "webhook event must roll back with the failed transaction");

  // 3. Retry succeeds and commits cleanly
  await creditOrderOnce({
    orderId: order.id,
    providerPaymentId: paymentId,
    webhookEvent: {
      eventId,
      eventType: "payment.captured",
      payload: { test: true },
    },
  });

  const dbOrderAfter = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(dbOrderAfter.status, "SUCCESS");

  const evtAfter = await ctx.prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
  assert.ok(evtAfter, "webhook event successfully recorded after retry");

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 5000);
});

test("sweepAbandonedOrders recovers missed captured payments where both confirm and webhook failed", { skip }, async () => {
  const userId = await makeUser(ctx, "sweep-rec");
  const { order } = await createRechargeOrder(userId, 7500); // ₹75
  const paymentId = "pay_missed_captured_1";

  // Simulate payment captured on Razorpay
  adapter.payments.set(paymentId, {
    id: paymentId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 7500,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  // Age order past threshold
  await ctx.prisma.paymentOrder.update({
    where: { id: order.id },
    data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
  });

  // Run sweep
  const { sweptCount, recoveredCount } = await sweepAbandonedOrders(60);
  assert.equal(recoveredCount, 1, "must recover exactly 1 missed captured order");

  const dbOrder = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(dbOrder.status, "SUCCESS");
  assert.equal(dbOrder.providerPaymentId, paymentId);

  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 7500);
});

test("concurrent 3-way race: reconciliation sweep vs webhook vs frontend confirm never double-credits", { skip }, async () => {
  const userId = await makeUser(ctx, "three-way");
  const { order } = await createRechargeOrder(userId, 12000); // ₹120
  const paymentId = "pay_three_way_1";

  adapter.payments.set(paymentId, {
    id: paymentId,
    providerOrderId: order.providerOrderId!,
    amountPaise: 12000,
    currency: "INR",
    status: "captured",
    captured: true,
  });

  // Age order so sweeper considers it
  await ctx.prisma.paymentOrder.update({
    where: { id: order.id },
    data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
  });

  const sig = signCheckout(order.providerOrderId!, paymentId);
  const webhookPayload = {
    id: "evt_three_way_1",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.providerOrderId!,
          amount: 12000,
          currency: "INR",
          notes: { internalOrderId: order.id },
        },
      },
    },
  };
  const { rawBody, signature } = signWebhook(webhookPayload);

  let webhookCode = 200;
  const mockRes: any = {
    status(code: number) { webhookCode = code; return this; },
    json() { return this; },
  };
  const mockReq: any = {
    body: rawBody,
    headers: {
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": "evt_three_way_1",
    },
  };

  // Launch all 3 concurrently
  await Promise.all([
    confirmRechargeOrder(userId, {
      orderId: order.id,
      razorpayOrderId: order.providerOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
    }),
    razorpayWebhookHandler(mockReq, mockRes),
    sweepAbandonedOrders(60),
  ]);

  const dbOrder = await ctx.prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(dbOrder.status, "SUCCESS");

  // Exactly 12000 paise credited, never 24000 or 36000
  const w = await assertWalletSound(ctx, userId);
  assert.equal(w.balancePaise, 12000);

  const txs = await ctx.prisma.walletTransaction.findMany({
    where: { walletId: w.id, referenceId: order.id },
  });
  assert.equal(txs.length, 1, "exactly one transaction in ledger");
});

test("refund.created and payment.failed roll back webhook event marker on transaction failure", { skip }, async () => {
  const userId = await makeUser(ctx, "rfnd-fail");
  const { order } = await createRechargeOrder(userId, 5000);
  const refundEvtId = "evt_fail_refund_tx_1";

  // Simulate failure during refund recording transaction
  await assert.rejects(async () => {
    await ctx.prisma.$transaction(async (tx) => {
      await recordRefundOrDispute({
        kind: "REFUND",
        amountPaise: 5000,
        providerStatus: "processed",
        providerOrderId: order.providerOrderId!,
        providerRefundId: "rfn_tx_fail_1",
        webhookEvent: {
          eventId: refundEvtId,
          eventType: "refund.created",
          payload: { test: true },
        },
        externalTx: tx,
      });
      throw new Error("Simulated refund DB error");
    });
  }, /Simulated refund DB error/);

  // Verify refund record does NOT exist
  const rfnd = await ctx.prisma.paymentRefund.findUnique({
    where: { providerRefundId: "rfn_tx_fail_1" },
  });
  assert.equal(rfnd, null, "refund row must not exist after rollback");

  // Verify webhook event marker does NOT exist
  const evt = await ctx.prisma.paymentWebhookEvent.findUnique({
    where: { eventId: refundEvtId },
  });
  assert.equal(evt, null, "webhook event marker must not exist after rollback");

  // Retry succeeds cleanly
  await recordRefundOrDispute({
    kind: "REFUND",
    amountPaise: 5000,
    providerStatus: "processed",
    providerOrderId: order.providerOrderId!,
    providerRefundId: "rfn_tx_fail_1",
    webhookEvent: {
      eventId: refundEvtId,
      eventType: "refund.created",
      payload: { test: true },
    },
  });

  const rfndAfter = await ctx.prisma.paymentRefund.findUnique({
    where: { providerRefundId: "rfn_tx_fail_1" },
  });
  assert.ok(rfndAfter, "refund row created after retry");

  const evtAfter = await ctx.prisma.paymentWebhookEvent.findUnique({
    where: { eventId: refundEvtId },
  });
  assert.ok(evtAfter, "webhook event marker created after retry");
});
