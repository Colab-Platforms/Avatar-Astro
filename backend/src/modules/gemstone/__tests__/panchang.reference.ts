/**
 * Compares the Panchang engine with the Drik Panchang reference data (see panchang.reference.data.ts).
 *
 * The engine (panchang.ts, chart.engine.ts) is NOT modified or tuned here. To compare end times, this file
 * finds the instant at which each element changes using the engine's own Sun and Moon longitudes
 * (computePlanets) with a separate root finder, and uses computePanchang for names and month data.
 *
 * Tolerance, fixed before the first run: an end time passes when it is within 3 minutes of Drik's printed
 * minute. Sunrise and sunset pass within 2 minutes.
 */
import { computePlanets } from "../chart.engine.js";
import { computePanchang } from "../panchang.js";
import { resolveBirthInstant } from "../birth.time.js";
import { REFERENCE_CASES, type Element, type RefCase, type RefItem } from "./panchang.reference.data.js";

export const END_TOLERANCE_MIN = 3;
export const SUN_TOLERANCE_MIN = 2;

const SEG = 360 / 27;
const norm = (d: number) => ((d % 360) + 360) % 360;
const MIN = 60_000;

const lon = (t: Date) => {
  const p = computePlanets(t);
  return { sun: p.Sun.longitude, moon: p.Moon.longitude };
};

/** Index of the running tithi / nakshatra / yoga / karana at an instant. */
const indexOf = (element: Element, t: Date): number => {
  const { sun, moon } = lon(t);
  const elong = norm(moon - sun);
  switch (element) {
    case "tithi":
      return Math.floor(elong / 12);
    case "karana":
      return Math.floor(elong / 6);
    case "nakshatra":
      return Math.floor(moon / SEG);
    case "yoga":
      return Math.floor(norm(sun + moon) / SEG);
  }
};

/** First instant after `from` at which the element's index changes (5-minute scan, then bisection to a second). */
export const endOfSegment = (element: Element, from: Date): Date => {
  const start = indexOf(element, from);
  let lo = from.getTime();
  let hi = lo;
  for (let i = 0; i < 24 * 12 * 2; i++) {
    hi = lo + 5 * MIN;
    if (indexOf(element, new Date(hi)) !== start) break;
    lo = hi;
  }
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (indexOf(element, new Date(mid)) === start) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
};

const localParts = (tz: string, at: Date) => {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(at)) if (p.type !== "literal") o[p.type] = p.value;
  return { date: `${o.year}-${o.month}-${o.day}`, hour: Number(o.hour), minute: Number(o.minute), text: `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}` };
};

const toUtc = (c: RefCase, local: string): Date => {
  const [d, t] = local.split(" ");
  const [year, month, day] = d.split("-").map(Number);
  const [hour, minute] = t.split(":").map(Number);
  return resolveBirthInstant({ year, month, day, hour, minute }, c.timezone).utc;
};

const alias = (s: string): string => {
  const k = s.toLowerCase().replace(/\s*\(.*\)/, "").trim();
  const map: Record<string, string> = { nagava: "naga", kinstughna: "kimstughna", dhanishtha: "dhanishta", garaja: "gara", ashwina: "ashvina" };
  return map[k] ?? k;
};

/** Name the engine gives to the element running at `at`. */
const engineName = (c: RefCase, element: Element, at: Date): string => {
  const lp = localParts(c.timezone, at);
  const p = computePanchang({ localDate: lp.date, time: { hour: lp.hour, minute: lp.minute }, place: { latitude: c.latitude, longitude: c.longitude, timezone: c.timezone } });
  switch (element) {
    case "tithi":
      return p.tithi.name;
    case "nakshatra":
      return p.nakshatra.name;
    case "yoga":
      return p.yoga;
    case "karana":
      return p.karana;
  }
};

export interface EndRow {
  caseId: string;
  city: string;
  date: string;
  element: Element;
  refName: string;
  engineName: string;
  nameMatches: boolean;
  refEnd: string;
  engineEnd: string;
  diffMinutes: number;
  pass: boolean;
}

export const compareEnd = (c: RefCase, item: RefItem): EndRow => {
  const refEnd = toUtc(c, item.end);
  // Look at the element one hour before Drik's end, so we are inside the segment Drik says is ending.
  const probe = new Date(refEnd.getTime() - 60 * MIN);
  const engEnd = endOfSegment(item.element, probe);
  const diff = (engEnd.getTime() - refEnd.getTime()) / MIN;
  const eName = engineName(c, item.element, probe);
  const nameMatches = alias(eName) === alias(item.name);
  return {
    caseId: c.id,
    city: c.city,
    date: c.date,
    element: item.element,
    refName: item.name,
    engineName: eName,
    nameMatches,
    refEnd: item.end,
    engineEnd: localParts(c.timezone, engEnd).text,
    diffMinutes: Math.round(diff * 10) / 10,
    pass: nameMatches && Math.abs(diff) <= END_TOLERANCE_MIN,
  };
};

export interface DayRow {
  caseId: string;
  city: string;
  date: string;
  covers: string;
  checks: { field: string; reference: string; engine: string; pass: boolean }[];
}

const hmDiff = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
};

export const compareDay = (c: RefCase): DayRow => {
  const place = { latitude: c.latitude, longitude: c.longitude, timezone: c.timezone };
  const p = computePanchang({ localDate: c.date, time: null, place }); // reckoned at local sunrise, like Drik's day header
  const month = (m: { name?: string; month?: string; adhika: boolean }) => `${m.adhika ? "Adhika " : ""}${m.name ?? m.month}`;
  const checks = [
    { field: "Amanta month", reference: month(c.amanta), engine: month(p.masa) },
    { field: "Purnimanta month", reference: month(c.purnimanta), engine: month(p.purnimantaMasa) },
    { field: "Paksha", reference: c.paksha, engine: p.paksha },
    { field: "Vikram Samvat", reference: String(c.vikramSamvat), engine: String(p.vikramSamvat) },
    { field: "Sunrise", reference: c.sunrise, engine: p.sunrise ?? "none" },
    { field: "Sunset", reference: c.sunset, engine: p.sunset ?? "none" },
  ].map((x) => ({
    ...x,
    pass: x.field === "Sunrise" || x.field === "Sunset" ? x.engine !== "none" && Math.abs(hmDiff(x.engine, x.reference)) <= SUN_TOLERANCE_MIN : alias(x.reference) === alias(x.engine),
  }));
  return { caseId: c.id, city: c.city, date: c.date, covers: c.covers, checks };
};

export const runReference = () => {
  const ends: EndRow[] = [];
  const days: DayRow[] = [];
  for (const c of REFERENCE_CASES) {
    days.push(compareDay(c));
    for (const item of c.items) ends.push(compareEnd(c, item));
  }
  return { ends, days };
};
