// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:tool-billing
//
// Coin-wallet Checkpoint 5: the generic reserve/settle/release service used by every premium AI
// route. Local disposable database only (refuses anything that is not localhost).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "5";

const DOM = "@tool-billing-test.example";
const TOOL_KEY = "test.tool.billing";

let prisma: any;
let wallet: any;
let billing: any;
const ids: Record<string, string> = {};

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  billing = await import("../../modules/payment/toolBilling.service.js");

  await prisma.toolExecution.deleteMany({ where: { toolKey: TOOL_KEY } });
  await prisma.toolPrice.deleteMany({ where: { toolKey: TOOL_KEY } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });

  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["rhea", "sam", "tara", "uri"]) {
    const u = await prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
    ids[key] = u.id;
  }

  await prisma.toolPrice.create({ data: { toolKey: TOOL_KEY, coinPriceSubunits: 150, isActive: true, updatedBy: "test" } });
});

after(async () => {
  if (skip) return;
  await prisma.toolExecution.deleteMany({ where: { toolKey: TOOL_KEY } });
  await prisma.toolPrice.deleteMany({ where: { toolKey: TOOL_KEY } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.$disconnect();
});

test("reserveToolExecution: skip:true when the tool has no active price", { skip }, async () => {
  const result = await billing.reserveToolExecution(ids.rhea, "test.tool.no-price-at-all", "exec-no-price-1");
  assert.equal(result.skip, true);
});

test("reserveToolExecution: all-or-nothing — insufficient balance rejects rather than partially reserving", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.rhea);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 100, purchasedBalancePaise: 100, reservedBalancePaise: 0 } });

  await assert.rejects(
    () => billing.reserveToolExecution(ids.rhea, TOOL_KEY, "exec-insufficient-1"),
    (err: any) => err.statusCode === 403,
  );

  const afterWallet = await wallet.getOrCreateWallet(ids.rhea);
  assert.equal(afterWallet.reservedBalancePaise, 0, "a rejected reservation must leave nothing held — never a partial/dangling hold");
  const execution = await prisma.toolExecution.findUnique({ where: { executionId: "exec-insufficient-1" } });
  assert.equal(execution, null, "no ToolExecution row should exist for a reservation that was never actually granted");
});

test("reserve -> settle: charges exactly the quoted price once, stores the result, and is idempotent on retry", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.sam);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });

  const executionId = "exec-settle-1";
  const reserved = await billing.reserveToolExecution(ids.sam, TOOL_KEY, executionId);
  assert.equal(reserved.skip, false);
  assert.equal(reserved.alreadySettled, false);
  assert.equal(reserved.execution.status, "COINS_RESERVED");

  const afterReserve = await wallet.getOrCreateWallet(ids.sam);
  assert.equal(afterReserve.reservedBalancePaise, 150, "the full quoted price must be held immediately on reserve");
  assert.equal(afterReserve.balancePaise, 1000, "reserving must not debit anything yet — only settling does");

  const resultPayload = { reading: "a real AI result" };
  await billing.settleToolExecution(executionId, resultPayload);

  const afterSettle = await wallet.getOrCreateWallet(ids.sam);
  assert.equal(afterSettle.balancePaise, 850, "settling must charge exactly the quoted price");
  assert.equal(afterSettle.reservedBalancePaise, 0, "settling must release the hold, not leave it dangling");

  // Idempotent: settling the same executionId again must not charge twice.
  await billing.settleToolExecution(executionId, resultPayload);
  const afterResettle = await wallet.getOrCreateWallet(ids.sam);
  assert.equal(afterResettle.balancePaise, 850, "re-settling an already-settled execution must be a safe no-op");

  // Retry-returns-stored-result: a second reserve call with the SAME executionId must report
  // alreadySettled and hand back the stored result, never re-run or re-charge.
  const retried = await billing.reserveToolExecution(ids.sam, TOOL_KEY, executionId);
  assert.equal(retried.alreadySettled, true);
  assert.deepEqual(retried.execution.resultPayload, resultPayload);
});

test("reserve -> release: a failed/fallback outcome never charges, and frees the hold for other operations immediately", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.tara);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });

  const executionId = "exec-release-1";
  await billing.reserveToolExecution(ids.tara, TOOL_KEY, executionId);
  const afterReserve = await wallet.getOrCreateWallet(ids.tara);
  assert.equal(afterReserve.reservedBalancePaise, 150);

  await billing.releaseToolExecution(executionId, "RELEASED"); // e.g. a non-AI fallback (mockNarrative, rule-based gemstone text)

  const afterRelease = await wallet.getOrCreateWallet(ids.tara);
  assert.equal(afterRelease.balancePaise, 1000, "a released reservation must never have charged anything");
  assert.equal(afterRelease.reservedBalancePaise, 0, "releasing must free the hold immediately");

  const execution = await prisma.toolExecution.findUnique({ where: { executionId } });
  assert.equal(execution.status, "RELEASED");
});

test("reserveToolExecution: a retry with the same executionId while still COINS_RESERVED is rejected as in-progress, not silently re-run", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.uri);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });

  const executionId = "exec-inprogress-1";
  await billing.reserveToolExecution(ids.uri, TOOL_KEY, executionId);

  await assert.rejects(
    () => billing.reserveToolExecution(ids.uri, TOOL_KEY, executionId),
    (err: any) => err.statusCode === 409,
  );

  // Clean up so this doesn't leave a dangling reservation for other test runs.
  await billing.releaseToolExecution(executionId, "RELEASED");
});

test("a FAILED execution's executionId can be retried fresh and reserves again correctly", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.rhea);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });

  const executionId = "exec-retry-after-fail-1";
  await billing.reserveToolExecution(ids.rhea, TOOL_KEY, executionId);
  await billing.releaseToolExecution(executionId, "FAILED");

  const retried = await billing.reserveToolExecution(ids.rhea, TOOL_KEY, executionId);
  assert.equal(retried.skip, false);
  assert.equal(retried.alreadySettled, false);
  assert.equal(retried.execution.status, "COINS_RESERVED");

  const afterRetry = await wallet.getOrCreateWallet(ids.rhea);
  assert.equal(afterRetry.reservedBalancePaise, 150, "a fresh reservation must be created for the retried attempt");

  await billing.releaseToolExecution(executionId, "RELEASED");
});
