// The single billing formula. Pure, dependency-free, and shared by settlement, affordability, the
// low-balance warning and reconciliation — there is exactly ONE definition of "what N seconds cost", so
// "what can this user afford" and "what do we charge" can never disagree.
//
// Units: money in paise (100 paise = 1 coin = ₹1); time in whole seconds.

/**
 * Rule E: the charge is the CEILING of the CUMULATIVE billable seconds at the session rate — never the sum of
 * per-interval roundings. A past interval is therefore never re-rounded, and the debit at any moment is
 * `cumulativeChargeDue(now) - alreadyCharged`.
 * Finalized worked examples at 7 coins/minute (700 paise/min): 1s→12, 13s→152, 30s→350, 43s→502, 60s→700.
 */
export function cumulativeChargeDue(billableSecondsCumulative: number, ratePerMinutePaise: number): number {
  if (billableSecondsCumulative <= 0) return 0;
  return Math.ceil((billableSecondsCumulative * ratePerMinutePaise) / 60);
}

/**
 * The largest whole number of PAID seconds whose cumulative charge fits within `fundsPaise`:
 *   max s such that cumulativeChargeDue(s, rate) <= funds   (i.e. s = floor(funds * 60 / rate)).
 * This is the exact inverse of cumulativeChargeDue (proved by a property test over many rates and funds), and
 * is the only way affordability or the exhaustion cutoff is computed. A non-positive rate never exhausts.
 */
export function affordablePaidSeconds(fundsPaise: number, ratePerMinutePaise: number): number {
  if (ratePerMinutePaise <= 0) return Number.POSITIVE_INFINITY;
  if (fundsPaise <= 0) return 0;
  return Math.floor((fundsPaise * 60) / ratePerMinutePaise);
}
