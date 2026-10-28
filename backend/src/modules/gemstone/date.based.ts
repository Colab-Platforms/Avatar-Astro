/**
 * Birth-Date & Place Gemstone Method — used only when the exact birth time is
 * unknown. No Ascendant, houses or Lagna lord are calculated or implied.
 *
 * Rule (traditional weekday-ruler convention): the planet that rules the local
 * weekday of birth selects the gemstone traditionally associated with it.
 *   Sunday–Sun–Ruby, Monday–Moon–Pearl, Tuesday–Mars–Red Coral,
 *   Wednesday–Mercury–Emerald, Thursday–Jupiter–Yellow Sapphire,
 *   Friday–Venus–Diamond/White Sapphire, Saturday–Saturn–Blue Sapphire.
 *
 * The weekday comes from the calendar date as written at the birthplace, so
 * it never depends on the UTC date. The birthplace and its (historical) time
 * zone are used for two real calculations: which planetary signs stay
 * unchanged across that local day, and the local sunrise of that date.
 */
import * as Astronomy from "astronomy-engine";
import { resolveBirthInstant, type LocalDateTime } from "./birth.time.js";
import { stableSignsForDate, type StableSign } from "./limited.chart.js";
import {
  STONE_FOR_PLANET,
  WEEKDAYS,
  WEEKDAY_LORD,
  type GemstoneInfo,
  type Planet,
  type Sign,
} from "./gemstone.catalogue.js";

type LocalDate = Pick<LocalDateTime, "year" | "month" | "day">;

export interface WeekdayRow {
  weekday: string;
  planet: Planet;
  stone: string;
}

export const WEEKDAY_TABLE: WeekdayRow[] = WEEKDAYS.map((weekday, i) => ({
  weekday,
  planet: WEEKDAY_LORD[i],
  stone: STONE_FOR_PLANET[WEEKDAY_LORD[i]].name,
}));

export interface DateBasedSelection {
  localDate: string; // "Saturday, 5 May 1990"
  weekday: string;
  weekdayIndex: number;
  weekdayLord: Planet;
  stone: GemstoneInfo;
  /** The exact rule applied, in words. */
  rule: string;
  /** Sign of the weekday lord, only if it did not change during the local date. */
  weekdayLordSign: Sign | null;
  stableSigns: StableSign[];
  sunrise: { local: string; timeZone: string } | null;
  classicalNote: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar arithmetic on the local date; no time zone or UTC clock is involved. */
export const localWeekdayIndex = (d: LocalDate): number =>
  new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();

const longDate = (d: LocalDate, weekday: string) =>
  `${weekday}, ${d.day} ${
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.month - 1]
  } ${d.year}`;

const localYmd = (tz: string, at: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);

const localHm = (tz: string, at: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

/** The Sun's rise that falls on the given local calendar date, or null (e.g. polar day/night). */
export const sunriseOnLocalDate = (
  date: LocalDate,
  latitude: number,
  longitude: number,
  timeZone: string,
): Date | null => {
  const target = `${date.year}-${pad(date.month)}-${pad(date.day)}`;
  const noon = resolveBirthInstant({ ...date, hour: 12, minute: 0 }, timeZone).utc;
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  let cursor = new Date(noon.getTime() - 36 * 3_600_000);
  for (let i = 0; i < 4; i++) {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, cursor, 2);
    if (!rise) return null;
    const ymd = localYmd(timeZone, rise.date);
    if (ymd === target) return rise.date;
    if (ymd > target) return null;
    cursor = new Date(rise.date.getTime() + 60_000);
  }
  return null;
};

export const selectByBirthDate = (
  date: LocalDate,
  place: { latitude: number; longitude: number; timezone: string },
): DateBasedSelection => {
  // Validates the date (1800..today, real calendar day) and the time zone.
  resolveBirthInstant({ ...date, hour: 12, minute: 0 }, place.timezone);

  const weekdayIndex = localWeekdayIndex(date);
  const weekday = WEEKDAYS[weekdayIndex];
  const weekdayLord = WEEKDAY_LORD[weekdayIndex];
  const stone = STONE_FOR_PLANET[weekdayLord];

  const stableSigns = stableSignsForDate(date, place.timezone);
  const weekdayLordSign = stableSigns.find((s) => s.planet === weekdayLord)?.sign ?? null;

  const rise = sunriseOnLocalDate(date, place.latitude, place.longitude, place.timezone);
  const prevIndex = (weekdayIndex + 6) % 7;
  const classicalNote = rise
    ? `Classical Vedic reckoning begins each weekday at local sunrise, which was ${localHm(place.timezone, rise)} at your birthplace on that date. If you were born before then, strict reckoning would count the previous weekday, ${WEEKDAYS[prevIndex]} (${WEEKDAY_LORD[prevIndex]}). Because your birth time is unknown, this method uses the local calendar weekday.`
    : `Classical Vedic reckoning begins each weekday at local sunrise. A sunrise could not be calculated at your birthplace's latitude on that date, so this method uses the local calendar weekday.`;

  return {
    localDate: longDate(date, weekday),
    weekday,
    weekdayIndex,
    weekdayLord,
    stone,
    rule: `Weekday-ruler rule: the planet ruling the local weekday of birth gives the gemstone traditionally associated with that planet. ${weekday} is ruled by ${weekdayLord}, whose traditional gemstone is ${stone.name}.`,
    weekdayLordSign,
    stableSigns,
    sunrise: rise ? { local: localHm(place.timezone, rise), timeZone: place.timezone } : null,
    classicalNote,
  };
};
