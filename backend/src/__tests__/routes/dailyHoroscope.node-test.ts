// Run with: TEST_DATABASE_URL=postgresql://...localhost... npm run test:horoscope
//
// END-TO-END proof, through the REAL server and a real local database, of the daily horoscope rules: one stored reading per
// sign per Asia/Kolkata day, the same text on every refresh, a new reading on a new day, a clear "unavailable" (never
// invented text) when the provider fails, and validation of the sign. The AI provider is stubbed at the network layer.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const TEST_DB = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(127\.0\.0\.1|localhost)(:|\/)/.test(TEST_DB);
const skip = !isLocal ? "set TEST_DATABASE_URL to a disposable localhost Postgres to run" : false;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "../../..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "horoscope-"));
const MODE_FILE = path.join(TMP, "mode.json");
const CALLS_FILE = path.join(TMP, "calls.txt");
const CONTENT_FILE = path.join(TMP, "content.json");

let child: ChildProcess | undefined;
let base = "";
let log = "";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise<number>((res) => { const s = createServer().listen(0, () => { const p = (s.address() as any).port; s.close(() => res(p)); }); });
const setMode = (mode: string) => fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }));
const says = (o: unknown) => fs.writeFileSync(CONTENT_FILE, JSON.stringify({ content: JSON.stringify(o) }));
const providerCalls = () => (fs.existsSync(CALLS_FILE) ? fs.readFileSync(CALLS_FILE, "utf8").split("\n").filter(Boolean).length : 0);
const reading = (tag: string) => ({ overview: `Overview ${tag}`, career: `Career ${tag}`, love: `Love ${tag}`, health: `Health ${tag}`, mood: `Mood ${tag}`, opportunities: `Opportunities ${tag}`, mindful: `Mindful ${tag}`, guidance: `Guidance ${tag}` });
const get = async (sign: string) => {
  const res = await fetch(`${base}/api/interpretation/horoscope/${sign}`);
  return { status: res.status, headers: res.headers, body: (await res.json().catch(() => null)) as any };
};
async function sql(text: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: TEST_DB });
  await c.connect();
  try { return await c.query(text, params); } finally { await c.end(); }
}
const istToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const istWeekday = () => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date());

before(async () => {
  if (skip) return;
  await sql("DELETE FROM daily_horoscopes");
  setMode("ok");
  says(reading("A"));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const preload = pathToFileURL(path.join(HERE, "../helpers/providerStubPreload.mjs")).href;
  child = spawn(process.execPath, ["--import", "tsx", "--import", preload, "src/index.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env, PORT: String(port), NODE_ENV: "development", DATABASE_URL: TEST_DB, DB_POOL_MAX: "1", JWT_SECRET: "horoscope-test-only-secret-0123456789abcdef",
      STUB_MODE_FILE: MODE_FILE, STUB_CALLS_FILE: CALLS_FILE, STUB_CONTENT_FILE: CONTENT_FILE,
      OPENROUTER_API_KEY: "fake-horoscope-key", GROQ_API_KEY: "fake-horoscope-key", SARVAM_API_KEY: "fake-horoscope-key",
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
  await sql("DELETE FROM daily_horoscopes");
  fs.rmSync(TMP, { recursive: true, force: true });
});

test("today's date and weekday are the Asia/Kolkata ones, and the reading has every section", { skip }, async () => {
  const r = await get("aries");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const d = r.body.data;
  assert.equal(d.date, istToday());
  assert.equal(d.weekday, istWeekday());
  assert.equal(d.timezone, "Asia/Kolkata");
  assert.equal(d.system, "western-tropical-sun-sign");
  for (const k of ["overview", "career", "love", "health", "mood", "opportunities", "mindful", "guidance"]) assert.ok(d.sections[k], k);
  assert.equal(d.sections.lucky, undefined, "no lucky details are shown when the provider gave none");
  assert.match(d.horoscope, /Today's Overview/);
});

test("the same sign on the same day never changes, however many refreshes and whatever the provider says later", { skip }, async () => {
  const first = await get("taurus");
  const calls = providerCalls();
  says(reading("DIFFERENT")); // a regenerated reading would now differ
  const results = await Promise.all([get("taurus"), get("taurus"), get("taurus")]);
  for (const r of results) assert.deepEqual(r.body.data.sections, first.body.data.sections);
  assert.equal(providerCalls(), calls, "no further provider call for a stored day");
  assert.equal((await sql("SELECT count(*)::int n FROM daily_horoscopes WHERE sign='taurus'")).rows[0].n, 1);
  says(reading("A"));
});

test("concurrent first requests share one generation and one stored row", { skip }, async () => {
  says(reading("GEM"));
  const before = providerCalls();
  const rs = await Promise.all([get("gemini"), get("gemini"), get("gemini"), get("gemini")]);
  assert.ok(rs.every((r) => r.status === 200 && r.body.data.sections.overview === "Overview GEM"));
  assert.equal(providerCalls() - before, 1, "one provider call for four simultaneous requests");
  assert.equal((await sql("SELECT count(*)::int n FROM daily_horoscopes WHERE sign='gemini'")).rows[0].n, 1);
});

test("different signs get their own readings", { skip }, async () => {
  says(reading("CANCER"));
  const c = await get("cancer");
  says(reading("LEO"));
  const l = await get("leo");
  assert.equal(c.body.data.sections.overview, "Overview CANCER");
  assert.equal(l.body.data.sections.overview, "Overview LEO");
  assert.equal(c.body.data.sign, "cancer");
});

test("a new calendar day gets a new reading and the old day's reading is kept", { skip }, async () => {
  const before = await get("virgo");
  assert.equal(before.body.data.sections.overview, "Overview LEO"); // generated on first request today
  // Move that stored reading to yesterday: for the server, today has no reading for virgo yet.
  await sql("UPDATE daily_horoscopes SET horoscope_date = horoscope_date - interval '1 day' WHERE sign = 'virgo'");
  says(reading("TOMORROW"));
  const after = await get("virgo");
  assert.equal(after.body.data.sections.overview, "Overview TOMORROW");
  assert.equal(after.body.data.date, istToday());
  assert.equal((await sql("SELECT count(*)::int n FROM daily_horoscopes WHERE sign='virgo'")).rows[0].n, 2);
});

test("lucky details appear only when the provider supplied them", { skip }, async () => {
  says({ ...reading("LIB"), lucky: { color: "Green", number: 7 } });
  const r = await get("libra");
  assert.deepEqual(r.body.data.sections.lucky, { color: "Green", number: "7" });
});

test("provider failure or an incomplete reading shows unavailable, stores nothing and invents nothing", { skip }, async () => {
  setMode("error");
  const down = await get("scorpio");
  assert.equal(down.status, 503);
  assert.equal(down.body.code, "HOROSCOPE_UNAVAILABLE");
  assert.equal(down.body.data, undefined);
  setMode("ok");
  says({ overview: "only one field" });
  const partial = await get("scorpio");
  assert.equal(partial.status, 503);
  says("not json at all");
  assert.equal((await get("scorpio")).status, 503);
  assert.equal((await sql("SELECT count(*)::int n FROM daily_horoscopes WHERE sign='scorpio'")).rows[0].n, 0);
  says(reading("RECOVERED"));
  const ok = await get("scorpio");
  assert.equal(ok.status, 200, "recovers on the next request once the provider is back");
  assert.equal(ok.body.data.sections.overview, "Overview RECOVERED");
});

test("unknown signs are rejected before the provider is called", { skip }, async () => {
  const before = providerCalls();
  for (const bad of ["ophiuchus", "ARIES%20ignore%20previous", "1", "%3Cscript%3E"]) assert.equal((await get(bad)).status, 400, bad);
  assert.equal(providerCalls(), before);
  assert.equal((await get("Sagittarius")).status, 200, "case-insensitive");
});
