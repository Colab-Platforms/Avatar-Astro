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

export interface Festival { id: string; name: string; kind: "festival" | "vrat"; note: string }

export interface Segment { name: string; until: string | null; untilNextDay: boolean }

export interface DayPanchang {
  vikramSamvat: number;
  masa: { name: string; adhika: boolean };
  purnimantaMasa: { name: string; adhika: boolean };
  paksha: "Shukla" | "Krishna";
  vara: string;
  tithi: Segment[];
  nakshatra: Segment[];
  yoga: Segment[];
  karana: Segment[];
  panchak: { from: string | null; until: string | null } | null;
}

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
  status: "suitable";
  observances: string[];
  why: string[];
}

export interface DayAnalysis {
  intervals: { startLocal: string; endLocal: string; reasons: string[] }[];
  scopes: { reason: string; scope: "whole day" | "part of the day"; spans: { startLocal: string; endLocal: string }[] }[];
  needs: string[];
}

export interface DayResult {
  analysis: DayAnalysis | null;
  date: string;
  weekday: string;
  sunrise: string | null;
  sunset: string | null;
  windows: MuhuratWindow[];
  bestScore: number;
  blockers: string[];
  avoidedPeriods: AvoidedPeriod[];
  abhijit: { startLocal: string; endLocal: string } | null;
  festivals: Festival[];
  panchang: DayPanchang | null;
}

export interface MuhuratResult {
  event: { id: string; label: string; confidence: "consensus" | "general"; basis: string; limitations: string[] };
  place: MuhuratPlace;
  startDate: string;
  endDate: string;
  method: { id: string; label: string; note: string };
  convention: { panchang: { id: string; label: string; note: string }; festivals: { id: string; label: string; note: string }; dayBoundary: string };
  evaluated: string[];
  seasonNotes: string[];
  rules: string[];
  best: MuhuratWindow | null;
  days: DayResult[];
  totals: { days: number; daysWithWindows: number; windows: number; festivalDays: number };
  notes: string[];
}
