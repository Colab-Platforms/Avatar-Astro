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
  navamsa: null | { lagna: RashiRef; planets: { planet: string; rashi: RashiRef; house: number }[] };
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

export interface KootaScore { koota: string; max: number; score: number; a: string; b: string; note: string }
export interface MatchDosha { name: "Nadi Dosha" | "Bhakoot Dosha"; present: boolean; cancelled: boolean; note: string }
export interface MatchResult {
  a: KundaliResult;
  b: KundaliResult;
  ashtakoota: {
    total: number; max: 36; kootas: KootaScore[]; doshas: MatchDosha[]; band: string; method: string[];
    moons: { a: { sign: string; nakshatra: string; pada: number }; b: { sign: string; nakshatra: string; pada: number } };
  };
  mangal: { a: { present: boolean; marsHouse: number; note: string }; b: { present: boolean; marsHouse: number; note: string }; verdict: string };
}
export type MatchPerson = KundaliRequest;
