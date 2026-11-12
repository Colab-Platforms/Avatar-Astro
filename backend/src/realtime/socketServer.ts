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
import { attachIo, roomForSession, roomForAstrologer, emitToRoom, recordHeartbeat } from "@/modules/chat/billing.js";
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
    recordHeartbeat(sessionId, role);
    ack();
  });

  handle(socket, "chat:heartbeat", async (payload, _ack, userId) => {
    const { sessionId } = parseSessionPayload(payload);
    const role = await chatService.getActorRole(sessionId, userId);
    recordHeartbeat(sessionId, role);
  });

  handle(socket, "chat:leave", (payload) => {
    const { sessionId } = parseSessionPayload(payload);
    socket.leave(roomForSession(sessionId));
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
