// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:astro-audio
//
// Integration tests for the Astrology Audio Manager. They need a DISPOSABLE localhost Postgres with all
// migrations applied (see `npm run local:db` + `npm run local:setup`) and refuse to run against anything
// else. Auth is real. ElevenLabs and Cloudinary are replaced by stubs so no credit is spent and no
// network call is made; everything else (routes, Prisma, locks, status rules) is the real code.
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
process.env.ELEVENLABS_API_KEY = "xi-SECRET-KEY-DO-NOT-LEAK";
delete process.env.MAIN_ADMIN_EMAIL;
process.env.ASTRO_AUDIO_SPEND_LIMIT_PER_MIN = "10000"; // the real limit is 20/min; this suite makes many calls
if (isLocal) process.env.DATABASE_URL = TEST_DB;
process.env.DB_POOL_MAX = "1";

const tok = (id: string, role: string) => jwt.sign({ id, role }, process.env.JWT_SECRET!);
const A = "/api/admin/astrology/audio";
const HI_TEXT = "टैरो चित्रित पत्तों का एक समूह है जिसका उपयोग चिंतन और कहानी कहने के लिए किया जाता है।";
const MR_TEXT = "टॅरो हा चित्रित पत्त्यांचा संच आहे जो चिंतन आणि कथाकथनासाठी वापरला जातो.";

let server: Server;
let base = "";
let prisma: any;
let svc: any;
let ElevenLabsError: any;
let ApiError: any;
let owner = "", staff = "", plain = "";

// Stub state
const synthCalls: { text: string; voiceId: string; modelId: string }[] = [];
const uploadCalls: string[] = [];
let synthImpl: (i: any) => Promise<Buffer>;
let uploadImpl: (buf: Buffer, id: string) => Promise<any>;
const mp3 = () => Buffer.concat([Buffer.from("ID3"), Buffer.alloc(400, 7)]);
const okSynth = async (i: any) => { synthCalls.push(i); return mp3(); };
const okUpload = async (_b: Buffer, id: string) => { uploadCalls.push(id); return { url: `https://res.cloudinary.com/demo/video/upload/${id}.mp3`, publicId: id, durationSeconds: 12.5, bytes: 403 }; };

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  let data: any = null;
  try { data = JSON.parse(buf.toString("utf8")); } catch { /* binary */ }
  return { status: res.status, data, buf, headers: res.headers };
}
const admin = (m: string, p: string, b?: unknown) => call(m, A + p, owner, b);
const settle = () => svc.whenIdle();
const lang = (tool: any, code: string) => tool.data.data.languages.find((l: any) => l.code === code);

before(async () => {
  if (skip) return;
  prisma = (await import("../../../prisma.js")).default;
  svc = await import("../../modules/astrologyAudio/astrologyAudio.service.js");
  ({ ElevenLabsError } = await import("../../modules/astrologyAudio/elevenlabs.js"));
  ({ ApiError } = await import("../../utils/ApiError.js"));
  const { default: adminRoutes } = await import("../../modules/admin/admin.route.js");
  const { createAstrologyAudioPublicRouter } = await import("../../modules/astrologyAudio/astrologyAudio.route.js");
  const { errorHandler } = await import("../../middleware/errorHandler.js");

  svc.providers.synthesize = (i: any) => synthImpl(i);
  svc.providers.upload = (b: Buffer, id: string) => uploadImpl(b, id);
  svc.providers.verifyVoice = async (id: string) => {
    if (id === "nosuchvoice1") throw new ElevenLabsError("VOICE_NOT_FOUND", "ElevenLabs does not recognise this voice ID.", false);
  };

  await prisma.astrologyAudioAsset.deleteMany();
  await prisma.astrologyNarration.deleteMany();
  await prisma.astrologyVoiceConfig.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@astro-audio-test.example" } } });

  const roles: Record<string, string> = {};
  for (const name of ["USER", "ADMIN", "SUPERADMIN"]) roles[name] = (await prisma.role.upsert({ where: { name }, update: {}, create: { name } })).id;
  const mk = async (key: string, role: string) =>
    (await prisma.user.create({ data: { email: `${key}@astro-audio-test.example`, firstName: key, password: "x", isActive: true, userRoleMappings: { create: { roleId: roles[role] } } } })).id;
  owner = tok(await mk("owner", "SUPERADMIN"), "SUPERADMIN");
  staff = tok(await mk("staff", "ADMIN"), "ADMIN");
  plain = tok(await mk("plain", "USER"), "USER");

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use("/api/astrology", createAstrologyAudioPublicRouter());
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
  await settle();
  server?.close();
  await prisma?.$disconnect();
});

const reset = () => { synthCalls.length = 0; uploadCalls.length = 0; synthImpl = okSynth; uploadImpl = okUpload; };

// ── Authorization ──────────────────────────────────────────────────────────

test("admin audio APIs: 401 anonymous, 403 for normal users and legacy ADMIN role", { skip }, async () => {
  reset();
  const calls: [string, string, unknown?][] = [
    ["GET", "/tools"], ["GET", "/config"], ["GET", "/tarot"], ["PUT", "/tarot/content", { language: "en", text: "x".repeat(40) }],
    ["PUT", "/config/voices", {}], ["POST", "/generate", {}], ["POST", "/regenerate", {}], ["POST", "/preview", {}],
    ["POST", "/publish", {}], ["POST", "/generate-missing", { toolSlug: "tarot", confirm: true }],
  ];
  for (const [m, p, b] of calls) {
    assert.equal((await call(m, A + p, undefined, b)).status, 401, `anon ${m} ${p}`);
    assert.equal((await call(m, A + p, plain, b)).status, 403, `user ${m} ${p}`);
    assert.equal((await call(m, A + p, staff, b)).status, 403, `legacy admin ${m} ${p}`);
  }
  assert.equal(synthCalls.length, 0);
});

// ── Content loading and translations ───────────────────────────────────────

test("lists the six tools; English is seeded from the page, Hindi/Marathi are MISSING (not invented)", { skip }, async () => {
  const r = await admin("GET", "/tools");
  assert.equal(r.status, 200);
  const slugs = r.data.data.tools.map((t: any) => t.slug);
  assert.deepEqual(slugs, ["tarot", "zodiac", "birth-chart", "compatibility", "palm-reading", "name-numerology"]);
  const tarot = r.data.data.tools[0].languages;
  assert.equal(tarot.find((l: any) => l.code === "en").translationStatus, "SOURCE");
  assert.equal(tarot.find((l: any) => l.code === "hi").translationStatus, "MISSING");
  assert.equal(tarot.find((l: any) => l.code === "mr").translationStatus, "MISSING");

  const t = await admin("GET", "/tarot");
  const en = lang(t, "en");
  assert.equal(en.narration.title, "About Tarot Drishti");
  assert.match(en.narration.text, /^About Tarot Drishti\.\n\nWhat Is Tarot Reading\?\n\nTarot is a deck of illustrated cards/);
  assert.equal(lang(t, "hi").narration, null);
  assert.equal(en.narration.version, 1);
});

test("unknown tool slug is a 404; bad language is a 400", { skip }, async () => {
  assert.equal((await admin("GET", "/ratna-jyotish")).status, 404);
  assert.equal((await admin("GET", "/..%2F..%2Fetc")).status, 404);
  assert.equal((await admin("PUT", "/tarot/content", { language: "fr", text: "x".repeat(40) })).status, 400);
});

test("Hindi/Marathi text must really be Devanagari; saving a translation marks it REVIEWED", { skip }, async () => {
  const eng = lang(await admin("GET", "/tarot"), "en").narration.text;
  const r1 = await admin("PUT", "/tarot/content", { language: "hi", text: eng });
  assert.equal(r1.status, 400);
  assert.match(r1.data.message, /Hindi/);
  assert.equal((await admin("PUT", "/tarot/content", { language: "hi", text: "short" })).status, 400);

  const ok = await admin("PUT", "/tarot/content", { language: "hi", text: HI_TEXT });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.data.narration.version, 1);
  const after = await admin("GET", "/tarot");
  assert.equal(lang(after, "hi").translationStatus, "REVIEWED");
  assert.equal(lang(after, "hi").narration.text, HI_TEXT);
  assert.equal(lang(after, "mr").translationStatus, "MISSING");
});

// ── Voices ─────────────────────────────────────────────────────────────────

test("voice config: invalid voice id, unknown voice, unsupported model/language are rejected", { skip }, async () => {
  const base = { languageCode: "hi", voiceName: "Asha", modelId: "eleven_v3" };
  assert.equal((await admin("PUT", "/config/voices", { ...base, voiceId: "bad id!" })).status, 400);
  const unknown = await admin("PUT", "/config/voices", { ...base, voiceId: "nosuchvoice1" });
  assert.equal(unknown.status, 400);
  assert.match(unknown.data.message, /voice ID/);
  const unsupported = await admin("PUT", "/config/voices", { languageCode: "mr", voiceName: "X", voiceId: "marathivoice1", modelId: "eleven_multilingual_v2" });
  assert.equal(unsupported.status, 400);
  assert.match(unsupported.data.message, /does not support Marathi/);
  assert.equal((await admin("PUT", "/config/voices", { ...base, voiceId: "goodvoice001", modelId: "made_up" })).status, 400);
  assert.equal((await admin("PUT", "/config/voices", { ...base, voiceId: "goodvoice001", languageCode: "fr" })).status, 400);
  assert.equal((await prisma.astrologyVoiceConfig.count()), 0);
});

test("voice config: admins can configure per-language voices without a deploy", { skip }, async () => {
  for (const v of [
    { languageCode: "en", voiceName: "English Voice", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" },
    { languageCode: "hi", voiceName: "Hindi Voice", voiceId: "hiVoice00001", modelId: "eleven_v3" },
    { languageCode: "mr", voiceName: "Marathi Voice", voiceId: "mrVoice00001", modelId: "eleven_v3" },
  ]) {
    const r = await admin("PUT", "/config/voices", v);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.data.verified, true);
  }
  const cfg = await admin("GET", "/config");
  assert.equal(cfg.data.data.voices.length, 3);
  assert.equal(cfg.data.data.elevenLabsConfigured, true);
  assert.ok(!JSON.stringify(cfg.data).includes("SECRET-KEY"));
});

// ── Generation ─────────────────────────────────────────────────────────────

const gen = (language: string, extra: Record<string, unknown> = {}, tool = "tarot") => {
  const v: Record<string, [string, string]> = { en: ["enVoice00001", "eleven_multilingual_v2"], hi: ["hiVoice00001", "eleven_v3"], mr: ["mrVoice00001", "eleven_v3"] };
  const [voiceId, modelId] = v[language] ?? ["enVoice00001", "eleven_v3"];
  return admin("POST", "/generate", { toolSlug: tool, language, voiceId, modelId, ...extra });
};

test("generate validates client-supplied ids server side", { skip }, async () => {
  reset();
  assert.equal((await gen("en", { toolSlug: "nope" })).status, 404);
  assert.equal((await gen("fr")).status, 400);
  assert.equal((await gen("en", { voiceId: "hiVoice00001" })).status, 400, "a Hindi voice must not be usable for English");
  assert.equal((await gen("en", { voiceId: "../../x" })).status, 400);
  assert.equal((await gen("en", { modelId: "made_up_model" })).status, 400);
  assert.equal((await gen("hi", { modelId: "eleven_turbo_v2" })).status, 400, "English-only model for Hindi");
  assert.equal((await gen("mr", {}, "zodiac")).status, 400, "no Marathi text yet: never fall back to English");
  assert.equal(synthCalls.length, 0, "ElevenLabs must not be called when validation fails");
});

test("English generation: exact approved text goes to ElevenLabs, MP3 goes to Cloudinary under a versioned id", { skip }, async () => {
  reset();
  const eng = lang(await admin("GET", "/tarot"), "en").narration;
  const r = await gen("en");
  assert.equal(r.status, 202);
  assert.equal(r.data.data.asset.status, "GENERATING");
  await settle();

  assert.equal(synthCalls.length, 1);
  assert.equal(synthCalls[0].text, eng.text, "the exact stored narration must be sent");
  assert.equal(synthCalls[0].voiceId, "enVoice00001");
  assert.equal(synthCalls[0].modelId, "eleven_multilingual_v2");
  assert.equal(uploadCalls.length, 1);
  assert.match(uploadCalls[0], /^mybhagya\/astrology\/tarot\/en\/v1-[a-z0-9]+$/);

  const a = lang(await admin("GET", "/tarot"), "en").assets[0];
  assert.equal(a.status, "READY");
  assert.equal(a.isPublished, false, "generating never publishes");
  assert.equal(a.provider, "elevenlabs");
  assert.equal(a.cloudinaryPublicId, uploadCalls[0]);
  assert.equal(a.durationSeconds, 12.5);
  assert.equal(a.contentVersion, 1);
});

test("Hindi and Marathi generation use their own saved text, voice and model", { skip }, async () => {
  reset();
  assert.equal((await admin("PUT", "/tarot/content", { language: "mr", text: MR_TEXT })).status, 200);
  assert.equal((await gen("hi")).status, 202);
  await settle();
  assert.equal((await gen("mr")).status, 202);
  await settle();
  assert.deepEqual(synthCalls.map((c) => [c.text, c.voiceId, c.modelId]), [
    [HI_TEXT, "hiVoice00001", "eleven_v3"],
    [MR_TEXT, "mrVoice00001", "eleven_v3"],
  ]);
  assert.match(uploadCalls[0], /\/tarot\/hi\/v1-/);
  assert.match(uploadCalls[1], /\/tarot\/mr\/v1-/);
});

test("identical text/voice/model is refused (409) but Regenerate makes a new take with a new public id", { skip }, async () => {
  reset();
  const dup = await gen("en");
  assert.equal(dup.status, 409);
  assert.match(dup.data.message, /Regenerate/);
  const re = await admin("POST", "/regenerate", { toolSlug: "tarot", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  assert.equal(re.status, 202);
  await settle();
  const assets = lang(await admin("GET", "/tarot"), "en").assets.filter((x: any) => x.status === "READY");
  assert.equal(assets.length, 2);
  assert.notEqual(assets[0].cloudinaryPublicId, assets[1].cloudinaryPublicId);
});

test("simultaneous generation for the same tool+language is blocked", { skip }, async () => {
  reset();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  synthImpl = async (i) => { await gate; return okSynth(i); };

  const first = await admin("POST", "/regenerate", { toolSlug: "tarot", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  assert.equal(first.status, 202);
  const second = await admin("POST", "/regenerate", { toolSlug: "tarot", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  assert.equal(second.status, 409);
  assert.match(second.data.message, /already being generated/);
  // a different language is independent
  const other = await gen("hi", { }, "tarot").then((r) => r.status);
  assert.ok(other === 409 /* identical hi audio exists */ || other === 202);
  const tools = await admin("GET", "/tools");
  assert.equal(tools.data.data.tools[0].languages.find((l: any) => l.code === "en").generating, true);

  release();
  await settle();
  assert.equal(synthCalls.filter((c) => c.voiceId === "enVoice00001").length, 1, "only one ElevenLabs call for the two requests");
});

test("concurrent identical requests never create two generations", { skip }, async () => {
  reset();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  synthImpl = async (i) => { await gate; return okSynth(i); };
  const body = { toolSlug: "zodiac", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" };
  const results = await Promise.all([admin("POST", "/generate", body), admin("POST", "/generate", body), admin("POST", "/generate", body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [202, 409, 409]);
  release();
  await settle();
  assert.equal(synthCalls.length, 1);
  assert.equal(await prisma.astrologyAudioAsset.count({ where: { toolSlug: "zodiac" } }), 1);
});

test("ElevenLabs failures are recorded on the asset with a safe message and can be retried", { skip }, async () => {
  reset();
  const cases: [any, RegExp][] = [
    [new ElevenLabsError("INSUFFICIENT_CREDITS", "ElevenLabs account has insufficient credits.", false), /insufficient credits/],
    [new ElevenLabsError("RATE_LIMITED", "ElevenLabs is rate limiting requests. Wait a minute and retry.", true), /rate limiting/],
    [new ElevenLabsError("TIMEOUT", "ElevenLabs took too long to respond. Retry.", true), /too long/],
  ];
  for (const [err, re] of cases) {
    synthImpl = async () => { throw err; };
    assert.equal((await admin("POST", "/regenerate", { toolSlug: "palm-reading", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" })).status, 202);
    await settle();
    const a = lang(await admin("GET", "/palm-reading"), "en").assets[0];
    assert.equal(a.status, "FAILED");
    assert.match(a.errorMessage, re);
    assert.equal(a.cloudinaryUrl, null);
    assert.ok(!JSON.stringify(a).includes("SECRET-KEY"));
  }
  // retry succeeds
  synthImpl = okSynth;
  assert.equal((await admin("POST", "/generate", { toolSlug: "palm-reading", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" })).status, 202);
  await settle();
  assert.equal(lang(await admin("GET", "/palm-reading"), "en").assets[0].status, "READY");
});

test("Cloudinary upload failure and bad upload results mark the asset FAILED", { skip }, async () => {
  reset();
  uploadImpl = async () => { throw new ApiError("Cloudinary rejected the credentials (401). Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.", 400); };
  await admin("POST", "/generate", { toolSlug: "birth-chart", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  await settle();
  let a = lang(await admin("GET", "/birth-chart"), "en").assets[0];
  assert.equal(a.status, "FAILED");
  assert.match(a.errorMessage, /Cloudinary rejected the credentials/);
  assert.equal(a.cloudinaryUrl, null);
  assert.equal((await admin("POST", "/publish", { assetId: a.id })).status, 409, "a failed asset can never be published");

  uploadImpl = async (_b, id) => ({ url: "http://insecure.example/x.mp3", publicId: id, durationSeconds: 1, bytes: 1 });
  await admin("POST", "/generate", { toolSlug: "birth-chart", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  await settle();
  a = lang(await admin("GET", "/birth-chart"), "en").assets[0];
  assert.equal(a.status, "FAILED");
  assert.match(a.errorMessage, /unusable upload/);
});

// ── Preview ────────────────────────────────────────────────────────────────

test("voice preview returns audio, is capped, validates, and stores nothing", { skip }, async () => {
  reset();
  const assetsBefore = await prisma.astrologyAudioAsset.count();
  const r = await admin("POST", "/preview", { toolSlug: "tarot", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "audio/mpeg");
  assert.ok(r.buf.length > 100);
  assert.ok(synthCalls[0].text.length <= 250);
  assert.equal(uploadCalls.length, 0, "preview must not upload");
  assert.equal(await prisma.astrologyAudioAsset.count(), assetsBefore, "preview must not create an asset");

  assert.equal((await admin("POST", "/preview", { language: "hi", voiceId: "hiVoice00001", modelId: "eleven_v3", text: "English text sent to a Hindi voice" })).status, 400);
  assert.equal((await admin("POST", "/preview", { language: "en", voiceId: "unknownvoice", modelId: "eleven_v3", text: "Hello there, this is a test." })).status, 400);
  const mid = await admin("POST", "/preview", { language: "hi", voiceId: "hiVoice00001", modelId: "eleven_v3", text: HI_TEXT });
  assert.equal(mid.status, 200);
});

// ── Publishing and public playback ─────────────────────────────────────────

test("public endpoint: nothing published → unavailable; never calls ElevenLabs", { skip }, async () => {
  reset();
  const r = await call("GET", "/api/astrology/tools/tarot/audio?language=en");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.data, { toolSlug: "tarot", language: "en", available: false });
  assert.equal((await call("GET", "/api/astrology/tools/nope/audio?language=en")).status, 404);
  assert.equal((await call("GET", "/api/astrology/tools/tarot/audio?language=xx")).status, 400);
  assert.equal(synthCalls.length, 0);
});

test("publish makes audio public (metadata only); a new publish keeps the old asset on record", { skip }, async () => {
  reset();
  const assets = lang(await admin("GET", "/tarot"), "en").assets.filter((x: any) => x.status === "READY");
  const [newer, older] = assets;
  const p1 = await admin("POST", "/publish", { assetId: older.id });
  assert.equal(p1.status, 200);

  const pub = await call("GET", "/api/astrology/tools/tarot/audio?language=en");
  assert.equal(pub.data.data.available, true);
  assert.equal(pub.data.data.url, older.cloudinaryUrl);
  assert.equal(pub.data.data.durationSeconds, 12.5);
  assert.deepEqual(Object.keys(pub.data.data).sort(), ["available", "durationSeconds", "language", "toolSlug", "url", "version"], "public payload is metadata only");
  const raw = JSON.stringify(pub.data);
  for (const leak of ["enVoice00001", "SECRET", "eleven_", "elevenlabs", "cloudinaryPublicId"]) assert.ok(!raw.includes(leak), `public response leaked ${leak}`);

  // Replace with the newer take: the older one is un-flagged, not deleted.
  assert.equal((await admin("POST", "/publish", { assetId: newer.id })).status, 200);
  const pub2 = await call("GET", "/api/astrology/tools/tarot/audio?language=en");
  assert.equal(pub2.data.data.url, newer.cloudinaryUrl);
  const rows = await prisma.astrologyAudioAsset.findMany({ where: { toolSlug: "tarot", language: "en", isPublished: true } });
  assert.equal(rows.length, 1);
  assert.ok(await prisma.astrologyAudioAsset.findUnique({ where: { id: older.id } }));
  assert.equal((await admin("POST", "/publish", { assetId: newer.id })).status, 200, "publishing twice is idempotent");
  assert.equal((await admin("POST", "/publish", { assetId: "does-not-exist" })).status, 404);
  assert.equal((await admin("POST", "/publish", {})).status, 400);
});

test("languages are independent: Hindi stays unavailable until its own audio is published", { skip }, async () => {
  const hi = await call("GET", "/api/astrology/tools/tarot/audio?language=hi");
  assert.equal(hi.data.data.available, false);
  const a = lang(await admin("GET", "/tarot"), "hi").assets.find((x: any) => x.status === "READY");
  await admin("POST", "/publish", { assetId: a.id });
  const hi2 = await call("GET", "/api/astrology/tools/tarot/audio?language=hi");
  assert.equal(hi2.data.data.available, true);
  assert.notEqual(hi2.data.data.url, (await call("GET", "/api/astrology/tools/tarot/audio?language=en")).data.data.url);
});

// ── Content versioning ─────────────────────────────────────────────────────

test("changing the narration bumps the version, outdates old audio, keeps published audio live, and blocks re-publishing it", { skip }, async () => {
  reset();
  const before = lang(await admin("GET", "/tarot"), "en");
  const publishedBefore = before.published;
  const unpublishedReady = before.assets.find((x: any) => x.status === "READY" && !x.isPublished);
  assert.ok(publishedBefore && unpublishedReady);

  const same = await admin("PUT", "/tarot/content", { language: "en", text: before.narration.text + "\r\n" });
  assert.equal(same.data.data.narration.version, 1, "whitespace-only edits do not change the version");
  assert.equal((await prisma.astrologyAudioAsset.findUnique({ where: { id: unpublishedReady.id } })).status, "READY");

  const edited = before.narration.text + " This line was added by an admin.";
  const r = await admin("PUT", "/tarot/content", { language: "en", text: edited });
  assert.equal(r.data.data.narration.version, 2);
  assert.notEqual(r.data.data.narration.contentHash, before.narration.contentHash);

  const old = await prisma.astrologyAudioAsset.findUnique({ where: { id: unpublishedReady.id } });
  assert.equal(old.status, "OUTDATED");
  const stillLive = await call("GET", "/api/astrology/tools/tarot/audio?language=en");
  assert.equal(stillLive.data.data.available, true, "published audio stays live until a replacement is approved");
  assert.equal(stillLive.data.data.url, publishedBefore.cloudinaryUrl);

  const blocked = await admin("POST", "/publish", { assetId: unpublishedReady.id });
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /Generate new audio/);

  // New generation uses the new text and the v2 public id, and publishing it replaces the old one.
  assert.equal((await gen("en")).status, 202);
  await settle();
  assert.equal(synthCalls[0].text, edited.trim());
  assert.match(uploadCalls[0], /\/tarot\/en\/v2-/);
  const fresh = lang(await admin("GET", "/tarot"), "en").assets[0];
  assert.equal(fresh.status, "READY");
  assert.equal(fresh.contentVersion, 2);
  assert.equal((await admin("POST", "/publish", { assetId: fresh.id })).status, 200);
  assert.equal((await call("GET", "/api/astrology/tools/tarot/audio?language=en")).data.data.url, fresh.cloudinaryUrl);
});

test("text edited while audio is being generated yields OUTDATED audio that cannot be published", { skip }, async () => {
  reset();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  synthImpl = async (i) => { await gate; return okSynth(i); };
  const cur = lang(await admin("GET", "/compatibility"), "en").narration.text;
  assert.equal((await admin("POST", "/generate", { toolSlug: "compatibility", language: "en", voiceId: "enVoice00001", modelId: "eleven_multilingual_v2" })).status, 202);
  assert.equal((await admin("PUT", "/compatibility/content", { language: "en", text: cur + " Edited mid-flight." })).status, 200);
  release();
  await settle();
  const a = lang(await admin("GET", "/compatibility"), "en").assets[0];
  assert.equal(a.status, "OUTDATED");
  assert.equal((await admin("POST", "/publish", { assetId: a.id })).status, 409);
});

test("changing the voice or model allows regeneration without touching the published asset", { skip }, async () => {
  reset();
  const published = lang(await admin("GET", "/tarot"), "en").published;
  await admin("PUT", "/config/voices", { languageCode: "en", voiceName: "Second English", voiceId: "enVoice00002", modelId: "eleven_turbo_v2_5" });
  const r = await admin("POST", "/generate", { toolSlug: "tarot", language: "en", voiceId: "enVoice00002", modelId: "eleven_turbo_v2_5" });
  assert.equal(r.status, 202);
  await settle();
  assert.equal(synthCalls[0].voiceId, "enVoice00002");
  assert.equal((await prisma.astrologyAudioAsset.findUnique({ where: { id: published.id } })).isPublished, true);
  // deactivated voices can't be used
  await admin("PUT", "/config/voices", { languageCode: "en", voiceName: "Second English", voiceId: "enVoice00002", modelId: "eleven_turbo_v2_5", isActive: false });
  assert.equal((await admin("POST", "/regenerate", { toolSlug: "tarot", language: "en", voiceId: "enVoice00002", modelId: "eleven_turbo_v2_5" })).status, 400);
});

// ── Generate all missing ───────────────────────────────────────────────────

test("generate-missing needs confirmation, then generates only languages that have text and no current audio", { skip }, async () => {
  reset();
  const noConfirm = await admin("POST", "/generate-missing", { toolSlug: "zodiac" });
  assert.equal(noConfirm.status, 400);
  assert.equal(synthCalls.length, 0);

  // zodiac: English audio exists already (from the concurrency test); no Hindi/Marathi text yet.
  assert.equal((await admin("PUT", "/zodiac/content", { language: "hi", text: HI_TEXT })).status, 200);
  const r = await admin("POST", "/generate-missing", { toolSlug: "zodiac", confirm: true });
  assert.equal(r.status, 202);
  assert.deepEqual(r.data.data.queued.map((q: any) => q.language), ["hi"]);
  const skipped = Object.fromEntries(r.data.data.skipped.map((s: any) => [s.language, s.reason]));
  assert.match(skipped.en, /already generated/);
  assert.match(skipped.mr, /No translation/);
  await settle();
  assert.equal(synthCalls.length, 1);
  assert.equal(synthCalls[0].text, HI_TEXT);
  assert.equal(synthCalls[0].voiceId, "hiVoice00001");
  assert.equal((await admin("POST", "/generate-missing", { toolSlug: "nope", confirm: true })).status, 404);
});

// ── Audit and secrets ──────────────────────────────────────────────────────

test("admin actions are audited without secrets", { skip }, async () => {
  const rows = await prisma.adminAuditLog.findMany({ where: { action: { startsWith: "astrology_audio." } } });
  const actions = new Set(rows.map((r: any) => r.action));
  for (const a of ["astrology_audio.voice.save", "astrology_audio.generate", "astrology_audio.regenerate", "astrology_audio.publish", "astrology_audio.content.save", "astrology_audio.generate_missing"]) {
    assert.ok(actions.has(a), `missing audit action ${a}`);
  }
  assert.ok(!JSON.stringify(rows).includes("SECRET-KEY"));
});
