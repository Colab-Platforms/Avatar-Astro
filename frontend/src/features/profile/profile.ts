/**
 * Central user profile (frontend side): types and the pure helpers every feature uses.
 * Nothing here talks to the network; see api.ts and useUserProfile.ts.
 */
import type { PlaceResult } from "@/features/ratna/types";

export interface BirthPlace { name: string; admin1: string | null; country: string | null; latitude: number; longitude: number; timezone: string }

/** Mirrors the backend's CentralProfile (backend/src/modules/me/userProfile.ts). */
export interface CentralProfile {
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  /** "HH:mm", local time at the birthplace; null when unknown or never given */
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthPlace: BirthPlace | null;
  preferredLanguage: string | null;
  birthDetailsUpdatedAt: string | null;
}

/** What a feature may need from the profile. A feature lists only what it genuinely uses. */
export type ProfileNeed = "name" | "gender" | "dateOfBirth" | "birthTime" | "birthPlace";

/** The one place that says whether a need is satisfied by a saved profile. Nothing is assumed. */
export function hasNeed(p: CentralProfile | null | undefined, need: ProfileNeed): boolean {
  if (!p) return false;
  switch (need) {
    case "name": return p.fullName.trim().length >= 2;
    case "gender": return !!p.gender;
    case "dateOfBirth": return !!p.dateOfBirth;
    // A time counts when it is saved, and so does an explicit "I don't know it" (the user did answer).
    case "birthTime": return !!p.birthTime || p.birthTimeUnknown;
    case "birthPlace": return !!p.birthPlace;
  }
}

/** The needs still missing, in the order given. */
export const missingNeeds = (p: CentralProfile | null | undefined, needs: readonly ProfileNeed[]): ProfileNeed[] => needs.filter((n) => !hasNeed(p, n));

const placeLabel = (b: BirthPlace) => [b.name, b.admin1, b.country].filter(Boolean).join(", ");

/** Saved birthplace -> the shape the existing place picker and calculators use. */
export function toPlaceResult(b: BirthPlace | null | undefined): PlaceResult | null {
  if (!b) return null;
  return { id: `${b.latitude},${b.longitude}`, name: b.name, admin1: b.admin1, country: b.country, latitude: b.latitude, longitude: b.longitude, timezone: b.timezone, label: placeLabel(b) };
}

/** Picker result -> what the profile stores (drops the picker's own id/label). */
export const fromPlaceResult = (p: PlaceResult): BirthPlace => ({ name: p.name, admin1: p.admin1, country: p.country, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone });

/** "Asha Kumari Rao" -> { firstName: "Asha", lastName: "Kumari Rao" }. */
export function splitName(full: string): { firstName: string; lastName: string | null } {
  const parts = full.trim().replace(/\s+/g, " ").split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.length > 1 ? parts.slice(1).join(" ") : null };
}

/** Same person, same place: compares what matters so a re-selected picker result is not a "change". */
export const samePlace = (a: BirthPlace | null | undefined, b: BirthPlace | null | undefined): boolean =>
  !!a && !!b && a.latitude === b.latitude && a.longitude === b.longitude && a.timezone === b.timezone && a.name === b.name;

/** What a form currently holds for the person's own details. Empty strings / null mean "not entered". */
export interface EnteredDetails {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: PlaceResult | null;
}

const normName = (s: string) => s.trim().replace(/\s+/g, " ");

/** True when the form holds a value for this need. */
const entered = (v: EnteredDetails, need: ProfileNeed): boolean => {
  switch (need) {
    case "name": return normName(v.fullName).length >= 2;
    case "gender": return !!v.gender;
    case "dateOfBirth": return !!v.dateOfBirth;
    case "birthTime": return v.birthTimeUnknown || !!v.birthTime;
    case "birthPlace": return !!v.birthPlace;
  }
};

/** True when the form's value for this need differs from what the profile holds. */
const differs = (p: CentralProfile, v: EnteredDetails, need: ProfileNeed): boolean => {
  switch (need) {
    case "name": return normName(v.fullName) !== normName(p.fullName);
    case "gender": return v.gender !== (p.gender ?? "");
    case "dateOfBirth": return v.dateOfBirth !== (p.dateOfBirth ?? "");
    case "birthTime": return v.birthTimeUnknown !== p.birthTimeUnknown || (!v.birthTimeUnknown && v.birthTime !== (p.birthTime ?? ""));
    case "birthPlace": return !samePlace(p.birthPlace, v.birthPlace ? fromPlaceResult(v.birthPlace) : null);
  }
};

/**
 * The details a form holds that the profile does not already have exactly:
 * `added` fills a gap (safe to save by default), `changed` would replace a saved value (only on request).
 */
export function pendingSave(profile: CentralProfile | null | undefined, v: EnteredDetails, needs: readonly ProfileNeed[]): { added: ProfileNeed[]; changed: ProfileNeed[] } {
  const added: ProfileNeed[] = [];
  const changed: ProfileNeed[] = [];
  for (const n of needs) {
    if (!entered(v, n)) continue;
    if (!hasNeed(profile, n)) added.push(n);
    else if (profile && differs(profile, v, n)) changed.push(n);
  }
  return { added, changed };
}

/** The exact request body for saving `needs` from the form. Only those fields are sent. */
export function buildSavePatch(needs: readonly ProfileNeed[], v: EnteredDetails): { birth: import("./api").BirthPatch; account: import("./api").AccountPatch } {
  const birth: import("./api").BirthPatch = {};
  const account: import("./api").AccountPatch = {};
  for (const n of needs) {
    if (n === "name") { const s = splitName(v.fullName); account.firstName = s.firstName; account.lastName = s.lastName; }
    else if (n === "gender") account.gender = v.gender || null;
    else if (n === "dateOfBirth") birth.dateOfBirth = v.dateOfBirth || null;
    else if (n === "birthTime") { birth.birthTimeUnknown = v.birthTimeUnknown; birth.birthTime = v.birthTimeUnknown ? null : v.birthTime || null; }
    else if (n === "birthPlace" && v.birthPlace) birth.birthPlace = fromPlaceResult(v.birthPlace);
  }
  return { birth, account };
}
