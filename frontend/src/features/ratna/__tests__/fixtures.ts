import type { GemstoneInfo, MatchedProduct, PlaceResult, RatnaResult, ShopMatches } from "../types";

export const delhi: PlaceResult = {
  id: "1",
  name: "New Delhi",
  admin1: "Delhi",
  country: "India",
  latitude: 28.6,
  longitude: 77.2,
  timezone: "Asia/Kolkata",
  label: "New Delhi, Delhi, India",
};

export const diamond: GemstoneInfo = {
  key: "diamond",
  planet: "Venus",
  name: "Diamond or White Sapphire",
  sanskrit: "Heera",
  colour: "#dfe9f5",
  weekday: "Friday",
  customs: { metal: "Platinum", finger: "Middle finger" },
  significance: ["Traditionally associated with Venus."],
  themes: [
    { label: "Harmony and relationships", note: "Venus is linked with affection and partnership." },
    { label: "Beauty, art and refinement", note: "Associated with the arts and aesthetics." },
  ],
};

export const emerald: GemstoneInfo = {
  key: "emerald",
  planet: "Mercury",
  name: "Emerald",
  sanskrit: "Panna",
  colour: "#1f9d6a",
  weekday: "Wednesday",
  customs: { metal: "Gold or silver", finger: "Little finger" },
  significance: ["Traditionally associated with Mercury."],
  themes: [
    { label: "Communication", note: "Mercury is linked with speech and writing." },
    { label: "Learning and study", note: "Traditionally associated with curiosity and education." },
  ],
};

const lagnaMethod: RatnaResult["method"] = {
  id: "lagna-lord",
  name: "Parashari Lagna-lord method",
  zodiac: "Sidereal",
  ayanamsa: "Lahiri",
  houses: "Whole sign",
  nodes: "Mean",
  engine: "astronomy-engine",
  summary: "Summary text.",
  limitations: ["One school of Vedic astrology."],
};

const wearingFor = (stone: GemstoneInfo): NonNullable<RatnaResult["wearing"]> => ({
  weekday: stone.weekday,
  metal: stone.customs.metal,
  finger: stone.customs.finger,
  customNote: "Customs vary.",
  sunrise: {
    iso: "x",
    local: `${stone.weekday}, 6 Nov 2026, 06:30`,
    timeZone: "Asia/Kolkata",
    locationLabel: "New Delhi (your birthplace)",
  },
  sunriseNote: "Sunrise note.",
});

/** Exact birth time, Lagna-lord method. */
export const complete: RatnaResult = {
  status: "complete",
  method: lagnaMethod,
  birth: { dateOfBirth: "1990-05-05", timeOfBirth: "10:00", place: "New Delhi, Delhi, India", timeZone: "Asia/Kolkata", utcOffsetMinutes: 330, ambiguousLocalTime: false },
  chart: { ascendant: { sign: "Taurus", degree: 5 }, planets: [{ planet: "Venus", sign: "Cancer", degree: 3, house: 3 }] },
  stableSigns: [],
  primary: {
    stone: diamond,
    planet: "Venus",
    basis: "lagna-lord",
    summary: "Your Ascendant is Taurus; its ruler Venus is traditionally associated with Diamond or White Sapphire under the Parashari Lagna-lord method.",
    factors: [{ label: "Lagna lord", value: "Venus" }],
  },
  dateBased: null,
  recommendation: {
    stone: diamond,
    lagnaLord: "Venus",
    lagnaLordSign: "Cancer",
    lagnaLordHouse: 3,
    factors: [{ label: "Lagna lord", value: "Venus" }],
    secondary: [],
    excluded: [],
    cautions: [],
  },
  wearing: wearingFor(diamond),
  explanation: { text: "Rule based explanation text.", source: "rules" },
  notice: null,
};

/** Unknown birth time: Birth-Date & Place method (Wednesday -> Mercury -> Emerald). */
export const dateBased: RatnaResult = {
  status: "date_based",
  method: {
    id: "birth-date-place",
    name: "Birth-Date & Place Gemstone Method",
    zodiac: "Sidereal (context only)",
    ayanamsa: "Lahiri",
    houses: "Not calculated: the Ascendant and houses need an exact birth time",
    nodes: "Mean lunar node (context only)",
    engine: "astronomy-engine",
    summary: "Weekday-ruler summary text.",
    limitations: ["This is a date-based interpretation, less specific than a full birth-chart reading."],
  },
  birth: { dateOfBirth: "1990-05-09", timeOfBirth: null, place: "Vasai, Palghar, Maharashtra, India", timeZone: "Asia/Kolkata", utcOffsetMinutes: null, ambiguousLocalTime: false },
  chart: null,
  stableSigns: [{ planet: "Sun", sign: "Aries" }, { planet: "Mercury", sign: "Taurus" }],
  primary: {
    stone: emerald,
    planet: "Mercury",
    basis: "birth-weekday",
    summary: "Using your local birth date (a Wednesday) and birthplace, the Birth-Date & Place Gemstone Method identifies Emerald, traditionally associated with Mercury, as your gemstone association.",
    factors: [
      { label: "Local birth date", value: "Wednesday, 9 May 1990" },
      { label: "Weekday ruler", value: "Wednesday: Mercury" },
      { label: "Birth time", value: "Not used (unknown)" },
    ],
  },
  dateBased: {
    localDate: "Wednesday, 9 May 1990",
    weekday: "Wednesday",
    weekdayLord: "Mercury",
    rule: "Weekday-ruler rule: Wednesday is ruled by Mercury, whose traditional gemstone is Emerald.",
    weekdayLordSign: "Taurus",
    sunrise: { local: "06:03", timeZone: "Asia/Kolkata" },
    classicalNote: "Classical Vedic reckoning begins each weekday at local sunrise, which was 06:03 at your birthplace on that date.",
    table: [
      { weekday: "Sunday", planet: "Sun", stone: "Ruby" },
      { weekday: "Monday", planet: "Moon", stone: "Pearl" },
      { weekday: "Tuesday", planet: "Mars", stone: "Red Coral" },
      { weekday: "Wednesday", planet: "Mercury", stone: "Emerald" },
      { weekday: "Thursday", planet: "Jupiter", stone: "Yellow Sapphire" },
      { weekday: "Friday", planet: "Venus", stone: "Diamond or White Sapphire" },
      { weekday: "Saturday", planet: "Saturn", stone: "Blue Sapphire" },
    ],
  },
  recommendation: null,
  wearing: wearingFor(emerald),
  explanation: { text: "You were born on a Wednesday, ruled by Mercury, so Emerald is the traditional association.", source: "rules" },
  notice: null,
};

export const product = (over: Partial<MatchedProduct> & { id: string; name: string }): MatchedProduct => ({
  slug: over.id,
  price: 1000,
  originalPrice: null,
  image: `https://img.example/${over.id}.jpg`,
  categoryName: "Gemstones",
  categorySlug: "gemstones",
  url: `/shop/${over.id}`,
  sellerDescription: "Seller text",
  ...over,
});

export const emptyShop: ShopMatches = {
  stone: { key: "diamond", name: diamond.name, planet: "Venus" },
  gemstones: [],
  jewellery: [],
  chartLinked: [],
  complementary: [],
};
