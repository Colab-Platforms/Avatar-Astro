import { randomUUID } from "node:crypto";
import type { ToolExecution } from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { createReservation, settleFromReservation, releaseReservation, getOrCreateWallet } from "./wallet.service.js";

/**
 * Reads the client-supplied idempotency key for "one user-confirmed action = one durable
 * execution ID" — every internal retry (client-side or server-side) of the SAME action must
 * reuse this value. Falls back to a fresh random id when absent (an older client that hasn't
 * been updated to send one yet) so every route keeps working either way; a fallback id simply
 * means that particular call can't be retry-collapsed, not that it's unsafe.
 */
export function getExecutionId(req: { headers: Record<string, unknown> }): string {
  const header = req.headers["idempotency-key"];
  if (typeof header === "string" && header.trim()) return header.trim().slice(0, 200);
  return randomUUID();
}

export async function getActiveToolPrice(toolKey: string) {
  const price = await prisma.toolPrice.findUnique({ where: { toolKey } });
  return price && price.isActive ? price : null;
}

export interface ReserveOutcome {
  /** True when this tool currently has no active price — caller proceeds without billing at all. */
  skip: boolean;
  execution?: ToolExecution;
  /** True when `execution` is a RETRIEVED already-settled result — caller must return its
   * resultPayload directly and must NOT call the AI provider again. */
  alreadySettled: boolean;
}

/**
 * Reserves the full quoted price up front — all-or-nothing, never a partial hold (a tool
 * execution can't be "partially run"). Idempotent on `executionId`: a retry of the same
 * in-flight or already-settled action is handled without ever charging twice or calling the
 * provider twice for a result already paid for.
 */
export async function reserveToolExecution(userId: string, toolKey: string, executionId: string): Promise<ReserveOutcome> {
  const price = await getActiveToolPrice(toolKey);
  if (!price) return { skip: true, alreadySettled: false };

  const existing = await prisma.toolExecution.findUnique({ where: { executionId } });
  if (existing) {
    if (existing.status === "SETTLED") return { skip: false, execution: existing, alreadySettled: true };
    if (existing.status === "COINS_RESERVED" || existing.status === "EXECUTING") {
      throw new ApiError("This action is already in progress.", STATUS_CODES.CONFLICT);
    }
    // FAILED / RELEASED / CANCELLED / RECONCILIATION_REQUIRED — this executionId's prior attempt
    // never charged anything; allow a fresh attempt with a new reservation.
    const wallet = await getOrCreateWallet(userId);
    const { reservation, reservedAmountPaise } = await createReservation(wallet.id, price.coinPriceSubunits, "TOOL_EXECUTION", executionId);
    if (!reservation || reservedAmountPaise < price.coinPriceSubunits) {
      if (reservation) await releaseReservation(reservation.id);
      throw new ApiError("Insufficient coin balance for this action.", STATUS_CODES.FORBIDDEN);
    }
    const updated = await prisma.toolExecution.update({
      where: { id: existing.id },
      data: { status: "COINS_RESERVED", reservationId: reservation.id, quotedPriceSubunits: price.coinPriceSubunits },
    });
    return { skip: false, execution: updated, alreadySettled: false };
  }

  const wallet = await getOrCreateWallet(userId);
  const { reservation, reservedAmountPaise } = await createReservation(wallet.id, price.coinPriceSubunits, "TOOL_EXECUTION", executionId);
  if (!reservation || reservedAmountPaise < price.coinPriceSubunits) {
    if (reservation) await releaseReservation(reservation.id);
    throw new ApiError("Insufficient coin balance for this action.", STATUS_CODES.FORBIDDEN);
  }
  const created = await prisma.toolExecution.create({
    data: { userId, toolKey, executionId, quotedPriceSubunits: price.coinPriceSubunits, reservationId: reservation.id, status: "COINS_RESERVED" },
  });
  return { skip: false, execution: created, alreadySettled: false };
}

/** Charges the full quoted price and stores the result so a lost-response retry can retrieve it
 * without ever calling the provider or charging again. Idempotent and a no-op if already settled. */
export async function settleToolExecution(executionId: string, resultPayload: unknown): Promise<void> {
  const execution = await prisma.toolExecution.findUnique({ where: { executionId } });
  if (!execution?.reservationId || execution.status === "SETTLED") return;

  await settleFromReservation(execution.reservationId, execution.quotedPriceSubunits, "TOOL_EXECUTION", {
    referenceId: executionId,
    idempotencyKey: `tool-exec:${executionId}`,
  });
  await prisma.toolExecution.update({ where: { id: execution.id }, data: { status: "SETTLED", resultPayload: resultPayload as any } });
}

/** Releases the reservation without charging — used both for genuine provider failures and for
 * the "usedAi: false" fallback case (mock/rule-based output must never be charged for). */
export async function releaseToolExecution(executionId: string, reason: "FAILED" | "RELEASED" | "CANCELLED" = "RELEASED"): Promise<void> {
  const execution = await prisma.toolExecution.findUnique({ where: { executionId } });
  if (!execution?.reservationId) return;
  if (execution.status === "SETTLED" || execution.status === "RELEASED" || execution.status === "FAILED" || execution.status === "CANCELLED") return;

  await releaseReservation(execution.reservationId);
  await prisma.toolExecution.update({ where: { id: execution.id }, data: { status: reason } });
}
