/**
 * Hindu Panchang for a birth date, time and place — calculated, never looked up.
 *
 * Every element comes from the real Sun and Moon positions (`astronomy-engine`):
 *
 *  - Tithi n spans 12 degrees of Moon-Sun elongation: it begins when the
 *    elongation reaches (n-1)*12 degrees and ends at n*12 degrees. Start and
 *    end are found by searching for those exact crossings.
 *  - Paksha: Shukla while the elongation is below 180 degrees, else Krishna.
 *  - Masa (Amanta, the default): the lunar month runs new moon to new moon and
 *    is named after the sidereal (Lahiri) sign the Sun occupies at its starting
 *    new moon (Meena -> Chaitra, Mesha -> Vaishakha, ...). A month in which
 *    the Sun does not change sign (no sankranti) is Adhika. The Purnimanta
 *    name (the Krishna paksha takes the next month's name) is given beside it.
 *  - Vikram Samvat: Chaitradi, counted from Chaitra Shukla Pratipada
 *    (year = Gregorian year of that Chaitra + 57).
 *  - Nakshatra, pada and Moon Rashi: sidereal (Lahiri) Moon longitude.
 *  - Yoga: (sidereal Sun + Moon longitude) in 13°20' parts. Karana: half-tithis.
 *  - Vara: weekday reckoned from local sunrise.
 *
 * Documented default convention: Amanta months with a Chaitradi Vikram Samvat
 * (the convention of the Drik / astronomical Panchang and of Maharashtra,
 * Karnataka, Andhra and Telangana). The user is not asked to choose.
 *
 * With an unknown birth time the Panchang is reckoned at local sunrise and
 * every element is also sampled across the whole local date; any element that
 * changes during that date is flagged as uncertain.
 *
 * Limitations: kshaya months (about once in 140+ years, last in 1963) are not
 * modelled; a sign boundary within minutes of a new moon can differ from
 * published panchangs because the ayanamsa is the mean Lahiri value.
 */
import * as Astronomy from "astronomy-engine";
import { computePlanets, siderealSunLongitude } from "./chart.engine.js";
import { BirthTimeError, resolveBirthInstant, isValidTimeZone } from "./birth.time.js";
import { sunriseOnLocalDate } from "./date.based.js";
import { nakshatraOf } from "./analysis.js";

export const LUNAR_MONTHS = [
  { name: "Chaitra", hindi: "चैत्र" },
  { name: "Vaishakha", hindi: "वैशाख" },
  { name: "Jyeshtha", hindi: "ज्येष्ठ" },
  { name: "Ashadha", hindi: "आषाढ़" },
  { name: "Shravana", hindi: "श्रावण" },
  { name: "Bhadrapada", hindi: "भाद्रपद" },
  { name: "Ashvina", hindi: "आश्विन" },
  { name: "Kartika", hindi: "कार्तिक" },
  { name: "Margashirsha", hindi: "मार्गशीर्ष" },
  { name: "Pausha", hindi: "पौष" },
  { name: "Magha", hindi: "माघ" },
  { name: "Phalguna", hindi: "फाल्गुन" },
] as const;

const TITHI_NAMES = [
  ["Pratipada", "प्रतिपदा"], ["Dwitiya", "द्वितीया"], ["Tritiya", "तृतीया"], ["Chaturthi", "चतुर्थी"],
  ["Panchami", "पंचमी"], ["Shashthi", "षष्ठी"], ["Saptami", "सप्तमी"], ["Ashtami", "अष्टमी"],
  ["Navami", "नवमी"], ["Dashami", "दशमी"], ["Ekadashi", "एकादशी"], ["Dwadashi", "द्वादशी"],
  ["Trayodashi", "त्रयोदशी"], ["Chaturdashi", "चतुर्दशी"],
] as const;

const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula",
  "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
] as const;

const MOVABLE_KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)"] as const;

export type Paksha = "shukla" | "krishna";

/** Name of tithi `tithi` (1-15) within a paksha; 15 is Purnima (Shukla) or Amavasya (Krishna). */
export const tithiName = (paksha: Paksha, tithi: number): { name: string; hindi: string } => {
  if (tithi === 15) {
    return paksha === "shukla"
      ? { name: "Purnima", hindi: "पूर्णिमा" }
      : { name: "Amavasya", hindi: "अमावस्या" };
  }
  const [name, hindi] = TITHI_NAMES[tithi - 1];
  return { name, hindi };
};

export class PanchangError extends BirthTimeError {}

const MS_DAY = 86_400_000;
const norm = (d: number) => ((d % 360) + 360) % 360;

/* ---------------- lunar month table ---------------- */

interface LunarMonth {
  start: Date;
  end: Date;
  nameIndex: number;
  adhika: boolean;
  vsYear: number;
}

const monthCache = new Map<number, LunarMonth[]>();

/** Amanta lunar months covering Jan (G-1) to Dec (G+2) for Gregorian year G, with Chaitradi years. */
const monthsAround = (gregorianYear: number): LunarMonth[] => {
  const hit = monthCache.get(gregorianYear);
  if (hit) return hit;

  const from = Date.UTC(gregorianYear - 1, 0, 1);
  const to = Date.UTC(gregorianYear + 2, 11, 31);
  const newMoons: Date[] = [];
  let cursor = new Date(from);
  while (cursor.getTime() < to) {
    const t = Astronomy.SearchMoonPhase(0, cursor, 40);
    if (!t) throw new PanchangError("Could not locate lunar months for that year.");
    newMoons.push(t.date);
    cursor = new Date(t.date.getTime() + 20 * MS_DAY);
  }

  const signAt = newMoons.map((d) => Math.floor(siderealSunLongitude(d) / 30));
  const months: LunarMonth[] = [];
  for (let i = 0; i < newMoons.length - 1; i++) {
    months.push({
      start: newMoons[i],
      end: newMoons[i + 1],
      nameIndex: (signAt[i] + 1) % 12,
      adhika: signAt[i] === signAt[i + 1],
      vsYear: 0,
    });
  }

  // The year counter steps up at each Nija Chaitra.
  const anchors = months.map((m, i) => ({ m, i })).filter(({ m }) => m.nameIndex === 0 && !m.adhika);
  if (anchors.length < 2) throw new PanchangError("Could not anchor the Vikram Samvat year.");
  let year = anchors[0].m.start.getUTCFullYear() + 57 - 1;
  for (let i = 0; i < months.length; i++) {
    if (anchors.some((a) => a.i === i)) year = months[i].start.getUTCFullYear() + 57;
    months[i].vsYear = year;
  }
  monthCache.set(gregorianYear, months);
  return months;
};

/* ---------------- one instant ---------------- */

interface Snapshot {
  instant: Date;
  vikramSamvat: number;
  masa: { name: string; hindi: string; adhika: boolean };
  purnimanta: { name: string; hindi: string; adhika: boolean };
  paksha: Paksha;
  tithiNumber: number; // 1-30
  tithiStart: Date;
  tithiEnd: Date;
  nakshatra: { name: string; pada: number; lord: string };
  moonSign: string;
  yoga: string;
  karana: string;
}

const elongationAt = (d: Date): number => norm(Astronomy.MoonPhase(d));

const snapshotAt = (instant: Date): Snapshot => {
  const months = monthsAround(instant.getUTCFullYear());
  const i = months.findIndex((m) => instant >= m.start && instant < m.end);
  if (i < 0) throw new PanchangError("Could not place that instant in a lunar month.");
  const m = months[i];

  const elong = elongationAt(instant);
  const tithiNumber = Math.floor(elong / 12) + 1;
  const paksha: Paksha = tithiNumber <= 15 ? "shukla" : "krishna";

  const startT = Astronomy.SearchMoonPhase(((tithiNumber - 1) * 12) % 360, new Date(instant.getTime() - 2 * MS_DAY), 2);
  const endT = Astronomy.SearchMoonPhase((tithiNumber * 12) % 360, instant, 2);
  if (!startT || !endT) throw new PanchangError("Could not compute the tithi boundaries.");

  // Purnimanta: the Krishna paksha carries the name of the month that follows.
  const next = months[i + 1];
  const pm = paksha === "krishna" && next ? next : m;

  const planets = computePlanets(instant);
  const moon = planets.Moon;
  const nak = nakshatraOf(moon.longitude);
  const yogaIndex = Math.floor(norm(planets.Sun.longitude + moon.longitude) / (360 / 27));
  const karanaIndex = Math.floor(elong / 6); // 0-59
  const karana =
    karanaIndex === 0
      ? "Kimstughna"
      : karanaIndex === 57
        ? "Shakuni"
        : karanaIndex === 58
          ? "Chatushpada"
          : karanaIndex === 59
            ? "Naga"
            : MOVABLE_KARANAS[(karanaIndex - 1) % 7];

  return {
    instant,
    vikramSamvat: m.vsYear,
    masa: { ...LUNAR_MONTHS[m.nameIndex], adhika: m.adhika },
    purnimanta: { ...LUNAR_MONTHS[pm.nameIndex], adhika: pm.adhika },
    paksha,
    tithiNumber,
    tithiStart: startT.date,
    tithiEnd: endT.date,
    nakshatra: { name: nak.name, pada: nak.pada, lord: nak.lord },
    moonSign: moon.sign,
    yoga: YOGAS[yogaIndex],
    karana,
  };
};

/* ---------------- public result ---------------- */

export interface PanchangDetails {
  convention: { id: string; label: string; note: string };
  /** What the Panchang was reckoned at. */
  basis: "birth-time" | "sunrise";
  reckonedAtUtc: string;
  vikramSamvat: number;
  masa: { name: string; hindi: string; adhika: boolean };
  purnimantaMasa: { name: string; hindi: string; adhika: boolean };
  paksha: Paksha;
  tithi: {
    /** 1-30 across the lunar month. */
    number: number;
    /** 1-15 within the paksha. */
    numberInPaksha: number;
    name: string;
    hindi: string;
    startLocal: string;
    endLocal: string;
    startUtc: string;
    endUtc: string;
  };
  nakshatra: { name: string; pada: number; lord: string };
  moonRashi: string;
  yoga: string;
  karana: string;
  vara: { name: string; note: string | null };
  sunrise: string | null;
  sunset: string | null;
  /** True when a time-dependent element could not be fixed (unknown birth time). */
  uncertain: boolean;
  uncertainties: string[];
  notes: string[];
}

const CONVENTION = {
  id: "amanta-chaitradi",
  label: "Amanta months · Vikram Samvat (Chaitradi) · Lahiri sidereal",
  note: "Months run new moon to new moon and the year begins at Chaitra Shukla Pratipada (the Drik / Maharashtra-South convention). The Purnimanta month name is shown beside it.",
};

const localString = (tz: string, at: Date): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);

const localHm = (tz: string, at: Date): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const sunsetOnLocalDate = (date: { year: number; month: number; day: number }, lat: number, lon: number, tz: string): Date | null => {
  const noon = resolveBirthInstant({ ...date, hour: 12, minute: 0 }, tz).utc;
  const t = Astronomy.SearchRiseSet(Astronomy.Body.Sun, new Astronomy.Observer(lat, lon, 0), -1, new Date(noon.getTime() - 6 * 3_600_000), 1);
  return t ? t.date : null;
};

export interface PanchangArgs {
  /** Civil birth date at the birthplace, YYYY-MM-DD. */
  localDate: string;
  /** Local birth time, or null when unknown. */
  time: { hour: number; minute: number } | null;
  place: { latitude: number; longitude: number; timezone: string };
}

export const computePanchang = ({ localDate, time, place }: PanchangArgs): PanchangDetails => {
  const [year, month, day] = localDate.split("-").map(Number);
  const tz = place.timezone;
  if (!isValidTimeZone(tz)) throw new PanchangError("Unrecognised time zone for the selected birthplace.");
  const date = { year, month, day };

  const rise = sunriseOnLocalDate(date, place.latitude, place.longitude, tz);
  const set = sunsetOnLocalDate(date, place.latitude, place.longitude, tz);
  const notes: string[] = [];
  const uncertainties: string[] = [];

  let instant: Date;
  let basis: PanchangDetails["basis"];
  if (time) {
    instant = resolveBirthInstant({ ...date, ...time }, tz).utc;
    basis = "birth-time";
  } else {
    basis = "sunrise";
    instant = rise ?? resolveBirthInstant({ ...date, hour: 12, minute: 0 }, tz).utc;
    notes.push(
      rise
        ? "Birth time is unknown, so the Panchang is reckoned at local sunrise on your birth date (the traditional udaya reckoning)."
        : "Birth time is unknown and no sunrise could be calculated at this latitude, so local noon was used.",
    );

    // Sample the whole local date: anything that changes cannot be fixed without a birth time.
    const start = resolveBirthInstant({ ...date, hour: 0, minute: 0 }, tz).utc;
    const end = resolveBirthInstant({ ...date, hour: 23, minute: 59 }, tz).utc;
    const a = snapshotAt(start);
    const b = snapshotAt(end);
    const pick = (label: string, x: string, y: string) => {
      if (x !== y) uncertainties.push(`${label} changes during this date (${x} to ${y}); the exact value needs your birth time.`);
    };
    pick("Tithi", `${a.paksha} ${a.tithiNumber}`, `${b.paksha} ${b.tithiNumber}`);
    pick("Nakshatra", a.nakshatra.name, b.nakshatra.name);
    if (a.nakshatra.name === b.nakshatra.name && a.nakshatra.pada !== b.nakshatra.pada) {
      uncertainties.push("Nakshatra pada changes during this date; the exact pada needs your birth time.");
    }
    pick("Moon Rashi", a.moonSign, b.moonSign);
    pick("Yoga", a.yoga, b.yoga);
    pick("Karana", a.karana, b.karana);
    if (a.masa.name !== b.masa.name || a.masa.adhika !== b.masa.adhika || a.vikramSamvat !== b.vikramSamvat) {
      uncertainties.push("The Hindu month or Vikram Samvat year changes during this date.");
    }
  }

  const s = snapshotAt(instant);
  const within = ((s.tithiNumber - 1) % 15) + 1;
  const tn = tithiName(s.paksha, within);

  // Vara runs from sunrise to sunrise: before sunrise the previous weekday still holds.
  const civilWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  let varaIndex = civilWeekday;
  let varaNote: string | null = null;
  if (time && rise && instant < rise) {
    varaIndex = (civilWeekday + 6) % 7;
    varaNote = `Born before local sunrise (${localHm(tz, rise)}), so the Vedic weekday is ${WEEKDAYS[varaIndex]}, not ${WEEKDAYS[civilWeekday]}.`;
  } else if (!time) {
    varaNote = "Reckoned from sunrise on the birth date. A birth before sunrise would belong to the previous weekday.";
  }

  return {
    convention: CONVENTION,
    basis,
    reckonedAtUtc: instant.toISOString(),
    vikramSamvat: s.vikramSamvat,
    masa: s.masa,
    purnimantaMasa: s.purnimanta,
    paksha: s.paksha,
    tithi: {
      number: s.tithiNumber,
      numberInPaksha: within,
      name: tn.name,
      hindi: tn.hindi,
      startLocal: localString(tz, s.tithiStart),
      endLocal: localString(tz, s.tithiEnd),
      startUtc: s.tithiStart.toISOString(),
      endUtc: s.tithiEnd.toISOString(),
    },
    nakshatra: s.nakshatra,
    moonRashi: s.moonSign,
    yoga: s.yoga,
    karana: s.karana,
    vara: { name: WEEKDAYS[varaIndex], note: varaNote },
    sunrise: rise ? localHm(tz, rise) : null,
    sunset: set ? localHm(tz, set) : null,
    uncertain: uncertainties.length > 0,
    uncertainties,
    notes,
  };
};
