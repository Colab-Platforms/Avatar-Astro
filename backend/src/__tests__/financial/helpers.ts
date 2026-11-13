// Shared harness for the Checkpoint-1 financial regression suites.
//
// Everything runs against the DISPOSABLE PostgreSQL 17 container (npm run test:db:up / test:db:init) with
// REAL transactions and the REAL CHECK constraints / partial unique indexes — nothing is mocked. The suites
// refuse (skip) unless TEST_DATABASE_URL passes assertSafeTestDatabase(), which rejects Neon, Render and
// any non-test database.
//
// Time is SIMULATED: billing functions take an explicit `now`, and heartbeats take an explicit timestamp,
// so a 10-minute chat is exercised in milliseconds and every second is deterministic.
import assert from "node:assert/strict";
// @ts-expect-error — plain .mjs tooling module shared with the test-db scripts
import { assertSafeTestDatabase } from "../../../scripts/test-db/config.mjs";

export const RATE_RUPEES = 7; // ₹7/min = 700 paise/min (finalized worked examples)
export const RATE_PAISE = 700;
/** The finalized worked examples at 7 coins/minute: seconds -> cumulative paise. */
export const WORKED_EXAMPLES: Array<[number, number]> = [[1, 12], [13, 152], [30, 350], [43, 502], [60, 700]];

const url = process.env.TEST_DATABASE_URL || "";
let safe = false;
try { assertSafeTestDatabase(url, "TEST_DATABASE_URL"); safe = true; } catch { /* leave unsafe -> suites skip */ }

export const skip: string | false = safe ? false : "needs the disposable test DB: npm run test:db:up && npm run test:db:init, then npm run test:db:run";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-jwt-secret";
if (safe) {
  process.env.DATABASE_URL = url; // set BEFORE prisma is imported
  process.env.DB_POOL_MAX = "12";
}

export type Ctx = Awaited<ReturnType<typeof boot>>;

export async function boot(domain: string) {
  const prisma = (await import("../../../prisma.js")).default as any;
  const wallet = await import("../../modules/payment/wallet.service.js");
  const chat = await import("../../modules/chat/chat.service.js");
  const billing = await import("../../modules/chat/billing.js");
  const free = await import("../../modules/chat/freeAllowance.service.js");
  const toolBilling = await import("../../modules/payment/toolBilling.service.js");
  const ctx = { prisma, wallet, chat, billing, free, toolBilling, DOM: `@${domain}.example`, SLUG: `${domain}-` };
  await cleanup(ctx);
  await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  return ctx;
}

export async function cleanup(ctx: Pick<Ctx, "prisma" | "DOM" | "SLUG">) {
  const { prisma } = ctx;
  const ids: string[] = (await prisma.user.findMany({ where: { email: { endsWith: ctx.DOM } }, select: { id: true } })).map((u: any) => u.id);
  if (ids.length) {
    await prisma.paymentRefund.deleteMany({ where: { paymentOrder: { userId: { in: ids } } } });
    await prisma.paymentOrder.deleteMany({ where: { userId: { in: ids } } });
    await prisma.toolExecution.deleteMany({ where: { userId: { in: ids } } });
  }
  await prisma.paymentWebhookEvent.deleteMany({});
  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: ctx.DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: ctx.DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: ctx.SLUG } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: ctx.DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: ctx.DOM } } }); // wallets/ledger/allowance cascade
}

export async function shutdown(ctx: Ctx) {
  ctx.billing.stopBillingTimers();
  await cleanup(ctx);
  await ctx.prisma.$disconnect();
}

export async function makeUser(ctx: Ctx, key: string): Promise<string> {
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { name: "USER" } });
  const u = await ctx.prisma.user.create({ data: { email: `${key}${ctx.DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
  return u.id;
}

export type Astro = { profileId: string; userId: string };
export async function makeAstrologer(ctx: Ctx, key: string, rupeesPerMinute: number | null = RATE_RUPEES): Promise<Astro> {
  const userId = await makeUser(ctx, `astro-${key}`);
  const application = await ctx.prisma.astrologerApplication.create({ data: { userId, status: "APPROVED" } });
  const profile = await ctx.prisma.astrologerProfile.create({
    data: { applicationId: application.id, userId, displayName: `Astro ${key}`, slug: `${ctx.SLUG}${key}-${Date.now()}`, pricePerMinute: rupeesPerMinute, isPublished: true, isOnline: true },
  });
  return { profileId: profile.id, userId };
}

let fundSeq = 0;
/** Funds through the real ledger (so the ledger reconciles with the balance), never by editing balances. */
export async function fund(ctx: Ctx, userId: string, { purchased = 0, promo = 0 }: { purchased?: number; promo?: number }) {
  const w = await ctx.wallet.getOrCreateWallet(userId);
  const key = `fin-fund:${userId}:${++fundSeq}:${Date.now()}`;
  if (purchased > 0) await ctx.wallet.creditToBucket(w.id, purchased, "PURCHASED", "RECHARGE", { idempotencyKey: `${key}:p` });
  if (promo > 0) await ctx.wallet.creditToBucket(w.id, promo, "PROMOTIONAL", "SIGNUP_BONUS", { idempotencyKey: `${key}:b` });
  return ctx.wallet.getOrCreateWallet(userId);
}

let historyAstro: Promise<Astro> | null = null;
/** Spends the user's global free allowance the way real life does: an earlier, ended chat that used it. The
 * session row and the allowance move together, so the books stay reconcilable. */
export async function burnFree(ctx: Ctx, userId: string, seconds = 60) {
  await ctx.free.getOrCreateFreeAllowance(userId);
  historyAstro ??= makeAstrologer(ctx, "history");
  const astro = await historyAstro;
  await ctx.prisma.chatSession.create({
    data: {
      userId, astrologerProfileId: astro.profileId, type: "PAID", status: "ENDED", endedReason: "USER_ENDED", endedAt: new Date(),
      ratePerMinutePaise: RATE_PAISE, billedSeconds: seconds, freeSecondsUsed: seconds, amountPaise: 0,
    },
  });
  await ctx.prisma.chatFreeAllowance.update({ where: { userId }, data: { consumedSeconds: seconds } });
}

export async function freeRemaining(ctx: Ctx, userId: string): Promise<number> {
  const a = await ctx.prisma.chatFreeAllowance.findUnique({ where: { userId } });
  return a ? a.totalSeconds - a.consumedSeconds : 60;
}

export type Live = { id: string; userId: string; astro: Astro; t0: number };

/** Request + accept. The real 5-second timers are stopped: tests drive billing with simulated time. */
export async function activate(ctx: Ctx, userId: string, astro: Astro): Promise<Live> {
  const requested = await ctx.chat.startSession(userId, astro.profileId);
  const active = await ctx.chat.acceptSession(requested.id, astro.userId);
  ctx.billing.unregisterSession(active.id);
  return { id: active.id, userId, astro, t0: active.lastBilledAt.getTime() };
}

export const at = (s: Live, seconds: number) => new Date(s.t0 + seconds * 1000);

/** Both participants confirm presence at simulated second `seconds`. */
export function beat(ctx: Ctx, s: Live, seconds: number) {
  const ms = s.t0 + seconds * 1000;
  ctx.billing.recordHeartbeat(s.id, "USER", ms);
  ctx.billing.recordHeartbeat(s.id, "ASTROLOGER", ms);
}

/** Heartbeat + tick at each `stepSeconds` up to and including `upToSeconds`. */
export async function runTicks(ctx: Ctx, s: Live, upToSeconds: number, stepSeconds = 5) {
  for (let t = stepSeconds; t <= upToSeconds; t += stepSeconds) {
    beat(ctx, s, t);
    await ctx.billing.tick(s.id, at(s, t));
  }
}

export const sessionRow = (ctx: Ctx, id: string) => ctx.prisma.chatSession.findUniqueOrThrow({ where: { id } });
export const walletRow = (ctx: Ctx, userId: string) => ctx.prisma.wallet.findUniqueOrThrow({ where: { userId } });

/** Σ and count of CHAT_CONSUMPTION debits recorded against a session. */
export async function sessionDebits(ctx: Ctx, sessionId: string) {
  const rows = await ctx.prisma.walletTransaction.findMany({ where: { referenceId: sessionId, reason: "CHAT_CONSUMPTION", type: "DEBIT" }, include: { allocations: true } });
  return {
    count: rows.length,
    total: rows.reduce((n: number, r: any) => n + r.amountPaise, 0),
    promo: rows.flatMap((r: any) => r.allocations).filter((a: any) => a.bucket === "PROMOTIONAL").reduce((n: number, a: any) => n + a.amountPaise, 0),
    purchased: rows.flatMap((r: any) => r.allocations).filter((a: any) => a.bucket === "PURCHASED").reduce((n: number, a: any) => n + a.amountPaise, 0),
  };
}

export async function heldReservations(ctx: Ctx, referenceId: string) {
  return ctx.prisma.walletReservation.findMany({ where: { referenceId, status: "HELD" } });
}

/** The wallet invariants that must hold after ANY operation, however it ended. */
export async function assertWalletSound(ctx: Ctx, userId: string) {
  const w = await walletRow(ctx, userId);
  assert.ok(w.balancePaise >= 0 && w.purchasedBalancePaise >= 0 && w.promotionalBalancePaise >= 0, "no negative balance");
  assert.equal(w.balancePaise, w.purchasedBalancePaise + w.promotionalBalancePaise, "balance == purchased + promotional");
  assert.ok(w.reservedBalancePaise >= 0 && w.reservedBalancePaise <= w.balancePaise, "0 <= reserved <= balance");
  const held = await ctx.prisma.walletReservation.aggregate({ where: { walletId: w.id, status: "HELD" }, _sum: { amountPaise: true } });
  assert.equal(w.reservedBalancePaise, held._sum.amountPaise ?? 0, "wallet.reserved == Σ HELD reservations");
  const txns = await ctx.prisma.walletTransaction.findMany({ where: { walletId: w.id }, include: { allocations: true } });
  const ledger = txns.reduce((n: number, t: any) => n + (t.type === "CREDIT" ? t.amountPaise : -t.amountPaise), 0);
  assert.equal(w.balancePaise, ledger, "balance == Σ credits − Σ debits (ledger reconciles)");
  for (const t of txns) assert.equal(t.allocations.reduce((n: number, a: any) => n + a.amountPaise, 0), t.amountPaise, "allocations sum to the transaction");
  return w;
}

/** Tiny deterministic PRNG so "jitter" tests are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const cumulative = (seconds: number, ratePaise = RATE_PAISE) => (seconds <= 0 ? 0 : Math.ceil((seconds * ratePaise) / 60));
