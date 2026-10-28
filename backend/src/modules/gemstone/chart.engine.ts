/**
 * Sidereal birth-chart engine for Ratna Jyotish.
 *
 * Method (documented, reproducible):
 *  - Planet positions: `astronomy-engine` (geocentric, with aberration).
 *  - Zodiac: sidereal, Lahiri (Chitrapaksha) ayanamsa, mean value.
 *    Lahiri ayanamsa at J2000.0 = 23.85306° (23°51'11"), advanced with IAU
 *    general precession in longitude. This matches published Lahiri values
 *    to within about 0.01°.
 *  - Rahu/Ketu: mean lunar node (Meeus), Ketu opposite Rahu.
 *  - Ascendant: from local apparent sidereal time, true obliquity and the
 *    geographic latitude/longitude, then shifted by the ayanamsa.
 *  - Houses: whole sign (house 1 = the sign of the Ascendant).
 *
 * Limitations: latitudes beyond ±66° are rejected (the Ascendant is
 * unreliable near the polar circles); planets are geocentric, not
 * topocentric (Moon parallax of up to ~1° can very rarely matter on a sign
 * boundary).
 */
import * as Astronomy from "astronomy-engine";
import { SIGNS, type Planet, type Sign } from "./gemstone.catalogue.js";

export const LAHIRI_AYANAMSA_J2000 = 23.85306;
export const MAX_LATITUDE = 66;

export interface PlanetPosition {
  planet: Planet;
  longitude: number; // sidereal degrees [0, 360)
  sign: Sign;
  signIndex: number;
  degreeInSign: number;
}

export interface AscendantPosition {
  longitude: number;
  sign: Sign;
  signIndex: number;
  degreeInSign: number;
}

export interface BirthChart {
  ayanamsa: number;
  ascendant: AscendantPosition;
  planets: Record<Planet, PlanetPosition>;
}

const norm = (d: number): number => ((d % 360) + 360) % 360;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Julian centuries (TT) since J2000.0. */
const centuries = (time: Astronomy.AstroTime): number => time.tt / 36525;

/** General precession in longitude since J2000.0, in degrees. */
const precessionDegrees = (T: number): number =>
  (5028.796195 * T + 1.1054348 * T * T) / 3600;

/** Mean Lahiri ayanamsa (degrees) for an instant. */
export const lahiriAyanamsa = (date: Date): number =>
  LAHIRI_AYANAMSA_J2000 +
  precessionDegrees(centuries(Astronomy.MakeTime(date)));

const toPosition = (
  longitude: number,
): { longitude: number; sign: Sign; signIndex: number; degreeInSign: number } => {
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  return {
    longitude: lon,
    sign: SIGNS[signIndex],
    signIndex,
    degreeInSign: lon - signIndex * 30,
  };
};

const BODIES: Partial<Record<Planet, Astronomy.Body>> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus: Astronomy.Body.Venus,
  Saturn: Astronomy.Body.Saturn,
};

/**
 * Tropical ecliptic longitude of date (true equinox of date). Verified
 * against the 2024 March equinox: the Sun reads 359.9997° at 03:06 UTC.
 */
const tropicalLongitudeOfDate = (body: Astronomy.Body, date: Date): number => {
  const time = Astronomy.MakeTime(date);
  return norm(Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon);
};

/** Mean ascending node of the Moon (tropical, of date) — Meeus ch. 47. */
const meanNodeTropical = (date: Date): number => {
  const T = centuries(Astronomy.MakeTime(date));
  return norm(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441,
  );
};

/** Tropical Ascendant (degrees) for an instant and geographic location. */
export const tropicalAscendant = (
  date: Date,
  latitude: number,
  longitude: number,
): number => {
  const time = Astronomy.MakeTime(date);
  const gstHours = Astronomy.SiderealTime(time); // apparent sidereal time
  const ramc = rad(norm(gstHours * 15 + longitude));
  const eps = rad(Astronomy.e_tilt(time).tobl); // true obliquity of date
  const phi = rad(latitude);
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
  );
  return norm(deg(asc));
};

export const assertValidLocation = (latitude: number, longitude: number) => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid geographic coordinates.");
  }
  if (Math.abs(latitude) > MAX_LATITUDE) {
    throw new Error(
      "Birthplaces beyond 66° latitude are not supported: the Ascendant is unreliable there.",
    );
  }
};

/** Sidereal positions of the nine grahas (no houses). */
export const computePlanets = (date: Date): Record<Planet, PlanetPosition> => {
  const ayan = lahiriAyanamsa(date);
  const out = {} as Record<Planet, PlanetPosition>;
  for (const [name, body] of Object.entries(BODIES) as [
    Planet,
    Astronomy.Body,
  ][]) {
    out[name] = {
      planet: name,
      ...toPosition(tropicalLongitudeOfDate(body, date) - ayan),
    };
  }
  const rahu = meanNodeTropical(date) - ayan;
  out.Rahu = { planet: "Rahu", ...toPosition(rahu) };
  out.Ketu = { planet: "Ketu", ...toPosition(rahu + 180) };
  return out;
};

export const computeBirthChart = (
  date: Date,
  latitude: number,
  longitude: number,
): BirthChart => {
  assertValidLocation(latitude, longitude);
  const ayanamsa = lahiriAyanamsa(date);
  return {
    ayanamsa,
    ascendant: toPosition(tropicalAscendant(date, latitude, longitude) - ayanamsa),
    planets: computePlanets(date),
  };
};

/** Whole-sign house number (1–12) of a sign relative to the Ascendant sign. */
export const wholeSignHouse = (
  ascSignIndex: number,
  signIndex: number,
): number => ((signIndex - ascSignIndex + 12) % 12) + 1;
