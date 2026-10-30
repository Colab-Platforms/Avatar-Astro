// Test-only preload for the end-to-end AI pipeline test. It runs inside the REAL server process (src/index.ts) BEFORE
// the app loads and replaces the network for AI provider hosts, so no real provider is ever contacted and no key is
// used. Behaviour is switched per request through a small JSON file (STUB_MODE_FILE); every provider call appends one
// line (host only) to STUB_CALLS_FILE so the test can count real provider calls.
import fs from "node:fs";

const HOSTS = /openrouter\.ai|api\.groq\.com|api\.sarvam\.ai|generativelanguage\.googleapis\.com/;
const mode = () => {
  try { return JSON.parse(fs.readFileSync(process.env.STUB_MODE_FILE, "utf8")).mode ?? "ok"; } catch { return "ok"; }
};
const count = (host) => { try { fs.appendFileSync(process.env.STUB_CALLS_FILE, host + "\n"); } catch { /* ignore */ } };

function answer(url) {
  const m = mode();
  const host = new URL(url).hostname;
  count(host);
  if (m === "error") return { status: 500, body: { error: { message: "stub provider failure" } } };
  if (/sarvam/.test(host)) return { status: 200, body: { audios: ["AAAA"] } };
  const content = JSON.stringify({ ok: true });
  if (/openrouter/.test(host)) {
    const usage = m === "nousage" ? undefined : { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200, ...(m === "nocost" ? {} : { cost: 0.00042 }) };
    return { status: 200, body: { model: "stub/openrouter-model", choices: [{ message: { content } }], ...(usage ? { usage } : {}) } };
  }
  const usage = m === "nousage" ? undefined : { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
  return { status: 200, body: { model: "stub-groq-model", choices: [{ message: { content } }], ...(usage ? { usage } : {}) } };
}

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (HOSTS.test(url)) {
    const r = answer(url);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  }
  return realFetch(input, init);
};

// axios (default instance): stub through the adapter so request/response interceptors still run, exactly as in production.
const { default: axios } = await import("axios");
const realAdapter = axios.getAdapter(axios.defaults.adapter);
axios.defaults.adapter = async (config) => {
  const url = (config.baseURL ?? "") + config.url;
  if (HOSTS.test(url)) {
    const r = answer(url);
    const response = { data: r.body, status: r.status, statusText: String(r.status), headers: {}, config };
    if (r.status >= 400) throw Object.assign(new Error("Request failed with status code " + r.status), { config, response, isAxiosError: true });
    return response;
  }
  return realAdapter(config);
};
