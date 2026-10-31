// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:accounts
//
// Customer / Admin Management APIs. Local disposable database only (refuses anything that is not localhost).
// Auth is real: the app's own login, OTP verification, refresh, reset-password and token middleware are used.
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
process.env.OTP_HMAC_SECRET = "test-only-otp-hmac-secret-0123456789abcdef"; // OTPs are stored as a keyed hash; there is no fallback
delete process.env.MAIN_ADMIN_EMAIL;
for (const k of ["RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL"]) process.env[k] = ""; // no real e-mail can ever be sent from this test
process.env.ACCOUNT_STATUS_TTL_MS = "5000";
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";

const tok = (id: string, role: string) => jwt.sign({ id, role }, process.env.JWT_SECRET!);
const DOM = "@acct-test.com";
const PW = "Strong#Pass1";

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
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, text };
}
const A = (method: string, path: string, token: string | undefined, body?: unknown) => call(method, `/api/admin${path}`, token, body);

/** Signs in through the real login + OTP verification flow (the new account's e-mail is not pre-verified). */
async function signIn(email: string, password: string) {
  await prisma.otpVerification.deleteMany({ where: { email } }); // this suite signs the same account in many times; keep it clear of the per-hour OTP issue cap
  const first = await call("POST", "/api/auth/login", undefined, { email, password });
  if (first.status !== 200 || !first.data?.data?.requiresVerification) return first;
  const { hashOtp } = await import("../../utils/otpSecurity.js");
  await prisma.otpVerification.create({ data: { email, otpCode: hashOtp("123456", email, "LOGIN"), type: "LOGIN", expiresAt: new Date(Date.now() + 600000) } });
  return call("POST", "/api/auth/verify-otp", undefined, { email, otp: "123456", type: "LOGIN" });
}

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  const { default: adminRoutes } = await import("../../modules/admin/admin.route.js");
  const { auth } = await import("../../middleware/authMiddleware.js");
  const { errorHandler } = await import("../../middleware/errorHandler.js");
  const { default: authRoutes } = await import("../../modules/auth/auth.route.js");
  const bcrypt = (await import("bcryptjs")).default;

  await prisma.adminAuditLog.deleteMany({ where: { OR: [{ actorEmail: { endsWith: DOM } }, { summary: { contains: DOM } }] } });
  await prisma.user.deleteMany({ where: { OR: [{ email: { endsWith: DOM } }, { email: { startsWith: "deleted-" } }] } });
  await prisma.otpVerification.deleteMany({ where: { email: { endsWith: DOM } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  const mk = async (key: string, role: string, extra: Record<string, unknown> = {}) => {
    const u = await prisma.user.create({
      data: { email: `${key}${DOM}`, firstName: key, lastName: "T", password: await bcrypt.hash(PW, 8), isActive: true, isEmailVerified: true, profileCompleted: true, ...extra, userRoleMappings: { create: { roleId: roles[role] } } },
    });
    ids[key] = u.id;
  };
  await mk("super", "SUPERADMIN");
  await mk("super2", "SUPERADMIN");
  await mk("adminA", "ADMIN");
  await mk("userA", "USER");
  await mk("userB", "USER");
  t = { super: tok(ids.super, "SUPERADMIN"), super2: tok(ids.super2, "SUPERADMIN"), adminA: tok(ids.adminA, "ADMIN"), userA: tok(ids.userA, "USER"), userB: tok(ids.userB, "USER") };

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use("/api/auth", authRoutes);
  app.get("/api/probe", auth("USER"), (_req, res) => res.json({ ok: true }));
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

const newCustomer = (n: string, extra: Record<string, unknown> = {}) => ({ firstName: "Cust", lastName: n, email: `cust-${n}${DOM}`, phoneNo: "", password: PW, confirmPassword: PW, status: "active", ...extra });
const newAdmin = (n: string, role: string, extra: Record<string, unknown> = {}) => ({ firstName: "Adm", lastName: n, email: `adm-${n}${DOM}`, password: PW, confirmPassword: PW, role, status: "active", ...extra });

test("customers: create validates input, stores only a hash, assigns USER on the server and records the creator", { skip }, async () => {
  const c = newCustomer("one", { phoneNo: "9876500001" });
  assert.equal((await A("POST", "/customers", t.super, { ...c, email: "not-an-email" })).status, 400);
  assert.equal((await A("POST", "/customers", t.super, { ...c, password: "weak", confirmPassword: "weak" })).status, 400);
  assert.equal((await A("POST", "/customers", t.super, { ...c, confirmPassword: "Different#1x" })).status, 400);
  assert.equal((await A("POST", "/customers", t.super, { ...c, phoneNo: "123" })).status, 400);
  assert.equal((await A("POST", "/customers", t.super, { ...c, firstName: "" })).status, 400);
  assert.equal((await A("POST", "/customers", t.super, { ...c, role: "SUPERADMIN" })).status, 403, "a customer payload can never carry a role");
  assert.equal((await A("POST", "/customers", t.super, { ...c, role: "ADMIN" })).status, 403);
  const ok = await A("POST", "/customers", t.super, c);
  assert.equal(ok.status, 201, ok.text);
  ids.one = ok.data.data.id;
  assert.equal(ok.data.data.role, "USER");
  assert.ok(!/Strong#Pass1|password/i.test(JSON.stringify(ok.data)), "the response never echoes a password");
  const row = await prisma.user.findUnique({ where: { id: ids.one }, include: { userRoleMappings: { include: { role: true } } } });
  assert.deepEqual(row.userRoleMappings.map((m: any) => m.role.name), ["USER"]);
  assert.ok(row.password && row.password !== PW && row.password.startsWith("$2"), "bcrypt hash, never plaintext");
  assert.equal(row.createdById, ids.super, "creator recorded");
  assert.equal(row.isEmailVerified, false, "e-mail is not marked verified by the admin");
  assert.equal((await A("POST", "/customers", t.super, c)).status, 409, "duplicate e-mail");
  assert.equal((await A("POST", "/customers", t.super, { ...newCustomer("dupe", { phoneNo: "9876500001" }) })).status, 409, "duplicate phone");
  assert.equal((await A("POST", "/customers", t.super, { ...newCustomer("UPPER"), email: `CUST-One${DOM.toUpperCase()}` })).status, 409, "e-mail uniqueness is case-insensitive");
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "customer.create", entityId: ids.one, actorId: ids.super } }));
});

test("a new customer signs in through the normal flow, appears only in Customers, never in Admin Management", { skip }, async () => {
  const login = await signIn(`cust-one${DOM}`, PW);
  assert.equal(login.status, 200, login.text);
  const access = login.data.data.accessToken;
  assert.ok(access && login.data.data.user.email === `cust-one${DOM}`);
  assert.ok(!JSON.stringify(login.data).includes("$2"), "no hash in the login response");
  t.one = access;
  t.oneRefresh = login.data.data.refreshToken;
  assert.equal((await call("GET", "/api/probe", t.one)).status, 200);
  assert.equal((await signIn(`cust-one${DOM}`, "Wrong#Pass1")).status, 401);

  const inCustomers = await A("GET", `/customers?search=cust-one${encodeURIComponent(DOM)}`, t.super);
  assert.equal(inCustomers.data.data.total, 1);
  assert.equal((await A("GET", `/admins?search=cust-one${encodeURIComponent(DOM)}`, t.super)).data.data.total, 0);
  assert.equal((await A("GET", `/admins/${ids.one}`, t.super)).status, 404, "a customer id is not an administrator");
  const detail = (await A("GET", `/customers/${ids.one}`, t.super)).data.data;
  assert.equal(detail.createdBy.id, ids.super);
  { const m = JSON.stringify(detail).match(/\$2|"password":|refreshToken|googleId/i); assert.equal(m, null, `leak: ${m && JSON.stringify(detail).slice(Math.max(0, m.index - 40), m.index + 40)}`); }
});

test("customers: edit (names, phone, e-mail rules), reset password, old password stops working, sessions end", { skip }, async () => {
  assert.equal((await A("PATCH", `/customers/${ids.one}`, t.super, { role: "SUPERADMIN" })).status, 403, "role cannot be changed on a customer");
  assert.equal((await A("PATCH", `/customers/${ids.one}`, t.super, { isActive: false })).status, 400, "status has its own action");
  assert.equal((await A("PATCH", `/customers/${ids.one}`, t.super, { email: "bad" })).status, 400);
  assert.equal((await A("PATCH", `/customers/${ids.one}`, t.super, { email: `usera${DOM}` })).status, 409);
  const e = await A("PATCH", `/customers/${ids.one}`, t.super, { firstName: "Renamed", lastName: "Person", phoneNo: "9876500002" });
  assert.equal(e.status, 200, e.text);
  assert.deepEqual(e.data.data.changed.sort(), ["firstName", "lastName", "phoneNo"]);
  let row = await prisma.user.findUnique({ where: { id: ids.one } });
  assert.equal(row.firstName, "Renamed");
  assert.equal(row.isPhoneVerified, false);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "customer.update", entityId: ids.one } }));
  assert.equal((await A("PATCH", `/customers/${ids.one}`, t.super, { firstName: "Renamed" })).data.message, "No changes");

  // e-mail change: unverified again, sessions ended, new address signs in
  assert.equal((await prisma.session.count({ where: { userId: ids.one } })) > 0, true);
  const em = await A("PATCH", `/customers/${ids.one}`, t.super, { email: `Cust-One-New${DOM}` });
  assert.equal(em.status, 200, em.text);
  row = await prisma.user.findUnique({ where: { id: ids.one } });
  assert.equal(row.email, `cust-one-new${DOM}`);
  assert.equal(row.isEmailVerified, false);
  assert.equal(await prisma.session.count({ where: { userId: ids.one } }), 0);
  assert.equal((await call("POST", "/api/auth/refresh", undefined, { refreshToken: t.oneRefresh })).status, 401, "the old refresh token is dead");
  assert.equal((await signIn(`cust-one${DOM}`, PW)).status, 404, "the old address no longer exists");
  const back = await A("PATCH", `/customers/${ids.one}`, t.super, { email: `cust-one${DOM}` });
  assert.equal(back.status, 200);

  // password: strength + confirmation enforced, never echoed, old password refused, new one works
  assert.equal((await A("POST", `/customers/${ids.one}/password`, t.super, { password: "short", confirmPassword: "short" })).status, 400);
  assert.equal((await A("POST", `/customers/${ids.one}/password`, t.super, { password: "New#Passw0rd", confirmPassword: "Other#Passw0rd" })).status, 400);
  const login = await signIn(`cust-one${DOM}`, PW);
  t.one = login.data.data.accessToken;
  const r = await A("POST", `/customers/${ids.one}/password`, t.super, { password: "New#Passw0rd", confirmPassword: "New#Passw0rd" });
  assert.equal(r.status, 200, r.text);
  assert.ok(!/Passw0rd/.test(r.text));
  assert.equal(await prisma.session.count({ where: { userId: ids.one } }), 0, "sessions ended");
  assert.equal((await signIn(`cust-one${DOM}`, PW)).status, 401, "old password refused");
  assert.equal((await signIn(`cust-one${DOM}`, "New#Passw0rd")).status, 200, "new password works");
  const audit = await prisma.adminAuditLog.findFirst({ where: { action: "customer.password_reset", entityId: ids.one } });
  assert.ok(audit && !/Passw0rd|Strong/.test(JSON.stringify(audit)), "audit holds no password");
});

test("customers: reset link uses the existing reset flow (single use token, never returned)", { skip }, async () => {
  const r = await A("POST", `/customers/${ids.one}/password-reset-link`, t.super);
  assert.equal(r.status, 200, r.text);
  assert.ok(!/token/i.test(JSON.stringify(r.data.data)));
  const tokenRow = await prisma.passwordResetToken.findFirst({ where: { userId: ids.one, used: false } });
  assert.ok(tokenRow);
  const done = await call("POST", "/api/auth/reset-password", undefined, { token: tokenRow.token, password: "Third#Passw0rd" });
  assert.equal(done.status, 200, done.text);
  assert.equal((await signIn(`cust-one${DOM}`, "Third#Passw0rd")).status, 200);
  assert.equal((await call("POST", "/api/auth/reset-password", undefined, { token: tokenRow.token, password: "Fourth#Passw0rd" })).status, 400, "single use");
});

test("customers: deactivate blocks protected access at once; reactivate restores it", { skip }, async () => {
  const login = await signIn(`cust-one${DOM}`, "Third#Passw0rd");
  t.one = login.data.data.accessToken;
  assert.equal((await call("GET", "/api/probe", t.one)).status, 200);
  const d = await A("PATCH", `/customers/${ids.one}/status`, t.super, { isActive: false });
  assert.equal(d.status, 200);
  assert.equal((await call("GET", "/api/probe", t.one)).status, 401, "the issued token stops working immediately");
  assert.equal((await call("POST", "/api/auth/refresh", undefined, { refreshToken: login.data.data.refreshToken })).status, 401);
  assert.equal((await signIn(`cust-one${DOM}`, "Third#Passw0rd")).status, 403, "deactivated accounts cannot sign in");
  assert.equal((await A("PATCH", `/customers/${ids.one}/status`, t.super, { isActive: true })).status, 200);
  assert.equal((await signIn(`cust-one${DOM}`, "Third#Passw0rd")).status, 200);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "customer.deactivate", entityId: ids.one } }));
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "customer.reactivate", entityId: ids.one } }));
});

test("customers: deletion needs typed confirmation, removes personal data, keeps the tombstone and audit, leaves other users alone", { skip }, async () => {
  const c = await A("POST", "/customers", t.super, newCustomer("del", { phoneNo: "9876500003" }));
  ids.del = c.data.data.id;
  await prisma.generatedReading.create({ data: { userId: ids.del, feature: "tarot", title: "T", summary: "s", output: { a: 1 }, provider: "x", model: "y" } });
  await prisma.generatedReading.create({ data: { userId: ids.userB, feature: "tarot", title: "T", summary: "s", output: { a: 1 }, provider: "x", model: "y" } });
  const conv = await prisma.conversation.create({ data: { userId: ids.del, feature: "ai-guru", title: "c", preview: "p", lastMessageAt: new Date(), messages: { create: [{ role: "user", content: "hi" }] } } });
  await prisma.session.create({ data: { userId: ids.del, refreshToken: "r-del", expiresAt: new Date(Date.now() + 1e9) } });
  await prisma.usageEvent.create({ data: { feature: "tarot", userId: ids.del, status: "success", statusCode: 200, durationMs: 1 } });

  assert.equal((await A("DELETE", `/customers/${ids.del}`, t.super, {})).status, 400, "no confirmation");
  assert.equal((await A("DELETE", `/customers/${ids.del}`, t.super, { confirmEmail: "other@x.com" })).status, 400);
  assert.equal((await A("DELETE", `/customers/${ids.adminA}`, t.super, { confirmEmail: `admina${DOM}` })).status, 404, "an administrator cannot be deleted through the customer route");
  const r = await A("DELETE", `/customers/${ids.del}`, t.super, { confirmEmail: `CUST-del${DOM}` });
  assert.equal(r.status, 200, r.text);

  const row = await prisma.user.findUnique({ where: { id: ids.del } });
  assert.equal(row.isDeleted, true);
  assert.equal(row.isActive, false);
  assert.equal(row.deletedById, ids.super);
  assert.ok(row.deletedAt);
  assert.equal(row.password, null);
  assert.equal(row.phoneNo, null);
  assert.ok(row.email.endsWith("@deleted.invalid"));
  for (const [name, n] of [
    ["readings", await prisma.generatedReading.count({ where: { userId: ids.del } })],
    ["conversations", await prisma.conversation.count({ where: { userId: ids.del } })],
    ["messages", await prisma.conversationMessage.count({ where: { conversationId: conv.id } })],
    ["sessions", await prisma.session.count({ where: { userId: ids.del } })],
    ["usage rows still pointing at the person", await prisma.usageEvent.count({ where: { userId: ids.del } })],
  ] as const) assert.equal(n, 0, `no orphaned ${name}`);
  assert.equal(await prisma.usageEvent.count({ where: { feature: "tarot", userId: null } }) >= 1, true, "usage statistics are kept, de-identified");
  assert.equal(await prisma.generatedReading.count({ where: { userId: ids.userB } }), 1, "another user's reading is untouched");
  assert.equal((await A("GET", `/customers/${ids.del}`, t.super)).status, 404);
  assert.equal((await A("GET", `/customers?search=cust-del`, t.super)).data.data.total, 0);
  assert.equal((await signIn(`cust-del${DOM}`, PW)).status, 404, "cannot sign in");
  const a = await prisma.adminAuditLog.findFirst({ where: { action: "customer.delete", entityId: ids.del } });
  assert.ok(a && a.actorId === ids.super && a.createdAt, "who and when are kept");
  // the address can be registered again because the tombstone is anonymised
  assert.equal((await A("POST", "/customers", t.super, newCustomer("del"))).status, 201);
});

test("admins: only a SUPERADMIN creates admins; the role comes from an allow-list; created admin signs in", { skip }, async () => {
  assert.equal((await A("POST", "/admins", t.adminA, newAdmin("x", "ADMIN"))).status, 403, "ADMIN cannot create ADMIN");
  assert.equal((await A("POST", "/admins", t.adminA, newAdmin("x", "SUPERADMIN"))).status, 403, "ADMIN cannot create SUPERADMIN");
  assert.equal((await A("POST", "/admins", t.userA, newAdmin("x", "ADMIN"))).status, 403, "USER cannot");
  assert.equal((await A("POST", "/admins", undefined, newAdmin("x", "ADMIN"))).status, 401);
  assert.equal((await A("POST", "/admins", t.super, newAdmin("x", "USER"))).status, 400, "USER is not an admin role");
  assert.equal((await A("POST", "/admins", t.super, newAdmin("x", "GOD"))).status, 400);
  assert.equal((await A("POST", "/admins", t.super, { ...newAdmin("x", "ADMIN"), role: undefined })).status, 400);
  assert.equal(await prisma.user.count({ where: { email: `adm-x${DOM}` } }), 0, "nothing was created by the rejected calls");
  const ok = await A("POST", "/admins", t.super, newAdmin("one", "ADMIN", { phoneNo: "9876500010" }));
  assert.equal(ok.status, 201, ok.text);
  ids.admOne = ok.data.data.id;
  const row = await prisma.user.findUnique({ where: { id: ids.admOne }, include: { userRoleMappings: { include: { role: true } } } });
  assert.deepEqual(row.userRoleMappings.map((m: any) => m.role.name), ["ADMIN"]);
  assert.equal(row.createdById, ids.super);
  assert.ok(row.password.startsWith("$2"));
  const sup = await A("POST", "/admins", t.super, newAdmin("two", "SUPERADMIN"));
  assert.equal(sup.status, 201);
  ids.admTwo = sup.data.data.id;
  const login = await signIn(`adm-one${DOM}`, PW);
  assert.equal(login.status, 200, login.text);
  t.admOne = login.data.data.accessToken;
  assert.equal((await call("GET", "/api/probe", t.admOne)).status, 200);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "admin.create", entityId: ids.admOne } }));
});

test("admins vs customers: lists are separate, filtered and carry real statistics", { skip }, async () => {
  const list = (await A("GET", "/admins?pageSize=50", t.super)).data.data;
  assert.ok(list.items.length >= 4 && list.items.every((u: any) => u.role === "ADMIN" || u.role === "SUPERADMIN"), "only admin roles");
  assert.ok(!list.items.some((u: any) => u.email === `usera${DOM}` || u.email === `cust-one${DOM}`), "no customers in Admin Management");
  const base = { isDeleted: false, userRoleMappings: { some: { role: { name: { in: ["ADMIN", "SUPERADMIN", "SUPER_ADMIN"] } } } } };
  assert.equal(list.stats.total, await prisma.user.count({ where: base }));
  assert.equal(list.stats.active, await prisma.user.count({ where: { ...base, isActive: true } }));
  assert.equal(list.stats.deactivated, list.stats.total - list.stats.active);
  assert.equal(list.stats.superAdmins, await prisma.user.count({ where: { ...base, userRoleMappings: { some: { role: { name: { in: ["SUPERADMIN", "SUPER_ADMIN"] } } } } } }));
  assert.ok((await A("GET", "/admins?role=SUPERADMIN&pageSize=50", t.super)).data.data.items.every((u: any) => u.role === "SUPERADMIN"));
  assert.ok((await A("GET", "/admins?role=ADMIN&pageSize=50", t.super)).data.data.items.every((u: any) => u.role === "ADMIN"));
  assert.ok((await A("GET", "/admins?status=inactive&pageSize=50", t.super)).data.data.items.every((u: any) => u.isActive === false));
  const cust = (await A("GET", "/customers?pageSize=50", t.super)).data.data;
  assert.ok(cust.items.every((u: any) => u.role === "USER"));
  assert.ok(!cust.items.some((u: any) => [`super${DOM}`, `admina${DOM}`, `adm-one${DOM}`].includes(u.email)), "no administrators in Customers");
  assert.equal((await A("GET", "/customers?role=SUPERADMIN&pageSize=50", t.super)).data.data.items.some((u: any) => u.role !== "USER"), false, "a role filter cannot widen the customer list");
  const d = (await A("GET", `/admins/${ids.admOne}`, t.super)).data.data;
  assert.equal(d.role, "ADMIN");
  assert.equal(d.createdBy.id, ids.super);
  assert.ok(Array.isArray(d.auditHistory) && d.auditHistory.some((h: any) => h.action === "admin.create"));
  assert.ok(d.lastLoginAt === null || typeof d.lastLoginAt === "string");
  { const m = JSON.stringify(d).match(/\$2|"password":|refreshToken|googleId/i); assert.equal(m, null, `leak: ${m && JSON.stringify(d).slice(Math.max(0, m.index - 40), m.index + 40)}`); }
});

test("admins: an ADMIN cannot reach account management, promote themselves or touch other admins (direct API)", { skip }, async () => {
  for (const [m, p, b] of [
    ["GET", "/admins", undefined], ["GET", "/customers", undefined], ["GET", `/admins/${ids.super}`, undefined],
    ["PATCH", `/admins/${ids.adminA}`, { role: "SUPERADMIN" }], ["PATCH", `/admins/${ids.adminA}`, { firstName: "x" }],
    ["PATCH", `/admins/${ids.adminA}/status`, { isActive: false }], ["POST", `/admins/${ids.userA}/password`, { password: PW, confirmPassword: PW }],
    ["DELETE", `/admins/${ids.admOne}`, { confirmEmail: `adm-one${DOM}` }], ["POST", "/customers", newCustomer("hack")], ["PATCH", `/customers/${ids.userA}`, { role: "SUPERADMIN" }],
  ] as const) {
    assert.equal((await A(m, p, t.adminA, b)).status, 403, `ADMIN ${m} ${p}`);
    assert.equal((await A(m, p, t.userA, b)).status, 403, `USER ${m} ${p}`);
    assert.equal((await A(m, p, undefined, b)).status, 401, `anonymous ${m} ${p}`);
  }
  // a validly signed token that merely CLAIMS SUPERADMIN is refused against the database role
  assert.equal((await A("PATCH", `/admins/${ids.adminA}`, tok(ids.adminA, "SUPERADMIN"), { role: "SUPERADMIN" })).status, 403);
  assert.equal((await A("POST", "/admins", tok(ids.userA, "SUPERADMIN"), newAdmin("claim", "SUPERADMIN"))).status, 403);
  const roleNow = await prisma.userRoleMapping.findMany({ where: { userId: ids.adminA }, include: { role: true } });
  assert.deepEqual(roleNow.map((m: any) => m.role.name), ["ADMIN"], "nothing changed");
});

test("admins: SUPERADMIN edits, changes role, resets password; self-protection and last-SUPERADMIN protection hold", { skip }, async () => {
  const e = await A("PATCH", `/admins/${ids.admOne}`, t.super, { firstName: "Edited", phoneNo: "9876500011" });
  assert.equal(e.status, 200, e.text);
  assert.equal((await prisma.user.findUnique({ where: { id: ids.admOne } })).firstName, "Edited");
  assert.equal((await A("PATCH", `/admins/${ids.admOne}`, t.super, { role: "USER" })).status, 400, "cannot demote an admin to a customer here");
  // promote then demote
  const p = await A("PATCH", `/admins/${ids.admOne}`, t.super, { role: "SUPERADMIN" });
  assert.equal(p.status, 200, p.text);
  assert.equal((await A("GET", `/admins/${ids.admOne}`, t.super)).data.data.role, "SUPERADMIN");
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "admin.role_change", entityId: ids.admOne } }));
  const meta = (await prisma.adminAuditLog.findFirst({ where: { action: "admin.role_change", entityId: ids.admOne } })).metadata;
  assert.deepEqual(meta, { from: "ADMIN", to: "SUPERADMIN" });
  assert.equal((await A("PATCH", `/admins/${ids.admOne}`, t.super, { role: "ADMIN" })).status, 200);
  assert.equal(await prisma.session.count({ where: { userId: ids.admOne } }), 0, "a role change ends the sessions");

  // reset password
  assert.equal((await A("POST", `/admins/${ids.admOne}/password`, t.super, { password: "weakpass", confirmPassword: "weakpass" })).status, 400);
  assert.equal((await A("POST", `/admins/${ids.admOne}/password`, t.super, { password: "Admin#NewPass9", confirmPassword: "Admin#NewPass9" })).status, 200);
  assert.equal((await signIn(`adm-one${DOM}`, PW)).status, 401);
  assert.equal((await signIn(`adm-one${DOM}`, "Admin#NewPass9")).status, 200);

  // self protection
  assert.equal((await A("PATCH", `/admins/${ids.super}`, t.super, { role: "ADMIN" })).status, 403, "cannot change own role");
  assert.equal((await A("PATCH", `/admins/${ids.super}`, t.super, { email: `new${DOM}` })).status, 403, "own e-mail is changed from the profile");
  assert.equal((await A("PATCH", `/admins/${ids.super}/status`, t.super, { isActive: false })).status, 403, "self-deactivation");
  assert.equal((await A("DELETE", `/admins/${ids.super}`, t.super, { confirmEmail: `super${DOM}` })).status, 403, "self-deletion");
  assert.equal((await A("POST", `/admins/${ids.super}/password`, t.super, { password: PW, confirmPassword: PW })).status, 403, "own password is not changed here");
  assert.equal((await A("PATCH", `/admins/${ids.super}`, t.super, { firstName: "Selfname" })).status, 200, "own profile fields can be edited");
});

test("admins: deactivation revokes access at once; reactivation restores it", { skip }, async () => {
  const login = await signIn(`adm-one${DOM}`, "Admin#NewPass9");
  const access = login.data.data.accessToken;
  assert.equal((await call("GET", "/api/probe", access)).status, 200);
  assert.equal((await A("PATCH", `/admins/${ids.admOne}/status`, t.super, { isActive: false })).status, 200);
  assert.equal((await call("GET", "/api/probe", access)).status, 401, "existing token revoked");
  assert.equal((await call("POST", "/api/auth/refresh", undefined, { refreshToken: login.data.data.refreshToken })).status, 401);
  assert.equal((await signIn(`adm-one${DOM}`, "Admin#NewPass9")).status, 403);
  assert.equal((await A("PATCH", `/admins/${ids.admOne}/status`, t.super, { isActive: true })).status, 200);
  assert.equal((await signIn(`adm-one${DOM}`, "Admin#NewPass9")).status, 200);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "admin.deactivate", entityId: ids.admOne } }));
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "admin.reactivate", entityId: ids.admOne } }));
});

test("last SUPERADMIN: two SUPERADMINs acting on each other at once can never leave the system without one", { skip }, async () => {
  const others = await prisma.user.findMany({ where: { id: { notIn: [ids.super, ids.super2] }, isActive: true, isDeleted: false, userRoleMappings: { some: { role: { name: { in: ["SUPERADMIN", "SUPER_ADMIN"] } } } } }, select: { id: true } });
  await prisma.user.updateMany({ where: { id: { in: others.map((o: any) => o.id) } }, data: { isActive: false } });
  const activeSupers = () => prisma.user.count({ where: { isActive: true, isDeleted: false, userRoleMappings: { some: { role: { name: { in: ["SUPERADMIN", "SUPER_ADMIN"] } } } } } });
  try {
    assert.equal(await activeSupers(), 2);
    for (const body of [{ s: "status", v: { isActive: false } }, { s: "role", v: { role: "ADMIN" } }]) {
      const path = (id: string) => (body.s === "status" ? `/admins/${id}/status` : `/admins/${id}`);
      const [r1, r2] = await Promise.all([A("PATCH", path(ids.super2), t.super, body.v), A("PATCH", path(ids.super), t.super2, body.v)]);
      assert.ok([r1.status, r2.status].includes(200), `one of the two succeeds (${r1.status}/${r2.status})`);
      assert.ok(await activeSupers() >= 1, `an active SUPERADMIN always remains (${body.s})`);
      await prisma.user.updateMany({ where: { id: { in: [ids.super, ids.super2] } }, data: { isActive: true } });
      for (const id of [ids.super, ids.super2]) {
        const sa = await prisma.role.findUnique({ where: { name: "SUPERADMIN" } });
        await prisma.userRoleMapping.deleteMany({ where: { userId: id, role: { name: { in: ["ADMIN", "SUPERADMIN"] } } } });
        await prisma.userRoleMapping.create({ data: { userId: id, roleId: sa.id } });
      }
    }
    // an admin that is the last SUPERADMIN cannot be removed by itself
    await prisma.user.update({ where: { id: ids.super2 }, data: { isActive: false } });
    assert.equal((await A("PATCH", `/admins/${ids.super}/status`, t.super, { isActive: false })).status, 403);
    assert.equal((await A("DELETE", `/admins/${ids.super}`, t.super, { confirmEmail: `super${DOM}` })).status, 403);
    assert.equal((await A("PATCH", `/admins/${ids.super}`, t.super, { role: "ADMIN" })).status, 403);
    assert.equal(await activeSupers(), 1);
  } finally {
    await prisma.user.updateMany({ where: { id: { in: [...others.map((o: any) => o.id), ids.super, ids.super2] } }, data: { isActive: true } });
  }
});

test("admins: delete requires confirmation, soft-deletes, keeps audit and other users' data", { skip }, async () => {
  const c = await A("POST", "/admins", t.super, newAdmin("del", "ADMIN"));
  ids.admDel = c.data.data.id;
  await prisma.adminAuditLog.create({ data: { actorId: ids.admDel, actorEmail: `adm-del${DOM}`, action: "content.create", entityType: "content", summary: "kept history" } });
  assert.equal((await A("DELETE", `/admins/${ids.admDel}`, t.super, {})).status, 400);
  assert.equal((await A("DELETE", `/customers/${ids.admDel}`, t.super, { confirmEmail: `adm-del${DOM}` })).status, 404);
  const r = await A("DELETE", `/admins/${ids.admDel}`, t.super, { confirmEmail: `adm-del${DOM}` });
  assert.equal(r.status, 200, r.text);
  const row = await prisma.user.findUnique({ where: { id: ids.admDel } });
  assert.equal(row.isDeleted, true);
  assert.equal(row.deletedById, ids.super);
  assert.equal((await A("GET", `/admins/${ids.admDel}`, t.super)).status, 404);
  assert.equal((await A("GET", `/admins?search=adm-del`, t.super)).data.data.total, 0);
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { actorId: ids.admDel, action: "content.create" } }), "their earlier actions stay in the audit trail");
  assert.ok(await prisma.adminAuditLog.findFirst({ where: { action: "admin.delete", entityId: ids.admDel, actorId: ids.super } }));
  assert.equal((await signIn(`adm-del${DOM}`, PW)).status, 404);
});

test("audit: account actions are filterable, carry no secrets, and the customer library is metadata-only", { skip }, async () => {
  const a = await A("GET", "/audit-logs?actionPrefix=admin.&pageSize=100", t.super);
  assert.equal(a.status, 200);
  assert.ok(a.data.data.items.length > 0 && a.data.data.items.every((i: any) => i.action.startsWith("admin.")));
  const all = await prisma.adminAuditLog.findMany({ where: { action: { startsWith: "customer." } } });
  const everything = JSON.stringify([all, a.data]);
  assert.ok(!/Strong#Pass1|Passw0rd|Admin#NewPass9|\$2[aby]\$|eyJ/.test(everything), "no password, hash or token in audit rows");
  await prisma.generatedReading.create({ data: { userId: ids.userA, feature: "tarot", title: "SECRET-TITLE-TEXT", summary: "SECRET-SUMMARY", output: { secret: "SECRET-OUTPUT" }, provider: "p", model: "m" } });
  const lib = await A("GET", "/customer-library", t.super);
  assert.equal(lib.status, 200);
  assert.ok(lib.data.data.totals.readings >= 1);
  assert.ok(!/SECRET/.test(lib.text), "reading text is never exposed to the admin panel");
  assert.equal((await A("GET", "/customer-library", t.adminA)).status, 403);
  await prisma.generatedReading.deleteMany({ where: { userId: ids.userA } });
});

test("regression: customers cannot use admin APIs and the audit/admin guards still hold", { skip }, async () => {
  for (const p of ["/overview", "/customers", "/admins", "/audit-logs", "/customer-library"]) {
    assert.equal((await A("GET", p, t.userA)).status, 403, p);
    assert.equal((await A("GET", p, t.super)).status, 200, p);
  }
  const ov = (await A("GET", "/overview", t.super)).data.data;
  assert.equal(ov.users.total, (await A("GET", "/customers", t.super)).data.data.total, "the Overview KPI equals the Customers total");
});
