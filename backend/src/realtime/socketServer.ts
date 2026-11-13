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
import { attachIo, roomForSession, roomForAstrologer, emitToRoom, recordHeartbeat, recordDeparture, type ConnectionIdentity } from "@/modules/chat/billing.js";
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

type SocketData = { userId: string; role: "USER" | "ADMIN" | "SUPERADMIN"; astrologerProfileId: string | null; connSeq?: number };

/**
 * Identifies this socket connection for presence staleness checks (see chat/billing.ts): `id` is the
 * socket's own id, stable and unique for its lifetime; `seq` is a per-socket counter bumped SYNCHRONOUSLY
 * the instant each raw event is received — before any `await` lets a slower event's async work finish
 * first. That capture point is what makes `seq` reflect true arrival order, not resolution order.
 */
function nextConn(socket: Socket): ConnectionIdentity {
  const data = socket.data as SocketData;
  data.connSeq = (data.connSeq ?? 0) + 1;
  return { id: socket.id, seq: data.connSeq };
}

// Per-astrologer live connection count — presence is "do they have an open socket right
// now", not a manual toggle alone. Cleared on disconnect (with a short grace delay so a
// page refresh doesn't flicker the astrologer offline for a moment).
const astrologerConnections = new Map<string, number>();
const offlineTimers = new Map<string, NodeJS.Timeout>();
const PRESENCE_GRACE_MS = 10_000;

// The biggest legitimate frame is a chat:message: ~2000 chars of content plus ids and envelope.
// 64 KiB leaves an order-of-magnitude margin while refusing megabyte-scale garbage outright
// (Socket.IO closes the offending connection; others are unaffected).
const MAX_SOCKET_FRAME_BYTES = 64 * 1024;

// ---------------------------------------------------------------------------------------------
// Per-socket, per-event rate limiting — fixed 10s windows, counted BEFORE any validation or DB
// work so a flood is rejected at the cheapest possible point. Limits are per socket (per
// connection), deliberately generous for real clients: the heartbeat fires every 10s, typing
// updates are throttled client-side, and no human sends 20 messages in 10 seconds.
// ---------------------------------------------------------------------------------------------
const RATE_WINDOW_MS = 10_000;
const RATE_LIMITS: Record<string, number> = {
  "chat:message": 20,
  "chat:typing": 40,
  "chat:heartbeat": 20,
  "chat:join": 20,
  "chat:leave": 20,
  "chat:end": 10,
};
const DEFAULT_RATE_LIMIT = 60;
const rateWindows = new WeakMap<Socket, Map<string, { start: number; count: number }>>();

function overRateLimit(socket: Socket, event: string): boolean {
  let windows = rateWindows.get(socket);
  if (!windows) rateWindows.set(socket, (windows = new Map()));
  const now = Date.now();
  let w = windows.get(event);
  if (!w || now - w.start >= RATE_WINDOW_MS) {
    windows.set(event, (w = { start: now, count: 0 }));
  }
  w.count += 1;
  return w.count > (RATE_LIMITS[event] ?? DEFAULT_RATE_LIMIT);
}

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
  handler: (payload: unknown, ack: ChatSocketAck, userId: string, conn: ConnectionIdentity) => void | Promise<void>,
): void {
  socket.on(event, (...args: unknown[]) => {
    const { payload, ack } = splitArgs(args);
    if (overRateLimit(socket, event)) return ack("Too many requests. Please slow down.", { code: "RATE_LIMITED" });
    const userId = (socket.data as Partial<SocketData> | undefined)?.userId;
    const conn = nextConn(socket); // captured now, synchronously, so later async work can't reorder it
    const run = async () => {
      if (!userId) throw new ApiError("Authentication required", 401);
      await handler(payload, ack, userId, conn);
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
function reportDepartureIfLast(socket: Socket, sessionId: string, role: ChatSenderRole, conn: ConnectionIdentity): void {
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
    recordDeparture(sessionId, role, undefined, conn).catch((err) => logError("[socket] failed to record departure:", err));
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
  handle(socket, "chat:join", async (payload, ack, userId, conn) => {
    const { sessionId } = parseSessionPayload(payload);
    await chatService.getSession(sessionId, userId);
    socket.join(roomForSession(sessionId));
    await chatService.markRead(sessionId, userId);
    // Joining counts as an initial heartbeat — without this, a session would read as
    // "absent" for up to PRESENCE_TIMEOUT_MS right after joining, before the client's own
    // first periodic heartbeat arrives.
    const role = await chatService.getActorRole(sessionId, userId);
    trackJoin(socket, sessionId, role);
    recordHeartbeat(sessionId, role, undefined, conn);
    ack();
  });

  handle(socket, "chat:heartbeat", async (payload, _ack, userId, conn) => {
    const { sessionId } = parseSessionPayload(payload);
    const role = await chatService.getActorRole(sessionId, userId); // throws unless this user is a participant
    // After an automatic reconnect the client resumes heartbeating on a NEW socket without re-sending chat:join.
    // Re-establish room membership and tracking here, so that socket's later disconnect is still observed.
    socket.join(roomForSession(sessionId));
    trackJoin(socket, sessionId, role);
    recordHeartbeat(sessionId, role, undefined, conn);
  });

  // An explicit leave is something the server SEES: billing stops at this moment (not a heartbeat window later).
  handle(socket, "chat:leave", (payload, _ack, _userId, conn) => {
    const { sessionId } = parseSessionPayload(payload);
    const role = joinedSessions.get(socket)?.get(sessionId);
    joinedSessions.get(socket)?.delete(sessionId);
    socket.leave(roomForSession(sessionId));
    if (role) reportDepartureIfLast(socket, sessionId, role, conn); // only for a chat this socket had actually joined
  });

  handle(socket, "chat:message", async (payload, ack, userId, conn) => {
    const { sessionId, content, clientMessageId } = parseMessagePayload(payload);
    const message = await chatService.postMessage(sessionId, userId, content.slice(0, MAX_MESSAGE_LENGTH), clientMessageId);
    recordHeartbeat(sessionId, message.senderRole, undefined, conn); // sending a message is itself proof of presence
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
    const conn = nextConn(socket); // captured synchronously, before any pending heartbeat's async work resolves
    for (const [sessionId, role] of joined) reportDepartureIfLast(socket, sessionId, role, conn);
    joined.clear();
  });

  socket.on("error", (err) => logError("[socket] socket error:", err));
}

// Kept for suspension enforcement: disconnectUserSockets needs the live server instance.
let ioRef: SocketIOServer | null = null;

/** Registers the live Socket.IO server with this module AND with billing. Called by initSocketServer;
 * exported so socket-level tests that build their own bare Server can wire it up the same way. */
export function attachSocketServer(io: SocketIOServer): void {
  ioRef = io;
  attachIo(io);
}

/**
 * Forcibly closes every socket belonging to `userId` — called when an account is deactivated or an
 * astrologer suspended, so a revoked identity cannot keep an already-authenticated connection alive.
 * Each socket's normal "disconnecting" path still runs, so chat presence/billing sees a clean departure.
 */
export function disconnectUserSockets(userId: string): void {
  if (!ioRef) return;
  for (const [, socket] of ioRef.of("/").sockets) {
    if ((socket.data as Partial<SocketData> | undefined)?.userId === userId) socket.disconnect(true);
  }
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
    maxHttpBufferSize: MAX_SOCKET_FRAME_BYTES,
  });

  attachSocketServer(io);

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
