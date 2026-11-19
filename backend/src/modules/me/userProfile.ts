/**
 * Central user profile: one copy of the person's own astrology details, reused by every feature.
 * Pure functions only (no database, no Express) so the rules can be unit-tested directly.
 *
 * Nothing here guesses: a field that was never given stays null, and an update that supplies a
 * partial birthplace (a name without coordinates, say) is rejected instead of half-saved.
 */

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "ta", "te", "gu", "bn", "kn", "ml", "pa"] as const;

export const CENTRAL_PROFILE_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phoneNo: true, gender: true,
  dateOfBirth: true, birthTime: true, birthTimeUnknown: true,
  birthPlaceName: true, birthPlaceRegion: true, birthPlaceCountry: true,
  birthLatitude: true, birthLongitude: true, birthTimezone: true,
  preferredLanguage: true, birthDetailsUpdatedAt: true,
} as const;

export interface CentralProfileRow {
  id: string; firstName: string | null; lastName: string | null; email: string; phoneNo: string | null; gender: string | null;
  dateOfBirth: Date | null; birthTime: string | null; birthTimeUnknown: boolean;
  birthPlaceName: string | null; birthPlaceRegion: string | null; birthPlaceCountry: string | null;
  birthLatitude: number | null; birthLongitude: number | null; birthTimezone: string | null;
  preferredLanguage: string | null; birthDetailsUpdatedAt: Date | null;
}

export interface BirthPlace { name: string; admin1: string | null; country: string | null; latitude: number; longitude: number; timezone: string }

export interface CentralProfile {
  fullName: string;
  firstName: string | null; lastName: string | null; email: string; phone: string | null; gender: string | null;
  /** YYYY-MM-DD, the calendar date as entered (no time-zone shifting). */
  dateOfBirth: string | null;
  /** "HH:mm" local clock time at the birthplace; null when unknown or never given. */
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthPlace: BirthPlace | null;
  preferredLanguage: string | null;
  birthDetailsUpdatedAt: string | null;
}

/** Date-only columns are written as UTC midnight, so the UTC date parts are the entered date. */
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export function toCentralProfile(row: CentralProfileRow): CentralProfile {
  const place: BirthPlace | null =
    row.birthPlaceName && row.birthLatitude != null && row.birthLongitude != null && row.birthTimezone
      ? { name: row.birthPlaceName, admin1: row.birthPlaceRegion, country: row.birthPlaceCountry, latitude: row.birthLatitude, longitude: row.birthLongitude, timezone: row.birthTimezone }
      : null;
  return {
    fullName: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phoneNo, gender: row.gender,
    dateOfBirth: dateOnly(row.dateOfBirth),
    birthTime: row.birthTime,
    birthTimeUnknown: row.birthTimeUnknown,
    birthPlace: place,
    preferredLanguage: row.preferredLanguage,
    birthDetailsUpdatedAt: row.birthDetailsUpdatedAt ? row.birthDetailsUpdatedAt.toISOString() : null,
  };
}

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max) : "";

const isRealDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const isTimeZone = (tz: string): boolean => {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
};

/** Columns this update may write. Only keys the client actually sent are present. */
export interface BirthProfileUpdate {
  dateOfBirth?: Date | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  birthPlaceName?: string | null;
  birthPlaceRegion?: string | null;
  birthPlaceCountry?: string | null;
  birthLatitude?: number | null;
  birthLongitude?: number | null;
  birthTimezone?: string | null;
  preferredLanguage?: string | null;
}

export type ValidationResult = { ok: true; data: BirthProfileUpdate; fields: string[] } | { ok: false; errors: Record<string, string> };

const has = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Validates a partial update of the birth details. `today` is injectable for tests.
 * - dateOfBirth: "YYYY-MM-DD", a real calendar date, 1900 up to today; null clears it.
 * - birthTime: "HH:mm" (24h); null clears it. birthTimeUnknown=true always clears the time.
 * - birthPlace: all of name, latitude, longitude and timezone, or null to clear it.
 * - preferredLanguage: one of the supported locales; null clears it.
 */
export function validateBirthProfileUpdate(body: unknown, today: Date = new Date()): ValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const data: BirthProfileUpdate = {};
  const errors: Record<string, string> = {};

  if (has(b, "dateOfBirth")) {
    if (b.dateOfBirth === null || b.dateOfBirth === "") data.dateOfBirth = null;
    else if (typeof b.dateOfBirth !== "string" || !isRealDate(b.dateOfBirth)) errors.dateOfBirth = "Enter a valid date of birth (YYYY-MM-DD).";
    else {
      const d = new Date(`${b.dateOfBirth}T00:00:00.000Z`);
      const endOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      if (d.getUTCFullYear() < 1900) errors.dateOfBirth = "Date of birth cannot be before 1900.";
      else if (d.getTime() > endOfToday) errors.dateOfBirth = "Date of birth cannot be in the future.";
      else data.dateOfBirth = d;
    }
  }

  const unknown = has(b, "birthTimeUnknown") ? b.birthTimeUnknown === true : undefined;
  if (has(b, "birthTimeUnknown") && typeof b.birthTimeUnknown !== "boolean") errors.birthTimeUnknown = "birthTimeUnknown must be true or false.";
  if (unknown !== undefined && !errors.birthTimeUnknown) data.birthTimeUnknown = unknown;

  if (has(b, "birthTime")) {
    if (b.birthTime === null || b.birthTime === "") data.birthTime = null;
    else if (typeof b.birthTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.birthTime)) errors.birthTime = "Enter the birth time as HH:mm (24-hour).";
    else data.birthTime = b.birthTime;
  }
  // "Time unknown" and a stored time cannot both be true.
  if (data.birthTimeUnknown === true) data.birthTime = null;
  else if (data.birthTime && has(b, "birthTime")) data.birthTimeUnknown = false;

  if (has(b, "birthPlace")) {
    const p = b.birthPlace as Record<string, unknown> | null;
    if (p === null) {
      Object.assign(data, { birthPlaceName: null, birthPlaceRegion: null, birthPlaceCountry: null, birthLatitude: null, birthLongitude: null, birthTimezone: null });
    } else if (!p || typeof p !== "object") {
      errors.birthPlace = "Choose your birthplace from the suggestions.";
    } else {
      const name = clean(p.name, 120);
      const lat = typeof p.latitude === "number" ? p.latitude : NaN;
      const lon = typeof p.longitude === "number" ? p.longitude : NaN;
      const tz = clean(p.timezone, 64);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || !tz) errors.birthPlace = "Choose your birthplace from the suggestions (name, coordinates and time zone are all needed).";
      else if (lat < -90 || lat > 90 || lon < -180 || lon > 180) errors.birthPlace = "The birthplace coordinates are out of range.";
      else if (!isTimeZone(tz)) errors.birthPlace = "The birthplace time zone is not valid.";
      else Object.assign(data, { birthPlaceName: name, birthPlaceRegion: clean(p.admin1, 120) || null, birthPlaceCountry: clean(p.country, 120) || null, birthLatitude: lat, birthLongitude: lon, birthTimezone: tz });
    }
  }

  if (has(b, "preferredLanguage")) {
    if (b.preferredLanguage === null || b.preferredLanguage === "") data.preferredLanguage = null;
    else if (typeof b.preferredLanguage !== "string" || !(SUPPORTED_LANGUAGES as readonly string[]).includes(b.preferredLanguage)) errors.preferredLanguage = "That language is not supported.";
    else data.preferredLanguage = b.preferredLanguage;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  const fields = Object.keys(data);
  if (fields.length === 0) return { ok: false, errors: { _: "No editable fields supplied." } };
  return { ok: true, data, fields };
}
