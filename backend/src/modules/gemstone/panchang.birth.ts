import { computePanchang, type PanchangDetails } from "./panchang.js";
import { isValidTimeZone } from "./birth.time.js";
import { buildTodayPanchang, validatePanchang } from "./panchang.today.js";

/**
 * Hindu calendar facts for the Bhavishya Marg (Future Life Path) reading.
 *
 * Both calendars come from `computePanchang` (real Sun and Moon positions, Lahiri sidereal, Amanta months);
 * no model is involved and no value is guessed. A field is listed ONLY when it was calculated and, for a
 * birth date without a birth time, only when it does not change during that date.
 *
 *  - Birth Panchang: needs the birthplace (its time zone and sunrise decide the day). Without a place it is
 *    not calculated at all, rather than assuming one.
 *  - Today's Panchang: the same engine for "now" at the reference place (New Delhi), which is named.
 *  - Festivals are not calculated anywhere in this project, so none are ever listed.
 */
export interface CalendarFact { label: string; value: string }

export interface CalendarBlock {
  title: string;
  /** One exact sentence built in code from the calculated facts (never written by a model). */
  summary: string;
  /** Set when the half of the lunar month is known. */
  paksha?: "Shukla" | "Krishna";
  /** Where and when it was reckoned, in plain words. */
  reckoned: string;
  facts: CalendarFact[];
  /** Plain-words notes about fields that were left out and why. */
  notes: string[];
}

export interface BirthPlace { latitude: number; longitude: number; timezone: string }

const ordinal = (n: number): string => {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};
const halfOf = (p: "Shukla" | "Krishna"): string =>
  p === "Shukla" ? "bright half (Shukla Paksha), when the Moon grows bigger each night" : "dark half (Krishna Paksha), when the Moon grows smaller each night";

/** A birthplace is used only when it is a real coordinate pair in a real time zone. */
export function parseBirthPlace(raw: unknown): BirthPlace | null {
  const p = raw as Partial<BirthPlace> | null;
  if (!p || typeof p !== "object") return null;
  const { latitude, longitude, timezone } = p;
  if (typeof latitude !== "number" || typeof longitude !== "number" || typeof timezone !== "string") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (timezone.length > 64 || !isValidTimeZone(timezone)) return null;
  return { latitude, longitude, timezone };
}

const clock = (hhmm: string) => hhmm;

/** Which labels a "changes during this date" note refers to. */
function uncertainLabels(uncertainties: string[]): Set<string> {
  const out = new Set<string>();
  for (const u of uncertainties) {
    if (u.startsWith("Tithi")) { out.add("Tithi"); out.add("Paksha"); }
    else if (u.startsWith("Nakshatra pada")) out.add("Nakshatra pada");
    else if (u.startsWith("Nakshatra")) out.add("Nakshatra");
    else if (u.startsWith("Moon Rashi")) out.add("Moon sign");
    else if (u.startsWith("Yoga")) out.add("Yoga");
    else if (u.startsWith("Karana")) out.add("Karana");
    else if (u.startsWith("The Hindu month")) out.add("Month");
  }
  return out;
}

/** The Panchang of the birth date at the birthplace, or null when it cannot be calculated honestly. */
export function buildBirthPanchang(dob: string, tob: string, place: BirthPlace | null, placeLabel: string): CalendarBlock | null {
  if (!place) return null;
  let p: PanchangDetails;
  try {
    const [hour, minute] = tob ? tob.split(":").map(Number) : [0, 0];
    p = computePanchang({ localDate: dob, time: tob ? { hour, minute } : null, place });
  } catch {
    return null;
  }
  if (validatePanchang(p)) return null; // an inconsistent result is never shown
  const changing = uncertainLabels(p.uncertainties);
  const facts: CalendarFact[] = [];
  // Tithi, Paksha, Nakshatra and Yoga are given for local sunrise when they change during the date (the traditional
  // reckoning for a date without a birth time) and are labelled so. Karana and the month are left out when they change.
  const soft = new Set(["Tithi", "Paksha", "Nakshatra", "Yoga"]);
  const add = (label: string, value: string, key = label) => {
    if (!value || !value.trim()) return;
    if (!changing.has(key)) facts.push({ label, value });
    else if (soft.has(key)) facts.push({ label: `${label} (at sunrise)`, value });
  };
  add("Tithi", p.tithi.name);
  add("Paksha", p.paksha === "shukla" ? "Shukla (bright half)" : "Krishna (dark half)");
  add("Nakshatra", changing.has("Nakshatra pada") || changing.has("Nakshatra") ? p.nakshatra.name : `${p.nakshatra.name}, pada ${p.nakshatra.pada}`, "Nakshatra");
  add("Yoga", p.yoga);
  add("Karana", p.karana);
  add("Hindu month", p.masa.adhika ? `Adhika ${p.masa.name}` : p.masa.name, "Month");
  if (tob) facts.push({ label: "Vedic weekday", value: p.vara.name }); // before sunrise it can differ from the civil weekday
  const notes: string[] = [];
  if (!tob) {
    notes.push(
      changing.size
        ? "No birth time was given, so values are for local sunrise. Those marked \"at sunrise\" change during your birth date, so add your birth time for exact ones."
        : "No birth time was given, so the values are for local sunrise on your birth date.",
    );
  }
  if (p.vara.note && tob && p.sunrise) notes.push(`Born before sunrise (${p.sunrise}), so the Vedic weekday is ${p.vara.name}.`);
  const pak: "Shukla" | "Krishna" = p.paksha === "shukla" ? "Shukla" : "Krishna";
  const tithiKnown = !changing.has("Tithi");
  const lead = tob || tithiKnown ? "You were born in" : "At sunrise on your birth date it was";
  const summary = `${lead} the ${halfOf(pak)}. ${p.tithi.name} is the ${ordinal(p.tithi.numberInPaksha)} day of that half.`;
  return {
    title: "Your birth Panchang",
    summary,
    paksha: pak,
    reckoned: tob ? `${dob} at ${clock(tob)}, ${placeLabel}` : `Sunrise on ${dob}, ${placeLabel}`,
    facts,
    notes,
  };
}

/** Today's Panchang at the reference place, or null if the calculation failed. */
export function buildTodayBlock(now: Date = new Date()): CalendarBlock | null {
  try {
    const t = buildTodayPanchang(now);
    const facts: CalendarFact[] = [
      { label: "Day", value: t.vara },
      { label: "Tithi", value: t.tithi.name },
      { label: "Paksha", value: t.paksha === "Shukla" ? "Shukla (bright half)" : "Krishna (dark half)" },
      { label: "Nakshatra", value: t.nakshatra.name },
    ];
    if (t.yoga) facts.push({ label: "Yoga", value: t.yoga });
    if (t.karana) facts.push({ label: "Karana", value: t.karana });
    if (t.masa) facts.push({ label: "Hindu month", value: t.masa });
    const summary = `Today is ${t.vara}: ${t.tithi.name}, the ${ordinal(t.tithi.numberInPaksha)} day of the ${t.paksha === "Shukla" ? "bright" : "dark"} half.`;
    return { title: "Today's Panchang", summary, paksha: t.paksha, reckoned: `${t.date}, ${t.place}`, facts, notes: [] };
  } catch {
    return null;
  }
}

const TITHIS = ["Pratipada", "Dwitiya", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

/**
 * True when a model text names a tithi or nakshatra that was not handed to it. Such a text is refused:
 * the model must never state calendar facts of its own.
 */
export function namesUnverifiedCalendarFact(text: string, blocks: (CalendarBlock | null)[]): boolean {
  const given = blocks.flatMap((b) => b?.facts ?? []).map((f) => f.value.toLowerCase());
  const t = text.toLowerCase();
  return [...TITHIS, ...NAKSHATRAS].some((n) => {
    const k = n.toLowerCase();
    return new RegExp(`\\b${k}\\b`).test(t) && !given.some((g) => new RegExp(`\\b${k}\\b`).test(g));
  });
}

/** True when a text quotes a chapter, verse or canto. Scripture is added from the verified catalog, never by the model. */
export function citesScripture(text: string): boolean {
  return /\b(chapter|verse|shloka|sloka|adhyay|adhyaya|canto|skandha|gita|bhagavad|bhagwad|bhagavata|bhagwat|purana)\b|\b\d{1,2}\s*[.:]\s*\d{1,3}\b/i.test(text);
}

/** True when a text names any tithi or nakshatra, a weekday or a lunar month: the model may not state calendar terms. */
export function namesCalendarTerm(text: string): boolean {
  const t = text.toLowerCase();
  const terms = [...TITHIS, ...NAKSHATRAS, "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "tithi", "nakshatra", "panchang", "karana"];
  return terms.some((k) => new RegExp(`\\b${k.toLowerCase()}\\b`).test(t));
}

/** True when a text states a life path number other than the calculated one. */
export function contradictsFacts(text: string, lifePath: number): boolean {
  return [...text.matchAll(/life path(?: number)?\s*(\d{1,2})/gi)].some((m) => Number(m[1]) !== lifePath);
}
