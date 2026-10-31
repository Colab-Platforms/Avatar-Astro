// Run with: TEST_DATABASE_URL=postgresql://...localhost... npx tsx --test src/__tests__/routes/adminFeatureCosts.node-test.ts
//
// The AI Feature Cost Breakdown endpoints against a DISPOSABLE localhost Postgres with all migrations applied (refuses anything else).
// Usage rows are inserted directly with known numbers; no provider is called, no key is used.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

process.env.JWT_SECRET = "test-only-jwt-secret";
delete process.env.MAIN_ADMIN_EMAIL;
delete process.env.AI_PRICING_JSON;
delete process.env.GROQ_MODEL;
delete process.env.OPENROUTER_MODEL;
process.env.USD_TO_INR_RATE = "100";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";

let server: Server;
let base = "";
let prisma: any;
const tok = (id: string, role: string) => jwt.sign({ id, role }, process.env.JWT_SECRET!);
const ids: Record<string, string> = {};
const t: Record<string, string> = {};

const get = async (path: string, token = t.owner) => {
  const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, data: data?.data ?? data, text, headers: res.headers };
};

const NOW = new Date();
const row = (o: Record<string, unknown>) => ({
  eventType: "feature.request", status: "success", statusCode: 200, durationMs: 10, createdAt: NOW,
  aiCalls: 1, inputTokens: 1000, outputTokens: 500, totalTokens: 1500, ...o,
});
const rowsOf = (d: any) => d.rows as any[];
const find = (d: any, id: string) => rowsOf(d).find((r) => r.id === id);

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  const { default: adminRoutes } = await import("../../modules/admin/admin.route.js");
  const { errorHandler } = await import("../../middleware/errorHandler.js");

  await prisma.usageEvent.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fcb-test.example" } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  for (const [key, role] of [["owner", "SUPERADMIN"], ["alice", "USER"]] as const) {
    const u = await prisma.user.create({ data: { email: `${key}@fcb-test.example`, firstName: key, lastName: "Tester", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } });
    ids[key] = u.id;
    t[key] = tok(u.id, role);
  }

  const tarot = { feature: "tarot", metadata: { method: "POST", route: "/api/tarot/reading" }, aiProvider: "openrouter", aiModel: "google/gemma-3-27b-it" };
  await prisma.usageEvent.createMany({
    data: [
      // 4 tarot requests with a provider-reported cost of 0.001 each (one of them made two provider calls: still one request)
      row({ ...tarot, costUsd: "0.001", costBasis: "actual" }), row({ ...tarot, costUsd: "0.001", costBasis: "actual" }), row({ ...tarot, costUsd: "0.001", costBasis: "actual" }),
      row({ ...tarot, aiCalls: 2, costUsd: "0.001", costBasis: "actual" }),
      // must NOT count: served from cache (no AI columns), other event type, outside the date range
      { eventType: "feature.request", feature: "tarot", status: "success", statusCode: 200, durationMs: 1, createdAt: NOW, metadata: { method: "POST", route: "/api/tarot/reading" }, servedFromCache: true },
      row({ ...tarot, eventType: "feature.opened", costUsd: "9", costBasis: "actual" }),
      row({ ...tarot, costUsd: "9", costBasis: "actual", createdAt: new Date("2020-01-01T00:00:00Z") }),
      // shared Groq endpoint: tokens but no stored cost -> priced from the verified Groq rate
      ...[0, 1].map(() => row({ feature: "ai-chat", metadata: { method: "POST", route: "/api/ai/chat" }, aiProvider: "groq", aiModel: "openai/gpt-oss-120b", inputTokens: 2000, outputTokens: 1000, totalTokens: 3000 })),
      // verified free model reporting $0
      ...[0, 1, 2].map(() => row({ feature: "inner-voice", metadata: { method: "POST", route: "/api/inner-voice/diagnose" }, aiProvider: "openrouter", aiModel: "google/gemma-4-31b-it:free", costUsd: "0", costBasis: "actual" })),
      // a model with no price and no reported cost
      row({ feature: "palm-reading", metadata: { method: "POST", route: "/api/palm-reading" }, aiProvider: "openrouter", aiModel: "anthropic/claude-3.5-sonnet" }),
    ],
  });

  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use(errorHandler);
  await new Promise<void>((r) => { server = app.listen(0, "127.0.0.1", () => r()); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin`;
});

after(async () => {
  if (skip) return;
  await new Promise((r) => server?.close(r));
  await prisma?.$disconnect();
});

test("the SQL runs and returns actual cost per generation, in USD and INR", { skip }, async () => {
  const r = await get("/costs/features");
  assert.equal(r.status, 200);
  const d = r.data;
  assert.equal(d.fx.rate, 100);
  assert.equal(d.fx.kind, "configured");
  const tarot = find(d, "tarot.reading");
  assert.equal(tarot.requests, 4); // cached, wrong event type and out-of-range rows excluded
  assert.equal(tarot.avgCalls, 1.25); // 5 provider calls / 4 requests, shown, not multiplied into cost
  assert.equal(tarot.classification, "paid");
  assert.equal(tarot.costBasis, "actual");
  assert.ok(Math.abs(tarot.costPerGenerationUsd - 0.001) < 1e-12);
  assert.ok(Math.abs(tarot.costPerGenerationInr - 0.1) < 1e-9);
  assert.ok(Math.abs(tarot.cost100Usd - 0.1) < 1e-9);
  assert.ok(Math.abs(tarot.cost1000Usd - 1) < 1e-9);
  assert.ok(Math.abs(tarot.cost1000Inr - 100) < 1e-6);
  assert.equal(Math.round(tarot.inputTokens), 1000);
  assert.equal(Math.round(tarot.outputTokens), 500);
});

test("tokens without a stored cost are Estimated from the verified rate and kept apart from actual totals", async () => {
  const d = (await get("/costs/features")).data;
  const karma = find(d, "chat.karma");
  assert.equal(karma.classification, "estimated");
  assert.equal(karma.costBasis, "estimated");
  assert.ok(Math.abs(karma.costPerGenerationUsd - (2000 * 0.15 + 1000 * 0.6) / 1e6) < 1e-12);
  assert.match(karma.reason, /cannot be separated|not recorded per feature/);
  // Karma, AI Guru and Shloka are the same rows of data: totals count the endpoint once
  assert.equal(find(d, "chat.guru").costPerGenerationUsd, karma.costPerGenerationUsd);
  assert.ok(Math.abs(d.totals.actualUsd - 0.004) < 1e-12); // tarot only (free model adds 0)
  assert.ok(Math.abs(d.totals.estimatedUsd - 2 * 0.0009) < 1e-12);
  assert.equal(d.totals.requestsWithActual, 4 + 3);
  assert.equal(d.totals.requestsWithEstimate, 2);
  assert.equal(d.totals.unpricedRequests, 1); // the palm row
});

test("free model and unknown price are reported honestly", async () => {
  const d = (await get("/costs/features")).data;
  const iv = find(d, "iv.diagnose");
  assert.equal(iv.classification, "free-model");
  assert.equal(iv.costPerGenerationUsd, 0);
  const palm = find(d, "palm.reading");
  assert.equal(palm.classification, "unknown");
  assert.equal(palm.costPerGenerationUsd, null);
  assert.equal(find(d, "free.zodiac").classification, "free");
});

test("filters by feature, provider and model", async () => {
  const f = (await get("/costs/features?feature=tarot")).data;
  assert.ok(rowsOf(f).every((r) => r.feature === "tarot"));
  assert.ok(Math.abs(f.totals.actualUsd - 0.004) < 1e-12);
  assert.equal(f.totals.estimatedUsd, 0);
  const g = (await get("/costs/features?provider=groq")).data;
  assert.ok(rowsOf(g).every((r) => r.provider === "groq"));
  assert.equal(g.totals.actualUsd, 0);
  assert.ok(g.totals.estimatedUsd > 0);
  const m = (await get("/costs/features?model=GEMMA-4")).data;
  assert.ok(rowsOf(m).length > 0 && rowsOf(m).every((r) => /gemma-4/i.test(r.model)));
  assert.equal(m.totals.actualUsd, 0);
});

test("a date range that excludes the rows shows no recorded usage (and no invented cost)", async () => {
  const d = (await get("/costs/features?from=2021-01-01&to=2021-01-31")).data;
  assert.equal(d.totals.actualUsd, 0);
  assert.equal(find(d, "tarot.reading").classification, "unknown");
  assert.equal(find(d, "tarot.reading").costPerGenerationUsd, null);
});

test("CSV export: headers, filtered rows, USD/INR values, and an audit entry", async () => {
  const r = await get("/costs/features/export?feature=tarot");
  assert.equal(r.status, 200);
  assert.match(String(r.headers.get("content-type")), /text\/csv/);
  assert.match(String(r.headers.get("content-disposition")), /mybhagya-feature-costs-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv/);
  const lines = r.text.replace(/^﻿/, "").trim().split(/\r?\n/);
  assert.match(lines[0], /^feature,operation,route,provider,model,classification,cost_basis,requests/);
  assert.equal(lines.length, 2); // header + the one tarot operation
  assert.match(lines[1], /Tarot,Tarot reading,\/api\/tarot\/reading,openrouter,google\/gemma-3-27b-it,paid,actual,4,/);
  assert.match(lines[1], /,0\.001,0\.1,0\.1,10,1,100,/);
  assert.ok(!/sk-|api[_-]?key/i.test(r.text));
  const audit = await prisma.adminAuditLog.findFirst({ where: { entityId: "feature-costs" } });
  assert.ok(audit);
});

test("only the main admin can read it", async () => {
  assert.ok([401, 403].includes((await get("/costs/features", t.alice)).status));
  assert.ok([401, 403].includes((await get("/costs/features/export", t.alice)).status));
});
