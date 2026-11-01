/**
 * Independent reference data for Panchang validation.
 *
 * Source: Drik Panchang daily pages (https://www.drikpanchang.com/panchang/day-panchang.html), read on
 * 2026-10-31. Values are exactly as printed on each page: the pages give "upto" (END) times only, in the
 * location's local time (Asia/Kolkata, UTC+05:30 for every case). Entries printed as "upto Full Night" or
 * with no time are omitted, because there is nothing to compare. The page text was fetched through a
 * reading tool, so this data carries the transcription risk of that tool.
 *
 * Coordinates: Delhi uses the values Drik prints for New Delhi (28°38'08"N 77°13'28"E). The other cities use
 * standard city-centre coordinates; Drik's printed coordinates for them were not captured.
 */

export type Element = "tithi" | "nakshatra" | "yoga" | "karana";

export interface RefItem {
  element: Element;
  /** Name as printed by Drik. */
  name: string;
  /** End of that item, local time "YYYY-MM-DD HH:mm". */
  end: string;
}

export interface RefCase {
  id: string;
  /** Why this case is in the set. */
  covers: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
  url: string;
  sunrise: string;
  sunset: string;
  amanta: { month: string; adhika: boolean };
  purnimanta: { month: string; adhika: boolean };
  paksha: "shukla" | "krishna";
  /** Vikram Samvat as printed in the page header. */
  vikramSamvat: number;
  items: RefItem[];
}

const DELHI = { city: "New Delhi", latitude: 28.6356, longitude: 77.2244, timezone: "Asia/Kolkata" };
const MUMBAI = { city: "Mumbai", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" };
const CHENNAI = { city: "Chennai", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata" };
const KOLKATA = { city: "Kolkata", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata" };
const BENGALURU = { city: "Bengaluru", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata" };

const D = "https://www.drikpanchang.com/panchang/day-panchang.html";
const it = (element: Element, name: string, end: string): RefItem => ({ element, name, end });

export const REFERENCE_CASES: RefCase[] = [
  {
    id: "delhi-2025-10-25", covers: "tithi change after midnight (03:48 next day)", ...DELHI, date: "2025-10-25",
    url: `${D}?date=25/10/2025`, sunrise: "06:28", sunset: "17:42",
    amanta: { month: "Kartika", adhika: false }, purnimanta: { month: "Kartika", adhika: false }, paksha: "shukla", vikramSamvat: 2082,
    items: [it("tithi", "Chaturthi", "2025-10-26 03:48"), it("nakshatra", "Anuradha", "2025-10-25 07:51"), it("karana", "Vanija", "2025-10-25 14:34"), it("karana", "Vishti", "2025-10-26 03:48")],
  },
  {
    id: "delhi-2025-03-29", covers: "last day of Vikram Samvat 2081; Amanta Phalguna vs Purnimanta Chaitra; nakshatra and yoga in the evening; karana after midnight", ...DELHI, date: "2025-03-29",
    url: `${D}?date=29/03/2025`, sunrise: "06:15", sunset: "18:37",
    amanta: { month: "Phalguna", adhika: false }, purnimanta: { month: "Chaitra", adhika: false }, paksha: "krishna", vikramSamvat: 2081,
    items: [it("tithi", "Amavasya", "2025-03-29 16:27"), it("nakshatra", "Uttara Bhadrapada", "2025-03-29 19:26"), it("yoga", "Brahma", "2025-03-29 22:04"), it("karana", "Nagava", "2025-03-29 16:27"), it("karana", "Kinstughna", "2025-03-30 02:39")],
  },
  {
    id: "delhi-2025-03-30", covers: "Vikram Samvat transition: Chaitra Shukla Pratipada, VS 2082", ...DELHI, date: "2025-03-30",
    url: `${D}?date=30/03/2025`, sunrise: "06:13", sunset: "18:38",
    amanta: { month: "Chaitra", adhika: false }, purnimanta: { month: "Chaitra", adhika: false }, paksha: "shukla", vikramSamvat: 2082,
    items: [it("tithi", "Pratipada", "2025-03-30 12:49"), it("nakshatra", "Revati", "2025-03-30 16:35"), it("yoga", "Indra", "2025-03-30 17:54"), it("karana", "Bava", "2025-03-30 12:49"), it("karana", "Balava", "2025-03-30 22:59")],
  },
  {
    id: "delhi-2025-04-13", covers: "Sankranti eve; Purnimanta month already Vaishakha while Amanta is Chaitra", ...DELHI, date: "2025-04-13",
    url: `${D}?date=13/04/2025`, sunrise: "05:58", sunset: "18:46",
    amanta: { month: "Chaitra", adhika: false }, purnimanta: { month: "Vaishakha", adhika: false }, paksha: "krishna", vikramSamvat: 2082,
    items: [it("nakshatra", "Chitra", "2025-04-13 21:11"), it("yoga", "Harshana", "2025-04-13 21:40"), it("karana", "Balava", "2025-04-13 19:08")],
  },
  {
    id: "delhi-2025-04-14", covers: "Mesha Sankranti day; nakshatra change just after midnight (00:13)", ...DELHI, date: "2025-04-14",
    url: `${D}?date=14/04/2025`, sunrise: "05:57", sunset: "18:46",
    amanta: { month: "Chaitra", adhika: false }, purnimanta: { month: "Vaishakha", adhika: false }, paksha: "krishna", vikramSamvat: 2082,
    items: [it("tithi", "Pratipada", "2025-04-14 08:25"), it("nakshatra", "Swati", "2025-04-15 00:13"), it("yoga", "Vajra", "2025-04-14 22:39"), it("karana", "Kaulava", "2025-04-14 08:25"), it("karana", "Taitila", "2025-04-14 21:40")],
  },
  {
    id: "delhi-2023-07-18", covers: "Adhika month: Adhika Shravana, VS 2080", ...DELHI, date: "2023-07-18",
    url: `${D}?date=18/07/2023`, sunrise: "05:35", sunset: "19:20",
    amanta: { month: "Shravana", adhika: true }, purnimanta: { month: "Shravana", adhika: true }, paksha: "shukla", vikramSamvat: 2080,
    items: [it("tithi", "Pratipada", "2023-07-19 02:09"), it("yoga", "Harshana", "2023-07-18 09:37"), it("karana", "Kinstughna", "2023-07-18 13:03"), it("karana", "Bava", "2023-07-19 02:09")],
  },
  {
    id: "delhi-2023-08-17", covers: "end of the Adhika period: Nija Shravana begins", ...DELHI, date: "2023-08-17",
    url: `${D}?date=17/08/2023`, sunrise: "05:51", sunset: "18:59",
    amanta: { month: "Shravana", adhika: false }, purnimanta: { month: "Shravana", adhika: false }, paksha: "shukla", vikramSamvat: 2080,
    items: [it("tithi", "Pratipada", "2023-08-17 17:35"), it("nakshatra", "Magha", "2023-08-17 19:58"), it("yoga", "Parigha", "2023-08-17 19:30"), it("karana", "Bava", "2023-08-17 17:35")],
  },
  {
    id: "delhi-2026-05-17", covers: "Adhika month: Adhika Jyeshtha, VS 2083", ...DELHI, date: "2026-05-17",
    url: `${D}?date=17/05/2026`, sunrise: "05:29", sunset: "19:06",
    amanta: { month: "Jyeshtha", adhika: true }, purnimanta: { month: "Jyeshtha", adhika: true }, paksha: "shukla", vikramSamvat: 2083,
    items: [it("tithi", "Pratipada", "2026-05-17 21:40"), it("nakshatra", "Krittika", "2026-05-17 14:32"), it("yoga", "Shobhana", "2026-05-17 06:15"), it("yoga", "Atiganda", "2026-05-18 02:00"), it("karana", "Kinstughna", "2026-05-17 11:36"), it("karana", "Bava", "2026-05-17 21:40")],
  },
  {
    id: "delhi-2024-03-08", covers: "night festival (Maha Shivaratri); yoga ends after midnight", ...DELHI, date: "2024-03-08",
    url: `${D}?date=08/03/2024`, sunrise: "06:38", sunset: "18:25",
    amanta: { month: "Magha", adhika: false }, purnimanta: { month: "Phalguna", adhika: false }, paksha: "krishna", vikramSamvat: 2080,
    items: [it("tithi", "Trayodashi", "2024-03-08 21:57"), it("nakshatra", "Shravana", "2024-03-08 10:41"), it("yoga", "Shiva", "2024-03-09 00:46"), it("karana", "Garaja", "2024-03-08 11:41"), it("karana", "Vanija", "2024-03-08 21:57")],
  },
  {
    id: "mumbai-2025-08-27", covers: "Mumbai: Ganesh Chaturthi", ...MUMBAI, date: "2025-08-27",
    url: `${D}?geoname-id=1275339&date=27/08/2025`, sunrise: "06:22", sunset: "18:57",
    amanta: { month: "Bhadrapada", adhika: false }, purnimanta: { month: "Bhadrapada", adhika: false }, paksha: "shukla", vikramSamvat: 2082,
    items: [it("tithi", "Chaturthi", "2025-08-27 15:44"), it("yoga", "Shubha", "2025-08-27 12:35"), it("karana", "Vishti", "2025-08-27 15:44"), it("karana", "Bava", "2025-08-28 04:48")],
  },
  {
    id: "mumbai-2025-01-14", covers: "Mumbai: Makar Sankranti day; tithi and yoga change after midnight", ...MUMBAI, date: "2025-01-14",
    url: `${D}?geoname-id=1275339&date=14/01/2025`, sunrise: "07:15", sunset: "18:21",
    amanta: { month: "Pausha", adhika: false }, purnimanta: { month: "Magha", adhika: false }, paksha: "krishna", vikramSamvat: 2081,
    items: [it("tithi", "Pratipada", "2025-01-15 03:21"), it("nakshatra", "Punarvasu", "2025-01-14 10:17"), it("yoga", "Vishkambha", "2025-01-15 02:59"), it("karana", "Balava", "2025-01-14 15:34"), it("karana", "Kaulava", "2025-01-15 03:21")],
  },
  {
    id: "mumbai-2026-03-19", covers: "Mumbai: day before Gudi Padwa; Vikram Samvat 2083 begins as Pratipada starts at 06:52, minutes after sunrise (06:44)", ...MUMBAI, date: "2026-03-19",
    url: `${D}?geoname-id=1275339&date=19/03/2026`, sunrise: "06:44", sunset: "18:49",
    amanta: { month: "Phalguna", adhika: false }, purnimanta: { month: "Chaitra", adhika: false }, paksha: "krishna", vikramSamvat: 2083,
    items: [it("tithi", "Amavasya", "2026-03-19 06:52"), it("tithi", "Pratipada", "2026-03-20 04:52"), it("nakshatra", "Uttara Bhadrapada", "2026-03-20 04:05"), it("yoga", "Shukla", "2026-03-20 01:17"), it("karana", "Nagava", "2026-03-19 06:52"), it("karana", "Kinstughna", "2026-03-19 17:55"), it("karana", "Bava", "2026-03-20 04:52")],
  },
  {
    id: "chennai-2025-10-21", covers: "Chennai: Diwali Amavasya", ...CHENNAI, date: "2025-10-21",
    url: `${D}?geoname-id=1264527&date=21/10/2025`, sunrise: "06:00", sunset: "17:47",
    amanta: { month: "Ashvina", adhika: false }, purnimanta: { month: "Kartika", adhika: false }, paksha: "krishna", vikramSamvat: 2082,
    items: [it("tithi", "Amavasya", "2025-10-21 17:54"), it("nakshatra", "Chitra", "2025-10-21 22:59"), it("yoga", "Vishkambha", "2025-10-22 03:17"), it("karana", "Nagava", "2025-10-21 17:54")],
  },
  {
    id: "chennai-2025-07-17", covers: "Chennai: around Karka Sankranti (16 July); nakshatra ends after midnight", ...CHENNAI, date: "2025-07-17",
    url: `${D}?geoname-id=1264527&date=17/07/2025`, sunrise: "05:51", sunset: "18:39",
    amanta: { month: "Ashadha", adhika: false }, purnimanta: { month: "Shravana", adhika: false }, paksha: "krishna", vikramSamvat: 2082,
    items: [it("tithi", "Saptami", "2025-07-17 19:08"), it("nakshatra", "Revati", "2025-07-18 03:39"), it("yoga", "Atiganda", "2025-07-17 09:29"), it("karana", "Vishti", "2025-07-17 08:07"), it("karana", "Bava", "2025-07-17 19:08")],
  },
  {
    id: "kolkata-2025-10-20", covers: "Kolkata: day before Amavasya; yoga and karana change after midnight", ...KOLKATA, date: "2025-10-20",
    url: `${D}?geoname-id=1275004&date=20/10/2025`, sunrise: "05:35", sunset: "17:07",
    amanta: { month: "Ashvina", adhika: false }, purnimanta: { month: "Kartika", adhika: false }, paksha: "krishna", vikramSamvat: 2082,
    items: [it("tithi", "Chaturdashi", "2025-10-20 15:44"), it("nakshatra", "Hasta", "2025-10-20 20:17"), it("yoga", "Vaidhriti", "2025-10-21 02:35"), it("karana", "Shakuni", "2025-10-20 15:44"), it("karana", "Chatushpada", "2025-10-21 04:47")],
  },
  {
    id: "kolkata-2025-11-05", covers: "Kolkata: Kartik Purnima; Purnima ends 18:48", ...KOLKATA, date: "2025-11-05",
    url: `${D}?geoname-id=1275004&date=05/11/2025`, sunrise: "05:43", sunset: "16:57",
    amanta: { month: "Kartika", adhika: false }, purnimanta: { month: "Kartika", adhika: false }, paksha: "shukla", vikramSamvat: 2082,
    items: [it("tithi", "Purnima", "2025-11-05 18:48"), it("nakshatra", "Ashwini", "2025-11-05 09:40"), it("yoga", "Siddhi", "2025-11-05 11:28"), it("karana", "Vishti", "2025-11-05 08:44"), it("karana", "Bava", "2025-11-05 18:48"), it("karana", "Balava", "2025-11-06 04:51")],
  },
  {
    id: "bengaluru-2025-04-06", covers: "Bengaluru: Ram Navami", ...BENGALURU, date: "2025-04-06",
    url: `${D}?geoname-id=1277333&date=06/04/2025`, sunrise: "06:13", sunset: "18:31",
    amanta: { month: "Chaitra", adhika: false }, purnimanta: { month: "Chaitra", adhika: false }, paksha: "shukla", vikramSamvat: 2082,
    items: [it("tithi", "Navami", "2025-04-06 19:23"), it("yoga", "Sukarma", "2025-04-06 18:55"), it("karana", "Balava", "2025-04-06 07:19"), it("karana", "Kaulava", "2025-04-06 19:22")],
  },
];
