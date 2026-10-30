/** Shapes returned by /api/gemstone-calculator (mirrors the backend service). */

export interface PlaceResult {
  id: string;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
}

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say";
export type Paksha = "shukla" | "krishna";

/** Calculated by the backend from the birth date, time and place; never entered by the user. */
export interface PanchangDetails {
  convention: { id: string; label: string; note: string };
  basis: "birth-time" | "sunrise";
  reckonedAtUtc: string;
  vikramSamvat: number;
  masa: { name: string; hindi: string; adhika: boolean };
  purnimantaMasa: { name: string; hindi: string; adhika: boolean };
  paksha: Paksha;
  tithi: {
    number: number;
    numberInPaksha: number;
    name: string;
    hindi: string;
    startLocal: string;
    endLocal: string;
    startUtc: string;
    endUtc: string;
  };
  nakshatra: { name: string; pada: number; lord: string };
  moonRashi: string;
  yoga: string;
  karana: string;
  vara: { name: string; note: string | null };
  sunrise: string | null;
  sunset: string | null;
  uncertain: boolean;
  uncertainties: string[];
  notes: string[];
}

export interface PersonalProfile {
  fullName: string;
  gender: Gender;
  weightKg: number | null;
}

export interface CalculationAudit {
  localDate: string;
  resolvedInstantUtc: string | null;
  utcOffsetMinutes: number | null;
  timeZone: string;
  latitude: number;
  longitude: number;
  ayanamsa: string;
  ayanamsaDegrees: number | null;
}

export interface WeightGuidance {
  weightKg: number;
  rattiApprox: number;
  caratApprox: number;
  text: string;
  disclaimer: string;
}

export interface CalculateRequest {
  fullName: string;
  gender: Gender;
  weightKg: number | null;
  dateOfBirth: string;
  timeOfBirth: string | null;
  timeUnknown: boolean;
  place: Pick<
    PlaceResult,
    "name" | "admin1" | "country" | "latitude" | "longitude" | "timezone"
  >;
}

export type Dignity =
  | "exalted"
  | "mooltrikona"
  | "own sign"
  | "friendly sign"
  | "neutral sign"
  | "enemy sign"
  | "debilitated"
  | "not assessed";

export interface PlanetProfile {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  nakshatra: string;
  pada: number;
  nakshatraLord: string;
  dignity: Dignity;
  retrograde: boolean;
  combust: boolean;
  housesOwned: number[];
  conjunctions: string[];
  aspectedBy: string[];
}

export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
}

export interface StoneAssessment {
  stone: GemstoneInfo;
  planet: string;
  category: "primary" | "alternative" | "caution";
  profile: PlanetProfile;
  functional: { nature: string; houses: number[]; reason: string };
  reasons: string[];
  cautions: string[];
  dashaNote: string | null;
}

export interface ChartAnalysis {
  lagna: { sign: string; degree: number; nakshatra: string; pada: number };
  moon: { sign: string; nakshatra: string; pada: number };
  dasha: null | { asOf: string; moonNakshatra: string; mahadasha: DashaPeriod; antardasha: DashaPeriod };
  primary: StoneAssessment;
  alternatives: StoneAssessment[];
  cautionedStones: StoneAssessment[];
  notIndicated: string[];
  notCalculated: string[];
  ascendantNearBoundary: boolean;
}

export interface GemstoneInfo {
  key: string;
  planet: string;
  name: string;
  sanskrit: string;
  /** Devanagari name, shown beside the English name. */
  hindi: string;
  colour: string;
  weekday: string;
  customs: { metal: string; finger: string };
  significance: string[];
  themes: { label: string; note: string }[];
}

export interface RatnaResult {
  profile?: PersonalProfile | null;
  panchang?: PanchangDetails | null;
  audit?: CalculationAudit;
  status: "complete" | "date_based";
  method: {
    id: "lagna-lord" | "birth-date-place";
    name: string;
    zodiac: string;
    ayanamsa: string;
    houses: string;
    nodes: string;
    engine: string;
    summary: string;
    limitations: string[];
  };
  birth: {
    dateOfBirth: string;
    timeOfBirth: string | null;
    place: string;
    timeZone: string;
    utcOffsetMinutes: number | null;
    ambiguousLocalTime: boolean;
  };
  chart: null | {
    ascendant: { sign: string; degree: number };
    planets: {
      planet: string;
      sign: string;
      degree: number;
      house: number;
      nakshatra: string;
      pada: number;
      dignity: Dignity;
      retrograde: boolean;
      combust: boolean;
    }[];
  };
  stableSigns: { planet: string; sign: string }[];
  /** The one gemstone this result is about, whichever method chose it. */
  primary: {
    stone: GemstoneInfo;
    planet: string;
    basis: "lagna-lord" | "birth-weekday";
    summary: string;
    factors: { label: string; value: string }[];
  };
  /** Present only for the unknown-birth-time method. */
  dateBased: null | {
    localDate: string;
    weekday: string;
    weekdayLord: string;
    rule: string;
    weekdayLordSign: string | null;
    sunrise: null | { local: string; timeZone: string };
    classicalNote: string;
    table: { weekday: string; planet: string; stone: string }[];
  };
  recommendation: null | {
    stone: GemstoneInfo;
    lagnaLord: string;
    lagnaLordSign: string;
    lagnaLordHouse: number;
    factors: { label: string; value: string }[];
    secondary: {
      house: number;
      planet: string;
      sign: string;
      stone: GemstoneInfo;
      reason: string;
    }[];
    excluded: { house: number; planet: string; reason: string }[];
    cautions: string[];
    analysis: ChartAnalysis;
  };
  wearing: null | {
    weekday: string;
    metal: string;
    finger: string;
    customNote: string;
    sunrise: null | {
      iso: string;
      local: string;
      timeZone: string;
      locationLabel: string;
    };
    sunriseNote: string;
    weight?: WeightGuidance | null;
  };
  explanation: { text: string; source: "ai" | "rules"; fallbackReason?: string };
  notice: string | null;
}

export interface MatchedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  categoryName: string;
  categorySlug: string;
  url: string;
  sellerDescription: string;
  reason?: string;
}

export interface ShopMatches {
  stone: { key: string; name: string; planet: string };
  gemstones: MatchedProduct[];
  jewellery: MatchedProduct[];
  chartLinked: MatchedProduct[];
  complementary: MatchedProduct[];
}
