// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:security
// Checkpoint 0 — regression guard for the refactored Socket.IO handlers: the real happy path still works
// end to end (join, message relay + persistence, typing, end) and room authorization still holds for a
// non-participant. Needs a disposable localhost Postgres; skipped otherwise (same convention as the other
// DB-backed suites).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as SocketIOServer } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "5";

const DOM = "@socket-flow-test.example";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let prisma: any;
let wallet: any;
let chatService: any;
let billing: any;
let httpServer: HttpServer;
let io: SocketIOServer;
let url: string;
const clients: ClientSocket[] = [];
const ids: Record<string, string> = {};

type Ack = { err?: string; data?: any; timedOut?: boolean };
const emitAck = (c: ClientSocket, event: string, payload: unknown): Promise<Ack> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), 5_000);
    // undefined travels as null over the wire (JSON); normalise so assertions read naturally
    c.emit(event, payload, (err?: string | null, data?: any) => { clearTimeout(timer); resolve({ err: err ?? undefined, data: data ?? undefined }); });
  });

const waitFor = <T>(c: ClientSocket, event: string, ms = 5_000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
    c.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });

async function client(userId: string): Promise<ClientSocket> {
  const c = connect(url, { auth: { userId }, transports: ["websocket"], reconnection: false, forceNew: true });
  clients.push(c);
  await new Promise<void>((resolve, reject) => { c.once("connect", () => resolve()); c.once("connect_error", reject); });
  return c;
}

async function cleanup() {
  await prisma.chatMessage.deleteMany({ where: { session: { user: { email: { endsWith: DOM } } } } });
  await prisma.walletReservation.deleteMany({ where: { wallet: { user: { email: { endsWith: DOM } } } } });
  await prisma.chatSession.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.astrologerProfile.deleteMany({ where: { slug: { startsWith: "socket-flow-test-" } } });
  await prisma.astrologerApplication.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.wallet.deleteMany({ where: { user: { email: { endsWith: DOM } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
}

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  wallet = await import("../../modules/payment/wallet.service.js");
  chatService = await import("../../modules/chat/chat.service.js");
  billing = await import("../../modules/chat/billing.js");
  const { registerChatHandlers } = await import("../../realtime/socketServer.js");

  await cleanup();
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  const mk = (key: string) => prisma.user.create({ data: { email: `${key}${DOM}`, isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
  ids.customer = (await mk("customer")).id;
  ids.stranger = (await mk("stranger")).id;
  const astroUser = await mk("astro");
  ids.astroUser = astroUser.id;
  const application = await prisma.astrologerApplication.create({ data: { userId: astroUser.id, status: "APPROVED" } });
  const profile = await prisma.astrologerProfile.create({
    data: { applicationId: application.id, userId: astroUser.id, displayName: "Socket Flow Astro", slug: `socket-flow-test-${Date.now()}`, pricePerMinute: 6, isPublished: true },
  });
  ids.profile = profile.id;

  const w = await wallet.getOrCreateWallet(ids.customer);
  await prisma.wallet.update({ where: { id: w.id }, data: { balancePaise: 5000, purchasedBalancePaise: 5000 } });
  const requested = await chatService.startSession(ids.customer, ids.profile);
  const active = await chatService.acceptSession(requested.id, ids.astroUser);
  ids.session = active.id;

  httpServer = createServer();
  io = new SocketIOServer(httpServer);
  io.use((socket, next) => {
    socket.data = { userId: socket.handshake.auth.userId, role: "USER", astrologerProfileId: null };
    next();
  });
  io.on("connection", (socket) => registerChatHandlers(socket));
  billing.attachIo(io); // so billing.endSession can emit chat:ended into the room
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
});

after(async () => {
  if (skip) return;
  for (const c of clients) c.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  billing.stopBillingTimers();
  await cleanup();
  await prisma.$disconnect();
});

test("participants join, exchange a persisted message, and see typing — the refactor changed no behaviour", { skip }, async () => {
  const customer = await client(ids.customer);
  const astro = await client(ids.astroUser);

  assert.deepEqual(await emitAck(customer, "chat:join", { sessionId: ids.session }), { err: undefined, data: undefined });
  assert.equal((await emitAck(astro, "chat:join", { sessionId: ids.session })).err, undefined);

  const relayed = waitFor<any>(astro, "chat:message");
  const sent = await emitAck(customer, "chat:message", { sessionId: ids.session, content: "  Namaste, I have a question  " });
  assert.equal(sent.err, undefined);
  assert.equal(sent.data.content, "Namaste, I have a question", "content is trimmed by the service, as before");
  assert.equal(sent.data.senderRole, "USER");
  assert.equal((await relayed).id, sent.data.id, "the other participant receives the same persisted message");

  const stored = await prisma.chatMessage.findMany({ where: { sessionId: ids.session } });
  assert.equal(stored.length, 1, "exactly one row persisted");

  const typing = waitFor<any>(customer, "chat:typing");
  astro.emit("chat:typing", { sessionId: ids.session, isTyping: true });
  assert.deepEqual(await typing, { sessionId: ids.session, isTyping: true, senderRole: "ASTROLOGER" });
});

test("room authorization: a non-participant cannot join, send, or receive", { skip }, async () => {
  const stranger = await client(ids.stranger);
  const customer = await client(ids.customer);
  await emitAck(customer, "chat:join", { sessionId: ids.session });

  const join = await emitAck(stranger, "chat:join", { sessionId: ids.session });
  assert.equal(join.data?.code, "FORBIDDEN");
  const send = await emitAck(stranger, "chat:message", { sessionId: ids.session, content: "let me in" });
  assert.equal(send.data?.code, "FORBIDDEN");
  const end = await emitAck(stranger, "chat:end", { sessionId: ids.session });
  assert.equal(end.data?.code, "FORBIDDEN");

  let leaked = false;
  stranger.on("chat:message", () => { leaked = true; });
  await emitAck(customer, "chat:message", { sessionId: ids.session, content: "private" });
  await sleep(200);
  assert.equal(leaked, false, "a non-participant must never receive room messages");
  const stored = await prisma.chatMessage.count({ where: { sessionId: ids.session, content: "let me in" } });
  assert.equal(stored, 0, "the stranger's message was never persisted");
});

test("ending: either side can end, the room is told, later messages are refused with a typed (non-INTERNAL) error", { skip }, async () => {
  const customer = await client(ids.customer);
  const astro = await client(ids.astroUser);
  await emitAck(customer, "chat:join", { sessionId: ids.session });
  await emitAck(astro, "chat:join", { sessionId: ids.session });

  const ended = waitFor<any>(astro, "chat:ended");
  assert.equal((await emitAck(customer, "chat:end", { sessionId: ids.session })).err, undefined);
  assert.equal((await ended).reason, "USER_ENDED");

  const row = await prisma.chatSession.findUnique({ where: { id: ids.session } });
  assert.equal(row.status, "ENDED");

  const after = await emitAck(customer, "chat:message", { sessionId: ids.session, content: "too late" });
  assert.equal(typeof after.err, "string");
  assert.notEqual(after.data?.code, "INTERNAL", "an expected business error must not be reported as an internal failure");
});
