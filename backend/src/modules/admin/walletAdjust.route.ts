import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import {
  getOrCreateWallet,
  getWalletSummary,
  creditToBucket,
  debitWithAllocations,
} from "@/modules/payment/wallet.service.js";
import { writeAudit } from "./audit.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.walletAdjust] unexpected error:", err);
      next(new ApiError("Failed to process wallet request", STATUS_CODES.SERVER_ERROR));
    });

/**
 * Superadmin manual wallet adjustment router.
 * Allows audited credit or debit to a user's wallet with mandatory administrative notes.
 * Enforces non-negative balance guards, bucket allocations, and immutable ledger logging.
 */
export function createWalletAdminRouter(): Router {
  const router = Router();

  router.get(
    "/user/:userId",
    wrap(async (req, res) => {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNo: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
      }

      const summary = await getWalletSummary(userId);

      sendResponse(
        res,
        true,
        {
          user,
          ...summary,
        },
        "User wallet details retrieved",
      );
    }),
  );

  router.post(
    "/adjust",
    wrap(async (req, res) => {
      const { userId, amountPaise, bucket = "PURCHASED", reasonText, referenceId } = req.body ?? {};

      if (!userId || typeof userId !== "string") {
        throw new ApiError("User ID is required", STATUS_CODES.BAD_REQUEST);
      }

      const numAmount = Number(amountPaise);
      if (!Number.isInteger(numAmount) || numAmount === 0) {
        throw new ApiError("Adjustment amount must be a non-zero integer in paise", STATUS_CODES.BAD_REQUEST);
      }

      if (!reasonText || typeof reasonText !== "string" || reasonText.trim().length < 3) {
        throw new ApiError("A clear reason for the adjustment (at least 3 characters) is required for the audit log", STATUS_CODES.BAD_REQUEST);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new ApiError("Target user not found", STATUS_CODES.NOT_FOUND);
      }

      const chosenBucket = bucket === "PROMOTIONAL" ? "PROMOTIONAL" : "PURCHASED";
      const trimmedReason = reasonText.trim();
      const idempotencyKey = `admin_adj:${user.id}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;

      const result = await prisma.$transaction(async (tx) => {
        const wallet = await getOrCreateWallet(userId, tx);

        let mutationResult;
        if (numAmount > 0) {
          mutationResult = await creditToBucket(
            wallet.id,
            numAmount,
            chosenBucket,
            "ADJUSTMENT",
            { referenceId: referenceId || undefined, idempotencyKey },
            tx,
          );
        } else {
          mutationResult = await debitWithAllocations(
            wallet.id,
            Math.abs(numAmount),
            "ADJUSTMENT",
            { referenceId: referenceId || undefined, idempotencyKey },
            tx,
          );
        }

        const rupeeAmount = (Math.abs(numAmount) / 100).toFixed(2);
        const actionVerb = numAmount > 0 ? "credited" : "debited";

        await writeAudit(
          req,
          {
            action: "wallet.manual_adjustment",
            entityType: "Wallet",
            entityId: wallet.id,
            summary: `Manual adjustment: ${actionVerb} ₹${rupeeAmount} (${numAmount > 0 ? chosenBucket : "Rule C"}) for user ${user.email}. Note: ${trimmedReason}`,
            metadata: {
              userId,
              amountPaise: numAmount,
              bucket: chosenBucket,
              reason: trimmedReason,
              referenceId: referenceId || null,
            },
          },
          tx,
        );

        return mutationResult;
      });

      sendResponse(res, true, result, "Wallet balance adjusted successfully");
    }),
  );

  return router;
}

export default createWalletAdminRouter;

