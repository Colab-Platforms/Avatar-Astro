import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

/** Runs public/sw.js against a fake worker scope and returns its event handlers plus the fakes. */
function loadWorker() {
  const handlers: Record<string, (e: Record<string, unknown>) => void> = {};
  const store = new Map<string, Map<string, Response>>();
  const open = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name)!;
    return Promise.resolve({
      addAll: async (urls: string[]) => { for (const u of urls) m.set(new URL(u, "https://bhagya.test").href, new Response("x")); },
      put: async (req: Request, res: Response) => { m.set(req.url, res); },
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (r: { url: string }) => m.delete(r.url),
    });
  };
  const caches = {
    open,
    keys: async () => [...store.keys()],
    delete: async (k: string) => store.delete(k),
    match: async (req: Request | string) => {
      const url = typeof req === "string" ? new URL(req, "https://bhagya.test").href : req.url;
      for (const m of store.values()) if (m.has(url)) return m.get(url)!.clone();
      return undefined;
    },
  };
  // A same-origin response inside a real worker has type "basic".
  const basic = (body: string, status = 200) => Object.defineProperty(new Response(body, { status }), "type", { value: "basic" });
  const fetchMock = vi.fn(async (_req: Request) => basic("net"));
  const self = {
    location: { origin: "https://bhagya.test" },
    addEventListener: (t: string, h: (e: Record<string, unknown>) => void) => { handlers[t] = h; },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  vm.runInNewContext(read("public/sw.js"), { self, caches, fetch: fetchMock, Response, URL });
  return { handlers, store, fetchMock, self };
}

/** Sends a request through the worker's fetch handler; returns what it answered with, or "passthrough" if it did not respond. */
async function send(w: ReturnType<typeof loadWorker>, url: string, init: { method?: string; mode?: string; headers?: Record<string, string> } = {}) {
  // A plain stub: jsdom's Headers drops "range" (a forbidden request header), whereas a real browser shows it to the worker.
  const lower = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const headers = { has: (k: string) => k.toLowerCase() in lower, get: (k: string) => lower[k.toLowerCase()] ?? null };
  const request = { url: new URL(url, "https://bhagya.test").href, method: init.method ?? "GET", mode: init.mode ?? "cors", headers } as unknown as Request;
  let answered: Promise<Response> | undefined;
  w.handlers.fetch({ request, respondWith: (p: Promise<Response>) => { answered = p; } });
  return answered ? await answered : "passthrough";
}

describe("service worker", () => {
  let w: ReturnType<typeof loadWorker>;
  beforeEach(async () => {
    w = loadWorker();
    await new Promise<void>((resolve) => w.handlers.install({ waitUntil: (p: Promise<unknown>) => p.then(() => resolve()) }));
  });

  it("precaches the offline page and icons on install, then takes over", () => {
    expect([...w.store.get("bhagya-static-v1")!.keys()].map((u) => new URL(u).pathname).sort()).toEqual(
      ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest", "/offline.html"]);
    expect(w.self.skipWaiting).toHaveBeenCalled();
  });

  it("removes older Bhagya caches on activate, and nothing else", async () => {
    w.store.set("bhagya-static-v0", new Map());
    w.store.set("someone-elses-cache", new Map());
    await new Promise<void>((resolve) => w.handlers.activate({ waitUntil: (p: Promise<unknown>) => p.then(() => resolve()) }));
    expect([...w.store.keys()].sort()).toEqual(["bhagya-static-v1", "someone-elses-cache"]);
    expect(w.self.clients.claim).toHaveBeenCalled();
  });

  it("pages always come from the network and are never stored", async () => {
    const res = (await send(w, "/dashboard", { mode: "navigate" })) as Response;
    expect(await res.text()).toBe("net");
    expect([...w.store.get("bhagya-static-v1")!.keys()].some((u) => u.endsWith("/dashboard"))).toBe(false);
  });

  it("a page opened while offline shows the offline page", async () => {
    w.fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const res = (await send(w, "/dashboard", { mode: "navigate" })) as Response;
    expect(res.ok).toBe(true);
    expect(await res.text()).toBe("x"); // the precached offline page
  });

  it("fingerprinted build files are cached on first use and then served from the cache", async () => {
    await send(w, "/assets/index-abc123.js");
    expect(w.fetchMock).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    const again = (await send(w, "/assets/index-abc123.js")) as Response;
    expect(await again.text()).toBe("net");
    expect(w.fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["API calls", "/api/horoscope/weekly/leo", {}],
    ["other websites", "https://example.com/assets/x.js", {}],
    ["non-GET requests", "/assets/x.js", { method: "POST" }],
    ["signed-in (Authorization) requests", "/assets/x.js", { headers: { authorization: "Bearer t" } }],
    ["range requests (audio/video)", "/assets/x.mp3", { headers: { range: "bytes=0-1" } }],
    ["large public media and everything else", "/saturn.jpg", {}],
  ])("does not touch %s", async (_n, url, init) => {
    expect(await send(w, url as string, init as never)).toBe("passthrough");
    expect(w.fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the cache bounded: the oldest build files are dropped, the newest and the precached files stay", async () => {
    for (let i = 0; i < 130; i++) {
      await send(w, `/assets/chunk-${i}.js`);
      await new Promise((r) => setTimeout(r, 0));
    }
    const paths = [...w.store.get("bhagya-static-v1")!.keys()].map((u) => new URL(u).pathname);
    expect(paths.filter((p) => p.startsWith("/assets/"))).toHaveLength(120);
    expect(paths).not.toContain("/assets/chunk-0.js");
    expect(paths).toContain("/assets/chunk-129.js");
    expect(paths).toEqual(expect.arrayContaining(["/offline.html", "/icons/icon-192.png"]));
  });

  it("does not cache a failed response", async () => {
    w.fetchMock.mockResolvedValueOnce(Object.defineProperty(new Response("nope", { status: 404 }), "type", { value: "basic" }));
    await send(w, "/assets/missing.js");
    await new Promise((r) => setTimeout(r, 0));
    expect([...w.store.get("bhagya-static-v1")!.keys()].some((u) => u.endsWith("missing.js"))).toBe(false);
  });
});

describe("manifest and page wiring", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));

  it("is installable: name, standalone display, start URL in scope, 192 and 512 icons plus a maskable one", () => {
    expect(manifest.name).toBe("Bhagya Astro");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  });

  it("every icon file exists and is a PNG of the declared size", () => {
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const b = fs.readFileSync(path.join(root, "public", icon.src));
      expect(b.subarray(1, 4).toString()).toBe("PNG");
      expect(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it("index.html links the manifest, theme colour and Apple icon", () => {
    const html = read("index.html");
    expect(html).toMatch(/rel="manifest" href="\/manifest\.webmanifest"/);
    expect(html).toMatch(/name="theme-color" content="#803003"/);
    expect(html).toMatch(/rel="apple-touch-icon"/);
  });

  it("the host serves the worker uncached", () => {
    const rule = JSON.parse(read("vercel.json")).headers.find((h: { source: string }) => h.source === "/sw.js");
    expect(rule.headers).toEqual(expect.arrayContaining([expect.objectContaining({ key: "Cache-Control", value: expect.stringContaining("no-cache") })]));
  });
});
