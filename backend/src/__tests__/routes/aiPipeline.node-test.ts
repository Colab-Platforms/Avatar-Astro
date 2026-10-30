// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:pipeline
//
// END-TO-END proof of the AI usage pipeline through the REAL server entrypoint (src/index.ts):
//   real route -> real service -> provider HTTP call (stubbed network) -> capture -> usage row in Postgres
//   -> Admin API (/api/admin/activity, /costs/summary, /costs/diagnostics).
// The server runs as a child process with a preload that replaces the network for AI provider hosts. No real provider is
// contacted and no real key is used. Needs a DISPOSABLE localhost Postgres with all migrations applied.
// The test process does not touch the database while the server runs (the embedded test database serves one connection).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import jwt from "jsonwebtoken";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

const SECRET = "pipeline-test-only-secret-0123456789abcdef";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "../../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ai-pipeline-"));
const MODE_FILE = path.join(TMP, "mode.json");
const CALLS_FILE = path.join(TMP, "calls.txt");

let child: ChildProcess | undefined;
let base = "";
let log = "";
const ids: Record<string, string> = {};
let t: Record<string, string> = {};

const setMode = (mode: string) => fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }));
const providerCalls = () => (fs.existsSync(CALLS_FILE) ? fs.readFileSync(CALLS_FILE, "utf8").split("\n").filter(Boolean) : []);
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
  return { status: res.status, data, text };
}

/** Feature requests as the Admin API shows them, newest first. */
async function activity(qs = "") {
  for (let i = 0; i < 25; i++) {
    const r = await call("GET", `/api/admin/activity?eventType=feature.request&pageSize=100${qs}`, t.owner);
    if (r.status === 200) return r.data.data.items as any[];
    await sleep(200);
  }
  throw new Error("activity API not reachable");
}
/** Wait until the fire-and-forget usage row for this request is visible through the Admin API. */
async function rowsFor(feature: string, expected: number) {
  for (let i = 0; i < 40; i++) {
    const rows = (await activity(`&feature=${feature}`)).filter((r) => r);
    if (rows.length >= expected) return rows;
    await sleep(150);
  }
  throw new Error(`expected ${expected} usage row(s) for ${feature}`);
}

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = TEST_DB;
  process.env.JWT_SECRET = SECRET;
  process.env.DB_POOL_MAX = "1";
  const prisma = (await import("../../../prisma.js")).default as any;
  await prisma.usageEvent.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@pipeline-test.example" } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  for (const [key, role] of [["owner", "SUPERADMIN"], ["alice", "USER"]] as const) {
    const u = await prisma.user.create({ data: { email: `${key}@pipeline-test.example`, firstName: key, lastName: "Pipe", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } });
    ids[key] = u.id;
  }
  await prisma.$disconnect();
  t = { owner: jwt.sign({ id: ids.owner, role: "SUPERADMIN" }, SECRET), alice: jwt.sign({ id: ids.alice, role: "USER" }, SECRET) };

  setMode("ok");
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const preload = pathToFileURL(path.join(HERE, "../helpers/providerStubPreload.mjs")).href;
  child = spawn(process.execPath, ["--import", "tsx", "--import", preload, "src/index.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env,
      PORT: String(port), NODE_ENV: "development", DATABASE_URL: TEST_DB, DB_POOL_MAX: "1", JWT_SECRET: SECRET,
      STUB_MODE_FILE: MODE_FILE, STUB_CALLS_FILE: CALLS_FILE,
      // fake keys: present only so the routes proceed to the (stubbed) provider call
      OPENROUTER_API_KEY: "fake-pipeline-key", GROQ_API_KEY: "fake-pipeline-key", SARVAM_API_KEY: "fake-pipeline-key",
      AI_PRICING_JSON: JSON.stringify({ "groq:*": { inputPerM: 1, outputPerM: 2 } }),
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
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@pipeline-test.example" } } });
  await prisma.$disconnect();
  fs.rmSync(TMP, { recursive: true, force: true });
});

const TAROT = { mode: "karma", cards: ["The Fool", "The Magician", "The High Priestess"] };
const GEM = { dateOfBirth: "1990-05-15", timeOfBirth: null, timeUnknown: true, place: { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" } };

// Each case: a REAL route, the provider/model the code really uses, and what the provider reply carries.
const CASES: { name: string; feature: string; run: () => Promise<{ status: number }>; provider: string; model: string; basis: "actual" | "estimated"; customer: boolean }[] = [
  { name: "AI Guru / Karma / Shloka (Groq proxy)", feature: "ai-chat", run: () => call("POST", "/api/ai/chat", t.alice, { messages: [{ role: "user", content: "hello" }] }), provider: "groq", model: "stub-groq-model", basis: "estimated", customer: true },
  { name: "Tarot", feature: "tarot", run: () => call("POST", "/api/tarot/reading", t.alice, TAROT), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Inner Voice guru chat", feature: "inner-voice", run: () => call("POST", "/api/inner-voice/guru-chat", t.alice, { message: "guide me" }), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Compatibility analysis", feature: "compatibility", run: () => call("POST", "/api/compatibility/analyze", t.alice, { p1: { name: "A", dob: "1990-01-01", zodiac: "Aries", lifePath: 1 }, p2: { name: "B", dob: "1991-02-02", zodiac: "Leo", lifePath: 3 }, scores: { overall: 80, love: 80, marriage: 80 } }), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Birth chart analyze", feature: "birth-chart", run: () => call("POST", "/api/birthchart/analyze", t.alice, { name: "A", zodiac: "Aries", lifePath: 1, dob: "1990-01-01", place: "Delhi" }), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Name analysis narrative", feature: "name-analysis", run: () => call("POST", "/api/name-analysis/narrative", t.alice, { name: "Asha", dob: "1990-01-01", lifePath: 1, destiny: 2 }), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Daily horoscope (anonymous, axios)", feature: "interpretation", run: () => call("GET", "/api/interpretation/horoscope/aries"), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: false },
  { name: "Chart interpretation (axios)", feature: "interpretation", run: () => call("GET", "/api/interpretation/compatibility?sign1=aries&sign2=leo", t.alice), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Palm reading (axios)", feature: "palm-reading", run: () => call("POST", "/api/palm-reading", t.alice, { imageBase64: "AAAA", imageType: "image/png", fingerprint: "1" }), provider: "openrouter", model: "stub/openrouter-model", basis: "actual", customer: true },
  { name: "Gemstone explanation (Groq via axios)", feature: "gemstone", run: () => call("POST", "/api/gemstone-calculator/calculate", undefined, GEM), provider: "groq", model: "stub-groq-model", basis: "estimated", customer: false },
];

test("every AI feature: provider, model, tokens and cost reach the database and the Admin API", { skip }, async () => {
  setMode("ok");
  const seen: string[] = [];
  for (const c of CASES) {
    const before = providerCalls().length;
    const r = await c.run();
    const callsMade = providerCalls().length - before;
    assert.ok(callsMade >= 1, `${c.name}: the route never reached the provider (HTTP ${r.status}) - the test input is wrong or the route gated it`);
    seen.push(c.name);
  }
  await sleep(1500);
  const rows = await activity();
  for (const c of CASES) {
    const mine = rows.filter((r) => r.feature === c.feature && r.ai && r.ai.provider === c.provider);
    assert.ok(mine.length >= 1, `${c.name}: no usage row with AI data for feature "${c.feature}" (rows: ${JSON.stringify(rows.filter((r) => r.feature === c.feature).map((r) => r.ai))})`);
    const row = mine.find((r) => !!r.customer === c.customer) ?? mine[0];
    assert.equal(row.ai.model, c.model, `${c.name}: model`);
    assert.equal(row.ai.costBasis, c.basis, `${c.name}: cost basis`);
    assert.equal(row.ai.totalTokens, c.basis === "actual" ? 200 : 1500, `${c.name}: tokens`);
    if (c.basis === "actual") assert.equal(row.ai.costUsd, 0.00042, `${c.name}: actual cost`);
    else assert.ok(Math.abs(row.ai.costUsd - (1000 * 1 + 500 * 2) / 1e6) < 1e-12, `${c.name}: estimated cost = tokens x configured price`);
    assert.equal(!!row.customer, c.customer, `${c.name}: customer attribution`);
    if (c.customer) assert.equal(row.customer.email, "alice@pipeline-test.example");
  }
  // one row per request, none duplicated: rows with AI == requests that reached a provider
  const aiRows = rows.filter((r) => r.ai);
  assert.equal(aiRows.length, CASES.length, "exactly one AI usage row per feature request");
  assert.equal(providerCalls().length, aiRows.reduce((n, r) => n + r.ai.calls, 0), "provider calls made == provider calls recorded");
});

test("Admin cost summary equals the stored rows (nothing added, nothing missing)", { skip }, async () => {
  const r = await call("GET", "/api/admin/costs/summary", t.owner);
  assert.equal(r.status, 200);
  const k = r.data.data.kpis;
  assert.equal(k.totalAiRequests, CASES.length);
  const actualN = CASES.filter((c) => c.basis === "actual").length;
  const estN = CASES.length - actualN;
  assert.ok(Math.abs(k.actualCostUsd - actualN * 0.00042) < 1e-9);
  assert.ok(Math.abs(k.estimatedCostUsd - estN * 0.002) < 1e-9);
  assert.equal(k.unpricedRequests, 0);
  const providers = Object.fromEntries(r.data.data.byProvider.map((p: any) => [p.key, p.requests]));
  assert.equal(providers.openrouter, actualN);
  assert.equal(providers.groq, estN);
});

test("provider reply without usage: the call and provider/model are recorded, tokens and cost stay empty (not zero)", { skip }, async () => {
  setMode("nousage");
  const before = (await activity("&feature=ai-chat")).length;
  await call("POST", "/api/ai/chat", t.alice, { messages: [{ role: "user", content: "no usage please" }] });
  const rows = await rowsFor("ai-chat", before + 1);
  const row = rows[0];
  assert.equal(row.ai.provider, "groq");
  assert.equal(row.ai.totalTokens, null);
  assert.equal(row.ai.costUsd, null);
  assert.equal(row.ai.costBasis, null);
});

test("OpenRouter usage without a cost field: tokens kept, cost not invented (no price configured for it)", { skip }, async () => {
  setMode("nocost");
  const before = (await activity("&feature=inner-voice")).length;
  await call("POST", "/api/inner-voice/guru-chat", t.alice, { message: "again" });
  const row = (await rowsFor("inner-voice", before + 1))[0];
  assert.equal(row.ai.totalTokens, 200);
  assert.equal(row.ai.costUsd, null);
});

test("failed provider call: row is a failure with no cost", { skip }, async () => {
  setMode("error");
  const before = (await activity("&feature=tarot")).length;
  const r = await call("POST", "/api/tarot/reading", t.alice, TAROT);
  assert.ok(r.status >= 500);
  const row = (await rowsFor("tarot", before + 1))[0];
  assert.equal(row.status, "error");
  assert.equal(row.ai.calls, 1);
  assert.equal(row.ai.costUsd, null);
});

test("a request that calls no provider (non-AI route) has no AI data", { skip }, async () => {
  setMode("ok");
  const calls = providerCalls().length;
  await call("GET", "/api/zodiac/signs", t.alice);
  const row = (await rowsFor("zodiac", 1))[0];
  assert.equal(row.ai, null);
  assert.equal(providerCalls().length, calls);
});

test("diagnostics: capture installed, calls observed, rows persisted, nothing without request context", { skip }, async () => {
  const d = (await call("GET", "/api/admin/costs/diagnostics", t.owner)).data.data;
  assert.equal(d.captureInstalled, true);
  assert.equal(d.accountingEnabled, true);
  assert.ok(d.counters.providerCallsSeen >= CASES.length);
  assert.equal(d.counters.providerCallsWithoutRequestContext, 0, "every provider call was inside a customer request");
  assert.ok(d.counters.aiRowsPersisted >= CASES.length);
  assert.equal(d.counters.aiRowsPersistFailed, 0);
  assert.deepEqual(d.providersConfigured, { openrouter: true, groq: true, sarvam: true });
  assert.ok(d.features.length > 0);
  // diagnostics never carry content or secrets
  const dump = JSON.stringify(d);
  assert.ok(!dump.includes("fake-pipeline-key") && !dump.includes("hello") && !dump.includes("guide me"));
  assert.equal((await call("GET", "/api/admin/costs/diagnostics", t.alice)).status, 403);
  assert.equal((await call("GET", "/api/admin/costs/diagnostics")).status, 401);
});
