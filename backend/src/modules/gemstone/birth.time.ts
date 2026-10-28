/**
 * Converts a birthplace-local wall-clock time into a UTC instant using the
 * IANA time zone of the birthplace (historical offsets and DST come from the
 * runtime's ICU time-zone database). Nothing is guessed: a time that never
 * existed (DST gap) is rejected, and an ambiguous time (DST overlap) is
 * resolved to the earlier instant and reported to the caller.
 */

export interface LocalDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

export interface ResolvedBirthInstant {
  utc: Date;
  /** Offset from UTC in minutes for the resolved instant (e.g. 330 for IST). */
  offsetMinutes: number;
  ambiguous: boolean;
}

export class BirthTimeError extends Error {}

export const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return typeof tz === "string" && tz.length > 0 && tz.length < 64;
  } catch {
    return false;
  }
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (tz: string) => {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatterCache.set(tz, f);
  }
  return f;
};

/** Offset (ms) of `tz` from UTC at the given instant, including seconds. */
export const zoneOffsetMs = (tz: string, at: Date): number => {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(tz).formatToParts(at)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // Drop sub-second part of `at` so the difference is a whole offset.
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
};

export const validateLocalDateTime = (v: LocalDateTime): void => {
  const { year, month, day, hour, minute } = v;
  if (![year, month, day, hour, minute].every(Number.isInteger)) {
    throw new BirthTimeError("Date and time must be whole numbers.");
  }
  if (year < 1800 || year > new Date().getUTCFullYear()) {
    throw new BirthTimeError("Birth year must be between 1800 and today.");
  }
  if (month < 1 || month > 12 || day < 1 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new BirthTimeError("Invalid date or time.");
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new BirthTimeError("That calendar date does not exist.");
  }
  if (probe.getTime() > Date.now()) {
    throw new BirthTimeError("Birth date cannot be in the future.");
  }
};

export const resolveBirthInstant = (
  local: LocalDateTime,
  timeZone: string,
): ResolvedBirthInstant => {
  validateLocalDateTime(local);
  if (!isValidTimeZone(timeZone)) {
    throw new BirthTimeError("Unrecognised time zone for the selected birthplace.");
  }

  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // Offsets in effect shortly before and after the wall time bracket any
  // transition; each candidate is verified by round-tripping.
  const DAY = 86_400_000;
  const offsets = new Set<number>([
    zoneOffsetMs(timeZone, new Date(wall - DAY)),
    zoneOffsetMs(timeZone, new Date(wall)),
    zoneOffsetMs(timeZone, new Date(wall + DAY)),
  ]);

  const matches: { utc: Date; offset: number }[] = [];
  for (const off of offsets) {
    const candidate = new Date(wall - off);
    if (zoneOffsetMs(timeZone, candidate) === off) {
      if (!matches.some((m) => m.utc.getTime() === candidate.getTime())) {
        matches.push({ utc: candidate, offset: off });
      }
    }
  }

  if (matches.length === 0) {
    throw new BirthTimeError(
      "That local time did not exist at the birthplace (clock change). Please check the birth time.",
    );
  }
  matches.sort((a, b) => a.utc.getTime() - b.utc.getTime());
  const chosen = matches[0];
  return {
    utc: chosen.utc,
    offsetMinutes: Math.round(chosen.offset / 60000),
    ambiguous: matches.length > 1,
  };
};
