// Run with: TEST_DATABASE_URL=postgresql://...127.0.0.1... npm run test:otp
//
// E-mail OTP hardening: keyed (HMAC) storage, constant-time comparison, single use, attempt + resend limits,
// invalidation on re-issue, fail-closed without a secret, and no OTP / secret in responses or logs.
// The unit tests need no database; the integration tests need a disposable localhost Postgres and refuse anything else.
// The real auth router and service are used; only the outbound e-mail is disabled.
import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skipDb = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

const SECRET = "test-only-otp-hmac-secret-0123456789abcdef";
process.env.JWT_SECRET = "test-only-jwt-secret";
process.env.OTP_HMAC_SECRET = SECRET;
for (const k of ["RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL"]) process.env[k] = ""; // no e-mail can be sent
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";

const DOM = "@otp-sec-test.com";
const PW = "Strong#Pass1";
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

let otp: typeof import("../../utils/otpSecurity.js");

// ---------- capture everything the app logs so we can prove no OTP / secret is ever printed ----------
const logged: string[] = [];
const secretsSeen = new Set<string>([SECRET]);
const realLog = { log: console.log, error: console.error, warn: console.warn, info: console.info };
function startCapture() {
  for (const k of ["log", "error", "warn", "info"] as const) {
    (console as any)[k] = (...a: unknown[]) => {
      logged.push(a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    };
  }
}
function stopCapture() { Object.assign(console, realLog); }

// ---------------------------------------------- unit tests (no database) ----------------------------------------------
before(async () => { otp = await import("../../utils/otpSecurity.js"); });

test("hash: keyed, bound to e-mail + flow, and never equal to the legacy unkeyed SHA-256", () => {
  const h = otp.hashOtp("123456", "a@x.com", "REGISTER");
  assert.match(h, /^h2:[0-9a-f]{64}$/);
  assert.equal(h, otp.hashOtp("123456", "a@x.com", "REGISTER"), "deterministic");
  assert.equal(h, otp.hashOtp("123456", " A@X.com ", "REGISTER"), "e-mail is normalised");
  assert.notEqual(h, otp.hashOtp("123457", "a@x.com", "REGISTER"));
  assert.notEqual(h, otp.hashOtp("123456", "b@x.com", "REGISTER"), "same code, different account => different value");
  assert.notEqual(h, otp.hashOtp("123456", "a@x.com", "LOGIN"), "same code, different flow => different value");
  assert.notEqual(h.slice(3), sha("123456"), "not the unkeyed hash");
  const expected = crypto.createHmac("sha256", SECRET).update("REGISTER\na@x.com\n123456").digest("hex");
  assert.equal(h, "h2:" + expected, "HMAC-SHA256 keyed with OTP_HMAC_SECRET");
  const other = (() => { process.env.OTP_HMAC_SECRET = "a-different-secret-that-is-long-enough-1234"; try { return otp.hashOtp("123456", "a@x.com", "REGISTER"); } finally { process.env.OTP_HMAC_SECRET = SECRET; } })();
  assert.notEqual(other, h, "a different secret produces a different value, so a leaked table is useless without the key");
});

test("verify: accepts only the matching keyed value; legacy SHA-256 and malformed values are rejected without throwing", () => {
  const h = otp.hashOtp("654321", "a@x.com", "LOGIN");
  assert.equal(otp.verifyOtpHash(h, "654321", "a@x.com", "LOGIN"), true);
  assert.equal(otp.verifyOtpHash(h, "654322", "a@x.com", "LOGIN"), false);
  assert.equal(otp.verifyOtpHash(h, "654321", "b@x.com", "LOGIN"), false);
  assert.equal(otp.verifyOtpHash(h, "654321", "a@x.com", "REGISTER"), false);
  assert.equal(otp.verifyOtpHash(sha("654321"), "654321", "a@x.com", "LOGIN"), false, "a legacy hash of the CORRECT code is still refused");
  assert.equal(otp.verifyOtpHash("legacy-invalidated", "654321", "a@x.com", "LOGIN"), false);
  assert.equal(otp.verifyOtpHash("h2:short", "654321", "a@x.com", "LOGIN"), false);
  assert.equal(otp.verifyOtpHash("", "654321", "a@x.com", "LOGIN"), false);
});

test("verify: the comparison is crypto.timingSafeEqual (constant time)", () => {
  const spy = mock.method(crypto, "timingSafeEqual");
  try {
    const h = otp.hashOtp("111222", "a@x.com", "LOGIN");
    otp.verifyOtpHash(h, "111222", "a@x.com", "LOGIN");
    otp.verifyOtpHash(h, "111223", "a@x.com", "LOGIN");
    assert.equal(spy.mock.callCount(), 2);
  } finally { spy.mock.restore(); }
});

test("generateOtp: always six digits from a CSPRNG range", () => {
  for (let i = 0; i < 2000; i++) assert.match(otp.generateOtp(), /^[1-9]\d{5}$/);
  assert.ok(new Set(Array.from({ length: 200 }, () => otp.generateOtp())).size > 150, "not constant / not tiny-range");
});

test("missing or weak HMAC secret: fails closed with a generic 500 — no fallback hashing, nothing leaked", () => {
  const original = process.env.OTP_HMAC_SECRET;
  startCapture();
  try {
    for (const bad of [undefined, "", "   ", "too-short"]) {
      if (bad === undefined) delete process.env.OTP_HMAC_SECRET; else process.env.OTP_HMAC_SECRET = bad;
      assert.equal(otp.isOtpSecretConfigured(), false);
      for (const fn of [() => otp.hashOtp("123456", "a@x.com", "LOGIN"), () => otp.verifyOtpHash(sha("123456"), "123456", "a@x.com", "LOGIN"), () => otp.assertOtpSecretConfigured()]) {
        assert.throws(fn, (e: any) => e.statusCode === 500 && /temporarily unavailable/i.test(e.message) && !/secret|hmac|sha/i.test(e.message));
      }
    }
  } finally { process.env.OTP_HMAC_SECRET = original; stopCapture(); }
  assert.equal(otp.isOtpSecretConfigured(), true);
  assert.ok(!logged.some((l) => l.includes("too-short")), "the (weak) secret value is never logged");
});

// ------------------------------------------ integration tests (local database) ------------------------------------------
let server: Server;
let base = "";
let prisma: any;
let bcryptHash = "";

async function call(method: string, p: string, body?: unknown, ip = "10.0.0.1") {
  const res = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, text, headers: res.headers };
}
let ipSeq = 10;
const nextIp = () => `10.1.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;
let n = 0;
async function mkUser(verified = false) {
  n++;
  const email = `u${n}-${crypto.randomBytes(3).toString("hex")}${DOM}`;
  const role = await prisma.role.upsert({ where: { name: "USER" }, update: {}, create: { name: "USER" } });
  const user = await prisma.user.create({
    data: { email, firstName: "T", lastName: "U", password: bcryptHash, isActive: true, isEmailVerified: verified, profileCompleted: true, userRoleMappings: { create: { roleId: role.id } } },
  });
  return { email, id: user.id };
}
/** Seeds an OTP row for a known code (same keyed format the service writes). */
async function seed(email: string, userId: string, code: string, type = "REGISTER", extra: Record<string, unknown> = {}) {
  secretsSeen.add(code);
  return prisma.otpVerification.create({
    data: { email, userId, type, otpCode: otp.hashOtp(code, email, type), expiresAt: new Date(Date.now() + 600_000), ...extra },
  });
}
/** Test-only: recovers a code the service generated, using the secret the test also holds. */
function recover(stored: string, email: string, type: string) {
  const prefix = `${type}
${email.trim().toLowerCase()}
`;
  const want = stored.slice(3);
  for (let c = 100000; c < 1000000; c++) {
    if (crypto.createHmac("sha256", SECRET).update(prefix + c).digest("hex") === want) { secretsSeen.add(String(c)); return String(c); }
  }
  throw new Error("not recoverable");
}
const row = (id: string) => prisma.otpVerification.findUnique({ where: { id } });
const verify = (email: string, code: string, type = "REGISTER", ip = nextIp()) => call("POST", "/api/auth/verify-otp", { email, otp: code, type }, ip);

before(async () => {
  if (skipDb) return;
  prisma = (await import("../../../prisma.js")).default;
  const { errorHandler } = await import("../../middleware/errorHandler.js");
  const { default: authRoutes } = await import("../../modules/auth/auth.route.js");
  bcryptHash = await (await import("bcryptjs")).default.hash(PW, 8);
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.otpVerification.deleteMany({ where: { email: { endsWith: DOM } } });
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use((err: any, req: any, res: any, next: any) => { errorHandler(err, req, res, next); });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  startCapture();
});

after(async () => {
  stopCapture();
  if (skipDb) return;
  await prisma.user.deleteMany({ where: { email: { endsWith: DOM } } });
  await prisma.otpVerification.deleteMany({ where: { email: { endsWith: DOM } } });
  server?.close();
  await prisma?.$disconnect();
});

test("correct OTP: verifies, issues tokens, marks the e-mail verified and burns the OTP", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await seed(u.email, u.id, "482913");
  const res = await verify(u.email, "482913");
  assert.equal(res.status, 200, res.text);
  assert.ok(res.data.data.accessToken && res.data.data.refreshToken);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, true);
  const after = await row(r.id);
  assert.equal(after.used, true);
  assert.match(after.otpCode, /^h2:/, "stored value is the keyed hash, never the code");
  assert.ok(!after.otpCode.includes("482913"));
});

test("incorrect OTP: 400, attempt counted, OTP still usable, no session", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await seed(u.email, u.id, "100200");
  const bad = await verify(u.email, "100201");
  assert.equal(bad.status, 400);
  assert.equal(bad.data.message, "Invalid OTP");
  assert.equal(bad.data.data, null);
  const mid = await row(r.id);
  assert.equal(mid.attempts, 1);
  assert.equal(mid.used, false);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, false);
  assert.equal((await verify(u.email, "100200")).status, 200, "the right code still works afterwards");
});

test("expired OTP: rejected with the expiry message, not counted, user stays unverified", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await seed(u.email, u.id, "300400", "REGISTER", { expiresAt: new Date(Date.now() - 60_000) });
  const res = await verify(u.email, "300400");
  assert.equal(res.status, 400);
  assert.match(res.data.message, /expired/i);
  assert.equal((await row(r.id)).attempts, 0);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, false);
});

test("reused OTP: a verified code cannot be used again; parallel submissions of the right code succeed exactly once", { skip: skipDb }, async () => {
  const u = await mkUser();
  await seed(u.email, u.id, "555666");
  assert.equal((await verify(u.email, "555666")).status, 200);
  const again = await verify(u.email, "555666");
  assert.equal(again.status, 400);
  assert.equal(again.data.message, "Invalid OTP");

  const v = await mkUser();
  await seed(v.email, v.id, "777888");
  const results = await Promise.all([verify(v.email, "777888"), verify(v.email, "777888"), verify(v.email, "777888")]);
  assert.equal(results.filter((x) => x.status === 200).length, 1, "single use holds under concurrency");
});

test("legacy SHA-256 rows are never accepted — even for the correct code", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await prisma.otpVerification.create({ data: { email: u.email, userId: u.id, type: "REGISTER", otpCode: sha("246810"), expiresAt: new Date(Date.now() + 600_000) } });
  const res = await verify(u.email, "246810");
  assert.equal(res.status, 400);
  assert.equal((await row(r.id)).used, false, "not consumed by a bad match");
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, false);
});

test("migration SQL: retires and scrubs legacy hashes; keeps keyed OTPs, users, sessions and reset tokens untouched", { skip: skipDb }, async () => {
  const u = await mkUser();
  const legacyUnused = await prisma.otpVerification.create({ data: { email: u.email, userId: u.id, type: "LOGIN", otpCode: sha("135790"), expiresAt: new Date(Date.now() + 600_000) } });
  const legacyUsed = await prisma.otpVerification.create({ data: { email: u.email, userId: u.id, type: "LOGIN", used: true, otpCode: sha("135791"), expiresAt: new Date(Date.now() - 600_000) } });
  const keyed = await seed(u.email, u.id, "112233", "REGISTER");
  const session = await prisma.session.create({ data: { userId: u.id, refreshToken: sha("rt-" + u.id), expiresAt: new Date(Date.now() + 86_400_000) } });
  const usersBefore = await prisma.user.count();
  const sessionsBefore = await prisma.session.count();

  const dir = path.resolve(import.meta.dirname, "../../../prisma/migrations");
  const mig = fs.readdirSync(dir).find((d) => d.endsWith("harden_otp_storage"))!;
  const sql = fs.readFileSync(path.join(dir, mig, "migration.sql"), "utf8");
  const statements = sql.replace(/^\s*--.*$/gm, "").split(";").map((x) => x.trim()).filter(Boolean);
  const update = statements.find((x) => /^UPDATE "otp_verifications"/.test(x));
  assert.ok(update, "found the data-scrub statement");
  await prisma.$executeRawUnsafe(update!);

  const a = await row(legacyUnused.id), b = await row(legacyUsed.id), k = await row(keyed.id);
  assert.deepEqual([a.used, a.otpCode], [true, "legacy-invalidated"]);
  assert.equal(b.otpCode, "legacy-invalidated");
  assert.equal(k.otpCode, keyed.otpCode, "keyed OTP untouched");
  assert.equal(k.used, false);
  assert.equal(await prisma.user.count(), usersBefore);
  assert.equal(await prisma.session.count(), sessionsBefore);
  assert.ok(await prisma.session.findUnique({ where: { id: session.id } }), "sessions are not invalidated");
  assert.equal((await verify(u.email, "135790", "LOGIN")).status, 400);
});

test("resend: a new OTP retires the previous one; cooldown and responses behave as before", { skip: skipDb }, async () => {
  const u = await mkUser();
  const ip = nextIp();
  const first = await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, ip);
  assert.equal(first.status, 200);
  assert.equal(first.data.message, "A new OTP has been sent to your email.");
  assert.ok(!first.text.includes("h2:") && !/\b\d{6}\b/.test(first.text), "no code or hash in the response");
  const row1 = await prisma.otpVerification.findFirst({ where: { email: u.email, type: "REGISTER", used: false } });
  assert.match(row1.otpCode, /^h2:[0-9a-f]{64}$/);
  assert.equal(row1.attempts, 0);
  const code1 = recover(row1.otpCode, u.email, "REGISTER");

  const tooSoon = await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, ip);
  assert.equal(tooSoon.status, 429, "60-second cooldown preserved");
  assert.match(tooSoon.data.message, /60 seconds/);

  await prisma.otpVerification.update({ where: { id: row1.id }, data: { createdAt: new Date(Date.now() - 120_000) } });
  assert.equal((await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, ip)).status, 200);
  assert.equal((await row(row1.id)).used, true, "previous OTP retired");
  const unused = await prisma.otpVerification.findMany({ where: { email: u.email, type: "REGISTER", used: false } });
  assert.equal(unused.length, 1, "exactly one live OTP");
  const code2 = recover(unused[0].otpCode, u.email, "REGISTER");

  if (code1 !== code2) {
    assert.equal((await verify(u.email, code1)).status, 400, "the old code no longer works");
    assert.equal((await verify(u.email, code2)).status, 200, "the new code works");
  }
});

test("login of an unverified account issues a keyed OTP and retires earlier LOGIN OTPs", { skip: skipDb }, async () => {
  const u = await mkUser();
  const old = await seed(u.email, u.id, "909090", "LOGIN");
  const res = await call("POST", "/api/auth/login", { email: u.email, password: PW }, nextIp());
  assert.equal(res.status, 200, res.text);
  assert.equal(res.data.data.requiresVerification, true);
  assert.ok(!res.text.includes("h2:") && !/\b\d{6}\b/.test(res.text));
  assert.equal((await row(old.id)).used, true);
  const live = await prisma.otpVerification.findMany({ where: { email: u.email, type: "LOGIN", used: false } });
  assert.equal(live.length, 1);
  assert.match(live[0].otpCode, /^h2:/);
  const code = recover(live[0].otpCode, u.email, "LOGIN");
  assert.equal((await verify(u.email, "909090", "LOGIN")).status, 400);
  assert.equal((await verify(u.email, code, "LOGIN")).status, 200);
});

test("attempt limit: five wrong guesses burn the OTP; even the right code is then refused", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await seed(u.email, u.id, "121212");
  for (let i = 1; i <= 4; i++) {
    const res = await verify(u.email, "000000");
    assert.equal(res.status, 400, `attempt ${i}`);
    assert.equal((await row(r.id)).attempts, i);
  }
  const fifth = await verify(u.email, "000001");
  assert.equal(fifth.status, 429);
  assert.match(fifth.data.message, /too many incorrect attempts/i);
  assert.equal((await row(r.id)).used, true, "burned");
  const right = await verify(u.email, "121212");
  assert.equal(right.status, 400, "correct code is useless once burned");
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, false);
});

test("attempt limit holds under parallel guessing (attempts are reserved atomically before comparing)", { skip: skipDb }, async () => {
  const u = await mkUser();
  const r = await seed(u.email, u.id, "343434");
  const guesses = Array.from({ length: 12 }, (_, i) => String(500000 + i));
  const results = await Promise.all(guesses.map((g) => verify(u.email, g)));
  assert.equal(results.filter((x) => x.status === 200).length, 0);
  assert.ok((await row(r.id)).used, "burned by the parallel burst");
  assert.equal((await verify(u.email, "343434")).status, 400);
});

test("OTP issuing is capped per e-mail + flow per hour (resend and login share the LOGIN budget); other flows and accounts are unaffected", { skip: skipDb }, async () => {
  const u = await mkUser();
  for (let i = 0; i < 5; i++) await seed(u.email, u.id, `60000${i}`, "LOGIN", { used: true, createdAt: new Date(Date.now() - (5 + i) * 60_000) });
  const resend = await call("POST", "/api/auth/resend-otp", { email: u.email, type: "LOGIN" }, nextIp());
  assert.equal(resend.status, 429);
  assert.match(resend.data.message, /too many otp requests/i);
  assert.equal(await prisma.otpVerification.count({ where: { email: u.email, used: false } }), 0, "nothing issued while capped");
  const login = await call("POST", "/api/auth/login", { email: u.email, password: PW }, nextIp());
  assert.equal(login.status, 429, "the unverified-login path draws on the same LOGIN budget");
  assert.equal(await prisma.otpVerification.count({ where: { email: u.email, used: false } }), 0);
  // another flow for the same account, and another account, are unaffected
  assert.equal((await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, nextIp())).status, 200);
  const w = await mkUser();
  assert.equal((await call("POST", "/api/auth/resend-otp", { email: w.email, type: "LOGIN" }, nextIp())).status, 200);
});

test("OTPs older than an hour do not count towards the cap", { skip: skipDb }, async () => {
  const u = await mkUser();
  for (let i = 0; i < 5; i++) await seed(u.email, u.id, `70000${i}`, "REGISTER", { used: true, createdAt: new Date(Date.now() - (61 + i) * 60_000) });
  assert.equal((await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, nextIp())).status, 200);
});

test("per-IP limits: verify and resend return 429 in the standard envelope with Retry-After", { skip: skipDb }, async () => {
  const ipV = nextIp();
  let limited: Awaited<ReturnType<typeof call>> | undefined;
  for (let i = 0; i < 35 && !limited; i++) {
    const r = await call("POST", "/api/auth/verify-otp", { email: `nobody${i}${DOM}`, otp: "123456", type: "REGISTER" }, ipV);
    if (r.status === 429) limited = r;
    else assert.equal(r.status, 400);
  }
  assert.ok(limited, "verify is throttled per IP");
  assert.equal(limited!.data.status, false);
  assert.equal(limited!.data.data, null);
  assert.match(limited!.data.message, /too many verification attempts/i);
  assert.ok(Number(limited!.headers.get("retry-after")) > 0);

  const ipR = nextIp();
  let limitedR: Awaited<ReturnType<typeof call>> | undefined;
  for (let i = 0; i < 15 && !limitedR; i++) {
    const r = await call("POST", "/api/auth/resend-otp", { email: `ghost${i}${DOM}`, type: "REGISTER" }, ipR);
    if (r.status === 429) limitedR = r; else assert.equal(r.status, 200);
  }
  assert.ok(limitedR, "resend is throttled per IP");
  assert.equal(limitedR!.data.status, false);
  assert.match(limitedR!.data.message, /too many otp requests/i);
  // a different client address is unaffected
  assert.notEqual((await call("POST", "/api/auth/verify-otp", { email: `x${DOM}`, otp: "123456", type: "REGISTER" }, nextIp())).status, 429);
});

test("missing HMAC secret at runtime: verify, resend and unverified-login all fail closed and change nothing", { skip: skipDb }, async () => {
  const u = await mkUser();
  const seeded = await seed(u.email, u.id, "818181");
  await prisma.otpVerification.update({ where: { id: seeded.id }, data: { createdAt: new Date(Date.now() - 120_000) } }); // past the 60s cooldown
  const before = await prisma.otpVerification.count({ where: { email: u.email } });
  const original = process.env.OTP_HMAC_SECRET;
  delete process.env.OTP_HMAC_SECRET;
  try {
    const v = await verify(u.email, "818181");
    const rs = await call("POST", "/api/auth/resend-otp", { email: u.email, type: "REGISTER" }, nextIp());
    const lg = await call("POST", "/api/auth/login", { email: u.email, password: PW }, nextIp());
    for (const res of [v, rs, lg]) {
      assert.equal(res.status, 500);
      assert.match(res.data.message, /temporarily unavailable/i);
      assert.ok(!/secret|hmac|sha|OTP_/i.test(res.text), "no configuration detail leaks to the client");
    }
    assert.equal(await prisma.otpVerification.count({ where: { email: u.email } }), before, "no OTP rows created");
    const r = await row(seeded.id);
    assert.deepEqual([r.used, r.attempts], [false, 0], "nothing consumed or counted");
    assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).isEmailVerified, false);
  } finally { process.env.OTP_HMAC_SECRET = original; }
  assert.equal((await verify(u.email, "818181")).status, 200, "works again once the secret is restored");
});

test("password reset (token flow, not OTP) and ordinary login are unchanged", { skip: skipDb }, async () => {
  const u = await mkUser(true);
  const ip = nextIp();
  assert.equal((await call("POST", "/api/auth/login", { email: u.email, password: PW }, ip)).status, 200, "verified account logs in directly");
  assert.equal((await call("POST", "/api/auth/login", { email: u.email, password: "Wrong#Pass9" }, ip)).status, 401);
  const forgot = await call("POST", "/api/auth/forgot-password", { email: u.email }, ip);
  assert.equal(forgot.status, 200);
  const tokenRow = await prisma.passwordResetToken.findFirst({ where: { userId: u.id, used: false } });
  assert.ok(tokenRow);
  const reset = await call("POST", "/api/auth/reset-password", { token: tokenRow.token, password: "Brand#New1x" }, ip);
  assert.equal(reset.status, 200, reset.text);
  assert.equal((await call("POST", "/api/auth/login", { email: u.email, password: "Brand#New1x" }, ip)).status, 200);
  assert.equal(await prisma.otpVerification.count({ where: { email: u.email } }), 0, "no OTP is involved in the reset flow");
});

test("logs: no OTP value, hash prefix or secret appeared in anything the app printed during these tests", { skip: skipDb }, () => {
  assert.ok(secretsSeen.size > 10, "the test exercised many codes");
  const joined = logged.join("\n");
  for (const s of secretsSeen) assert.ok(!joined.includes(s), `a logged line contains a secret/OTP value (${s.length === SECRET.length ? "secret" : "otp"})`);
  assert.ok(!/h2:[0-9a-f]{20}/.test(joined), "no stored hash is logged either");
});
