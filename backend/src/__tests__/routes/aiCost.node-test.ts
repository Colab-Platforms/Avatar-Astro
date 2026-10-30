// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:cost
//
// AI cost tracking, the cost reports and provider balance checks. Needs a DISPOSABLE localhost Postgres with all
// migrations applied (refuses anything else). Providers are replaced by in-process stubs: no real AI call is made
// and no real key is used, so every number below comes from the stub's reply, not from a paid request.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
delete process.env.MAIN_ADMIN_EMAIL;
delete process.env.AI_USAGE_ACCOUNTING;
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";
process.env.AI_PRICING_JSON = JSON.stringify({ "groq:test-groq-model": { inputPerM: 1, outputPerM: 2 } });

const tok = (id: string, role: string) => jwt.sign({ id, role }, process.env.JWT_SECRET!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
let base = "";
let prisma: any;
let t: Record<string, string> = {};
const ids: Record<string, string> = {};

// What the stubbed providers answer, and what they were asked.
type Reply = { status: number; body: any } | "network-error";
let reply: (url: string, body: any) => Reply = () => ({ status: 200, body: {} });
let seen: { url: string; body: any }[] = [];

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, data, text, headers: res.headers };
}

/** The usage row is written after the response; wait for it. */
async function lastRow(feature: string, expected = 1) {
  for (let i = 0; i < 50; i++) {
    const rows = await prisma.usageEvent.findMany({ where: { feature }, orderBy: { createdAt: "desc" } });
    if (rows.length >= expected) return rows[0];
    await sleep(40);
  }
  throw new Error("usage row was not written");
}
const rowCount = (feature: string) => prisma.usageEvent.count({ where: { feature } });

const orBody = (cost: number | undefined, p = 100, c = 50) => ({ model: "or/model-x", usage: { prompt_tokens: p, completion_tokens: c, total_tokens: p + c, ...(cost === undefined ? {} : { cost }) } });

before(async () => {
  if (skip) return;
  // Install the stub BEFORE the capture so the capture wraps it, exactly as it wraps the real fetch in production.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url: string = typeof input === "string" ? input : input.url ?? String(input);
    if (/openrouter\.ai|api\.groq\.com|api\.sarvam\.ai/.test(url)) {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      seen.push({ url, body });
      const r = reply(url, body);
      if (r === "network-error") throw new TypeError("fetch failed");
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
    }
    return realFetch(input, init);
  }) as typeof fetch;
  // axios talks to the same fake providers
  axios.defaults.adapter = async (config: any) => {
    const url = (config.baseURL ?? "") + config.url;
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    seen.push({ url, body });
    const r = reply(url, body);
    if (r === "network-error") throw Object.assign(new Error("Network Error"), { config });
    const resp = { data: r.body, status: r.status, statusText: "", headers: {}, config };
    if (r.status >= 400) throw Object.assign(new Error(`HTTP ${r.status}`), { config, response: resp, isAxiosError: true });
    return resp;
  };
  const { installAiUsageCapture } = await import("../../utils/aiUsageCapture.js");
  installAiUsageCapture();

  prisma = (await import("../../../prisma.js")).default;
  const { default: adminRoutes } = await import("../../modules/admin/admin.route.js");
  const { feature } = await import("../../utils/usage.js");
  const { markServedFromCache } = await import("../../utils/aiUsageCapture.js");
  const { auth } = await import("../../middleware/authMiddleware.js");
  const { errorHandler } = await import("../../middleware/errorHandler.js");

  await prisma.usageEvent.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@cost-test.example" } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  const mk = async (key: string, role: string) => {
    const u = await prisma.user.create({ data: { email: `${key}@cost-test.example`, firstName: key, lastName: "Tester", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } });
    ids[key] = u.id;
  };
  await mk("owner", "SUPERADMIN");
  await mk("staff", "ADMIN");
  await mk("alice", "USER");
  await mk("bob", "USER");
  t = { owner: tok(ids.owner, "SUPERADMIN"), staff: tok(ids.staff, "ADMIN"), alice: tok(ids.alice, "USER"), bob: tok(ids.bob, "USER") };

  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  const ask = (url: string, model: string) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }] }) });
  const OR = "https://openrouter.ai/api/v1/chat/completions";
  const GROQ = "https://api.groq.com/openai/v1/chat/completions";
  // Probes standing in for real features: same middleware list as index.ts.
  app.post("/api/p/tarot", ...feature("tarot"), auth("USER"), async (_req, res) => {
    const r = await ask(OR, "or/model-x");
    res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  });
  app.post("/api/p/tarot-anon", ...feature("tarot"), async (_req, res) => {
    await ask(OR, "or/model-x");
    res.json({ ok: true });
  });
  app.post("/api/p/guru", ...feature("ai-chat"), auth("USER"), async (_req, res) => {
    try {
      const r = await ask(GROQ, "test-groq-model");
      res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    } catch {
      res.status(502).json({ ok: false });
    }
  });
  app.post("/api/p/guru-unpriced", ...feature("interpretation"), auth("USER"), async (_req, res) => {
    const r = await ask(GROQ, "unpriced-model");
    res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  });
  app.post("/api/p/two-calls", ...feature("inner-voice"), auth("USER"), async (_req, res) => {
    await ask(OR, "or/model-x");
    await ask(OR, "or/model-x");
    res.json({ ok: true });
  });
  app.post("/api/p/axios", ...feature("gemstone"), auth("USER"), async (_req, res) => {
    const r = await axios.post(OR, { model: "or/model-x", messages: [] }, { validateStatus: () => true });
    res.status(r.status === 200 ? 200 : 502).json({ ok: true });
  });
  app.post("/api/p/non-ai", ...feature("zodiac"), auth("USER"), (_req, res) => res.json({ ok: true }));
  app.get("/api/p/not-modified", ...feature("palm-reading"), auth("USER"), (_req, res) => res.status(304).end());
  app.post("/api/p/cached", ...feature("birth-chart"), auth("USER"), (_req, res) => {
    markServedFromCache();
    res.json({ ok: true });
  });
  // Mounted twice on purpose: must still produce ONE row.
  app.post("/api/p/double", ...feature("name-analysis"), ...feature("name-analysis"), auth("USER"), async (_req, res) => {
    await ask(OR, "or/model-x");
    res.json({ ok: true });
  });
  app.use((err: any, req: any, res: any, next: any) => {
    const orig = console.error;
    console.error = () => {};
    errorHandler(err, req, res, next).finally(() => { console.error = orig; });
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  seen = [];
  reply = () => ({ status: 200, body: orBody(0.0123) });
});

after(async () => {
  if (skip) return;
  server?.close();
  // Leave the shared test database as found: other suites assume only their own accounts exist.
  await prisma?.usageEvent.deleteMany();
  await prisma?.adminAuditLog.deleteMany();
  await prisma?.platformSetting.deleteMany();
  await prisma?.user.deleteMany({ where: { email: { endsWith: "@cost-test.example" } } });
  await prisma?.$disconnect();
});

// ── Capture ──────────────────────────────────────────────────────────────────

test("successful OpenRouter call stores the provider-reported cost as ACTUAL, with tokens, model and customer", { skip }, async () => {
  assert.equal((await call("POST", "/api/p/tarot", t.alice)).status, 200);
  const row = await lastRow("tarot");
  assert.equal(row.userId, ids.alice);
  assert.equal(row.aiProvider, "openrouter");
  assert.equal(row.aiModel, "or/model-x");
  assert.equal(row.aiCalls, 1);
  assert.equal(row.inputTokens, 100);
  assert.equal(row.outputTokens, 50);
  assert.equal(row.totalTokens, 150);
  assert.equal(Number(row.costUsd), 0.0123);
  assert.equal(row.costBasis, "actual");
  assert.equal(row.servedFromCache, false);
  assert.equal(row.status, "success");
  assert.ok(row.durationMs >= 0);
  // The capture asked OpenRouter for exact cost accounting, and nothing else in the request changed.
  assert.deepEqual(seen[0].body.usage, { include: true });
  assert.equal(seen[0].body.model, "or/model-x");
});

test("Groq has no cost field: a configured price gives an ESTIMATE, flagged as estimated", { skip }, async () => {
  reply = () => ({ status: 200, body: { model: "test-groq-model", usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 } } });
  await call("POST", "/api/p/guru", t.alice);
  const row = await lastRow("ai-chat");
  assert.equal(row.aiProvider, "groq");
  assert.equal(row.costBasis, "estimated");
  assert.equal(Number(row.costUsd), (1000 * 1 + 500 * 2) / 1_000_000); // tokens x configured price
  assert.equal(row.totalTokens, 1500);
  assert.equal(seen[0].body.usage, undefined, "non-OpenRouter requests are not modified");
});

test("no configured price: tokens are kept but the cost stays NULL (never guessed)", { skip }, async () => {
  reply = () => ({ status: 200, body: { model: "unpriced-model", usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } } });
  await call("POST", "/api/p/guru-unpriced", t.alice);
  const row = await lastRow("interpretation");
  assert.equal(row.totalTokens, 15);
  assert.equal(row.costUsd, null);
  assert.equal(row.costBasis, null);
});

test("provider reply without usage info: AI call is counted, tokens and cost stay NULL", { skip }, async () => {
  reply = () => ({ status: 200, body: { model: "or/model-x", choices: [] } });
  await call("POST", "/api/p/tarot", t.bob);
  const row = (await prisma.usageEvent.findMany({ where: { feature: "tarot", userId: ids.bob } }))[0];
  assert.equal(row.aiCalls, 1);
  assert.equal(row.inputTokens, null);
  assert.equal(row.totalTokens, null);
  assert.equal(row.costUsd, null);
});

test("failed provider call (HTTP 500, no usage) is recorded as failed with NO cost", { skip }, async () => {
  const before = await rowCount("ai-chat");
  reply = () => ({ status: 500, body: { error: { message: "boom" } } });
  const r = await call("POST", "/api/p/guru", t.alice);
  assert.equal(r.status, 502);
  const rows = await prisma.usageEvent.findMany({ where: { feature: "ai-chat" }, orderBy: { createdAt: "desc" } });
  assert.equal(rows.length, before + 1);
  assert.equal(rows[0].status, "error");
  assert.equal(rows[0].aiCalls, 1);
  assert.equal(rows[0].costUsd, null);
});

test("failed request that still incurred provider cost records exactly that cost", { skip }, async () => {
  reply = () => ({ status: 502, body: orBody(0.004) });
  await call("POST", "/api/p/tarot", t.alice);
  const rows = await prisma.usageEvent.findMany({ where: { feature: "tarot", status: "error" } });
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].costUsd), 0.004);
  assert.equal(rows[0].costBasis, "actual");
});

test("network failure to the provider: recorded, no cost", { skip }, async () => {
  reply = () => "network-error";
  await call("POST", "/api/p/guru", t.bob);
  const row = (await prisma.usageEvent.findMany({ where: { feature: "ai-chat", userId: ids.bob } }))[0];
  assert.equal(row.aiCalls, 1);
  assert.equal(row.costUsd, null);
});

test("a request with several provider calls produces ONE row with summed tokens and cost", { skip }, async () => {
  reply = () => ({ status: 200, body: orBody(0.01, 10, 5) });
  await call("POST", "/api/p/two-calls", t.alice);
  await sleep(150);
  assert.equal(await rowCount("inner-voice"), 1);
  const row = await lastRow("inner-voice");
  assert.equal(row.aiCalls, 2);
  assert.equal(row.totalTokens, 30);
  assert.equal(Number(row.costUsd), 0.02);
});

test("axios-based provider calls are captured too", { skip }, async () => {
  reply = () => ({ status: 200, body: orBody(0.002) });
  await call("POST", "/api/p/axios", t.alice);
  const row = await lastRow("gemstone");
  assert.equal(row.aiProvider, "openrouter");
  assert.equal(Number(row.costUsd), 0.002);
  assert.deepEqual(seen[0].body.usage, { include: true });
});

test("non-AI request carries NO AI fields", { skip }, async () => {
  await call("POST", "/api/p/non-ai", t.alice);
  const row = await lastRow("zodiac");
  assert.equal(row.aiCalls, null);
  assert.equal(row.aiProvider, null);
  assert.equal(row.costUsd, null);
  assert.equal(row.totalTokens, null);
  assert.equal(seen.length, 0);
});

test("HTTP 304 is not a paid request; a stored answer is flagged served-from-cache", { skip }, async () => {
  assert.equal((await call("GET", "/api/p/not-modified", t.alice)).status, 304);
  const nm = await lastRow("palm-reading");
  assert.equal(nm.statusCode, 304);
  assert.equal(nm.costUsd, null);
  assert.equal(nm.aiCalls, null);
  assert.equal(nm.servedFromCache, true);
  await call("POST", "/api/p/cached", t.alice);
  const cached = await lastRow("birth-chart");
  assert.equal(cached.servedFromCache, true);
  assert.equal(cached.costUsd, null);
  assert.equal(seen.length, 0);
});

test("anonymous AI request is recorded without a customer", { skip }, async () => {
  await call("POST", "/api/p/tarot-anon");
  const rows = await prisma.usageEvent.findMany({ where: { feature: "tarot", userId: null } });
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].costUsd), 0.0123);
});

test("duplicate middleware mounting does not double-count", { skip }, async () => {
  await call("POST", "/api/p/double", t.alice);
  await sleep(150);
  assert.equal(await rowCount("name-analysis"), 1);
  assert.equal(Number((await lastRow("name-analysis")).costUsd), 0.0123);
});

test("AI_USAGE_ACCOUNTING=off disables capture", { skip }, async () => {
  process.env.AI_USAGE_ACCOUNTING = "off";
  try {
    const before = await rowCount("tarot");
    await call("POST", "/api/p/tarot", t.alice);
    await sleep(150);
    const rows = await prisma.usageEvent.findMany({ where: { feature: "tarot" }, orderBy: { createdAt: "desc" }, take: 1 });
    assert.equal(await rowCount("tarot"), before + 1);
    assert.equal(rows[0].aiCalls, null);
    assert.equal(seen[0].body.usage, undefined);
  } finally {
    delete process.env.AI_USAGE_ACCOUNTING;
  }
});

// ── Admin APIs ───────────────────────────────────────────────────────────────

test("cost and balance APIs are SUPERADMIN only", { skip }, async () => {
  for (const [m, p] of [["GET", "/costs/summary"], ["GET", "/providers/balance"], ["POST", "/providers/balance/refresh"], ["GET", "/reports/export?kind=costs"]] as const) {
    assert.equal((await call(m, `/api/admin${p}`)).status, 401, `${p} anonymous`);
    assert.equal((await call(m, `/api/admin${p}`, t.alice)).status, 403, `${p} user`);
    assert.equal((await call(m, `/api/admin${p}`, t.staff)).status, 403, `${p} legacy admin`);
  }
});

test("activity feed exposes AI details and filters by provider / cost basis / AI", { skip }, async () => {
  const all = await call("GET", "/api/admin/activity?pageSize=100", t.owner);
  assert.equal(all.status, 200);
  const withAi = all.data.data.items.filter((i: any) => i.ai);
  assert.ok(withAi.length > 0);
  const sample = withAi.find((i: any) => i.feature === "tarot" && i.ai.costUsd === 0.0123 && i.customer);
  assert.equal(sample.ai.provider, "openrouter");
  assert.equal(sample.ai.costBasis, "actual");
  assert.equal(sample.customer.email, "alice@cost-test.example");
  assert.ok(all.data.data.items.some((i: any) => i.feature === "zodiac" && i.ai === null));

  const groq = (await call("GET", "/api/admin/activity?provider=groq&pageSize=100", t.owner)).data.data.items;
  assert.ok(groq.length > 0 && groq.every((i: any) => i.ai?.provider === "groq"));
  const est = (await call("GET", "/api/admin/activity?costBasis=estimated&pageSize=100", t.owner)).data.data.items;
  assert.ok(est.length > 0 && est.every((i: any) => i.ai.costBasis === "estimated"));
  const none = (await call("GET", "/api/admin/activity?costBasis=none&pageSize=100", t.owner)).data.data.items;
  assert.ok(none.length > 0 && none.every((i: any) => i.ai && i.ai.costUsd === null));
  const nonAi = (await call("GET", "/api/admin/activity?ai=no&feature=zodiac", t.owner)).data.data.items;
  assert.ok(nonAi.length > 0 && nonAi.every((i: any) => i.ai === null));
  const bad = await call("GET", "/api/admin/activity?provider=%27%3BDROP", t.owner);
  assert.equal(bad.status, 200); // invalid filter value is ignored, not executed
});

test("cost summary aggregates only recorded AI rows, and keeps unpriced requests out of the cost", { skip }, async () => {
  // Controlled data: wipe, then insert known rows (an old pre-tracking row and a cost-less non-AI row must add nothing).
  await prisma.usageEvent.deleteMany();
  const now = new Date();
  const mk = (o: any) => prisma.usageEvent.create({ data: { eventType: "feature.request", status: "success", statusCode: 200, durationMs: 5, createdAt: now, ...o } });
  await mk({ feature: "tarot", userId: ids.alice, aiProvider: "openrouter", aiModel: "m1", aiCalls: 1, inputTokens: 10, outputTokens: 10, totalTokens: 20, costUsd: "0.5", costBasis: "actual" });
  await mk({ feature: "tarot", userId: ids.bob, aiProvider: "openrouter", aiModel: "m1", aiCalls: 1, inputTokens: 10, outputTokens: 10, totalTokens: 20, costUsd: "0.25", costBasis: "actual" });
  await mk({ feature: "ai-chat", userId: ids.alice, aiProvider: "groq", aiModel: "g1", aiCalls: 1, inputTokens: 100, outputTokens: 100, totalTokens: 200, costUsd: "0.1", costBasis: "estimated" });
  await mk({ feature: "interpretation", userId: ids.bob, aiProvider: "groq", aiModel: "g2", aiCalls: 1, inputTokens: 5, outputTokens: 5, totalTokens: 10, status: "error", statusCode: 502 }); // unpriced + failed
  await mk({ feature: "zodiac", userId: ids.alice }); // non-AI
  await mk({ feature: "palm-reading", userId: ids.alice, statusCode: 304, servedFromCache: true }); // cached
  await mk({ feature: "tarot", userId: ids.alice, createdAt: new Date(now.getTime() - 3 * 864e5) }); // old row, no AI columns

  const r = await call("GET", "/api/admin/costs/summary", t.owner);
  assert.equal(r.status, 200);
  const k = r.data.data.kpis;
  assert.equal(r.data.data.currency, "USD");
  assert.equal(k.totalAiRequests, 4);
  assert.equal(Math.round(k.totalCostUsd * 100) / 100, 0.85);
  assert.equal(Math.round(k.actualCostUsd * 100) / 100, 0.75);
  assert.equal(Math.round(k.estimatedCostUsd * 100) / 100, 0.1);
  assert.equal(k.unpricedRequests, 1);
  assert.equal(k.pricedRequests, 3);
  assert.equal(k.failedAiRequests, 1);
  assert.equal(k.totalTokens, 250);
  assert.ok(Math.abs(k.averageCostUsd - 0.85 / 3) < 1e-9);
  assert.equal(Math.round(k.costTodayUsd * 100) / 100, 0.85);
  assert.equal(k.customers, 2);
  const tarot = r.data.data.byFeature.find((f: any) => f.key === "tarot");
  assert.equal(tarot.requests, 2);
  assert.equal(Math.round(tarot.costUsd * 100) / 100, 0.75);
  assert.ok(!r.data.data.byFeature.some((f: any) => f.key === "zodiac" || f.key === "palm-reading"));
  const groq = r.data.data.byProvider.find((p: any) => p.key === "groq");
  assert.equal(groq.requests, 2);
  assert.equal(groq.unpricedRequests, 1);
  assert.equal(r.data.data.byModel.length, 3);
  assert.equal(r.data.data.topCustomers[0].email, "alice@cost-test.example");
  assert.equal(Math.round(r.data.data.topCustomers[0].costUsd * 100) / 100, 0.6);
  const todayRow = r.data.data.daily.at(-1);
  assert.equal(todayRow.requests, 4);
  assert.equal(r.data.data.daily.length, 30);

  // Date filter: a window that ends before today has nothing.
  const past = new Date(now.getTime() - 10 * 864e5).toISOString().slice(0, 10);
  const past2 = new Date(now.getTime() - 5 * 864e5).toISOString().slice(0, 10);
  const none = await call("GET", `/api/admin/costs/summary?from=${past}&to=${past2}`, t.owner);
  assert.equal(none.data.data.kpis.totalAiRequests, 0);
  assert.equal(none.data.data.kpis.totalCostUsd, null);
  assert.equal((await call("GET", "/api/admin/costs/summary?from=nope", t.owner)).status, 400);
});

test("cost CSV export: AI rows only, ids not emails, audited", { skip }, async () => {
  const r = await call("GET", "/api/admin/reports/export?kind=costs", t.owner);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /text\/csv/);
  const lines = r.text.replace(/^﻿/, "").trim().split("\r\n");
  assert.match(lines[0], /^time_utc,user_id,feature,provider,model,ai_calls,input_tokens,output_tokens,total_tokens,cost_usd,cost_basis/);
  assert.equal(lines.length - 1, 4);
  assert.ok(!r.text.includes("@cost-test.example"));
  assert.ok(lines.some((l) => l.includes(",openrouter,m1,1,10,10,20,0.5,actual")));
  assert.equal(await prisma.adminAuditLog.count({ where: { action: "report.export", entityId: "costs" } }), 1);
});

// ── Provider balances ────────────────────────────────────────────────────────

test("balance checks: OpenRouter key-level, account-level, rejected, failing, unlimited; Groq/Sarvam honest", { skip }, async () => {
  const pb = await import("../../modules/admin/providerBalance.js");
  const ok = (data: any) => async () => new Response(JSON.stringify({ data }), { status: 200 });
  const st = (status: number) => async () => new Response("{}", { status });
  const env = (e: Record<string, string>) => e as NodeJS.ProcessEnv;

  // key with a limit
  let r = await pb.checkOpenRouter(env({ OPENROUTER_API_KEY: "sk-or-SECRET" }), ok({ usage: 4.2, usage_daily: 0.1, usage_weekly: 0.7, usage_monthly: 2.5, limit: 10, limit_remaining: 5.8 }) as any);
  assert.equal(r.connection, "connected");
  assert.equal(r.balance.state, "available");
  assert.equal(r.balance.scope, "key");
  assert.equal(r.balance.remainingUsd, 5.8);
  assert.equal(r.usage.monthlyUsd, 2.5);
  assert.ok(r.lastSuccessAt);

  // unlimited key: not "0", not a made-up balance
  r = await pb.checkOpenRouter(env({ OPENROUTER_API_KEY: "sk-or-SECRET" }), ok({ usage: 1, usage_monthly: 1, limit: null, limit_remaining: null }) as any);
  assert.equal(r.balance.state, "unavailable");
  assert.equal(r.balance.remainingUsd, null);
  assert.equal(r.balance.unlimited, true);

  // management key gives the real account balance
  const calls: string[] = [];
  r = await pb.checkOpenRouter(env({ OPENROUTER_API_KEY: "sk-or-SECRET", OPENROUTER_MANAGEMENT_KEY: "sk-or-MGMT" }), (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ data: url.endsWith("/credits") ? { total_credits: 20, total_usage: 7.5 } : { usage: 1, limit: null, limit_remaining: null } }), { status: 200 });
  }) as any);
  assert.equal(r.balance.scope, "account");
  assert.equal(r.balance.remainingUsd, 12.5);
  assert.equal(calls.length, 2);

  r = await pb.checkOpenRouter(env({ OPENROUTER_API_KEY: "sk-or-SECRET" }), st(401) as any);
  assert.equal(r.connection, "rejected");
  assert.equal(r.balance.remainingUsd, null);

  r = await pb.checkOpenRouter(env({ OPENROUTER_API_KEY: "sk-or-SECRET" }), (async () => { throw new TypeError("connect ECONNREFUSED with sk-or-SECRET"); }) as any);
  assert.equal(r.connection, "error");
  assert.ok(!JSON.stringify(r).includes("SECRET"), "errors never echo keys");

  r = await pb.checkOpenRouter(env({}), (async () => { throw new Error("must not be called"); }) as any);
  assert.equal(r.connection, "not_configured");

  // Groq: key verified, balance explicitly unsupported
  let g = await pb.checkGroq(env({ GROQ_API_KEY: "gsk_SECRET" }), st(200) as any);
  assert.equal(g.connection, "connected");
  assert.equal(g.balance.state, "unsupported");
  assert.match(g.balance.note, /Not available through API/);
  assert.equal((await pb.checkGroq(env({ GROQ_API_KEY: "gsk_SECRET" }), st(401) as any)).connection, "rejected");
  assert.equal((await pb.checkGroq(env({}), (async () => { throw new Error("no"); }) as any)).connection, "not_configured");

  // Sarvam: no endpoint, so no call is made at all
  const s = await pb.checkSarvam(env({ SARVAM_API_KEY: "sarvam-SECRET" }));
  assert.equal(s.connection, "unverified");
  assert.equal(s.balance.state, "unsupported");
});

test("a failed refresh keeps the last successful check time", { skip }, async () => {
  const pb = await import("../../modules/admin/providerBalance.js");
  const prev = [{ id: "openrouter", lastSuccessAt: "2026-10-01T00:00:00.000Z" }] as any;
  const merged = pb.mergeWithPrevious([{ id: "openrouter", lastSuccessAt: null, connection: "error" } as any], prev);
  assert.equal(merged[0].lastSuccessAt, "2026-10-01T00:00:00.000Z");
});

test("GET balance never calls a provider; refresh calls once, caches, throttles, and exposes no keys", { skip }, async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-ROUTESECRET";
  process.env.GROQ_API_KEY = "gsk_ROUTESECRET";
  process.env.SARVAM_API_KEY = "sarvam-ROUTESECRET";
  reply = (url) => (url.includes("/key") ? { status: 200, body: { data: { usage: 3, usage_monthly: 2, limit: 10, limit_remaining: 7 } } } : { status: 200, body: { data: [] } });

  const empty = await call("GET", "/api/admin/providers/balance", t.owner);
  assert.equal(empty.status, 200);
  assert.equal(empty.data.data.refreshedAt, null);
  assert.equal(seen.length, 0, "page loads must not call providers");

  const first = await call("POST", "/api/admin/providers/balance/refresh", t.owner);
  assert.equal(first.status, 200);
  assert.equal(first.data.data.throttled, false);
  const provs = first.data.data.providers;
  assert.deepEqual(provs.map((p: any) => p.id), ["openrouter", "groq", "sarvam"]);
  assert.equal(provs[0].balance.remainingUsd, 7);
  assert.equal(provs[1].balance.state, "unsupported");
  const callsAfterFirst = seen.length;
  assert.ok(callsAfterFirst >= 2);
  assert.ok(!first.text.includes("ROUTESECRET"));

  const again = await call("POST", "/api/admin/providers/balance/refresh", t.owner);
  assert.equal(again.data.data.throttled, true);
  assert.equal(seen.length, callsAfterFirst, "throttled refresh makes no provider calls");

  const cached = await call("GET", "/api/admin/providers/balance", t.owner);
  assert.equal(cached.data.data.providers[0].balance.remainingUsd, 7);
  assert.equal(seen.length, callsAfterFirst);
  assert.ok(!cached.text.includes("ROUTESECRET"));
  assert.equal(await prisma.adminAuditLog.count({ where: { action: "providers.balance_refresh" } }), 1);
});
