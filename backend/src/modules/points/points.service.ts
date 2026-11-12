import type { PrismaClient } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { HOROSCOPE_REWARDS, KARMA_PRACTICES, KARMA_REWARDS, SIGNS, SOURCES } from "@/config/rewards.js";
import { EMPTY_STREAK, addDays, advanceStreak, dateKeyToDate, dateToKey, kolkataDate, liveStreak, milestoneAt, nextMilestone, streaksFromDates, type StreakState } from "./streak.js";

/** Anything with the Prisma delegates used here: the real client, a transaction client, or a test double. */
export type Db = Pick<PrismaClient, "horoscopeCompletion" | "horoscopeStreak" | "pointsLedger" | "dailyHoroscope" | "$transaction" | "$executeRaw">;

/** A fixed instant (tests, read-only summaries) or a clock. Writes read the clock only AFTER taking the user lock, so dates follow lock order. */
export type Clock = Date | (() => Date);
const readClock = (c: Clock): Date => (typeof c === "function" ? c() : c);

/**
 * Serialises every points write for one user for the rest of the transaction (Postgres advisory lock, released at commit or rollback).
 * Without it two concurrent requests could both read the same streak or the same ledger dates and write conflicting results.
 * Reads inside the transaction then see everything earlier transactions committed (READ COMMITTED), so streaks and milestones
 * are always computed from authoritative rows.
 */
async function lockUser(tx: Pick<Db, "$executeRaw">, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`points:${userId}`}))`;
}

/** 00:00 Asia/Kolkata of a date key, as an instant (India has no daylight saving). */
const dayStart = (key: string): Date => new Date(dateKeyToDate(key).getTime() - 330 * 60_000);

const bad = (m: string, code: number = STATUS_CODES.BAD_REQUEST) => new ApiError(m, code);

// ── Shared Reward Points ────────────────────────────────────────────────────────────

/** The balance is always the sum of the user's ledger rows; there is no stored balance to edit. */
export async function getBalance(db: Db, userId: string): Promise<number> {
  const r = await db.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } });
  return r._sum.points ?? 0;
}

export async function totalsBySource(db: Db, userId: string) {
  const rows = await db.pointsLedger.groupBy({ by: ["source"], where: { userId }, _sum: { points: true }, _count: { _all: true } });
  return rows.map((r) => ({ source: r.source, points: r._sum?.points ?? 0, count: r._count._all })).sort((a, b) => a.source.localeCompare(b.source));
}

export async function listTransactions(db: Db, userId: string, page: number, pageSize: number) {
  const p = Math.max(1, Math.floor(page) || 1);
  const size = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));
  const [total, rows] = await Promise.all([
    db.pointsLedger.count({ where: { userId } }),
    db.pointsLedger.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (p - 1) * size, take: size, select: { id: true, source: true, refKey: true, points: true, createdAt: true } }),
  ]);
  return { items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), page: p, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) };
}

/** Sum of a user's points over some sources, optionally only rows written on/after `since`. */
async function sumPoints(db: Db, userId: string, sources: string[], since?: Date): Promise<number> {
  const r = await db.pointsLedger.aggregate({ where: { userId, source: { in: sources }, ...(since ? { createdAt: { gte: since } } : {}) }, _sum: { points: true } });
  return r._sum.points ?? 0;
}

/** Inserts a ledger row once. Returns true only when this call wrote it (a duplicate is silently ignored by the unique key). */
async function award(db: Pick<Db, "pointsLedger">, userId: string, source: string, refKey: string, points: number): Promise<boolean> {
  const r = await db.pointsLedger.createMany({ data: [{ userId, source, refKey, points }], skipDuplicates: true });
  return r.count === 1;
}

// ── Daily Horoscope ──────────────────────────────────────────────────────────

const toState = (r: { currentStreak: number; bestStreak: number; totalDays: number; lastDate: Date | null } | null): StreakState =>
  r ? { currentStreak: r.currentStreak, bestStreak: r.bestStreak, totalDays: r.totalDays, lastDate: r.lastDate ? dateToKey(r.lastDate) : null } : EMPTY_STREAK;

export async function horoscopeSummary(db: Db, userId: string, now: Date = new Date()) {
  const today = kolkataDate(now);
  const weekStart = addDays(today, -6);
  const [row, done] = await Promise.all([
    db.horoscopeStreak.findUnique({ where: { userId } }),
    db.horoscopeCompletion.findMany({ where: { userId, localDate: { gte: dateKeyToDate(weekStart), lte: dateKeyToDate(today) } }, select: { localDate: true } }),
  ]);
  const s = toState(row);
  const doneSet = new Set(done.map((d) => dateToKey(d.localDate)));
  const current = liveStreak(s, today);
  const next = nextMilestone(HOROSCOPE_REWARDS.milestones, current);
  const since = dayStart(today);
  const [todayPoints, totalPoints] = await Promise.all([
    sumPoints(db, userId, [SOURCES.horoscopeDaily, SOURCES.horoscopeMilestone], since),
    sumPoints(db, userId, [SOURCES.horoscopeDaily, SOURCES.horoscopeMilestone]),
  ]);
  return {
    today,
    completedToday: s.lastDate === today,
    currentStreak: current,
    bestStreak: s.bestStreak,
    totalDays: s.totalDays,
    lastDate: s.lastDate,
    todayPoints,
    totalPoints,
    // The week always ends today, so there are no future days; a day with no completion is simply "missed".
    week: Array.from({ length: 7 }, (_, i) => { const date = addDays(weekStart, i); return { date, completed: doneSet.has(date), isToday: date === today }; }),
    nextMilestone: next ? { days: next.days, bonus: next.bonus, progress: current, remaining: next.days - current } : null,
    rewards: { dailyPoints: HOROSCOPE_REWARDS.dailyPoints, milestones: HOROSCOPE_REWARDS.milestones },
  };
}

export interface CompleteInput { sign?: unknown; steps?: unknown; horoscopeDate?: unknown }

/**
 * Records today's completion and pays for it, atomically. Identity comes from the caller; the date is the server's Kolkata
 * date; the amounts come from config. `steps` (read / shuffled / revealed) are reported by the browser and are NOT verified by
 * the server. What the server does check: a valid sign, today's reading for that sign exists, and once per user per day.
 */
export async function completeHoroscope(db: Db, userId: string, input: CompleteInput, clock: Clock = () => new Date()) {
  const sign = typeof input.sign === "string" ? input.sign.toLowerCase() : "";
  if (!(SIGNS as readonly string[]).includes(sign)) throw bad("Unknown zodiac sign.");
  const st = (input.steps ?? {}) as Record<string, unknown>;
  if (st.read !== true || st.shuffled !== true || st.revealed !== true) throw bad("Read the horoscope, shuffle the cards and reveal a card first.");

  const result = await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const when = readClock(clock);
    const today = kolkataDate(when);
    // A tab left open past midnight must not complete the new day with yesterday's reading.
    if (input.horoscopeDate !== undefined && input.horoscopeDate !== today) throw bad("The date has changed. Please reload today's horoscope.", STATUS_CODES.CONFLICT);
    const reading = await tx.dailyHoroscope.findUnique({ where: { sign_horoscopeDate: { sign, horoscopeDate: dateKeyToDate(today) } }, select: { id: true } });
    if (!reading) throw bad("Open today's horoscope first.", STATUS_CODES.CONFLICT);
    // ON CONFLICT DO NOTHING: a concurrent twin waits for the first to commit, then inserts nothing.
    const created = await tx.horoscopeCompletion.createMany({ data: [{ userId, localDate: dateKeyToDate(today), sign }], skipDuplicates: true });
    if (created.count === 0) return { when, newlyCompleted: false, daily: 0, milestone: null as null | { days: number; bonus: number } };
    const next = advanceStreak(toState(await tx.horoscopeStreak.findUnique({ where: { userId } })), today);
    const data = { currentStreak: next.currentStreak, bestStreak: next.bestStreak, totalDays: next.totalDays, lastDate: dateKeyToDate(today) };
    await tx.horoscopeStreak.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    const dailyPaid = await award(tx, userId, SOURCES.horoscopeDaily, today, HOROSCOPE_REWARDS.dailyPoints);
    const m = milestoneAt(HOROSCOPE_REWARDS.milestones, next.currentStreak);
    const milestonePaid = m ? await award(tx, userId, SOURCES.horoscopeMilestone, `streak-${m.days}`, m.bonus) : false;
    return { when, newlyCompleted: true, daily: dailyPaid ? HOROSCOPE_REWARDS.dailyPoints : 0, milestone: milestonePaid && m ? { days: m.days, bonus: m.bonus } : null };
  });

  const [summary, balance] = await Promise.all([horoscopeSummary(db, userId, result.when), getBalance(db, userId)]);
  return { alreadyCompleted: !result.newlyCompleted, awarded: { daily: result.daily, milestone: result.milestone }, balance, summary };
}

// ── Karma Sankhya ────────────────────────────────────────────────────────────

export async function karmaSummary(db: Db, userId: string, now: Date = new Date()) {
  const today = kolkataDate(now);
  const rows = await db.pointsLedger.findMany({ where: { userId, source: SOURCES.karmaPractice }, select: { refKey: true } });
  const s = streaksFromDates(rows.map((r) => r.refKey.slice(0, 10)), today);
  const next = nextMilestone(KARMA_REWARDS.milestones, s.current);
  const since = dayStart(today);
  const [todayPoints, totalPoints] = await Promise.all([
    sumPoints(db, userId, [SOURCES.karmaPractice, SOURCES.karmaMilestone], since),
    sumPoints(db, userId, [SOURCES.karmaPractice, SOURCES.karmaMilestone]),
  ]);
  return {
    today,
    todayPoints,
    totalPoints,
    currentStreak: s.current,
    bestStreak: s.best,
    totalDays: s.total,
    awardedToday: rows.filter((r) => r.refKey.startsWith(`${today}:`)).map((r) => r.refKey.slice(11)),
    nextMilestone: next ? { days: next.days, bonus: next.bonus, progress: s.current, remaining: next.days - s.current } : null,
  };
}

/**
 * Pays for Karma practices ticked today. Only ids in the server's approved list are accepted; each earns once per user per
 * Kolkata day (unticking and re-ticking, refreshes and other tabs just hit the unique key). Streak bonuses are computed from
 * the ledger itself, never from a number sent by the browser.
 */
export async function recordKarmaPractices(db: Db, userId: string, ids: unknown, clock: Clock = () => new Date()) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 40 || ids.some((i) => typeof i !== "string")) throw bad("Send a list of practice ids.");
  const unique = [...new Set(ids as string[])];
  if (unique.some((i) => !Object.prototype.hasOwnProperty.call(KARMA_PRACTICES, i))) throw bad("Unknown practice.");

  const result = await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const when = readClock(clock);
    const today = kolkataDate(when);
    let points = 0;
    const earned: string[] = [];
    for (const id of unique) {
      if (await award(tx, userId, SOURCES.karmaPractice, `${today}:${id}`, KARMA_PRACTICES[id])) { points += KARMA_PRACTICES[id]; earned.push(id); }
    }
    let milestone: { days: number; bonus: number } | null = null;
    // Today is a Karma day once any practice is on the ledger for it (including earlier today).
    const rows = await tx.pointsLedger.findMany({ where: { userId, source: SOURCES.karmaPractice }, select: { refKey: true } });
    const { current } = streaksFromDates(rows.map((r) => r.refKey.slice(0, 10)), today);
    const m = milestoneAt(KARMA_REWARDS.milestones, current);
    if (m && (await award(tx, userId, SOURCES.karmaMilestone, `streak-${m.days}`, m.bonus))) milestone = { days: m.days, bonus: m.bonus };
    return { when, points, earned, milestone };
  });

  const [summary, balance] = await Promise.all([karmaSummary(db, userId, result.when), getBalance(db, userId)]);
  return { awarded: { practices: result.earned, points: result.points, milestone: result.milestone }, balance, summary };
}
