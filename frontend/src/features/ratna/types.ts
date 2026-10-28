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
}

export interface RatnaResult {
  status: "complete" | "limited";
  method: {
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
