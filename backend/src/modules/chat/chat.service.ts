import prisma from "@root/prisma.js";
import type { ChatSenderRole } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { getOrCreateWallet, createReservation } from "@/modules/payment/wallet.service.js";
import { getRemainingFreeSeconds } from "./freeAllowance.service.js";
import * as billing from "./billing.js";
import {
  MIN_BILLABLE_SECONDS,
  MAX_MESSAGE_LENGTH,
  CHAT_RESERVATION_LOOKAHEAD_SECONDS,
  REQUEST_ACCEPT_TIMEOUT_MS,
  DEFAULT_COMPLIMENTARY_MAX_SECONDS,
} from "./chat.constants.js";

const COMPLIMENTARY_MAX_SECONDS_SETTING_KEY = "chat.complimentaryMaxSeconds";

async function resolveComplimentaryMaxSeconds(profile: { complimentaryMaxSeconds: number | null }): Promise<number> {
  if (profile.complimentaryMaxSeconds != null) return profile.complimentaryMaxSeconds;
  const setting = await prisma.platformSetting.findUnique({ where: { key: COMPLIMENTARY_MAX_SECONDS_SETTING_KEY } });
  const value = setting ? Number(setting.value) : NaN;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_COMPLIMENTARY_MAX_SECONDS;
}

/** How much wallet balance a PAID session actually needs up front, after crediting whatever
 * free seconds the user still has globally — a user with a full 60s remaining needs nothing at
 * all to start a short chat; Rule C (free before purchased) applies the same way at billing time. */
async function minimumPaidBalanceRequired(userId: string, ratePerMinutePaise: number): Promise<number> {
  const remainingFree = await getRemainingFreeSeconds(userId);
  const billableFloorSeconds = Math.max(0, MIN_BILLABLE_SECONDS - remainingFree);
  return Math.ceil((ratePerMinutePaise * billableFloorSeconds) / 60);
}

const PENDING_OR_LIVE_STATUSES: ("REQUESTED" | "ACTIVE" | "PAUSED")[] = ["REQUESTED", "ACTIVE", "PAUSED"];

/**
 * Role is resolved per session from the session itself (is this userId the `userId` on
 * the session, or the owner of its `astrologerProfile`?) — never pre-asserted by the
 * caller. An account that is both a customer and (separately) an approved astrologer
 * must still be able to chat as a plain customer; trusting a caller-supplied role would
 * force every socket event from such an account onto one side regardless of which
 * session it's actually acting in.
 */
async function resolveActor(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      astrologerProfile: { select: { userId: true, displayName: true, profilePhotoUrl: true, slug: true } },
      user: { select: { firstName: true, lastName: true, profileImage: true } },
    },
  });
  if (!session) throw new ApiError("Chat session not found", STATUS_CODES.NOT_FOUND);

  const role: ChatSenderRole | null =
    session.userId === userId ? "USER" : session.astrologerProfile.userId === userId ? "ASTROLOGER" : null;
  if (!role) throw new ApiError("You do not have access to this chat", STATUS_CODES.FORBIDDEN);

  return { session, role };
}

async function requireAvailableProfile(astrologerProfileId: string) {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { id: astrologerProfileId },
    select: {
      id: true,
      userId: true,
      pricePerMinute: true,
      isPublished: true,
      suspendedAt: true,
      displayName: true,
      profilePhotoUrl: true,
      isComplimentary: true,
      complimentaryMaxSeconds: true,
    },
  });
  if (!profile || !profile.isPublished || profile.suspendedAt) {
    throw new ApiError("This astrologer is not available right now.", STATUS_CODES.NOT_FOUND);
  }
  return profile;
}

export async function getEligibility(userId: string, astrologerProfileId: string) {
  const profile = await requireAvailableProfile(astrologerProfileId);

  // An already-pending/active/paused session is always resumable.
  const activeSession = await prisma.chatSession.findFirst({
    where: { userId, astrologerProfileId, status: { in: PENDING_OR_LIVE_STATUSES } },
    select: { id: true },
  });

  if (profile.isComplimentary) {
    const freeLimitSeconds = await resolveComplimentaryMaxSeconds(profile);
    return {
      type: "COMPLIMENTARY" as const,
      canStart: true,
      freeLimitSeconds,
      ratePerMinutePaise: 0,
      walletBalancePaise: null as number | null,
      freeAllowanceRemainingSeconds: await getRemainingFreeSeconds(userId),
    };
  }

  if (profile.pricePerMinute == null || profile.pricePerMinute <= 0) {
    // null/zero price means "not priced yet, hidden" — never free. requireAvailableProfile only
    // checks isPublished/suspendedAt, so this case is still reachable and must be rejected here.
    throw new ApiError("This astrologer is not available right now.", STATUS_CODES.NOT_FOUND);
  }

  const ratePerMinutePaise = profile.pricePerMinute * 100;
  const wallet = await getOrCreateWallet(userId);
  const availablePaise = wallet.balancePaise - wallet.reservedBalancePaise;
  const minimumRequiredPaise = await minimumPaidBalanceRequired(userId, ratePerMinutePaise);
  return {
    type: "PAID" as const,
    canStart: Boolean(activeSession) || availablePaise >= minimumRequiredPaise,
    freeLimitSeconds: null as number | null,
    ratePerMinutePaise,
    walletBalancePaise: wallet.balancePaise,
    minimumRequiredPaise,
    freeAllowanceRemainingSeconds: await getRemainingFreeSeconds(userId),
  };
}

/** Postgres's unique-violation error code — used to turn the partial-unique-index guarantee
 * (one REQUESTED/ACTIVE/PAUSED session per user, and per astrologer) into a clean 409, the exact
 * same pattern already used elsewhere in this codebase for `astrologer_documents_one_current_per_requirement`. */
const UNIQUE_VIOLATION = "P2002";

/**
 * Creates a REQUESTED session — nothing is claimed or reserved yet (no free-trial slot, no
 * wallet hold). Those only happen in `acceptSession`, so a rejected or expired request never
 * costs the user anything. Billing registration also only happens on accept — zero billing
 * before a session reaches ACTIVE, per the finalized acceptance-timeout policy.
 */
export async function startSession(userId: string, astrologerProfileId: string) {
  const existing = await prisma.chatSession.findFirst({
    where: { userId, astrologerProfileId, status: { in: PENDING_OR_LIVE_STATUSES } },
  });
  if (existing) return existing;

  const profile = await requireAvailableProfile(astrologerProfileId);

  let type: "PAID" | "COMPLIMENTARY";
  let ratePerMinutePaise = 0;
  let freeLimitSeconds: number | null = null;

  if (profile.isComplimentary) {
    type = "COMPLIMENTARY";
    freeLimitSeconds = await resolveComplimentaryMaxSeconds(profile);
    // Fully free, unmetered up to the cap — no wallet check, no free-allowance interaction at all.
  } else {
    if (profile.pricePerMinute == null || profile.pricePerMinute <= 0) {
      throw new ApiError("This astrologer is not available right now.", STATUS_CODES.NOT_FOUND);
    }
    type = "PAID";
    ratePerMinutePaise = profile.pricePerMinute * 100;
    const wallet = await getOrCreateWallet(userId);
    const minimumRequiredPaise = await minimumPaidBalanceRequired(userId, ratePerMinutePaise);
    if (wallet.balancePaise - wallet.reservedBalancePaise < minimumRequiredPaise) {
      throw new ApiError("Your wallet balance is too low to start this chat. Please recharge.", STATUS_CODES.FORBIDDEN);
    }
  }

  const now = new Date();
  try {
    const session = await prisma.chatSession.create({
      data: {
        userId,
        astrologerProfileId,
        type,
        ratePerMinutePaise,
        freeLimitSeconds,
        requestedAt: now,
        requestExpiresAt: new Date(now.getTime() + REQUEST_ACCEPT_TIMEOUT_MS),
      },
    });
    billing.notifyNewSession(astrologerProfileId, session);
    return session;
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new ApiError("You already have a pending or active chat.", STATUS_CODES.CONFLICT);
    }
    throw err;
  }
}

async function requireRequestedSessionForAstrologer(sessionId: string, astrologerUserId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { astrologerProfile: { select: { userId: true } } },
  });
  if (!session) throw new ApiError("Chat request not found", STATUS_CODES.NOT_FOUND);
  if (session.astrologerProfile.userId !== astrologerUserId) throw new ApiError("You do not have access to this chat", STATUS_CODES.FORBIDDEN);
  if (session.status !== "REQUESTED") throw new ApiError("This request is no longer pending", STATUS_CODES.CONFLICT);
  if (session.requestExpiresAt && session.requestExpiresAt.getTime() < Date.now()) {
    throw new ApiError("This request has expired", STATUS_CODES.CONFLICT);
  }
  return session;
}

/**
 * The astrologer accepts a REQUESTED session. This is the ONLY place a free-trial slot is
 * claimed or a wallet reservation is created — a rejected/expired request never consumes either.
 */
export async function acceptSession(sessionId: string, astrologerUserId: string) {
  const accepted = await prisma.$transaction(async (tx) => {
    const session = await requireRequestedSessionForAstrologer(sessionId, astrologerUserId);

    if (session.type === "COMPLIMENTARY") {
      // Nothing to claim or reserve — fully free, unmetered up to freeLimitSeconds.
    } else {
      const wallet = await tx.wallet.upsert({ where: { userId: session.userId }, update: {}, create: { userId: session.userId } });
      const minimumRequiredPaise = await minimumPaidBalanceRequired(session.userId, session.ratePerMinutePaise);
      if (wallet.balancePaise - wallet.reservedBalancePaise < minimumRequiredPaise) {
        throw new ApiError("The user's wallet balance is no longer sufficient for this chat.", STATUS_CODES.FORBIDDEN);
      }
      const lookaheadAmount = Math.ceil((session.ratePerMinutePaise * CHAT_RESERVATION_LOOKAHEAD_SECONDS) / 60);
      await createReservation(wallet.id, lookaheadAmount, "CHAT_LOOKAHEAD", session.id, tx);
    }

    const now = new Date();
    return tx.chatSession.update({
      where: { id: sessionId },
      data: { status: "ACTIVE", acceptedAt: now, startedAt: now, lastBilledAt: now },
    });
  });

  billing.registerSession(accepted.id);
  billing.emitToRoom(billing.roomForSession(accepted.id), "chat:accepted", { sessionId: accepted.id });
  return accepted;
}

/** The astrologer declines a REQUESTED session — nothing was ever claimed or reserved, so there is nothing to release. */
export async function rejectSession(sessionId: string, astrologerUserId: string) {
  const session = await requireRequestedSessionForAstrologer(sessionId, astrologerUserId);
  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: "ENDED", endedAt: new Date(), endedReason: "REJECTED" },
  });
  billing.emitToRoom(billing.roomForSession(session.id), "chat:ended", { sessionId: session.id, reason: "REJECTED" });
  return updated;
}

export async function getActorRole(sessionId: string, userId: string): Promise<ChatSenderRole> {
  const { role } = await resolveActor(sessionId, userId);
  return role;
}

export async function endSessionByActor(sessionId: string, userId: string) {
  const { role } = await resolveActor(sessionId, userId);
  const reason = role === "USER" ? "USER_ENDED" : "ASTROLOGER_ENDED";
  return billing.endSession(sessionId, reason);
}

/** Every ChatSession between this pair is one continuous conversation to the two people in it —
 * a new paid session after a prior one ended is a new billing episode, not a new conversation.
 * Message history (read and unread-marking) must span all of them, or ending a chat and starting
 * a new one with the same astrologer would make the earlier messages unreachable. */
async function peerSessionIds(sessionId: string, userId: string): Promise<{ sessionIds: string[]; role: ChatSenderRole }> {
  const { session, role } = await resolveActor(sessionId, userId);
  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.userId, astrologerProfileId: session.astrologerProfileId },
    select: { id: true },
  });
  return { sessionIds: sessions.map((s) => s.id), role };
}

export async function postMessage(sessionId: string, userId: string, content: string) {
  const { session, role } = await resolveActor(sessionId, userId);
  if (session.status !== "ACTIVE") throw new ApiError("This chat has ended", STATUS_CODES.CONFLICT);

  const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed) throw new ApiError("Message cannot be empty", STATUS_CODES.BAD_REQUEST);

  const message = await prisma.chatMessage.create({
    data: { sessionId, senderRole: role, senderId: userId, content: trimmed },
  });
  return message;
}

export async function markRead(sessionId: string, userId: string) {
  const { sessionIds, role } = await peerSessionIds(sessionId, userId);
  const otherRole: ChatSenderRole = role === "USER" ? "ASTROLOGER" : "USER";
  await prisma.chatMessage.updateMany({
    where: { sessionId: { in: sessionIds }, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getMessages(sessionId: string, userId: string, cursor?: string, take = 50) {
  const { sessionIds } = await peerSessionIds(sessionId, userId);
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: { in: sessionIds } },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return messages.reverse();
}

export async function getSession(sessionId: string, userId: string) {
  const { session } = await resolveActor(sessionId, userId);
  return session;
}

export async function listUserConversations(userId: string) {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      astrologerProfile: { select: { id: true, displayName: true, profilePhotoUrl: true, slug: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  // One row per astrologer, not one per ChatSession — a new paid consultation with the same
  // astrologer after a prior one ended is a new billing event internally, but it must read as
  // the same conversation thread, not a second entry for the same person. Rows are already
  // ordered updatedAt desc, so the first one seen per astrologer is the most recent.
  const seen = new Set<string>();
  const deduped = sessions.filter((s) => {
    if (seen.has(s.astrologerProfileId)) return false;
    seen.add(s.astrologerProfileId);
    return true;
  });
  return deduped.map((s) => ({
    sessionId: s.id,
    status: s.status,
    type: s.type,
    astrologer: s.astrologerProfile,
    lastMessage: s.messages[0] ?? null,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
  }));
}

export async function listAstrologerConversations(astrologerProfileId: string) {
  const sessions = await prisma.chatSession.findMany({
    where: { astrologerProfileId },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const unreadCounts = await prisma.chatMessage.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessions.map((s) => s.id) }, senderRole: "USER", readAt: null },
    _count: { _all: true },
  });
  const unreadBySession = new Map(unreadCounts.map((u) => [u.sessionId, u._count._all]));

  // One row per user, not one per ChatSession (same reasoning as listUserConversations) — unread
  // counts from that user's older sessions with this astrologer are folded into the row that's
  // actually shown, so a stale unread count from a since-ended session is never silently dropped.
  const seen = new Map<string, number>();
  const representative: typeof sessions = [];
  for (const s of sessions) {
    const unread = unreadBySession.get(s.id) ?? 0;
    if (seen.has(s.userId)) {
      seen.set(s.userId, (seen.get(s.userId) ?? 0) + unread);
      continue;
    }
    seen.set(s.userId, unread);
    representative.push(s);
  }

  return representative.map((s) => ({
    sessionId: s.id,
    status: s.status,
    type: s.type,
    user: s.user,
    lastMessage: s.messages[0] ?? null,
    unreadCount: seen.get(s.userId) ?? 0,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
  }));
}
