/** Mirrors the server's Muhurat Finder response (backend/src/modules/muhurat/search.ts). */

export type TimeOfDay = "any" | "morning" | "afternoon";
export type Direction = "North" | "South" | "East" | "West";

export interface MuhuratPlace {
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface MuhuratSearchRequest {
  event: string;
  place: MuhuratPlace;
  startDate: string;
  endDate: string;
  preferences?: { weekdays?: number[]; timeOfDay?: TimeOfDay; direction?: Direction };
}

export interface PanchangValues {
  tithi: string;
  paksha: "Shukla" | "Krishna";
  nakshatra: string;
  pada: number;
  yoga: string;
  karana: string;
}

export interface AvoidedPeriod { label: string; startLocal: string; endLocal: string }

export interface MuhuratWindow {
  date: string;
  weekday: string;
  startLocal: string;
  endLocal: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  score: number;
  scoreParts: { label: string; points: number }[];
  panchang: PanchangValues;
  changes: string[];
  avoidedPeriods: AvoidedPeriod[];
  why: string[];
}

export interface DayResult {
  date: string;
  weekday: string;
  sunrise: string | null;
  sunset: string | null;
  windows: MuhuratWindow[];
  bestScore: number;
  blockers: string[];
  avoidedPeriods: AvoidedPeriod[];
  abhijit: { startLocal: string; endLocal: string } | null;
}

export interface MuhuratResult {
  event: { id: string; label: string; confidence: "consensus" | "general"; basis: string; limitations: string[] };
  place: MuhuratPlace;
  startDate: string;
  endDate: string;
  method: { id: string; label: string; note: string };
  evaluated: string[];
  rules: string[];
  best: MuhuratWindow | null;
  others: MuhuratWindow[];
  days: DayResult[];
  totals: { days: number; daysWithWindows: number; windows: number };
  notes: string[];
}
