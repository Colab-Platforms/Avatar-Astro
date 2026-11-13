// THE one place chat time becomes money.
//
// Every path that bills a chat — the periodic tick, a pause, a user/astrologer ending, wallet exhaustion, the
// free-limit cap, the disconnect timeout — goes through settleSession(). There is no second formula and no
// second code path: a "final" settlement is the same function with a terminal reason, so a tick and an end
// can never disagree about what a second costs.
//
// One database transaction does, in this order:
//   1. lock the chat_sessions row (FOR UPDATE)            — serialises concurrent ticks / ends / pauses
//   2. claim free-allowance seconds (row lock)            — global 60s, consumed first
//   3. lock the wallet                                    — lock order is always session -> allowance -> wallet
//   4. cap the target to what the user can afford         — affordablePaidSeconds(), the exact inverse of the charge formula
//   5. charge cumulativeChargeDue(target) - alreadyCharged against the rolling reservation (promo-first buckets)
//   6. advance the billing cursor by WHOLE seconds only   — fractional time between ticks is preserved, never lost
//   7. update session counters, and (if terminal/pausing) the status, in the same statement
//   8. release the reservation on a terminal path
// If any step throws, the whole transaction rolls back: free seconds, wallet, reservation and session counters
// move together or not at all. Retrying is safe: the cursor is persisted state, so a repeated call finds
// nothing left to bill, and the ledger idempotency key is derived from the persisted cumulative seconds.
import type { ChatEndReason, ChatSession, Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";
import { getOrCreateWallet, lockWallet, createReservation, topUpReservation, releaseReservation, settleFromReservation } from "@/modules/payment/wallet.service.js";
import { getOrCreateFreeAllowance, claimFreeSecondsTx } from "./freeAllowance.service.js";
import { affordablePaidSeconds, cumulativeChargeDue } from "./billingFormula.js";
import { CHAT_RESERVATION_LOOKAHEAD_SECONDS, FREE_TRIAL_SECONDS, LOW_BALANCE_WARNING_SECONDS } from "./chat.constants.js";

export interface SettleRequest {
  sessionId: string;
  /** Bill through this instant. The caller clamps it to the last moment both sides were confirmed present. */
  asOf: Date;
  /** Wall-clock time of the event itself (becomes endedAt / pausedAt). */
  now: Date;
  /** Settle, then END the session with this reason, in the same transaction. */
  endReason?: ChatEndReason;
  /** Settle, then PAUSE the session in the same transaction. */
  pause?: { graceEndsAt: Date };
}

export type SettleKind = "NOOP" | "SETTLED" | "PAUSED" | "ENDED";

export interface SettleOutcome {
  kind: SettleKind;
  session: ChatSession | null;
  endedReason: ChatEndReason | null;
  /** Whole seconds the billing cursor advanced in this call. */
  billedDeltaSeconds: number;
  chargedPaise: number;
  freeClaimedSeconds: number;
  /** Seconds the session can still run (free + paid affordable; or the complimentary cap left). null on NOOP. */
  remainingSeconds: number | null;
  freeSecondsRemaining: number | null;
  /** PAID only: the wallet balance after settlement. */
  balancePaise: number | null;
  /** True the first time the low-balance warning threshold is crossed. */
  warningIssuedNow: boolean;
  /** True once paid (not free) seconds are being billed. */
  paidPhase: boolean;
}

const noop = (session: ChatSession | null): SettleOutcome => ({
  kind: "NOOP", session, endedReason: null, billedDeltaSeconds: 0, chargedPaise: 0, freeClaimedSeconds: 0,
  remainingSeconds: null, freeSecondsRemaining: null, balancePaise: null, warningIssuedNow: false, paidPhase: false,
});

/** Releases every HELD chat hold for the session (normally exactly one). Idempotent. */
async function releaseChatHolds(tx: Prisma.TransactionClient, sessionId: string): Promise<void> {
  const holds = await tx.walletReservation.findMany({ where: { referenceId: sessionId, purpose: "CHAT_LOOKAHEAD", status: "HELD" } });
  for (const hold of holds) await releaseReservation(hold.id, tx);
}

async function heldChatReservations(tx: Prisma.TransactionClient, sessionId: string) {
  return tx.walletReservation.findMany({ where: { referenceId: sessionId, purpose: "CHAT_LOOKAHEAD", status: "HELD" }, orderBy: { createdAt: "asc" } });
}

export async function settleSession(req: SettleRequest): Promise<SettleOutcome> {
  // Rows whose first-time creation can race must exist BEFORE the transaction opens: a failed INSERT inside
  // a Postgres transaction poisons the whole transaction.
  const pre = await prisma.chatSession.findUnique({ where: { id: req.sessionId }, select: { userId: true, type: true, status: true } });
  if (!pre || pre.status === "ENDED") return noop(null);
  if (pre.type === "PAID") {
    await getOrCreateWallet(pre.userId);
    await getOrCreateFreeAllowance(pre.userId);
  }
  return prisma.$transaction((tx) => settleInTransaction(tx, req), { timeout: 20_000, maxWait: 10_000 });
}

async function settleInTransaction(tx: Prisma.TransactionClient, req: SettleRequest): Promise<SettleOutcome> {
  const { sessionId, now } = req;

  // 1. Serialise everything that touches this session.
  await tx.$queryRaw`SELECT id FROM chat_sessions WHERE id = ${sessionId} FOR UPDATE`;
  const session = await tx.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) return noop(null);
  if (session.status === "ENDED") return noop(session); // idempotent: a second end/tick finds nothing to do

  const terminal = req.endReason ?? null;

  // Time only accrues while ACTIVE. REQUESTED / PAUSED sessions have nothing to bill; ending one just closes it.
  if (session.status !== "ACTIVE") {
    if (!terminal) return noop(session);
    await releaseChatHolds(tx, sessionId);
    const ended = await tx.chatSession.update({ where: { id: sessionId }, data: { status: "ENDED", endedAt: now, endedReason: terminal, pausedAt: null, presenceGraceEndsAt: null } });
    return { ...noop(ended), kind: "ENDED", endedReason: terminal };
  }

  const cursorMs = session.lastBilledAt.getTime();
  const elapsed = Math.max(0, Math.floor((req.asOf.getTime() - cursorMs) / 1000));

  // ---- COMPLIMENTARY / legacy FREE_TRIAL: capped, unmetered, never touches the wallet or the allowance ----
  if (session.type !== "PAID") {
    const limit = session.freeLimitSeconds ?? FREE_TRIAL_SECONDS;
    const consumable = Math.max(0, Math.min(elapsed, limit - session.billedSeconds));
    const billed = session.billedSeconds + consumable;
    const remaining = Math.max(0, limit - billed);
    const endReason: ChatEndReason | null = terminal ?? (remaining <= 0 ? "FREE_LIMIT_REACHED" : null);
    const warnNow = !session.warningIssued && !endReason && remaining <= LOW_BALANCE_WARNING_SECONDS;
    const data: Prisma.ChatSessionUpdateInput = { billedSeconds: billed, lastBilledAt: new Date(cursorMs + consumable * 1000), warningIssued: session.warningIssued || warnNow };
    return finish(tx, session, data, { endReason, pause: req.pause, now, delta: consumable, charged: 0, freeClaimed: 0, remaining, freeLeft: null, balance: null, warnNow, paid: false });
  }

  // ---- PAID ----
  const rate = session.ratePerMinutePaise;
  // 2. Free allowance first (row lock). Claimed inside this transaction: it rolls back with everything else.
  const { claimed, remaining: freeLeft } = await claimFreeSecondsTx(tx, session.userId, elapsed);
  // 3. Wallet.
  const walletId = (await tx.wallet.findUniqueOrThrow({ where: { userId: session.userId }, select: { id: true } })).id;
  const wallet = await lockWallet(tx, walletId);
  const holds = await heldChatReservations(tx, sessionId);
  const ownHeld = holds.reduce((n, h) => n + h.amountPaise, 0);
  const spendable = wallet.balancePaise - (wallet.reservedBalancePaise - ownHeld); // everything not held for someone else

  const billedAfter = session.billedSeconds + elapsed;
  const freeAfter = session.freeSecondsUsed + claimed;

  // 4. Cap the paid target to what the user can afford (same formula as the charge, inverted).
  const maxPaidSeconds = affordablePaidSeconds(session.amountPaise + spendable, rate);
  let paidTarget = billedAfter - freeAfter;
  let exhausted = false;
  if (paidTarget > maxPaidSeconds) {
    exhausted = true;
    paidTarget = Math.max(session.billedSeconds - session.freeSecondsUsed, maxPaidSeconds);
  }

  // 5. Charge exactly what the cumulative formula says is now due, less what was already charged.
  let newCharge = Math.max(0, cumulativeChargeDue(paidTarget, rate) - session.amountPaise);
  let charged = 0;
  if (newCharge > 0) {
    let reservation: (typeof holds)[number] | null = holds[0] ?? null;
    if (!reservation) {
      // A free-only session starts without a hold; the first paid second creates it.
      const lookahead = Math.ceil((rate * CHAT_RESERVATION_LOOKAHEAD_SECONDS) / 60);
      reservation = (await createReservation(walletId, Math.max(lookahead, newCharge), "CHAT_LOOKAHEAD", sessionId, tx)).reservation;
    }
    if (reservation) {
      const result = await settleFromReservation(
        reservation.id, newCharge, "CHAT_CONSUMPTION",
        { referenceId: sessionId, idempotencyKey: `chat-settle:${sessionId}:${freeAfter + paidTarget}` }, tx,
      );
      charged = result.charged;
    }
    if (charged < newCharge) {
      // Funds shrank underneath us (should be impossible while the wallet is locked). Cap to what was really paid.
      exhausted = true;
      paidTarget = Math.max(session.billedSeconds - session.freeSecondsUsed, affordablePaidSeconds(session.amountPaise + charged, rate));
    }
  }

  const amountAfter = session.amountPaise + charged;
  const billedFinal = freeAfter + paidTarget;
  const advanced = billedFinal - session.billedSeconds; // whole seconds only: the fraction stays in the cursor

  // Remaining runway after this settlement, from the same formula.
  const walletAfter = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
  const holdsAfter = await heldChatReservations(tx, sessionId);
  const heldAfter = holdsAfter.reduce((n, h) => n + h.amountPaise, 0);
  const spendableAfter = walletAfter.balancePaise - (walletAfter.reservedBalancePaise - heldAfter);
  const paidSoFar = billedFinal - freeAfter;
  const remainingPaid = Math.max(0, affordablePaidSeconds(amountAfter + spendableAfter, rate) - paidSoFar);
  const remaining = freeLeft + remainingPaid;

  // No unpaid grace: the moment neither free seconds nor paid funds can cover another second, the chat ends.
  const endReason: ChatEndReason | null = terminal ?? (exhausted || remaining <= 0 ? "BALANCE_EXHAUSTED" : null);
  const warnNow = !session.warningIssued && !endReason && remaining <= LOW_BALANCE_WARNING_SECONDS;

  // Keep the rolling hold topped up for the next stretch (not when the chat is over).
  if (!endReason && !req.pause && holdsAfter[0]) {
    await topUpReservation(holdsAfter[0].id, Math.ceil((rate * CHAT_RESERVATION_LOOKAHEAD_SECONDS) / 60), tx);
  }

  const data: Prisma.ChatSessionUpdateInput = {
    billedSeconds: billedFinal,
    freeSecondsUsed: freeAfter,
    amountPaise: amountAfter,
    lastBilledAt: new Date(cursorMs + advanced * 1000),
    warningIssued: session.warningIssued || warnNow,
  };
  return finish(tx, session, data, {
    endReason, pause: req.pause, now, delta: advanced, charged, freeClaimed: claimed,
    remaining, freeLeft, balance: walletAfter.balancePaise, warnNow, paid: freeLeft <= 0 || amountAfter > 0,
  });
}

interface FinishArgs {
  endReason: ChatEndReason | null;
  pause?: { graceEndsAt: Date };
  now: Date;
  delta: number;
  charged: number;
  freeClaimed: number;
  remaining: number;
  freeLeft: number | null;
  balance: number | null;
  warnNow: boolean;
  paid: boolean;
}

async function finish(tx: Prisma.TransactionClient, session: ChatSession, data: Prisma.ChatSessionUpdateInput, a: FinishArgs): Promise<SettleOutcome> {
  let kind: SettleKind = "SETTLED";
  if (a.endReason) {
    await releaseChatHolds(tx, session.id);
    Object.assign(data, { status: "ENDED", endedAt: a.now, endedReason: a.endReason, pausedAt: null, presenceGraceEndsAt: null });
    kind = "ENDED";
  } else if (a.pause) {
    Object.assign(data, { status: "PAUSED", pausedAt: a.now, presenceGraceEndsAt: a.pause.graceEndsAt });
    kind = "PAUSED";
  }
  const updated = await tx.chatSession.update({ where: { id: session.id }, data });
  return {
    kind, session: updated, endedReason: a.endReason, billedDeltaSeconds: a.delta, chargedPaise: a.charged, freeClaimedSeconds: a.freeClaimed,
    remainingSeconds: a.remaining, freeSecondsRemaining: a.freeLeft, balancePaise: a.balance, warningIssuedNow: a.warnNow, paidPhase: a.paid,
  };
}
