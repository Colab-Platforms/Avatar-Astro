// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:admin
//
// Integration tests for the admin panel and user dashboard APIs. They need a
// DISPOSABLE Postgres database (all migrations applied) and refuse to run
// against anything that is not localhost, so they can never touch real data.
// Auth is real: tokens are signed with a test-only secret and verified by the
// app's own middleware; nothing is bypassed.
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
process.env.OPENROUTER_API_KEY = "sk-or-SECRETSECRETSECRET1234";
delete process.env.MAIN_ADMIN_EMAIL;
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1"; // the embedded test database handles one connection at a time

const tok = (id: string, role: string, secret = process.env.JWT_SECRET!) => jwt.sign({ id, role }, secret);

let server: Server;
let base = "";
let prisma: any;
const ids: Record<string, string> = {};
let t: Record<string, string> = {};

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

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  const { default: adminRoutes } = await import("../../modules/admin/admin.route.js");
  const { createMeRouter } = await import("../../modules/me/me.route.js");
  const { createPublicContentRouter } = await import("../../routes/publicContentRoutes.js");
  const { feature } = await import("../../utils/usage.js");
  const { auth } = await import("../../middleware/authMiddleware.js");
  const { errorHandler } = await import("../../middleware/errorHandler.js");
  const { default: authRoutes } = await import("../../modules/auth/auth.route.js");
  const { default: publicTemples } = await import("../../modules/puja/puja.public.route.js");
  const { default: publicChadhawa } = await import("../../modules/chadhawa/chadhawa.public.route.js");
  const { default: publicShop } = await import("../../modules/shop/shop.public.route.js");
  const bcrypt = (await import("bcryptjs")).default;

  await prisma.usageEvent.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { OR: [{ email: { endsWith: "@admin-test.example" } }, { email: "deact@admintestmail.com" }] } });

  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) {
    roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  }
  const mk = async (key: string, role: string, extra: Record<string, unknown> = {}) => {
    const u = await prisma.user.create({
      data: { email: key === "deact" ? "deact@admintestmail.com" : `${key}@admin-test.example`, firstName: key, password: "HASH-should-never-leak", isActive: true, ...extra, userRoleMappings: { create: { roleId: roles[role] } } },
    });
    ids[key] = u.id;
  };
  await mk("owner", "SUPERADMIN");
  await mk("staff", "ADMIN");
  await mk("alice", "USER");
  await mk("bob", "USER");
  await mk("sleeper", "SUPERADMIN", { isActive: false });
  await mk("deact", "USER", { password: await bcrypt.hash("Test#12345", 10), isEmailVerified: true, profileCompleted: true });
  await prisma.session.create({ data: { userId: ids.alice, refreshToken: "r-alice", expiresAt: new Date(Date.now() + 1e9) } });

  t = {
    owner: tok(ids.owner, "SUPERADMIN"),
    staff: tok(ids.staff, "ADMIN"),
    alice: tok(ids.alice, "USER"),
    bob: tok(ids.bob, "USER"),
    // A correctly signed token that CLAIMS a role the database does not grant.
    aliceClaimsSuper: tok(ids.alice, "SUPERADMIN"),
    sleeper: tok(ids.sleeper, "SUPERADMIN"),
    forged: tok(ids.owner, "SUPERADMIN", "attacker-secret"),
  };

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/temples", publicTemples);
  app.use("/api/chadhawa", publicChadhawa);
  app.use("/api/shop", publicShop);
  app.use("/api/me", createMeRouter());
  app.use("/api/public", createPublicContentRouter());
  // Probes standing in for a real feature mount: same middleware list as index.ts.
  app.get("/api/probe", ...feature("tarot"), auth("USER"), (_req, res) => res.json({ ok: true }));
  app.get("/api/probe-fail", ...feature("tarot"), auth("USER"), (_req, res) => res.status(500).json({ ok: false }));
  app.use((err: any, req: any, res: any, next: any) => {
    const orig = console.error;
    console.error = () => {};
    errorHandler(err, req, res, next).finally(() => { console.error = orig; });
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (skip) return;
  server?.close();
  await prisma?.$disconnect();
});

const ADMIN_GETS = ["/overview", "/users", "/tools", "/inner-voice", "/devotion", "/shop-summary", "/payments", "/content", "/integrations", "/reports/summary", "/settings", "/audit-logs"];

test("unauthenticated visitors get 401 on every admin API", { skip }, async () => {
  for (const p of ["/access", ...ADMIN_GETS]) assert.equal((await call("GET", `/api/admin${p}`)).status, 401, p);
  assert.equal((await call("PUT", "/api/admin/tools/tarot", undefined, { enabled: false })).status, 401);
  assert.equal((await call("POST", "/api/admin/content", undefined, { type: "FAQ", title: "x" })).status, 401);
});

test("forged token (wrong signing secret) is rejected", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/overview", t.forged)).status, 401);
});

test("normal users get 403 on every admin API (reads and writes)", { skip }, async () => {
  for (const p of ["/access", ...ADMIN_GETS]) assert.equal((await call("GET", `/api/admin${p}`, t.alice)).status, 403, p);
  assert.equal((await call("PUT", "/api/admin/tools/tarot", t.alice, { enabled: false })).status, 403);
  assert.equal((await call("PATCH", `/api/admin/users/${ids.bob}/status`, t.alice, { isActive: false })).status, 403);
  assert.equal((await call("POST", "/api/admin/content", t.alice, { type: "FAQ", title: "Hacked", body: "x" })).status, 403);
  assert.equal(await prisma.contentItem.count(), 0);
});

test("legacy ADMIN role cannot use the admin APIs", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/overview", t.staff)).status, 403);
  assert.equal((await call("GET", "/api/admin/users", t.staff)).status, 403);
  // Policy: the old ADMIN role no longer opens ANY /api/admin route, including the original dashboard probe.
  assert.equal((await call("GET", "/api/admin/dashboard", t.staff)).status, 403);
});

test("a token claiming SUPERADMIN that the database does not grant is rejected (no client-controlled roles)", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/overview", t.aliceClaimsSuper)).status, 403);
});

test("a deactivated main admin loses access immediately, even with a valid token", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/access", t.sleeper)).status, 401); // refused at the account-status check
});

test("MAIN_ADMIN_EMAIL pins the main admin to one account", { skip }, async () => {
  process.env.MAIN_ADMIN_EMAIL = "someone-else@example.com";
  assert.equal((await call("GET", "/api/admin/access", t.owner)).status, 403);
  process.env.MAIN_ADMIN_EMAIL = "OWNER@admin-test.example";
  assert.equal((await call("GET", "/api/admin/access", t.owner)).status, 200);
  delete process.env.MAIN_ADMIN_EMAIL;
});

test("main admin: access check and overview reflect real database counts", { skip }, async () => {
  const a = await call("GET", "/api/admin/access", t.owner);
  assert.equal(a.status, 200);
  assert.equal(a.data.data.mainAdmin, true);

  const ov = await call("GET", "/api/admin/overview", t.owner);
  assert.equal(ov.status, 200, ov.text);
  const o = ov.data.data;
  const dbTotal = await prisma.user.count({ where: { isDeleted: false } });
  assert.equal(o.users.total, dbTotal);
  assert.equal(o.users.active, await prisma.user.count({ where: { isDeleted: false, isActive: true } }));
  assert.equal(o.usage.totalRequests, 0, "no usage recorded yet, so none is invented");
  assert.equal(o.trackingSince, null);
  assert.deepEqual(o.notConfigured.map((n: any) => n.key).sort(), ["bookings", "orders", "payments"]);
});

test("users: search, pagination, and no secrets in responses", { skip }, async () => {
  const list = await call("GET", "/api/admin/users?search=alice@admin-test.example&pageSize=5", t.owner);
  assert.equal(list.status, 200);
  assert.equal(list.data.data.total, 1);
  assert.equal(list.data.data.items[0].email, "alice@admin-test.example");
  assert.equal(list.data.data.items[0].role, "USER");

  const page1 = (await call("GET", "/api/admin/users?pageSize=2&page=1", t.owner)).data.data;
  assert.equal(page1.items.length, 2);
  assert.ok(page1.totalPages >= 2);

  const detail = await call("GET", `/api/admin/users/${ids.alice}`, t.owner);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.data.activeSessions, 1);
  assert.ok(!/HASH-should-never-leak|password|googleId|refreshToken/i.test(JSON.stringify([list.data, detail.data])));
  assert.equal((await call("GET", "/api/admin/users/does-not-exist", t.owner)).status, 404);
});

test("user status: deactivate ends sessions, is audited, and protects admins and self", { skip }, async () => {
  const r = await call("PATCH", `/api/admin/users/${ids.alice}/status`, t.owner, { isActive: false });
  assert.equal(r.status, 200);
  assert.equal((await prisma.user.findUnique({ where: { id: ids.alice } })).isActive, false);
  assert.equal(await prisma.session.count({ where: { userId: ids.alice } }), 0);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "user.deactivate", entityId: ids.alice } }));

  assert.equal((await call("PATCH", `/api/admin/users/${ids.owner}/status`, t.owner, { isActive: false })).status, 403, "self");
  assert.equal((await call("PATCH", `/api/admin/users/${ids.staff}/status`, t.owner, { isActive: false })).status, 403, "other admin");
  assert.equal((await call("PATCH", `/api/admin/users/${ids.bob}/status`, t.owner, { isActive: "no" })).status, 400);

  assert.equal((await call("PATCH", `/api/admin/users/${ids.alice}/status`, t.owner, { isActive: true })).status, 200);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "user.reactivate", entityId: ids.alice } }));
});

test("content: validation, CRUD, publish workflow, schedule, and public visibility", { skip }, async () => {
  assert.equal((await call("POST", "/api/admin/content", t.owner, { type: "NOPE", title: "x" })).status, 400);
  assert.equal((await call("POST", "/api/admin/content", t.owner, { type: "BANNER", title: "Bad link", linkUrl: "javascript:alert(1)" })).status, 400);
  assert.equal((await call("POST", "/api/admin/content", t.owner, { type: "FAQ", title: "Question?" })).status, 400, "FAQ needs an answer");

  const draft = (await call("POST", "/api/admin/content", t.owner, { type: "ANNOUNCEMENT", title: "Diwali hours", body: "Open all week", linkUrl: "/contact" })).data.data;
  const faq = (await call("POST", "/api/admin/content", t.owner, { type: "FAQ", title: "Is it free?", body: "Yes, with an account.", status: "PUBLISHED" })).data.data;
  const future = (await call("POST", "/api/admin/content", t.owner, { type: "BANNER", title: "Future", status: "PUBLISHED", startsAt: new Date(Date.now() + 86_400_000).toISOString() })).data.data;
  assert.equal((await call("POST", "/api/admin/content", t.owner, { type: "BANNER", title: "Reversed", startsAt: "2030-02-01", endsAt: "2030-01-01" })).status, 400);

  let pub = (await call("GET", "/api/public/content")).data.data.map((i: any) => i.title);
  assert.deepEqual(pub, ["Is it free?"], "drafts and future-scheduled items are hidden");

  assert.equal((await call("PUT", `/api/admin/content/${draft.id}`, t.owner, { status: "PUBLISHED" })).status, 200);
  pub = (await call("GET", "/api/public/content")).data.data.map((i: any) => i.title).sort();
  assert.deepEqual(pub, ["Diwali hours", "Is it free?"]);
  const item = (await call("GET", "/api/public/content")).data.data.find((i: any) => i.title === "Diwali hours");
  assert.deepEqual(Object.keys(item).sort(), ["body", "id", "imageUrl", "linkUrl", "sortOrder", "title", "type"], "public payload is minimal");

  assert.equal((await call("PUT", `/api/admin/content/${draft.id}`, t.owner, { status: "DRAFT" })).status, 200);
  assert.equal((await call("DELETE", `/api/admin/content/${faq.id}`, t.owner)).status, 200);
  assert.equal((await call("DELETE", `/api/admin/content/${faq.id}`, t.owner)).status, 404);
  await call("DELETE", `/api/admin/content/${future.id}`, t.owner);
  await call("DELETE", `/api/admin/content/${draft.id}`, t.owner);
  assert.equal((await call("GET", "/api/public/content")).data.data.length, 0);

  const actions = (await prisma.adminAuditLog.findMany({ where: { entityType: "content" } })).map((a: any) => a.action);
  for (const a of ["content.create", "content.publish", "content.unpublish", "content.delete"]) assert.ok(actions.includes(a), a);
});

test("feature switch: disabling blocks the feature (503), is audited, and re-enabling restores it", { skip }, async () => {
  assert.equal((await call("GET", "/api/probe", t.alice)).status, 200);
  assert.equal((await call("PUT", "/api/admin/tools/not-a-feature", t.owner, { enabled: false })).status, 404);
  assert.equal((await call("PUT", "/api/admin/tools/tarot", t.owner, { enabled: "off" })).status, 400);
  assert.equal((await call("PUT", "/api/admin/tools/tarot", t.owner, { enabled: false })).status, 200);

  const blocked = await call("GET", "/api/probe", t.alice);
  assert.equal(blocked.status, 503);
  assert.equal(blocked.data.code, "FEATURE_DISABLED");
  assert.deepEqual((await call("GET", "/api/public/config")).data.data.disabledFeatures, ["tarot"]);
  assert.equal((await call("GET", "/api/admin/tools", t.owner)).data.data.tools.find((x: any) => x.key === "tarot").enabled, false);

  assert.equal((await call("PUT", "/api/admin/tools/tarot", t.owner, { enabled: true })).status, 200);
  assert.equal((await call("GET", "/api/probe", t.alice)).status, 200);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "feature.toggle", entityId: "tarot" } }));
});

test("usage tracking records real outcomes and the overview/reports reflect exactly that", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  await call("GET", "/api/probe", t.alice);
  await call("GET", "/api/probe", t.alice);
  await call("GET", "/api/probe", t.bob);
  await call("GET", "/api/probe-fail", t.bob);
  await call("GET", "/api/probe"); // anonymous 401: probes are not usage
  await new Promise((r) => setTimeout(r, 400)); // events are written after the response finishes

  const rows = await prisma.usageEvent.findMany();
  assert.equal(rows.length, 4);
  assert.equal(rows.filter((r: any) => r.status === "error").length, 1);
  assert.ok(rows.every((r: any) => r.feature === "tarot" && !("body" in r)));

  const ov = await call("GET", "/api/admin/overview", t.owner);
  assert.equal(ov.status, 200, ov.text);
  const o = ov.data.data;
  const tarot = o.usage.features.find((f: any) => f.key === "tarot");
  assert.equal(tarot.total, 4);
  assert.equal(tarot.errors, 1);
  assert.equal(o.usage.totalRequests, 4);
  assert.ok(o.trackingSince);
  assert.equal(o.recentErrors.length, 1);

  const today = new Date().toISOString().slice(0, 10);
  const rep = (await call("GET", `/api/admin/reports/summary?from=${today}&to=${today}`, t.owner)).data.data;
  assert.equal(rep.daily.reduce((s: number, d: any) => s + d.total, 0), 4);
  assert.equal((await call("GET", "/api/admin/reports/summary?from=2026-02-01&to=2026-01-01", t.owner)).status, 400);
  assert.equal((await call("GET", "/api/admin/reports/summary?from=2020-01-01&to=2026-01-01", t.owner)).status, 400, "range cap");
});

test("user dashboard is scoped to the signed-in user", { skip }, async () => {
  assert.equal((await call("GET", "/api/me/dashboard")).status, 401);
  const a = (await call("GET", "/api/me/dashboard", t.alice)).data.data;
  const b = (await call("GET", "/api/me/dashboard", t.bob)).data.data;
  assert.equal(a.profile.email, "alice@admin-test.example");
  assert.equal(a.recentActivity.length, 2);
  assert.equal(b.profile.email, "bob@admin-test.example");
  assert.equal(b.recentActivity.length, 2);
  assert.equal(a.persistence.savedReports, false, "no fake saved reports");
  assert.ok(!/password|googleId|refresh/i.test(JSON.stringify(a)));
  // A user id in the query/body must not change whose data is returned.
  const spoof = (await call("GET", `/api/me/dashboard?userId=${ids.bob}`, t.alice)).data.data;
  assert.equal(spoof.profile.email, "alice@admin-test.example");
});

test("profile edits only touch the caller and only safe fields", { skip }, async () => {
  assert.equal((await call("PATCH", "/api/me/profile", t.alice, { email: "evil@x.example", role: "SUPERADMIN", id: ids.bob })).status, 400);
  const r = await call("PATCH", "/api/me/profile", t.alice, { firstName: "Alicia", city: "Pune", id: ids.bob, email: "evil@x.example" });
  assert.equal(r.status, 200);
  assert.equal(r.data.data.firstName, "Alicia");
  const alice = await prisma.user.findUnique({ where: { id: ids.alice } });
  const bob = await prisma.user.findUnique({ where: { id: ids.bob } });
  assert.equal(alice.email, "alice@admin-test.example");
  assert.equal(bob.firstName, "bob");
  assert.equal((await call("PATCH", "/api/me/profile", t.alice, { firstName: "   " })).status, 400);
});

test("clearing activity deletes only the caller's history", { skip }, async () => {
  const del = await call("DELETE", "/api/me/activity", t.alice);
  assert.equal(del.data.data.deleted, 3, "two feature requests plus the profile.updated event from the profile test");
  assert.equal(await prisma.usageEvent.count({ where: { userId: ids.alice } }), 0);
  assert.equal(await prisma.usageEvent.count({ where: { userId: ids.bob } }), 2);
  assert.equal((await call("DELETE", "/api/me/activity")).status, 401);
});

test("CSV export: formulas are neutralised, invalid kinds rejected, exports are audited", { skip }, async () => {
  const today = new Date().toISOString().slice(0, 10);
  const usage = await call("GET", `/api/admin/reports/export?kind=usage&from=${today}&to=${today}`, t.owner);
  assert.equal(usage.status, 200);
  assert.match(usage.headers.get("content-type")!, /text\/csv/);
  assert.match(usage.headers.get("content-disposition")!, /attachment; filename="mybhagya-usage-/);
  assert.ok(usage.text.includes("date,feature,requests,errors,rejected"));
  assert.equal((await call("GET", "/api/admin/reports/export?kind=users", t.owner)).status, 400);
  assert.equal((await call("GET", "/api/admin/reports/export?kind=usage", t.alice)).status, 403);

  const { csvCell, safeUrl } = await import("../../modules/admin/adminPanel.validation.js");
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("a,b"), "\"a,b\"");
  assert.equal(safeUrl("/blog"), "/blog");
  assert.throws(() => safeUrl("//evil.example"));
  assert.throws(() => safeUrl("data:text/html,x"));
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "report.export" } }));
});

test("integrations never expose secrets and payments are honestly not configured", { skip }, async () => {
  const r = await call("GET", "/api/admin/integrations", t.owner);
  assert.equal(r.status, 200);
  assert.ok(!r.text.includes("sk-or-SECRETSECRETSECRET1234"), "raw key must not appear");
  assert.ok(r.text.includes("••••1234"), "only the masked tail is shown");
  assert.equal(r.data.data.database.ok, true);
  const p = (await call("GET", "/api/admin/payments", t.owner)).data.data;
  assert.equal(p.configured, false);
  const shop = (await call("GET", "/api/admin/shop-summary", t.owner)).data.data;
  assert.equal(shop.orders.configured, false);
});

test("audit log lists sensitive actions, paginated, main admin only", { skip }, async () => {
  const r = await call("GET", "/api/admin/audit-logs?pageSize=3", t.owner);
  assert.equal(r.status, 200);
  assert.equal(r.data.data.items.length, 3);
  assert.ok(r.data.data.total >= 8);
  assert.equal(r.data.data.items[0].actorEmail, "owner@admin-test.example");
  assert.equal((await call("GET", "/api/admin/audit-logs", t.staff)).status, 403);
});

// ── Authorization matrix: every admin endpoint, including the puja / chadhawa / shop editors ──────────
const ADMIN_ENDPOINTS: [string, string, unknown?][] = [
  ["GET", "/dashboard"],
  ["GET", "/puja/temples"], ["POST", "/puja/temples", {}], ["PUT", "/puja/temples/x", {}], ["DELETE", "/puja/temples/x"],
  ["POST", "/puja/temples/x/pujas", {}], ["DELETE", "/puja/pujas/x"], ["DELETE", "/puja/images/x"],
  ["GET", "/chadhawa"], ["POST", "/chadhawa", {}], ["PUT", "/chadhawa/x", {}], ["DELETE", "/chadhawa/x"],
  ["GET", "/shop/categories"], ["POST", "/shop/categories", {}], ["PATCH", "/shop/categories/x", {}], ["DELETE", "/shop/categories/x"],
  ["GET", "/shop/products"], ["POST", "/shop/products", {}], ["PATCH", "/shop/products/x", {}], ["DELETE", "/shop/products/x"],
];

test("authz matrix: no admin endpoint (old editors included) is reachable without a token", { skip }, async () => {
  for (const [m, p, b] of ADMIN_ENDPOINTS) assert.equal((await call(m, `/api/admin${p}`, undefined, b)).status, 401, `${m} ${p}`);
});

test("authz matrix: normal users and the old ADMIN role get 403 on every admin endpoint", { skip }, async () => {
  for (const [who, token] of [["user", t.alice], ["old ADMIN", t.staff]] as const) {
    for (const [m, p, b] of ADMIN_ENDPOINTS) assert.equal((await call(m, `/api/admin${p}`, token, b)).status, 403, `${who}: ${m} ${p}`);
  }
});

test("authz matrix: the main admin (SUPERADMIN) is allowed through every admin endpoint", { skip }, async () => {
  for (const [m, p, b] of ADMIN_ENDPOINTS) {
    const r = await call(m, `/api/admin${p}`, t.owner, b);
    assert.ok(r.status !== 401 && r.status !== 403, `${m} ${p} -> ${r.status}`);
  }
  assert.equal((await call("GET", "/api/admin/puja/temples", t.owner)).status, 200);
  assert.equal((await call("GET", "/api/admin/shop/products", t.owner)).status, 200);
});

test("public content and config are never cached, so publishes and switches show immediately", { skip }, async () => {
  for (const p of ["/api/public/content", "/api/public/config"]) {
    assert.equal((await call("GET", p)).headers.get("cache-control"), "no-cache", p);
  }
});

test("public catalogue reads still work with no token", { skip }, async () => {
  for (const p of ["/api/temples", "/api/chadhawa", "/api/shop/categories", "/api/shop/products", "/api/public/content", "/api/public/config"]) {
    assert.equal((await call("GET", p)).status, 200, p);
  }
});

// ── Immediate deactivation ───────────────────────────────────────────────────────────────────────────────
test("deactivation: old access token, refresh token and login all stop working immediately; reactivation restores them", { skip }, async () => {
  const login = await call("POST", "/api/auth/login", undefined, { email: "deact@admintestmail.com", password: "Test#12345" });
  assert.equal(login.status, 200, login.text);
  const { accessToken, refreshToken } = login.data.data;
  assert.equal((await call("GET", "/api/me/dashboard", accessToken)).status, 200, "works while active");
  assert.equal((await call("GET", "/api/probe", accessToken)).status, 200);

  // The status lookup is cached for a few seconds, so this also proves the admin action invalidates it.
  assert.equal((await call("PATCH", `/api/admin/users/${ids.deact}/status`, t.owner, { isActive: false })).status, 200);

  assert.equal((await call("GET", "/api/me/dashboard", accessToken)).status, 401, "protected user route with the still-valid token");
  assert.equal((await call("GET", "/api/probe", accessToken)).status, 401, "any other protected route");
  assert.equal((await call("PATCH", "/api/me/profile", accessToken, { firstName: "Nope" })).status, 401, "writes too");
  assert.equal((await call("POST", "/api/auth/logout-all", accessToken)).status, 401, "auth-module protected route");

  const refresh = await call("POST", "/api/auth/refresh", undefined, { refreshToken });
  assert.ok(refresh.status === 401 || refresh.status === 403, `refresh token rejected (${refresh.status})`);
  assert.ok(!refresh.data?.data?.accessToken, "no new access token issued");
  assert.equal(await prisma.session.count({ where: { userId: ids.deact } }), 0, "sessions deleted");

  const relogin = await call("POST", "/api/auth/login", undefined, { email: "deact@admintestmail.com", password: "Test#12345" });
  assert.ok(relogin.status === 401 || relogin.status === 403, `login refused (${relogin.status})`);
  assert.ok(!relogin.data?.data?.accessToken);

  assert.equal((await call("PATCH", `/api/admin/users/${ids.deact}/status`, t.owner, { isActive: true })).status, 200);
  const again = await call("POST", "/api/auth/login", undefined, { email: "deact@admintestmail.com", password: "Test#12345" });
  assert.equal(again.status, 200);
  assert.equal((await call("GET", "/api/me/dashboard", again.data.data.accessToken)).status, 200, "works again after reactivation");
});

test("deactivation: a soft-deleted account's token is refused, and a status-check failure fails closed (503)", { skip }, async () => {
  const { setAccountStatusChecker, invalidateAccountStatus } = await import("../../middleware/authMiddleware.js");
  await prisma.user.update({ where: { id: ids.bob }, data: { isDeleted: true } });
  invalidateAccountStatus(ids.bob);
  assert.equal((await call("GET", "/api/me/dashboard", t.bob)).status, 401);
  await prisma.user.update({ where: { id: ids.bob }, data: { isDeleted: false } });
  invalidateAccountStatus(ids.bob);
  assert.equal((await call("GET", "/api/me/dashboard", t.bob)).status, 200);

  setAccountStatusChecker(async () => { throw new Error("db down"); });
  const origErr = console.error; console.error = () => {};
  const down = await call("GET", "/api/me/dashboard", t.alice);
  console.error = origErr;
  assert.equal(down.status, 503, "cannot verify -> refuse, never let a possibly revoked account through");
  setAccountStatusChecker(); // restore the real database lookup
});

test("deactivation: status lookups are cached, so repeat requests do not hit the database each time", { skip }, async () => {
  const { setAccountStatusChecker } = await import("../../middleware/authMiddleware.js");
  let calls = 0;
  setAccountStatusChecker(async () => { calls++; return true; });
  for (let i = 0; i < 5; i++) await call("GET", "/api/probe", t.alice);
  assert.equal(calls, 1);
  setAccountStatusChecker();
});

// ── Hardening added in the completion pass ─────────────────────────────────────────────────────────────
test("MAIN_ADMIN_EMAIL is only a second lock: an email match never grants access by itself", { skip }, async () => {
  // Email matches, but the account only has the USER role (token claims SUPERADMIN) -> still refused.
  process.env.MAIN_ADMIN_EMAIL = "alice@admin-test.example";
  assert.equal((await call("GET", "/api/admin/access", t.aliceClaimsSuper)).status, 403);
  // Email matches an ADMIN-role account -> refused (role is not SUPERADMIN).
  process.env.MAIN_ADMIN_EMAIL = "staff@admin-test.example";
  assert.equal((await call("GET", "/api/admin/access", t.staff)).status, 403);
  // Email matches but the account is deactivated -> refused at the account-status check.
  process.env.MAIN_ADMIN_EMAIL = "sleeper@admin-test.example";
  assert.equal((await call("GET", "/api/admin/access", t.sleeper)).status, 401);
  // Email matches, SUPERADMIN and active -> allowed; no header or body can substitute for it.
  process.env.MAIN_ADMIN_EMAIL = "owner@admin-test.example";
  assert.equal((await call("GET", "/api/admin/access", t.owner)).status, 200);
  assert.equal((await call("GET", "/api/admin/access?email=owner@admin-test.example&role=SUPERADMIN", t.alice)).status, 403);
  delete process.env.MAIN_ADMIN_EMAIL;
});

// The embedded test database (PGlite, one connection) can return an empty result for the very next read right after
// a deliberately failed transaction. Real Postgres does not. Re-read a few times before asserting; the asserted
// conditions are unchanged.
async function reread<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 5; i++) {
    try {
      const v = await fn();
      if (v !== null && v !== undefined) return v;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  return fn();
}

test("audit is atomic: if the audit row cannot be written, the sensitive change is rolled back", { skip }, async () => {
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION test_block_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit blocked for test'; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER test_block_audit_trg BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION test_block_audit()`);
  const origErr = console.error; console.error = () => {};
  try {
    const beforeActive = (await reread(() => prisma.user.findUnique({ where: { id: ids.bob } }))).isActive;
    const r1 = await call("PATCH", `/api/admin/users/${ids.bob}/status`, t.owner, { isActive: false });
    assert.equal(r1.status, 500);
    assert.ok(!/audit blocked|prisma|Invalid/i.test(r1.text), "no internals leaked");
    assert.equal((await reread(() => prisma.user.findUnique({ where: { id: ids.bob } }))).isActive, beforeActive, "user status unchanged");

    const r2 = await call("PUT", "/api/admin/tools/compatibility", t.owner, { enabled: false });
    assert.equal(r2.status, 500);
    assert.equal(await reread(() => prisma.platformSetting.count({ where: { key: "feature.compatibility.enabled" } })), 0, "setting not saved");
    assert.deepEqual((await call("GET", "/api/public/config")).data.data.disabledFeatures, [], "and not applied in memory");

    const before = await reread(() => prisma.contentItem.count());
    assert.equal((await call("POST", "/api/admin/content", t.owner, { type: "BANNER", title: "Should not persist" })).status, 500);
    assert.equal(await reread(() => prisma.contentItem.count()), before, "content not created");
  } finally {
    console.error = origErr;
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS test_block_audit_trg ON admin_audit_logs`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS test_block_audit()`);
  }
  assert.equal((await call("PUT", "/api/admin/tools/compatibility", t.owner, { enabled: true })).status, 200, "works again once audit works");
});

test("admin access check fails closed (503, no internals) when the database cannot answer it", { skip }, async () => {
  const { setAccountStatusChecker } = await import("../../middleware/authMiddleware.js");
  setAccountStatusChecker(async () => true); // isolate the admin check itself
  await prisma.$executeRawUnsafe(`ALTER TABLE user_role_mapping RENAME TO user_role_mapping_x`);
  const origErr = console.error; console.error = () => {};
  try {
    const r = await call("GET", "/api/admin/overview", t.owner);
    assert.equal(r.status, 503);
    assert.ok(!/prisma|user_role_mapping|relation/i.test(r.text));
  } finally {
    console.error = origErr;
    await prisma.$executeRawUnsafe(`ALTER TABLE user_role_mapping_x RENAME TO user_role_mapping`);
    setAccountStatusChecker();
  }
  assert.equal((await call("GET", "/api/admin/access", t.owner)).status, 200);
});

test("private and admin responses are never cacheable; public ones always revalidate", { skip }, async () => {
  assert.equal((await call("GET", "/api/admin/overview", t.owner)).headers.get("cache-control"), "no-store");
  assert.equal((await call("GET", "/api/admin/puja/temples", t.owner)).headers.get("cache-control"), "no-store");
  assert.equal((await call("GET", "/api/admin/overview", t.alice)).headers.get("cache-control"), "no-store", "even the 403");
  assert.equal((await call("GET", "/api/me/dashboard", t.alice)).headers.get("cache-control"), "no-store");
});

test("overview exposes recent admin actions, content status counts and inactive users from real rows", { skip }, async () => {
  const o = (await call("GET", "/api/admin/overview", t.owner)).data.data;
  assert.ok(Array.isArray(o.recentAudit) && o.recentAudit.length > 0 && o.recentAudit.length <= 6);
  assert.deepEqual(Object.keys(o.recentAudit[0]).sort(), ["action", "actorEmail", "createdAt", "id", "summary"]);
  assert.equal(o.users.inactive, await prisma.user.count({ where: { isDeleted: false, isActive: false } }));
  const published = await prisma.contentItem.count({ where: { status: "PUBLISHED" } });
  assert.equal(o.content.filter((c: any) => c.status === "PUBLISHED").reduce((s: number, c: any) => s + c.count, 0), published);
});

test("CSV export is rate limited", { skip }, async () => {
  const today = new Date().toISOString().slice(0, 10);
  let last = 0;
  for (let i = 0; i < 12; i++) last = (await call("GET", `/api/admin/reports/export?kind=signups&from=${today}&to=${today}`, t.owner)).status;
  assert.equal(last, 429);
});

// ── Customer activity, Customer 360, Google persistence, analytics, provider status ──────────────────────────
const settle = () => new Promise((r) => setTimeout(r, 500)); // events are written after the response finishes

test("auth events: sign-in and failed sign-in are recorded against the right account, never with credentials", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  const ok = await call("POST", "/api/auth/login", undefined, { email: "deact@admintestmail.com", password: "Test#12345" });
  assert.equal(ok.status, 200);
  const bad = await call("POST", "/api/auth/login", undefined, { email: "deact@admintestmail.com", password: "Wrong#Pass99" });
  assert.ok(bad.status === 401 || bad.status === 403);
  const unknown = await call("POST", "/api/auth/login", undefined, { email: "nobody-here@admintestmail.com", password: "Whatever#123" });
  assert.equal(unknown.status, 404);
  await settle();

  const evs = await prisma.usageEvent.findMany({ orderBy: { createdAt: "asc" } });
  const login = evs.find((e: any) => e.eventType === "auth.login");
  const failed = evs.find((e: any) => e.eventType === "auth.login_failed");
  assert.equal(login.userId, ids.deact);
  assert.equal(login.status, "success");
  assert.equal(login.metadata.method, "password");
  assert.equal(failed.userId, ids.deact);
  assert.equal(failed.status, "failed");
  assert.equal(failed.metadata.reason, "bad_password");
  assert.equal(evs.length, 2, "an unknown email creates no record (nothing to attribute it to)");
  const dump = JSON.stringify(evs);
  assert.ok(!/Test#12345|Wrong#Pass99|accessToken|refreshToken|Bearer/i.test(dump), "no credentials or tokens in stored events");
});

test("safeMetadata drops anything that looks like a secret and bounds the rest", { skip }, async () => {
  const { safeMetadata } = await import("../../utils/usage.js");
  const m: any = safeMetadata({ method: "password", password: "x", accessToken: "t", apiKey: "k", otp: "1", note: "a".repeat(500), n: 3, ok: true, list: ["a", "b", 3 as any], "bad key": "z", obj: { a: 1 } });
  assert.deepEqual(Object.keys(m).sort(), ["list", "method", "n", "note", "ok"]);
  assert.equal(m.note.length, 120);
  assert.deepEqual(m.list, ["a", "b"]);
  assert.equal(safeMetadata({ password: "x" }), undefined);
});

test("Google sign-in persists ONE user, assigns USER, links by email, never duplicates, and shows up in the admin Users API", { skip }, async () => {
  const { default: AuthService } = await import("../../modules/auth/auth.service.js");
  const svc = new AuthService();
  await prisma.user.deleteMany({ where: { email: { in: ["g.new@admintestmail.com", "g.link@admintestmail.com"] } } });
  const profile = { googleId: "google-sub-123", email: "g.new@admintestmail.com", emailVerified: true, firstName: "Gita", lastName: "Sharma", profileImage: "https://example.com/p.png" };

  const first = await svc.loginWithGoogleProfile(profile, "test");
  const second = await svc.loginWithGoogleProfile(profile, "test");
  assert.equal(first.user.id, second.user.id, "same Google account -> same user");
  assert.equal(await prisma.user.count({ where: { email: profile.email } }), 1, "no duplicate record");
  const row = await prisma.user.findUnique({ where: { email: profile.email }, include: { userRoleMappings: { include: { role: true } } } });
  assert.equal(row.authProvider, "GOOGLE");
  assert.equal(row.isEmailVerified, true);
  assert.deepEqual(row.userRoleMappings.map((m: any) => m.role.name), ["USER"], "default role only");
  assert.ok(first.accessToken && first.refreshToken);

  // an existing email/password account with the same email is LINKED, not duplicated
  const local = await prisma.user.create({ data: { email: "g.link@admintestmail.com", firstName: "Link", password: "HASH", isEmailVerified: false, userRoleMappings: { create: { role: { connect: { name: "USER" } } } } } });
  const linked = await svc.loginWithGoogleProfile({ googleId: "google-sub-456", email: "g.link@admintestmail.com", emailVerified: true, firstName: "Link" }, "test");
  assert.equal(linked.user.id, local.id);
  assert.equal(await prisma.user.count({ where: { email: "g.link@admintestmail.com" } }), 1);
  assert.equal((await prisma.user.findUnique({ where: { id: local.id } })).googleId, "google-sub-456");

  // an unverified Google email is refused and creates nothing
  await assert.rejects(() => svc.loginWithGoogleProfile({ googleId: "g-x", email: "g.unverified@admintestmail.com", emailVerified: false }, "test"));
  assert.equal(await prisma.user.count({ where: { email: "g.unverified@admintestmail.com" } }), 0);

  // events
  await settle();
  const mine = await prisma.usageEvent.findMany({ where: { userId: first.user.id }, orderBy: { createdAt: "asc" } });
  assert.deepEqual(mine.map((e: any) => `${e.eventType}:${e.metadata.method}`).sort(), ["auth.login:google", "auth.login:google", "auth.register:google"]);

  // admin sees it, with consistent counts
  const list = await call("GET", "/api/admin/users?provider=GOOGLE&search=g.new@admintestmail.com", t.owner);
  assert.equal(list.data.data.total, 1);
  assert.equal(list.data.data.items[0].authProvider, "GOOGLE");
  assert.equal(list.data.data.items[0].role, "USER");
  assert.ok(list.data.data.items[0].lastActiveAt, "last active comes from the recorded events");
  await prisma.user.deleteMany({ where: { email: { in: ["g.new@admintestmail.com", "g.link@admintestmail.com"] } } });
});

test("Users API: filters, pagination, and counts that agree with the Overview", { skip }, async () => {
  const all = (await call("GET", "/api/admin/users?pageSize=50", t.owner)).data.data;
  const ov = (await call("GET", "/api/admin/overview", t.owner)).data.data;
  assert.equal(all.total, ov.users.total, "the list total equals the Overview KPI");
  const active = (await call("GET", "/api/admin/users?status=active", t.owner)).data.data.total;
  const inactive = (await call("GET", "/api/admin/users?status=inactive", t.owner)).data.data.total;
  assert.equal(active + inactive, all.total);
  assert.equal(active, ov.users.active);
  assert.equal(inactive, ov.users.inactive);
  assert.equal((await call("GET", "/api/admin/users?role=ADMIN", t.owner)).data.data.items.map((u: any) => u.email).join(), "staff@admin-test.example");
  const verified = (await call("GET", "/api/admin/users?emailVerified=true", t.owner)).data.data;
  assert.ok(verified.items.every((u: any) => u.isEmailVerified === true) && verified.total >= 1);
  assert.ok((await call("GET", "/api/admin/users?emailVerified=false", t.owner)).data.data.items.every((u: any) => u.isEmailVerified === false));
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  assert.equal((await call("GET", `/api/admin/users?registeredFrom=${tomorrow}`, t.owner)).data.data.total, 0);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await call("GET", `/api/admin/users?registeredFrom=${today}&registeredTo=${today}`, t.owner)).data.data.total, all.total);
  const p1 = (await call("GET", "/api/admin/users?pageSize=2&page=1", t.owner)).data.data;
  const p2 = (await call("GET", "/api/admin/users?pageSize=2&page=2", t.owner)).data.data;
  assert.equal(p1.items.length, 2);
  assert.ok(p1.items.every((a: any) => !p2.items.some((b: any) => b.id === a.id)), "pages do not overlap");
  assert.equal((await call("GET", "/api/admin/users?search=zzzz-nobody", t.owner)).data.data.items.length, 0);
});

test("feature-opened events are recorded as 'opened' (not 'used'), per caller, and stay out of request metrics", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  assert.equal((await call("POST", "/api/me/activity", undefined, { feature: "tarot", event: "opened" })).status, 401);
  assert.equal((await call("POST", "/api/me/activity", t.alice, { feature: "not-a-feature", event: "opened" })).status, 400);
  assert.equal((await call("POST", "/api/me/activity", t.alice, { feature: "tarot", event: "completed" })).status, 400, "the browser cannot claim completion");
  assert.equal((await call("POST", "/api/me/activity", t.alice, { feature: "tarot", event: "opened", userId: ids.bob })).status, 201);
  await call("GET", "/api/probe", t.bob); // a real successful feature request by bob
  await settle();
  const alice = await prisma.usageEvent.findMany({ where: { userId: ids.alice } });
  assert.deepEqual(alice.map((e: any) => e.eventType), ["feature.opened"], "recorded for alice (the token), not bob (the body)");
  const ov = (await call("GET", "/api/admin/overview", t.owner)).data.data;
  assert.equal(ov.usage.totalRequests, 1, "only bob's real request counts as a feature request");
  const me = (await call("GET", "/api/me/dashboard", t.alice)).data.data;
  assert.equal(me.usage.byFeature.length, 0, "opening a page is not usage");
  assert.match(me.recentActivity[0].label, /Opened/);
});

test("profile updates are recorded with field NAMES only", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  assert.equal((await call("PATCH", "/api/me/profile", t.alice, { firstName: "Secretname", city: "Hidden City" })).status, 200);
  await settle();
  const e = (await prisma.usageEvent.findMany({ where: { userId: ids.alice, eventType: "profile.updated" } }))[0];
  assert.deepEqual(e.metadata.fields.sort(), ["city", "firstName"]);
  assert.ok(!/Secretname|Hidden City/.test(JSON.stringify(e)));
});

test("Customer 360: real data only, explicit about what is not stored, 404 for unknown", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  await call("GET", "/api/probe", t.alice);
  await call("GET", "/api/probe-fail", t.alice);
  await call("POST", "/api/me/activity", t.alice, { feature: "zodiac", event: "opened" });
  await settle();
  const d = (await call("GET", `/api/admin/users/${ids.alice}`, t.owner)).data.data;
  assert.equal(d.email, "alice@admin-test.example");
  assert.ok(d.lastActiveAt);
  assert.equal(d.recentActivity.length, 3);
  assert.deepEqual(d.featureUsage.map((f: any) => [f.feature, f.total, f.success, f.failed]), [["tarot", 2, 1, 1]]);
  assert.ok(d.notStored.length >= 3);
  assert.ok(!/password|googleId|refresh/i.test(JSON.stringify(d)));
  // a customer with no events: empty, never invented
  const quiet = (await call("GET", `/api/admin/users/${ids.staff}`, t.owner)).data.data;
  assert.equal(quiet.lastActiveAt, null);
  assert.equal(quiet.lastLoginAt, null);
  assert.deepEqual(quiet.recentActivity, []);
  assert.deepEqual(quiet.featureUsage, []);
  assert.equal((await call("GET", "/api/admin/users/not-a-user", t.owner)).status, 404);
  assert.equal((await call("GET", `/api/admin/users/${ids.alice}`, t.alice)).status, 403, "a customer cannot open admin profiles");
});

test("Activity API: server-side filters, pagination, customer join, and access control", { skip }, async () => {
  await prisma.usageEvent.deleteMany();
  for (let i = 0; i < 3; i++) await call("GET", "/api/probe", t.alice);
  await call("GET", "/api/probe-fail", t.alice);
  await call("GET", "/api/probe", t.bob);
  await call("POST", "/api/me/activity", t.bob, { feature: "zodiac", event: "opened" });
  await settle();
  const get = async (q: string) => (await call("GET", `/api/admin/activity${q}`, t.owner)).data.data;

  const all = await get("");
  assert.equal(all.total, 6);
  assert.ok(all.items[0].customer.email, "each record carries its customer (one query for the page)");
  assert.equal((await get(`?userId=${ids.alice}`)).total, 4);
  assert.equal((await get("?customer=bob@admin")).total, 2, "filter by customer email");
  assert.equal((await get("?eventType=feature.opened")).total, 1);
  assert.equal((await get("?feature=zodiac")).total, 1);
  assert.equal((await get("?status=error")).total, 1);
  assert.equal((await get(`?userId=${ids.alice}&status=error&feature=tarot`)).total, 1);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await get(`?from=${today}&to=${today}`)).total, 6);
  assert.equal((await get("?from=2020-01-01&to=2020-01-02")).total, 0);
  const p = await get("?pageSize=4&page=2");
  assert.equal(p.items.length, 2);
  assert.equal(p.totalPages, 2);
  assert.equal((await get("?pageSize=9999")).pageSize, 100, "page size is capped");
  assert.equal((await call("GET", "/api/admin/activity", t.alice)).status, 403);
  assert.equal((await call("GET", "/api/admin/activity", t.staff)).status, 403);
  assert.equal((await call("GET", "/api/admin/activity")).status, 401);
  // CSV honours the filters
  // (own client address: the earlier rate-limit test deliberately exhausted the limiter for the default one)
  const csvRes = await fetch(`${base}/api/admin/reports/export?kind=activity&from=${today}&to=${today}&feature=zodiac`, { headers: { Authorization: `Bearer ${t.owner}`, "X-Forwarded-For": "10.77.0.1" } });
  assert.equal(csvRes.status, 200);
  assert.equal((await csvRes.text()).trim().split(/\r?\n/).length, 2, "header plus the single zodiac event");
});

test("Report analytics: real numbers that agree with the other endpoints", { skip }, async () => {
  const today = new Date().toISOString().slice(0, 10);
  const a = (await call("GET", `/api/admin/reports/analytics?from=${today}&to=${today}`, t.owner)).data.data;
  const ov = (await call("GET", "/api/admin/overview", t.owner)).data.data;
  const users = (await call("GET", "/api/admin/users", t.owner)).data.data;
  assert.equal(a.kpis.totalUsers, users.total);
  assert.equal(a.kpis.totalUsers, ov.users.total);
  assert.equal(a.kpis.totalRequests, 5, "tarot: 3 + 1 by alice (one failing) and 1 by bob");
  assert.equal(a.kpis.failedRequests, 1);
  assert.equal(a.kpis.successfulRequests, 4);
  assert.ok(Math.abs(a.kpis.failureRate - 0.2) < 1e-9);
  assert.equal(a.kpis.mostUsedFeature.key, "tarot");
  assert.equal(a.kpis.activeUsers, 2, "alice and bob had successful events");
  assert.equal(a.dailyActiveUsers.length, 1);
  assert.equal(a.dailyActiveUsers[0].users, 2);
  assert.ok(a.leastUsed.every((f: any) => f.total <= a.mostUsed[0].total));
  assert.ok(a.authMethods.accountsByProvider.reduce((s: number, g: any) => s + g.users, 0) === a.kpis.totalUsers);
  assert.equal((await call("GET", "/api/admin/reports/analytics?from=2026-02-01&to=2026-01-01", t.owner)).status, 400);
  assert.equal((await call("GET", "/api/admin/reports/analytics", t.alice)).status, 403);
});

test("provider status reflects THIS process's environment, masks keys, and separates 'configured' from 'worked'", { skip }, async () => {
  process.env.GROQ_API_KEY = "gsk_SECRETSECRETSECRET9876";
  process.env.GOOGLE_CLIENT_ID = "1234567890-abc.apps.googleusercontent.com";
  delete process.env.SARVAM_API_KEY;
  await prisma.usageEvent.deleteMany();
  await call("GET", "/api/probe", t.alice); // tarot = OpenRouter: a real success
  await call("GET", "/api/probe-fail", t.alice); // ... and a real failure
  await settle();
  const r = await call("GET", "/api/admin/integrations", t.owner);
  const p = (id: string) => r.data.data.providers.find((x: any) => x.id === id);
  assert.equal(p("openrouter").configured, true);
  assert.equal(p("openrouter").masked, "••••1234");
  assert.equal(p("openrouter").envVar, "OPENROUTER_API_KEY");
  assert.ok(p("openrouter").lastSuccessAt && p("openrouter").lastFailureAt, "last real outcomes come from recorded requests");
  assert.equal(p("groq").configured, true);
  assert.equal(p("groq").lastSuccessAt, null, "configured is not proof it worked");
  assert.equal(p("sarvam").configured, false);
  assert.equal(p("google-oauth").configured, true);
  assert.ok(!/SECRETSECRET|gsk_/.test(r.text), "no raw key in the response");
  assert.ok(["local", "Neon (remote)", "remote", "unknown"].includes(r.data.data.database.kind));
  assert.ok(!/postgres:\/\/|password/i.test(r.text), "no connection string");
  delete process.env.GROQ_API_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
});

test("clearing my activity removes my events only (auth and opened events included)", { skip }, async () => {
  await call("GET", "/api/probe", t.bob);
  await call("GET", "/api/probe", t.alice);
  await call("POST", "/api/me/activity", t.bob, { feature: "tarot", event: "opened" });
  await settle();
  const before = await prisma.usageEvent.count({ where: { userId: ids.bob } });
  assert.ok(before >= 2);
  await call("DELETE", "/api/me/activity", t.alice);
  assert.equal(await prisma.usageEvent.count({ where: { userId: ids.alice } }), 0);
  assert.equal(await prisma.usageEvent.count({ where: { userId: ids.bob } }), before);
});

// ── Deployment guard: structural proof that EVERY route under /api/admin is behind the main-admin check ──────
test("every route and sub-router on the admin router is registered AFTER the auth + main-admin guard", { skip }, async () => {
  const { default: adminRouter } = await import("../../modules/admin/admin.route.js");
  const stack: any[] = (adminRouter as any).stack;
  const names = stack.map((l) => l.name || l.handle?.name || "");
  const guardIdx = names.lastIndexOf("requireMainAdmin");
  assert.ok(guardIdx >= 0, "requireMainAdmin is on the admin router");
  const authIdx = stack.findIndex((l) => (l.handle?.length ?? 0) === 3 && l.name !== "router" && !l.route && l.name !== "noStore" && l.name !== "requireMainAdmin");
  assert.ok(authIdx >= 0 && authIdx < guardIdx, "the token check runs before the main-admin check");
  const exposed = stack.map((l, i) => ({ i, route: !!l.route, router: l.name === "router" })).filter((x) => (x.route || x.router) && x.i < guardIdx);
  assert.deepEqual(exposed, [], "nothing is reachable before the guard");
  const reachable = stack.filter((l, i) => (l.route || l.name === "router") && i > guardIdx).length;
  assert.ok(reachable >= 4, `routes/sub-routers behind the guard: ${reachable}`);

  // and the live behaviour for a sample of the NEW endpoints, per identity
  const newOnes = ["/activity", "/reports/analytics?from=2026-01-01&to=2026-01-02", "/users?provider=GOOGLE", "/integrations", "/overview"];
  for (const p of newOnes) {
    assert.equal((await call("GET", `/api/admin${p}`)).status, 401, `anonymous ${p}`);
    assert.equal((await call("GET", `/api/admin${p}`, t.alice)).status, 403, `user ${p}`);
    assert.equal((await call("GET", `/api/admin${p}`, t.staff)).status, 403, `old ADMIN ${p}`);
    assert.equal((await call("GET", `/api/admin${p}`, t.forged)).status, 401, `forged ${p}`);
    assert.equal((await call("GET", `/api/admin${p}`, t.aliceClaimsSuper)).status, 403, `claimed role ${p}`);
  }
});
