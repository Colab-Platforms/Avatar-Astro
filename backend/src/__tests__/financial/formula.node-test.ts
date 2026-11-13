// Run with: npm run test:db:run -- src/__tests__/financial/formula.node-test.ts   (pure — needs no database)
//
// Checkpoint 1 — affordability and settlement must be the SAME cumulative formula. These properties pin that:
// for every funds amount, the number of seconds the system says a user can afford is exactly the number of
// seconds the settlement formula would charge them for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cumulativeChargeDue, affordablePaidSeconds } from "../../modules/chat/billingFormula.js";

const RATES = [100, 599, 600, 700, 1234, 5900, 10_000];

test("affordablePaidSeconds is the exact inverse of cumulativeChargeDue for every funds amount", () => {
  for (const rate of RATES) {
    for (let funds = 0; funds <= 6000; funds++) {
      const secs = affordablePaidSeconds(funds, rate);
      assert.ok(cumulativeChargeDue(secs, rate) <= funds, `rate ${rate} funds ${funds}: ${secs}s must be affordable`);
      assert.ok(cumulativeChargeDue(secs + 1, rate) > funds, `rate ${rate} funds ${funds}: ${secs + 1}s must NOT be affordable`);
    }
  }
});

test("the worked examples at 7 coins/minute: 1s=12, 13s=152, 30s=350, 43s=502, 60s=700 paise", () => {
  for (const [s, p] of [[1, 12], [13, 152], [30, 350], [43, 502], [60, 700]] as const) assert.equal(cumulativeChargeDue(s, 700), p);
});

test("700 paise buys exactly 60s; 800 paise buys 68s (794 paise) and leaves 6 paise", () => {
  assert.equal(affordablePaidSeconds(700, 700), 60);
  assert.equal(affordablePaidSeconds(800, 700), 68);
  assert.equal(cumulativeChargeDue(68, 700), 794);
});

test("degenerate inputs never produce negative or non-finite seconds", () => {
  assert.equal(affordablePaidSeconds(0, 700), 0);
  assert.equal(affordablePaidSeconds(-5, 700), 0);
  assert.equal(cumulativeChargeDue(-3, 700), 0);
  assert.equal(affordablePaidSeconds(1000, 0), Number.POSITIVE_INFINITY, "a zero rate never exhausts funds");
});
