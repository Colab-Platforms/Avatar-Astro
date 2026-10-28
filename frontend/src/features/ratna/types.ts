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

export interface CalculateRequest {
  dateOfBirth: string;
  timeOfBirth: string | null;
  timeUnknown: boolean;
  place: Pick<
    PlaceResult,
    "name" | "admin1" | "country" | "latitude" | "longitude" | "timezone"
  >;
}

export interface GemstoneInfo {
  key: string;
  planet: string;
  name: string;
  sanskrit: string;
  colour: string;
  weekday: string;
  customs: { metal: string; finger: string };
  significance: string[];
  themes: { label: string; note: string }[];
}

export interface RatnaResult {
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
    planets: { planet: string; sign: string; degree: number; house: number }[];
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
