// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:free-allowance
//
// Coin-wallet Checkpoint 4: the global 60-second free-chat allowance (carries over across
// astrologers), the corrected cumulative-ceil billing formula wired end-to-end (not just the
// pure function — see billingFormula.test.ts for that), the exact-boundary exhaustion fix, and
// the COMPLIMENTARY astrologer flow (unmetered, consumes neither coins nor the global allowance).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "5";

const DOM = "@free-allowance-test.example";
const RATE_RUPEES = 7; // ₹7/min = 700 paise/min, matches the finalized worked examples

let prisma: any;
let wallet: any;
let chatService: any;
let billing: any;
let freeAllowance: any;
const ids: Record<string, string> = {};

async function makeAstrologer(key: string, opts: { pricePerMinute?: number | null; isComplimentary?: boolean; complimentaryMaxSeconds?: number } = {}) {
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  const user = await prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
  const application = await prisma.astrologerApplication.create({ data: { userId: user.id, status: "APPROVED" } });
  const profile = await prisma.astrologerProfile.create({
    data: {
      applicationId: application.id,
      userId: user.id,
      displayName: `Astro ${key}`,
      slug: `free-allowance-test-${key}-${Date.now()}`,
      pricePerMinute: opts.pricePerMinute ?? RATE_RUPEES,
      isComplimentary: opts.isComplimentary ?? false,
      complimentaryMaxSeconds: opts.complimentaryMaxSeconds ?? null,
      isPublished: true,
    },
  });
  return { userId: user.id, profileId: profile.id };
}

/** Moves a now-ACTIVE session's lastBilledAt back by `seconds`, heartbeats both sides so
 * presence doesn't pause it, then runs exactly one real tick — the same path billing's own
 * setInterval would take, just invoked directly instead of waiting on a real timer. */
async function simulateElapsed(sessionId: string, seconds: number) {
  await prisma.chatSession.update({ where: { id: sessionId }, data: { lastBilledAt: new Date(Date.now() - seconds * 1000) } });
  billing.recordHeartbeat(sessionId, "USER");
  billing.recordHeartbeat(sessionId, "ASTROLOGER");
  await billing.tick(sessionId);
}

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  chatService = await import("../../modules/chat/chat.service.js");
  billing = await import("../../modules/chat/billing.js");
  freeAllowance = await import("../../modules/chat/freeAllowance.service.js");

  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "free-allowance-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.chatFreeAllowance.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });

  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["olga", "pablo", "quinn"]) {
    const u = await prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
    ids[key] = u.id;
  }

  const astroA = await makeAstrologer("a");
  ids.astroA = astroA.profileId;
  ids.astroAUser = astroA.userId;

  const astroB = await makeAstrologer("b");
  ids.astroB = astroB.profileId;
  ids.astroBUser = astroB.userId;

  const complimentary = await makeAstrologer("comp", { pricePerMinute: null, isComplimentary: true, complimentaryMaxSeconds: 5 });
  ids.astroComp = complimentary.profileId;
  ids.astroCompUser = complimentary.userId;
});

after(async () => {
  if (skip) return;
  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "free-allowance-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.chatFreeAllowance.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.$disconnect();
});

test("free allowance: starts at 60s remaining, is NOT per-astrologer, and carries over between two different astrologers", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.olga);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 10_000, purchasedBalancePaise: 10_000, reservedBalancePaise: 0 } });

  const remainingAtStart = await freeAllowance.getRemainingFreeSeconds(ids.olga);
  assert.equal(remainingAtStart, 60, "a fresh user must start with the full 60-second global allowance");

  // --- Session 1 with astroA: consume 40 free seconds, nothing billable yet. ---
  const req1 = await chatService.startSession(ids.olga, ids.astroA);
  const session1 = await chatService.acceptSession(req1.id, ids.astroAUser);
  await simulateElapsed(session1.id, 40);

  const afterSession1 = await prisma.chatSession.findUnique({ where: { id: session1.id } });
  assert.equal(afterSession1.freeSecondsUsed, 40);
  assert.equal(afterSession1.billedSeconds, 40);
  assert.equal(afterSession1.amountPaise, 0, "40s fully covered by free time must charge nothing");
  assert.equal(await freeAllowance.getRemainingFreeSeconds(ids.olga), 20, "20 seconds must remain globally after this session");

  await billing.endSession(session1.id, "USER_ENDED");

  // --- Session 2 with a DIFFERENT astrologer (astroB): the remaining 20 free seconds must
  // still be available here — "free time carries over between astrologers." ---
  const req2 = await chatService.startSession(ids.olga, ids.astroB);
  const session2 = await chatService.acceptSession(req2.id, ids.astroBUser);
  await simulateElapsed(session2.id, 30); // 20 free + 10 paid

  const afterSession2 = await prisma.chatSession.findUnique({ where: { id: session2.id } });
  assert.equal(afterSession2.freeSecondsUsed, 20, "only the 20 seconds actually remaining must be claimed, not the full 30");
  assert.equal(afterSession2.billedSeconds, 30);
  // billable = 30 - 20 = 10 seconds at 700 paise/min = ceil(10*700/60) = 117.
  assert.equal(afterSession2.amountPaise, 117);
  assert.equal(await freeAllowance.getRemainingFreeSeconds(ids.olga), 0, "the global allowance must now be fully exhausted — it was never per-astrologer");

  await billing.endSession(session2.id, "USER_ENDED");
});

test("corrected cumulative-ceil billing, wired end-to-end through real ticks, matches every finalized worked example", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.pablo);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 5_000, purchasedBalancePaise: 5_000, reservedBalancePaise: 0 } });
  // Exhaust this user's free allowance up front so every elapsed second in this test is
  // billable-paid, matching the plan's pure-paid worked examples exactly.
  await prisma.chatFreeAllowance.upsert({ where: { userId: ids.pablo }, update: { consumedSeconds: 60 }, create: { userId: ids.pablo, totalSeconds: 60, consumedSeconds: 60 } });

  const req = await chatService.startSession(ids.pablo, ids.astroA);
  const session = await chatService.acceptSession(req.id, ids.astroAUser);

  const fixtures: [cumulativeSeconds: number, deltaFromPrevious: number, expectedAmountPaise: number][] = [
    [1, 1, 12],
    [13, 12, 152],
    [30, 17, 350],
    [43, 13, 502],
    [60, 17, 700],
  ];
  let billedSoFar = 0;
  for (const [, delta, expectedAmountPaise] of fixtures) {
    await simulateElapsed(session.id, delta);
    billedSoFar += delta;
    const s = await prisma.chatSession.findUnique({ where: { id: session.id } });
    assert.equal(s.billedSeconds, billedSoFar);
    assert.equal(s.amountPaise, expectedAmountPaise, `cumulative ${billedSoFar}s must total exactly ${expectedAmountPaise} subunits`);
  }

  await billing.endSession(session.id, "USER_ENDED");
});

test("exhaustion ends at the exact affordable boundary, never overdrafting", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.pablo);
  // Start with enough to pass startSession's upfront minimum-balance gate (60s worth = 700
  // paise), and the free allowance already exhausted from the previous test, so every second
  // here is paid.
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });
  await prisma.walletReservation.deleteMany({ where: { walletId: w.id } });

  const req = await chatService.startSession(ids.pablo, ids.astroB);
  const session = await chatService.acceptSession(req.id, ids.astroBUser);

  // Simulate the wallet having been drawn down elsewhere to exactly 350 paise (room for exactly
  // 30 paid seconds at 700/min) AFTER the session already started — the reservation is forced to
  // match, exactly as it would after topUpReservation naturally shrank to fit a dwindling balance.
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 350, purchasedBalancePaise: 350, reservedBalancePaise: 350 } });
  await prisma.walletReservation.updateMany({ where: { walletId: w.id, status: "HELD" }, data: { amountPaise: 350 } });

  // Ask for far more than the wallet can afford in one jump (60s would need 700 paise; only 350 exist).
  await simulateElapsed(session.id, 60);

  const ended = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.endedReason, "BALANCE_EXHAUSTED");
  assert.equal(ended.amountPaise, 350, "must charge exactly what was available, never more");
  assert.equal(ended.billedSeconds, 30, "recorded duration must be capped at the exact number of seconds that amount actually covers (floor(350*60/700) = 30), not the full 60s elapsed");

  const finalWallet = await wallet.getOrCreateWallet(ids.pablo);
  assert.equal(finalWallet.balancePaise, 0, "wallet must be fully but never over spent");
});

test("complimentary astrologer: fully free, unmetered up to the cap, consumes neither coins nor the global allowance", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.quinn);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 0, purchasedBalancePaise: 0, reservedBalancePaise: 0 } });

  const remainingBefore = await freeAllowance.getRemainingFreeSeconds(ids.quinn);
  assert.equal(remainingBefore, 60);

  const req = await chatService.startSession(ids.quinn, ids.astroComp);
  assert.equal(req.type, "COMPLIMENTARY");
  assert.equal(req.freeLimitSeconds, 5, "must use this astrologer's own complimentaryMaxSeconds override (5s), not the 15-minute platform default");

  const session = await chatService.acceptSession(req.id, ids.astroCompUser);
  assert.equal(session.status, "ACTIVE");

  const reservation = await prisma.walletReservation.findFirst({ where: { referenceId: session.id } });
  assert.equal(reservation, null, "a complimentary session must never create a wallet reservation");

  // Elapse past the 5-second cap — must end with FREE_LIMIT_REACHED, not BALANCE_EXHAUSTED, and
  // must never have touched the wallet (still 0) or the global free allowance (still 60 remaining).
  await simulateElapsed(session.id, 8);

  const ended = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.endedReason, "FREE_LIMIT_REACHED");
  assert.equal(ended.billedSeconds, 5, "capped at the astrologer's own 5-second override");
  assert.equal(ended.amountPaise, 0);

  const walletAfter = await wallet.getOrCreateWallet(ids.quinn);
  assert.equal(walletAfter.balancePaise, 0, "a complimentary session must never charge the wallet");
  assert.equal(await freeAllowance.getRemainingFreeSeconds(ids.quinn), 60, "a complimentary session must never consume the global promotional allowance");
});
