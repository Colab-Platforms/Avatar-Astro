import { Router, Request, Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { writeAudit } from "./audit.js";
import { TOOL_KEYS } from "@/modules/payment/toolKeys.js";
import { OPERATIONS } from "./aiFeatureCost.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.toolPricing] unexpected error:", err);
      next(new ApiError("Something went wrong. Please try again.", STATUS_CODES.SERVER_ERROR));
    });

const LABEL_BY_KEY = new Map(OPERATIONS.map((op) => [op.id, { label: op.label, operation: op.operation }]));

/**
 * Mounted inside admin.route.ts, already SUPERADMIN-only (auth("ADMIN") + requireMainAdmin) —
 * same inherited-auth convention as astrologerAdmin.route.ts, see its comment for why no auth
 * is duplicated here.
 *
 * Every premium AI tool's coinPriceSubunits/isActive lives in ToolPrice, keyed by toolKey.
 * ToolPrice.isActive defaults false (schema-level) — a tool is never billable until a superadmin
 * explicitly turns it on here, per the finalized "no price is live until you sign off" decision.
 */
export function createToolPricingRouter(): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (_req, res) => {
      const prices = await prisma.toolPrice.findMany();
      const byKey = new Map(prices.map((p) => [p.toolKey, p]));
      const rows = Object.values(TOOL_KEYS).map((toolKey) => {
        const existing = byKey.get(toolKey);
        const meta = LABEL_BY_KEY.get(toolKey);
        return {
          toolKey,
          label: meta?.label ?? toolKey,
          operation: meta?.operation ?? toolKey,
          coinPriceSubunits: existing?.coinPriceSubunits ?? null,
          isActive: existing?.isActive ?? false,
          version: existing?.version ?? 0,
          updatedAt: existing?.updatedAt ?? null,
        };
      });
      sendResponse(res, true, rows);
    }),
  );

  router.put(
    "/:toolKey",
    wrap(async (req, res) => {
      const { toolKey } = req.params;
      if (!Object.values(TOOL_KEYS).includes(toolKey as any)) {
        throw new ApiError("Unknown toolKey.", STATUS_CODES.BAD_REQUEST);
      }
      const coinPriceSubunits = Number(req.body?.coinPriceSubunits);
      const isActive = Boolean(req.body?.isActive);
      if (!Number.isInteger(coinPriceSubunits) || coinPriceSubunits <= 0) {
        throw new ApiError("coinPriceSubunits must be a positive whole number of subunits (1 coin = 100 subunits).", STATUS_CODES.BAD_REQUEST);
      }

      const existing = await prisma.toolPrice.findUnique({ where: { toolKey } });
      const updated = await prisma.toolPrice.upsert({
        where: { toolKey },
        create: { toolKey, coinPriceSubunits, isActive, updatedBy: (req as any).user?.id ?? null, version: 1 },
        update: {
          coinPriceSubunits,
          isActive,
          updatedBy: (req as any).user?.id ?? null,
          version: existing && existing.coinPriceSubunits !== coinPriceSubunits ? existing.version + 1 : existing?.version ?? 1,
        },
      });

      await writeAudit(req, {
        action: "tool_pricing.price_changed",
        entityType: "ToolPrice",
        entityId: toolKey,
        summary: `${toolKey}: ${coinPriceSubunits} subunits, ${isActive ? "ACTIVE" : "inactive"} (v${updated.version})`,
      });
      sendResponse(res, true, updated, "Saved");
    }),
  );

  return router;
}

export default createToolPricingRouter;
