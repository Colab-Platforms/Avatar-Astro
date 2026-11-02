// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:tool-limits
//
// END-TO-END proof, through the REAL server (src/index.ts), a real local database and real JWT auth, of astrology tool management:
// on/off switch, per-user rolling-24h limits (per tool), enforcement across sessions and under concurrency, reset after the window,
// admin changes without a restart, analytics from real usage rows, admin-only access, and the OpenRouter credits states.
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

const SECRET = "tool-limits-test-only-secret-0123456789abcdef";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "../../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "toollimits-"));
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
const setMode = (mode: string) => fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }));
const says = (o: unknown) => fs.writeFileSync(CONTENT_FILE, JSON.stringify({ content: JSON.stringify(o) }));
const providerCalls = () => (fs.existsSync(CALLS_FILE) ? fs.readFileSync(CALLS_FILE, "utf8").split("\n").filter(Boolean).length : 0);

const TAROT = { currentKarmaTheme: "Letting go", rootCause: "Holding on", lifeAreasAffected: ["work"], dailyAction: "Breathe", weeklyAction: "Journal", spiritualPractice: "Sit", recommendedHabit: "Walk", reflectionQuestion: "What next?", positiveAffirmation: "I release", cardInsights: [{ insight: "one" }, { insight: "two" }, { insight: "three" }] };
const NAME = { summary: "A name that carries leadership and warmth" };

async function call(method: string, p: string, token?: string, body?: unknown) {
  const res = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, headers: res.headers, text };
}
const tarot = (token?: string) => call("POST", "/api/tarot/reading", token, { mode: "karma", cards: ["The Fool", "The Magician", "The High Priestess"] });
const nameApi = (token?: string) => call("POST", "/api/name-analysis/narrative", token, { name: "Asha", dob: "1990-01-01", lifePath: 1, destiny: 2 });
const COMPAT_BODY = { p1: { name: "A", dob: "1990-01-01", zodiac: "Aries", lifePath: 1 }, p2: { name: "B", dob: "1991-02-02", zodiac: "Leo", lifePath: 3 }, scores: { overall: 80, love: 80, marriage: 80 } };
const compat = (token?: string) => call("POST", "/api/compatibility/analyze", token, COMPAT_BODY);
const chart = (token?: string) => call("POST", "/api/birthchart/analyze", token, { name: "A", zodiac: "Aries", lifePath: 1, dob: "1990-01-01", place: "Delhi" });
const horoscope = (token?: string, sign = "aries") => call("GET", `/api/interpretation/horoscope/${sign}`, token);
const HOROSCOPE = { overview: "o", career: "c", love: "l", health: "h", mood: "m", opportunities: "p", mindful: "w", guidance: "g" };
// NOTE: the tools' own per-IP rate limiters (10/min) are separate from this feature and also count, so each test below keeps to its own tool.
const setTool = (token: string | undefined, key: string, body: unknown) => call("PUT", `/api/admin/tools/${key}`, token, body);
const tools = async () => ((await call("GET", "/api/admin/tools", t.owner)).data.data.tools as any[]);
const toolRow = async (key: string) => (await tools()).find((x) => x.key === key);

async function sql(text: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: TEST_DB });
  await c.connect();
  try { return await c.query(text, params); } finally { await c.end(); }
}
const attempts = async (tool: string, userKey: string) => (await sql("SELECT count(*)::int n FROM tool_usage_attempts WHERE tool_key=$1 AND user_id=$2", [tool, ids[userKey]])).rows[0].n as number;

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = TEST_DB;
  process.env.JWT_SECRET = SECRET;
  process.env.DB_POOL_MAX = "1";
  const prisma = (await import("../../../prisma.js")).default as any;
  await prisma.usageEvent.deleteMany();
  await prisma.toolLimit.deleteMany();
  await prisma.toolUsageAttempt.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@tool-limits-test.example" } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  for (const [key, role] of [["owner", "SUPERADMIN"], ["alice", "USER"], ["bob", "USER"]] as const) {
    const u = await prisma.user.create({ data: { email: `${key}@tool-limits-test.example`, firstName: key, lastName: "T", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } });
    ids[key] = u.id;
    t[key] = jwt.sign({ id: u.id, role: role === "SUPERADMIN" ? "SUPERADMIN" : "USER" }, SECRET);
  }
  t.aliceSecondDevice = jwt.sign({ id: ids.alice, role: "USER" }, SECRET, { expiresIn: "2h" }); // a different token = a different session/device
  await prisma.$disconnect();
  setMode("ok");
  says(TAROT);
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const preload = pathToFileURL(path.join(HERE, "../helpers/providerStubPreload.mjs")).href;
  child = spawn(process.execPath, ["--import", "tsx", "--import", preload, "src/index.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env, PORT: String(port), NODE_ENV: "development", DATABASE_URL: TEST_DB, DB_POOL_MAX: "1", JWT_SECRET: SECRET,
      STUB_MODE_FILE: MODE_FILE, STUB_CALLS_FILE: CALLS_FILE, STUB_CONTENT_FILE: CONTENT_FILE,
      OPENROUTER_API_KEY: "fake-key", GROQ_API_KEY: "fake-key", SARVAM_API_KEY: "fake-key",
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
  await prisma.usageEvent.deleteMany();
  await prisma.toolLimit.deleteMany();
  await prisma.toolUsageAttempt.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@tool-limits-test.example" } } });
  await prisma.$disconnect();
  fs.rmSync(TMP, { recursive: true, force: true });
});

test("only the main admin can read or change tool settings", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/tools")).status, 401);
  assert.equal((await call("GET", "/api/admin/tools", t.alice)).status, 403);
  assert.equal((await setTool(t.alice, "tarot", { enabled: false })).status, 403);
  assert.equal((await setTool(undefined, "tarot", { limit: 1 })).status, 401);
  assert.equal((await call("GET", "/api/admin/providers/balance", t.alice)).status, 403);
  assert.equal((await call("POST", "/api/admin/providers/balance/refresh", t.alice)).status, 403);
  assert.equal(await providerCalls(), 0);
  const r = await call("GET", "/api/admin/tools", t.owner);
  assert.equal(r.status, 200);
  const keys = r.data.data.tools.map((x: any) => x.key);
  for (const k of ["tarot", "birth-chart", "compatibility", "name-analysis", "interpretation", "palm-reading", "zodiac", "gemstone"]) assert.ok(keys.includes(k), k);
  const tarotRow = r.data.data.tools.find((x: any) => x.key === "tarot");
  assert.deepEqual(tarotRow.endpoints, ["POST /api/tarot/reading"]);
  assert.equal(tarotRow.limit, null);
  assert.equal(r.data.data.tools.find((x: any) => x.key === "zodiac").limitSupported, false);
});

test("switching a tool off rejects new requests at once with 503 and leaves existing data alone; switching on restores it", { skip }, async () => {
  const first = await tarot(t.alice);
  assert.equal(first.status, 200);
  const libraryBefore = (await sql("SELECT count(*)::int n FROM generated_readings WHERE user_id=$1", [ids.alice])).rows[0].n;
  const calls = providerCalls();

  assert.equal((await setTool(t.owner, "tarot", { enabled: false })).status, 200);
  const off = await tarot(t.alice);
  assert.equal(off.status, 503);
  assert.equal(off.data.code, "FEATURE_DISABLED");
  assert.match(off.data.message, /temporarily unavailable/i);
  assert.equal(providerCalls(), calls, "no provider call while off");
  assert.equal((await sql("SELECT count(*)::int n FROM generated_readings WHERE user_id=$1", [ids.alice])).rows[0].n, libraryBefore, "earlier results are untouched");
  assert.equal(await attempts("tarot", "alice"), 0, "a rejected request is not a use");

  assert.equal((await setTool(t.owner, "tarot", { enabled: true })).status, 200);
  assert.equal((await tarot(t.alice)).status, 200);
});

test("limits are per tool, per user, shared by all of a user's sessions, and return 429 with the retry time", { skip }, async () => {
  await sql("DELETE FROM tool_usage_attempts");
  assert.equal((await setTool(t.owner, "tarot", { limit: 2 })).status, 200);
  assert.equal((await setTool(t.owner, "name-analysis", { limit: 3 })).status, 200);
  says(TAROT);
  assert.equal((await tarot(t.alice)).status, 200); // session 1
  assert.equal((await tarot(t.aliceSecondDevice)).status, 200); // session 2 (same account)
  const blocked = await tarot(t.alice);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.data.code, "TOOL_LIMIT_REACHED");
  assert.match(blocked.data.message, /all 2 uses.*last 24 hours.*try again after/i);
  assert.equal(blocked.data.data.limit, 2);
  const retryAt = new Date(blocked.data.data.retryAt).getTime();
  const first = Number((await sql("SELECT extract(epoch from min(created_at))*1000 AS ms FROM tool_usage_attempts WHERE tool_key='tarot' AND user_id=$1", [ids.alice])).rows[0].ms);
  assert.ok(Math.abs(retryAt - (first + 86_400_000)) < 60_000, "retry = first use + 24h");
  assert.ok(Number(blocked.headers.get("retry-after")) > 86_000);
  assert.equal((await tarot(t.aliceSecondDevice)).status, 429, "another device is limited too");

  // other user and other tool are unaffected, and have their own limit
  assert.equal((await tarot(t.bob)).status, 200);
  says(NAME);
  for (let i = 0; i < 3; i++) assert.equal((await nameApi(t.alice)).status, 200, `name-analysis use ${i + 1}`);
  assert.equal((await nameApi(t.alice)).status, 429);
  assert.equal((await nameApi(t.bob)).status, 200);
});

test("uses expire after a rolling 24 hours, one at a time", { skip }, async () => {
  says({ loveInsight: "x", marriageWindow: "y" });
  await sql("DELETE FROM tool_usage_attempts");
  assert.equal((await setTool(t.owner, "compatibility", { limit: 3 })).status, 200);
  for (let i = 0; i < 3; i++) assert.equal((await compat(t.alice)).status, 200);
  assert.equal((await compat(t.alice)).status, 429);
  // alice is at 2/2 on tarot. Age her oldest use past 24h: exactly one slot frees up.
  await sql("UPDATE tool_usage_attempts SET created_at = created_at - interval '25 hours' WHERE id = (SELECT id FROM tool_usage_attempts WHERE tool_key='compatibility' AND user_id=$1 ORDER BY created_at LIMIT 1)", [ids.alice]);
  assert.equal((await compat(t.alice)).status, 200);
  assert.equal((await compat(t.alice)).status, 429, "only one slot was freed");
  assert.equal(await attempts("compatibility", "alice"), 3, "the expired row was pruned");
  await sql("UPDATE tool_usage_attempts SET created_at = created_at - interval '25 hours' WHERE tool_key='compatibility' AND user_id=$1", [ids.alice]);
  for (let i = 0; i < 3; i++) assert.equal((await compat(t.alice)).status, 200);
  assert.equal((await compat(t.alice)).status, 429);
});

test("concurrent requests cannot exceed the limit", { skip }, async () => {
  await sql("DELETE FROM tool_usage_attempts");
  assert.equal((await setTool(t.owner, "birth-chart", { limit: 3 })).status, 200);
  says({ overview: "x" });
  const results = await Promise.all(Array.from({ length: 9 }, (_, i) => chart(i % 2 ? t.alice : t.aliceSecondDevice)));
  const ok = results.filter((r) => r.status === 200).length;
  assert.equal(ok, 3, "exactly the limit gets through: " + results.map((r) => r.status + ":" + (r.data?.code ?? r.data?.error?.message ?? r.data?.error ?? "")).join(" | "));
  assert.equal(results.filter((r) => r.status === 429).length, 6);
  assert.equal(await attempts("birth-chart", "alice"), 3);
});

test("a failure on our side or the provider's is refunded; only real uses count", { skip }, async () => {
  await sql("DELETE FROM tool_usage_attempts");
  assert.equal((await setTool(t.owner, "tarot", { limit: 2 })).status, 200);
  assert.equal((await setTool(t.owner, "interpretation", { limit: 2 })).status, 200);
  setMode("error");
  says(TAROT);
  const failed = await tarot(t.bob);
  assert.ok(failed.status >= 500, `status ${failed.status}`);
  await sleep(300);
  assert.equal(await attempts("tarot", "bob"), 0, "provider failure refunded");
  setMode("ok");
  const bad = await horoscope(t.bob, "ophiuchus");
  assert.equal(bad.status, 400, JSON.stringify(bad.data));
  assert.equal(await attempts("interpretation", "bob"), 1, "a request rejected for bad input is an attempt and counts");
});

test("limits need a signed-in user; anonymous callers are not served a limited tool", { skip }, async () => {
  assert.equal((await setTool(t.owner, "interpretation", { limit: 5 })).status, 200);
  const anon = await call("GET", "/api/interpretation/horoscope/aries");
  assert.equal(anon.status, 401);
  assert.equal(anon.data.code, "SIGN_IN_REQUIRED");
  assert.equal((await setTool(t.owner, "interpretation", { limit: null })).status, 200);
  assert.notEqual((await call("GET", "/api/interpretation/horoscope/aries")).status, 401, "unlimited again: public as before");
});

test("admin changes apply immediately without a restart; input is validated; every change is audited", { skip }, async () => {
  await sql("DELETE FROM tool_usage_attempts");
  says(HOROSCOPE);
  assert.equal((await setTool(t.owner, "interpretation", { limit: 1 })).status, 200);
  assert.equal((await horoscope(t.bob)).status, 200);
  assert.equal((await horoscope(t.bob)).status, 429);
  assert.equal((await setTool(t.owner, "interpretation", { limit: 5 })).status, 200);
  assert.equal((await horoscope(t.bob)).status, 200, "raised limit takes effect on the next request");
  assert.equal((await setTool(t.owner, "interpretation", { limit: null })).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await horoscope(t.bob)).status, 200);

  for (const bad of [0, -1, 1.5, "3", 100001, true, {}]) assert.equal((await setTool(t.owner, "interpretation", { limit: bad })).status, 400, JSON.stringify(bad));
  assert.equal((await setTool(t.owner, "interpretation", {})).status, 400);
  assert.equal((await setTool(t.owner, "interpretation", { enabled: "yes" })).status, 400);
  assert.equal((await setTool(t.owner, "zodiac", { limit: 3 })).status, 400, "a tool without a metered endpoint has no limit");
  assert.equal((await setTool(t.owner, "nope", { enabled: false })).status, 404);
  const row = await toolRow("interpretation");
  assert.equal(row.limit, null);
  const audits = (await sql("SELECT summary FROM admin_audit_logs WHERE action='feature.limit' AND entity_id='interpretation' ORDER BY created_at")).rows.map((r) => r.summary as string);
  assert.ok(audits.some((s) => /to 1 per 24 hours/.test(s)) && audits.some((s) => /to 5 per 24 hours/.test(s)) && audits.some((s) => /Removed the per-user limit/.test(s)));
  // one admin request can change both the switch and the limit atomically
  assert.equal((await setTool(t.owner, "birth-chart", { enabled: false, limit: 4 })).status, 200);
  const bc = await toolRow("birth-chart");
  assert.equal(bc.enabled, false);
  assert.equal(bc.limit, 4);
  assert.equal((await setTool(t.owner, "birth-chart", { enabled: true })).status, 200);
});

test("analytics come from real usage rows: requests, failures, blocked (switch off or limit) and last used", { skip }, async () => {
  await sql("DELETE FROM usage_events");
  await sql("DELETE FROM tool_usage_attempts");
  assert.equal((await setTool(t.owner, "name-analysis", { limit: 2 })).status, 200);
  says(NAME);
  await nameApi(t.alice); await nameApi(t.alice); // 2 successes
  await nameApi(t.alice); // 1 blocked by limit
  setMode("error"); says(TAROT); await tarot(t.bob); setMode("ok"); says(NAME); // one tarot failure, to be shown on the tarot row
  assert.equal((await setTool(t.owner, "name-analysis", { enabled: false })).status, 200);
  await nameApi(t.bob); // 1 blocked by switch
  assert.equal((await setTool(t.owner, "name-analysis", { enabled: true })).status, 200);
  await sleep(1500);
  const row = await toolRow("name-analysis");
  assert.equal(row.usage.total, 4);
  assert.equal(row.usage.errors, 0);
  assert.equal(row.usage.blocked, 2, "limit + switch-off rejections");
  const tr = await toolRow("tarot");
  assert.equal(tr.usage.errors, 1, "a provider failure is a failure, not a rejection");
  assert.equal(tr.usage.blocked, 0);
  assert.ok(row.usage.lastAt && Date.now() - new Date(row.usage.lastAt).getTime() < 60_000);
  const untouched = await toolRow("compatibility");
  assert.deepEqual([untouched.usage.total, untouched.usage.errors, untouched.usage.blocked, untouched.usage.lastAt], [0, 0, 0, null], "a tool nobody used shows zeros, not placeholders");
});

// ── OpenRouter credits (unit level, with a fake fetch: no real key, no network) ──
test("OpenRouter credits: success, not configured, rejected key and API failure keep the last good snapshot", { skip }, async () => {
  const pb = await import("../../modules/admin/providerBalance.js");
  const ok = (url: string) => Promise.resolve(new Response(JSON.stringify(/credits/.test(url) ? { data: { total_credits: 100, total_usage: 37.5 } } : { data: { usage: 1, limit: null } }), { status: 200 }));
  let c = await pb.fetchOpenRouterCredits({ OPENROUTER_MANAGEMENT_KEY: "sk-or-MGMT" } as any, ok as any);
  assert.deepEqual([c.status, c.totalCredits, c.totalUsage, c.remaining], ["ok", 100, 37.5, 62.5]);
  assert.ok(c.fetchedAt);

  c = await pb.fetchOpenRouterCredits({} as any, ok as any);
  assert.equal(c.status, "not_configured");
  assert.equal(c.remaining, null, "no invented balance");

  c = await pb.fetchOpenRouterCredits({ OPENROUTER_MANAGEMENT_KEY: "sk-or-MGMT" } as any, (() => Promise.resolve(new Response("{}", { status: 401 }))) as any);
  assert.equal(c.status, "error");
  assert.doesNotMatch(JSON.stringify(c), /sk-or-MGMT/);

  const good = await pb.checkOpenRouter({ OPENROUTER_API_KEY: "sk-or-KEY", OPENROUTER_MANAGEMENT_KEY: "sk-or-MGMT" } as any, ok as any);
  assert.equal(good.credits?.status, "ok");
  assert.equal(good.balance.remainingUsd, 62.5);
  const down = await pb.checkOpenRouter({ OPENROUTER_API_KEY: "sk-or-KEY", OPENROUTER_MANAGEMENT_KEY: "sk-or-MGMT" } as any, (() => Promise.reject(new Error("network down sk-or-MGMT"))) as any);
  assert.equal(down.credits?.status, "error");
  const merged = pb.mergeWithPrevious([down], [good])[0];
  assert.equal(merged.credits?.status, "error");
  assert.equal(merged.credits?.stale, true);
  assert.equal(merged.credits?.remaining, 62.5, "last successful numbers are kept, and marked stale");
  assert.equal(merged.credits?.fetchedAt, good.credits?.fetchedAt);
  assert.doesNotMatch(JSON.stringify(down), /sk-or-/);
});
