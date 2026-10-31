import { fireEvent, screen } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import type { ChartAnalysis, GemstoneInfo, MatchedProduct, PlaceResult, PlanetProfile, RatnaResult, ShopMatches, StoneAssessment } from "../types";

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
  hindi: "हीरा",
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
  hindi: "पन्ना",
  colour: "#1f9d6a",
  weekday: "Wednesday",
  customs: { metal: "Gold or silver", finger: "Little finger" },
  significance: ["Traditionally associated with Mercury."],
  themes: [
    { label: "Communication", note: "Mercury is linked with speech and writing." },
    { label: "Learning and study", note: "Traditionally associated with curiosity and education." },
  ],
};

export const pearl: GemstoneInfo = {
  key: "pearl",
  planet: "Moon",
  name: "Pearl",
  sanskrit: "Moti",
  hindi: "मोती",
  colour: "#e8e4dc",
  weekday: "Monday",
  customs: { metal: "Silver", finger: "Little finger" },
  significance: ["Traditionally associated with the Moon."],
  themes: [{ label: "Calm and emotional balance", note: "The Moon is linked with the mind." }],
};

const profile = (planet: string, over: Partial<PlanetProfile> = {}): PlanetProfile => ({
  planet,
  sign: "Cancer",
  house: 3,
  degree: 22.6,
  nakshatra: "Ashlesha",
  pada: 2,
  nakshatraLord: "Mercury",
  dignity: "enemy sign",
  retrograde: false,
  combust: false,
  housesOwned: [1, 6],
  conjunctions: ["Sun"],
  aspectedBy: [],
  ...over,
});

const assess = (
  stone: GemstoneInfo,
  category: StoneAssessment["category"],
  over: Partial<StoneAssessment> = {},
): StoneAssessment => ({
  stone,
  planet: stone.planet,
  category,
  profile: profile(stone.planet),
  functional: { nature: "benefic", houses: [1, 6], reason: "Venus rules the 1st and 6th houses." },
  reasons: [`${stone.planet} reason one.`, `${stone.planet} reason two.`],
  cautions: [],
  dashaNote: null,
  ...over,
});

const analysisFixture: ChartAnalysis = {
  lagna: { sign: "Taurus", degree: 5, nakshatra: "Krittika", pada: 4 },
  moon: { sign: "Cancer", nakshatra: "Pushya", pada: 1 },
  dasha: {
    asOf: "2026-10-30",
    moonNakshatra: "Pushya",
    mahadasha: { lord: "Mars", start: "2025-09-09", end: "2032-09-09" },
    antardasha: { lord: "Rahu", start: "2026-02-05", end: "2027-02-24" },
  },
  primary: assess(diamond, "primary", {
    cautions: ["Venus is conjunct Sun, traditionally malefic planets."],
    dashaNote: null,
  }),
  alternatives: [
    assess(emerald, "alternative", {
      profile: profile("Mercury", { housesOwned: [2, 5], dignity: "enemy sign", nakshatra: "Pushya", pada: 4 }),
      functional: { nature: "benefic", houses: [2, 5], reason: "Mercury rules the 2nd and 5th houses." },
      reasons: ["Mercury rules the 5th house (Virgo) and owns no 6th, 8th or 12th house."],
      cautions: ["Mercury is conjunct Sun, traditionally malefic planets."],
    }),
  ],
  cautionedStones: [
    assess(pearl, "caution", {
      profile: profile("Moon", { housesOwned: [3], dignity: "own sign", nakshatra: "Pushya", pada: 1 }),
      functional: { nature: "malefic", houses: [3], reason: "Moon rules only the 3rd house." },
      reasons: ["Moon rules only the 3rd house, which is classed as mildly unfavourable."],
    }),
  ],
  notIndicated: ["Sun"],
  notCalculated: ["Shadbala / Ashtakavarga (numeric planetary strength)"],
  ascendantNearBoundary: false,
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
  chart: { ascendant: { sign: "Taurus", degree: 5 }, planets: [{ planet: "Venus", sign: "Cancer", degree: 3, house: 3, nakshatra: "Ashlesha", pada: 2, dignity: "enemy sign", retrograde: false, combust: true }] },
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
    analysis: analysisFixture,
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
    name: "Birth-Date & Place Ratna Method",
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
    summary: "Using your local birth date (a Wednesday) and birthplace, the Birth-Date & Place Ratna Method identifies Emerald, traditionally associated with Mercury, as your gemstone association.",
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

/** Puts a signed-in session in the auth store (generating a result needs an account). */
export const signInForTests = () =>
  useAuthStore.setState({ user: { id: "u1" } as never, accessToken: "access", refreshToken: "refresh", isAuthenticated: true });
export const signOutForTests = () =>
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });

/** Fills name, gender, weight and an ordinary date of birth on the form. */
export const fillPersonalAndPanchang = () => {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Verma" } });
  fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Female" } });
  fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "58" } });
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1990-05-05" } });
};
