// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:wallet-reservations
//
// Coin-wallet Checkpoint 2: WalletReservation primitives (create/topUp/settle/release) and their
// wiring into the existing chat billing tick via a rolling reservation per PAID session.
// Local disposable database only (refuses anything that is not localhost).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "5"; // the chat-integration test nests prisma.$transaction calls through several service functions; a single pooled connection is too tight

const DOM = "@wallet-reservation-test.example";

let prisma: any;
let wallet: any;
let chatService: any;
let billing: any;
const ids: Record<string, string> = {};

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  chatService = await import("../../modules/chat/chat.service.js");
  billing = await import("../../modules/chat/billing.js");

  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "wallet-reservation-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });

  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["eve", "frank", "grace", "heidi", "astroUser"]) {
    const u = await prisma.user.create({
      data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } },
    });
    ids[key] = u.id;
  }

  const application = await prisma.astrologerApplication.create({
    data: { userId: ids.astroUser, status: "APPROVED" },
  });
  const profile = await prisma.astrologerProfile.create({
    data: {
      applicationId: application.id,
      userId: ids.astroUser,
      displayName: "Test Astrologer",
      slug: `wallet-reservation-test-${Date.now()}`,
      pricePerMinute: 7, // ₹7/min = 700 paise/min, matches the plan's worked examples
      isPublished: true,
    },
  });
  ids.profile = profile.id;
  ids.application = application.id;
});

after(async () => {
  if (skip) return;
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { id: ids.profile } });
  await prisma.astrologerApplication.deleteMany({ where: { id: ids.application } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.$disconnect();
});

test("createReservation: reserves the full amount when funds are available", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.eve);
  await wallet.creditToBucket(w.id, 1000, "PURCHASED", "RECHARGE");
  const { reservation, reservedAmountPaise } = await wallet.createReservation(w.id, 350, "CHAT_LOOKAHEAD", "ref-eve-1");
  assert.equal(reservedAmountPaise, 350);
  assert.equal(reservation.status, "HELD");

  const updated = await wallet.getOrCreateWallet(ids.eve);
  assert.equal(updated.reservedBalancePaise, 350);
  assert.equal(updated.balancePaise, 1000, "reserving must not move balancePaise — only reservedBalancePaise");
});

test("createReservation: degrades gracefully to a smaller reservation when funds are insufficient", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.frank);
  await wallet.creditToBucket(w.id, 200, "PURCHASED", "RECHARGE");
  const { reservedAmountPaise } = await wallet.createReservation(w.id, 500, "CHAT_LOOKAHEAD", "ref-frank-1");
  assert.equal(reservedAmountPaise, 200, "must reserve whatever is available, not reject outright");

  const { reservedAmountPaise: second } = await wallet.createReservation(w.id, 100, "TOOL_EXECUTION", "ref-frank-2");
  assert.equal(second, 0, "wallet already fully reserved — a second reservation gets nothing, not a negative/overdrawn hold");
});

test("topUpReservation: tops up to target using only truly-available funds, never exceeding them", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.grace);
  await wallet.creditToBucket(w.id, 100, "PURCHASED", "RECHARGE");
  const { reservation } = await wallet.createReservation(w.id, 50, "CHAT_LOOKAHEAD", "ref-grace-1");

  const toppedFull = await wallet.topUpReservation(reservation.id, 80); // needs +30, 50 still free -> succeeds fully
  assert.equal(toppedFull.amountPaise, 80);

  const toppedPartial = await wallet.topUpReservation(reservation.id, 500); // needs +420, only 20 free -> partial
  assert.equal(toppedPartial.amountPaise, 100, "must top up only as far as truly-available funds allow");

  const finalWallet = await wallet.getOrCreateWallet(ids.grace);
  assert.equal(finalWallet.reservedBalancePaise, 100);
  assert.equal(finalWallet.balancePaise, 100, "top-up never touches balancePaise, only reservedBalancePaise");
});

test("settleFromReservation: settles from the reservation, covers shortfall from the wallet directly, and reports the exact exhaustion boundary", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.heidi);
  await wallet.creditToBucket(w.id, 100, "PROMOTIONAL", "SIGNUP_BONUS");
  const { reservation } = await wallet.createReservation(w.id, 30, "CHAT_LOOKAHEAD", "ref-heidi-1");
  // Wallet now has 100 total, 30 reserved -> 70 truly free beyond the reservation.

  const first = await wallet.settleFromReservation(reservation.id, 20, "CHAT_CONSUMPTION", { idempotencyKey: "heidi-tick-1" });
  assert.equal(first.charged, 20);
  assert.equal(first.exhausted, false);
  let w2 = await wallet.getOrCreateWallet(ids.heidi);
  assert.equal(w2.balancePaise, 80);
  assert.equal(w2.reservedBalancePaise, 10, "reservation shrinks by exactly what was settled from it");

  // Ask for more than the reservation currently holds (10) — the extra 40 must come straight from
  // the wallet's truly-available balance (80 - 0 other reservations = 80), not be rejected.
  const second = await wallet.settleFromReservation(reservation.id, 50, "CHAT_CONSUMPTION", { idempotencyKey: "heidi-tick-2" });
  assert.equal(second.charged, 50);
  assert.equal(second.exhausted, false);
  w2 = await wallet.getOrCreateWallet(ids.heidi);
  assert.equal(w2.balancePaise, 30);
  assert.equal(w2.reservedBalancePaise, 0, "reservation is now fully consumed");

  // Now ask for more than remains in the wallet at all (30 left, asking for 100) — must charge
  // exactly 30 and report exhausted, never overdraft.
  const third = await wallet.settleFromReservation(reservation.id, 100, "CHAT_CONSUMPTION", { idempotencyKey: "heidi-tick-3" });
  assert.equal(third.charged, 30);
  assert.equal(third.exhausted, true);
  w2 = await wallet.getOrCreateWallet(ids.heidi);
  assert.equal(w2.balancePaise, 0);

  // Idempotent retry with the same key must not charge again.
  const retry = await wallet.settleFromReservation(reservation.id, 100, "CHAT_CONSUMPTION", { idempotencyKey: "heidi-tick-3" });
  assert.equal(retry.charged, 30, "retried settlement with the same idempotencyKey returns the original charged amount, not a fresh one");
  w2 = await wallet.getOrCreateWallet(ids.heidi);
  assert.equal(w2.balancePaise, 0, "balance must not drop further on retry");
});

test("releaseReservation: frees the unused remainder and is idempotent", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.eve); // 650 remaining from the first test (1000 - 350 reserved, never settled)
  const existingReservation = await prisma.walletReservation.findFirst({ where: { referenceId: "ref-eve-1" } });
  const released = await wallet.releaseReservation(existingReservation.id);
  assert.equal(released.status, "RELEASED");
  assert.equal(released.amountPaise, 0);

  const updated = await wallet.getOrCreateWallet(ids.eve);
  assert.equal(updated.reservedBalancePaise, 0, "releasing frees the full unused amount");
  assert.equal(updated.balancePaise, 1000, "releasing never touches balancePaise");

  const releasedAgain = await wallet.releaseReservation(existingReservation.id);
  assert.equal(releasedAgain.status, "RELEASED", "releasing an already-released reservation is a safe no-op");
});

test("chat integration: startSession creates a CHAT_LOOKAHEAD reservation sized to the lookahead window", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.frank);
  // Give frank a clean, sufficient balance for this test — minimumRequiredPaise for a ₹7/min
  // session is ceil(700 * MIN_BILLABLE_SECONDS(60) / 60) = 700 paise, so 1000 comfortably covers it.
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 1000, purchasedBalancePaise: 1000, reservedBalancePaise: 0 } });
  await prisma.walletReservation.deleteMany({ where: { walletId: w.id } });

  // As of Checkpoint 3, startSession only creates a REQUESTED row — no reservation yet. The
  // astrologer must accept it first (see chatStateMachine.node-test.ts for the full
  // REQUESTED->ACCEPT handshake); this test uses a self-approved astrologer profile purely to
  // exercise the reservation sizing, so we accept immediately here.
  const requested = await chatService.startSession(ids.frank, ids.profile);
  assert.equal(requested.type, "PAID");
  assert.equal(requested.ratePerMinutePaise, 700); // ₹7/min
  assert.equal(requested.status, "REQUESTED");

  const astroProfile = await prisma.astrologerProfile.findUniqueOrThrow({ where: { id: ids.profile } });
  const session = await chatService.acceptSession(requested.id, astroProfile.userId);
  assert.equal(session.status, "ACTIVE");

  const reservation = await prisma.walletReservation.findFirst({ where: { referenceId: session.id, purpose: "CHAT_LOOKAHEAD", status: "HELD" } });
  assert.ok(reservation, "acceptSession must create a CHAT_LOOKAHEAD reservation for a PAID session");
  // 30s lookahead at 700 paise/min = ceil(30 * 700 / 60) = 350 paise.
  assert.equal(reservation.amountPaise, 350);

  const walletAfterStart = await wallet.getOrCreateWallet(ids.frank);
  assert.equal(walletAfterStart.reservedBalancePaise, 350);
  assert.equal(walletAfterStart.balancePaise, 1000, "accepting a session must not debit anything up front — only reserve");

  // Ending the session must release the unused reservation.
  await billing.endSession(session.id, "USER_ENDED");
  const walletAfterEnd = await wallet.getOrCreateWallet(ids.frank);
  assert.equal(walletAfterEnd.reservedBalancePaise, 0, "ending the session must release the unused reservation");
  assert.equal(walletAfterEnd.balancePaise, 1000, "a session that billed nothing must not have debited anything");
});
