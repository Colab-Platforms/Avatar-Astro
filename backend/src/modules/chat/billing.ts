// Server-authoritative per-session billing. Timestamps in ChatSession (lastBilledAt,
// billedSeconds) are the only source of truth — the in-memory `timers` map is just a
// scheduler for re-checking them every BILLING_TICK_MS; losing it (a restart) only means
// billing resumes late, never that a session double-charges or forgets elapsed time,
// because every tick recomputes elapsed = now - lastBilledAt from the database.
//
// Presence (who's actually connected right now) is tracked in memory only — it is a liveness
// signal, not a source of truth. The moment either side's presence lapses, the session is
// PAUSED and that transition (pausedAt, presenceGraceEndsAt) IS persisted, so a second restart
// during a pause still knows exactly when the grace window ends. Billing never advances while
// paused, and resuming never retroactively bills the paused interval.
import type { Server as SocketIOServer } from "socket.io";
import type { ChatEndReason, ChatSenderRole } from "@prisma/client";
import prisma from "@root/prisma.js";
import { getOrCreateWallet, settleFromReservation, topUpReservation, releaseReservation } from "@/modules/payment/wallet.service.js";
import { claimFreeSeconds, getRemainingFreeSeconds } from "./freeAllowance.service.js";
import {
  FREE_TRIAL_SECONDS,
  LOW_BALANCE_WARNING_SECONDS,
  BILLING_TICK_MS,
  CHAT_RESERVATION_LOOKAHEAD_SECONDS,
  PRESENCE_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
  SWEEP_INTERVAL_MS,
} from "./chat.constants.js";

/** Rule E, corrected (Checkpoint 4): ceil applied to the CUMULATIVE billable total, never to an
 * individual tick in isolation — this is what makes "never re-round a past interval" true.
 * Verified against the finalized worked examples at 7 coins/minute (700 paise/min):
 * 1s->12, 13s->152, 30s->350, 43s->502, 60s->700 (subunits). Exported as a pure function so it's
 * directly unit-testable without needing to wait on real timers. */
export function cumulativeChargeDue(billableSecondsCumulative: number, ratePerMinutePaise: number): number {
  if (billableSecondsCumulative <= 0) return 0;
  return Math.ceil((billableSecondsCumulative * ratePerMinutePaise) / 60);
}

const timers = new Map<string, NodeJS.Timeout>();
let io: SocketIOServer | null = null;
let sweepTimer: NodeJS.Timeout | null = null;

/** Called once from realtime/socketServer.ts after the Socket.IO server is created. */
export function attachIo(server: SocketIOServer): void {
  io = server;
}

export const roomForSession = (sessionId: string) => `chat:${sessionId}`;
export const roomForAstrologer = (astrologerProfileId: string) => `astrologer:${astrologerProfileId}`;

export function emitToRoom(room: string, event: string, payload: unknown): void {
  io?.to(room).emit(event, payload);
}

export function registerSession(sessionId: string): void {
  if (timers.has(sessionId)) return;
  const timer = setInterval(() => {
    tick(sessionId).catch((err) => console.error(`[chat.billing] tick failed for ${sessionId}:`, err));
  }, BILLING_TICK_MS);
  timers.set(sessionId, timer);
}

export function unregisterSession(sessionId: string): void {
  const timer = timers.get(sessionId);
  if (timer) {
    clearInterval(timer);
    timers.delete(sessionId);
  }
}

// ============================================================================
// Presence — in-memory only, intentionally. The persisted PAUSED/presenceGraceEndsAt state is
// what survives a restart; this map is just "has anyone heard from this side in the last
// PRESENCE_TIMEOUT_MS." Tied to the chat window being mounted and socket-connected, never to
// document/tab focus — an unfocused tab keeps heartbeating, a dropped socket does not.
// ============================================================================
const presence = new Map<string, { user?: number; astrologer?: number }>();

export function recordHeartbeat(sessionId: string, role: ChatSenderRole): void {
  const entry = presence.get(sessionId) ?? {};
  if (role === "USER") entry.user = Date.now();
  else entry.astrologer = Date.now();
  presence.set(sessionId, entry);
  maybeResumeFromPause(sessionId).catch((err) => console.error(`[chat.billing] resume check failed for ${sessionId}:`, err));
}

function isPresent(sessionId: string, role: ChatSenderRole): boolean {
  const entry = presence.get(sessionId);
  const last = role === "USER" ? entry?.user : entry?.astrologer;
  return last !== undefined && Date.now() - last <= PRESENCE_TIMEOUT_MS;
}

function bothPresent(sessionId: string): boolean {
  return isPresent(sessionId, "USER") && isPresent(sessionId, "ASTROLOGER");
}

async function pauseSession(sessionId: string, now: Date): Promise<void> {
  unregisterSession(sessionId); // fully stopped — no tick fires at all while paused, not merely a tick that computes zero
  const presenceGraceEndsAt = new Date(now.getTime() + RECONNECT_GRACE_MS);
  const updated = await prisma.chatSession.updateMany({
    where: { id: sessionId, status: "ACTIVE" }, // no-op if it already moved on (e.g. ended by another path concurrently)
    data: { status: "PAUSED", pausedAt: now, presenceGraceEndsAt },
  });
  if (updated.count === 0) return;
  emitToRoom(roomForSession(sessionId), "chat:paused", { sessionId, graceEndsAt: presenceGraceEndsAt });
}

/** Called whenever a heartbeat arrives for a PAUSED session — resumes only once BOTH sides are present again. */
async function maybeResumeFromPause(sessionId: string): Promise<void> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "PAUSED") return;
  if (!bothPresent(sessionId)) return;

  const now = new Date();
  // lastBilledAt is reset to the resume moment, not the pause moment — the paused interval is
  // categorically excluded from billing, never retroactively charged.
  const updated = await prisma.chatSession.updateMany({
    where: { id: sessionId, status: "PAUSED" },
    data: { status: "ACTIVE", lastBilledAt: now, pausedAt: null, presenceGraceEndsAt: null },
  });
  if (updated.count === 0) return;
  registerSession(sessionId);
  emitToRoom(roomForSession(sessionId), "chat:resumed", { sessionId });
}

/** Exported for direct testing — the full per-tick logic without needing to wait on real BILLING_TICK_MS timers. */
export async function tick(sessionId: string): Promise<void> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "ACTIVE") {
    unregisterSession(sessionId);
    return;
  }

  const now = new Date();
  if (!bothPresent(sessionId)) {
    await pauseSession(sessionId, now);
    return;
  }

  const elapsedSeconds = Math.floor((now.getTime() - session.lastBilledAt.getTime()) / 1000);
  if (elapsedSeconds <= 0) return;

  if (session.type !== "PAID") {
    // FREE_TRIAL (legacy, no new rows created) or COMPLIMENTARY — capped, unmetered time. Never
    // touches the wallet or the global free allowance.
    const limit = session.freeLimitSeconds ?? FREE_TRIAL_SECONDS;
    const billedSeconds = Math.min(limit, session.billedSeconds + elapsedSeconds);
    const remainingSeconds = Math.max(0, limit - billedSeconds);

    if (remainingSeconds <= 0) {
      await prisma.chatSession.update({ where: { id: sessionId }, data: { billedSeconds, lastBilledAt: now } });
      await endSession(sessionId, "FREE_LIMIT_REACHED");
      return;
    }

    const warningIssued = session.warningIssued || remainingSeconds <= LOW_BALANCE_WARNING_SECONDS;
    if (warningIssued && !session.warningIssued) {
      emitToRoom(roomForSession(sessionId), "chat:low-balance-warning", { sessionId, remainingSeconds });
    }
    await prisma.chatSession.update({ where: { id: sessionId }, data: { billedSeconds, lastBilledAt: now, warningIssued } });
    emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds, balancePaise: null });
    return;
  }

  // PAID — settled against the session's own rolling reservation (created at acceptance, topped
  // back up every tick), never a direct wallet debit. This is what makes a concurrent premium-tool
  // reservation on the same wallet see accurate "available" funds instead of being blind to this
  // session's in-flight draw.
  const reservation = await prisma.walletReservation.findFirst({
    where: { referenceId: sessionId, purpose: "CHAT_LOOKAHEAD", status: "HELD" },
  });
  if (!reservation) {
    // Should never happen — acceptSession() always creates one for a PAID session. Logged and
    // skipped rather than crashing the tick loop; the next tick will retry.
    console.error(`[chat.billing] no HELD CHAT_LOOKAHEAD reservation for session ${sessionId}; skipping tick`);
    return;
  }

  // Rule C: the global free allowance is drawn down BEFORE any paid amount is computed. Only the
  // portion of this tick's elapsed time that ISN'T covered by free seconds is billable.
  const freeClaimed = await claimFreeSeconds(session.userId, elapsedSeconds);
  const billedSeconds = session.billedSeconds + elapsedSeconds;
  const freeSecondsUsed = session.freeSecondsUsed + freeClaimed;

  // Rule E, corrected: ceil applied to the CUMULATIVE billable total, never to this tick alone —
  // newCharge is always exactly "what the cumulative formula now says is due, minus what was
  // already settled," so a past interval is never re-rounded.
  const chargeDue = cumulativeChargeDue(billedSeconds - freeSecondsUsed, session.ratePerMinutePaise);
  const newCharge = chargeDue - session.amountPaise;

  if (newCharge <= 0) {
    // Entirely covered by free seconds (or rounding landed on the same cumulative cents) —
    // nothing to settle against the reservation this tick.
    await prisma.chatSession.update({ where: { id: sessionId }, data: { billedSeconds, freeSecondsUsed, lastBilledAt: now } });
    const freeSecondsRemaining = await getRemainingFreeSeconds(session.userId);
    emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds: null, balancePaise: null, freeSecondsRemaining });
    return;
  }

  // Cumulative billedSeconds-after-this-tick is a stable, unique key per tick (lastBilledAt only
  // ever advances), so a re-processed tick after a transient error is a safe no-op, not a double charge.
  const idempotencyKey = `chat-tick:${sessionId}:${billedSeconds}`;
  const { charged, exhausted } = await settleFromReservation(reservation.id, newCharge, "CHAT_CONSUMPTION", {
    referenceId: sessionId,
    idempotencyKey,
  });

  const amountPaise = session.amountPaise + charged;

  if (exhausted) {
    // Exact affordable boundary (per the corrected reservation design): how many whole paid
    // seconds does the total now-settled amount actually cover, using floor so duration is never
    // reported beyond what was strictly paid for. The free portion is always counted in full —
    // it was already atomically claimed from the global allowance regardless of wallet funds.
    const rate = session.ratePerMinutePaise;
    const affordablePaidSeconds = rate > 0 ? Math.floor((amountPaise * 60) / rate) : 0;
    const billedSecondsCapped = Math.min(billedSeconds, affordablePaidSeconds + freeSecondsUsed);
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { billedSeconds: billedSecondsCapped, freeSecondsUsed, amountPaise, lastBilledAt: now },
    });
    await endSession(sessionId, "BALANCE_EXHAUSTED");
    return;
  }

  const lookaheadTargetPaise = Math.ceil((CHAT_RESERVATION_LOOKAHEAD_SECONDS * session.ratePerMinutePaise) / 60);
  const toppedUp = await topUpReservation(reservation.id, lookaheadTargetPaise);
  const freshWallet = await getOrCreateWallet(session.userId);
  const rate = session.ratePerMinutePaise > 0 ? session.ratePerMinutePaise : 1;
  // Everything this reservation already holds, plus whatever's truly free beyond every OTHER
  // reservation on this wallet — i.e. the most this session could still bill before running out.
  const otherReservedPaise = Math.max(0, freshWallet.reservedBalancePaise - toppedUp.amountPaise);
  const availableForThisSession = freshWallet.balancePaise - otherReservedPaise;
  const remainingSeconds = Math.floor((availableForThisSession / rate) * 60);

  const warningIssued = session.warningIssued || remainingSeconds <= LOW_BALANCE_WARNING_SECONDS;
  if (warningIssued && !session.warningIssued) {
    emitToRoom(roomForSession(sessionId), "chat:low-balance-warning", { sessionId, remainingSeconds });
  }
  await prisma.chatSession.update({ where: { id: sessionId }, data: { billedSeconds, freeSecondsUsed, amountPaise, lastBilledAt: now, warningIssued } });
  emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds, balancePaise: freshWallet.balancePaise });
}

export async function endSession(sessionId: string, reason: ChatEndReason) {
  unregisterSession(sessionId);
  presence.delete(sessionId);
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status === "ENDED") return session;

  if (session.type === "PAID") {
    // Release whatever's left of the rolling reservation — makes those coins immediately
    // available to any other concurrent operation on the same wallet, not after a delayed cleanup.
    const reservation = await prisma.walletReservation.findFirst({
      where: { referenceId: sessionId, purpose: "CHAT_LOOKAHEAD", status: "HELD" },
    });
    if (reservation) await releaseReservation(reservation.id);
  }

  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", endedAt: new Date(), endedReason: reason },
  });
  emitToRoom(roomForSession(sessionId), "chat:ended", { sessionId, reason });
  emitToRoom(roomForAstrologer(session.astrologerProfileId), "chat:session-ended", { sessionId, reason });
  return updated;
}

export function notifyNewSession(astrologerProfileId: string, session: { id: string; userId: string; requestedAt: Date; type: string }): void {
  emitToRoom(roomForAstrologer(astrologerProfileId), "chat:new-session", {
    sessionId: session.id,
    userId: session.userId,
    requestedAt: session.requestedAt,
    type: session.type,
  });
}

/**
 * Durable expiry sweep — every deadline it checks (requestExpiresAt, presenceGraceEndsAt) is
 * read fresh from the database, never from an in-memory timer, so this is the actual source of
 * truth for both the acceptance timeout and the reconnect grace window. Runs on an interval
 * (started once by resumeAllActiveSessions) AND is itself called once at startup, so a deadline
 * that passed entirely while the server was down is still caught the moment it comes back up.
 */
export async function sweepExpiredState(): Promise<void> {
  const now = new Date();

  const staleRequests = await prisma.chatSession.findMany({
    where: { status: "REQUESTED", requestExpiresAt: { lte: now } },
  });
  for (const s of staleRequests) {
    await endSession(s.id, "TIMEOUT");
  }

  const expiredPauses = await prisma.chatSession.findMany({
    where: { status: "PAUSED", presenceGraceEndsAt: { lte: now } },
  });
  for (const s of expiredPauses) {
    // Billable time up to the pause is already committed (billedSeconds/amountPaise/lastBilledAt
    // were frozen at the moment of pausing) — ending here adds nothing further for the gap.
    await endSession(s.id, "DISCONNECTED");
  }
}

function ensureSweepRunning(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    sweepExpiredState().catch((err) => console.error("[chat.billing] sweepExpiredState failed:", err));
  }, SWEEP_INTERVAL_MS);
}

/**
 * Called once at server startup. Every session the database thinks is ACTIVE survived an
 * unknown amount of downtime — treated exactly like a disconnect (paused, not blindly resumed),
 * because there is no way to know whether anyone was actually present during the outage.
 * Billing never resumes from `lastBilledAt` blindly; it resumes only once fresh presence
 * (post-restart heartbeats) re-establishes both sides, via the same `maybeResumeFromPause` path
 * a normal reconnect uses.
 */
export async function resumeAllActiveSessions(): Promise<void> {
  const now = new Date();

  const activeSessions = await prisma.chatSession.findMany({ where: { status: "ACTIVE" } });
  for (const s of activeSessions) {
    const presenceGraceEndsAt = new Date(now.getTime() + RECONNECT_GRACE_MS);
    await prisma.chatSession.update({
      where: { id: s.id },
      data: { status: "PAUSED", pausedAt: now, presenceGraceEndsAt },
    });
  }

  await sweepExpiredState(); // catches any REQUESTED/PAUSED deadline that passed entirely during the outage

  // Whatever's still PAUSED after the sweep (grace not yet expired) needs its timer-equivalent
  // re-armed — handled by ensureSweepRunning's interval, not a per-session setTimeout, so no
  // in-memory state needs to survive for this to be correct.
  ensureSweepRunning();

  if (activeSessions.length) {
    console.log(`[chat.billing] paused ${activeSessions.length} session(s) active before restart — awaiting fresh presence`);
  }
}
