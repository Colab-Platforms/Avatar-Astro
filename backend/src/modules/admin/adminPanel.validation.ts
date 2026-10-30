import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

export const CONTENT_TYPES = ["BANNER", "ANNOUNCEMENT", "FAQ", "ARTICLE"] as const;
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ContentTypeName = (typeof CONTENT_TYPES)[number];
export type ContentStatusName = (typeof CONTENT_STATUSES)[number];

const bad = (message: string) => new ApiError(message, STATUS_CODES.BAD_REQUEST);

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";

/** Only same-site paths or http(s) URLs; blocks javascript:, data:, etc. */
export function safeUrl(v: unknown, field: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = str(v, 500);
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    /* fall through */
  }
  throw bad(`${field} must be a relative path or an http(s) URL.`);
}

function optionalDate(v: unknown, field: string): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw bad(`${field} is not a valid date.`);
  return d;
}

export interface ContentInput {
  type?: ContentTypeName;
  status?: ContentStatusName;
  title?: string;
  body?: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/** Validates a create (full) or update (partial) content payload. */
export function parseContent(body: any, mode: "create" | "update"): ContentInput {
  const b = body ?? {};
  const out: ContentInput = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);

  if (mode === "create" || has("type")) {
    if (!CONTENT_TYPES.includes(b.type)) throw bad(`type must be one of ${CONTENT_TYPES.join(", ")}.`);
    out.type = b.type;
  }
  if (mode === "create" || has("title")) {
    const title = str(b.title, 200);
    if (title.length < 2) throw bad("Title must be at least 2 characters.");
    out.title = title;
  }
  if (has("body")) out.body = str(b.body, 20000);
  if (has("status")) {
    if (!CONTENT_STATUSES.includes(b.status)) throw bad("status must be DRAFT or PUBLISHED.");
    out.status = b.status;
  }
  if (has("linkUrl")) out.linkUrl = safeUrl(b.linkUrl, "linkUrl");
  if (has("imageUrl")) out.imageUrl = safeUrl(b.imageUrl, "imageUrl");
  if (has("sortOrder")) {
    const n = Number(b.sortOrder);
    if (!Number.isInteger(n) || n < -1000 || n > 100000) throw bad("sortOrder must be a whole number.");
    out.sortOrder = n;
  }
  if (has("startsAt")) out.startsAt = optionalDate(b.startsAt, "startsAt");
  if (has("endsAt")) out.endsAt = optionalDate(b.endsAt, "endsAt");
  if (out.startsAt && out.endsAt && out.endsAt <= out.startsAt) throw bad("endsAt must be after startsAt.");

  if (mode === "create") {
    out.body = out.body ?? "";
    // FAQ needs an answer; announcements/banners can be title-only.
    if (out.type === "FAQ" && !out.body) throw bad("An FAQ needs an answer in the body.");
  }
  return out;
}

export interface DateRange {
  from: Date;
  to: Date; // exclusive upper bound
}

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, UTC). Default: last 30 days. */
export function parseRange(q: any, defaultDays = 30): DateRange {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const toDay = q?.to ? parseDay(q.to, "to") : today;
  const fromDay = q?.from ? parseDay(q.from, "from") : new Date(toDay.getTime() - (defaultDays - 1) * DAY_MS);
  if (fromDay > toDay) throw bad("from must not be after to.");
  const to = new Date(toDay.getTime() + DAY_MS);
  if (to.getTime() - fromDay.getTime() > 366 * DAY_MS) throw bad("Date range cannot exceed 366 days.");
  return { from: fromDay, to };
}

function parseDay(v: unknown, field: string): Date {
  const s = String(v);
  const d = new Date(`${s}T00:00:00.000Z`);
  if (!DAY_RE.test(s) || Number.isNaN(d.getTime())) throw bad(`${field} must be YYYY-MM-DD.`);
  return d;
}

export function parsePage(q: any, defaultSize = 20, maxSize = 50): { page: number; pageSize: number } {
  const page = Math.max(1, Math.floor(Number(q?.page)) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Math.floor(Number(q?.pageSize)) || defaultSize));
  return { page, pageSize };
}

/** CSV cell with quoting and spreadsheet-formula neutralisation. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (header: string[], rows: unknown[][]): string =>
  [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

/** "••••abcd" for long secrets, "••••" otherwise. Never returns the secret. */
export function maskSecret(v: string | undefined): string | null {
  if (!v) return null;
  return v.length >= 20 ? `••••${v.slice(-4)}` : "••••";
}
