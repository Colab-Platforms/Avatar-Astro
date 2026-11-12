/**
 * Which requests count as one "use" of an astrology tool for the per-user rolling 24-hour limit. Only the endpoints that generate a
 * result are metered; lookups (place search, shop products, health) are free. Matching is on the full request path.
 * A tool absent from this map has no per-user limit (it can still be switched on/off).
 */
export interface MeteredRoute {
  method: "GET" | "POST";
  path: RegExp;
  /** Shown to admins in the Endpoint column. */
  label: string;
}

export const METERED: Record<string, MeteredRoute[]> = {
  tarot: [{ method: "POST", path: /^\/api\/tarot\/reading$/, label: "POST /api/tarot/reading" }],
  // The live Birth Chart page generates its chart via POST /api/gemstone-calculator/kundali (see index.ts), not the
  // legacy /api/birthchart/* routes below (kept metered in case anything still calls them).
  "birth-chart": [
    { method: "POST", path: /^\/api\/gemstone-calculator\/kundali$/, label: "POST /api/gemstone-calculator/kundali" },
    { method: "POST", path: /^\/api\/birthchart\/analyze$/, label: "POST /api/birthchart/analyze" },
    { method: "POST", path: /^\/api\/birthchart\/chat$/, label: "POST /api/birthchart/chat" },
  ],
  // The live Compatibility, Name Destiny Report and Palm Reading pages compute their result in the browser and
  // never call their AI endpoints below (kept locked down so they can't be used as an open relay). Each page instead
  // calls the paired /check endpoint purely to consume one use of the admin's per-24h limit before showing a result.
  compatibility: [
    { method: "POST", path: /^\/api\/compatibility\/analyze$/, label: "POST /api/compatibility/analyze" },
    { method: "POST", path: /^\/api\/compatibility\/check$/, label: "POST /api/compatibility/check" },
  ],
  "name-analysis": [
    { method: "POST", path: /^\/api\/name-analysis\/narrative$/, label: "POST /api/name-analysis/narrative" },
    { method: "POST", path: /^\/api\/name-analysis\/check$/, label: "POST /api/name-analysis/check" },
  ],
  interpretation: [
    { method: "GET", path: /^\/api\/interpretation\/horoscope\/[^/]+$/, label: "GET /api/interpretation/horoscope/:sign" },
    { method: "POST", path: /^\/api\/interpretation\/birth-chart$/, label: "POST /api/interpretation/birth-chart" },
    { method: "GET", path: /^\/api\/interpretation\/compatibility$/, label: "GET /api/interpretation/compatibility" },
    { method: "POST", path: /^\/api\/interpretation\/chart-chat$/, label: "POST /api/interpretation/chart-chat" },
  ],
  // The AI-vision POST /api/palm-reading route was removed (never called by the live page, which
  // analyses the photo in-browser) — only the free-feature usage-limit check remains.
  "palm-reading": [
    { method: "POST", path: /^\/api\/palm-reading\/check$/, label: "POST /api/palm-reading/check" },
  ],
  // kundali moved to "birth-chart" above: it is the Birth Chart feature, not the gemstone calculator.
  gemstone: [
    { method: "POST", path: /^\/api\/gemstone-calculator\/calculate$/, label: "POST /api/gemstone-calculator/calculate" },
  ],
};

export const isMeteredTool = (key: string): boolean => key in METERED;
export const matchMetered = (key: string, method: string, path: string): boolean =>
  (METERED[key] ?? []).some((r) => r.method === method && r.path.test(path));
