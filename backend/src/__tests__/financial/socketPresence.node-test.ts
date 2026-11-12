// Run with: npm run test:db:run -- src/__tests__/financial/socketPresence.node-test.ts   (~15s, real clock)
//
// Real Socket.IO server + real clients: proves the server OBSERVES an explicit disconnect / chat:leave and stops
// billing at that moment, that a second tab keeps the chat alive, and that reconnecting resumes it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as SocketIOServer } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { skip, boot, shutdown, makeUser, makeAstrologer, fund, burnFree, activate, sessionRow, sessionDebits, assertWalletSound, cumulative, type Ctx, type Live } from "./helpers.js";

let ctx: Ctx;
let httpServer: HttpServer;
let io: SocketIOServer;
let url = "";
let seq = 0;
const clients: ClientSocket[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  if (skip) return;
  ctx = await boot("fin-sockpres");
  const { registerChatHandlers } = await import("../../realtime/socketServer.js");
  httpServer = createServer();
  io = new SocketIOServer(httpServer);
  io.use((socket, next) => { socket.data = { userId: socket.handshake.auth.userId, role: "USER", astrologerProfileId: null }; next(); });
  io.on("connection", (socket) => registerChatHandlers(socket));
  ctx.billing.attachIo(io);
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

async function liveChat(key: string): Promise<Live> {
  const userId = await makeUser(ctx, key);
  await fund(ctx, userId, { purchased: 5000 });
  await burnFree(ctx, userId);
  return activate(ctx, userId, await makeAstrologer(ctx, `s${++seq}`)); // real timers stopped; the events under test drive billing
}
async function waitStatus(id: string, status: string, maxMs = 3000) {
  const deadline = Date.now() + maxMs;
  let row = await sessionRow(ctx, id);
  while (row.status !== status && Date.now() < deadline) { await sleep(40); row = await sessionRow(ctx, id); }
  return row;
}

test("closing the user's only connection pauses the chat at once and bills exactly up to the disconnect", { skip }, async () => {
  const s = await liveChat("close");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);

  await sleep(2300);
  const pausedSeen = new Promise<any>((resolve) => astro.once("chat:paused", resolve));
  const disconnectedAt = Date.now();
  user.disconnect();

  const row = await waitStatus(s.id, "PAUSED");
  assert.equal(row.status, "PAUSED", "no 15s wait: the server saw the socket close");
  assert.ok(Math.abs(row.pausedAt!.getTime() - disconnectedAt) < 600, "pausedAt is the disconnect instant");
  const expected = Math.floor((row.pausedAt!.getTime() - s.t0) / 1000);
  assert.equal(row.billedSeconds, expected, `billed ${row.billedSeconds}s; the chat ran ${expected} completed seconds before the disconnect`);
  assert.ok(row.billedSeconds >= 2 && row.billedSeconds <= 3);
  assert.equal(row.amountPaise, cumulative(row.billedSeconds));
  assert.equal((await sessionDebits(ctx, s.id)).total, cumulative(row.billedSeconds));
  assert.equal((await pausedSeen).sessionId, s.id, "the other participant is told immediately");

  await sleep(1200); // still paused, still nothing more billed
  const later = await sessionRow(ctx, s.id);
  assert.deepEqual([later.status, later.billedSeconds], ["PAUSED", row.billedSeconds]);
  await ctx.billing.endSession(s.id, "DISCONNECTED");
  await assertWalletSound(ctx, s.userId);
});

test("chat:leave (the user navigates away but stays connected) stops billing at that moment too", { skip }, async () => {
  const s = await liveChat("leave");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);
  await sleep(1200);
  user.emit("chat:leave", { sessionId: s.id });

  const row = await waitStatus(s.id, "PAUSED");
  assert.equal(row.status, "PAUSED");
  assert.equal(row.billedSeconds, Math.floor((row.pausedAt!.getTime() - s.t0) / 1000));
  assert.ok(user.connected, "the socket itself is still connected — only this chat was left");
  await ctx.billing.endSession(s.id, "DISCONNECTED");
});

test("multi-tab: closing ONE of the user's two tabs does not pause the chat; closing the last one does", { skip }, async () => {
  const s = await liveChat("tabs");
  const tab1 = await client(s.userId);
  const tab2 = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(tab1, s.id);
  await join(tab2, s.id);
  await join(astro, s.id);

  tab1.disconnect();
  await sleep(700);
  assert.equal((await sessionRow(ctx, s.id)).status, "ACTIVE", "the user is still present in the other tab");

  tab2.disconnect();
  const row = await waitStatus(s.id, "PAUSED");
  assert.equal(row.status, "PAUSED", "now the user's last connection is gone");
  await ctx.billing.endSession(s.id, "DISCONNECTED");
});

test("reconnect: joining again from a new socket resumes the chat, and the disconnected gap is not billed", { skip }, async () => {
  const s = await liveChat("rejoin");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);
  await sleep(1200);
  user.disconnect();
  const paused = await waitStatus(s.id, "PAUSED");
  assert.equal(paused.status, "PAUSED");

  await sleep(1500); // the gap
  const resumedSeen = new Promise<any>((resolve) => astro.once("chat:resumed", resolve));
  const back = await client(s.userId);
  await join(back, s.id);
  const resumed = await waitStatus(s.id, "ACTIVE");
  ctx.billing.unregisterSession(s.id);
  assert.equal(resumed.status, "ACTIVE");
  assert.equal((await resumedSeen).sessionId, s.id);
  assert.equal(resumed.billedSeconds, paused.billedSeconds, "the 1.5s gap billed nothing");
  assert.ok(resumed.lastBilledAt.getTime() >= paused.pausedAt!.getTime() + 1400, "billing restarts from the reconnect, not from the disconnect");

  // A reconnected client that only heartbeats (no re-join) is still tracked: its next disconnect is observed.
  back.disconnect();
  const again = await waitStatus(s.id, "PAUSED");
  assert.equal(again.status, "PAUSED");
  await ctx.billing.endSession(s.id, "DISCONNECTED");
  await assertWalletSound(ctx, s.userId);
});

test("after an automatic reconnect a client that only HEARTBEATS (never re-sends chat:join) is tracked, receives messages, and its disconnect is observed", { skip }, async () => {
  const s = await liveChat("hbonly");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);
  user.disconnect();
  assert.equal((await waitStatus(s.id, "PAUSED")).status, "PAUSED");

  const back = await client(s.userId); // new socket, as after socket.io auto-reconnect
  back.emit("chat:heartbeat", { sessionId: s.id }); // the frontend resumes heartbeating without re-joining
  assert.equal((await waitStatus(s.id, "ACTIVE")).status, "ACTIVE");
  ctx.billing.unregisterSession(s.id);

  const got = new Promise<any>((resolve) => back.once("chat:message", resolve));
  astro.emit("chat:message", { sessionId: s.id, content: "are you back?" }, () => undefined);
  assert.equal((await Promise.race([got, sleep(2000).then(() => null)]))?.content, "are you back?", "the heartbeat re-established room membership");

  back.disconnect();
  assert.equal((await waitStatus(s.id, "PAUSED")).status, "PAUSED", "and the server observed this socket leaving");
  await ctx.billing.endSession(s.id, "DISCONNECTED");
});

test("a non-participant's socket coming and going never affects someone else's chat", { skip }, async () => {
  const s = await liveChat("stranger");
  const user = await client(s.userId);
  const astro = await client(s.astro.userId);
  await join(user, s.id);
  await join(astro, s.id);
  const stranger = await client(await makeUser(ctx, "outsider"));
  stranger.emit("chat:leave", { sessionId: s.id });
  stranger.emit("chat:heartbeat", { sessionId: s.id });
  stranger.disconnect();
  await sleep(600);
  assert.equal((await sessionRow(ctx, s.id)).status, "ACTIVE");
  await ctx.billing.endSession(s.id, "USER_ENDED");
});
