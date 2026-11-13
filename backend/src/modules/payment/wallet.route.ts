import { Router, Request, Response, NextFunction } from "express";
import { auth, type AuthRequest } from "@/middleware/authMiddleware.js";
import { noStore } from "@/middleware/noStore.js";
import { createRateLimiter } from "@/utils/rateLimit.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { getWalletSummary } from "./wallet.service.js";
import { createRechargeOrder, confirmRechargeOrder } from "./payment.service.js";

const wrap =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[wallet] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

export function createWalletRouter(): Router {
  const router = Router();
  router.use(noStore, createRateLimiter({ windowMs: 60_000, max: 60 }), auth("USER"));

  router.get(
    "/",
    wrap(async (req, res) => sendResponse(res, true, await getWalletSummary(req.user!.id))),
  );

  router.post(
    "/recharge/order",
    wrap(async (req, res) => {
      const amountPaise = Number(req.body?.amountPaise);
      const { order, keyId } = await createRechargeOrder(req.user!.id, amountPaise);
      sendResponse(
        res,
        true,
        {
          orderId: order.id,
          providerOrderId: order.providerOrderId,
          amountPaise: order.amountPaise,
          status: order.status,
          provider: order.provider,
          keyId,
          currency: "INR",
        },
        "Recharge order created",
        STATUS_CODES.CREATED,
      );
    }),
  );

  router.post(
    "/recharge/confirm",
    wrap(async (req, res) => {
      const orderId = String(req.body?.orderId ?? "").trim();
      if (!orderId) throw new ApiError("orderId is required", STATUS_CODES.BAD_REQUEST);

      const razorpayPaymentId = req.body?.razorpayPaymentId ? String(req.body.razorpayPaymentId).trim() : undefined;
      const razorpayOrderId = req.body?.razorpayOrderId ? String(req.body.razorpayOrderId).trim() : undefined;
      const razorpaySignature = req.body?.razorpaySignature ? String(req.body.razorpaySignature).trim() : undefined;

      const result = await confirmRechargeOrder(req.user!.id, {
        orderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
      });

      sendResponse(
        res,
        true,
        {
          status: result.order.status,
          balancePaise: result.balancePaise,
          providerPaymentId: result.order.providerPaymentId,
        },
        "Recharge successful",
      );
    }),
  );

  return router;
}

export default createWalletRouter;
