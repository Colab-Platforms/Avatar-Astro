// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:chat-session
//
// END-TO-END proof, through the REAL server (src/index.ts), a real local database and real JWT auth, that the Divya
// Margdarshak free session and its conversation survive a refresh: the status endpoint reports the same expiry and the
// same active conversation every time, never restarts or extends the window, and never invents a replacement.
// The AI provider is stubbed at the network layer (no real request, no real key).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import jwt from "jsonwebtoken";
import pg from "pg";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

const SECRET = "chat-session-test-only-secret-0123456789abcdef";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "../../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "chatsession-"));
const MODE_FILE = path.join(TMP, "mode.json");
const CALLS_FILE = path.join(TMP, "calls.txt");
const CONTENT_FILE = path.join(TMP, "content.json");

let child: ChildProcess | undefined;
let base = "";
let log = "";
const ids: Record<string, string> = {};
const t: Record<string, string> = {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise<number>((res) => { const s = createServer().listen(0, () => { const p = (s.address() as any).port; s.close(() => res(p)); }); });

async function call(method: string, p: string, token?: string, body?: unknown) {
  const res = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, headers: res.headers };
}
const status = async (token: string) => (await call("GET", "/api/inner-voice/chat/status", token)).data.data;
const consume = (token: string) => call("POST", "/api/inner-voice/chat/consume", token);
const chat = (token: string, text: string, conversationId?: string) =>
  call("POST", "/api/ai/chat", token, { messages: [{ role: "system", content: "guru" }, { role: "user", content: text }], library: { feature: "ai-guru", ...(conversationId ? { conversationId } : {}) } });

async function sql(text: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: TEST_DB });
  await c.connect();
  try { return await c.query(text, params); } finally { await c.end(); }
}

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = TEST_DB;
  process.env.JWT_SECRET = SECRET;
  process.env.DB_POOL_MAX = "1";
  const prisma = (await import("../../../prisma.js")).default as any;
  await prisma.user.deleteMany({ where: { email: { endsWith: "@chat-session-test.example" } } });
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  for (const key of ["userA", "userB", "userC"]) {
    const u = await prisma.user.create({ data: { email: `${key}@chat-session-test.example`, firstName: key, lastName: "Chat", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: role.id } } } });
    ids[key] = u.id;
    t[key] = jwt.sign({ id: u.id, role: "USER" }, SECRET);
  }
  await prisma.$disconnect();
  fs.writeFileSync(MODE_FILE, JSON.stringify({ mode: "ok" }));
  fs.writeFileSync(CONTENT_FILE, JSON.stringify({ content: JSON.stringify({ type: "gathering", message: "Namaste. Tell me more.", progress: 20 }) }));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const preload = pathToFileURL(path.join(HERE, "../helpers/providerStubPreload.mjs")).href;
  child = spawn(process.execPath, ["--import", "tsx", "--import", preload, "src/index.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env, PORT: String(port), NODE_ENV: "development", DATABASE_URL: TEST_DB, DB_POOL_MAX: "1", JWT_SECRET: SECRET,
      STUB_MODE_FILE: MODE_FILE, STUB_CALLS_FILE: CALLS_FILE, STUB_CONTENT_FILE: CONTENT_FILE,
      OPENROUTER_API_KEY: "fake-chat-key", GROQ_API_KEY: "fake-chat-key", SARVAM_API_KEY: "fake-chat-key",
      MAIN_ADMIN_EMAIL: "", RESEND_API_KEY: "", YOUTUBE_API_KEY: "", BACKEND_PUBLIC_URL: "", DARSHAN_WEBSUB_SECRET: "", GOOGLE_CLIENT_ID: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => (log += d));
  child.stderr?.on("data", (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* starting */ }
    await sleep(1000);
  }
  throw new Error("server did not start:\n" + log.split("\n").filter((l) => !/key|secret|token/i.test(l)).slice(-15).join("\n"));
});

after(async () => {
  if (skip) return;
  if (child?.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: true });
  child?.kill();
  await sleep(500);
  const prisma = (await import("../../../prisma.js")).default as any;
  await prisma.user.deleteMany({ where: { email: { endsWith: "@chat-session-test.example" } } });
  await prisma.$disconnect();
  fs.rmSync(TMP, { recursive: true, force: true });
});

test("before any message: NOT_STARTED, no conversation, and reading status never starts the timer", { skip }, async () => {
  const a = await status(t.userA);
  const b = await status(t.userA);
  assert.equal(a.status, "NOT_STARTED");
  assert.equal(a.activeConversationId, null);
  assert.equal(b.status, "NOT_STARTED", "a refresh must not start the free session");
  assert.ok(Number.isFinite(Date.parse(a.serverNow)), "status carries the server clock");
});

test("refresh keeps the same expiry, the same conversation and a shrinking (never growing) remaining time", { skip }, async () => {
  const started = await consume(t.userA);
  assert.equal(started.status, 200);
  const first = await chat(t.userA, "I feel stuck in my career");
  const cid = first.headers.get("x-conversation-id")!;
  assert.ok(cid);
  await consume(t.userA);
  await chat(t.userA, "It started last year", cid);
  await consume(t.userA);
  const third = await chat(t.userA, "What should I do?", cid);
  assert.equal(third.headers.get("x-conversation-id"), cid);

  const s1 = await status(t.userA);
  await sleep(1500);
  const s2 = await status(t.userA);
  assert.equal(s1.status, "ACTIVE");
  assert.equal(s1.startedAt, s2.startedAt, "startedAt never moves");
  assert.equal(s1.expiresAt, s2.expiresAt, "expiresAt never moves");
  assert.equal(Date.parse(s1.expiresAt) - Date.parse(s1.startedAt), 300_000, "free-session length is unchanged");
  assert.ok(s2.remainingSeconds < s1.remainingSeconds, "time only runs down between refreshes");
  assert.ok(s2.remainingSeconds >= 0);
  assert.equal(s1.activeConversationId, cid, "refresh finds the same conversation");
  assert.equal(s2.activeConversationId, cid);

  const stored = (await call("GET", `/api/me/conversations/${cid}`, t.userA)).data.data;
  assert.equal(stored.messages.filter((m: any) => m.role === "user").length, 3, "all three messages are restored");
  assert.equal(stored.messages.length, 6);
  const count = (await sql("SELECT count(*)::int AS n FROM conversations WHERE user_id = $1", [ids.userA])).rows[0].n;
  assert.equal(count, 1, "refreshing and re-reading never creates another conversation");

  // consume (what each send calls) after a refresh also keeps the original window
  const again = (await consume(t.userA)).data.data;
  assert.equal(again.expiresAt, s1.expiresAt);
});

test("an explicit new chat becomes the active conversation; the old one stays intact", { skip }, async () => {
  const prev = await status(t.userA);
  await consume(t.userA);
  const fresh = await chat(t.userA, "A different question about marriage"); // no conversationId = New Chat
  const newId = fresh.headers.get("x-conversation-id")!;
  assert.ok(newId && newId !== prev.activeConversationId);
  const next = await status(t.userA);
  assert.equal(next.activeConversationId, newId);
  assert.equal(next.expiresAt, prev.expiresAt, "starting a new chat does not renew the free session");
  const old = (await call("GET", `/api/me/conversations/${prev.activeConversationId}`, t.userA)).data.data;
  assert.equal(old.messages.length, 6);
});

test("expired session: still reports the conversation, refuses new messages, and never starts a replacement", { skip }, async () => {
  const s = await status(t.userA);
  await sql("UPDATE daily_chat_usages SET started_at = (now() at time zone 'utc') - interval '10 minutes', expires_at = (now() at time zone 'utc') - interval '5 minutes' WHERE user_id = $1", [ids.userA]);
  const e1 = await status(t.userA);
  assert.equal(e1.status, "EXPIRED");
  assert.equal(e1.remainingSeconds, 0);
  assert.equal(e1.allowed, false);
  assert.equal(e1.activeConversationId, s.activeConversationId, "the conversation can still be read after expiry");
  const denied = await consume(t.userA);
  assert.equal(denied.status, 429);
  assert.equal(denied.data.code, "DAILY_CHAT_LIMIT_REACHED");
  const e2 = await status(t.userA);
  assert.equal(e2.status, "EXPIRED", "still expired after the refused attempt and a refresh");
  const rows = (await sql("SELECT count(*)::int AS n FROM daily_chat_usages WHERE user_id = $1", [ids.userA])).rows[0].n;
  assert.equal(rows, 1, "no replacement free session was created");
});

test("a conversation is never reported from before the session, or from another user", { skip }, async () => {
  // userB has an older conversation, then starts a session later: that old conversation is not "active".
  const old = await chat(t.userB, "Old question from earlier");
  const oldId = old.headers.get("x-conversation-id")!;
  assert.ok(oldId);
  await sql("UPDATE conversations SET last_message_at = (now() at time zone 'utc') - interval '2 hours' WHERE id = $1", [oldId]);
  await consume(t.userB);
  const sb = await status(t.userB);
  assert.equal(sb.status, "ACTIVE");
  assert.equal(sb.activeConversationId, null);

  // userC's conversation is invisible to userB
  await consume(t.userC);
  const c = await chat(t.userC, "Private question");
  assert.ok(c.headers.get("x-conversation-id"));
  assert.equal((await status(t.userB)).activeConversationId, null);
  assert.equal((await status(t.userC)).activeConversationId, c.headers.get("x-conversation-id"));
});
