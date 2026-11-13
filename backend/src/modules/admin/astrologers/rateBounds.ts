import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { getAllSettings, setSetting, cacheSetting } from "../settings.js";
import { writeAudit } from "../audit.js";

export const RATE_BOUNDS_SETTING_KEY = "astrologer_rate_bounds";

export interface AstrologerRateBounds {
  minRatePerMinuteRupees: number;
  maxRatePerMinuteRupees: number;
  defaultRatePerMinuteRupees: number;
}

export const DEFAULT_RATE_BOUNDS: AstrologerRateBounds = {
  minRatePerMinuteRupees: 1,
  maxRatePerMinuteRupees: 10_000,
  defaultRatePerMinuteRupees: 10,
};

export async function getRateBoundsSetting(): Promise<AstrologerRateBounds> {
  const all = await getAllSettings();
  const raw = all.get(RATE_BOUNDS_SETTING_KEY) as Partial<AstrologerRateBounds> | undefined;
  if (!raw || typeof raw !== "object") return DEFAULT_RATE_BOUNDS;
  return {
    minRatePerMinuteRupees:
      typeof raw.minRatePerMinuteRupees === "number" && raw.minRatePerMinuteRupees >= 1
        ? raw.minRatePerMinuteRupees
        : DEFAULT_RATE_BOUNDS.minRatePerMinuteRupees,
    maxRatePerMinuteRupees:
      typeof raw.maxRatePerMinuteRupees === "number" && raw.maxRatePerMinuteRupees >= 1
        ? raw.maxRatePerMinuteRupees
        : DEFAULT_RATE_BOUNDS.maxRatePerMinuteRupees,
    defaultRatePerMinuteRupees:
      typeof raw.defaultRatePerMinuteRupees === "number" && raw.defaultRatePerMinuteRupees >= 1
        ? raw.defaultRatePerMinuteRupees
        : DEFAULT_RATE_BOUNDS.defaultRatePerMinuteRupees,
  };
}

export async function setRateBoundsSetting(
  input: Partial<AstrologerRateBounds>,
  req: Request,
): Promise<AstrologerRateBounds> {
  const current = await getRateBoundsSetting();
  const min = input.minRatePerMinuteRupees !== undefined ? Number(input.minRatePerMinuteRupees) : current.minRatePerMinuteRupees;
  const max = input.maxRatePerMinuteRupees !== undefined ? Number(input.maxRatePerMinuteRupees) : current.maxRatePerMinuteRupees;
  const def = input.defaultRatePerMinuteRupees !== undefined ? Number(input.defaultRatePerMinuteRupees) : current.defaultRatePerMinuteRupees;

  if (!Number.isInteger(min) || min < 1) {
    throw new ApiError("Minimum rate must be a whole number of rupees >= 1", STATUS_CODES.BAD_REQUEST);
  }
  if (!Number.isInteger(max) || max < min || max > 50000) {
    throw new ApiError("Maximum rate must be a whole number of rupees between min rate and 50,000", STATUS_CODES.BAD_REQUEST);
  }
  if (!Number.isInteger(def) || def < min || def > max) {
    throw new ApiError("Default rate must be between minimum and maximum rate", STATUS_CODES.BAD_REQUEST);
  }

  const newBounds: AstrologerRateBounds = {
    minRatePerMinuteRupees: min,
    maxRatePerMinuteRupees: max,
    defaultRatePerMinuteRupees: def,
  };

  await prisma.$transaction(async (tx) => {
    await setSetting(RATE_BOUNDS_SETTING_KEY, newBounds, (req as any).user!.id, tx);
    await writeAudit(
      req,
      {
        action: "astrologer.settings.rate_bounds_updated",
        entityType: "PlatformSetting",
        entityId: RATE_BOUNDS_SETTING_KEY,
        summary: `Astrologer consultation rate bounds updated: ₹${min}/min to ₹${max}/min (default: ₹${def}/min)`,
        metadata: newBounds as unknown as Record<string, unknown>,
      },
      tx,
    );
  });

  cacheSetting(RATE_BOUNDS_SETTING_KEY, newBounds);
  return newBounds;
}

