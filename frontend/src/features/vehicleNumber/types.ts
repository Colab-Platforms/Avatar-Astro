/** Mirrors the backend result of POST /api/gemstone-calculator/vehicle-number (backend vehicleNumber.ts). */
import type { PlaceResult } from "@/features/ratna/types";
import type { Scope } from "./registration";

export type VehicleType = "two-wheeler" | "four-wheeler" | "commercial" | "other";
export type Mode = "find" | "check" | "compare";

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  "two-wheeler": "Two-wheeler",
  "four-wheeler": "Four-wheeler",
  commercial: "Commercial vehicle",
  other: "Other",
};

export interface VehicleProfileRequest {
  dateOfBirth: string;
  timeOfBirth: string;
  place: Pick<PlaceResult, "name" | "admin1" | "country" | "latitude" | "longitude" | "timezone">;
}

export interface VehicleProfileResult {
  birth: { dateOfBirth: string; timeOfBirth: string; place: string; timeZone: string; latitude: number; longitude: number };
  panchang: {
    nakshatra: { name: string; pada: number; lord: string };
    moonRashi: string;
    tithi: { name: string; hindi: string; numberInPaksha: number };
    paksha: "shukla" | "krishna";
    masa: { name: string; hindi: string; adhika: boolean };
    vara: { name: string; note: string | null };
    vikramSamvat: number;
    basis: "birth-time" | "sunrise";
  };
  method: string;
}

/** What the form collected, kept with the results so they can be shown and re-used. */
export interface VehicleQuery {
  name: string;
  dateOfBirth: string;
  vehicleType: VehicleType;
  mode: Mode;
  scope: Scope;
  existing: string;
  compare: string[];
  preferred: string;
  range: { min: number; max: number } | null;
}
