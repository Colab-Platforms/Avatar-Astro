// Real-time transport for the astrologer chat feature. REST (modules/chat) owns
// creating/ending sessions and the message history; this layer only relays live
// messages/typing and lets billing.ts push timer/ended events into the right rooms.
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "@root/prisma.js";
import { isOriginAllowed } from "@/utils/corsOrigins.js";
import { ApiError } from "@/utils/ApiError.js";
import { logError } from "@/utils/safeError.js";
import * as chatService from "@/modules/chat/chat.service.js";
import type { ChatSenderRole } from "@prisma/client";
import { attachIo, roomForSession, roomForAstrologer, emitToRoom, recordHeartbeat, recordDeparture } from "@/modules/chat/billing.js";
import { MAX_MESSAGE_LENGTH } from "@/modules/chat/chat.constants.js";
import {
  GENERIC_ERROR_MESSAGE,
  SocketPayloadError,
  codeForStatus,
  parseMessagePayload,
  parseSessionPayload,
  parseTypingPayload,
  splitArgs,
  type ChatSocketAck,
} from "./socketValidation.js";

type SocketData = { userId: string; role: "USER" | "ADMIN" | "SUPERADMIN"; astrologerProfileId: string | null };

// Per-astrologer live connection count — presence is "do they have an open socket right
// now", not a manual toggle alone. Cleared on disconnect (with a short grace delay so a
// page refresh doesn't flicker the astrologer offline for a moment).
const astrologerConnections = new Map<string, number>();
const offlineTimers = new Map<string, NodeJS.Timeout>();
const PRESENCE_GRACE_MS = 10_000;

async function setAstrologerOnline(astrologerProfileId: string, isOnline: boolean) {
  await prisma.astrologerProfile.update({
    where: { id: astrologerProfileId },
    data: { isOnline, lastSeenAt: new Date() },
  }).catch((err) => logError("[socket] failed to update astrologer presence:", err));
}

/** Clears the pending "went offline" timers so shutdown doesn't leave them armed. */
export function clearPresenceTimers(): void {
  for (const timer of offlineTimers.values()) clearTimeout(timer);
  offlineTimers.clear();
}

/** Turns anything a handler threw into a typed ack. Expected failures (bad payload, ApiError) keep their
 * message; anything else is logged with secrets stripped and answered with a generic message, so
 * internal details (Prisma/driver text) never reach the client. Never throws. */
function replyWithError(ack: ChatSocketAck, event: string, err: unknown): void {
  try {
    if (err instanceof SocketPayloadError) return ack(err.message, { code: err.code });
    if (err instanceof ApiError) return ack(err.message, { code: codeForStatus(err.statusCode) });
    logError(`[socket] ${event} failed:`, err);
    ack(GENERIC_ERROR_MESSAGE, { code: "INTERNAL" });
  } catch {
    /* error reporting itself must not throw */
  }
}

/**
 * Registers an event handler that cannot crash the process: raw arguments are split into
 * (payload, ack) defensively, and any synchronous throw or async rejection from the handler — including
 * a malformed payload — is converted into a typed ack instead of an unhandled rejection.
 */
function handle(
  socket: Socket,
  event: string,
  handler: (payload: unknown, ack: ChatSocketAck, userId: string) => void | Promise<void>,
): void {
  socket.on(event, (...args: unknown[]) => {
    const { payload, ack } = splitArgs(args);
    const userId = (socket.data as Partial<SocketData> | undefined)?.userId;
    const run = async () => {
      if (!userId) throw new ApiError("Authentication required", 401);
      await handler(payload, ack, userId);
    };
    run().catch((err) => replyWithError(ack, event, err)).catch(() => undefined);
  });
}

// Which chat sessions each socket has joined, and as which side — so that when the socket leaves or disconnects
// the server knows exactly which participant of which chat just went away.
const joinedSessions = new WeakMap<Socket, Map<string, ChatSenderRole>>();

function trackJoin(socket: Socket, sessionId: string, role: ChatSenderRole): void {
  let joined = joinedSessions.get(socket);
  if (!joined) joinedSessions.set(socket, (joined = new Map()));
  joined.set(sessionId, role);
}

/**
 * Tells billing that a participant has left — but only if this was their LAST connection to that chat. A second
 * tab or device of the same person still in the room keeps them present (multi-tab must not pause a chat).
 */
function reportDepartureIfLast(socket: Socket, sessionId: string, role: ChatSenderRole): void {
  try {
    const me = (socket.data as Partial<SocketData> | undefined)?.userId;
    const room = socket.nsp.adapter.rooms.get(roomForSession(sessionId));
    if (room) {
      for (const id of room) {
        if (id === socket.id) continue;
        const other = socket.nsp.sockets.get(id);
        if (other && (other.data as Partial<SocketData> | undefined)?.userId === me) return; // still here on another socket
      }
    }
    recordDeparture(sessionId, role).catch((err) => logError("[socket] failed to record departure:", err));
  } catch (err) {
    logError("[socket] departure check failed:", err);
  }
}

/** The chat event handlers for one authenticated socket (socket.data must already hold the user). */
export function registerChatHandlers(socket: Socket): void {
  // Role is resolved per session inside chat.service (is this userId the session's
  // `userId`, or the owner of its `astrologerProfile`?) — never assumed from whether
  // this account separately happens to have an astrologer profile of its own, which
  // would wrongly force every chat onto one side for an astrologer acting as a customer.
  handle(socket, "chat:join", async (payload, ack, userId) => {
    const { sessionId } = parseSessionPayload(payload);
    await chatService.getSession(sessionId, userId);
    socket.join(roomForSession(sessionId));
    await chatService.markRead(sessionId, userId);
    // Joining counts as an initial heartbeat — without this, a session would read as
    // "absent" for up to PRESENCE_TIMEOUT_MS right after joining, before the client's own
    // first periodic heartbeat arrives.
    const role = await chatService.getActorRole(sessionId, userId);
    trackJoin(socket, sessionId, role);
    recordHeartbeat(sessionId, role);
    ack();
  });

  handle(socket, "chat:heartbeat", async (payload, _ack, userId) => {
    const { sessionId } = parseSessionPayload(payload);
    const role = await chatService.getActorRole(sessionId, userId); // throws unless this user is a participant
    // After an automatic reconnect the client resumes heartbeating on a NEW socket without re-sending chat:join.
    // Re-establish room membership and tracking here, so that socket's later disconnect is still observed.
    socket.join(roomForSession(sessionId));
    trackJoin(socket, sessionId, role);
    recordHeartbeat(sessionId, role);
  });

  // An explicit leave is something the server SEES: billing stops at this moment (not a heartbeat window later).
  handle(socket, "chat:leave", (payload) => {
    const { sessionId } = parseSessionPayload(payload);
    const role = joinedSessions.get(socket)?.get(sessionId);
    joinedSessions.get(socket)?.delete(sessionId);
    socket.leave(roomForSession(sessionId));
    if (role) reportDepartureIfLast(socket, sessionId, role); // only for a chat this socket had actually joined
  });

  handle(socket, "chat:message", async (payload, ack, userId) => {
    const { sessionId, content } = parseMessagePayload(payload);
    const message = await chatService.postMessage(sessionId, userId, content.slice(0, MAX_MESSAGE_LENGTH));
    recordHeartbeat(sessionId, message.senderRole); // sending a message is itself proof of presence
    emitToRoom(roomForSession(sessionId), "chat:message", message);
    ack(undefined, message);
  });

  handle(socket, "chat:typing", async (payload, _ack, userId) => {
    const { sessionId, isTyping } = parseTypingPayload(payload);
    const senderRole = await chatService.getActorRole(sessionId, userId);
    socket.to(roomForSession(sessionId)).emit("chat:typing", { sessionId, isTyping, senderRole });
  });

  handle(socket, "chat:end", async (payload, ack, userId) => {
    const { sessionId } = parseSessionPayload(payload);
    await chatService.endSessionByActor(sessionId, userId);
    ack();
  });

  // "disconnecting" fires while the socket is still in its rooms — a closed tab, a logout or a dropped connection
  // the transport noticed. Same rule as an explicit leave: stop billing now, for every chat this socket was in.
  socket.on("disconnecting", () => {
    const joined = joinedSessions.get(socket);
    if (!joined) return;
    for (const [sessionId, role] of joined) reportDepartureIfLast(socket, sessionId, role);
    joined.clear();
  });

  socket.on("error", (err) => logError("[socket] socket error:", err));
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  attachIo(io);

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: SocketData["role"] };
      const user = await prisma.user.findFirst({
        where: { id: decoded.id, isActive: true, isDeleted: false },
        select: { id: true, astrologerProfile: { select: { id: true, suspendedAt: true } } },
      });
      if (!user) return next(new Error("Account is not active"));

      const astrologerProfileId = user.astrologerProfile && !user.astrologerProfile.suspendedAt ? user.astrologerProfile.id : null;
      socket.data = { userId: decoded.id, role: decoded.role, astrologerProfileId } satisfies SocketData;
      next();
    } catch {
      next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const { astrologerProfileId } = socket.data as SocketData;

    if (astrologerProfileId) {
      socket.join(roomForAstrologer(astrologerProfileId));
      const pendingOffline = offlineTimers.get(astrologerProfileId);
      if (pendingOffline) {
        clearTimeout(pendingOffline);
        offlineTimers.delete(astrologerProfileId);
      }
      const count = (astrologerConnections.get(astrologerProfileId) ?? 0) + 1;
      astrologerConnections.set(astrologerProfileId, count);
      if (count === 1) void setAstrologerOnline(astrologerProfileId, true);
    }

    registerChatHandlers(socket);

    socket.on("disconnect", () => {
      if (!astrologerProfileId) return;
      const count = Math.max(0, (astrologerConnections.get(astrologerProfileId) ?? 1) - 1);
      astrologerConnections.set(astrologerProfileId, count);
      if (count === 0) {
        const timer = setTimeout(() => {
          offlineTimers.delete(astrologerProfileId);
          if ((astrologerConnections.get(astrologerProfileId) ?? 0) === 0) void setAstrologerOnline(astrologerProfileId, false);
        }, PRESENCE_GRACE_MS);
        offlineTimers.set(astrologerProfileId, timer);
      }
    });
  });

  return io;
}
