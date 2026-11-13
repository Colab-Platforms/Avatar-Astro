// Run with: npm run test:security
// Checkpoint 0 — a real Socket.IO server + real socket.io-client connections hammer the chat handlers
// with malformed events. The process must survive every one, answer with typed acks, and never leak
// internal error text. No database is reachable here (DATABASE_URL points at a dead port), which
// doubles as proof that (a) validation rejects bad input BEFORE any query and (b) a database failure
// becomes a generic ack instead of an unhandled rejection or a leaked driver message.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as SocketIOServer, type Socket as ServerSocket } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-jwt-secret";
process.env.DATABASE_URL = "postgresql://nobody:nothing@127.0.0.1:1/never_connected"; // set BEFORE prisma loads

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const GOOD_ID = "cmvalidsessionid01";

let httpServer: HttpServer;
let io: SocketIOServer;
let url: string;
let prisma: any;
const clients: ClientSocket[] = [];
const processFaults: unknown[] = [];
const onFault = (e: unknown) => void processFaults.push(e);

type AckResult = { err?: string; data?: any; timedOut?: boolean };

/** Emits with an ack callback and resolves with what the server answered. */
function emitAck(client: ClientSocket, event: string, payload?: unknown, withPayload = true): Promise<AckResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), 4_000);
    const cb = (err?: string, data?: any) => { clearTimeout(timer); resolve({ err, data }); };
    if (withPayload) client.emit(event, payload, cb); else client.emit(event, cb);
  });
}

async function newClient(auth: Record<string, unknown> = { user: "user-1" }): Promise<ClientSocket> {
  const c = connect(url, { auth, transports: ["websocket"], reconnection: false, forceNew: true });
  clients.push(c);
  await new Promise<void>((resolve, reject) => {
    c.once("connect", () => resolve());
    c.once("connect_error", reject);
  });
  return c;
}

before(async () => {
  process.on("unhandledRejection", onFault);
  process.on("uncaughtException", onFault);

  prisma = (await import("../../../prisma.js")).default;
  const { registerChatHandlers } = await import("../../realtime/socketServer.js");

  httpServer = createServer();
  io = new SocketIOServer(httpServer);
  io.use((socket, next) => {
    // Stand-in for the JWT middleware (covered elsewhere): authenticated unless the client says "anon".
    if (socket.handshake.auth?.user) socket.data = { userId: socket.handshake.auth.user, role: "USER", astrologerProfileId: null };
    next();
  });
  io.on("connection", (socket: ServerSocket) => registerChatHandlers(socket));
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  process.off("unhandledRejection", onFault);
  process.off("uncaughtException", onFault);
  for (const c of clients) c.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await prisma.$disconnect();
});

const BAD_PAYLOADS: Array<[string, unknown]> = [
  ["null", null],
  ["number", 42],
  ["string", "sessionId"],
  ["array", []],
  ["empty object", {}],
  ["numeric sessionId", { sessionId: 123 }],
  ["object sessionId (operator injection)", { sessionId: { $ne: "x" } }],
  ["path-like sessionId", { sessionId: "../../etc/passwd" }],
  ["oversized sessionId", { sessionId: "a".repeat(5_000) }],
];

test("chat:join / chat:message / chat:end answer every malformed payload with a typed BAD_PAYLOAD ack", async () => {
  const c = await newClient();
  for (const event of ["chat:join", "chat:message", "chat:end"]) {
    for (const [label, payload] of BAD_PAYLOADS) {
      const res = await emitAck(c, event, payload);
      assert.ok(!res.timedOut, `${event} with ${label} got no ack`);
      assert.equal(typeof res.err, "string", `${event} with ${label} must return an error string`);
      assert.equal(res.data?.code, "BAD_PAYLOAD", `${event} with ${label}`);
      assert.ok(!/TypeError|Cannot destructure|undefined|prisma|ECONN/i.test(res.err!), `${event}/${label} leaked internals: ${res.err}`);
    }
  }
  assert.deepEqual(processFaults, [], "no unhandled rejection or uncaught exception");
});

test("a client that emits ONLY a callback, or nothing at all, cannot crash a handler", async () => {
  const c = await newClient();
  for (const event of ["chat:join", "chat:message", "chat:end", "chat:heartbeat", "chat:typing", "chat:leave"]) {
    const res = await emitAck(c, event, undefined, false); // callback is the only argument
    if (event === "chat:join" || event === "chat:message" || event === "chat:end") {
      assert.equal(res.data?.code, "BAD_PAYLOAD", event);
    }
    c.emit(event); // no payload, no callback
  }
  await sleep(150);
  assert.deepEqual(processFaults, []);
  assert.ok(c.connected, "connection survives");
});

test("message content of the wrong type is rejected, not coerced", async () => {
  const c = await newClient();
  for (const content of [undefined, null, 12345, true, { text: "hi" }, ["hi"]]) {
    const res = await emitAck(c, "chat:message", { sessionId: GOOD_ID, content });
    assert.equal(res.data?.code, "BAD_PAYLOAD", JSON.stringify(content));
  }
});

test("fire-and-forget events (heartbeat/typing/leave) flooded with garbage keep the server alive and responsive", async () => {
  const c = await newClient();
  const originalConsoleError = console.error;
  console.error = () => undefined; // well-formed heartbeats reach the (unreachable) DB and are logged; keep test output readable
  const typingBad: unknown[] = [...BAD_PAYLOADS.map(([, p]) => p), { sessionId: GOOD_ID, isTyping: "yes" }, { sessionId: GOOD_ID }];
  for (let i = 0; i < 25; i++) {
    for (const p of typingBad) {
      c.emit("chat:heartbeat", p);
      c.emit("chat:typing", p);
      c.emit("chat:leave", p);
    }
  }
  // Liveness probe on the same connection, after the flood has been processed in order.
  const probe = await emitAck(c, "chat:join", null);
  assert.equal(probe.data?.code, "BAD_PAYLOAD", "server still answering after the flood");

  const second = await newClient({ user: "user-2" });
  assert.equal((await emitAck(second, "chat:join", {})).data?.code, "BAD_PAYLOAD", "a fresh client is still served");
  console.error = originalConsoleError;
  assert.deepEqual(processFaults, []);
});

test("a well-formed request that hits a database failure gets a GENERIC ack — no driver text, no connection string", async () => {
  const c = await newClient();
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  let res: AckResult;
  try {
    res = await emitAck(c, "chat:join", { sessionId: GOOD_ID });
  } finally {
    console.error = original;
  }
  assert.ok(!res.timedOut, "must still ack");
  assert.equal(res.err, "Something went wrong. Please try again.");
  assert.equal(res.data?.code, "INTERNAL");
  assert.ok(!/ECONN|127\.0\.0\.1|never_connected|nobody|nothing|prisma/i.test(JSON.stringify(res)), `client saw internals: ${JSON.stringify(res)}`);
  // The failure was still logged server-side for diagnosis, with no connection-string password.
  assert.ok(logged.length >= 1, "internal failures must still be logged");
  assert.ok(!JSON.stringify(logged).includes("nothing@"), "credentials must not reach the log");
  assert.deepEqual(processFaults, []);
});

test("an unauthenticated socket gets UNAUTHORIZED on every event and never reaches the database", async () => {
  const c = await newClient({}); // no user => socket.data is never populated
  for (const event of ["chat:join", "chat:message", "chat:end"]) {
    const res = await emitAck(c, event, { sessionId: GOOD_ID, content: "hi" });
    assert.equal(res.data?.code, "UNAUTHORIZED", event);
  }
  assert.deepEqual(processFaults, []);
});

test("an oversized frame (>1MB) drops that client only; the server keeps serving others", async () => {
  const victim = await newClient();
  const disconnected = new Promise<void>((resolve) => victim.once("disconnect", () => resolve()));
  victim.emit("chat:message", { sessionId: GOOD_ID, content: "x".repeat(3 * 1024 * 1024) });
  await Promise.race([disconnected, sleep(5_000)]);
  assert.equal(victim.connected, false, "the abusive client is disconnected by the transport limit");

  const healthy = await newClient({ user: "user-3" });
  assert.equal((await emitAck(healthy, "chat:join", {})).data?.code, "BAD_PAYLOAD", "other clients unaffected");
  assert.deepEqual(processFaults, []);
});
