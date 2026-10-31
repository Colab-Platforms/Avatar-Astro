/**
 * Records every case of the existing festival check (scripts/panchang-check.ts, left untouched) with the
 * expected and actual values, to docs/panchang-validation/festival-67.json.
 * The list below is a copy of the one in panchang-check.ts. Run: npx tsx scripts/panchang-record.ts
 *
 * Reference: widely published festival dates, recalled by the author, NOT read from an official source.
 * That is why these 67 results are reported separately from the Drik Panchang comparison.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { computePanchang } from "../src/modules/gemstone/panchang.js";

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };
type P = "shukla" | "krishna";
const FESTIVALS: [string, string, P, number, string[]][] = [
  ["Ram Navami", "Chaitra", "shukla", 9, ["2019-04-13", "2020-04-02", "2021-04-21", "2022-04-10", "2023-03-30", "2024-04-17", "2025-04-06"]],
  ["Akshaya Tritiya", "Vaishakha", "shukla", 3, ["2019-05-07", "2020-04-26", "2021-05-14", "2022-05-03", "2023-04-22", "2024-05-10", "2025-04-30"]],
  ["Buddha Purnima", "Vaishakha", "shukla", 15, ["2019-05-18", "2020-05-07", "2021-05-26", "2022-05-16", "2023-05-05", "2024-05-23", "2025-05-12"]],
  ["Guru Purnima", "Ashadha", "shukla", 15, ["2019-07-16", "2020-07-05", "2021-07-24", "2022-07-13", "2023-07-03", "2024-07-21", "2025-07-10"]],
  ["Raksha Bandhan", "Shravana", "shukla", 15, ["2019-08-15", "2020-08-03", "2021-08-22", "2022-08-11", "2023-08-30", "2024-08-19", "2025-08-09"]],
  ["Ganesh Chaturthi", "Bhadrapada", "shukla", 4, ["2019-09-02", "2020-08-22", "2021-09-10", "2022-08-31", "2023-09-19", "2024-09-07", "2025-08-27"]],
  ["Dussehra", "Ashvina", "shukla", 10, ["2019-10-08", "2020-10-25", "2021-10-15", "2022-10-05", "2023-10-24", "2024-10-12", "2025-10-02"]],
  ["Diwali (Amavasya)", "Ashvina", "krishna", 15, ["2020-11-14", "2021-11-04", "2022-10-24", "2023-11-12"]],
  ["Maha Shivaratri", "Magha", "krishna", 14, ["2019-03-04", "2020-02-21", "2021-03-11", "2022-03-01", "2023-02-18", "2024-03-08", "2025-02-26"]],
  ["Holi (Purnima)", "Phalguna", "shukla", 15, ["2019-03-20", "2020-03-09", "2021-03-28", "2022-03-17", "2023-03-07", "2024-03-24", "2025-03-13"]],
];

const hm = (s: string | null) => (s ? { hour: Number(s.split(":")[0]), minute: Number(s.split(":")[1]) } : null);

const rows: Record<string, unknown>[] = [];
for (const [name, masa, paksha, tithi, dates] of FESTIVALS) {
  for (const date of dates) {
    const rise = computePanchang({ localDate: date, time: null, place: DELHI });
    const set = hm(rise.sunset);
    const times = [
      { label: "sunrise", t: hm(rise.sunrise) },
      { label: "sunset", t: set },
      { label: "12:00", t: { hour: 12, minute: 0 } },
      { label: "23:30", t: { hour: 23, minute: 30 } },
      { label: "sunset+2h", t: set ? { hour: set.hour + 2, minute: set.minute } : null },
    ];
    let matchedAt: string | null = null;
    let actual = "";
    for (const { label, t } of times) {
      if (!t) continue;
      const p = computePanchang({ localDate: date, time: t, place: DELHI });
      const a = `${p.masa.adhika ? "Adhika " : ""}${p.masa.name} ${p.paksha} ${p.tithi.name} (${p.tithi.numberInPaksha})`;
      if (label === "sunrise") actual = a;
      if (!matchedAt && p.masa.name === masa && !p.masa.adhika && p.paksha === paksha && p.tithi.numberInPaksha === tithi) matchedAt = label;
    }
    rows.push({ festival: name, date, location: "New Delhi, Asia/Kolkata", expected: `${masa} ${paksha} tithi ${tithi}`, actualAtSunrise: actual, matchedAt, pass: matchedAt !== null });
  }
}
const passed = rows.filter((r) => r.pass).length;
console.log(`recorded ${rows.length} cases, ${passed} pass`);
mkdirSync("docs/panchang-validation", { recursive: true });
writeFileSync("docs/panchang-validation/festival-67.json", JSON.stringify({ note: "Reference dates are recalled published festival dates, not an official source. Pass = expected tithi runs at sunrise, noon, sunset, sunset+2h or 23:30 on that civil date.", total: rows.length, passed, cases: rows }, null, 2));
