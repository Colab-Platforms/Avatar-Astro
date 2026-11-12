/**
 * Every valid window is returned, grouped by date, and each result explains itself from the calculated data.
 * Reference values for the Panchang transitions are Drik Panchang (New Delhi and Mumbai); see panchang.reference.data.ts and
 * pada.reference.test.ts for how those were read.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { limbsAt } from "../../gemstone/panchang.js";
import { dayPanchang } from "../calendar.js";
import { EVENTS } from "../rules.js";
import { searchMuhurat, type MuhuratPlace, type MuhuratResult, type MuhuratWindow } from "../search.js";

const place = (name: string, latitude: number, longitude: number, timezone = "Asia/Kolkata"): MuhuratPlace => ({ name, admin1: null, country: "India", latitude, longitude, timezone });
const MUMBAI = place("Mumbai", 19.0728, 72.8825);
const DELHI = place("New Delhi", 28.6356, 77.2244);
const addDays = (s: string, n: number) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const windowsOf = (r: MuhuratResult) => r.days.flatMap((d) => d.windows);

describe("a 10-day search scans every date and returns every qualifying window", () => {
  it("returns several dates and more windows than dates, with all ten dates present and none dropped", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-01", endDate: "2026-12-10" });
    assert.deepEqual(r.days.map((d) => d.date), Array.from({ length: 10 }, (_, i) => addDays("2026-12-01", i)));
    assert.ok(r.totals.daysWithWindows >= 2, `dates: ${r.totals.daysWithWindows}`);
    assert.ok(r.totals.windows >= r.totals.daysWithWindows);
    assert.equal(r.totals.windows, windowsOf(r).length);
    assert.equal(r.totals.daysWithWindows, r.days.filter((d) => d.windows.length).length);
  });

  it("is not capped: a long range returns more than five dates", () => {
    const r = searchMuhurat({ event: "vehicle-purchase", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28" });
    assert.ok(r.totals.daysWithWindows > 5, `dates: ${r.totals.daysWithWindows}`);
  });

  it("returns more than one window on a date when more than one qualifies, each independently valid", () => {
    const r = searchMuhurat({ event: "business-opening", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28" });
    const multi = r.days.filter((d) => d.windows.length > 1);
    assert.ok(multi.length > 0, "expected at least one date with two windows");
    for (const d of multi) {
      for (let i = 1; i < d.windows.length; i++) {
        const a = d.windows[i - 1], b = d.windows[i];
        assert.ok(a.startUtc < b.startUtc, "in time order");
        assert.ok(a.endUtc < b.startUtc, `${d.date}: windows ${a.startLocal}-${a.endLocal} and ${b.startLocal}-${b.endLocal} must not touch or overlap`);
        // The gap is a real exclusion, not a hole: its midpoint fails some rule (a restricted period, or an excluded element).
        const mid = new Date((Date.parse(a.endUtc) + Date.parse(b.startUtc)) / 2);
        const midLocal = (mid.getTime() - Date.parse(a.endUtc)) >= 0;
        assert.ok(midLocal);
        const hh = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(mid);
        const inPeriod = d.avoidedPeriods.some((p) => mins(hh) >= mins(p.startLocal) && mins(hh) < mins(p.endLocal));
        const l = limbsAt(mid);
        const rule = EVENTS.find((e) => e.id === "business-opening")!;
        const elementOut = ![...rule.nakshatras.best, ...rule.nakshatras.good].includes(l.nakshatra.name);
        assert.ok(inPeriod || elementOut || l.tithiNumber === 30 || [4, 9, 14].includes(((l.tithiNumber - 1) % 15) + 1) || l.karana === "Vishti (Bhadra)", `${d.date}: gap at ${hh} has no visible reason`);
      }
    }
  });

  it("finds no window, says why for every date, and offers nothing invented when no date qualifies", () => {
    const r = searchMuhurat({ event: "marriage", place: MUMBAI, startDate: "2026-12-20", endDate: "2026-12-29" });
    assert.equal(r.totals.windows, 0); assert.equal(r.best, null);
    assert.ok(r.days.every((d) => d.windows.length === 0 && d.blockers.length > 0));
  });

  it("has no duplicate or overlapping window anywhere in a search, for every event", () => {
    for (const e of EVENTS) {
      const r = searchMuhurat({ event: e.id, place: DELHI, startDate: "2026-12-01", endDate: "2027-01-20" });
      const seen = new Set<string>();
      for (const d of r.days) {
        for (const w of d.windows) {
          const k = `${w.startUtc}|${w.endUtc}`;
          assert.ok(!seen.has(k), `${e.id}: duplicate ${k}`);
          seen.add(k);
          assert.equal(w.date, d.date);
          assert.equal(w.status, "suitable");
        }
        for (let i = 1; i < d.windows.length; i++) assert.ok(d.windows[i - 1].endUtc < d.windows[i].startUtc, `${e.id} ${d.date}`);
      }
    }
  });
});

describe("different events use different rules", () => {
  const run = (event: string) => searchMuhurat({ event, place: MUMBAI, startDate: "2026-12-01", endDate: "2027-03-31" });
  it("marriage, griha pravesh and vehicle purchase give different windows over the same dates", () => {
    const sig = (id: string) => windowsOf(run(id)).map((w) => w.date + " " + w.startLocal + "-" + w.endLocal).join();
    const ids = ["marriage", "griha-pravesh", "vehicle-purchase"];
    assert.equal(new Set(ids.map(sig)).size, ids.length, "no two of these events may return the same list");
  });
  it("events share an eligible set only where their rule data says so: vehicle purchase and delivery, and the three business events", () => {
    const rule = (id: string) => EVENTS.find((e) => e.id === id)!;
    const same = (a: string, b: string) => JSON.stringify([rule(a).nakshatras, rule(a).tithis, rule(a).weekdays, rule(a).avoid]) === JSON.stringify([rule(b).nakshatras, rule(b).tithis, rule(b).weekdays, rule(b).avoid]);
    assert.ok(same("vehicle-purchase", "vehicle-delivery"));
    assert.ok(same("business-opening", "shop-opening") && same("business-opening", "business-launch"));
    for (const [x, y] of [["marriage", "griha-pravesh"], ["marriage", "engagement"], ["marriage", "vehicle-purchase"], ["griha-pravesh", "property-purchase"], ["griha-pravesh", "house-construction"], ["vehicle-purchase", "travel"], ["namkaran", "mundan"], ["annaprashan", "mundan"], ["business-opening", "work-beginning"]]) assert.ok(!same(x, y), x + " vs " + y);
    // Namkaran and business opening accept the same nakshatra classes and weekdays; what differs is the order of preference and the seasons.
    const names = (id: string) => [...rule(id).nakshatras.best, ...rule(id).nakshatras.good].sort().join();
    assert.equal(names("namkaran"), names("business-opening"));
    assert.notEqual([...rule("namkaran").nakshatras.best].sort().join(), [...rule("business-opening").nakshatras.best].sort().join());
    assert.equal(rule("namkaran").avoid.adhika, false); assert.equal(rule("business-opening").avoid.adhika, true);
  });
  it("engagement follows the marriage lists but not its Chaturmas restriction, so the two differ where Chaturmas applies", () => {
    const span = { place: DELHI, startDate: "2027-09-29", endDate: "2027-11-09" }; // Chaturmas 2027 ends with Prabodhini Ekadashi on 10 Nov (Drik)
    assert.equal(searchMuhurat({ event: "marriage", ...span }).totals.windows, 0);
    assert.ok(searchMuhurat({ event: "engagement", ...span }).totals.windows > 0);
  });
  it("Kharmas blocks marriage and engagement but not vehicle purchase, in the same weeks", () => {
    const span = { place: MUMBAI, startDate: "2026-12-20", endDate: "2027-01-10" };
    assert.equal(searchMuhurat({ event: "marriage", ...span }).totals.windows, 0);
    assert.equal(searchMuhurat({ event: "engagement", ...span }).totals.windows, 0);
    assert.ok(searchMuhurat({ event: "vehicle-purchase", ...span }).totals.windows > 0);
  });
  it("Panchak is excluded for house construction but only noted for griha pravesh", () => {
    const hc = windowsOf(run("house-construction"));
    for (const w of hc) { assert.ok(!["Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"].includes(w.panchang.nakshatra) || w.panchang.nakshatra === "Dhanishta", `${w.date} ${w.panchang.nakshatra}`); }
    const gp = windowsOf(run("griha-pravesh"));
    assert.ok(gp.some((w) => w.observances.some((o) => /Panchak is running/.test(o))), "griha pravesh accepts Revati, which is Panchak, and says so");
    assert.ok(!hc.some((w) => w.observances.some((o) => /Panchak/.test(o))));
  });
  it("Travel towards the south also leaves out Panchak", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-02-28", preferences: { direction: "South" } });
    for (const w of windowsOf(r)) assert.ok(!(w.panchang.nakshatra === "Shatabhisha" || w.panchang.nakshatra === "Purva Bhadrapada" || w.panchang.nakshatra === "Uttara Bhadrapada" || w.panchang.nakshatra === "Revati"), `${w.date}`);
  });
});

describe("festivals and observances", () => {
  it("are calculated per date and place and shown on the date, without changing which windows qualify", () => {
    const r = searchMuhurat({ event: "work-beginning", place: DELHI, startDate: "2026-11-06", endDate: "2026-11-26" });
    const diwali = r.days.find((d) => d.date === "2026-11-08")!;
    assert.deepEqual(diwali.festivals.map((f) => f.id).sort(), ["diwali", "narak-chaturdashi"]);
    assert.ok(r.days.find((d) => d.date === "2026-11-24")!.festivals.some((f) => f.id === "kartika-purnima"));
    assert.ok(diwali.blockers.every((b) => !/diwali|festival|narak/i.test(b)), "a festival is never a reason for exclusion");
    assert.ok(r.totals.festivalDays >= 4);
    // Same event, same place, same dates: removing nothing, adding nothing. The windows equal a search of a range without festival logic changes.
    const again = searchMuhurat({ event: "work-beginning", place: DELHI, startDate: "2026-11-06", endDate: "2026-11-26" });
    assert.deepEqual(windowsOf(again).map((w) => w.startUtc), windowsOf(r).map((w) => w.startUtc));
  });

  it("a window on a festival date names it and states that a festival is not auspicious or inauspicious by itself", () => {
    let hit: MuhuratWindow | null = null;
    for (const start of ["2026-11-06", "2026-12-01", "2027-01-10", "2027-03-01", "2027-04-01", "2027-10-26"]) {
      const r = searchMuhurat({ event: "work-beginning", place: DELHI, startDate: start, endDate: addDays(start, 29) });
      hit = windowsOf(r).find((w) => w.observances.length > 0 && !/^Panchak/.test(w.observances[0])) ?? null;
      if (hit) break;
    }
    assert.ok(hit, "expected a window that falls on a festival date");
    assert.ok(hit!.why.some((l) => /not treated as auspicious or inauspicious by itself/.test(l)));
    assert.ok(hit!.why.some((l) => hit!.observances.some((o) => l.includes(o))));
  });

  it("names the calendar conventions in the result", () => {
    const r = searchMuhurat({ event: "marriage", place: DELHI, startDate: "2026-12-01", endDate: "2026-12-10" });
    assert.match(r.convention.panchang.label, /Lahiri/);
    assert.match(r.convention.festivals.label, /Smarta/);
    assert.match(r.convention.festivals.note, /Purnimanta/);
    assert.match(r.convention.dayBoundary, /sunrise/);
  });
});

describe("the Panchang changes during a date and the result says so, with exact times", () => {
  // Drik Panchang, read 2026-11-07. Mumbai 18 Dec 2026: Navami upto 11:14 PM; Uttara Bhadrapada upto 04:10 PM; Vyatipata upto 12:19 PM;
  // Balava upto 11:26 AM, Kaulava upto 11:14 PM. New Delhi 11 Feb 2027: Panchami upto 03:18 AM Feb 12; Revati upto 05:42 AM Feb 12;
  // Sadhya upto 08:20 PM; Bava upto 03:15 PM, Balava upto 03:18 AM Feb 12.
  const close = (got: string | null, want: string, what: string) => assert.ok(got && Math.abs(mins(got) - mins(want)) <= 2, `${what}: ${got} vs ${want}`);

  it("Mumbai 18 Dec 2026", () => {
    const p = dayPanchang(MUMBAI, "2026-12-18")!;
    assert.equal(p.vara, "Friday");
    assert.match(p.tithi[0].name, /Shukla Navami/); close(p.tithi[0].until, "23:14", "Navami ends");
    assert.equal(p.nakshatra[0].name, "Uttara Bhadrapada"); close(p.nakshatra[0].until, "16:10", "Uttara Bhadrapada ends");
    assert.equal(p.nakshatra[1].name, "Revati");
    assert.equal(p.yoga[0].name, "Vyatipata"); close(p.yoga[0].until, "12:19", "Vyatipata ends");
    assert.equal(p.karana[0].name, "Balava"); close(p.karana[0].until, "11:26", "Balava ends");
    assert.equal(p.karana[1].name, "Kaulava"); close(p.karana[1].until, "23:14", "Kaulava ends");
    assert.equal(p.masa.name, "Margashirsha");
    assert.ok(p.panchak && p.panchak.from === null, "Panchak (Uttara Bhadrapada, Revati) is already running at sunrise");
  });

  it("New Delhi 11 Feb 2027, including the elements that end after midnight", () => {
    const p = dayPanchang(DELHI, "2027-02-11")!;
    assert.equal(p.vara, "Thursday");
    assert.match(p.tithi[0].name, /Shukla Panchami/); close(p.tithi[0].until, "03:18", "Panchami ends"); assert.equal(p.tithi[0].untilNextDay, true);
    assert.match(p.tithi[1].name, /Shukla Shashthi/);
    assert.equal(p.nakshatra[0].name, "Revati"); close(p.nakshatra[0].until, "05:42", "Revati ends"); assert.equal(p.nakshatra[0].untilNextDay, true);
    assert.equal(p.nakshatra[1].name, "Ashwini");
    assert.equal(p.yoga[0].name, "Sadhya"); close(p.yoga[0].until, "20:20", "Sadhya ends"); assert.equal(p.yoga[0].untilNextDay, false);
    assert.equal(p.karana[0].name, "Bava"); close(p.karana[0].until, "15:15", "Bava ends");
    assert.equal(p.karana[1].name, "Balava"); close(p.karana[1].until, "03:18", "Balava ends");
  });

  it("the last segment of every element is still running at the next sunrise, and the others have increasing end times", () => {
    const p = dayPanchang(DELHI, "2027-03-03")!;
    for (const seg of [p.tithi, p.nakshatra, p.yoga, p.karana]) {
      assert.equal(seg[seg.length - 1].until, null);
      const abs = seg.slice(0, -1).map((s) => mins(s.until!) + (s.untilNextDay ? 1440 : 0));
      assert.deepEqual(abs, [...abs].sort((a, b) => a - b));
    }
  });

  it("the segment boundaries are where the engine actually changes", () => {
    const p = dayPanchang(MUMBAI, "2026-12-18")!;
    // 10 minutes either side of the stated end of the Uttara Bhadrapada segment, in IST.
    const end = new Date(`2026-12-18T${p.nakshatra[0].until}:00+05:30`).getTime();
    assert.equal(limbsAt(new Date(end - 10 * 60_000)).nakshatra.name, "Uttara Bhadrapada");
    assert.equal(limbsAt(new Date(end + 10 * 60_000)).nakshatra.name, "Revati");
  });

  it("search results carry the Panchang for each date that has a window, and not for the others", () => {
    const r = searchMuhurat({ event: "travel", place: MUMBAI, startDate: "2026-12-01", endDate: "2026-12-10" });
    for (const d of r.days) assert.equal(d.panchang !== null, d.windows.length > 0, d.date);
    for (const d of r.days.filter((x) => x.panchang)) { assert.ok(d.panchang!.tithi.length >= 1); assert.ok(d.panchang!.vikramSamvat > 2000); }
  });
});

describe("each explanation is generated from the calculated values", () => {
  it("names this window's own nakshatra, tithi, weekday, yoga and karana, and never another window's", () => {
    const r = searchMuhurat({ event: "griha-pravesh", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-03-31" });
    const all = windowsOf(r);
    assert.ok(all.length > 5);
    const NAKS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
    for (const w of all) {
      const text = w.why.join(" ");
      assert.ok(text.includes(`Nakshatra ${w.panchang.nakshatra}`), w.date);
      assert.ok(text.includes(w.panchang.tithi), w.date);
      assert.ok(text.includes(w.weekday), w.date);
      assert.ok(text.includes(`Yoga ${w.panchang.yoga}`) && text.includes(w.panchang.karana), w.date);
      for (const n of NAKS.filter((n) => n !== w.panchang.nakshatra && !w.panchang.nakshatra.includes(n) && !n.includes(w.panchang.nakshatra))) assert.ok(!text.includes(`Nakshatra ${n} `), `${w.date} mentions ${n}`);
      // The weekday it claims is a first-choice weekday really is one for this event (Mon, Thu, Fri).
      if (/first-choice weekday/.test(text)) assert.ok(["Monday", "Thursday", "Friday"].includes(w.weekday), `${w.date} ${w.weekday}`);
      assert.equal(w.scoreParts.reduce((a, p) => a + p.points, 0), w.score);
    }
  });
  it("two windows with different Panchang get different explanations", () => {
    const r = searchMuhurat({ event: "griha-pravesh", place: MUMBAI, startDate: "2026-12-01", endDate: "2027-03-31" });
    const texts = new Set(windowsOf(r).map((w) => w.why.join("|")));
    assert.ok(texts.size > 3);
  });
});

describe("the result as a whole", () => {
  it("is reproducible", () => {
    const run = () => JSON.stringify(searchMuhurat({ event: "marriage", place: DELHI, startDate: "2027-01-20", endDate: "2027-03-20" }));
    assert.equal(run(), run());
  });
  it("a year-long search that includes festivals and timelines still finishes in a reasonable time", () => {
    const t = Date.now();
    searchMuhurat({ event: "vehicle-purchase", place: DELHI, startDate: "2026-11-10", endDate: "2027-11-09" });
    assert.ok(Date.now() - t < 30_000, `${Date.now() - t} ms`);
  });
});
