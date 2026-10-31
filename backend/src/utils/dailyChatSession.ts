/**
 * Daily chat usage (Inner Voice chat free-tier timer). The calendar day and the
 * "next midnight" boundary are computed from DAILY_CHAT_TIMEZONE (Asia/Kolkata),
 * never from the server's or the browser's local clock.
 */
import prisma from "@root/prisma.js";
import { DAILY_CHAT_DURATION_SECONDS, DAILY_CHAT_TIMEZONE } from "@/config/dailyChatLimit.js";

interface Ymd {
  year: number;
  month: number; // 1-12
  day: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
function dateTimePartsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatterCache.set(tz, f);
  }
  return f;
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function zoneOffsetMs(tz: string, at: Date): number {
  const parts: Record<string, number> = {};
  for (const p of dateTimePartsFormatter(tz).formatToParts(at)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The calendar date (Y-M-D) of `at`, as observed in `tz`. */
function ymdInTz(tz: string, at: Date): Ymd {
  const parts: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** UTC instant of local midnight (00:00) for the given calendar date in `tz`. */
function midnightUtcForDate(tz: string, ymd: Ymd): Date {
  const guess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, 0, 0, 0);
  return new Date(guess - zoneOffsetMs(tz, new Date(guess)));
}

/** Today's calendar date in DAILY_CHAT_TIMEZONE, as a UTC-midnight Date suitable for a `@db.Date` column. */
export function currentUsageDateKey(now: Date): Date {
  const { year, month, day } = ymdInTz(DAILY_CHAT_TIMEZONE, now);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * The next calendar-day boundary (midnight) in DAILY_CHAT_TIMEZONE, as a UTC
 * instant. Asia/Kolkata has a fixed (non-DST) offset, so "today's local
 * midnight + 24h" is always exactly the next one.
 */
export function nextMidnightUtc(now: Date): Date {
  const today = ymdInTz(DAILY_CHAT_TIMEZONE, now);
  return new Date(midnightUtcForDate(DAILY_CHAT_TIMEZONE, today).getTime() + 86_400_000);
}

export type DailyChatStatus = "NOT_STARTED" | "ACTIVE" | "EXPIRED";

export interface DailyChatSessionView {
  status: DailyChatStatus;
  allowed: boolean;
  remainingSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  nextAvailableAt: string | null;
}

function viewFromSession(session: { startedAt: Date; expiresAt: Date } | null, now: Date): DailyChatSessionView {
  if (!session) {
    return { status: "NOT_STARTED", allowed: true, remainingSeconds: DAILY_CHAT_DURATION_SECONDS, startedAt: null, expiresAt: null, nextAvailableAt: null };
  }
  const remainingMs = session.expiresAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return {
      status: "EXPIRED",
      allowed: false,
      remainingSeconds: 0,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      nextAvailableAt: nextMidnightUtc(now).toISOString(),
    };
  }
  return {
    status: "ACTIVE",
    allowed: true,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    startedAt: session.startedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    nextAvailableAt: null,
  };
}

/** Read-only: never creates a row. Opening the chat page must never start the timer. */
export async function getDailyChatStatus(userId: string, now: Date): Promise<DailyChatSessionView> {
  const usageDate = currentUsageDateKey(now);
  const session = await prisma.dailyChatUsage.findUnique({
    where: { userId_usageDate: { userId, usageDate } },
    select: { startedAt: true, expiresAt: true },
  });
  return viewFromSession(session, now);
}

/**
 * Called right before forwarding a chat message to the AI proxy. Creates
 * today's session on the very first call of the day; concurrent first calls
 * all converge on one row (unique constraint + upsert with a no-op update),
 * so they share one startedAt/expiresAt. Later calls only ever read it back —
 * nothing here can extend a session.
 */
export async function consumeDailyChatSession(userId: string, now: Date): Promise<DailyChatSessionView> {
  const usageDate = currentUsageDateKey(now);
  const startedAt = now;
  const expiresAt = new Date(Math.min(startedAt.getTime() + DAILY_CHAT_DURATION_SECONDS * 1000, nextMidnightUtc(now).getTime()));

  const session = await prisma.dailyChatUsage.upsert({
    where: { userId_usageDate: { userId, usageDate } },
    create: { userId, usageDate, startedAt, expiresAt },
    // No-op update: on a conflict, the already-committed row's startedAt/expiresAt wins untouched.
    update: {},
    select: { startedAt: true, expiresAt: true },
  });
  return viewFromSession(session, now);
}
