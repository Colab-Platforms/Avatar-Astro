import crypto from "node:crypto";
import {
  Prisma,
  type PaymentOrder,
  type PaymentRefund,
  type PaymentRefundKind,
  type PaymentRefundHandling,
} from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  getPaymentProvider,
  mockPaymentProvider,
  type FetchPaymentResult,
} from "./payment.provider.js";
import { getOrCreateWallet, creditToBucket } from "./wallet.service.js";
import { isMockPaymentsEnabled } from "./mockPayments.js";

export const MIN_RECHARGE_PAISE = 2000; // ₹20
export const MAX_RECHARGE_PAISE = 10_000_00; // ₹10,000

/**
 * Ensures payments can proceed. Razorpay is preferred when configured;
 * mock payments are allowed ONLY in development/test when explicitly enabled.
 */
export function assertPaymentsAvailable(): { provider: "RAZORPAY" | "MOCK" } {
  const provider = getPaymentProvider();
  if (provider.isConfigured()) {
    return { provider: "RAZORPAY" };
  }
  if (isMockPaymentsEnabled()) {
    return { provider: "MOCK" };
  }
  throw new ApiError(
    "Coin top-ups are not available yet. Please check back soon.",
    STATUS_CODES.SERVICE_UNAVAILABLE,
  );
}

/**
 * Creates an internal PaymentOrder row FIRST, then calls the gateway provider.
 * Even if an external network or persistence failure happens afterwards, the order
 * exists in CREATED state and can be reconciled safely via receipt = order.id.
 */
export async function createRechargeOrder(userId: string, amountPaise: number) {
  const { provider } = assertPaymentsAvailable();

  if (
    !Number.isInteger(amountPaise) ||
    amountPaise < MIN_RECHARGE_PAISE ||
    amountPaise > MAX_RECHARGE_PAISE
  ) {
    throw new ApiError(
      `Recharge amount must be between ₹${MIN_RECHARGE_PAISE / 100} and ₹${MAX_RECHARGE_PAISE / 100}`,
      STATUS_CODES.BAD_REQUEST,
    );
  }

  // 1. Create internal order first
  const order = await prisma.paymentOrder.create({
    data: {
      userId,
      amountPaise,
      provider,
      status: "CREATED",
    },
  });

  // 2. Call provider to generate provider order ID
  let providerOrderId: string;
  let publishableKey: string | null = null;

  if (provider === "MOCK") {
    const res = await mockPaymentProvider.createOrder({
      amountPaise,
      receipt: order.id,
      notes: { internalOrderId: order.id, userId },
    });
    providerOrderId = res.providerOrderId;
    publishableKey = mockPaymentProvider.getPublishableKey();
  } else {
    const activeProvider = getPaymentProvider();
    const res = await activeProvider.createOrder({
      amountPaise,
      receipt: order.id,
      notes: { internalOrderId: order.id, userId },
    });
    providerOrderId = res.providerOrderId;
    publishableKey = activeProvider.getPublishableKey();
  }

  // 3. Update internal order with provider order ID
  const updatedOrder = await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { providerOrderId },
  });

  return {
    order: updatedOrder,
    keyId: publishableKey,
  };
}

export interface CreditOrderResult {
  order: PaymentOrder;
  balancePaise: number;
  alreadyCredited: boolean;
}

/**
 * Shared, atomic, concurrency-safe crediting engine.
 * Both client confirmation and gateway webhooks funnel through this single function.
 *
 * Uses SELECT ... FOR UPDATE on payment_orders and the unique idempotencyKey on
 * wallet_transactions (razorpay_payment:<providerPaymentId>) to guarantee exactly-once credit.
 */
export interface CreditOrderParams {
  orderId: string;
  providerPaymentId: string;
  providerOrderId?: string;
  webhookEvent?: {
    eventId: string;
    eventType: string;
    payload?: unknown;
  };
  externalTx?: Prisma.TransactionClient;
}

export async function creditOrderOnce(
  params: CreditOrderParams,
): Promise<CreditOrderResult> {
  const run = async (
    tx: Prisma.TransactionClient,
  ): Promise<CreditOrderResult> => {
    // 1. Lock the order row
    const rows = await tx.$queryRaw<PaymentOrder[]>`
      SELECT
        id,
        user_id AS "userId",
        amount_paise AS "amountPaise",
        provider,
        status,
        provider_order_id AS "providerOrderId",
        provider_payment_id AS "providerPaymentId",
        created_at AS "createdAt",
        completed_at AS "completedAt"
      FROM payment_orders
      WHERE id = ${params.orderId}
      FOR UPDATE
    `;

    if (!rows[0]) {
      throw new ApiError("Recharge order not found", STATUS_CODES.NOT_FOUND);
    }
    const order = rows[0];

    // Helper to record the webhook event inside the same transaction using ON CONFLICT DO NOTHING
    // so that concurrent duplicates never abort the PostgreSQL transaction.
    const recordWebhookEventIfPresent = async () => {
      if (!params.webhookEvent) return;
      const eventId = params.webhookEvent.eventId;
      const eventType = params.webhookEvent.eventType;
      const payloadJson = JSON.stringify(params.webhookEvent.payload ?? {});
      const pweId = "pwe_" + crypto.randomUUID().replace(/-/g, "");

      await tx.$executeRaw`
        INSERT INTO payment_webhook_events (id, provider, event_id, event_type, payload, created_at)
        VALUES (
          ${pweId},
          'RAZORPAY'::"PaymentProvider",
          ${eventId},
          ${eventType},
          ${payloadJson}::jsonb,
          NOW()
        )
        ON CONFLICT (event_id) DO NOTHING
      `;
    };

    // 2. Already credited? Safe no-op, record webhook event if needed, return current wallet balance
    if (order.status === "SUCCESS") {
      await recordWebhookEventIfPresent();
      const wallet = await getOrCreateWallet(order.userId, tx);
      return {
        order,
        balancePaise: wallet.balancePaise,
        alreadyCredited: true,
      };
    }

    // 3. Mark as SUCCESS and record providerPaymentId.
    // Late captured payments (even if previously EXPIRED or FAILED) are honored here.
    const updatedOrder = await tx.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        providerPaymentId: params.providerPaymentId,
        ...(params.providerOrderId
          ? { providerOrderId: params.providerOrderId }
          : {}),
      },
    });

    // 4. Credit wallet into PURCHASED bucket with idempotency key
    const wallet = await getOrCreateWallet(order.userId, tx);
    const idempotencyKey = `razorpay_payment:${params.providerPaymentId}`;

    const creditResult = await creditToBucket(
      wallet.id,
      order.amountPaise,
      "PURCHASED",
      "RECHARGE",
      {
        referenceId: order.id,
        idempotencyKey,
      },
      tx,
    );

    // 5. Record webhook event inside the same atomic transaction
    await recordWebhookEventIfPresent();

    return {
      order: updatedOrder,
      balancePaise: creditResult.wallet.balancePaise,
      alreadyCredited: false,
    };
  };

  return params.externalTx ? run(params.externalTx) : prisma.$transaction(run);
}

export interface ConfirmRechargeParams {
  orderId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

/**
 * Validates frontend confirmation of a recharge order.
 * Verifies signature and queries the Razorpay API directly for captured status before crediting.
 */
export async function confirmRechargeOrder(
  userId: string,
  paramsOrOrderId: ConfirmRechargeParams | string,
) {
  assertPaymentsAvailable();

  const params: ConfirmRechargeParams =
    typeof paramsOrOrderId === "string"
      ? { orderId: paramsOrOrderId }
      : paramsOrOrderId;

  const order = await prisma.paymentOrder.findFirst({
    where: { id: params.orderId },
  });

  if (!order) {
    throw new ApiError("Recharge order not found", STATUS_CODES.NOT_FOUND);
  }

  // Ownership check: users can only confirm their own order
  if (order.userId !== userId) {
    throw new ApiError(
      "Unauthorized order confirmation",
      STATUS_CODES.FORBIDDEN,
    );
  }

  // Already credited?
  if (order.status === "SUCCESS") {
    const wallet = await getOrCreateWallet(userId);
    return { order, balancePaise: wallet.balancePaise };
  }

  if (order.provider === "MOCK") {
    if (!isMockPaymentsEnabled()) {
      throw new ApiError(
        "Mock payments are disabled",
        STATUS_CODES.SERVICE_UNAVAILABLE,
      );
    }
    const paymentId = `${order.providerOrderId}_payment`;
    const res = await creditOrderOnce({
      orderId: order.id,
      providerPaymentId: paymentId,
    });
    return { order: res.order, balancePaise: res.balancePaise };
  }

  // Real Razorpay confirmation
  const activeProvider = getPaymentProvider();
  if (!activeProvider.isConfigured()) {
    throw new ApiError(
      "Payment provider not configured",
      STATUS_CODES.SERVICE_UNAVAILABLE,
    );
  }

  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = params;
  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    throw new ApiError(
      "Missing payment verification parameters",
      STATUS_CODES.BAD_REQUEST,
    );
  }

  // Order ID must match what the backend issued
  if (order.providerOrderId && order.providerOrderId !== razorpayOrderId) {
    throw new ApiError("Order ID mismatch", STATUS_CODES.BAD_REQUEST);
  }

  // 1. Verify checkout HMAC signature
  const validSignature = activeProvider.verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!validSignature) {
    throw new ApiError("Invalid payment signature", STATUS_CODES.BAD_REQUEST);
  }

  // 2. Fetch payment directly from Razorpay API to confirm capture, amount and currency
  const payment = await activeProvider.fetchPayment(razorpayPaymentId);

  if (
    payment.providerOrderId &&
    payment.providerOrderId !== (order.providerOrderId || razorpayOrderId)
  ) {
    throw new ApiError(
      "Payment does not belong to this order",
      STATUS_CODES.BAD_REQUEST,
    );
  }

  if (payment.amountPaise !== order.amountPaise) {
    throw new ApiError(
      "Paid amount does not match order amount",
      STATUS_CODES.BAD_REQUEST,
    );
  }

  if (payment.currency !== "INR") {
    throw new ApiError(
      "Payment currency must be INR",
      STATUS_CODES.BAD_REQUEST,
    );
  }

  if (payment.status !== "captured") {
    throw new ApiError(
      `Payment is not captured (status: ${payment.status})`,
      STATUS_CODES.BAD_REQUEST,
    );
  }

  // 3. Atomically credit
  const result = await creditOrderOnce({
    orderId: order.id,
    providerPaymentId: razorpayPaymentId,
    providerOrderId: razorpayOrderId,
  });

  return { order: result.order, balancePaise: result.balancePaise };
}

/**
 * Marks an uncaptured order FAILED if still in CREATED state.
 * Atomically commits the order status update AND the webhook event marker.
 */
export async function markOrderFailed(
  paramsOrOrderId:
    | string
    | {
        orderId: string;
        webhookEvent?: {
          eventId: string;
          eventType: string;
          payload?: unknown;
        };
        externalTx?: Prisma.TransactionClient;
      },
) {
  const params =
    typeof paramsOrOrderId === "string"
      ? { orderId: paramsOrOrderId }
      : paramsOrOrderId;

  const run = async (tx: Prisma.TransactionClient) => {
    const res = await tx.paymentOrder.updateMany({
      where: { id: params.orderId, status: "CREATED" },
      data: { status: "FAILED" },
    });

    if (params.webhookEvent) {
      const pweId = "pwe_" + crypto.randomUUID().replace(/-/g, "");
      const payloadJson = JSON.stringify(params.webhookEvent.payload ?? {});
      await tx.$executeRaw`
        INSERT INTO payment_webhook_events (id, provider, event_id, event_type, payload, created_at)
        VALUES (
          ${pweId},
          'RAZORPAY'::"PaymentProvider",
          ${params.webhookEvent.eventId},
          ${params.webhookEvent.eventType},
          ${payloadJson}::jsonb,
          NOW()
        )
        ON CONFLICT (event_id) DO NOTHING
      `;
    }

    return res;
  };

  return params.externalTx ? run(params.externalTx) : prisma.$transaction(run);
}

/**
 * Sweeps orders that remain in CREATED past an age threshold.
 * Before marking EXPIRED, checks the provider to see if payment was actually captured,
 * recovering missed captured payments (e.g. if both client confirm & webhook failed/dropped).
 *
 * Bounds provider API requests, makes zero network calls while holding DB locks,
 * and delegates crediting to concurrency-safe creditOrderOnce.
 */
export async function sweepAbandonedOrders(olderThanMinutes = 60) {
  const threshold = new Date(Date.now() - olderThanMinutes * 60_000);
  const pendingOrders = await prisma.paymentOrder.findMany({
    where: {
      status: "CREATED",
      createdAt: { lt: threshold },
    },
    take: 50,
  });

  const activeProvider = getPaymentProvider();
  let sweptCount = 0;
  let recoveredCount = 0;

  for (const order of pendingOrders) {
    try {
      if (
        order.provider === "RAZORPAY" &&
        order.providerOrderId &&
        activeProvider.isConfigured()
      ) {
        // Query provider WITHOUT holding any DB locks or transactions
        let payments: FetchPaymentResult[] = [];
        try {
          payments = await activeProvider.fetchOrderPayments(
            order.providerOrderId,
          );
        } catch (apiErr) {
          console.warn(
            `[sweepAbandonedOrders] error querying payments for ${order.providerOrderId}:`,
            apiErr,
          );
          // Provider API error / rate limit: leave order in CREATED to retry on next cycle
          continue;
        }

        const capturedPayment = payments.find(
          (p) =>
            p.status === "captured" &&
            p.amountPaise === order.amountPaise &&
            p.currency === "INR",
        );

        if (capturedPayment) {
          // Missed captured payment recovered! Atomically credit wallet
          console.log(
            `[sweepAbandonedOrders] recovering captured payment ${capturedPayment.id} for order ${order.id}`,
          );
          const res = await creditOrderOnce({
            orderId: order.id,
            providerPaymentId: capturedPayment.id,
            providerOrderId: order.providerOrderId,
          });
          if (!res.alreadyCredited) {
            recoveredCount++;
          }
        } else {
          // No captured payment exists on provider; mark order EXPIRED
          await prisma.paymentOrder.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });
          sweptCount++;
        }
      } else {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        });
        sweptCount++;
      }
    } catch (err) {
      console.error(
        `[sweepAbandonedOrders] error processing order ${order.id}:`,
        err,
      );
    }
  }

  return { sweptCount, recoveredCount };
}

/**
 * Records a refund or dispute without debiting any wallet.
 * Gated as ACTION_REQUIRED for human admin review.
 * Atomically commits the refund record AND the webhook event marker.
 */
export async function recordRefundOrDispute(params: {
  kind: PaymentRefundKind;
  amountPaise: number;
  providerStatus: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerRefundId?: string;
  providerDisputeId?: string;
  webhookEvent?: {
    eventId: string;
    eventType: string;
    payload?: unknown;
  };
  externalTx?: Prisma.TransactionClient;
}) {
  const run = async (tx: Prisma.TransactionClient) => {
    // Find the associated payment order
    const order = await tx.paymentOrder.findFirst({
      where: {
        OR: [
          ...(params.providerPaymentId
            ? [{ providerPaymentId: params.providerPaymentId }]
            : []),
          ...(params.providerOrderId
            ? [{ providerOrderId: params.providerOrderId }]
            : []),
        ],
      },
    });

    if (!order) {
      console.warn(
        "[recordRefundOrDispute] No matching PaymentOrder found for:",
        params,
      );
      if (params.webhookEvent) {
        const pweId = "pwe_" + crypto.randomUUID().replace(/-/g, "");
        const payloadJson = JSON.stringify(params.webhookEvent.payload ?? {});
        await tx.$executeRaw`
          INSERT INTO payment_webhook_events (id, provider, event_id, event_type, payload, created_at)
          VALUES (
            ${pweId},
            'RAZORPAY'::"PaymentProvider",
            ${params.webhookEvent.eventId},
            ${params.webhookEvent.eventType},
            ${payloadJson}::jsonb,
            NOW()
          )
          ON CONFLICT (event_id) DO NOTHING
        `;
      }
      return null;
    }

    let refundRecord: PaymentRefund | null = null;

    if (params.kind === "REFUND" && params.providerRefundId) {
      refundRecord = await tx.paymentRefund.upsert({
        where: { providerRefundId: params.providerRefundId },
        update: {
          providerStatus: params.providerStatus,
        },
        create: {
          paymentOrderId: order.id,
          kind: "REFUND",
          providerRefundId: params.providerRefundId,
          amountPaise: params.amountPaise,
          providerStatus: params.providerStatus,
          handling: "ACTION_REQUIRED",
        },
      });
    } else if (params.kind === "DISPUTE" && params.providerDisputeId) {
      refundRecord = await tx.paymentRefund.upsert({
        where: { providerDisputeId: params.providerDisputeId },
        update: {
          providerStatus: params.providerStatus,
        },
        create: {
          paymentOrderId: order.id,
          kind: "DISPUTE",
          providerDisputeId: params.providerDisputeId,
          amountPaise: params.amountPaise,
          providerStatus: params.providerStatus,
          handling: "ACTION_REQUIRED",
        },
      });
    }

    if (params.webhookEvent) {
      const pweId = "pwe_" + crypto.randomUUID().replace(/-/g, "");
      const payloadJson = JSON.stringify(params.webhookEvent.payload ?? {});
      await tx.$executeRaw`
        INSERT INTO payment_webhook_events (id, provider, event_id, event_type, payload, created_at)
        VALUES (
          ${pweId},
          'RAZORPAY'::"PaymentProvider",
          ${params.webhookEvent.eventId},
          ${params.webhookEvent.eventType},
          ${payloadJson}::jsonb,
          NOW()
        )
        ON CONFLICT (event_id) DO NOTHING
      `;
    }

    return refundRecord;
  };

  return params.externalTx ? run(params.externalTx) : prisma.$transaction(run);
}

/**
 * Read-only refund/dispute query for Superadmins.
 */
export async function listPaymentRefunds(
  opts: {
    handling?: PaymentRefundHandling;
    skip?: number;
    take?: number;
  } = {},
) {
  const where: Prisma.PaymentRefundWhereInput = {};
  if (opts.handling) {
    where.handling = opts.handling;
  }

  const [total, items] = await Promise.all([
    prisma.paymentRefund.count({ where }),
    prisma.paymentRefund.findMany({
      where,
      include: {
        paymentOrder: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNo: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? 50, 100),
    }),
  ]);

  return { total, items };
}
