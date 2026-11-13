// Pure validation + typed-acknowledgement helpers for the chat Socket.IO events.
//
// Socket.IO hands handlers whatever the client sent: `undefined`, `null`, a number, an array, a
// function (when a client emits only a callback), or an object with fields of the wrong type. None of
// that may throw, and none of it may reach the database or the chat service.
//
// Ack contract (backward compatible — existing clients read the first argument as an error string):
//   success: ack(undefined, data?)
//   failure: ack(<human-readable message>, { code: ChatSocketErrorCode })

export type ChatSocketErrorCode =
  | "BAD_PAYLOAD"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export type ChatSocketAck = (err?: string, data?: unknown) => void;

export class SocketPayloadError extends Error {
  readonly code: ChatSocketErrorCode = "BAD_PAYLOAD";
  constructor(message: string) {
    super(message);
    this.name = "SocketPayloadError";
  }
}

// Session ids are cuid/uuid-shaped. Reject anything else before it is used as a room name or DB key.
const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new SocketPayloadError("Invalid request payload");
  }
  return payload as Record<string, unknown>;
}

function sessionIdOf(record: Record<string, unknown>): string {
  const value = record.sessionId;
  if (typeof value !== "string" || !SESSION_ID.test(value)) throw new SocketPayloadError("Invalid session id");
  return value;
}

export function parseSessionPayload(payload: unknown): { sessionId: string } {
  return { sessionId: sessionIdOf(asRecord(payload)) };
}

export function parseMessagePayload(payload: unknown): { sessionId: string; content: string } {
  const record = asRecord(payload);
  const sessionId = sessionIdOf(record);
  if (typeof record.content !== "string") throw new SocketPayloadError("Message content must be text");
  return { sessionId, content: record.content };
}

export function parseTypingPayload(payload: unknown): { sessionId: string; isTyping: boolean } {
  const record = asRecord(payload);
  const sessionId = sessionIdOf(record);
  if (typeof record.isTyping !== "boolean") throw new SocketPayloadError("Invalid typing state");
  return { sessionId, isTyping: record.isTyping };
}

/**
 * Splits raw handler arguments into (payload, ack). The ack is the last argument if — and only if — it
 * is a function; a client that emits just a callback gets `payload === undefined`. The returned ack
 * never throws, even if the client-supplied callback does.
 */
export function splitArgs(args: unknown[]): { payload: unknown; ack: ChatSocketAck } {
  const last = args[args.length - 1];
  const rawAck = typeof last === "function" ? (last as (...a: unknown[]) => unknown) : null;
  const payload = (rawAck ? args.slice(0, -1) : args)[0];
  const ack: ChatSocketAck = (err, data) => {
    if (!rawAck) return;
    try {
      if (err === undefined) rawAck(undefined, data);
      else rawAck(err, data);
    } catch {
      /* a throwing client callback must never take the server down */
    }
  };
  return { payload, ack };
}

/** Maps an HTTP-style status (ApiError.statusCode) onto a socket error code. */
export function codeForStatus(status: number | undefined): ChatSocketErrorCode {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 429: return "RATE_LIMITED";
    default: return "INTERNAL";
  }
}

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
