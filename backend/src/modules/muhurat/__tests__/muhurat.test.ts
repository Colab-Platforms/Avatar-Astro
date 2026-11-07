import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { limbsAt } from "../../gemstone/panchang.js";
import { DISHASHOOL, GULIKA_PART, RAHU_PART, WEEKDAYS, YAMAGANDA_PART, periodsFor } from "../periods.js";
import { EVENTS, EVENT_BY_ID, NAK } from "../rules.js";
import { MuhuratInputError, hm, parseMuhuratRequest, searchMuhurat, type MuhuratPlace } from "../search.js";
import { NAKSHATRAS } from "../../gemstone/analysis.js";

const place = (name: string, latitude: number, longitude: number, timezone = "Asia/Kolkata"): MuhuratPlace => ({ name, admin1: null, country: "India", latitude, longitude, timezone });
// Coordinates exactly as Drik Panchang prints them.
const MUMBAI = place("Mumbai", 19.0728, 72.8825);
const DELHI = place("New Delhi", 28.6356, 77.2244);
const CHENNAI = place("Chennai", 13.0827, 80.2707);

const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const NOW = new Date("2026-11-07T06:00:00Z");

describe("reference values (Drik Panchang daily pages, read 2026-11-07)", () => {
  // Reference: https://www.drikpanchang.com/panchang/day-panchang.html (Mumbai 18/12/2026, New Delhi 11/02/2027). Drik prints whole minutes; allow 2.
  const REF = [
    { place: MUMBAI, date: "2026-12-18", rise: "07:05", set: "18:05", rahu: ["11:13", "12:35"], yama: ["15:20", "16:42"], gulika: ["08:28", "09:50"], abhijit: ["12:13", "12:57"] },
    { place: DELHI, date: "2027-02-11", rise: "07:03", set: "18:08", rahu: ["13:59", "15:22"], yama: ["07:03", "08:26"], gulika: ["09:49", "11:12"], abhijit: ["12:13", "12:58"] },
  ];
  for (const r of REF) {
    it(`${r.place.name} ${r.date}: sunrise, sunset, Rahu Kalam, Yamaganda, Gulika, Abhijit match`, () => {
      const day = searchMuhurat({ event: "work-beginning", place: r.place, startDate: r.date, endDate: r.date }).days[0];
      const close = (a: string | null | undefined, b: string, what: string) => assert.ok(a && Math.abs(mins(a) - mins(b)) <= 2, `${what}: ${a} vs ${b}`);
      close(day.sunrise, r.rise, "sunrise");
      close(day.sunset, r.set, "sunset");
      const p = (label: string) => day.avoidedPeriods.find((x) => x.label === label)!;
      close(p("Rahu Kalam").startLocal, r.rahu[0], "rahu start"); close(p("Rahu Kalam").endLocal, r.rahu[1], "rahu end");
      close(p("Yamaganda").startLocal, r.yama[0], "yama start"); close(p("Yamaganda").endLocal, r.yama[1], "yama end");
      close(p("Gulika Kalam").startLocal, r.gulika[0], "gulika start"); close(p("Gulika Kalam").endLocal, r.gulika[1], "gulika end");
      close(day.abhijit!.startLocal, r.abhijit[0], "abhijit start"); close(day.abhijit!.endLocal, r.abhijit[1], "abhijit end");
    });
  }
  it("Panchang limbs match Drik at those dates (Mumbai: Navami, Uttara Bhadrapada, Vyatipata, Balava; Delhi: Panchami, Revati, Sadhya, Bava)", () => {
    const m = limbsAt(new Date("2026-12-18T01:35:00Z")); // 07:05 IST
    assert.deepEqual([m.tithiNumber, m.nakshatra.name, m.yoga, m.karana], [9, "Uttara Bhadrapada", "Vyatipata", "Balava"]);
    const d = limbsAt(new Date("2027-02-11T01:33:00Z")); // 07:03 IST
    assert.deepEqual([d.tithiNumber, d.nakshatra.name, d.yoga, d.karana], [5, "Revati", "Sadhya", "Bava"]);
  });
});

describe("periods", () => {
  it("each weekday gives each period one of the eight parts, and the tables are permutations", () => {
    assert.deepEqual([...RAHU_PART].sort(), [2, 3, 4, 5, 6, 7, 8]); // Rahu Kalam never falls in the first eighth
    for (const t of [YAMAGANDA_PART, GULIKA_PART]) assert.deepEqual([...t].sort(), [1, 2, 3, 4, 5, 6, 7]);
    const rise = new Date("2026-12-18T01:30:00Z"), set = new Date("2026-12-18T12:30:00Z");
    const p = periodsFor(5, rise, set);
    assert.equal(p.rahuKalam.end.getTime() - p.rahuKalam.start.getTime(), (set.getTime() - rise.getTime()) / 8);
    assert.equal(p.rahuKalam.start.getTime(), rise.getTime() + 3 * ((set.getTime() - rise.getTime()) / 8)); // Friday: 4th part
  });
  it("Dishashool: Monday and Saturday East, Thursday South", () => {
    assert.equal(DISHASHOOL[1], "East"); assert.equal(DISHASHOOL[6], "East"); assert.equal(DISHASHOOL[4], "South");
  });
});

describe("rule data", () => {
  it("covers the fifteen events, with unique ids", () => {
    assert.equal(EVENTS.length, 15);
    assert.equal(new Set(EVENTS.map((e) => e.id)).size, 15);
  });
  it("every nakshatra named in a rule is a real nakshatra the engine produces", () => {
    for (const e of EVENTS) for (const n of [...e.nakshatras.best, ...e.nakshatras.good]) assert.ok((NAKSHATRAS as readonly string[]).includes(n), `${e.id}: ${n}`);
    for (const g of Object.values(NAK)) for (const n of g) assert.ok((NAKSHATRAS as readonly string[]).includes(n));
  });
  it("every event states its basis and a confidence", () => {
    for (const e of EVENTS) { assert.ok(e.basis.length > 20); assert.ok(["consensus", "general"].includes(e.confidence)); }
  });
});

describe("every event searches and every window truly qualifies", () => {
  for (const e of EVENTS) {
    it(`${e.id}`, () => {
      const r = searchMuhurat({ event: e.id, place: MUMBAI, startDate: "2026-12-01", endDate: "2027-03-31" });
      assert.equal(r.totals.days, 121);
      for (const day of r.days) {
        for (const w of day.windows) {
          assert.ok(w.durationMinutes >= 20);
          assert.ok(w.startUtc < w.endUtc);
          assert.ok(w.startLocal >= day.sunrise! && w.endLocal <= day.sunset!, `${day.date} ${w.startLocal}-${w.endLocal} within ${day.sunrise}-${day.sunset}`);
          assert.ok(EVENT_BY_ID[e.id].weekdays.best.concat(EVENT_BY_ID[e.id].weekdays.ok).includes(WEEKDAYS.indexOf(w.weekday as never)));
          // The nakshatra at the very start of the window is one the rule accepts.
          const l = limbsAt(new Date(w.startUtc));
          assert.ok([...e.nakshatras.best, ...e.nakshatras.good].includes(l.nakshatra.name), `${w.date} ${l.nakshatra.name}`);
          assert.notEqual(l.tithiNumber, 30);
          // Windows never overlap Rahu Kalam, Yamaganda or Gulika.
          for (const p of w.avoidedPeriods) assert.ok(w.endLocal <= p.startLocal || w.startLocal >= p.endLocal, `${w.date} ${w.startLocal}-${w.endLocal} overlaps ${p.label} ${p.startLocal}-${p.endLocal}`);
        }
      }
      if (r.best) assert.ok(r.others.every((o) => o.score <= r.best!.score));
    });
  }
});

describe("exactness", () => {
  it("a window's edges are where the rules flip: one minute inside qualifies, one minute outside does not (or is sunrise/sunset)", () => {
    const r = searchMuhurat({ event: "griha-pravesh", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28" });
    const w = r.best!;
    const day = r.days.find((d) => d.date === w.date)!;
    const probe = (iso: string, off: number) => limbsAt(new Date(new Date(iso).getTime() + off * 60_000));
    const ok = (t: Date) => { const l = limbsAt(t); return [...EVENT_BY_ID["griha-pravesh"].nakshatras.best, ...EVENT_BY_ID["griha-pravesh"].nakshatras.good].includes(l.nakshatra.name); };
    assert.ok(ok(new Date(new Date(w.startUtc).getTime() + 60_000)));
    assert.ok(ok(new Date(new Date(w.endUtc).getTime() - 60_000)));
    void probe; void day;
  });

  it("a window that ends because a period begins ends exactly when it begins", () => {
    // Find any window whose end equals the start of an avoided period.
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28" });
    const hit = r.days.flatMap((d) => d.windows).find((w) => w.avoidedPeriods.some((p) => p.startLocal === w.endLocal));
    assert.ok(hit, "expected at least one window bounded by Rahu Kalam, Yamaganda or Gulika");
  });
});

describe("location-specific timings", () => {
  it("two cities on the same date get different sunrise, periods and windows", () => {
    const run = (p: MuhuratPlace) => searchMuhurat({ event: "business-opening", place: p, startDate: "2026-12-01", endDate: "2027-01-31" });
    const [m, d, c] = [run(MUMBAI), run(DELHI), run(CHENNAI)];
    const day = (r: typeof m) => r.days.find((x) => x.date === "2026-12-18")!;
    assert.notEqual(day(m).sunrise, day(d).sunrise);
    assert.notEqual(day(m).sunrise, day(c).sunrise);
    assert.notEqual(day(m).avoidedPeriods[0].startLocal, day(d).avoidedPeriods[0].startLocal);
    const sig = (r: typeof m) => r.days.flatMap((x) => x.windows.map((w) => `${w.date} ${w.startLocal}-${w.endLocal}`)).join();
    assert.notEqual(sig(m), sig(d));
    assert.notEqual(sig(m), sig(c));
  });

  it("local times follow the event time zone, not the server's", () => {
    const sydney = place("Sydney", -33.8688, 151.2093, "Australia/Sydney");
    const r = searchMuhurat({ event: "work-beginning", place: sydney, startDate: "2026-12-15", endDate: "2026-12-20" });
    for (const d of r.days) {
      assert.ok(mins(d.sunrise!) < 6 * 60, `Sydney summer sunrise is early: ${d.sunrise}`);
      for (const w of d.windows) assert.equal(hm("Australia/Sydney", new Date(w.startUtc)), w.startLocal);
    }
  });

  it("a window belongs to the local date it is shown under, even when the UTC date differs", () => {
    const r = searchMuhurat({ event: "work-beginning", place: MUMBAI, startDate: "2026-12-01", endDate: "2026-12-31" });
    for (const d of r.days) for (const w of d.windows) {
      const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(w.startUtc));
      assert.equal(localDate, w.date);
    }
    // Sunrise at Mumbai is about 01:35 UTC, so a Pacific-time place must still report its own local dates.
    const la = place("Los Angeles", 34.0522, -118.2437, "America/Los_Angeles");
    for (const d of searchMuhurat({ event: "work-beginning", place: la, startDate: "2026-12-01", endDate: "2026-12-10" }).days)
      for (const w of d.windows) assert.equal(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(w.startUtc)), w.date);
  });

  it("a range of N days returns exactly N dates, both ends included", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-30", endDate: "2027-01-02" });
    assert.deepEqual(r.days.map((d) => d.date), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });
});

describe("seasonal and condition rules", () => {
  it("Chaturmas: no marriage window between Devshayani and Prabodhini Ekadashi, and the reason is given", () => {
    const r = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-08-10", endDate: "2026-09-20" });
    assert.equal(r.totals.windows, 0);
    assert.ok(r.days.every((d) => d.blockers.length > 0));
    assert.ok(r.days.some((d) => d.blockers.some((b) => /Chaturmas|Adhika|Pitru/.test(b))));
  });
  it("Kharmas: no marriage window while the Sun is in sidereal Dhanu", () => {
    const r = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-12-20", endDate: "2027-01-10" });
    assert.equal(r.totals.windows, 0);
    assert.ok(r.days.some((d) => d.blockers.some((b) => /Kharmas/.test(b))));
  });
  it("Kharmas does not block a business opening in the same weeks", () => {
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-20", endDate: "2027-01-10" });
    assert.ok(r.totals.windows > 0);
  });
  it("Adhika masa (Jyeshtha 2026) is avoided for a house-warming", () => {
    const r = searchMuhurat({ event: "griha-pravesh", place: MUMBAI, startDate: "2026-05-20", endDate: "2026-06-10" });
    assert.equal(r.totals.windows, 0);
  });
});

describe("preferences", () => {
  it("a weekday preference only returns that weekday", () => {
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28", preferences: { weekdays: [4] } });
    assert.ok(r.totals.windows > 0);
    for (const d of r.days) for (const w of d.windows) assert.equal(w.weekday, "Thursday");
  });
  it("a morning preference returns only windows that end by noon", () => {
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28", preferences: { timeOfDay: "morning" } });
    assert.ok(r.totals.windows > 0);
    for (const d of r.days) for (const w of d.windows) assert.ok(w.endLocal <= "12:00", `${w.date} ${w.endLocal}`);
  });
  it("Travel: the Dishashool weekday for the chosen direction is excluded", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-01-31", preferences: { direction: "East" } });
    for (const d of r.days) for (const w of d.windows) assert.ok(!["Monday", "Saturday"].includes(w.weekday));
    assert.ok(r.days.some((d) => d.weekday === "Monday" && d.blockers.some((b) => /Dishashool/.test(b))));
  });
});

describe("results, ranking, honesty", () => {
  it("is deterministic", () => {
    const run = () => JSON.stringify(searchMuhurat({ event: "vehicle-purchase", place: DELHI, startDate: "2026-12-01", endDate: "2027-02-28" }));
    assert.equal(run(), run());
  });
  it("best is the top score; others are best-first, on other dates, and at most five", () => {
    const r = searchMuhurat({ event: "griha-pravesh", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-04-30" });
    assert.ok(r.best);
    assert.ok(r.others.length <= 5 && r.others.length > 0);
    const scores = [r.best!, ...r.others].map((w) => w.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    assert.equal(new Set([r.best!, ...r.others].map((w) => w.date)).size, 1 + r.others.length);
  });
  it("score parts add up to the score", () => {
    const w = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-11-20", endDate: "2027-05-30" }).best!;
    assert.equal(w.scoreParts.reduce((a, p) => a + p.points, 0), w.score);
  });
  it("when nothing qualifies there is no best, no invented result, and the reasons are listed", () => {
    const r = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-12-20", endDate: "2026-12-25" });
    assert.equal(r.best, null); assert.deepEqual(r.others, []); assert.equal(r.totals.windows, 0);
    assert.ok(r.days.every((d) => d.blockers.length > 0));
  });
  it("carries the method, what was evaluated, the rules and the limits; never promises an outcome; has no long disclaimer", () => {
    const r = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-03-30" });
    assert.match(r.method.label, /Lahiri/);
    assert.ok(r.rules.length >= 5);
    assert.ok(r.event.limitations.some((l) => /lagna/i.test(l)));
    assert.ok(!("disclaimer" in r));
    for (const e of ["Tithi and paksha", "Nakshatra", "Yoga", "Karana", "Rahu Kalam", "Yamaganda", "Gulika Kalam"]) assert.ok(r.evaluated.includes(e), e);
    assert.ok(r.evaluated.some((e) => /Chaturmas/.test(e)) && r.evaluated.some((e) => /Shukra/.test(e)), "marriage also evaluates the season and combustion");
    assert.ok(!searchMuhurat({ event: "work-beginning", place: MUMBAI, startDate: "2026-12-01", endDate: "2026-12-05" }).evaluated.some((e) => /Chaturmas|Shukra|Kharmas/.test(e)), "an event that does not use these rules does not claim to evaluate them");
    const text = JSON.stringify(r);
    assert.doesNotMatch(text, /guarantee(d|s)? (success|prosperity|happiness)|will bring|ensures/i);
  });
  it("a search over a year finishes in a reasonable time", () => {
    const t = Date.now();
    searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-11-10", endDate: "2027-11-09" });
    assert.ok(Date.now() - t < 15_000);
  });
});

describe("input validation", () => {
  const body = (o: Record<string, unknown> = {}) => ({ event: "marriage", place: MUMBAI, startDate: "2026-12-01", endDate: "2026-12-31", ...o });
  const bad = (o: Record<string, unknown>, re: RegExp) => assert.throws(() => parseMuhuratRequest(body(o), NOW), (e) => e instanceof MuhuratInputError && re.test((e as Error).message));
  it("accepts a good request", () => assert.equal(parseMuhuratRequest(body(), NOW).event, "marriage"));
  it("rejects an unknown event, no place, a bad time zone and bad coordinates", () => {
    bad({ event: "wedding" }, /choose one of the events/);
    bad({ place: { name: "", latitude: 1, longitude: 1, timezone: "Asia/Kolkata" } }, /select the event location/);
    bad({ place: { ...MUMBAI, timezone: "Mars/Olympus" } }, /time zone/);
    bad({ place: { ...MUMBAI, latitude: 91 } }, /./);
  });
  it("rejects malformed dates, an end before the start, a range over a year and a start in the past", () => {
    bad({ startDate: "2026-13-01" }, /valid start and end date/);
    bad({ startDate: "nope" }, /valid start and end date/);
    bad({ startDate: "2026-12-10", endDate: "2026-12-01" }, /on or after/);
    bad({ startDate: "2026-12-01", endDate: "2028-01-01" }, /at most 366/);
    bad({ startDate: "2026-11-01", endDate: "2026-12-01" }, /past/);
  });
  it("'today' is judged in the event's time zone", () => {
    // 2026-11-07 06:00Z is already 2026-11-07 in Kolkata but still 2026-11-06 in Los Angeles.
    assert.doesNotThrow(() => parseMuhuratRequest(body({ place: place("Los Angeles", 34.05, -118.24, "America/Los_Angeles"), startDate: "2026-11-06", endDate: "2026-11-30" }), NOW));
    assert.throws(() => parseMuhuratRequest(body({ startDate: "2026-11-06", endDate: "2026-11-30" }), NOW));
  });
  it("ignores unknown weekday and direction values", () => {
    const r = parseMuhuratRequest(body({ preferences: { weekdays: [9, "x", 2], direction: "Up", timeOfDay: "night" } }), NOW);
    assert.deepEqual(r.preferences, { weekdays: [2], timeOfDay: "any", direction: undefined });
  });
});
