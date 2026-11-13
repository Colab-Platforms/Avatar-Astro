// Run with: npm run test:db:run -- src/__tests__/financial/reconciliation.node-test.ts
//
// Checkpoint 1 — (a) ledger reconciliation detects every class of financial inconsistency and reports clean
// books after real sessions, and (b) stale-reservation detection never flags a live chat's hold.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, at, beat, runTicks, type Ctx, type Astro } from "./helpers.js";

let ctx: Ctx;
let seq = 0;
const freshAstro = (): Promise<Astro> => makeAstrologer(ctx, `y${++seq}`);
let recon: typeof import("../../modules/payment/reconciliation.js");
const TOOL = "fin-recon-tool";

before(async () => {
  if (skip) return;
  ctx = await boot("fin-recon");
  recon = await import("../../modules/payment/reconciliation.js");
  await ctx.prisma.toolPrice.upsert({ where: { toolKey: TOOL }, update: { coinPriceSubunits: 400, isActive: true }, create: { toolKey: TOOL, coinPriceSubunits: 400, isActive: true } });
});
after(async () => {
  if (skip) return;
  await ctx.prisma.toolPrice.deleteMany({ where: { toolKey: TOOL } });
  await shutdown(ctx);
});

const kinds = (report: { issues: Array<{ kind: string }> }) => report.issues.map((i) => i.kind).sort();

async function completedSession(key: string, seconds: number) {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { promo: 200, purchased: 3000 });
  await burnFree(ctx, userId);
  const s = await activate(ctx, userId, await freshAstro());
  await runTicks(ctx, s, Math.floor(seconds / 5) * 5, 5);
  beat(ctx, s, seconds);
  await ctx.billing.endSession(s.id, "USER_ENDED", at(s, seconds));
  return { userId, s };
}

test("books are clean after real sessions, a free-only session, an exhausted session and a settled tool execution", { skip }, async () => {
  const a = await completedSession("clean-a", 43);

  // free-only session ending on the allowance
  const freeUser = await makeUser(ctx, "clean-free");
  const fs = await activate(ctx, freeUser, await freshAstro());
  await runTicks(ctx, fs, 60, 5);

  // exhausted session
  const exUser = await makeUser(ctx, "clean-ex");
  await fund(ctx, exUser, { purchased: 800 });
  await burnFree(ctx, exUser);
  const ex = await activate(ctx, exUser, await freshAstro());
  beat(ctx, ex, 100);
  await ctx.billing.tick(ex.id, at(ex, 100));

  // tool execution
  const toolUser = await makeUser(ctx, "clean-tool");
  await fund(ctx, toolUser, { purchased: 1000 });
  const execId = ctx.toolBilling.getExecutionId({ headers: { "idempotency-key": "R1" }, user: { id: toolUser } });
  await ctx.toolBilling.reserveToolExecution(toolUser, TOOL, execId);
  await ctx.toolBilling.settleToolExecution(execId, { ok: 1 });

  const report = await recon.reconcileLedger({ userIds: [a.userId, freeUser, exUser, toolUser] });
  assert.deepEqual(report.issues, [], `unexpected issues: ${JSON.stringify(report.issues)}`);
  assert.ok(report.checkedWallets >= 4 && report.checkedSessions >= 3);
});

test("detects a session charge that disagrees with the wallet ledger", { skip }, async () => {
  const { userId, s } = await completedSession("tamper-session", 30);
  await ctx.prisma.chatSession.update({ where: { id: s.id }, data: { amountPaise: 351 } });
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("SESSION_CHARGE_MISMATCH"), JSON.stringify(report.issues));
  const issue = report.issues.find((i) => i.kind === "SESSION_CHARGE_MISMATCH")!;
  assert.equal(issue.sessionId, s.id);
  assert.equal(issue.expected, 350);
  assert.equal(issue.actual, 351);
});

test("detects a session whose charge does not follow the cumulative formula", { skip }, async () => {
  const { userId, s } = await completedSession("tamper-formula", 30);
  await ctx.prisma.chatSession.update({ where: { id: s.id }, data: { billedSeconds: 31 } });
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("SESSION_FORMULA_MISMATCH"), JSON.stringify(report.issues));
});

test("detects wallet.reserved drifting from the sum of HELD reservations", { skip }, async () => {
  const { userId, s } = await completedSession("tamper-reserved", 20);
  const w = await ctx.prisma.wallet.findUniqueOrThrow({ where: { userId } });
  await ctx.prisma.walletReservation.create({ data: { walletId: w.id, amountPaise: 0, purpose: "TOOL_EXECUTION", referenceId: s.id, status: "RELEASED" } });
  await ctx.prisma.$executeRawUnsafe(`UPDATE wallets SET reserved_balance_paise = 5 WHERE id = '${w.id}'`);
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("WALLET_RESERVED_MISMATCH"), JSON.stringify(report.issues));
});

test("detects a balance that no longer equals the ledger (money created or destroyed outside the ledger)", { skip }, async () => {
  const { userId } = await completedSession("tamper-ledger", 20);
  // Keeps every CHECK constraint satisfied — only the ledger comparison can catch this.
  await ctx.prisma.$executeRawUnsafe(`UPDATE wallets SET balance_paise = balance_paise + 7, purchased_balance_paise = purchased_balance_paise + 7 WHERE user_id = '${userId}'`);
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("WALLET_LEDGER_MISMATCH"), JSON.stringify(report.issues));
});

test("detects a transaction whose bucket allocations do not add up", { skip }, async () => {
  const { userId, s } = await completedSession("tamper-alloc", 30);
  const txn = await ctx.prisma.walletTransaction.findFirstOrThrow({ where: { referenceId: s.id, reason: "CHAT_CONSUMPTION" }, include: { allocations: true } });
  await ctx.prisma.walletLedgerAllocation.update({ where: { id: txn.allocations[0].id }, data: { amountPaise: txn.allocations[0].amountPaise + 1 } });
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("ALLOCATION_MISMATCH"), JSON.stringify(report.issues));
});

test("detects an orphaned chat hold on an ENDED session", { skip }, async () => {
  const { userId, s } = await completedSession("orphan", 20);
  const w = await ctx.prisma.wallet.findUniqueOrThrow({ where: { userId } });
  await ctx.wallet.createReservation(w.id, 100, "CHAT_LOOKAHEAD", s.id);
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("ORPHAN_CHAT_RESERVATION"), JSON.stringify(report.issues));
});

test("detects free-allowance drift: consumed seconds that no session accounts for", { skip }, async () => {
  const userId = await makeUser(ctx, "free-drift");
  await ctx.free.getOrCreateFreeAllowance(userId);
  await ctx.prisma.chatFreeAllowance.update({ where: { userId }, data: { consumedSeconds: 25 } });
  const report = await recon.reconcileLedger({ userIds: [userId] });
  assert.ok(kinds(report).includes("FREE_ALLOWANCE_MISMATCH"), JSON.stringify(report.issues));
});

// ---- stale reservations --------------------------------------------------------------------------------
test("stale detection NEVER flags the hold of a live chat, however old; it flags holds of ended sessions and abandoned tool runs", { skip }, async () => {
  const OLD = new Date(Date.now() - 60 * 60 * 1000);
  const FIVE_MIN = 5 * 60 * 1000;

  // 1. a live ACTIVE chat whose hold is an hour old — must NOT be flagged.
  const liveUser = await makeUser(ctx, "stale-live");
  await fund(ctx, liveUser, { purchased: 3000 });
  await burnFree(ctx, liveUser);
  const live = await activate(ctx, liveUser, await freshAstro());
  await ctx.prisma.walletReservation.updateMany({ where: { referenceId: live.id }, data: { createdAt: OLD } });

  // 2. an orphan hold on an ENDED session — flagged.
  const { userId: orphanUser, s: ended } = await completedSession("stale-orphan", 15);
  const ow = await ctx.prisma.wallet.findUniqueOrThrow({ where: { userId: orphanUser } });
  const { reservation: orphan } = await ctx.wallet.createReservation(ow.id, 100, "CHAT_LOOKAHEAD", ended.id);
  await ctx.prisma.walletReservation.update({ where: { id: orphan!.id }, data: { createdAt: OLD } });

  // 3. a tool run that is genuinely in flight (young) — NOT flagged; an abandoned one (old) — flagged.
  const toolUser = await makeUser(ctx, "stale-tool");
  await fund(ctx, toolUser, { purchased: 3000 });
  const youngId = ctx.toolBilling.getExecutionId({ headers: { "idempotency-key": "young" }, user: { id: toolUser } });
  const oldId = ctx.toolBilling.getExecutionId({ headers: { "idempotency-key": "old" }, user: { id: toolUser } });
  await ctx.toolBilling.reserveToolExecution(toolUser, TOOL, youngId);
  const oldRes = await ctx.toolBilling.reserveToolExecution(toolUser, TOOL, oldId);
  await ctx.prisma.walletReservation.update({ where: { id: oldRes.execution!.reservationId! }, data: { createdAt: OLD } });
  await ctx.prisma.toolExecution.update({ where: { executionId: oldId }, data: { createdAt: OLD } });

  const stale = await recon.findStaleReservations({ olderThanMs: FIVE_MIN, userIds: [liveUser, orphanUser, toolUser] });
  const refs = stale.reservations.map((r) => r.referenceId);
  assert.ok(!refs.includes(live.id), "a live chat's rolling hold must never be reported as stale");
  assert.ok(refs.includes(ended.id), "the orphan hold on an ENDED session must be reported");
  assert.ok(refs.includes(oldId), "an abandoned tool hold must be reported");
  assert.ok(!refs.includes(youngId), "a tool run still within the window must not be reported");
  assert.equal(stale.reservations.find((r) => r.referenceId === ended.id)!.reason, "ORPHAN_CHAT_HOLD");

  await ctx.billing.endSession(live.id, "USER_ENDED");
});
