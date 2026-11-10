/**
 * Muhurat rule sets: DATA ONLY. Adding or changing an event means editing this file; the search engine (search.ts) never
 * names an event.
 *
 * METHOD / TRADITION (shown to the user): Drik (astronomical) Panchang, Lahiri sidereal, Amanta months, applying the common
 * Muhurta Shastra conventions as summarised in the Muhurta Chintamani tradition: favourable tithi, nakshatra and weekday,
 * avoidance of Rikta tithis, Amavasya, Vishti karana and the nine inauspicious yogas, of Rahu Kalam, Yamaganda and Gulika Kalam,
 * and of the seasons and conditions below.
 *
 * HONESTY ABOUT SOURCES: the lists were assembled from published Panchang references that broadly agree (see CONFIDENCE).
 * They were NOT checked line by line against the Sanskrit primary texts, and regional and family traditions differ. Each event
 * therefore carries a `confidence`:
 *   - "consensus": the core lists (tithi, nakshatra, weekday) appear alike across the references consulted.
 *   - "general": the event follows the general auspicious-time conventions; the references give no event-specific list,
 *     so no extra event-specific restriction has been invented.
 * The ORDER in which suitable windows are ranked (tiers below) is MyBhagya's own documented ordering, not a classical grade.
 */

export type EventId =
  | "marriage" | "engagement" | "namkaran" | "annaprashan" | "mundan"
  | "griha-pravesh" | "property-purchase" | "house-construction"
  | "vehicle-purchase" | "vehicle-delivery" | "travel"
  | "business-opening" | "shop-opening" | "business-launch" | "work-beginning";

export type EventGroup = "personal" | "home" | "vehicle" | "business";

export const GROUP_LABEL: Record<EventGroup, string> = {
  personal: "Personal & family",
  home: "Home & property",
  vehicle: "Vehicle & travel",
  business: "Business & career",
};

export type Confidence = "consensus" | "general";

export interface EventRule {
  id: EventId;
  label: string;
  group: EventGroup;
  /** One line shown on the event card. */
  summary: string;
  confidence: Confidence;
  /** What the rules for this event rest on. Shown in Calculation details. */
  basis: string;
  /** Names exactly as the Panchang engine spells them. `best` ranks above `good`; a nakshatra in neither is not suitable. */
  nakshatras: { best: string[]; good: string[] };
  /**
   * Tithi numbers within a paksha (1-15; 15 = Purnima in Shukla). If `allowed` is given only those qualify; otherwise `avoid`
   * lists the tithis to skip. Amavasya is always avoided (see UNIVERSAL).
   */
  tithis: { allowed?: number[]; avoid?: number[] };
  /** 0 = Sunday ... 6 = Saturday. A weekday in neither list is not suitable. */
  weekdays: { best: number[]; ok: number[] };
  /** Shukla paksha ranks higher than Krishna. */
  shuklaPreferred: boolean;
  avoid: {
    /** Sun in sidereal Dhanu or Meena (Kharmas / Malmas). */
    kharmas: boolean;
    /** Adhika (extra) lunar month. */
    adhika: boolean;
    /** Devshayani Ekadashi (Ashadha Shukla 11) to Prabodhini Ekadashi (Kartika Shukla 11). */
    chaturmas: boolean;
    /** Amanta Bhadrapada Krishna paksha. Observed in many regions, not all. */
    pitruPaksha: boolean;
    /** Panchak: the Moon in the second half of Dhanishta through Revati. Left out only where the tradition for the event says so. */
    panchak?: boolean;
    /** Planets whose combustion (asta) rules the date out. */
    asta: ("Venus" | "Jupiter")[];
  };
  /** Extra limits that apply to this event only, shown to the user. */
  limitations: string[];
}

/** Applied to every event. */
export const UNIVERSAL = {
  /** Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti: the nine yogas the Muhurta texts call inauspicious. */
  avoidYogas: ["Vishkambha", "Atiganda", "Shula", "Ganda", "Vyaghata", "Vajra", "Vyatipata", "Parigha", "Vaidhriti"],
  avoidKaranas: ["Vishti (Bhadra)"],
  avoidAmavasya: true,
  /** Rikta tithis (4, 9, 14) unless an event gives its own tithi list. */
  defaultAvoidTithis: [4, 9, 14],
  /** Classical combustion limits, in degrees from the Sun, for a planet moving direct. */
  astaDegrees: { Venus: 10, Jupiter: 11 },
  periods: ["Rahu Kalam", "Yamaganda", "Gulika Kalam"],
} as const;

/** Nakshatra groups in the Muhurta classification (Dhruva/Sthira, Chara, Kshipra/Laghu, Mridu/Maitra). */
export const NAK = {
  fixed: ["Rohini", "Uttara Phalguni", "Uttara Ashadha", "Uttara Bhadrapada"], // for what is meant to last
  movable: ["Punarvasu", "Swati", "Shravana", "Dhanishta", "Shatabhisha"], // for movement and travel
  swift: ["Ashwini", "Pushya", "Hasta"], // for quick, active beginnings
  gentle: ["Mrigashira", "Revati", "Chitra", "Anuradha"], // for gentle, friendly undertakings
} as const;

const STD_TITHIS = [2, 3, 5, 7, 10, 11, 13];
const NO_ASTA: EventRule["avoid"]["asta"] = [];

const mk = (r: Omit<EventRule, "limitations"> & { limitations?: string[] }): EventRule => ({ limitations: [], ...r });

const WEDDING_BASIS =
  "Eleven nakshatras (Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha, Mula, Uttara Ashadha, Uttara Bhadrapada, Revati), tithis 2, 3, 5, 7, 10, 11 and 13, and the weekdays Monday, Wednesday, Thursday and Friday, the common Vivah Muhurta lists. Tuesday, Saturday and Sunday are left out; Mula and Magha are listed by some traditions and not others.";
const LAGNA_NOTE = "The ascendant (lagna) is not evaluated, so the window is a day-time Panchang window. Your priest will fix the exact lagna within it.";

export const EVENTS: EventRule[] = [
  mk({
    id: "marriage", label: "Marriage Muhurat", group: "personal", summary: "Vivah: a suitable day and time for the wedding.",
    confidence: "consensus", basis: WEDDING_BASIS,
    nakshatras: { best: ["Rohini", "Mrigashira", "Uttara Phalguni", "Uttara Ashadha", "Uttara Bhadrapada", "Revati"], good: ["Magha", "Hasta", "Swati", "Anuradha", "Mula"] },
    tithis: { allowed: STD_TITHIS }, weekdays: { best: [1, 4, 5], ok: [3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: true, pitruPaksha: true, asta: ["Venus", "Jupiter"] },
    limitations: [LAGNA_NOTE, "Daytime windows only. Many weddings are held after sunset, which this search does not cover.", "Compatibility of the couple's charts (Kundali matching) is a separate matter and is not part of this search."],
  }),
  mk({
    id: "engagement", label: "Engagement Muhurat", group: "personal", summary: "Sagai / Vagdana: the betrothal ceremony.",
    confidence: "general", basis: "No separate classical list was found for engagement, so it follows the Vivah lists and seasonal restrictions above. " + WEDDING_BASIS,
    nakshatras: { best: ["Rohini", "Mrigashira", "Uttara Phalguni", "Uttara Ashadha", "Uttara Bhadrapada", "Revati"], good: ["Magha", "Hasta", "Swati", "Anuradha", "Mula"] },
    tithis: { allowed: STD_TITHIS }, weekdays: { best: [1, 4, 5], ok: [3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: false, pitruPaksha: true, asta: ["Venus", "Jupiter"] },
    limitations: ["Families differ on whether Chaturmas is avoided for an engagement; it is not excluded here.", "Daytime windows only."],
  }),
  mk({
    id: "namkaran", label: "Namkaran Muhurat", group: "personal", summary: "Baby naming ceremony.",
    confidence: "general", basis: "Namkaran is traditionally held on the 11th or 12th day after birth, so the date is usually fixed by the baby's age. This search finds suitable days by the general Muhurta conventions, without the seasonal restrictions used for weddings.",
    nakshatras: { best: [...NAK.swift, ...NAK.gentle], good: [...NAK.movable, ...NAK.fixed] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [1, 3, 4, 5], ok: [] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: false, chaturmas: false, pitruPaksha: false, asta: NO_ASTA },
    limitations: ["The baby's age is not asked for. If your family follows the 11th/12th day custom, use this only to choose between nearby days."],
  }),
  mk({
    id: "annaprashan", label: "Annaprashan Muhurat", group: "personal", summary: "First solid food ceremony.",
    confidence: "general", basis: "Follows the general Muhurta conventions for childhood samskaras (the favourable nakshatra classes, tithi 2, 3, 5, 7, 10, 11, 13, and Monday, Wednesday, Thursday, Friday). The baby's age is not used.",
    nakshatras: { best: [...NAK.swift, ...NAK.gentle], good: [...NAK.movable, ...NAK.fixed] },
    tithis: { allowed: STD_TITHIS }, weekdays: { best: [4, 5], ok: [1, 3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: false, pitruPaksha: false, asta: NO_ASTA },
    limitations: ["Customs differ on the baby's age (often 6 or 7 months for a boy, 5 or 7 for a girl); the age is not checked."],
  }),
  mk({
    id: "mundan", label: "Mundan Muhurat", group: "personal", summary: "First haircut ceremony (Chudakarana).",
    confidence: "general", basis: "Follows the general Muhurta conventions for childhood samskaras, with the seasonal restrictions used for other samskaras (Kharmas, Adhika, Chaturmas) and the combustion of Jupiter and Venus.",
    nakshatras: { best: [...NAK.swift, ...NAK.gentle], good: NAK.movable as unknown as string[] },
    tithis: { allowed: STD_TITHIS }, weekdays: { best: [4, 5], ok: [1, 3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: true, pitruPaksha: false, asta: ["Venus", "Jupiter"] },
    limitations: ["Customs differ on the child's age and on the child's own birth nakshatra; neither is checked."],
  }),
  mk({
    id: "griha-pravesh", label: "Griha Pravesh Muhurat", group: "home", summary: "House-warming: first entry into a new home.",
    confidence: "consensus", basis: "Fixed and gentle nakshatras (Rohini, the three Uttaras, Mrigashira, Chitra, Anuradha, Revati) rank first; Pushya, Hasta, Dhanishta and Shatabhisha are also accepted. Tithis 2, 3, 5, 7, 10, 11, 13; Monday, Wednesday, Thursday, Friday. Kharmas, Adhika, Chaturmas, and the combustion of Jupiter and Venus are avoided.",
    nakshatras: { best: [...NAK.fixed, ...NAK.gentle], good: ["Pushya", "Hasta", "Dhanishta", "Shatabhisha"] },
    tithis: { allowed: STD_TITHIS }, weekdays: { best: [1, 4, 5], ok: [3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: true, pitruPaksha: true, asta: ["Venus", "Jupiter"] },
    limitations: ["Rules differ for a newly built home (Apoorva), re-entry after repair (Dwandwaha) and a rented home; this search does not distinguish them.", "Months considered best for Griha Pravesh (Magha, Phalguna, Vaishakha, Jyeshtha) vary by region and are not enforced."],
  }),
  mk({
    id: "property-purchase", label: "Property Purchase Muhurat", group: "home", summary: "Buying or registering land, a flat or a house.",
    confidence: "general", basis: "Follows the Muhurta conventions for acquiring something meant to last: fixed and gentle nakshatras rank first. Rikta tithis, Amavasya, Kharmas, Adhika and Pitru Paksha are avoided.",
    nakshatras: { best: [...NAK.fixed, ...NAK.gentle], good: ["Pushya", "Hasta", "Dhanishta", "Shatabhisha"] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [1, 4, 5], ok: [3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["Registry offices keep their own working days and hours; check them against the window."],
  }),
  mk({
    id: "house-construction", label: "House Construction Muhurat", group: "home", summary: "Bhoomi pujan and the start of construction.",
    confidence: "general", basis: "Follows the Muhurta conventions for foundations: fixed nakshatras rank first. Kharmas, Adhika, Chaturmas, Rikta tithis and Amavasya are avoided.",
    nakshatras: { best: [...NAK.fixed], good: [...NAK.gentle, "Pushya", "Dhanishta", "Shatabhisha"] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [1, 4, 5], ok: [3] }, shuklaPreferred: true,
    avoid: { kharmas: true, adhika: true, chaturmas: true, pitruPaksha: true, panchak: true, asta: NO_ASTA },
    limitations: ["Vastu considerations (plot direction, the position of the Sun on the plot) and the owner's own chart are not evaluated."],
  }),
  mk({
    id: "vehicle-purchase", label: "Vehicle Purchase Muhurat", group: "vehicle", summary: "Buying a new car, bike or other vehicle.",
    confidence: "general", basis: "Follows the Muhurta conventions for acquisitions that move: swift and movable nakshatras rank first, gentle ones are also accepted. Thursday and Friday rank first. Rikta tithis, Amavasya and Pitru Paksha are avoided.",
    nakshatras: { best: [...NAK.swift, ...NAK.movable], good: [...NAK.gentle, ...NAK.fixed] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [4, 5], ok: [1, 3] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["Showroom opening hours and delivery schedules are not checked."],
  }),
  mk({
    id: "vehicle-delivery", label: "Vehicle Delivery Muhurat", group: "vehicle", summary: "Taking delivery of the vehicle you have booked.",
    confidence: "general", basis: "Uses the same rules as Vehicle Purchase.",
    nakshatras: { best: [...NAK.swift, ...NAK.movable], good: [...NAK.gentle, ...NAK.fixed] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [4, 5], ok: [1, 3] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["Showroom opening hours and delivery schedules are not checked."],
  }),
  mk({
    id: "travel", label: "Travel Muhurat", group: "vehicle", summary: "Starting a journey (Yatra).",
    confidence: "general", basis: "Follows the Muhurta conventions for journeys: movable and swift nakshatras rank first. Rikta tithis, Amavasya and Tuesday are avoided. If you give a direction, the weekday on which that direction is unfavourable (Dishashool) is excluded.",
    nakshatras: { best: [...NAK.movable, ...NAK.swift], good: [...NAK.gentle] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [1, 3, 4, 5], ok: [0, 6] }, shuklaPreferred: false,
    avoid: { kharmas: false, adhika: false, chaturmas: false, pitruPaksha: false, asta: NO_ASTA },
    limitations: ["Only the starting time of the journey is considered, not its duration.", "Other direction-based rules (such as Rahu's direction by day) are not evaluated."],
  }),
  mk({
    id: "business-opening", label: "Business Opening Muhurat", group: "business", summary: "Starting a business or opening the office.",
    confidence: "general", basis: "Follows the Muhurta conventions for beginnings: swift and fixed nakshatras rank first. Rikta tithis, Amavasya and Pitru Paksha are avoided.",
    nakshatras: { best: [...NAK.swift, ...NAK.fixed], good: [...NAK.gentle, ...NAK.movable] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [3, 4, 5], ok: [1] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["The owner's own chart and the business name are not evaluated."],
  }),
  mk({
    id: "shop-opening", label: "New Shop Opening Muhurat", group: "business", summary: "Opening a new shop or store.",
    confidence: "general", basis: "Uses the same rules as Business Opening.",
    nakshatras: { best: [...NAK.swift, ...NAK.fixed], good: [...NAK.gentle, ...NAK.movable] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [3, 4, 5], ok: [1] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["The owner's own chart and the shop's direction are not evaluated."],
  }),
  mk({
    id: "business-launch", label: "New Business Launch Muhurat", group: "business", summary: "Launching a new venture, product or website.",
    confidence: "general", basis: "Uses the same rules as Business Opening.",
    nakshatras: { best: [...NAK.swift, ...NAK.fixed], good: [...NAK.gentle, ...NAK.movable] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [3, 4, 5], ok: [1] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: true, chaturmas: false, pitruPaksha: true, asta: NO_ASTA },
    limitations: ["The owner's own chart is not evaluated."],
  }),
  mk({
    id: "work-beginning", label: "Important Work Beginning Muhurat", group: "business", summary: "Starting a job, a project or any important task.",
    confidence: "general", basis: "Follows the general Muhurta conventions for beginnings: swift and gentle nakshatras rank first. Rikta tithis and Amavasya are avoided.",
    nakshatras: { best: [...NAK.swift, ...NAK.gentle], good: [...NAK.fixed, ...NAK.movable] },
    tithis: { avoid: [4, 9, 14] }, weekdays: { best: [3, 4, 5], ok: [1, 0] }, shuklaPreferred: true,
    avoid: { kharmas: false, adhika: false, chaturmas: false, pitruPaksha: false, asta: NO_ASTA },
    limitations: ["The person's own chart is not evaluated."],
  }),
];

export const EVENT_BY_ID: Record<string, EventRule> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const METHOD = {
  id: "drik-lahiri-amanta-muhurta",
  label: "Drik Panchang · Lahiri sidereal · Amanta months · Muhurta Chintamani conventions",
  note: "Tithi, nakshatra, yoga and karana come from the real Sun and Moon positions at the event location. Sunrise and sunset, and so Rahu Kalam, Yamaganda and Gulika Kalam, are calculated for that place and date. The rule lists follow common Muhurta Shastra conventions and were not verified line by line against the Sanskrit texts. Regional and family traditions differ.",
};
