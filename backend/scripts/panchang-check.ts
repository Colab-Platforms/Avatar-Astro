/**
 * Cross-checks computePanchang() against widely published festival dates (Delhi, IST).
 * Each festival is defined by (Amanta masa, paksha, tithi); the check passes when that tithi is
 * running at sunrise, noon, sunset, evening or midnight (night festivals) on the published civil date. Run: npx tsx scripts/panchang-check.ts
 */
import { computePanchang } from "../src/modules/gemstone/panchang.js";

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" };

// [name, masa (Amanta), paksha, tithi 1-15, [dates by year]]
const FESTIVALS: [string, string, "shukla" | "krishna", number, string[]][] = [
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

const hm = (s: string | null): { hour: number; minute: number } | null => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return { hour: h, minute: m };
};

let total = 0;
let ok = 0;
const bad: string[] = [];
for (const [name, masa, paksha, tithi, dates] of FESTIVALS) {
  for (const d of dates) {
    total++;
    const rise = computePanchang({ localDate: d, time: null, place: DELHI });
    const set = hm(rise.sunset);
    const times = [hm(rise.sunrise), set, { hour: 12, minute: 0 }, { hour: 23, minute: 30 }, set ? { hour: set.hour + 2, minute: set.minute } : null].filter(Boolean) as { hour: number; minute: number }[];
    const hit = times.some((t) => {
      const p = computePanchang({ localDate: d, time: t, place: DELHI });
      return p.masa.name === masa && !p.masa.adhika && p.paksha === paksha && p.tithi.numberInPaksha === tithi;
    });
    if (hit) ok++;
    else bad.push(`${name} ${d}: got ${rise.masa.name}${rise.masa.adhika ? " (adhika)" : ""} ${rise.paksha} ${rise.tithi.name} at sunrise`);
  }
}
console.log(`matched ${ok}/${total} (${((ok / total) * 100).toFixed(1)}%)`);
for (const b of bad) console.log("MISMATCH", b);
