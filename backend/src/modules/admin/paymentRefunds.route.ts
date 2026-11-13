import { Router, Request, Response, NextFunction } from "express";
import type { PaymentRefundHandling } from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { listPaymentRefunds } from "@/modules/payment/payment.service.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.refunds] unexpected error:", err);
      next(new ApiError("Failed to fetch refunds", STATUS_CODES.SERVER_ERROR));
    });

/**
 * Superadmin read-only review router for payment refunds and chargebacks/disputes.
 * Per specification, money-moving financial resolution is deferred until the refund policy
 * is finalized; this endpoint provides full visibility into all recorded provider events.
 */
export function createPaymentRefundsAdminRouter(): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (req, res) => {
      const handling = req.query.handling as PaymentRefundHandling | undefined;
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;

      const { total, items } = await listPaymentRefunds({
        handling,
        skip,
        take: limit,
      });

      sendResponse(
        res,
        true,
        {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          items,
        },
        "Payment refunds retrieved",
      );
    }),
  );

  router.get(
    "/:id",
    wrap(async (req, res) => {
      const { id } = req.params;
      const refund = await prisma.paymentRefund.findUnique({
        where: { id },
        include: {
          paymentOrder: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, phoneNo: true },
              },
            },
          },
        },
      });

      if (!refund) {
        throw new ApiError("Payment refund record not found", STATUS_CODES.NOT_FOUND);
      }

      sendResponse(res, true, refund, "Payment refund details retrieved");
    }),
  );

  return router;
}

export default createPaymentRefundsAdminRouter;
