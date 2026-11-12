// Pure-function test — no database needed. Verifies Rule E's corrected cumulative-ceil formula
// (Checkpoint 4) directly against the finalized worked examples, independent of any real timer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cumulativeChargeDue } from "../billing.js";

const RATE_7_PER_MIN = 700; // ₹7/minute = 700 paise/minute

test("cumulativeChargeDue matches every finalized worked example at 7 coins/minute", () => {
  const fixtures: [seconds: number, expectedSubunits: number][] = [
    [1, 12],
    [13, 152],
    [30, 350],
    [43, 502],
    [60, 700],
  ];
  for (const [seconds, expected] of fixtures) {
    assert.equal(cumulativeChargeDue(seconds, RATE_7_PER_MIN), expected, `${seconds}s at 7/min must be exactly ${expected} subunits`);
  }
});

test("cumulativeChargeDue is non-decreasing as cumulative seconds grow (never re-rounds downward)", () => {
  let prev = 0;
  for (let s = 0; s <= 120; s++) {
    const due = cumulativeChargeDue(s, RATE_7_PER_MIN);
    assert.ok(due >= prev, `charge at ${s}s (${due}) must never be less than at ${s - 1}s (${prev})`);
    prev = due;
  }
});

test("cumulativeChargeDue is 0 for 0 or negative billable seconds (fully covered by free time)", () => {
  assert.equal(cumulativeChargeDue(0, RATE_7_PER_MIN), 0);
  assert.equal(cumulativeChargeDue(-5, RATE_7_PER_MIN), 0);
});

test("incremental charge (newCharge = chargeDue - previouslySettled) never double-charges a past interval", () => {
  let settled = 0;
  const totalPaidByTick: number[] = [];
  // Simulates ticking through 1,13,30,43,60 cumulative seconds exactly as billing.ts does.
  for (const cumulativeSeconds of [1, 13, 30, 43, 60]) {
    const due = cumulativeChargeDue(cumulativeSeconds, RATE_7_PER_MIN);
    const newCharge = due - settled;
    assert.ok(newCharge >= 0, "incremental charge must never be negative");
    settled += newCharge;
    totalPaidByTick.push(settled);
  }
  assert.deepEqual(totalPaidByTick, [12, 152, 350, 502, 700]);
});
