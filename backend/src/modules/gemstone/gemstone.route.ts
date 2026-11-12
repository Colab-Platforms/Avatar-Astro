import { buildMatch } from "./match.js";
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
import { buildBabyName, parseBabyNameInput } from "./babyName.js";
import { buildVehicleProfile, parseVehicleProfileInput } from "./vehicleNumber.js";
import { MuhuratInputError, parseMuhuratRequest, searchMuhurat } from "../muhurat/search.js";
import { auth } from "../../middleware/authMiddleware.js";
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from "../payment/toolBilling.service.js";
import { TOOL_KEYS } from "../payment/toolKeys.js";
import { ApiError } from "../../utils/ApiError.js";

// Mounted at /api/gemstone-calculator. Stateless: nothing is stored. Generating a result (/calculate, /kundali)
// needs a signed-in user; the birthplace search and shop matches stay public.
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

router.post("/calculate", auth("USER"), limiter(20), async (req, res) => {
  const userId = req.user!.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;
  try {
    billed = await reserveToolExecution(userId, TOOL_KEYS.GEMSTONE_EXPLAIN, executionId);
    if (billed.alreadySettled) {
      sendResponse(res, true, billed.execution!.resultPayload, "Calculated");
      return;
    }

    const result = await calculateRatna(parseInput(req.body));

    // Only charge when the explanation actually used AI — the rule-based fallback (no API key,
    // provider failure, or AI output rejected by validateExplanation) must never be billed.
    if (billed && !billed.skip) {
      if (result.explanation.source === "ai") await settleToolExecution(executionId, result);
      else await releaseToolExecution(executionId, "RELEASED");
    }
    sendResponse(res, true, result, "Calculated");
  } catch (e) {
    if (billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (e instanceof ApiError) {
      sendResponse(res, false, null, e.message, e.statusCode);
      return;
    }
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
router.post("/kundali", auth("USER"), limiter(20), (req, res) => {
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

/** Baby Name Jyotish: the birth Nakshatra, pada and Panchang (same engine as /kundali) for the traditional naming syllable. */
router.post("/baby-name", auth("USER"), limiter(20), (req, res) => {
  try {
    sendResponse(res, true, buildBabyName(parseBabyNameInput(req.body)), "Calculated");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof BirthTimeError || (e instanceof Error && /coordinates|latitude/i.test(e.message))) {
      sendResponse(res, false, null, (e as Error).message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Baby name calculation failed:", e);
    sendResponse(res, false, null, "We could not complete the calculation. Please try again.", STATUS_CODES.SERVER_ERROR);
  }
});

/** Lucky Vehicle Number: the birth Panchang for the birth profile (same engine as /kundali). The number evaluation is front-end arithmetic. */
router.post("/vehicle-number", auth("USER"), limiter(20), (req, res) => {
  try {
    sendResponse(res, true, buildVehicleProfile(parseVehicleProfileInput(req.body)), "Calculated");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof BirthTimeError || (e instanceof Error && /coordinates|latitude/i.test(e.message))) {
      sendResponse(res, false, null, (e as Error).message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Vehicle number profile failed:", e);
    sendResponse(res, false, null, "We could not complete the calculation. Please try again.", STATUS_CODES.SERVER_ERROR);
  }
});

/** Muhurat Finder: suitable dates and exact local time windows for an event at a place. Stateless. */
router.post("/muhurat/search", auth("USER"), limiter(10), (req, res) => {
  try {
    sendResponse(res, true, searchMuhurat(parseMuhuratRequest(req.body)), "Calculated");
  } catch (e) {
    if (e instanceof MuhuratInputError || e instanceof BirthTimeError) {
      sendResponse(res, false, null, (e as Error).message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Muhurat search failed:", e);
    sendResponse(res, false, null, "We could not complete the calculation. Please try again.", STATUS_CODES.SERVER_ERROR);
  }
});

/** Jodi Jyotish: Ashtakoota (Guna Milan) + Mangal Dosha for two people. Needs both birth times; never estimates a score. */
router.post("/match", auth("USER"), limiter(20), (req, res) => {
  try {
    const { a, b } = (req.body ?? {}) as { a?: unknown; b?: unknown };
    sendResponse(res, true, buildMatch(a, b), "Calculated");
  } catch (e) {
    if (e instanceof ValidationError || e instanceof BirthTimeError || (e instanceof Error && /coordinates|latitude/i.test(e.message))) {
      sendResponse(res, false, null, (e as Error).message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    console.error("Match calculation failed:", e);
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
