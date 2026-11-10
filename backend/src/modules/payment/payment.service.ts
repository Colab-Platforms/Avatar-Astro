import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { paymentProvider } from "./payment.provider.js";
import { getOrCreateWallet, credit } from "./wallet.service.js";

const MIN_RECHARGE_PAISE = 2000; // ₹20
const MAX_RECHARGE_PAISE = 10_000_00; // ₹10,000

/**
 * The mock gateway must never be reachable in production — there is no override flag of any kind.
 * A deliberately-flagged staging/QA deploy that needs to exercise the recharge flow must run with a
 * non-"production" NODE_ENV, never by relaxing this check.
 */
function assertMockPaymentsAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError("Coin top-ups are not available yet. Please check back soon.", STATUS_CODES.SERVICE_UNAVAILABLE);
  }
}

export async function createRechargeOrder(userId: string, amountPaise: number) {
  assertMockPaymentsAllowed();
  if (!Number.isInteger(amountPaise) || amountPaise < MIN_RECHARGE_PAISE || amountPaise > MAX_RECHARGE_PAISE) {
    throw new ApiError(`Recharge amount must be between ₹${MIN_RECHARGE_PAISE / 100} and ₹${MAX_RECHARGE_PAISE / 100}`, STATUS_CODES.BAD_REQUEST);
  }
  const { providerOrderId } = await paymentProvider.createOrder(amountPaise);
  const order = await prisma.paymentOrder.create({
    data: { userId, amountPaise, provider: "MOCK", status: "CREATED", providerOrderId },
  });
  return order;
}

/**
 * Stands in for a real gateway's webhook/callback. Idempotent: confirming an order that's
 * already SUCCESS just returns the current wallet balance instead of crediting twice —
 * the same guarantee a signature-verified webhook retry would need.
 */
export async function confirmRechargeOrder(userId: string, orderId: string) {
  assertMockPaymentsAllowed();
  const order = await prisma.paymentOrder.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new ApiError("Recharge order not found", STATUS_CODES.NOT_FOUND);

  if (order.status === "SUCCESS") {
    const wallet = await getOrCreateWallet(userId);
    return { order, balancePaise: wallet.balancePaise };
  }
  if (order.status === "FAILED") {
    throw new ApiError("This recharge order has already failed", STATUS_CODES.CONFLICT);
  }

  const wallet = await getOrCreateWallet(userId);
  const updatedOrder = await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: "SUCCESS", completedAt: new Date(), providerPaymentId: `${order.providerOrderId}_payment` },
  });
  const updatedWallet = await credit(wallet.id, order.amountPaise, "RECHARGE", order.id);
  return { order: updatedOrder, balancePaise: updatedWallet.balancePaise };
}
