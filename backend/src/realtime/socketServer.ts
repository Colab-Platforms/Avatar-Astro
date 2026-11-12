// Real-time transport for the astrologer chat feature. REST (modules/chat) owns
// creating/ending sessions and the message history; this layer only relays live
// messages/typing and lets billing.ts push timer/ended events into the right rooms.
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "@root/prisma.js";
import { isOriginAllowed } from "@/utils/corsOrigins.js";
import * as chatService from "@/modules/chat/chat.service.js";
import { attachIo, roomForSession, roomForAstrologer, emitToRoom, recordHeartbeat } from "@/modules/chat/billing.js";
import { MAX_MESSAGE_LENGTH } from "@/modules/chat/chat.constants.js";

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
  }).catch((err) => console.error("[socket] failed to update astrologer presence:", err));
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
      if (count === 1) setAstrologerOnline(astrologerProfileId, true);
    }

    // Role is resolved per session inside chat.service (is this userId the session's
    // `userId`, or the owner of its `astrologerProfile`?) — never assumed from whether
    // this account separately happens to have an astrologer profile of its own, which
    // would wrongly force every chat onto one side for an astrologer acting as a customer.
    socket.on("chat:join", async ({ sessionId }: { sessionId: string }, ack?: (err?: string) => void) => {
      try {
        const { userId } = socket.data as SocketData;
        await chatService.getSession(sessionId, userId);
        socket.join(roomForSession(sessionId));
        await chatService.markRead(sessionId, userId);
        // Joining counts as an initial heartbeat — without this, a session would read as
        // "absent" for up to PRESENCE_TIMEOUT_MS right after joining, before the client's own
        // first periodic heartbeat arrives.
        const role = await chatService.getActorRole(sessionId, userId);
        recordHeartbeat(sessionId, role);
        ack?.();
      } catch (err) {
        ack?.(err instanceof Error ? err.message : "Could not join this chat");
      }
    });

    socket.on("chat:heartbeat", async ({ sessionId }: { sessionId: string }) => {
      try {
        const { userId } = socket.data as SocketData;
        const role = await chatService.getActorRole(sessionId, userId);
        recordHeartbeat(sessionId, role);
      } catch {
        /* not a participant, or the session no longer exists — silently ignore a stray heartbeat */
      }
    });

    socket.on("chat:leave", ({ sessionId }: { sessionId: string }) => {
      socket.leave(roomForSession(sessionId));
    });

    socket.on("chat:message", async ({ sessionId, content }: { sessionId: string; content: string }, ack?: (err?: string, message?: unknown) => void) => {
      try {
        const { userId } = socket.data as SocketData;
        const trimmed = String(content ?? "").slice(0, MAX_MESSAGE_LENGTH);
        const message = await chatService.postMessage(sessionId, userId, trimmed);
        recordHeartbeat(sessionId, message.senderRole); // sending a message is itself proof of presence
        emitToRoom(roomForSession(sessionId), "chat:message", message);
        ack?.(undefined, message);
      } catch (err) {
        ack?.(err instanceof Error ? err.message : "Could not send message");
      }
    });

    socket.on("chat:typing", async ({ sessionId, isTyping }: { sessionId: string; isTyping: boolean }) => {
      try {
        const { userId } = socket.data as SocketData;
        const senderRole = await chatService.getActorRole(sessionId, userId);
        socket.to(roomForSession(sessionId)).emit("chat:typing", { sessionId, isTyping, senderRole });
      } catch {
        /* not a participant — silently ignore a stray typing event */
      }
    });

    socket.on("chat:end", async ({ sessionId }: { sessionId: string }, ack?: (err?: string) => void) => {
      try {
        const { userId } = socket.data as SocketData;
        await chatService.endSessionByActor(sessionId, userId);
        ack?.();
      } catch (err) {
        ack?.(err instanceof Error ? err.message : "Could not end this chat");
      }
    });

    socket.on("disconnect", () => {
      if (!astrologerProfileId) return;
      const count = Math.max(0, (astrologerConnections.get(astrologerProfileId) ?? 1) - 1);
      astrologerConnections.set(astrologerProfileId, count);
      if (count === 0) {
        const timer = setTimeout(() => {
          offlineTimers.delete(astrologerProfileId);
          if ((astrologerConnections.get(astrologerProfileId) ?? 0) === 0) setAstrologerOnline(astrologerProfileId, false);
        }, PRESENCE_GRACE_MS);
        offlineTimers.set(astrologerProfileId, timer);
      }
    });
  });

  return io;
}
