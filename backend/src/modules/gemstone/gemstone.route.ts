import { Router, type Request, type Response, type NextFunction } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import ShopService from "../shop/shop.service.js";
import { BirthTimeError } from "./birth.time.js";
import { LocationProviderError, searchLocations } from "./locations.js";
import { getGemstone } from "./gemstone.catalogue.js";
import { calculateRatna, parseInput, ValidationError } from "./gemstone.service.js";
import { matchShop } from "./shop.match.js";
import { buildKundali, parseKundaliInput } from "./kundali.js";

// Mounted at /api/gemstone-calculator. Stateless: nothing is stored.
const router = Router();
const shopService = new ShopService();

/** Small in-memory per-IP limiter (this project has no shared limiter). */
const limiter = (max: number, windowMs = 60_000) => {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      sendResponse(res, false, null, "Too many requests. Please wait a moment.", STATUS_CODES.TOO_MANY_REQUESTS);
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    next();
  };
};

router.get("/locations", limiter(60), async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (q.trim().length < 2) {
    sendResponse(res, true, [], "Type at least 2 characters");
    return;
  }
  try {
    sendResponse(res, true, await searchLocations(q), "Locations loaded");
  } catch (e) {
    if (e instanceof LocationProviderError) {
      // Specific, secret-free diagnostics; the client gets an actionable message.
      console.error(
        `[ratna] location search failed: kind=${e.kind} providerStatus=${e.providerStatus ?? "-"} ${e.message}`,
      );
      const retryable = e.kind === "timeout" || e.kind === "network" || e.kind === "rate_limited";
      sendResponse(
        res,
        false,
        { code: e.kind },
        retryable
          ? "Location search is busy or unreachable right now. Please try again in a moment."
          : "Location search is not available on this server. Please contact support.",
        e.kind === "rate_limited" ? STATUS_CODES.TOO_MANY_REQUESTS : 503,
      );
      return;
    }
    console.error("[ratna] location search failed unexpectedly:", (e as Error)?.message);
    sendResponse(res, false, null, "Location search failed. Please try again.", STATUS_CODES.SERVER_ERROR);
  }
});

router.post("/calculate", limiter(20), async (req, res) => {
  try {
    const result = await calculateRatna(parseInput(req.body));
    sendResponse(res, true, result, "Calculated");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof BirthTimeError) {
      sendResponse(res, false, null, e.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    if (e instanceof Error && /coordinates|latitude/i.test(e.message)) {
      sendResponse(res, false, null, e.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Ratna Jyotish calculation failed:", e);
    sendResponse(
      res,
      false,
      null,
      "We could not complete the calculation. Please try again.",
      STATUS_CODES.SERVER_ERROR,
    );
  }
});

/** Vedic (sidereal, Lahiri) Janma Kundali profile: Surya/Chandra Rashi, Nakshatra, Lagna and Panchang. */
router.post("/kundali", limiter(20), (req, res) => {
  try {
    sendResponse(res, true, buildKundali(parseKundaliInput(req.body)), "Calculated");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof BirthTimeError) {
      sendResponse(res, false, null, e.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    if (e instanceof Error && /coordinates|latitude/i.test(e.message)) {
      sendResponse(res, false, null, e.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Kundali calculation failed:", e);
    sendResponse(res, false, null, "We could not complete the calculation. Please try again.", STATUS_CODES.SERVER_ERROR);
  }
});

router.get("/products/:stone", limiter(60), async (req, res) => {
  const stone = getGemstone(req.params.stone);
  if (!stone) {
    sendResponse(res, false, null, "Unknown Ratna", STATUS_CODES.NOT_FOUND);
    return;
  }
  try {
    const products = await shopService.listPublicProducts({});
    sendResponse(res, true, matchShop(stone, products), "Matches loaded");
  } catch {
    sendResponse(
      res,
      false,
      null,
      "The shop catalogue is temporarily unavailable.",
      STATUS_CODES.SERVER_ERROR,
    );
  }
});

export default router;
