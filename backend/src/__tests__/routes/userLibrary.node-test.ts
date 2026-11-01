// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:library
//
// END-TO-END proof of the user library through the REAL server (src/index.ts), a real local database and real JWT auth.
// Providers are stubbed at the network layer (no real AI request, no real key). Two separate users prove data isolation.
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

const SECRET = "library-test-only-secret-0123456789abcdef";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "../../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "library-"));
const MODE_FILE = path.join(TMP, "mode.json");
const CALLS_FILE = path.join(TMP, "calls.txt");
const CONTENT_FILE = path.join(TMP, "content.json");

let child: ChildProcess | undefined;
let base = "";
let log = "";
const ids: Record<string, string> = {};
let t: Record<string, string> = {};

const setMode = (mode: string) => fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }));
const says = (content: unknown) => fs.writeFileSync(CONTENT_FILE, JSON.stringify({ content: typeof content === "string" ? content : JSON.stringify(content) }));
const providerCalls = () => (fs.existsSync(CALLS_FILE) ? fs.readFileSync(CALLS_FILE, "utf8").split("\n").filter(Boolean).length : 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise<number>((res) => { const s = createServer().listen(0, () => { const p = (s.address() as any).port; s.close(() => res(p)); }); });

async function call(method: string, p: string, token?: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, text, headers: res.headers };
}
const me = async (token: string, p: string) => (await call("GET", `/api/me${p}`, token)).data?.data;

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = TEST_DB;
  process.env.JWT_SECRET = SECRET;
  process.env.DB_POOL_MAX = "1";
  const prisma = (await import("../../../prisma.js")).default as any;
  await prisma.usageEvent.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@library-test.example" } } });
  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  for (const [key, role] of [["owner", "SUPERADMIN"], ["userA", "USER"], ["userB", "USER"]] as const) {
    const u = await prisma.user.create({ data: { email: `${key}@library-test.example`, firstName: key, lastName: "Lib", password: "HASH", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } });
    ids[key] = u.id;
  }
  await prisma.$disconnect();
  t = {
    owner: jwt.sign({ id: ids.owner, role: "SUPERADMIN" }, SECRET),
    A: jwt.sign({ id: ids.userA, role: "USER" }, SECRET),
    B: jwt.sign({ id: ids.userB, role: "USER" }, SECRET),
  };
  setMode("ok");
  says({ ok: true });
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const preload = pathToFileURL(path.join(HERE, "../helpers/providerStubPreload.mjs")).href;
  child = spawn(process.execPath, ["--import", "tsx", "--import", preload, "src/index.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env, PORT: String(port), NODE_ENV: "development", DATABASE_URL: TEST_DB, DB_POOL_MAX: "1", JWT_SECRET: SECRET,
      STUB_MODE_FILE: MODE_FILE, STUB_CALLS_FILE: CALLS_FILE, STUB_CONTENT_FILE: CONTENT_FILE,
      OPENROUTER_API_KEY: "fake-library-key", GROQ_API_KEY: "fake-library-key", SARVAM_API_KEY: "fake-library-key",
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
  await prisma.user.deleteMany({ where: { email: { endsWith: "@library-test.example" } } });
  await prisma.$disconnect();
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ── what the provider "says" for each feature, shaped like the real prompts ask for ──
const KARMA_TAROT = { currentKarmaTheme: "Letting go of old patterns", rootCause: "Holding on", lifeAreasAffected: ["work"], dailyAction: "Breathe", weeklyAction: "Journal", spiritualPractice: "Sit", recommendedHabit: "Walk", reflectionQuestion: "What next?", positiveAffirmation: "I release", cardInsights: [{ insight: "one" }, { insight: "two" }, { insight: "three" }] };
const GEM = { fullName: "Asha Rao", gender: "Female", dateOfBirth: "1990-05-15", timeOfBirth: null, timeUnknown: true, place: { name: "New Delhi", admin1: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" } };

interface Case {
  name: string; feature: string; says: unknown;
  run: (token: string) => ReturnType<typeof call>;
  /** The original output the user must get back when reopening, derived from the response they received. */
  expected: (body: any) => unknown;
}
const CASES: Case[] = [
  { name: "Tarot", feature: "tarot", says: KARMA_TAROT, run: (k) => call("POST", "/api/tarot/reading", k, { mode: "karma", cards: ["The Fool", "The Magician", "The High Priestess"] }), expected: (b) => b.data },
  { name: "Daily horoscope", feature: "horoscope", says: "Today brings a calm and focused energy for Aries, a good day to finish what you started.", run: (k) => call("GET", "/api/interpretation/horoscope/aries", k), expected: (b) => b.data },
  { name: "Chart interpretation (birth chart)", feature: "birth-chart", says: { overview: "Your Sun is strong and your Moon is gentle; together they favour steady growth in your career.", strengths: ["Focus", "Warmth"] }, run: (k) => call("POST", "/api/interpretation/birth-chart", k, { birthData: { name: "Asha", date: "1990-05-15", time: "10:30", place: "Delhi", planets: [], houses: [] } }), expected: (b) => (typeof b.data === "string" ? { text: b.data } : b.data) },
  { name: "Compatibility (zodiac)", feature: "compatibility", says: "Aries and Leo share fire and enthusiasm, with a natural warmth between them.", run: (k) => call("GET", "/api/interpretation/compatibility?sign1=aries&sign2=leo", k), expected: (b) => b.data },
  { name: "Compatibility (relationship analysis)", feature: "compatibility", says: { loveInsight: "A warm and honest bond", marriageWindow: "2027-2029" }, run: (k) => call("POST", "/api/compatibility/analyze", k, { p1: { name: "A", dob: "1990-01-01", zodiac: "Aries", lifePath: 1 }, p2: { name: "B", dob: "1991-02-02", zodiac: "Leo", lifePath: 3 }, scores: { overall: 80, love: 80, marriage: 80 } }), expected: (b) => b },
  { name: "Birth chart analysis", feature: "birth-chart", says: { overview: "A balanced chart with strong communication themes" }, run: (k) => call("POST", "/api/birthchart/analyze", k, { name: "A", zodiac: "Aries", lifePath: 1, dob: "1990-01-01", place: "Delhi" }), expected: (b) => b },
  { name: "Name analysis", feature: "name-analysis", says: { summary: "A name that carries leadership and warmth" }, run: (k) => call("POST", "/api/name-analysis/narrative", k, { name: "Asha", dob: "1990-01-01", lifePath: 1, destiny: 2 }), expected: (b) => b },
  { name: "Palm reading", feature: "palm-reading", says: { summary: "A clear head line suggests a thoughtful nature" }, run: (k) => call("POST", "/api/palm-reading", k, { imageBase64: "AAAA", imageType: "image/png", fingerprint: "1" }), expected: (b) => b.data },
  { name: "Gemstone calculator", feature: "gemstone", says: "not valid explanation json", run: (k) => call("POST", "/api/gemstone-calculator/calculate", k, GEM), expected: (b) => b.data },
  { name: "Karma (AI chat proxy)", feature: "karma", says: { karmicSummary: "Past choices shape the present", practice: "Daily gratitude" }, run: (k) => call("POST", "/api/ai/chat", k, { messages: [{ role: "user", content: "my situation" }], library: { feature: "karma" } }), expected: () => ({ karmicSummary: "Past choices shape the present", practice: "Daily gratitude" }) },
  { name: "Sacred Shloka (AI chat proxy)", feature: "shloka", says: { shloka: "karmanye vadhikaraste", meaning: "Act without attachment" }, run: (k) => call("POST", "/api/ai/chat", k, { messages: [{ role: "user", content: "guide me" }], library: { feature: "shloka" } }), expected: () => ({ shloka: "karmanye vadhikaraste", meaning: "Act without attachment" }) },
  { name: "Karma diagnosis (Inner Voice)", feature: "karma", says: { karmicPattern: "A pattern of avoidance", suggestedAction: "Face one task today" }, run: (k) => call("POST", "/api/inner-voice/diagnose", k, { text: "I feel stuck at work and tired of it" }), expected: (b) => b },
  { name: "Shloka wisdom (Inner Voice)", feature: "shloka", says: { shloka: "yogah karmasu kaushalam", meaning: "Skill in action" }, run: (k) => call("POST", "/api/inner-voice/wisdom", k, { situation: "need focus", mood: "calm", domain: "work" }), expected: (b) => b },
  { name: "Future life path", feature: "life-path", says: { lifePathOverview: "The coming months favour steady growth", nextSteps: ["Plan", "Act"] }, run: (k) => call("POST", "/api/inner-voice/life-path", k, { dob: "1990-05-15", tob: "10:30", pob: "Delhi", focus: "general" }), expected: (b) => b },
];

test("every supported AI feature saves its ORIGINAL output for the signed-in user and reopens it without calling the provider again", { skip }, async () => {
  const problems: string[] = [];
  const saved: { c: Case; id: string; expected: unknown }[] = [];
  for (const c of CASES) {
    setMode("ok");
    says(c.says);
    const calls0 = providerCalls();
    const r = await c.run(t.A);
    if (r.status !== 200) { problems.push(`${c.name}: HTTP ${r.status} ${String(r.text).slice(0, 120)}`); continue; }
    if (providerCalls() - calls0 < 1 && c.feature !== "gemstone") { problems.push(`${c.name}: never reached the provider`); continue; }
    const id = r.headers.get("x-reading-id");
    if (r.headers.get("x-reading-saved") !== "true" || !id) { problems.push(`${c.name}: not saved (X-Reading-Saved=${r.headers.get("x-reading-saved")})`); continue; }
    saved.push({ c, id, expected: c.expected(r.data) });
  }
  assert.deepEqual(problems, [], problems.join("\n"));

  // reopen every one: the stored original output comes back, and the provider is NOT called
  const callsBefore = providerCalls();
  for (const s of saved) {
    const got = await call("GET", `/api/me/readings/${s.id}`, t.A);
    assert.equal(got.status, 200, s.c.name);
    assert.equal(got.data.data.feature, s.c.feature, s.c.name);
    assert.deepEqual(got.data.data.output, s.expected, `${s.c.name}: stored output equals the original`);
    assert.ok(got.data.data.title && got.data.data.summary !== undefined, `${s.c.name}: title and summary`);
  }
  assert.equal(providerCalls(), callsBefore, "reopening readings made NO provider request");

  const list = await me(t.A, "/readings?pageSize=50");
  assert.equal(list.total, saved.length);
  // provider/model recorded for AI-backed features (not required for the rules-based gemstone fallback)
  const tarot = list.items.find((i: any) => i.feature === "tarot");
  assert.equal(tarot.provider, "openrouter");
  assert.ok(tarot.model);
  assert.ok(!("output" in tarot), "the list never carries full outputs");
});

test("library: search, feature and date filters, pagination, save / unsave, delete, persistence", { skip }, async () => {
  const all = await me(t.A, "/readings?pageSize=50");
  const horoscope = all.items.find((i: any) => i.feature === "horoscope");
  assert.equal((await me(t.A, "/readings?feature=tarot")).items.every((i: any) => i.feature === "tarot"), true);
  assert.ok((await me(t.A, "/readings?q=aries")).items.some((i: any) => i.id === horoscope.id));
  assert.equal((await me(t.A, "/readings?q=zzzz-no-match")).total, 0);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await me(t.A, `/readings?from=${today}&to=${today}`)).total, all.total);
  assert.equal((await me(t.A, "/readings?from=2020-01-01&to=2020-01-02")).total, 0);
  const p1 = await me(t.A, "/readings?pageSize=5&page=1"), p3 = await me(t.A, "/readings?pageSize=5&page=3");
  assert.equal(p1.items.length, 5);
  assert.equal(p1.totalPages, Math.ceil(all.total / 5));
  assert.ok(p3.items.length >= 1 && !p3.items.some((i: any) => p1.items.some((j: any) => j.id === i.id)));

  // save / unsave
  let r = await call("POST", `/api/me/readings/${horoscope.id}/save`, t.A, { saved: true });
  assert.equal(r.status, 200);
  assert.deepEqual((await me(t.A, "/readings?saved=true")).items.map((i: any) => i.id), [horoscope.id]);
  assert.equal((await call("POST", `/api/me/readings/${horoscope.id}/save`, t.A, { saved: "yes" })).status, 400);
  r = await call("POST", `/api/me/readings/${horoscope.id}/save`, t.A, { saved: false });
  assert.equal((await me(t.A, "/readings?saved=true")).total, 0);

  // delete
  const victim = all.items.find((i: any) => i.feature === "palm-reading");
  assert.equal((await call("DELETE", `/api/me/readings/${victim.id}`, t.A)).status, 200);
  assert.equal((await call("GET", `/api/me/readings/${victim.id}`, t.A)).status, 404);
  assert.equal((await me(t.A, "/readings?pageSize=50")).total, all.total - 1);
  assert.equal((await call("DELETE", `/api/me/readings/${victim.id}`, t.A)).status, 404, "deleting twice is a clean 404");
  assert.equal((await call("GET", "/api/me/readings/not-an-id!", t.A)).status, 404);
});

test("USER ISOLATION: user B cannot see, open, save, delete or find anything of user A", { skip }, async () => {
  const a = await me(t.A, "/readings?pageSize=50");
  assert.ok(a.total > 0);
  const id = a.items[0].id;
  assert.equal((await me(t.B, "/readings")).total, 0, "B's library is empty");
  assert.equal((await call("GET", `/api/me/readings/${id}`, t.B)).status, 404, "open");
  assert.equal((await call("POST", `/api/me/readings/${id}/save`, t.B, { saved: true })).status, 404, "save");
  assert.equal((await call("DELETE", `/api/me/readings/${id}`, t.B)).status, 404, "delete");
  assert.equal((await me(t.B, `/readings?q=${encodeURIComponent(a.items[0].title.slice(0, 10))}`)).total, 0, "search");
  // A's reading is untouched by B's attempts
  assert.equal((await call("GET", `/api/me/readings/${id}`, t.A)).status, 200);
  assert.equal((await call("GET", `/api/me/readings/${id}`, t.A)).data.data.isSaved, false);
  // a user id sent by the client is ignored: identity only comes from the token
  assert.equal((await me(t.B, `/readings?userId=${ids.userA}`)).total, 0);
  const forged = await call("GET", "/api/me/readings", undefined);
  assert.equal(forged.status, 401);
  // B's overview and timeline know nothing about A
  const ov = await me(t.B, "/overview");
  assert.equal(ov.stats.readings, 0);
  assert.equal(ov.recentReadings.length, 0);
  assert.equal((await me(t.B, "/activity")).items.length, 0);
});

test("anonymous and failed generations are never saved; a retry with the same key is saved once", { skip }, async () => {
  // anonymous horoscope: works, nothing saved, no header
  says("A calm day for Taurus, with steady progress in whatever you start.");
  const anon = await call("GET", "/api/interpretation/horoscope/taurus");
  assert.equal(anon.status, 200);
  assert.equal(anon.headers.get("x-reading-id"), null);
  // provider failure for a signed-in user
  setMode("error");
  const failed = await call("GET", "/api/interpretation/horoscope/leo", t.A);
  assert.ok(failed.status >= 500);
  assert.equal(failed.headers.get("x-reading-saved"), null);
  setMode("ok");
  // idempotent retry
  says("Gemini today favours conversation and quick decisions in small things.");
  const k = { "x-client-request-id": "retry-key-0001" };
  const one = await call("GET", "/api/interpretation/horoscope/gemini", t.A, undefined, k);
  const two = await call("GET", "/api/interpretation/horoscope/gemini", t.A, undefined, k);
  assert.equal(one.headers.get("x-reading-id"), two.headers.get("x-reading-id"), "same key -> same reading");
  const list = await me(t.A, "/readings?q=gemini");
  assert.equal(list.total, 1);
});

test("conversations: history is saved, reopened, continued and deleted, and only its owner can touch it", { skip }, async () => {
  setMode("ok");
  says({ type: "gathering", message: "Namaste. Tell me more about what is weighing on you.", progress: 20 });
  const chat = (token: string, text: string, conversationId?: string) =>
    call("POST", "/api/ai/chat", token, { messages: [{ role: "system", content: "guru" }, { role: "user", content: text }], library: { feature: "ai-guru", ...(conversationId ? { conversationId } : {}) } });
  const first = await chat(t.A, "I feel stuck in my career");
  assert.equal(first.headers.get("x-reading-saved"), "true");
  const cid = first.headers.get("x-conversation-id")!;
  assert.ok(cid);
  const second = await chat(t.A, "It started last year", cid);
  assert.equal(second.headers.get("x-conversation-id"), cid, "continues the same conversation");
  const calls = providerCalls();

  const list = await me(t.A, "/conversations");
  assert.equal(list.total, 1);
  assert.equal(list.items[0].messageCount, 4);
  assert.equal(list.items[0].featureLabel, "AI Guru");
  const conv = await me(t.A, `/conversations/${cid}`);
  assert.deepEqual(conv.messages.map((m: any) => [m.role, m.content]), [
    ["user", "I feel stuck in my career"], ["assistant", "Namaste. Tell me more about what is weighing on you."],
    ["user", "It started last year"], ["assistant", "Namaste. Tell me more about what is weighing on you."],
  ]);
  assert.equal(providerCalls(), calls, "opening a conversation made no provider request");

  // the Inner Voice guru chat is a second conversation type
  says({ guidance: "Chant with devotion", reflection: "Karma ripens", action: "Light a lamp", spiritualPractice: "Meditate", question: "What do you fear?" });
  const iv = await call("POST", "/api/inner-voice/guru-chat", t.A, { message: "guide me", history: [] });
  assert.equal(iv.headers.get("x-reading-saved"), "true");
  assert.equal((await me(t.A, "/conversations?feature=inner-voice")).total, 1);
  assert.equal((await me(t.A, "/conversations")).total, 2);

  // isolation
  assert.equal((await me(t.B, "/conversations")).total, 0);
  assert.equal((await call("GET", `/api/me/conversations/${cid}`, t.B)).status, 404);
  assert.equal((await call("DELETE", `/api/me/conversations/${cid}`, t.B)).status, 404);
  const hijack = await chat(t.B, "trying to join someone else's chat", cid);
  assert.notEqual(hijack.headers.get("x-conversation-id"), cid, "B's message starts B's OWN conversation");
  assert.equal((await me(t.A, `/conversations/${cid}`)).messages.length, 4, "A's conversation gained nothing");

  // delete
  assert.equal((await call("DELETE", `/api/me/conversations/${cid}`, t.A)).status, 200);
  assert.equal((await call("GET", `/api/me/conversations/${cid}`, t.A)).status, 404);
  assert.equal((await me(t.A, "/conversations")).total, 1);
});

test("overview and activity timeline show real events with links, filters and paging; message text never appears in activity", { skip }, async () => {
  const ov = await me(t.A, "/overview");
  assert.equal(ov.stats.readings, (await me(t.A, "/readings")).total);
  assert.ok(ov.stats.featuresExplored >= 5);
  assert.equal(ov.stats.conversations, 1);
  assert.ok(ov.stats.lastActiveAt);
  assert.ok(ov.continue.reading && ov.continue.conversation && ov.continue.lastFeature);
  assert.ok(ov.recentReadings.length <= 5 && ov.recentReadings.every((r: any) => !("output" in r)));

  const act = await me(t.A, "/activity?pageSize=50");
  const kinds = new Set(act.items.map((i: any) => i.kind));
  for (const k of ["reading.generated", "reading.saved", "reading.unsaved", "reading.removed", "conversation.started", "conversation.continued", "conversation.removed"]) assert.ok(kinds.has(k), `timeline has ${k}`);
  const gen = act.items.find((i: any) => i.kind === "reading.generated" && i.link);
  assert.equal(gen.link.type, "reading");
  assert.ok(gen.link.id);
  assert.equal((await me(t.A, "/activity?kind=reading.saved")).items.every((i: any) => i.kind === "reading.saved"), true);
  assert.equal((await me(t.A, "/activity?feature=tarot")).items.every((i: any) => i.feature === "tarot"), true);
  assert.ok((await me(t.A, "/activity?q=horoscope")).items.length >= 1);
  assert.equal((await me(t.A, "/activity?from=2020-01-01&to=2020-01-02")).items.length, 0);
  const small = await me(t.A, "/activity?pageSize=3");
  assert.equal(small.items.length, 3);
  assert.ok(small.nextBefore);
  const next = await me(t.A, `/activity?pageSize=3&before=${encodeURIComponent(small.nextBefore)}`);
  assert.ok(next.items.every((i: any) => new Date(i.at) < new Date(small.nextBefore)));
  assert.ok(!next.items.some((i: any) => small.items.some((j: any) => j.id === i.id)), "paging never repeats an item");
  const dump = JSON.stringify(act);
  assert.ok(!dump.includes("I feel stuck in my career") && !dump.includes("It started last year"), "conversation text is not in the activity timeline");

  // privacy control clears the personal timeline
  assert.equal((await call("DELETE", "/api/me/activity", t.A)).status, 200);
  assert.equal((await me(t.A, "/activity")).items.length, 0);
  assert.ok((await me(t.A, "/readings")).total > 0, "clearing activity does not delete readings");
});

test("bookings and orders are honest (no such system exists); every /me endpoint requires sign-in", { skip }, async () => {
  const b = await me(t.A, "/bookings"), o = await me(t.A, "/orders");
  assert.equal(b.configured, false); assert.deepEqual(b.items, []); assert.match(b.reason, /not part of the site/);
  assert.equal(o.configured, false); assert.deepEqual(o.items, []);
  for (const p of ["/overview", "/readings", "/readings/abc123abc123abc", "/conversations", "/activity", "/bookings", "/orders", "/dashboard"]) {
    assert.equal((await call("GET", `/api/me${p}`)).status, 401, `${p} anonymous`);
  }
});

test("profile update is recorded in the personal timeline and persists; admin and cost features still work", { skip }, async () => {
  const r = await call("PATCH", "/api/me/profile", t.A, { city: "Pune" });
  assert.equal(r.status, 200);
  assert.equal((await me(t.A, "/dashboard")).profile.city, "Pune");
  assert.ok((await me(t.A, "/activity")).items.some((i: any) => i.kind === "profile.updated"));
  // admin regression: cost summary + diagnostics + activity feed still answer for the SUPERADMIN, and still refuse a normal user
  assert.equal((await call("GET", "/api/admin/costs/summary", t.owner)).status, 200);
  assert.equal((await call("GET", "/api/admin/costs/diagnostics", t.owner)).status, 200);
  assert.equal((await call("GET", "/api/admin/activity", t.owner)).status, 200);
  assert.equal((await call("GET", "/api/admin/costs/summary", t.A)).status, 403);
  const costs = (await call("GET", "/api/admin/costs/summary", t.owner)).data.data;
  assert.ok(costs.kpis.totalAiRequests >= 10, "AI usage and cost tracking kept recording while readings were saved");
});

test("when saving fails the user still gets their result, and is told it was NOT saved", { skip }, async () => {
  setMode("ok");
  // larger than the storage limit: the save must fail cleanly
  says({ summary: "x".repeat(450_000) });
  const before = (await me(t.A, "/readings?pageSize=50")).total;
  const r = await call("POST", "/api/palm-reading", t.A, { imageBase64: "AAAA", imageType: "image/png", fingerprint: "9" });
  assert.equal(r.status, 200, "the generated result is still delivered");
  assert.ok(r.data.data.summary.length > 400_000);
  assert.equal(r.headers.get("x-reading-saved"), "false");
  assert.equal(r.headers.get("x-reading-id"), null);
  assert.equal((await me(t.A, "/readings?pageSize=50")).total, before, "nothing was stored");
});
