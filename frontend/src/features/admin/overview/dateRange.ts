/** Date filter for the admin Overview. Days are UTC, matching the backend reports ("Today" is the current UTC day). */
export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export const RANGE_PRESETS: { id: RangePreset; label: string; days?: number }[] = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "custom", label: "Custom range" },
];

export const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
const parseDay = (s: string): Date | null => {
  if (!DAY_RE.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || isoDay(d) !== s ? null : d;
};

/** Why a custom range cannot be used, or null if it can. */
export function validateCustomRange(from: string, to: string, now: Date = new Date()): string | null {
  const f = parseDay(from), t = parseDay(to);
  if (!f || !t) return "Choose both a start and an end date.";
  if (f > t) return "The start date must not be after the end date.";
  if (t > parseDay(isoDay(now))!) return "The end date cannot be in the future.";
  if ((t.getTime() - f.getTime()) / DAY_MS + 1 > MAX_RANGE_DAYS) return `The range cannot be longer than ${MAX_RANGE_DAYS} days.`;
  return null;
}

export interface ResolvedRange { preset: RangePreset; from: string; to: string; label: string; days: number; error?: string }

/** The range for a preset (ending today) or the custom dates. */
export function resolveRange(preset: RangePreset, custom: { from?: string | null; to?: string | null } = {}, now: Date = new Date()): ResolvedRange {
  const today = isoDay(now);
  const spec = RANGE_PRESETS.find((p) => p.id === preset)!;
  if (preset === "custom") {
    const from = custom.from ?? "", to = custom.to ?? "";
    const error = validateCustomRange(from, to, now);
    if (!error) return { preset, from, to, label: from === to ? from : `${from} to ${to}`, days: (parseDay(to)!.getTime() - parseDay(from)!.getTime()) / DAY_MS + 1 };
    // An unusable custom range falls back to the default rather than querying nonsense.
    return { ...resolveRange("30d", {}, now), error };
  }
  const days = spec.days!;
  return { preset, from: isoDay(new Date(parseDay(today)!.getTime() - (days - 1) * DAY_MS)), to: today, label: spec.label, days };
}

/** Reads the range from the address bar, so a chosen range survives a refresh and can be shared. */
export function rangeFromParams(params: URLSearchParams, now: Date = new Date()): ResolvedRange {
  const raw = params.get("range");
  const preset = (RANGE_PRESETS.some((p) => p.id === raw) ? raw : "30d") as RangePreset;
  return resolveRange(preset, { from: params.get("from"), to: params.get("to") }, now);
}
