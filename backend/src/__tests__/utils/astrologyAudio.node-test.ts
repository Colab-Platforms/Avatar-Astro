// Run with: npm run test:astro-audio-unit   (no database or network needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_TOOLS,
  contentHash,
  isMp3,
  looksLikeDevanagari,
  modelSupportsLanguage,
} from "../../modules/astrologyAudio/astrologyAudio.config.js";
import { ENGLISH_SEED, seedNarrationText } from "../../modules/astrologyAudio/astrologyAudio.seed.js";
import { ElevenLabsError, synthesizeSpeech, verifyVoice } from "../../modules/astrologyAudio/elevenlabs.js";

const FRONTEND_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "frontend", "src");

/** Every double-quoted string literal in a TS/TSX file, decoded. */
function stringLiterals(file: string): Set<string> {
  const src = fs.readFileSync(path.join(FRONTEND_SRC, file), "utf8");
  const out = new Set<string>();
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
    try { out.add(JSON.parse(`"${m[1]}"`)); } catch { /* not a plain string */ }
  }
  return out;
}

test("seeded English narration is verbatim the About section shown on each tool page", () => {
  for (const tool of AUDIO_TOOLS) {
    const e = ENGLISH_SEED[tool.slug];
    const lits = stringLiterals(e.source);
    assert.ok(lits.has(e.title), `${tool.slug}: title "${e.title}" not found in ${e.source}`);
    assert.ok(lits.has(e.heading), `${tool.slug}: heading "${e.heading}" not found in ${e.source}`);
    for (const p of e.paragraphs) assert.ok(lits.has(p), `${tool.slug}: paragraph drifted from ${e.source}: ${p.slice(0, 60)}…`);
    assert.ok(seedNarrationText(e).includes(e.paragraphs[0]));
  }
});

test("every audio tool has seed content and Ratna Jyotish is excluded (it has no About section)", () => {
  assert.equal(AUDIO_TOOLS.length, 6);
  assert.ok(!AUDIO_TOOLS.some((t) => (t.slug as string) === "ratna-jyotish"));
});

test("model/language compatibility", () => {
  assert.equal(modelSupportsLanguage("eleven_v3", "mr"), true);
  assert.equal(modelSupportsLanguage("eleven_multilingual_v2", "mr"), false);
  assert.equal(modelSupportsLanguage("eleven_turbo_v2", "hi"), false);
  assert.equal(modelSupportsLanguage("eleven_turbo_v2", "en"), true);
  assert.equal(modelSupportsLanguage("not_a_model", "en"), false);
});

test("Devanagari guard stops English being treated as Hindi/Marathi", () => {
  assert.equal(looksLikeDevanagari("Tarot is a deck of illustrated cards."), false);
  assert.equal(looksLikeDevanagari("टैरो चित्रित पत्तों का एक समूह है जिसका उपयोग चिंतन के लिए किया जाता है।"), true);
  assert.equal(looksLikeDevanagari("1234 !!!"), false);
});

test("content hash is stable across whitespace/line endings and changes with the words or language", () => {
  const a = contentHash("en", "Hello world, this is narration.");
  assert.equal(a, contentHash("en", "  Hello world, this is narration.\r\n"));
  assert.notEqual(a, contentHash("en", "Hello world, this is narration!"));
  assert.notEqual(a, contentHash("hi", "Hello world, this is narration."));
});

test("MP3 validation", () => {
  const id3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(200)]);
  const frame = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(200)]);
  assert.equal(isMp3(id3), true);
  assert.equal(isMp3(frame), true);
  assert.equal(isMp3(Buffer.from('{"detail":"nope"}'.padEnd(200, " "))), false);
  assert.equal(isMp3(Buffer.alloc(10)), false);
});

// ── ElevenLabs client (global fetch mocked) ────────────────────────────────

const KEY = "xi-SECRET-KEY-DO-NOT-LEAK";
const realFetch = globalThis.fetch;
const mp3 = () => Buffer.concat([Buffer.from("ID3"), Buffer.alloc(300, 1)]);
const jsonRes = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function withFetch<T>(impl: (url: string, init: any) => Promise<Response>, fn: () => Promise<T>): Promise<T> {
  process.env.ELEVENLABS_API_KEY = KEY;
  globalThis.fetch = ((url: any, init: any) => impl(String(url), init)) as typeof fetch;
  try { return await fn(); } finally { globalThis.fetch = realFetch; }
}
const expectErr = async (p: Promise<unknown>, code: string) => {
  await assert.rejects(p, (e: any) => {
    assert.ok(e instanceof ElevenLabsError, String(e));
    assert.equal(e.code, code);
    assert.ok(!e.message.includes(KEY), "error message must never contain the API key");
    return true;
  });
};

test("ElevenLabs: success posts text/model to the official endpoint with the key in a header only", async () => {
  let seen: any;
  const buf = await withFetch(async (url, init) => { seen = { url, init }; return new Response(mp3(), { status: 200 }); },
    () => synthesizeSpeech({ text: "नमस्ते दुनिया", voiceId: "voice12345", modelId: "eleven_v3" }));
  assert.ok(isMp3(buf));
  assert.ok(seen.url.startsWith("https://api.elevenlabs.io/v1/text-to-speech/voice12345"));
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["xi-api-key"], KEY);
  assert.deepEqual(JSON.parse(seen.init.body), { text: "नमस्ते दुनिया", model_id: "eleven_v3" });
  assert.ok(!seen.url.includes(KEY) && !seen.init.body.includes(KEY));
});

test("ElevenLabs: error mapping (credits, rate limit, auth, bad voice, invalid request, outage, bad audio)", async () => {
  const run = (status: number, body: unknown) => withFetch(async () => jsonRes(status, body), () => synthesizeSpeech({ text: "hello hello hello", voiceId: "voice12345", modelId: "eleven_v3" }));
  await expectErr(run(401, { detail: { status: "quota_exceeded", message: "You have 0 credits remaining" } }), "INSUFFICIENT_CREDITS");
  await expectErr(run(402, { detail: "payment required" }), "INSUFFICIENT_CREDITS");
  await expectErr(run(429, { detail: { status: "too_many_concurrent_requests" } }), "RATE_LIMITED");
  await expectErr(run(401, { detail: { status: "invalid_api_key", message: "bad key" } }), "AUTH");
  await expectErr(run(404, { detail: { status: "voice_not_found" } }), "VOICE_NOT_FOUND");
  await expectErr(run(422, { detail: [{ msg: "text too long" }] }), "INVALID_REQUEST");
  await expectErr(run(503, {}), "UNAVAILABLE");
  await expectErr(withFetch(async () => new Response("{\"not\":\"audio\"}".padEnd(300, " "), { status: 200 }),
    () => synthesizeSpeech({ text: "hello hello hello", voiceId: "voice12345", modelId: "eleven_v3" })), "BAD_AUDIO");
  assert.equal((await run(429, {}).catch((e) => e)).retryable, true);
  assert.equal((await run(401, { detail: { status: "quota_exceeded" } }).catch((e) => e)).retryable, false);
});

test("ElevenLabs: timeouts, network failure and missing key", async () => {
  await expectErr(withFetch(async () => { const e: any = new Error("aborted"); e.name = "AbortError"; throw e; },
    () => synthesizeSpeech({ text: "hello hello hello", voiceId: "voice12345", modelId: "eleven_v3" })), "TIMEOUT");
  await expectErr(withFetch(async () => { throw new TypeError("fetch failed"); },
    () => synthesizeSpeech({ text: "hello hello hello", voiceId: "voice12345", modelId: "eleven_v3" })), "UNAVAILABLE");
  const saved = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try { await expectErr(synthesizeSpeech({ text: "hello hello hello", voiceId: "voice12345", modelId: "eleven_v3" }), "NOT_CONFIGURED"); }
  finally { if (saved) process.env.ELEVENLABS_API_KEY = saved; }
});

test("ElevenLabs: voice verification rejects an unknown voice id", async () => {
  await expectErr(withFetch(async () => jsonRes(404, { detail: { status: "voice_not_found" } }), () => verifyVoice("nosuchvoice1")), "VOICE_NOT_FOUND");
  await withFetch(async () => jsonRes(200, { voice_id: "ok" }), () => verifyVoice("goodvoice12"));
});
