import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";
import { getPaymentProvider } from "./payment.provider.js";
import {
  creditOrderOnce,
  markOrderFailed,
  recordRefundOrDispute,
} from "./payment.service.js";

/**
 * Handles incoming Razorpay webhooks with timing-safe HMAC signature verification
 * and database-backed event deduplication.
 */
export async function razorpayWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const provider = getPaymentProvider();
  const signature = req.headers["x-razorpay-signature"];

  if (typeof signature !== "string" || !signature) {
    res.status(400).json({ error: "Missing x-razorpay-signature header" });
    return;
  }

  // req.body is a raw Buffer because this route is mounted before express.json()
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(req.body || "", "utf8");

  const isValid = provider.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn("[webhook] Invalid Razorpay webhook signature received");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  let eventPayload: {
    id?: string;
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id?: string;
          amount: number;
          currency: string;
          notes?: Record<string, string>;
        };
      };
      refund?: {
        entity?: {
          id: string;
          payment_id?: string;
          amount: number;
          status?: string;
        };
      };
      dispute?: {
        entity?: {
          id: string;
          payment_id?: string;
          amount: number;
          status?: string;
        };
      };
    };
  };

  try {
    eventPayload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Malformed JSON payload" });
    return;
  }

  const eventId =
    eventPayload.id || (req.headers["x-razorpay-event-id"] as string);
  const eventType = eventPayload.event;

  if (!eventId || !eventType) {
    res.status(400).json({ error: "Missing event identifier or type" });
    return;
  }

  // Deduplicate event: If this event was ALREADY successfully processed, exit early.
  // Note: We deliberately do NOT insert PaymentWebhookEvent before the financial effects succeed,
  // so that if processing fails, the event remains safely retryable by Razorpay.
  try {
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });
    if (existingEvent) {
      res.status(200).json({ status: "ok", duplicate: true });
      return;
    }
  } catch (err) {
    console.error("[webhook] error checking existing webhook event:", err);
    res.status(500).json({ error: "Internal processing error" });
    return;
  }

  try {
    switch (eventType) {
      case "payment.captured": {
        const payment = eventPayload.payload?.payment?.entity;
        if (payment) {
          const providerOrderId = payment.order_id;
          const internalOrderId = payment.notes?.internalOrderId;

          let order = providerOrderId
            ? await prisma.paymentOrder.findFirst({
                where: { providerOrderId },
              })
            : null;

          if (!order && internalOrderId) {
            order = await prisma.paymentOrder.findUnique({
              where: { id: internalOrderId },
            });
          }

          if (order) {
            if (
              payment.amount === order.amountPaise &&
              payment.currency === "INR"
            ) {
              // creditOrderOnce atomically credits the wallet AND records PaymentWebhookEvent
              // within the same PostgreSQL transaction.
              await creditOrderOnce({
                orderId: order.id,
                providerPaymentId: payment.id,
                providerOrderId: payment.order_id,
                webhookEvent: {
                  eventId,
                  eventType,
                  payload: eventPayload,
                },
              });
            } else {
              console.warn(
                `[webhook] payment captured but amount/currency mismatch (order ${order.id}: expected ${order.amountPaise} INR, got ${payment.amount} ${payment.currency})`,
              );
              // Acknowledge invalid payment to prevent endless retry loops on bad payloads
              await prisma.paymentWebhookEvent
                .create({
                  data: {
                    eventId,
                    eventType,
                    payload: eventPayload as unknown as Prisma.InputJsonValue,
                  },
                })
                .catch(() => {});
            }
          } else {
            console.warn(
              "[webhook] payment.captured received for unknown order:",
              providerOrderId || internalOrderId,
            );
            // Acknowledge unknown order event so Razorpay stops retrying
            await prisma.paymentWebhookEvent
              .create({
                data: {
                  eventId,
                  eventType,
                  payload: eventPayload as unknown as Prisma.InputJsonValue,
                },
              })
              .catch(() => {});
          }
        }
        break;
      }

      case "payment.failed": {
        const payment = eventPayload.payload?.payment?.entity;
        if (payment?.order_id) {
          const order = await prisma.paymentOrder.findFirst({
            where: { providerOrderId: payment.order_id },
          });
          if (order && order.status === "CREATED") {
            await markOrderFailed({
              orderId: order.id,
              webhookEvent: { eventId, eventType, payload: eventPayload },
            });
            break;
          }
        }
        // If order not found or already in terminal state, record event
        await prisma.paymentWebhookEvent
          .create({
            data: {
              eventId,
              eventType,
              payload: eventPayload as unknown as Prisma.InputJsonValue,
            },
          })
          .catch(() => {});
        break;
      }

      case "refund.created":
      case "refund.processed": {
        const refund = eventPayload.payload?.refund?.entity;
        if (refund) {
          await recordRefundOrDispute({
            kind: "REFUND",
            amountPaise: Number(refund.amount),
            providerStatus: refund.status || "processed",
            providerPaymentId: refund.payment_id,
            providerRefundId: refund.id,
            webhookEvent: { eventId, eventType, payload: eventPayload },
          });
        }
        break;
      }

      case "payment.dispute.created": {
        const dispute = eventPayload.payload?.dispute?.entity;
        if (dispute) {
          await recordRefundOrDispute({
            kind: "DISPUTE",
            amountPaise: Number(dispute.amount),
            providerStatus: dispute.status || "created",
            providerPaymentId: dispute.payment_id,
            providerDisputeId: dispute.id,
            webhookEvent: { eventId, eventType, payload: eventPayload },
          });
        }
        break;
      }

      default:
        // Ignore unhandled event types with 200 OK and record
        await prisma.paymentWebhookEvent
          .create({
            data: {
              eventId,
              eventType,
              payload: eventPayload as unknown as Prisma.InputJsonValue,
            },
          })
          .catch(() => {});
        break;
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(`[webhook] error handling ${eventType}:`, err);
    res.status(500).json({ error: "Failed to process webhook event" });
  }
}
