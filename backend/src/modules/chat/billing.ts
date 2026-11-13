// Server-authoritative per-session billing orchestration. The DATABASE (ChatSession.lastBilledAt,
// billedSeconds, amountPaise, freeSecondsUsed) is the only source of truth — the in-memory `timers` map is
// just a scheduler for re-checking it every BILLING_TICK_MS; losing it (a restart) only means billing resumes
// late, never that a session double-charges or forgets elapsed time.
//
// ALL money movement lives in ./settlement.ts (settleSession): this file decides WHEN to settle and THROUGH
// WHICH INSTANT, then publishes the result over Socket.IO. It contains no billing arithmetic of its own.
//
// Presence (who's actually connected right now) is tracked in memory only — it is a liveness signal, not a
// source of truth. The moment either side's presence lapses, the session is PAUSED and that transition
// (pausedAt, presenceGraceEndsAt) IS persisted, so a second restart during a pause still knows exactly when
// the grace window ends. Billing never advances while paused, never bills the detection grace, and resuming
// never retroactively bills the paused interval.
import type { Server as SocketIOServer } from "socket.io";
import type { ChatEndReason, ChatSenderRole } from "@prisma/client";
import prisma from "@root/prisma.js";
import { cumulativeChargeDue, affordablePaidSeconds } from "./billingFormula.js";
import { settleSession, type SettleOutcome } from "./settlement.js";
import { BILLING_TICK_MS, CONFIRMED_PRESENCE_WINDOW_MS, PRESENCE_TIMEOUT_MS, RECONNECT_GRACE_MS, SWEEP_INTERVAL_MS } from "./chat.constants.js";

// The one billing formula lives in ./billingFormula.ts; re-exported here so existing imports keep working.
export { cumulativeChargeDue, affordablePaidSeconds };

const timers = new Map<string, NodeJS.Timeout>();
/** One-shot timers that end a session at the exact second its funds (or free cap) run out. */
const exhaustionGuards = new Map<string, NodeJS.Timeout>();
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
  const guard = exhaustionGuards.get(sessionId);
  if (guard) {
    clearTimeout(guard);
    exhaustionGuards.delete(sessionId);
  }
}

/**
 * Stops every per-session billing timer and the expiry sweep — used only during process shutdown so no
 * tick fires against a closing database. Nothing is settled or ended here: session state lives in the
 * database, and the next startup's resumeAllActiveSessions() pauses whatever was ACTIVE.
 */
export function stopBillingTimers(): void {
  for (const timer of timers.values()) clearInterval(timer);
  timers.clear();
  for (const guard of exhaustionGuards.values()) clearTimeout(guard);
  exhaustionGuards.clear();
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

// ============================================================================
// Presence — in-memory only, intentionally. The persisted PAUSED/presenceGraceEndsAt state is
// what survives a restart; this map is just "has anyone heard from this side in the last
// PRESENCE_TIMEOUT_MS." Tied to the chat window being mounted and socket-connected, never to
// document/tab focus — an unfocused tab keeps heartbeating, a dropped socket does not.
// ============================================================================
type PresenceEntry = {
  /** Last heartbeat per side (ms). */
  user?: number;
  astrologer?: number;
  /** Set when the server SAW that side leave (socket disconnect / chat:leave); cleared by its next heartbeat. */
  userLeftAt?: number;
  astrologerLeftAt?: number;
};
const presence = new Map<string, PresenceEntry>();

/** `atMs` defaults to the wall clock; tests pass a simulated time. A heartbeat also cancels a recorded departure. */
export function recordHeartbeat(sessionId: string, role: ChatSenderRole, atMs: number = Date.now()): void {
  const entry = presence.get(sessionId) ?? {};
  if (role === "USER") {
    entry.user = atMs;
    delete entry.userLeftAt;
  } else {
    entry.astrologer = atMs;
    delete entry.astrologerLeftAt;
  }
  presence.set(sessionId, entry);
  maybeResumeFromPause(sessionId).catch((err) => console.error(`[chat.billing] resume check failed for ${sessionId}:`, err));
}

/**
 * The server reliably observed a participant leave — their last socket for this chat disconnected, or they sent
 * chat:leave. Unlike a silent network loss there is nothing to wait for: billing stops at THIS timestamp and the
 * session is paused immediately (settled through the event instant, in the usual single transaction). The side is
 * treated as absent until its next heartbeat, which also resumes the chat.
 */
export async function recordDeparture(sessionId: string, role: ChatSenderRole, atMs: number = Date.now()): Promise<void> {
  const entry = presence.get(sessionId) ?? {};
  if (role === "USER") entry.userLeftAt = atMs;
  else entry.astrologerLeftAt = atMs;
  presence.set(sessionId, entry);

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (session?.status === "ACTIVE") await pauseSession(sessionId, new Date(atMs));
}

function isPresent(sessionId: string, role: ChatSenderRole, nowMs: number = Date.now()): boolean {
  const entry = presence.get(sessionId);
  const last = role === "USER" ? entry?.user : entry?.astrologer;
  const leftAt = role === "USER" ? entry?.userLeftAt : entry?.astrologerLeftAt;
  return leftAt === undefined && last !== undefined && nowMs - last <= PRESENCE_TIMEOUT_MS;
}

function bothPresent(sessionId: string, nowMs: number = Date.now()): boolean {
  return isPresent(sessionId, "USER", nowMs) && isPresent(sessionId, "ASTROLOGER", nowMs);
}

/**
 * The latest instant through which the chat may be billed. Per side, presence is confirmed through:
 *  - an EXPLICIT departure the server observed (disconnect / leave): that event's timestamp — billing stops there;
 *  - otherwise (silent loss cannot be seen immediately): its last heartbeat + CONFIRMED_PRESENCE_WINDOW_MS, the one
 *    interval that heartbeat vouches for. The further wait until the lapse is DETECTED (PRESENCE_TIMEOUT_MS) is
 *    never billed;
 *  - never heard from (e.g. just after a restart): 0 — nothing is billed for time nobody confirmed.
 * The chat is billable through min(now, user's confirmed instant, astrologer's confirmed instant). In a healthy chat
 * that is simply `now`, which is what lets it stop at the exact second funds run out (the affordability cap itself is
 * enforced inside settleSession, whatever instant is passed in).
 * `presentRole` marks the side performing the action (an end click is itself proof that side is present).
 */
function confirmedThroughMs(sessionId: string, nowMs: number, presentRole?: ChatSenderRole): number {
  const entry = presence.get(sessionId) ?? {};
  const sideThrough = (role: ChatSenderRole, last: number | undefined, leftAt: number | undefined): number => {
    if (presentRole === role) return nowMs;
    if (last === undefined) return 0;
    const vouched = last + CONFIRMED_PRESENCE_WINDOW_MS;
    return leftAt === undefined ? vouched : Math.min(leftAt, vouched);
  };
  return Math.max(0, Math.min(nowMs, sideThrough("USER", entry.user, entry.userLeftAt), sideThrough("ASTROLOGER", entry.astrologer, entry.astrologerLeftAt)));
}

// ============================================================================
// Publishing a settlement outcome to the participants.
// ============================================================================
function publish(sessionId: string, outcome: SettleOutcome): void {
  const session = outcome.session;
  if (!session || outcome.kind === "NOOP") return;

  if (outcome.kind === "ENDED") {
    unregisterSession(sessionId);
    presence.delete(sessionId);
    const reason = outcome.endedReason;
    emitToRoom(roomForSession(sessionId), "chat:ended", { sessionId, reason });
    emitToRoom(roomForAstrologer(session.astrologerProfileId), "chat:session-ended", { sessionId, reason });
    return;
  }

  if (outcome.kind === "PAUSED") {
    emitToRoom(roomForSession(sessionId), "chat:paused", { sessionId, graceEndsAt: session.presenceGraceEndsAt });
    return;
  }

  if (outcome.warningIssuedNow) {
    emitToRoom(roomForSession(sessionId), "chat:low-balance-warning", { sessionId, remainingSeconds: outcome.remainingSeconds });
  }
  if (session.type !== "PAID") {
    emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds: outcome.remainingSeconds, balancePaise: null });
  } else if ((outcome.freeSecondsRemaining ?? 0) > 0 && session.amountPaise === 0) {
    // Still inside the free allowance: nothing paid yet.
    emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds: null, balancePaise: null, freeSecondsRemaining: outcome.freeSecondsRemaining });
  } else {
    emitToRoom(roomForSession(sessionId), "chat:timer", { sessionId, remainingSeconds: outcome.remainingSeconds, balancePaise: outcome.balancePaise });
  }
  armExhaustionGuard(sessionId, outcome);
}

/**
 * Between 5-second ticks a user could outrun their funds. This arms a one-shot timer for the exact instant the
 * remaining runway ends, so the chat stops at the boundary second instead of up to one tick late — there is no
 * unpaid grace period. It re-arms on every settlement and is cleared with the session's other timers.
 */
function armExhaustionGuard(sessionId: string, outcome: SettleOutcome): void {
  const existing = exhaustionGuards.get(sessionId);
  if (existing) clearTimeout(existing);
  exhaustionGuards.delete(sessionId);
  if (!timers.has(sessionId) || !outcome.session || outcome.remainingSeconds === null) return; // not a live, scheduled session
  const boundaryMs = outcome.session.lastBilledAt.getTime() + outcome.remainingSeconds * 1000;
  const delay = Math.min(2_147_000_000, Math.max(0, boundaryMs - Date.now()));
  const guard = setTimeout(() => {
    exhaustionGuards.delete(sessionId);
    tick(sessionId, new Date(boundaryMs)).catch((err) => console.error(`[chat.billing] exhaustion guard failed for ${sessionId}:`, err));
  }, delay);
  exhaustionGuards.set(sessionId, guard);
}

async function pauseSession(sessionId: string, now: Date): Promise<void> {
  unregisterSession(sessionId); // fully stopped — no tick fires at all while paused, not merely a tick that computes zero
  // Settle everything that was confirmed (both present) up to the lapse, THEN freeze — in one transaction.
  const outcome = await settleSession({
    sessionId,
    asOf: new Date(confirmedThroughMs(sessionId, now.getTime())),
    now,
    pause: { graceEndsAt: new Date(now.getTime() + RECONNECT_GRACE_MS) },
  });
  publish(sessionId, outcome);
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

/**
 * Exported for direct testing — the full per-tick logic without waiting on real BILLING_TICK_MS timers.
 * `now` is the instant being billed through (the wall clock in production; simulated in tests).
 */
export async function tick(sessionId: string, now: Date = new Date()): Promise<void> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (!session || session.status !== "ACTIVE") {
    unregisterSession(sessionId);
    return;
  }
  if (!bothPresent(sessionId, now.getTime())) {
    await pauseSession(sessionId, now);
    return;
  }
  publish(sessionId, await settleSession({ sessionId, asOf: new Date(confirmedThroughMs(sessionId, now.getTime())), now }));
}

/**
 * Ends a session through the SAME settlement function a tick uses: whatever time has accrued since the last
 * settlement (through the last instant both sides were confirmed present) is billed, the reservation is
 * released and the status flips to ENDED — atomically. Idempotent: ending an already-ended session is a no-op.
 */
export async function endSession(sessionId: string, reason: ChatEndReason, now: Date = new Date()) {
  unregisterSession(sessionId);
  const presentRole: ChatSenderRole | undefined = reason === "USER_ENDED" ? "USER" : reason === "ASTROLOGER_ENDED" ? "ASTROLOGER" : undefined;
  const asOf = new Date(confirmedThroughMs(sessionId, now.getTime(), presentRole));
  try {
    const outcome = await settleSession({ sessionId, asOf, now, endReason: reason });
    publish(sessionId, outcome);
    if (outcome.kind === "NOOP") presence.delete(sessionId);
    return outcome.session ?? (await prisma.chatSession.findUnique({ where: { id: sessionId } }));
  } catch (err) {
    // The settlement rolled back, so the session is still live in the database: put its timer back rather
    // than leaving it ACTIVE with nothing billing it.
    const still = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { status: true } }).catch(() => null);
    if (still?.status === "ACTIVE") registerSession(sessionId);
    throw err;
  }
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
 * a normal reconnect uses. Time between the last settlement and the crash is deliberately NOT billed:
 * it cannot be known to have been delivered.
 */
export async function resumeAllActiveSessions(): Promise<void> {
  const now = new Date();

  const activeSessions = await prisma.chatSession.findMany({ where: { status: "ACTIVE" } });
  for (const s of activeSessions) {
    const presenceGraceEndsAt = new Date(now.getTime() + RECONNECT_GRACE_MS);
    await prisma.chatSession.updateMany({
      where: { id: s.id, status: "ACTIVE" },
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
