// Test-only preload for the end-to-end AI pipeline test. It runs inside the REAL server process (src/index.ts) BEFORE
// the app loads and replaces the network for AI provider hosts, so no real provider is ever contacted and no key is
// used. Behaviour is switched per request through a small JSON file (STUB_MODE_FILE); every provider call appends one
// line (host only) to STUB_CALLS_FILE so the test can count real provider calls.
//
// Modes: ok | nousage | nocost | error  -> answered in-process.
//        network       -> answered by a REAL local HTTP server over a real socket: 300 ms latency, chunked transfer,
//                         gzip-compressed JSON split across chunks (what a real provider connection looks like).
//        network-ws    -> real socket, a leading run of blank lines (keep-alive padding) before the JSON, split in two chunks.
import fs from "node:fs";
import http from "node:http";
import zlib from "node:zlib";

const HOSTS = /openrouter\.ai|api\.groq\.com|api\.sarvam\.ai|generativelanguage\.googleapis\.com/;
const mode = () => {
  try { return JSON.parse(fs.readFileSync(process.env.STUB_MODE_FILE, "utf8")).mode ?? "ok"; } catch { return "ok"; }
};
const count = (host) => { try { fs.appendFileSync(process.env.STUB_CALLS_FILE, host + "\n"); } catch { /* ignore */ } };

// OpenRouter's public model list (used only as a price source for the "tokens but no cost" fallback).
const MODELS = { data: [{ id: "stub/openrouter-model", pricing: { prompt: "0.000001", completion: "0.000002" } }, { id: "stub/free-model:free", pricing: { prompt: "0", completion: "0" } }] };

function answer(url) {
  const m = mode();
  const host = new URL(url).hostname;
  if (/\/models(\?|$)/.test(url)) return { status: 200, body: MODELS };
  count(host);
  if (m === "error") return { status: 500, body: { error: { message: "stub provider failure" } } };
  if (/sarvam/.test(host)) return { status: 200, body: { audios: ["AAAA"] } };
  // A test can make the provider "say" something feature-valid by writing { "content": "..." } to STUB_CONTENT_FILE.
  let content = JSON.stringify({ ok: true });
  try { const c = JSON.parse(fs.readFileSync(process.env.STUB_CONTENT_FILE, "utf8")).content; if (typeof c === "string") content = c; } catch { /* default */ }
  if (/openrouter/.test(host)) {
    // Shaped like OpenRouter's documented response: usage always present, with cost and details.
    const usage = m === "nousage" ? undefined : {
      prompt_tokens: 120, completion_tokens: 80, total_tokens: 200,
      ...(m === "nocost" ? {} : { cost: 0.00042, is_byok: false, cost_details: { upstream_inference_cost: null }, prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 0 } }),
    };
    return { status: 200, body: { id: "gen-stub", provider: "StubProvider", model: "stub/openrouter-model", object: "chat.completion", choices: [{ message: { content } }], ...(usage ? { usage } : {}) } };
  }
  const usage = m === "nousage" ? undefined : { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
  return { status: 200, body: { model: "stub-groq-model", choices: [{ message: { content } }], ...(usage ? { usage } : {}) } };
}

// ── real-socket provider ──
let local;
const localServer = () => new Promise((resolve) => {
  if (local) return resolve(local);
  const s = http.createServer((req, res) => {
    req.resume();
    req.on("end", async () => {
      const m = mode();
      const r = answer("https://" + req.url.slice(1)); // path is "/<host>/<path>"
      const json = JSON.stringify(r.body);
      await new Promise((ok) => setTimeout(ok, 300));
      if (m === "network-ws") {
        res.writeHead(r.status, { "Content-Type": "application/json" });
        res.write("\n\n\n\n");
        await new Promise((ok) => setTimeout(ok, 150));
        res.write(json.slice(0, 40));
        await new Promise((ok) => setTimeout(ok, 100));
        res.end(json.slice(40));
      } else {
        const gz = zlib.gzipSync(Buffer.from(json));
        res.writeHead(r.status, { "Content-Type": "application/json", "Content-Encoding": "gzip" });
        const third = Math.ceil(gz.length / 3);
        res.write(gz.subarray(0, third));
        await new Promise((ok) => setTimeout(ok, 120));
        res.write(gz.subarray(third, third * 2));
        await new Promise((ok) => setTimeout(ok, 120));
        res.end(gz.subarray(third * 2));
      }
    });
  });
  s.listen(0, "127.0.0.1", () => { local = s; resolve(s); });
});
const viaSocket = async (url) => { const s = await localServer(); const u = new URL(url); return `http://127.0.0.1:${s.address().port}/${u.hostname}${u.pathname}${u.search}`; };
const isNetwork = () => mode().startsWith("network");

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (HOSTS.test(url)) {
    if (isNetwork() && !/\/models(\?|$)/.test(url)) return realFetch(await viaSocket(url), init);
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
    if (isNetwork()) {
      // Real socket + real axios http adapter. The ORIGINAL config is put back on the result so the app's interceptors
      // see the provider URL exactly as they do in production (only the transport is local).
      try {
        const resp = await realAdapter({ ...config, baseURL: undefined, url: await viaSocket(url) });
        resp.config = config;
        return resp;
      } catch (e) {
        if (e && typeof e === "object") { e.config = config; if (e.response) e.response.config = config; }
        throw e;
      }
    }
    const r = answer(url);
    const response = { data: r.body, status: r.status, statusText: String(r.status), headers: {}, config };
    if (r.status >= 400) throw Object.assign(new Error("Request failed with status code " + r.status), { config, response, isAxiosError: true });
    return response;
  }
  return realAdapter(config);
};
