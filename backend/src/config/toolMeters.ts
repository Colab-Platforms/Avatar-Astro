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
  "birth-chart": [
    { method: "POST", path: /^\/api\/birthchart\/analyze$/, label: "POST /api/birthchart/analyze" },
    { method: "POST", path: /^\/api\/birthchart\/chat$/, label: "POST /api/birthchart/chat" },
  ],
  compatibility: [{ method: "POST", path: /^\/api\/compatibility\/analyze$/, label: "POST /api/compatibility/analyze" }],
  "name-analysis": [{ method: "POST", path: /^\/api\/name-analysis\/narrative$/, label: "POST /api/name-analysis/narrative" }],
  interpretation: [
    { method: "GET", path: /^\/api\/interpretation\/horoscope\/[^/]+$/, label: "GET /api/interpretation/horoscope/:sign" },
    { method: "POST", path: /^\/api\/interpretation\/birth-chart$/, label: "POST /api/interpretation/birth-chart" },
    { method: "GET", path: /^\/api\/interpretation\/compatibility$/, label: "GET /api/interpretation/compatibility" },
    { method: "POST", path: /^\/api\/interpretation\/chart-chat$/, label: "POST /api/interpretation/chart-chat" },
  ],
  "palm-reading": [{ method: "POST", path: /^\/api\/palm-reading$/, label: "POST /api/palm-reading" }],
  gemstone: [
    { method: "POST", path: /^\/api\/gemstone-calculator\/calculate$/, label: "POST /api/gemstone-calculator/calculate" },
    { method: "POST", path: /^\/api\/gemstone-calculator\/kundali$/, label: "POST /api/gemstone-calculator/kundali" },
  ],
};

export const isMeteredTool = (key: string): boolean => key in METERED;
export const matchMetered = (key: string, method: string, path: string): boolean =>
  (METERED[key] ?? []).some((r) => r.method === method && r.path.test(path));
