import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { writeAudit } from "./audit.js";
import { releaseReservation } from "@/modules/payment/wallet.service.js";
import { releaseToolExecution } from "@/modules/payment/toolBilling.service.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.billingFailures] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

/** A hold is "stuck" once it's sat this long without resolving to SETTLED/RELEASED — normal
 * operations always settle or release within seconds, so a hold still open past this is either
 * a crashed request or a genuinely hung provider call, not something still legitimately in flight. */
const STUCK_AFTER_MS = 5 * 60 * 1000;

/**
 * Mounted inside admin.route.ts, already SUPERADMIN-only. Surfaces coin holds that never
 * resolved — ToolExecution rows stuck before SETTLED/RELEASED/FAILED/CANCELLED, and
 * WalletReservation rows (any purpose) stuck HELD — plus a manual one-click release for each,
 * since nothing here can know whether the underlying work actually finished; it only frees the
 * hold so the coins are usable again, matching "never auto-retried, never auto-refunded,
 * surfaced for manual resolution" from the original design.
 */
export function createBillingFailuresRouter(): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

      const stuckExecutions = await prisma.toolExecution.findMany({
        where: { status: { in: ["COINS_RESERVED", "EXECUTING", "RECONCILIATION_REQUIRED"] as const }, createdAt: { lt: cutoff } },
        orderBy: { createdAt: "asc" },
        take: 200,
      });
      // ToolExecution.userId is a plain string, not a Prisma relation — resolve emails separately.
      const executionUsers = await prisma.user.findMany({
        where: { id: { in: [...new Set(stuckExecutions.map((e) => e.userId))] } },
        select: { id: true, email: true },
      });
      const emailByUserId = new Map(executionUsers.map((u) => [u.id, u.email]));

      const stuckReservations = await prisma.walletReservation.findMany({
        where: { status: { in: ["HELD", "RECONCILIATION_REQUIRED"] as const }, createdAt: { lt: cutoff } },
        orderBy: { createdAt: "asc" },
        include: { wallet: { select: { userId: true } } },
        take: 200,
      });

      sendResponse(res, true, {
        stuckAfterMinutes: STUCK_AFTER_MS / 60_000,
        toolExecutions: stuckExecutions.map((e) => ({
          id: e.id,
          toolKey: e.toolKey,
          executionId: e.executionId,
          userEmail: emailByUserId.get(e.userId) ?? e.userId,
          status: e.status,
          quotedPriceSubunits: e.quotedPriceSubunits,
          createdAt: e.createdAt,
        })),
        reservations: stuckReservations.map((r) => ({
          id: r.id,
          purpose: r.purpose,
          referenceId: r.referenceId,
          userId: r.wallet.userId,
          status: r.status,
          amountPaise: r.amountPaise,
          createdAt: r.createdAt,
        })),
      });
    }),
  );

  router.post(
    "/tool-executions/:id/release",
    wrap(async (req, res) => {
      const execution = await prisma.toolExecution.findUnique({ where: { id: req.params.id } });
      if (!execution) throw new ApiError("Tool execution not found.", STATUS_CODES.NOT_FOUND);
      await releaseToolExecution(execution.executionId, "RELEASED");
      await writeAudit(req, {
        action: "billing_failure.tool_execution_released",
        entityType: "ToolExecution",
        entityId: execution.id,
        summary: `Manually released stuck ${execution.toolKey} execution for ${execution.userId}`,
      });
      sendResponse(res, true, { released: true }, "Released");
    }),
  );

  router.post(
    "/reservations/:id/release",
    wrap(async (req, res) => {
      const reservation = await prisma.walletReservation.findUnique({ where: { id: req.params.id } });
      if (!reservation) throw new ApiError("Reservation not found.", STATUS_CODES.NOT_FOUND);
      await releaseReservation(reservation.id);
      await writeAudit(req, {
        action: "billing_failure.reservation_released",
        entityType: "WalletReservation",
        entityId: reservation.id,
        summary: `Manually released stuck ${reservation.purpose} reservation (${reservation.amountPaise} paise)`,
      });
      sendResponse(res, true, { released: true }, "Released");
    }),
  );

  return router;
}

export default createBillingFailuresRouter;
