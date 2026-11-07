/** Mirrors the backend result of POST /api/gemstone-calculator/baby-name (backend babyName.ts). */
import type { PlaceResult } from "@/features/ratna/types";

export type NamePreference = "boy" | "girl" | "neutral" | "all";

export interface BabyNameRequest {
  dateOfBirth: string;
  timeOfBirth: string;
  timeApproximate: boolean;
  place: Pick<PlaceResult, "name" | "admin1" | "country" | "latitude" | "longitude" | "timezone">;
}

export interface PadaRef { nakshatra: string; pada: number }

export interface BabyNameResult {
  birth: { dateOfBirth: string; timeOfBirth: string; place: string; timeZone: string; latitude: number; longitude: number };
  timeApproximate: boolean;
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
  window: { minutesEitherSide: number; padas: PadaRef[] };
  nearPadaBoundary: boolean;
  method: string;
}
