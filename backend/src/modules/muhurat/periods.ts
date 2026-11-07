/**
 * Daytime periods used by Muhurat Finder. Pure arithmetic on the real local sunrise and sunset.
 *
 * Rahu Kalam, Yamaganda and Gulika Kalam: the daytime (local sunrise to local sunset) is divided into eight equal
 * parts; each weekday gives each of the three periods one fixed part. The part tables below are the widely published
 * Panchang convention (the same one printed by Drik Panchang and Tamil/Telugu Panchangams). They are NOT clock times:
 * the periods move with the actual sunrise and sunset of the event location on that date.
 *
 * Abhijit Muhurta: the 8th of the 15 equal daytime muhurtas, centred on local solar midday. It is shown for information
 * only and is not used to include or exclude a window.
 *
 * Dishashool (direction ill-omen), used only for Travel when a direction is given: the direction to avoid on each weekday.
 */

/** Index 0 = Sunday ... 6 = Saturday. Value = which eighth of the day (1 = the first, after sunrise). */
export const RAHU_PART = [8, 2, 7, 5, 6, 4, 3] as const;
export const YAMAGANDA_PART = [5, 4, 3, 2, 1, 7, 6] as const;
export const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1] as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Direction that is unfavourable to start a journey towards, by weekday (Sunday first). */
export const DISHASHOOL = ["West", "East", "North", "North", "South", "West", "East"] as const;
export type Direction = "North" | "South" | "East" | "West";

export interface Period {
  start: Date;
  end: Date;
}

const eighth = (rise: Date, set: Date, part: number): Period => {
  const len = (set.getTime() - rise.getTime()) / 8;
  return { start: new Date(rise.getTime() + (part - 1) * len), end: new Date(rise.getTime() + part * len) };
};

export interface DayPeriods {
  rahuKalam: Period;
  yamaganda: Period;
  gulika: Period;
  abhijit: Period;
}

export const periodsFor = (weekdayIndex: number, rise: Date, set: Date): DayPeriods => {
  const day = set.getTime() - rise.getTime();
  return {
    rahuKalam: eighth(rise, set, RAHU_PART[weekdayIndex]),
    yamaganda: eighth(rise, set, YAMAGANDA_PART[weekdayIndex]),
    gulika: eighth(rise, set, GULIKA_PART[weekdayIndex]),
    abhijit: { start: new Date(rise.getTime() + (day * 7) / 15), end: new Date(rise.getTime() + (day * 8) / 15) },
  };
};

export const inPeriod = (t: Date, p: Period): boolean => t >= p.start && t < p.end;
