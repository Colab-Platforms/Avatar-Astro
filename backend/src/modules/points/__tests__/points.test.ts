import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOROSCOPE_REWARDS, KARMA_PRACTICES, KARMA_REWARDS, SOURCES } from "../../../config/rewards.js";
import { advanceStreak, EMPTY_STREAK, kolkataDate, streaksFromDates, addDays } from "../streak.js";
import { completeHoroscope, getBalance, horoscopeSummary, karmaSummary, listTransactions, recordKarmaPractices, totalsBySource, type Db } from "../points.service.js";

/**
 * These tests run against an in-memory stand-in for the database, because the new tables do not exist yet (the migration is
 * not applied). They prove the logic and the once-only rules; the unique indexes themselves are only proven by a live database.
 */
import { fakeDb } from "./fakeDb.js";

const STEPS = { read: true, shuffled: true, revealed: true };
/** 10:00 IST on the given date (04:30 UTC). */
const noon = (date: string) => new Date(`${date}T04:30:00Z`);
async function complete(f: ReturnType<typeof fakeDb>, date: string, user = "u1", sign = "aries", extra: Record<string, unknown> = {}) {
  f.t.readings.add(`${sign}:${date}`);
  const now = f.at(`${date}T04:30:00Z`);
  return completeHoroscope(f.db, user, { sign, steps: STEPS, ...extra }, now);
}

describe("Kolkata date and streak maths", () => {
  it("uses the Kolkata calendar, with exact midnight boundaries", () => {
    assert.equal(kolkataDate(new Date("2026-11-12T18:29:59Z")), "2026-11-12"); // 23:59:59 IST
    assert.equal(kolkataDate(new Date("2026-11-12T18:30:00Z")), "2026-11-13"); // 00:00:00 IST
    assert.equal(kolkataDate(new Date("2026-12-31T18:30:00Z")), "2027-01-01");
    assert.equal(kolkataDate(new Date("2026-11-12T00:10:00Z")), "2026-11-12"); // UTC date and IST date agree here, but not 18:30-24:00 UTC
  });
  it("counts days across month, year and leap boundaries", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    let s = advanceStreak(EMPTY_STREAK, "2026-12-31");
    s = advanceStreak(s, "2027-01-01");
    assert.equal(s.currentStreak, 2);
  });
  it("advanceStreak: first day, next day, same day, gap, best and total never decrease", () => {
    let s = advanceStreak(EMPTY_STREAK, "2026-11-01");
    assert.deepEqual([s.currentStreak, s.bestStreak, s.totalDays], [1, 1, 1]);
    s = advanceStreak(s, "2026-11-02"); s = advanceStreak(s, "2026-11-03");
    assert.deepEqual([s.currentStreak, s.bestStreak, s.totalDays], [3, 3, 3]);
    assert.equal(advanceStreak(s, "2026-11-03"), s);
    s = advanceStreak(s, "2026-11-05"); // missed the 4th
    assert.deepEqual([s.currentStreak, s.bestStreak, s.totalDays], [1, 3, 4]);
  });
  it("streaksFromDates ignores duplicates, and a lapsed streak shows 0 for current but keeps best", () => {
    const r = streaksFromDates(["2026-11-01", "2026-11-02", "2026-11-02", "2026-11-03", "2026-11-10"], "2026-11-12");
    assert.deepEqual([r.current, r.best, r.total], [0, 3, 4]);
    assert.equal(streaksFromDates(["2026-11-11", "2026-11-12"], "2026-11-12").current, 2);
    assert.equal(streaksFromDates(["2026-11-10", "2026-11-11"], "2026-11-12").current, 2); // today not done yet: still alive
  });
});

describe("Daily Horoscope completion", () => {
  it("first completion pays 10 points and starts a streak of 1", async () => {
    const f = fakeDb();
    const r = await complete(f, "2026-11-12");
    assert.equal(r.alreadyCompleted, false);
    assert.deepEqual(r.awarded, { daily: 10, milestone: null });
    assert.equal(r.balance, 10);
    assert.deepEqual([r.summary.currentStreak, r.summary.bestStreak, r.summary.totalDays, r.summary.completedToday], [1, 1, 1, true]);
    assert.equal(r.summary.todayPoints, 10);
  });

  it("consecutive days increment the streak", async () => {
    const f = fakeDb();
    await complete(f, "2026-11-12"); const r = await complete(f, "2026-11-13");
    assert.equal(r.summary.currentStreak, 2);
    assert.equal(r.balance, 20);
  });

  it("the same day again (refresh, retry, second tab, other sign) pays nothing more", async () => {
    const f = fakeDb();
    await complete(f, "2026-11-12", "u1", "aries");
    const again = await complete(f, "2026-11-12", "u1", "aries");
    const other = await complete(f, "2026-11-12", "u1", "leo"); // switching sign
    for (const r of [again, other]) { assert.equal(r.alreadyCompleted, true); assert.deepEqual(r.awarded, { daily: 0, milestone: null }); assert.equal(r.balance, 10); assert.equal(r.summary.totalDays, 1); }
  });

  it("concurrent requests pay exactly once", async () => {
    const f = fakeDb(); f.t.readings.add("aries:2026-11-12");
    const now = f.at("2026-11-12T04:30:00Z");
    const rs = await Promise.all(Array.from({ length: 8 }, () => completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS }, now)));
    assert.equal(rs.filter((r) => !r.alreadyCompleted).length, 1);
    assert.equal(f.t.ledger.length, 1);
    assert.equal(await getBalance(f.db, "u1"), 10);
  });

  it("a missed day restarts the streak, but best and total are kept", async () => {
    const f = fakeDb();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"]) await complete(f, d);
    const r = await complete(f, "2026-11-06");
    assert.deepEqual([r.summary.currentStreak, r.summary.bestStreak, r.summary.totalDays], [1, 3, 4]);
  });

  it("pays every milestone bonus exactly once, with the configured amounts", async () => {
    const f = fakeDb();
    let date = "2026-01-01"; const seen: Record<number, number> = {};
    for (let day = 1; day <= 100; day++) {
      const r = await complete(f, date);
      if (r.awarded.milestone) seen[r.awarded.milestone.days] = r.awarded.milestone.bonus;
      date = addDays(date, 1);
    }
    assert.deepEqual(seen, { 3: 15, 7: 30, 14: 50, 30: 100, 60: 200, 100: 350 });
    const bonus = HOROSCOPE_REWARDS.milestones.reduce((s, m) => s + m.bonus, 0);
    assert.equal(await getBalance(f.db, "u1"), 100 * 10 + bonus);
    const by = await totalsBySource(f.db, "u1");
    assert.deepEqual(by.map((b) => [b.source, b.points, b.count]), [[SOURCES.horoscopeDaily, 1000, 100], [SOURCES.horoscopeMilestone, bonus, 6]]);
  });

  it("does not pay a milestone twice when a broken streak climbs back to it", async () => {
    const f = fakeDb();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"]) await complete(f, d); // 3-day bonus
    await complete(f, "2026-11-10"); await complete(f, "2026-11-11");
    const r = await complete(f, "2026-11-12"); // 3 again
    assert.equal(r.summary.currentStreak, 3);
    assert.deepEqual(r.awarded, { daily: 10, milestone: null });
    assert.equal(f.t.ledger.filter((l) => l.source === SOURCES.horoscopeMilestone).length, 1);
  });

  it("never takes points, dates or users from the client", async () => {
    const f = fakeDb();
    const r = await complete(f, "2026-11-12", "u1", "aries", { points: 9999, userId: "u2", localDate: "2020-01-01" });
    assert.equal(r.balance, 10);
    assert.equal(f.t.completions[0].userId, "u1");
    assert.equal(f.t.completions[0].localDate.toISOString().slice(0, 10), "2026-11-12");
  });

  it("rejects a bad sign, missing steps, a stale date and a missing reading", async () => {
    const f = fakeDb(); f.t.readings.add("aries:2026-11-12");
    const now = f.at("2026-11-12T04:30:00Z");
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "dragon", steps: STEPS }, now), /Unknown zodiac/);
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "aries", steps: { read: true, shuffled: true } }, now), /shuffle/);
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS, horoscopeDate: "2026-11-11" }, now), /date has changed/);
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "leo", steps: STEPS }, now), /Open today's horoscope/);
    assert.equal(f.t.ledger.length, 0);
  });

  it("the Kolkata midnight decides the day, not UTC", async () => {
    const f = fakeDb(); f.t.readings.add("aries:2026-11-12"); f.t.readings.add("aries:2026-11-13");
    const late = new Date("2026-11-12T18:29:00Z"); // 23:59 IST on the 12th
    const early = new Date("2026-11-12T18:31:00Z"); // 00:01 IST on the 13th
    f.at(late.toISOString()); const a = await completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS }, late);
    f.at(early.toISOString()); const b = await completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS }, early);
    assert.equal(a.summary.today, "2026-11-12");
    assert.equal(b.summary.today, "2026-11-13");
    assert.equal(b.summary.currentStreak, 2); // two different Kolkata days, back to back
  });

  it("a failure rolls everything back and a retry then succeeds once", async () => {
    const f = fakeDb(); f.t.readings.add("aries:2026-11-12");
    const now = f.at("2026-11-12T04:30:00Z");
    f.t.failNextLedger = true;
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS }, now), /boom/);
    assert.equal(f.t.completions.length, 0); assert.equal(f.t.streaks.size, 0); assert.equal(f.t.ledger.length, 0);
    const r = await completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS }, now);
    assert.equal(r.alreadyCompleted, false); assert.equal(r.balance, 10);
  });

  it("the week tracker marks completed days and today, with no future days", async () => {
    const f = fakeDb();
    await complete(f, "2026-11-08"); await complete(f, "2026-11-10"); await complete(f, "2026-11-12");
    const s = await horoscopeSummary(f.db, "u1", noon("2026-11-12"));
    assert.equal(s.week.length, 7);
    assert.equal(s.week[6].date, "2026-11-12"); assert.equal(s.week[6].isToday, true);
    assert.deepEqual(s.week.filter((d) => d.completed).map((d) => d.date), ["2026-11-08", "2026-11-10", "2026-11-12"]);
    assert.ok(s.week.every((d) => d.date <= "2026-11-12"));
  });

  it("shows the next milestone from real values", async () => {
    const f = fakeDb();
    let r; for (const d of ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]) r = await complete(f, d);
    assert.deepEqual(r!.summary.nextMilestone, { days: 7, bonus: 30, progress: 5, remaining: 2 });
  });

  it("a lapsed streak reads 0 today but best and total remain", async () => {
    const f = fakeDb();
    await complete(f, "2026-11-01"); await complete(f, "2026-11-02");
    const s = await horoscopeSummary(f.db, "u1", noon("2026-11-09"));
    assert.deepEqual([s.currentStreak, s.bestStreak, s.totalDays, s.completedToday], [0, 2, 2, false]);
  });
});

describe("Shared Reward Points ledger", () => {
  it("balance is the sum of the ledger and users are isolated", async () => {
    const f = fakeDb();
    await complete(f, "2026-11-12", "u1"); await complete(f, "2026-11-12", "u2");
    await recordKarmaPractices(f.db, "u1", ["mantra"], noon("2026-11-12"));
    assert.equal(await getBalance(f.db, "u1"), 18);
    assert.equal(await getBalance(f.db, "u2"), 10);
    assert.equal((await listTransactions(f.db, "u2", 1, 20)).items.length, 1);
    assert.equal(await getBalance(f.db, "nobody"), 0);
  });

  it("groups by source and paginates newest first", async () => {
    const f = fakeDb();
    for (let i = 0; i < 5; i++) await complete(f, addDays("2026-11-01", i));
    const p1 = await listTransactions(f.db, "u1", 1, 2);
    const p3 = await listTransactions(f.db, "u1", 3, 2);
    assert.deepEqual([p1.items.length, p1.total, p1.totalPages, p3.items.length], [2, 6, 3, 2]); // 5 daily + the 3-day bonus
    assert.ok(p1.items[0].createdAt >= p1.items[1].createdAt);
    assert.equal((await listTransactions(f.db, "u1", 1, 999)).pageSize, 50); // page size is capped
  });

  it("is append-only: the service only ever inserts ledger rows", () => {
    const src = readFileSync(join(process.cwd(), "src", "modules", "points", "points.service.ts"), "utf8");
    assert.doesNotMatch(src, /pointsLedger\.(update|updateMany|delete|deleteMany|upsert)/);
  });

  it("a duplicate ledger key is never written twice", async () => {
    const f = fakeDb();
    await recordKarmaPractices(f.db, "u1", ["mantra", "mantra"], noon("2026-11-12"));
    await recordKarmaPractices(f.db, "u1", ["mantra"], noon("2026-11-12"));
    assert.equal(f.t.ledger.filter((l) => l.source === SOURCES.karmaPractice).length, 1);
  });
});

describe("Karma Sankhya Reward Points", () => {
  it("pays each practice once per day using the server's weights; unticking and re-ticking pays nothing more", async () => {
    const f = fakeDb(); const now = f.at("2026-11-12T04:30:00Z");
    const a = await recordKarmaPractices(f.db, "u1", ["mantra", "fast"], now);
    assert.equal(a.awarded.points, 20); assert.deepEqual(a.awarded.practices.sort(), ["fast", "mantra"]);
    const b = await recordKarmaPractices(f.db, "u1", ["mantra", "fast"], now); // untick + re-tick, refresh, second tab
    assert.equal(b.awarded.points, 0);
    const c = await recordKarmaPractices(f.db, "u1", ["mantra", "pooja"], now);
    assert.equal(c.awarded.points, 9);
    assert.equal(c.balance, 29);
    assert.deepEqual(c.summary.awardedToday.sort(), ["fast", "mantra", "pooja"]);
  });

  it("pays the same practice again on the next Kolkata day", async () => {
    const f = fakeDb();
    f.at("2026-11-12T04:30:00Z"); await recordKarmaPractices(f.db, "u1", ["mantra"], noon("2026-11-12"));
    f.at("2026-11-13T04:30:00Z"); const r = await recordKarmaPractices(f.db, "u1", ["mantra"], noon("2026-11-13"));
    assert.equal(r.awarded.points, 8);
  });

  it("rejects unknown or malformed practice ids and never accepts amounts", async () => {
    const f = fakeDb(); const now = noon("2026-11-12");
    await assert.rejects(() => recordKarmaPractices(f.db, "u1", ["mantra", "hack"], now), /Unknown practice/);
    await assert.rejects(() => recordKarmaPractices(f.db, "u1", ["__proto__"], now), /Unknown practice/);
    await assert.rejects(() => recordKarmaPractices(f.db, "u1", "mantra", now), /list of practice ids/);
    await assert.rejects(() => recordKarmaPractices(f.db, "u1", [], now), /list of practice ids/);
    assert.equal(f.t.ledger.length, 0);
  });

  it("server weights match the browser's karmaScore.ts exactly (the 0-100 score is untouched)", () => {
    const src = readFileSync(join(process.cwd(), "..", "frontend", "src", "lib", "karmaScore.ts"), "utf8");
    const found: Record<string, number> = {};
    for (const m of src.matchAll(/\{ id: "(\w+)", name: "[^"]*", pts: (\d+),/g)) found[m[1]] = Number(m[2]);
    assert.deepEqual(KARMA_PRACTICES, found);
  });

  it("pays each Karma streak bonus once, from the ledger, on its own source", async () => {
    const f = fakeDb(); const seen: Record<number, number> = {};
    let date = "2026-01-01";
    for (let day = 1; day <= 100; day++) {
      f.at(`${date}T04:30:00Z`);
      const r = await recordKarmaPractices(f.db, "u1", ["mantra"], noon(date));
      if (r.awarded.milestone) seen[r.awarded.milestone.days] = r.awarded.milestone.bonus;
      date = addDays(date, 1);
    }
    assert.deepEqual(seen, { 3: 10, 7: 25, 14: 40, 30: 80, 60: 150, 100: 250 });
    assert.equal(f.t.ledger.filter((l) => l.source === SOURCES.karmaMilestone).length, KARMA_REWARDS.milestones.length);
    assert.equal((await karmaSummary(f.db, "u1", noon("2026-04-10"))).currentStreak, 100);
  });

  it("a second tick on the same day does not repeat the milestone, and a gap breaks the streak but keeps best", async () => {
    const f = fakeDb();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"]) { f.at(`${d}T04:30:00Z`); await recordKarmaPractices(f.db, "u1", ["mantra"], noon(d)); }
    f.at("2026-11-03T05:30:00Z");
    const again = await recordKarmaPractices(f.db, "u1", ["yoga"], noon("2026-11-03"));
    assert.equal(again.awarded.milestone, null);
    const s = await karmaSummary(f.db, "u1", noon("2026-11-07"));
    assert.deepEqual([s.currentStreak, s.bestStreak, s.totalDays], [0, 3, 3]);
  });

  it("karma and horoscope streaks and rewards are independent", async () => {
    const f = fakeDb();
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"]) await complete(f, d);
    for (const d of ["2026-11-02", "2026-11-03"]) { f.at(`${d}T05:00:00Z`); await recordKarmaPractices(f.db, "u1", ["mantra"], noon(d)); }
    const h = await horoscopeSummary(f.db, "u1", noon("2026-11-03"));
    const k = await karmaSummary(f.db, "u1", noon("2026-11-03"));
    assert.deepEqual([h.currentStreak, k.currentStreak], [3, 2]);
    assert.equal(f.t.ledger.filter((l) => l.source === SOURCES.karmaMilestone).length, 0);
  });
});
