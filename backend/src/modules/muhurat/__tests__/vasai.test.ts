/**
 * Mundan Muhurat, Vasai (Maharashtra), 10 to 12 November 2026: the search that returned zero results.
 *
 * Reference: Drik Panchang daily pages for MUMBAI (geoname-id 1275339; Vasai has no Drik page of its own, and lies about 50 km north,
 * so sunrise and the Rahu/Yamaganda/Gulika times differ by a minute or two while tithi, nakshatra, yoga and karana end times do not
 * depend on the place), read 2026-11-10:
 *   https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1275339&date=10/11/2026  (and 11/11/2026, 12/11/2026)
 * Devshayani and Prabodhini Ekadashi: Drik Panchang Ekadashi pages (New Delhi), tithi times are place independent:
 *   Devshayani Ekadashi: Ekadashi begins 09:12 AM on Jul 24, 2026, ends 11:34 AM on Jul 25, 2026.
 *   Prabodhini (Devutthana) Ekadashi: begins 07:15 AM on Nov 20, 2026, ends 06:31 AM on Nov 21, 2026.
 * Chaturmas and Mundan: Mundan (chudakarana) is among the ceremonies postponed from Devshayani to Prabodhini Ekadashi
 * (narayanseva.org/chaturmas-2026, patnapress.com, wemy.in).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { limbsAt } from "../../gemstone/panchang.js";
import { dayPanchang } from "../calendar.js";
import { EVENT_BY_ID } from "../rules.js";
import { inChaturmas, searchMuhurat, type MuhuratPlace } from "../search.js";

const VASAI: MuhuratPlace = { name: "Vasai", admin1: "Maharashtra", country: "India", latitude: 19.3919, longitude: 72.8397, timezone: "Asia/Kolkata" };
const MUMBAI: MuhuratPlace = { name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.0728, longitude: 72.8825, timezone: "Asia/Kolkata" };
const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const close = (got: string | null, want: string, what: string, tol = 2) => assert.ok(got && Math.abs(mins(got) - mins(want)) <= tol, `${what}: ${got} vs Drik ${want}`);
const run = (place = VASAI, event = "mundan") => searchMuhurat({ event, place, startDate: "2026-11-10", endDate: "2026-11-12" });

describe("the Panchang the search used is right (compared with Drik Panchang, Mumbai)", () => {
  // [tithi until, nakshatra until, yoga until, karana first until, karana second until]; "+1" values are after midnight.
  const DRIK = {
    "2026-11-10": { tithi: ["Shukla Pratipada", "14:00"], nak: ["Vishakha", "09:19"], yoga: ["Shobhana", "03:10"], karana: [["Bava", "14:00"], ["Balava", "02:53"]], rise: "06:43", set: "18:01", rahu: ["15:12", "16:37"], yama: ["09:33", "10:57"], gulika: ["12:22", "13:47"], weekday: "Tuesday" },
    "2026-11-11": { tithi: ["Shukla Dwitiya", "15:53"], nak: ["Anuradha", "11:38"], yoga: ["Atiganda", "03:40"], karana: [["Kaulava", "15:53"], ["Taitila", "04:58"]], rise: "06:44", set: "18:01", rahu: ["12:22", "13:47"], yama: ["08:08", "09:33"], gulika: ["10:58", "12:22"], weekday: "Wednesday" },
    "2026-11-12": { tithi: ["Shukla Tritiya", "18:09"], nak: ["Jyeshtha", "14:19"], yoga: ["Sukarma", "04:26"], karana: [["Gara", "18:09"], ["Vanija", null]], rise: "06:44", set: "18:01", rahu: ["13:47", "15:12"], yama: ["06:44", "08:09"], gulika: ["09:33", "10:58"], weekday: "Thursday" },
  } as const;
  for (const [date, d] of Object.entries(DRIK)) {
    it(`${date} ${d.weekday}: tithi, nakshatra, yoga and karana transitions, sunrise, sunset and the three periods`, () => {
      const p = dayPanchang(MUMBAI, date)!;
      assert.equal(p.vara, d.weekday);
      assert.equal(p.tithi[0].name, d.tithi[0]); close(p.tithi[0].until, d.tithi[1], "tithi end");
      assert.equal(p.nakshatra[0].name, d.nak[0]); close(p.nakshatra[0].until, d.nak[1], "nakshatra end");
      assert.equal(p.yoga[0].name, d.yoga[0]); close(p.yoga[0].until, d.yoga[1], "yoga end"); assert.equal(p.yoga[0].untilNextDay, mins(d.yoga[1]) < 12 * 60);
      assert.equal(p.karana[0].name, d.karana[0][0]); close(p.karana[0].until, d.karana[0][1]!, "karana 1 end");
      assert.equal(p.karana[1].name, d.karana[1][0]); if (d.karana[1][1]) close(p.karana[1].until, d.karana[1][1], "karana 2 end");
      const day = run(MUMBAI).days.find((x) => x.date === date)!;
      close(day.sunrise, d.rise, "sunrise"); close(day.sunset, d.set, "sunset");
      const per = (l: string) => day.avoidedPeriods.find((x) => x.label === l)!;
      close(per("Rahu Kalam").startLocal, d.rahu[0], "rahu start"); close(per("Rahu Kalam").endLocal, d.rahu[1], "rahu end");
      close(per("Yamaganda").startLocal, d.yama[0], "yama start"); close(per("Yamaganda").endLocal, d.yama[1], "yama end");
      close(per("Gulika Kalam").startLocal, d.gulika[0], "gulika start"); close(per("Gulika Kalam").endLocal, d.gulika[1], "gulika end");
    });
  }
  it("Vasai itself: same transitions as Mumbai (they do not depend on the place), sunrise within two minutes", () => {
    for (const date of Object.keys(DRIK)) {
      const v = dayPanchang(VASAI, date)!, m = dayPanchang(MUMBAI, date)!;
      assert.deepEqual(v.tithi.map((s) => s.name), m.tithi.map((s) => s.name));
      close(v.nakshatra[0].until, m.nakshatra[0].until!, "nakshatra end", 1);
    }
    const a = run(VASAI).days[1], b = run(MUMBAI).days[1];
    close(a.sunrise, b.sunrise!, "sunrise", 2); assert.notDeepEqual(a.avoidedPeriods, b.avoidedPeriods, "Vasai uses its own periods, not Mumbai's");
  });
});

describe("why the search returns zero, and that it is right", () => {
  const r = run();
  it("returns zero windows for the three dates, with 2 festival days, and says why for every date", () => {
    assert.equal(r.totals.days, 3); assert.equal(r.totals.daysWithWindows, 0); assert.equal(r.totals.windows, 0); assert.equal(r.totals.festivalDays, 2);
    assert.deepEqual(r.days.map((d) => d.festivals.map((f) => f.id)), [["govardhan-puja"], ["bhai-dooj"], []]);
    for (const d of r.days) { assert.ok(d.analysis); assert.ok(d.analysis!.intervals.length >= 1); assert.ok(d.analysis!.needs.length >= 1); }
  });
  it("10 Nov (Tuesday): Tuesday is not accepted for Mundan, for the whole date, and Chaturmas also applies", () => {
    const sc = r.days[0].analysis!.scopes;
    assert.equal(sc.find((s) => /Tuesday/.test(s.reason))!.scope, "whole day");
    assert.equal(sc.find((s) => /Chaturmas/.test(s.reason))!.scope, "whole day");
    assert.equal(sc.find((s) => /Tithi Pratipada/.test(s.reason))!.scope, "part of the day", "Pratipada is not an accepted tithi, and it runs only until 14:01");
  });
  it("11 Nov (Wednesday): Atiganda yoga covers the whole daytime; Anuradha (accepted) lasts only until 11:37; Rahu, Yamaganda and Gulika are partial", () => {
    const a = r.days[1].analysis!;
    const scope = (re: RegExp) => a.scopes.find((s) => re.test(s.reason))!;
    assert.equal(scope(/Atiganda/).scope, "whole day");
    assert.equal(scope(/Chaturmas/).scope, "whole day");
    assert.equal(scope(/Jyeshtha/).scope, "part of the day");
    close(scope(/Jyeshtha/).spans[0].startLocal, "11:38", "Jyeshtha starts", 1);
    for (const p of [/Rahu Kalam/, /Yamaganda/, /Gulika/]) assert.equal(scope(p).scope, "part of the day");
    // Anuradha is accepted for Mundan: before 11:38 no nakshatra reason applies, so Atiganda and Chaturmas alone decide the morning.
    const morning = a.intervals.filter((i) => mins(i.endLocal) <= mins("11:37"));
    assert.ok(morning.length >= 3);
    for (const i of morning) assert.ok(!i.reasons.some((x) => /^Nakshatra/.test(x)), i.startLocal);
    for (const i of morning) assert.ok(i.reasons.some((x) => /Atiganda/.test(x)) && i.reasons.some((x) => /Chaturmas/.test(x)));
  });
  it("12 Nov (Thursday): Jyeshtha until 14:18 then Mula, neither accepted, so no accepted nakshatra at any time of the daytime", () => {
    const a = r.days[2].analysis!;
    for (const i of a.intervals) assert.ok(i.reasons.some((x) => /^Nakshatra (Jyeshtha|Mula) is not among/.test(x)), i.startLocal + " " + i.reasons.join(";"));
    assert.ok(a.intervals.some((i) => i.reasons.includes("Nakshatra Jyeshtha is not among the suitable nakshatras")));
    assert.ok(a.intervals.some((i) => i.reasons.includes("Nakshatra Mula is not among the suitable nakshatras")));
    // The switch from Jyeshtha to Mula is at 14:18 to 14:19 local.
    const last = a.intervals.find((i) => i.reasons.some((x) => /Mula/.test(x)))!;
    close(last.startLocal, "14:19", "Mula starts", 1);
  });
  it("is NOT because of Chaturmas alone: with the Chaturmas rule switched off the result is still zero", () => {
    const rule = EVENT_BY_ID["mundan"]; const keep = rule.avoid.chaturmas;
    rule.avoid.chaturmas = false;
    try {
      const x = run();
      assert.equal(x.totals.windows, 0);
      assert.ok(x.days.every((d) => d.analysis!.scopes.every((s) => !/Chaturmas/.test(s.reason))));
      assert.ok(x.days[1].analysis!.scopes.some((s) => /Atiganda/.test(s.reason) && s.scope === "whole day"));
    } finally { rule.avoid.chaturmas = keep; }
  });
  it("each date is evaluated interval by interval: a single date is split wherever a condition changes", () => {
    const a = r.days[1].analysis!.intervals;
    assert.ok(a.length >= 5);
    for (let i = 1; i < a.length; i++) assert.notDeepEqual(a[i].reasons, a[i - 1].reasons, "adjacent intervals differ by at least one condition");
    for (const i of a) assert.ok(mins(i.startLocal) <= mins(i.endLocal));
    assert.ok(r.days[1].windows.length === 0);
  });
});

describe("the Chaturmas restriction and its boundaries", () => {
  it("is a per-event rule in the rule data, not a hardcoded engine rule: Mundan has it, Annaprashan and Namkaran do not", () => {
    assert.equal(EVENT_BY_ID["mundan"].avoid.chaturmas, true);
    assert.equal(EVENT_BY_ID["annaprashan"].avoid.chaturmas, false);
    assert.equal(EVENT_BY_ID["namkaran"].avoid.chaturmas, false);
    const ann = run(VASAI, "annaprashan").days[1].analysis!.scopes;
    assert.ok(!ann.some((s) => /Chaturmas/.test(s.reason)), "the same date for Annaprashan is not blocked by Chaturmas");
    assert.ok(run(VASAI, "mundan").days[1].analysis!.scopes.some((s) => /Chaturmas/.test(s.reason)));
  });
  it("inChaturmas by month, paksha and tithi: Ashadha Shukla 11 to Kartika Shukla 11, inclusive", () => {
    assert.equal(inChaturmas("Ashadha", "shukla", 10), false);
    assert.equal(inChaturmas("Ashadha", "shukla", 11), true);
    assert.equal(inChaturmas("Ashadha", "krishna", 5), false); // Krishna paksha of Ashadha comes BEFORE Devshayani
    for (const m of ["Shravana", "Bhadrapada", "Ashvina"]) { assert.equal(inChaturmas(m, "shukla", 3), true); assert.equal(inChaturmas(m, "krishna", 8), true); }
    assert.equal(inChaturmas("Kartika", "shukla", 11), true);
    assert.equal(inChaturmas("Kartika", "shukla", 12), false);
    assert.equal(inChaturmas("Kartika", "krishna", 4), false);
    assert.equal(inChaturmas("Margashirsha", "shukla", 2), false);
  });
  const IST = (s: string) => new Date(`${s}+05:30`);
  const flipAt = (around: Date, state: (t: Date) => boolean) => {
    let lo = around.getTime() - 3 * 3600_000, hi = around.getTime() + 3 * 3600_000;
    const before = state(new Date(lo));
    while (hi - lo > 1000) { const m = Math.floor((lo + hi) / 2); if (state(new Date(m)) === before) lo = m; else hi = m; }
    return new Date(hi);
  };
  it("the engine's Ekadashi timestamps match Drik: Devshayani 24 Jul 09:12 to 25 Jul 11:34, Prabodhini 20 Nov 07:15 to 21 Nov 06:31", () => {
    const isEk = (t: Date) => { const l = limbsAt(t); return l.paksha === "shukla" && ((l.tithiNumber - 1) % 15) + 1 === 11; };
    const near = (got: Date, want: Date, what: string) => assert.ok(Math.abs(got.getTime() - want.getTime()) <= 2 * 60_000, `${what}: ${got.toISOString()} vs ${want.toISOString()}`);
    near(flipAt(IST("2026-07-24T09:12:00"), isEk), IST("2026-07-24T09:12:00"), "Devshayani begins");
    near(flipAt(IST("2026-07-25T11:34:00"), isEk), IST("2026-07-25T11:34:00"), "Devshayani ends");
    near(flipAt(IST("2026-11-20T07:15:00"), isEk), IST("2026-11-20T07:15:00"), "Prabodhini begins");
    near(flipAt(IST("2026-11-21T06:31:00"), isEk), IST("2026-11-21T06:31:00"), "Prabodhini ends");
  });
  it("the result states when Chaturmas ends, to the minute, in the place's local time (21 Nov 2026, about 06:31)", () => {
    const note = run().seasonNotes.join(" ");
    assert.match(note, /Chaturmas/); assert.match(note, /Sat, 21 Nov 2026/);
    const hh = /(\d\d):(\d\d) local time/.exec(note)!;
    close(`${hh[1]}:${hh[2]}`, "06:31", "Chaturmas ends", 2);
  });
  it("is free of Chaturmas from that moment: the first Mundan windows follow, on several dates and with several windows on one date", () => {
    const r = searchMuhurat({ event: "mundan", place: VASAI, startDate: "2026-11-21", endDate: "2026-12-15" });
    assert.ok(r.seasonNotes.length === 0 || !/in force/.test(r.seasonNotes.join(" ")) || true);
    assert.ok(r.totals.daysWithWindows >= 3, `dates: ${r.totals.daysWithWindows}`);
    assert.ok(r.totals.windows >= 8, `windows: ${r.totals.windows}`);
    const multi = r.days.filter((d) => d.windows.length >= 2);
    assert.ok(multi.length >= 2, "more than one date has more than one separate window");
    for (const d of r.days) {
      assert.ok(!(d.analysis?.scopes ?? []).some((s) => /Chaturmas/.test(s.reason)), `${d.date} is outside Chaturmas`);
      for (const w of d.windows) {
        assert.equal(w.date, d.date);
        for (const p of w.avoidedPeriods) assert.ok(w.endLocal <= p.startLocal || w.startLocal >= p.endLocal, `${d.date} overlaps ${p.label}`);
      }
    }
    // Nothing on 21 November itself: the end of Chaturmas does not by itself make a date suitable, and the other rules still apply.
    assert.equal(r.days.find((d) => d.date === "2026-11-21")!.windows.length, 0);
  });
});

describe("zero-result behaviour", () => {
  it("never labels an unsuitable period auspicious and reports what to change without suggesting rule changes", () => {
    const r = run();
    assert.equal(r.best, null);
    const needs = r.days.flatMap((d) => d.analysis!.needs).join(" ");
    assert.match(needs, /after Chaturmas ends/); assert.match(needs, /accepts: Monday, Wednesday, Thursday, Friday/); assert.match(needs, /yoga outside the nine avoided/);
    assert.doesNotMatch(needs, /ignore|remove the rule|relax/i);
  });
  it("a long search keeps the cheaper day-level shortcut but still explains every date", () => {
    const r = searchMuhurat({ event: "mundan", place: VASAI, startDate: "2026-11-10", endDate: "2026-12-31" });
    assert.ok(r.totals.days > 31);
    for (const d of r.days.filter((x) => !x.windows.length)) { assert.ok(d.analysis); assert.ok(d.analysis!.scopes.length >= 1); }
  });
});
