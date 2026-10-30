/** Shape returned by POST /api/gemstone-calculator/kundali (mirrors backend kundali.ts). */
import type { PanchangDetails, PlaceResult } from "@/features/ratna/types";

export interface RashiRef {
  /** Western name of the same sidereal sign, shown beside the Sanskrit name. */
  sign: string;
  name: string;
  hindi: string;
}

export interface NakshatraRef {
  name: string;
  pada: number | null;
  lord: string;
}

export interface LuminaryResult {
  rashi: RashiRef | null;
  candidates: RashiRef[];
  certain: boolean;
  degreeInSign: number | null;
  nakshatra: NakshatraRef | null;
}

export interface KundaliResult {
  birth: {
    dateOfBirth: string;
    timeOfBirth: string | null;
    place: string;
    timeZone: string;
    latitude: number;
    longitude: number;
    resolvedInstantUtc: string | null;
    utcOffsetMinutes: number | null;
  };
  method: {
    zodiac: string;
    ayanamsa: string;
    ayanamsaDegrees: number | null;
    houses: string;
    nodes: string;
    engine: string;
  };
  sun: LuminaryResult;
  moon: LuminaryResult;
  lagna: null | { rashi: RashiRef; degreeInSign: number; nakshatra: NakshatraRef };
  planets:
    | null
    | { planet: string; rashi: RashiRef; degreeInSign: number; house: number; nakshatra: string; pada: number }[];
  stableSigns: { planet: string; rashi: RashiRef }[];
  dasha: null | {
    asOf: string;
    moonNakshatra: string;
    mahadasha: { lord: string; start: string; end: string };
    antardasha: { lord: string; start: string; end: string };
  };
  panchang: PanchangDetails;
  timeKnown: boolean;
  limitations: string[];
  basis: string[];
}

export interface KundaliRequest {
  dateOfBirth: string;
  timeOfBirth: string | null;
  timeUnknown: boolean;
  place: Pick<PlaceResult, "name" | "admin1" | "country" | "latitude" | "longitude" | "timezone">;
}
