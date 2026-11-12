import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SOURCES } from "../../../config/rewards.js";
import { advanceStreak, EMPTY_STREAK } from "../streak.js";
import { completeHoroscope, getBalance, horoscopeSummary, karmaSummary, recordKarmaPractices } from "../points.service.js";
import { fakeDb } from "./fakeDb.js";

/**
 * Concurrency and date-boundary behaviour. The fake database yields on every call so concurrent requests really interleave, and it models the
 * per-user advisory lock. It is NOT PostgreSQL: it shows the logic is right when the lock holds, not that Postgres enforces it.
 */
const STEPS = { read: true, shuffled: true, revealed: true };
/** A clock that returns the given instants in order (one per read), then repeats the last. */
const seq = (iso: string[]) => { let i = 0; return () => new Date(iso[Math.min(i++, iso.length - 1)]); };
const readings = (f: ReturnType<typeof fakeDb>, dates: string[], sign = "aries") => dates.forEach((d) => f.t.readings.add(`${sign}:${d}`));
const horo = (f: ReturnType<typeof fakeDb>, clock: () => Date, user = "u1") => completeHoroscope(f.db, user, { sign: "aries", steps: STEPS }, clock);

describe("per-user lock", () => {
  it("every points write takes the lock once, for both features", async () => {
    const f = fakeDb(); readings(f, ["2026-11-12"]);
    await horo(f, () => new Date("2026-11-12T05:00:00Z"));
    await recordKarmaPractices(f.db, "u1", ["mantra"], () => new Date("2026-11-12T05:00:00Z"));
    assert.equal(f.t.lockCalls, 2);
  });

  it("rejected requests (bad input) are refused before anything is locked or written", async () => {
    const f = fakeDb();
    await assert.rejects(() => completeHoroscope(f.db, "u1", { sign: "dragon", steps: STEPS }), /Unknown zodiac/);
    await assert.rejects(() => recordKarmaPractices(f.db, "u1", ["nope"]), /Unknown practice/);
    assert.equal(f.t.lockCalls, 0);
    assert.equal(f.t.ledger.length, 0);
  });
});

describe("horoscope streak under concurrency", () => {
  it("two simultaneous completions for consecutive days produce a streak of 2 (and would not without the lock)", async () => {
    const days = ["2026-11-12T05:00:00Z", "2026-11-13T05:00:00Z"];
    const locked = fakeDb(); readings(locked, ["2026-11-12", "2026-11-13"]);
    const c1 = seq(days);
    await Promise.all([horo(locked, c1), horo(locked, c1)]);
    assert.equal(locked.t.streaks.get("u1")!.currentStreak, 2);
    assert.equal(locked.t.streaks.get("u1")!.totalDays, 2);
    assert.equal(await getBalance(locked.db, "u1"), 20);

    // Same scenario with the lock disabled: both read an empty streak and both write 1. This proves the test can see the race.
    const unlocked = fakeDb({ ignoreLocks: true }); readings(unlocked, ["2026-11-12", "2026-11-13"]);
    const c2 = seq(days);
    await Promise.all([horo(unlocked, c2), horo(unlocked, c2)]);
    assert.notEqual(unlocked.t.streaks.get("u1")!.currentStreak, 2);
  });

  it("many simultaneous requests straddling Kolkata midnight pay exactly one completion per day, in lock order", async () => {
    const f = fakeDb(); readings(f, ["2026-11-12", "2026-11-13"]);
    // 5 reads at 23:59 IST on the 12th, then 5 at 00:01 IST on the 13th.
    const clock = seq([...Array(5).fill("2026-11-12T18:29:00Z"), ...Array(5).fill("2026-11-12T18:31:00Z")]);
    const rs = await Promise.all(Array.from({ length: 10 }, () => horo(f, clock)));
    assert.equal(rs.filter((r) => !r.alreadyCompleted).length, 2);
    assert.equal(f.t.completions.length, 2);
    assert.deepEqual([...f.t.streaks.values()].map((s) => [s.currentStreak, s.bestStreak, s.totalDays]), [[2, 2, 2]]);
    assert.equal(await getBalance(f.db, "u1"), 20);
  });

  it("a request that waited for the lock across midnight is judged on the new day, so a stale tab date is refused", async () => {
    const f = fakeDb(); readings(f, ["2026-11-12", "2026-11-13"]);
    const clock = seq(["2026-11-12T18:29:59Z", "2026-11-12T18:30:01Z"]);
    const a = completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS, horoscopeDate: "2026-11-12" }, clock);
    const b = completeHoroscope(f.db, "u1", { sign: "aries", steps: STEPS, horoscopeDate: "2026-11-12" }, clock); // still holding the old date
    const [ra, rb] = await Promise.allSettled([a, b]);
    assert.equal(ra.status, "fulfilled");
    assert.equal(rb.status, "rejected");
    assert.match(String((rb as PromiseRejectedResult).reason.message), /date has changed/);
    assert.equal(f.t.completions.length, 1);
  });

  it("one user's lock does not mix with another user's", async () => {
    const f = fakeDb(); readings(f, ["2026-11-12"]);
    const c = () => new Date("2026-11-12T05:00:00Z");
    await Promise.all([horo(f, c, "a"), horo(f, c, "b"), horo(f, c, "a"), horo(f, c, "b")]);
    assert.equal(await getBalance(f.db, "a"), 10);
    assert.equal(await getBalance(f.db, "b"), 10);
  });

  it("an out-of-order older date can never move the streak backwards", () => {
    const s = advanceStreak(advanceStreak(EMPTY_STREAK, "2026-11-12"), "2026-11-13");
    assert.equal(advanceStreak(s, "2026-11-11"), s);
    assert.equal(advanceStreak(s, "2026-11-12"), s);
  });
});

describe("karma streak under concurrency", () => {
  it("different practices ticked at once on one day are each paid once and count as one Karma day", async () => {
    const f = fakeDb(); const c = () => new Date("2026-11-12T05:00:00Z");
    const ids = ["mantra", "meditation", "truth", "feed", "fast"];
    await Promise.all([...ids, ...ids].map((id) => recordKarmaPractices(f.db, "u1", [id], c)));
    const s = await karmaSummary(f.db, "u1", c());
    assert.equal(s.totalPoints, 8 + 5 + 6 + 10 + 12);
    assert.deepEqual([s.currentStreak, s.totalDays], [1, 1]);
    assert.equal(f.t.ledger.length, ids.length);
  });

  it("three days submitted at the same moment give a streak of 3 and the 3-day bonus exactly once", async () => {
    const f = fakeDb();
    const clock = seq(["2026-11-10T05:00:00Z", "2026-11-11T05:00:00Z", "2026-11-12T05:00:00Z"]);
    await Promise.all([0, 1, 2].map(() => recordKarmaPractices(f.db, "u1", ["mantra"], clock)));
    const bonus = f.t.ledger.filter((l) => l.source === SOURCES.karmaMilestone);
    assert.deepEqual(bonus.map((b) => [b.refKey, b.points]), [["streak-3", 10]]);
    assert.equal((await karmaSummary(f.db, "u1", new Date("2026-11-12T05:00:00Z"))).currentStreak, 3);
  });

  it("a practice at 23:59 IST and another at 00:01 IST are consecutive Karma days", async () => {
    const f = fakeDb();
    f.at("2026-11-12T18:29:59Z"); await recordKarmaPractices(f.db, "u1", ["mantra"], new Date("2026-11-12T18:29:59Z"));
    f.at("2026-11-12T18:30:01Z"); await recordKarmaPractices(f.db, "u1", ["mantra"], new Date("2026-11-12T18:30:01Z"));
    const s = await karmaSummary(f.db, "u1", new Date("2026-11-12T18:30:02Z"));
    assert.deepEqual([s.currentStreak, s.totalDays, s.todayPoints], [2, 2, 8]);
    assert.equal(s.today, "2026-11-13");
  });

  it("the same practice twice in one IST day that spans two UTC days is paid once", async () => {
    const f = fakeDb();
    await recordKarmaPractices(f.db, "u1", ["mantra"], new Date("2026-11-12T20:00:00Z")); // 01:30 IST on the 13th
    const r = await recordKarmaPractices(f.db, "u1", ["mantra"], new Date("2026-11-13T10:00:00Z")); // 15:30 IST on the 13th
    assert.equal(r.awarded.points, 0);
  });
});

describe("mixed features, one user", () => {
  it("horoscope and karma requests at once leave a ledger that sums exactly, with independent streaks", async () => {
    const f = fakeDb(); readings(f, ["2026-11-12"]);
    const c = () => new Date("2026-11-12T05:00:00Z");
    await Promise.all([horo(f, c), recordKarmaPractices(f.db, "u1", ["mantra", "yoga"], c), horo(f, c), recordKarmaPractices(f.db, "u1", ["yoga"], c)]);
    assert.equal(await getBalance(f.db, "u1"), 10 + 8 + 6);
    assert.equal((await horoscopeSummary(f.db, "u1", c())).currentStreak, 1);
    assert.equal((await karmaSummary(f.db, "u1", c())).currentStreak, 1);
  });
});
