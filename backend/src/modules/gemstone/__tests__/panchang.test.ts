import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePanchang, tithiName } from "../panchang.js";

const IST = { latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
const NYC = { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" };
const minutesBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 60000;

const at = (localDate: string, hour: number, minute: number, place = IST) =>
  computePanchang({ localDate, time: { hour, minute }, place });

describe("Panchang calculated from the date, time and place (published festival dates)", () => {
  test("Ram Navami 2025: 6 Apr 2025 noon is Chaitra Shukla Navami, VS 2082", () => {
    const p = at("2025-04-06", 12, 0);
    assert.equal(p.vikramSamvat, 2082);
    assert.equal(p.masa.name, "Chaitra");
    assert.equal(p.masa.adhika, false);
    assert.equal(p.paksha, "shukla");
    assert.equal(p.tithi.name, "Navami");
    assert.equal(p.tithi.numberInPaksha, 9);
    // Drik Panchang: 5 Apr 19:26 IST to 6 Apr 19:22 IST
    assert.ok(minutesBetween(p.tithi.startUtc, "2025-04-05T13:56:00Z") < 20, p.tithi.startUtc);
    assert.ok(minutesBetween(p.tithi.endUtc, "2025-04-06T13:52:00Z") < 20, p.tithi.endUtc);
    assert.equal(p.uncertain, false);
    assert.equal(p.basis, "birth-time");
  });

  test("the same date is a different tithi before and after the boundary", () => {
    // Navami ends about 19:22 IST on 6 Apr 2025.
    assert.equal(at("2025-04-06", 18, 0).tithi.name, "Navami");
    assert.equal(at("2025-04-06", 21, 0).tithi.name, "Dashami");
  });

  test("Diwali 2025: Amanta Ashvina Amavasya, Purnimanta Kartika", () => {
    const p = at("2025-10-20", 19, 0);
    assert.equal(p.masa.name, "Ashvina");
    assert.equal(p.purnimantaMasa.name, "Kartika");
    assert.equal(p.paksha, "krishna");
    assert.equal(p.tithi.name, "Amavasya");
    assert.equal(p.tithi.number, 30);
    assert.equal(p.vikramSamvat, 2082);
  });

  test("Amanta and Purnimanta agree in Shukla paksha and differ in Krishna paksha", () => {
    const shukla = at("2025-04-06", 12, 0);
    assert.equal(shukla.purnimantaMasa.name, shukla.masa.name);
    const krishna = at("2025-08-16", 18, 0); // Janmashtami: Amanta Shravana, Purnimanta Bhadrapada
    assert.equal(krishna.masa.name, "Shravana");
    assert.equal(krishna.purnimantaMasa.name, "Bhadrapada");
    assert.equal(krishna.tithi.name, "Ashtami");
    assert.equal(krishna.paksha, "krishna");
  });

  test("Holi 2025: Phalguna Purnima, still VS 2081 (year changes at Chaitra)", () => {
    const p = at("2025-03-14", 10, 0);
    assert.equal(p.masa.name, "Phalguna");
    assert.equal(p.tithi.name, "Purnima");
    assert.equal(p.vikramSamvat, 2081);
    assert.equal(at("2025-03-31", 10, 0).vikramSamvat, 2082); // Chaitra Shukla 3
  });

  test("Adhika month: 20 Jul 2023 is Adhika Shravana, 20 Aug 2023 is Nija Shravana", () => {
    const a = at("2023-07-20", 12, 0);
    const n = at("2023-08-20", 12, 0);
    assert.equal(a.masa.name, "Shravana");
    assert.equal(a.masa.adhika, true);
    assert.equal(n.masa.name, "Shravana");
    assert.equal(n.masa.adhika, false);
    assert.equal(a.vikramSamvat, 2080);
  });

  test("Nakshatra, pada, Moon Rashi, yoga and karana come from the real Moon and Sun", () => {
    // 15 Aug 1947 00:00 Delhi: Moon in Pushya (see analysis tests), sidereal Cancer.
    const p = at("1947-08-15", 0, 0);
    assert.equal(p.nakshatra.name, "Pushya");
    assert.equal(p.moonRashi, "Cancer");
    assert.ok(p.nakshatra.pada >= 1 && p.nakshatra.pada <= 4);
    assert.ok(p.yoga.length > 0 && p.karana.length > 0);
  });
});

describe("local time zone and vara", () => {
  test("the same civil date and clock time give different tithi in different places", () => {
    // 12:00 on 6 Apr: Delhi is in Navami (ends 19:22 IST); 12:00 EDT is 21:30 IST, already Dashami.
    assert.equal(at("2025-04-06", 12, 0).tithi.name, "Navami");
    assert.equal(at("2025-04-06", 12, 0, NYC).tithi.name, "Dashami");
  });

  test("tithi boundaries are expressed in the birthplace's local time", () => {
    const d = at("2025-04-06", 12, 0);
    const n = at("2025-04-06", 12, 0, NYC);
    assert.notEqual(d.tithi.startLocal, n.tithi.startLocal);
  });

  test("vara follows sunrise: a pre-dawn birth belongs to the previous weekday", () => {
    const early = at("2025-04-06", 3, 0); // Sunday 3am, before sunrise
    assert.equal(early.vara.name, "Saturday");
    assert.match(early.vara.note ?? "", /before local sunrise/);
    assert.equal(at("2025-04-06", 12, 0).vara.name, "Sunday");
    assert.ok(early.sunrise && early.sunset);
  });

  test("tithi always lasts between about 19 and 27 hours", () => {
    for (let d = 1; d <= 28; d++) {
      const p = at(`2025-04-${String(d).padStart(2, "0")}`, 12, 0);
      const hours = (Date.parse(p.tithi.endUtc) - Date.parse(p.tithi.startUtc)) / 3_600_000;
      assert.ok(hours > 18 && hours < 27.5, `day ${d}: ${hours}h`);
    }
  });
});

describe("unknown birth time", () => {
  test("is reckoned at sunrise and marks changing elements as uncertain", () => {
    // 6 Apr 2025: the tithi changes (Navami to Dashami) during the day.
    const p = computePanchang({ localDate: "2025-04-06", time: null, place: IST });
    assert.equal(p.basis, "sunrise");
    assert.equal(p.tithi.name, "Navami");
    assert.equal(p.uncertain, true);
    assert.ok(p.uncertainties.some((u) => /^Tithi changes/.test(u)), p.uncertainties.join("|"));
    assert.ok(p.notes.some((n) => /unknown/.test(n)));
  });

  test("every uncertainty names a real time-dependent element", () => {
    const p = computePanchang({ localDate: "2025-04-07", time: null, place: IST });
    for (const u of p.uncertainties) {
      assert.match(u, /Tithi|Nakshatra|Moon Rashi|Yoga|Karana|Hindu month/);
    }
  });

  test("tithiName handles Purnima and Amavasya", () => {
    assert.equal(tithiName("shukla", 15).name, "Purnima");
    assert.equal(tithiName("krishna", 15).name, "Amavasya");
    assert.equal(tithiName("shukla", 1).hindi, "प्रतिपदा");
  });
});
