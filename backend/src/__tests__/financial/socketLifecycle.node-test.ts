// Run with: npm run test:db:run -- src/__tests__/financial/socketLifecycle.node-test.ts   (real sockets)
//
// Checkpoint 2 — socket hardening behaviours that need a REAL Socket.IO server: per-socket event
// rate limiting (typed RATE_LIMITED acks, per-connection isolation), the clientMessageId
// idempotency key over the wire, and disconnectUserSockets (suspension enforcement).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as SocketIOServer } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, type Ctx, type Live } from "./helpers.js";

let ctx: Ctx;
let httpServer: HttpServer;
let io: SocketIOServer;
let url = "";
let seq = 0;
let disconnectUserSockets: (userId: string) => void;
const clients: ClientSocket[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  if (skip) return;
  ctx = await boot("fin-socklife");
  const socketServer = await import("../../realtime/socketServer.js");
  disconnectUserSockets = socketServer.disconnectUserSockets;
  httpServer = createServer();
  io = new SocketIOServer(httpServer);
  io.use((socket, next) => { socket.data = { userId: socket.handshake.auth.userId, role: "USER", astrologerProfileId: null }; next(); });
  io.on("connection", (socket) => socketServer.registerChatHandlers(socket));
  socketServer.attachSocketServer(io);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});
after(async () => {
  if (skip) return;
  for (const c of clients) c.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await shutdown(ctx);
});

async function client(userId: string): Promise<ClientSocket> {
  const c = connect(url, { auth: { userId }, transports: ["websocket"], reconnection: false, forceNew: true });
  clients.push(c);
  await new Promise<void>((resolve, reject) => { c.once("connect", () => resolve()); c.once("connect_error", reject); });
  return c;
}
const join = (c: ClientSocket, sessionId: string) => new Promise<void>((resolve, reject) => c.emit("chat:join", { sessionId }, (err?: string | null) => (err ? reject(new Error(err)) : resolve())));
type Ack = { err?: string; meta?: { code?: string }; data?: any };
const send = (c: ClientSocket, payload: unknown) => new Promise<Ack>((resolve) => c.emit("chat:message", payload, (err?: string, meta?: any) => resolve({ err, meta, data: meta })));

async function liveChat(key: string): Promise<Live> {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  return activate(ctx, userId, await makeAstrologer(ctx, `sl${++seq}`));
}

test("flooding chat:message past the per-socket limit gets typed RATE_LIMITED acks — and a SECOND socket of the same user is unaffected (per-connection buckets)", { skip }, async () => {
  const s = await liveChat("flood");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);

  const results: Ack[] = [];
  for (let i = 0; i < 25; i++) results.push(await send(user, { sessionId: s.id, content: `burst ${i}` }));
  const limited = results.filter((r) => r.err);
  assert.ok(limited.length >= 5, `the burst past 20 messages/10s is refused (got ${limited.length} refusals)`);
  for (const r of limited) assert.equal(r.meta?.code, "RATE_LIMITED", "refusals carry the typed code");
  assert.ok(results.slice(0, 20).every((r) => !r.err), "the first 20 messages all went through");

  // A fresh connection (e.g. the user's other tab) has its own bucket.
  const tab2 = await client(s.userId);
  const viaTab2 = await send(tab2, { sessionId: s.id, content: "from the other tab" });
  assert.ok(!viaTab2.err, "another socket of the same user is not throttled by the first one's flood");

  assert.equal(await ctx.prisma.chatMessage.count({ where: { sessionId: s.id } }), 21, "exactly the accepted messages were stored");
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

test("clientMessageId over the wire: a client retry of an un-acked send yields the SAME message, and the room sees the duplicate emit with the same id", { skip }, async () => {
  const s = await liveChat("wire-dedupe");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);

  const first = await send(user, { sessionId: s.id, content: "did this get through?", clientMessageId: "retry-1" });
  assert.ok(!first.err);
  const retry = await send(user, { sessionId: s.id, content: "did this get through?", clientMessageId: "retry-1" });
  assert.ok(!retry.err, "the retry succeeds instead of erroring on the unique index");
  assert.equal(retry.data.id, first.data.id, "and returns the identical stored message");
  assert.equal(await ctx.prisma.chatMessage.count({ where: { sessionId: s.id } }), 1);

  const malformed = await send(user, { sessionId: s.id, content: "x", clientMessageId: { nope: true } });
  assert.equal(malformed.meta?.code, "BAD_PAYLOAD", "a malformed id is rejected, not silently ignored");
  await ctx.billing.endSession(s.id, "USER_ENDED");
});

test("disconnectUserSockets closes every socket of THAT user only, and billing observes it as a clean departure", { skip }, async () => {
  const s = await liveChat("forcedc");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);

  const astroDropped = new Promise<boolean>((resolve) => { astro.once("disconnect", () => resolve(true)); setTimeout(() => resolve(false), 1500); });
  disconnectUserSockets(s.astro.userId);
  assert.equal(await astroDropped, true, "the astrologer's socket was forcibly closed");
  await sleep(300);
  assert.ok(user.connected, "the other participant's socket is untouched");

  const row = await ctx.prisma.chatSession.findUniqueOrThrow({ where: { id: s.id } });
  assert.equal(row.status, "PAUSED", "the forced close ran the normal disconnecting path, so the chat paused");
  await ctx.billing.endSession(s.id, "DISCONNECTED");
});
