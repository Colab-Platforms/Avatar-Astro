// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:chat-state-machine
//
// Coin-wallet Checkpoint 3: REQUESTED->ACCEPT/REJECT handshake, zero billing before activation,
// database-enforced one-session-per-user/-astrologer uniqueness, the durable request-expiry and
// presence-grace-expiry sweep, and presence-based pause/resume (no billing during a disconnect,
// no retroactive charge on reconnect).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "5";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DOM = "@chat-state-test.example";

let prisma: any;
let wallet: any;
let chatService: any;
let billing: any;
const ids: Record<string, string> = {};

async function makeAstrologer(key: string, pricePerMinuteRupees: number | null) {
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  const user = await prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
  const application = await prisma.astrologerApplication.create({ data: { userId: user.id, status: "APPROVED" } });
  const profile = await prisma.astrologerProfile.create({
    data: {
      applicationId: application.id,
      userId: user.id,
      displayName: `Astro ${key}`,
      slug: `chat-state-test-${key}-${Date.now()}`,
      pricePerMinute: pricePerMinuteRupees,
      isPublished: true,
    },
  });
  return { userId: user.id, applicationId: application.id, profileId: profile.id };
}

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  chatService = await import("../../modules/chat/chat.service.js");
  billing = await import("../../modules/chat/billing.js");

  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "chat-state-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });

  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["ivan", "judy", "karl", "liam", "mallory", "nancy"]) {
    const u = await prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
    ids[key] = u.id;
  }

  ids.astroA = (await makeAstrologer("a", 6)).profileId; // ₹6/min = 600 paise/min
  const astroA = await prisma.astrologerProfile.findUnique({ where: { id: ids.astroA } });
  ids.astroAUser = astroA.userId;

  ids.astroB = (await makeAstrologer("b", 6)).profileId;
  const astroB = await prisma.astrologerProfile.findUnique({ where: { id: ids.astroB } });
  ids.astroBUser = astroB.userId;
});

after(async () => {
  if (skip) return;
  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "chat-state-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.$disconnect();
});

test("startSession creates REQUESTED, not ACTIVE — zero billing, zero reservation before acceptance", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.ivan);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });

  const session = await chatService.startSession(ids.ivan, ids.astroA);
  assert.equal(session.status, "REQUESTED");
  assert.ok(session.requestExpiresAt, "a REQUESTED session must have a durable expiry deadline");

  const reservation = await prisma.walletReservation.findFirst({ where: { referenceId: session.id } });
  assert.equal(reservation, null, "no reservation must exist before the astrologer accepts");

  const walletAfter = await wallet.getOrCreateWallet(ids.ivan);
  assert.equal(walletAfter.balancePaise, 2000, "requesting a chat must not touch the wallet at all");
  assert.equal(walletAfter.reservedBalancePaise, 0);

  // Must not leave astroA permanently "busy" for later tests — end this REQUESTED session.
  await billing.endSession(session.id, "USER_ENDED");
});

test("acceptSession transitions to ACTIVE, creates the reservation, and registers billing — rejectSession claims nothing", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.judy);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });

  const session = await chatService.startSession(ids.judy, ids.astroA);
  const accepted = await chatService.acceptSession(session.id, ids.astroAUser);
  assert.equal(accepted.status, "ACTIVE");
  assert.ok(accepted.acceptedAt);

  const reservation = await prisma.walletReservation.findFirst({ where: { referenceId: session.id, status: "HELD" } });
  assert.ok(reservation, "accepting must create the rolling reservation");
  assert.equal(reservation.amountPaise, 300); // 30s lookahead at 600 paise/min = ceil(30*600/60) = 300

  await billing.endSession(session.id, "USER_ENDED");

  // A second, separate request to the same astrologer that gets REJECTED must claim nothing.
  const session2 = await chatService.startSession(ids.judy, ids.astroA);
  const rejected = await chatService.rejectSession(session2.id, ids.astroAUser);
  assert.equal(rejected.status, "ENDED");
  assert.equal(rejected.endedReason, "REJECTED");
  const reservation2 = await prisma.walletReservation.findFirst({ where: { referenceId: session2.id } });
  assert.equal(reservation2, null, "a rejected request must never have created a reservation");
});

test("database-enforced uniqueness: concurrent requests from the same user succeed exactly once", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.karl);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });

  const [r1, r2] = await Promise.allSettled([
    chatService.startSession(ids.karl, ids.astroA),
    chatService.startSession(ids.karl, ids.astroB),
  ]);
  const succeeded = [r1, r2].filter((r) => r.status === "fulfilled");
  const failed = [r1, r2].filter((r) => r.status === "rejected");
  assert.equal(succeeded.length, 1, "exactly one concurrent request for the same user must succeed");
  assert.equal(failed.length, 1);
  if (failed[0].status === "rejected") {
    assert.equal(failed[0].reason.statusCode, 409, "the losing request must get a clean 409, not a generic 500");
  }

  const live = await prisma.chatSession.findMany({ where: { userId: ids.karl, status: { in: ["REQUESTED", "ACTIVE", "PAUSED"] } } });
  assert.equal(live.length, 1, "at most one pending/active/paused session for this user, enforced by the database");

  // Must not leave whichever astrologer won "busy" for later tests.
  for (const s of live) await billing.endSession(s.id, "USER_ENDED");
});

test("database-enforced uniqueness: concurrent requests to the same astrologer succeed exactly once", { skip }, async () => {
  const w1 = await wallet.getOrCreateWallet(ids.liam);
  await prisma.wallet.update({ where: { id: w1.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });
  const w2 = await wallet.getOrCreateWallet(ids.mallory);
  await prisma.wallet.update({ where: { id: w2.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });

  const [r1, r2] = await Promise.allSettled([
    chatService.startSession(ids.liam, ids.astroB),
    chatService.startSession(ids.mallory, ids.astroB),
  ]);
  const succeeded = [r1, r2].filter((r) => r.status === "fulfilled");
  assert.equal(succeeded.length, 1, "exactly one of two different users requesting the SAME astrologer must succeed");

  const live = await prisma.chatSession.findMany({ where: { astrologerProfileId: ids.astroB, status: { in: ["REQUESTED", "ACTIVE", "PAUSED"] } } });
  assert.equal(live.length, 1, "at most one pending/active/paused session for this astrologer, enforced by the database");

  // Clean up whichever one succeeded so later tests aren't blocked by astroB being "busy".
  for (const s of live) await billing.endSession(s.id, "USER_ENDED");
});

test("sweepExpiredState: a REQUESTED session past its deadline auto-ends with TIMEOUT", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.nancy);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000 } });

  const session = await chatService.startSession(ids.nancy, ids.astroB);
  // Force the deadline into the past, as if 60s had already elapsed.
  await prisma.chatSession.update({ where: { id: session.id }, data: { requestExpiresAt: new Date(Date.now() - 1000) } });

  await billing.sweepExpiredState();

  const after2 = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(after2.status, "ENDED");
  assert.equal(after2.endedReason, "TIMEOUT");
});

test("presence: a session with no heartbeat pauses on the next tick, with zero charge accrued during the pause", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.ivan); // reuse ivan, 2000 paise, no active session (ended implicitly by never accepting the REQUESTED one)
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000, reservedBalancePaise: 0 } });
  await prisma.walletReservation.deleteMany({ where: { walletId: w.id } });
  await prisma.chatSession.deleteMany({ where: { userId: ids.ivan } });

  const session = await chatService.startSession(ids.ivan, ids.astroA);
  const accepted = await chatService.acceptSession(session.id, ids.astroAUser);
  assert.equal(accepted.status, "ACTIVE");

  // Deliberately send no heartbeats at all — the next billing tick (every BILLING_TICK_MS = 5s)
  // must pause the session rather than bill through the silence.
  await sleep(6_500);

  const paused = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(paused.status, "PAUSED", "a session with no presence must pause, not keep billing");
  assert.equal(paused.billedSeconds, 0, "nothing must have been billed while unpresent");
  assert.ok(paused.presenceGraceEndsAt, "a paused session must carry a durable grace deadline");

  // Reconnect — heartbeats from both sides must resume billing, with lastBilledAt reset to the
  // resume moment so the paused interval is never retroactively charged.
  billing.recordHeartbeat(session.id, "USER");
  billing.recordHeartbeat(session.id, "ASTROLOGER");
  await sleep(200); // maybeResumeFromPause runs fire-and-forget off the second recordHeartbeat call

  const resumed = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(resumed.status, "ACTIVE", "both sides present again must resume billing");
  assert.equal(resumed.pausedAt, null);
  assert.equal(resumed.presenceGraceEndsAt, null);

  await billing.endSession(session.id, "USER_ENDED");
});

test("sweepExpiredState: a PAUSED session past its grace deadline auto-ends with DISCONNECTED, billing nothing for the gap", { skip }, async () => {
  const w = await wallet.getOrCreateWallet(ids.judy);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 2000, purchasedBalancePaise: 2000, reservedBalancePaise: 0 } });
  await prisma.walletReservation.deleteMany({ where: { walletId: w.id } });
  await prisma.chatSession.deleteMany({ where: { userId: ids.judy } });

  const session = await chatService.startSession(ids.judy, ids.astroA);
  await chatService.acceptSession(session.id, ids.astroAUser);

  // Force straight into PAUSED with an already-expired grace deadline, simulating a disconnect
  // that's been going on long enough to exceed the reconnect window.
  await prisma.chatSession.update({
    where: { id: session.id },
    data: { status: "PAUSED", pausedAt: new Date(Date.now() - 120_000), presenceGraceEndsAt: new Date(Date.now() - 1000) },
  });

  await billing.sweepExpiredState();

  const ended = await prisma.chatSession.findUnique({ where: { id: session.id } });
  assert.equal(ended.status, "ENDED");
  assert.equal(ended.endedReason, "DISCONNECTED");
  assert.equal(ended.billedSeconds, 0, "the downtime/disconnect gap must never be billed");

  const finalWallet = await wallet.getOrCreateWallet(ids.judy);
  assert.equal(finalWallet.balancePaise, 2000, "nothing was ever charged for a session that only ever sat paused");
  assert.equal(finalWallet.reservedBalancePaise, 0, "the reservation must be released, not left dangling");
});
