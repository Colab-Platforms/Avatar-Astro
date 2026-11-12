/**
 * Festival dates checked against Drik Panchang, New Delhi (28.6356 N, 77.2244 E; Asia/Kolkata).
 *
 * Reference: Drik Panchang "Indian calendar" pages, read 2026-11-10
 *   https://www.drikpanchang.com/calendars/indian/indiancalendar.html?year=2026   (1 Jan to 31 Dec 2026)
 *   https://www.drikpanchang.com/calendars/indian/indiancalendar.html?year=2027   (whole year)
 *   https://www.drikpanchang.com/calendars/indian/indiancalendar.html?year=2028   (1 Jan to 2 Nov 2028, verbatim)
 * Dates are exactly as printed (the pages show month labels in the North Indian Purnimanta style). The pages were read through a
 * fetching tool, so the data carries that tool's transcription risk. For "Rama Navami" the Smarta entry is used. "Sharad Navratri
 * begins" is not printed by Drik; its date is taken from "Maharaja Agrasen Jayanti", which Drik labels "Ashwina, Shukla Pratipada".
 *
 * The test compares EVERY date the engine reports in the whole period with this list, so a missing date AND an extra date both fail.
 * Festivals that could not be reproduced (Holika Dahan and Holi, Janmashtami, Dhanteras, Ekadashi, Purnima and Amavasya vrat days)
 * are deliberately NOT in the module, and none of them may appear in its output.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FESTIVALS, FestivalCalendar } from "../festivals.js";
import { addDays } from "../sun.js";

const DELHI = { latitude: 28.6356, longitude: 77.2244, timezone: "Asia/Kolkata" };
const FROM = "2026-01-01", TO = "2028-11-02";

export const DRIK_DELHI: Record<string, string[]> = {
  "makar-sankranti": ["2026-01-14", "2027-01-15", "2028-01-15"],
  "vasant-panchami": ["2026-01-23", "2027-02-11", "2028-01-31"],
  "maha-shivaratri": ["2026-02-15", "2027-03-06", "2028-02-23"],
  ugadi: ["2026-03-19", "2027-04-07", "2028-03-27"],
  "rama-navami": ["2026-03-26", "2027-04-15", "2028-04-03"],
  "buddha-purnima": ["2026-05-01", "2027-05-20", "2028-05-08"],
  "guru-purnima": ["2026-07-29", "2027-07-18", "2028-07-06"],
  "raksha-bandhan": ["2026-08-28", "2027-08-17", "2028-08-05"],
  "ganesh-chaturthi": ["2026-09-14", "2027-09-04", "2028-08-23"],
  navratri: ["2026-10-11", "2027-09-30", "2028-09-19"],
  dussehra: ["2026-10-20", "2027-10-09", "2028-09-27"],
  "karwa-chauth": ["2026-10-29", "2027-10-18", "2028-10-07"],
  "narak-chaturdashi": ["2026-11-08", "2027-10-28", "2028-10-17"],
  diwali: ["2026-11-08", "2027-10-29", "2028-10-17"],
  "govardhan-puja": ["2026-11-10", "2027-10-30", "2028-10-18"],
  "bhai-dooj": ["2026-11-11", "2027-10-31", "2028-10-19"],
  chhath: ["2026-11-15", "2027-11-04", "2028-10-23"],
  "kartika-purnima": ["2026-11-24", "2027-11-14", "2028-11-02"],
};

describe("festival dates reproduce Drik Panchang for New Delhi, 2026 to 2028", () => {
  const cal = new FestivalCalendar(DELHI);
  const found = new Map<string, string[]>();
  const names = new Map<string, string>();
  for (let d = FROM; d <= TO; d = addDays(d, 1)) for (const f of cal.on(d)) { found.set(f.id, [...(found.get(f.id) ?? []), d]); names.set(f.id, f.name); }

  for (const [id, dates] of Object.entries(DRIK_DELHI)) {
    it(`${id}: ${dates.join(", ")}`, () => assert.deepEqual(found.get(id) ?? [], dates));
  }
  it("reports nothing that is not in the verified list (no Holi, Janmashtami, Ekadashi, Purnima or Amavasya vrat days)", () => {
    assert.deepEqual([...found.keys()].filter((k) => !(k in DRIK_DELHI)), []);
  });
  it("every festival the module defines (plus Sankranti and Raksha Bandhan) has reference dates", () => {
    for (const f of FESTIVALS) assert.ok(f.id in DRIK_DELHI, f.id);
  });
  it("a festival carries a name and the rule that placed it", () => {
    for (const id of Object.keys(DRIK_DELHI)) assert.ok(names.get(id)!.length > 3);
    const day = cal.on("2026-11-08");
    assert.ok(day.some((f) => f.id === "diwali" && /Amavasya/.test(f.note) && /pradosha/.test(f.note)));
  });
});

describe("festival handling is place-specific and never overrides the Muhurat rules", () => {
  it("Diwali 2026 falls on the same civil date in Delhi and Mumbai, and is derived at each place", () => {
    const m = new FestivalCalendar({ latitude: 19.0728, longitude: 72.8825, timezone: "Asia/Kolkata" });
    assert.ok(m.on("2026-11-08").some((f) => f.id === "diwali"));
    assert.ok(!m.on("2026-11-07").some((f) => f.id === "diwali"));
  });
  it("festivals in an Adhika month are not listed (2026 has Adhika Jyeshtha)", () => {
    const c = new FestivalCalendar(DELHI);
    // Between 17 May and 15 June 2026 the month is Adhika, so no Jyeshtha festival is reported.
    for (let d = "2026-05-17"; d <= "2026-06-15"; d = addDays(d, 1)) assert.deepEqual(c.on(d), [], d);
  });
});
