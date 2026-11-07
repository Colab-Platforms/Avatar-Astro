/**
 * Muhurat search. Stateless and deterministic: the same event, place, dates and preferences always give the same windows.
 *
 * PIPELINE (each step is a separate function):
 *   1. Day context   - real local sunrise/sunset, weekday, lunar month, planet combustion (day level).
 *   2. Eligibility   - `evaluate(rule, ctx, instant)` returns the reasons an instant FAILS the event's rules (empty = suitable).
 *   3. Windows       - the daytime is sampled; runs of suitable instants become windows; each edge is then bisected to the minute.
 *   4. Ranking       - `scoreWindow` (documented below); the best window of each date is listed, best first.
 *
 * Panchang values come from `limbsAt` (the one shared engine in gemstone/panchang.ts); sunrise/sunset from the same engine.
 * Nothing is looked up or invented: a date with no qualifying instant says why.
 */
import { limbsAt, computePanchang, sunsetOnLocalDate, tithiName, type Limbs } from "../gemstone/panchang.js";
import { sunriseOnLocalDate } from "../gemstone/date.based.js";
import { computePlanets, assertValidLocation } from "../gemstone/chart.engine.js";
import { isValidTimeZone } from "../gemstone/birth.time.js";
import { DISHASHOOL, WEEKDAYS, periodsFor, inPeriod, type Direction, type DayPeriods, type Period } from "./periods.js";
import { EVENT_BY_ID, METHOD, UNIVERSAL, type EventRule } from "./rules.js";

export class MuhuratInputError extends Error {}

export type TimeOfDay = "any" | "morning" | "afternoon";

export interface MuhuratPlace {
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface MuhuratRequest {
  event: string;
  place: MuhuratPlace;
  /** Local dates at the event place, YYYY-MM-DD, inclusive. */
  startDate: string;
  endDate: string;
  preferences?: { weekdays?: number[]; timeOfDay?: TimeOfDay; direction?: Direction };
}

export interface PanchangValues {
  tithi: string;
  paksha: "Shukla" | "Krishna";
  nakshatra: string;
  pada: number;
  yoga: string;
  karana: string;
}

export interface AvoidedPeriod { label: string; startLocal: string; endLocal: string }

export interface MuhuratWindow {
  date: string;
  weekday: string;
  startLocal: string; // HH:mm at the event place
  endLocal: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  score: number;
  scoreParts: { label: string; points: number }[];
  /** Panchang at the start of the window. */
  panchang: PanchangValues;
  /** Elements that change inside the window, in words. */
  changes: string[];
  avoidedPeriods: AvoidedPeriod[];
  /** Why the window qualifies: only statements backed by the calculated values. */
  why: string[];
}

export interface DayResult {
  date: string;
  weekday: string;
  sunrise: string | null;
  sunset: string | null;
  windows: MuhuratWindow[];
  bestScore: number;
  /** Why nothing qualified (empty when a window was found). */
  blockers: string[];
  avoidedPeriods: AvoidedPeriod[];
  abhijit: { startLocal: string; endLocal: string } | null;
}

export interface MuhuratResult {
  event: { id: string; label: string; confidence: string; basis: string; limitations: string[] };
  place: MuhuratPlace;
  startDate: string;
  endDate: string;
  method: { id: string; label: string; note: string };
  /** The Panchang elements and conditions that were actually evaluated for this event. */
  evaluated: string[];
  rules: string[];
  best: MuhuratWindow | null;
  others: MuhuratWindow[];
  days: DayResult[];
  totals: { days: number; daysWithWindows: number; windows: number };
  notes: string[];
}

/* ---------------- dates and local time ---------------- */

const SAMPLE_MIN = 10;
const MIN_WINDOW_MIN = 20;
const MIN = 60_000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const parseYmd = (s: string) => { const [year, month, day] = s.split("-").map(Number); return { year, month, day }; };
const addDays = (s: string, n: number): string => {
  const { year, month, day } = parseYmd(s);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const daysBetween = (a: string, b: string): number => {
  const x = parseYmd(a), y = parseYmd(b);
  return Math.round((Date.UTC(y.year, y.month - 1, y.day) - Date.UTC(x.year, x.month - 1, x.day)) / 86_400_000);
};
const validYmd = (s: unknown): s is string => {
  if (typeof s !== "string" || !YMD.test(s)) return false;
  const { year, month, day } = parseYmd(s);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); fmtCache.set(tz, f); }
  return f;
};
/** HH:mm at the event place. */
export const hm = (tz: string, d: Date): string => fmt(tz).format(d);
const minuteOfDay = (tz: string, d: Date): number => { const [h, m] = hm(tz, d).split(":").map(Number); return h * 60 + m; };
const todayAt = (tz: string, now: Date): string => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p;
};

const floorMinute = (d: Date) => new Date(Math.floor(d.getTime() / MIN) * MIN);
const ceilMinute = (d: Date) => new Date(Math.ceil(d.getTime() / MIN) * MIN);

/* ---------------- input ---------------- */

export const MAX_DAYS = 366;

export const parseMuhuratRequest = (raw: unknown, now: Date = new Date()): MuhuratRequest => {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (typeof b.event !== "string" || !EVENT_BY_ID[b.event]) throw new MuhuratInputError("Please choose one of the events.");
  const p = (b.place ?? {}) as Record<string, unknown>;
  const lat = Number(p.latitude), lon = Number(p.longitude);
  if (typeof p.name !== "string" || !p.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new MuhuratInputError("Please select the event location from the search results.");
  if (typeof p.timezone !== "string" || !isValidTimeZone(p.timezone)) throw new MuhuratInputError("The selected location has no valid time zone.");
  try { assertValidLocation(lat, lon); } catch (e) { throw new MuhuratInputError((e as Error).message); }
  if (!validYmd(b.startDate) || !validYmd(b.endDate)) throw new MuhuratInputError("Please enter a valid start and end date.");
  if (b.endDate < b.startDate) throw new MuhuratInputError("The end date must be on or after the start date.");
  if (daysBetween(b.startDate, b.endDate) + 1 > MAX_DAYS) throw new MuhuratInputError(`Please search at most ${MAX_DAYS} days at a time.`);
  if (b.startDate < todayAt(p.timezone, now)) throw new MuhuratInputError("The start date cannot be in the past at the event location.");

  const pr = (b.preferences ?? {}) as Record<string, unknown>;
  const weekdays = Array.isArray(pr.weekdays) ? [...new Set(pr.weekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))] : undefined;
  const timeOfDay: TimeOfDay = pr.timeOfDay === "morning" || pr.timeOfDay === "afternoon" ? pr.timeOfDay : "any";
  const direction = (["North", "South", "East", "West"] as const).find((d) => d === pr.direction);
  return {
    event: b.event,
    place: { name: p.name.trim().slice(0, 80), admin1: typeof p.admin1 === "string" ? p.admin1 : null, country: typeof p.country === "string" ? p.country : null, latitude: lat, longitude: lon, timezone: p.timezone },
    startDate: b.startDate,
    endDate: b.endDate,
    preferences: { weekdays: weekdays?.length ? weekdays : undefined, timeOfDay, direction },
  };
};

/* ---------------- day context ---------------- */

interface DayCtx {
  date: string;
  weekdayIndex: number;
  rise: Date;
  set: Date;
  periods: DayPeriods;
  masaRise: { name: string; adhika: boolean } | null;
  masaSet: { name: string; adhika: boolean } | null;
  risePaksha: Limbs["paksha"];
  /** Reasons that rule out the whole day (weekday, combustion, ...). */
  dayFails: string[];
}

const sepDeg = (a: number, b: number) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };

const needsMonth = (r: EventRule) => r.avoid.adhika || r.avoid.chaturmas || r.avoid.pitruPaksha;

const dayContext = (rule: EventRule, req: MuhuratRequest, date: string): DayCtx | { date: string; noSun: true } => {
  const { place } = req;
  const ymd = parseYmd(date);
  const rise = sunriseOnLocalDate(ymd, place.latitude, place.longitude, place.timezone, true);
  const set = sunsetOnLocalDate(ymd, place.latitude, place.longitude, place.timezone, true);
  if (!rise || !set || set <= rise) return { date, noSun: true };
  const weekdayIndex = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day)).getUTCDay();
  const dayFails: string[] = [];

  const prefDays = req.preferences?.weekdays;
  if (prefDays && !prefDays.includes(weekdayIndex)) dayFails.push(`${WEEKDAYS[weekdayIndex]} is not one of your preferred weekdays`);
  if (!rule.weekdays.best.includes(weekdayIndex) && !rule.weekdays.ok.includes(weekdayIndex)) dayFails.push(`${WEEKDAYS[weekdayIndex]} is not a suitable weekday for this event`);
  const dir = req.preferences?.direction;
  if (rule.id === "travel" && dir && DISHASHOOL[weekdayIndex] === dir) dayFails.push(`${WEEKDAYS[weekdayIndex]} is Dishashool for ${dir}: that direction is unfavourable on this weekday`);

  for (const planet of rule.avoid.asta) {
    const t = computePlanets(rise);
    if (sepDeg(t[planet].longitude, t.Sun.longitude) < UNIVERSAL.astaDegrees[planet]) dayFails.push(`${planet === "Venus" ? "Shukra" : "Guru"} (${planet}) is combust (asta)`);
  }

  let masaRise: DayCtx["masaRise"] = null;
  let masaSet: DayCtx["masaSet"] = null;
  const risePaksha = limbsAt(rise).paksha;
  if (!dayFails.length && needsMonth(rule)) {
    const p = computePanchang({ localDate: date, time: null, place, allowFuture: true });
    masaRise = { name: p.masa.name, adhika: p.masa.adhika };
    masaSet = masaRise;
    if (risePaksha === "krishna" && limbsAt(set).paksha === "shukla") {
      const q = computePanchang({ localDate: date, time: { hour: Number(hm(place.timezone, set).slice(0, 2)), minute: Number(hm(place.timezone, set).slice(3)) }, place, allowFuture: true });
      masaSet = { name: q.masa.name, adhika: q.masa.adhika };
    }
  }
  return { date, weekdayIndex, rise, set, periods: periodsFor(weekdayIndex, rise, set), masaRise, masaSet, risePaksha, dayFails };
};

/* ---------------- eligibility ---------------- */

const inWithin = (l: Limbs) => ((l.tithiNumber - 1) % 15) + 1;
const isKharmas = (sunLongitude: number) => { const sign = Math.floor((((sunLongitude % 360) + 360) % 360) / 30); return sign === 8 || sign === 11; };

/** Reasons this instant does NOT qualify. Empty = suitable. */
export const evaluate = (rule: EventRule, ctx: DayCtx, t: Date, tz: string, timeOfDay: TimeOfDay = "any"): string[] => {
  const l = limbsAt(t);
  const fails: string[] = [];
  const n = inWithin(l);
  const tn = tithiName(l.paksha, n).name;

  if (l.tithiNumber === 30 && UNIVERSAL.avoidAmavasya) fails.push("Amavasya is avoided");
  else if (rule.tithis.allowed) { if (!rule.tithis.allowed.includes(n)) fails.push(`Tithi ${tn} is not among the suitable tithis`); }
  else if (((rule.tithis.avoid ?? UNIVERSAL.defaultAvoidTithis) as readonly number[]).includes(n) && !(n === 15)) fails.push(`Tithi ${tn} is a Rikta tithi, which is avoided`);

  if (!rule.nakshatras.best.includes(l.nakshatra.name) && !rule.nakshatras.good.includes(l.nakshatra.name)) fails.push(`Nakshatra ${l.nakshatra.name} is not among the suitable nakshatras`);
  if ((UNIVERSAL.avoidYogas as readonly string[]).includes(l.yoga)) fails.push(`Yoga ${l.yoga} is avoided`);
  if ((UNIVERSAL.avoidKaranas as readonly string[]).includes(l.karana)) fails.push("Vishti (Bhadra) karana is avoided");
  if (rule.avoid.kharmas && isKharmas(l.sunLongitude)) fails.push("Kharmas (the Sun is in Dhanu or Meena) is avoided");

  const masa = ctx.risePaksha === "krishna" && l.paksha === "shukla" ? ctx.masaSet : ctx.masaRise;
  if (masa) {
    if (rule.avoid.adhika && masa.adhika) fails.push("Adhika masa (the extra month) is avoided");
    if (rule.avoid.pitruPaksha && !masa.adhika && masa.name === "Bhadrapada" && l.paksha === "krishna") fails.push("Pitru Paksha is avoided");
    if (rule.avoid.chaturmas) {
      const m = masa.name;
      const inChaturmas = (m === "Ashadha" && l.paksha === "shukla" && n >= 11) || m === "Shravana" || m === "Bhadrapada" || m === "Ashvina" || (m === "Kartika" && l.paksha === "shukla" && n <= 11);
      if (inChaturmas && !masa.adhika) fails.push("Chaturmas (Devshayani to Prabodhini Ekadashi) is avoided");
    }
  }

  if (inPeriod(t, ctx.periods.rahuKalam)) fails.push("Rahu Kalam");
  if (inPeriod(t, ctx.periods.yamaganda)) fails.push("Yamaganda");
  if (inPeriod(t, ctx.periods.gulika)) fails.push("Gulika Kalam");

  if (timeOfDay !== "any") {
    const m = minuteOfDay(tz, t);
    if (timeOfDay === "morning" && m >= 720) fails.push("Outside your preferred time of day (morning)");
    if (timeOfDay === "afternoon" && m < 720) fails.push("Outside your preferred time of day (afternoon)");
  }
  return fails;
};

/* ---------------- ranking ---------------- */

/**
 * Score out of 100 (MyBhagya's ordering of windows that ALREADY qualify; not a classical grade):
 *   nakshatra: 30 if in the event's first-choice list, 15 if only accepted
 *   weekday:   20 if first-choice, 8 if only accepted
 *   paksha:    8 for Shukla where the event prefers it
 *   length:    up to 10 (1 point per 18 minutes, capped at 180)
 *   base:      32 for qualifying at all
 * Ties are broken by the earlier date, then the earlier start.
 */
export const scoreWindow = (rule: EventRule, weekdayIndex: number, l: Limbs, minutes: number): { score: number; parts: { label: string; points: number }[] } => {
  const parts: { label: string; points: number }[] = [{ label: "Meets every rule for this event", points: 32 }];
  parts.push({ label: rule.nakshatras.best.includes(l.nakshatra.name) ? `${l.nakshatra.name}: a first-choice nakshatra` : `${l.nakshatra.name}: an accepted nakshatra`, points: rule.nakshatras.best.includes(l.nakshatra.name) ? 30 : 15 });
  parts.push({ label: rule.weekdays.best.includes(weekdayIndex) ? `${WEEKDAYS[weekdayIndex]}: a first-choice weekday` : `${WEEKDAYS[weekdayIndex]}: an accepted weekday`, points: rule.weekdays.best.includes(weekdayIndex) ? 20 : 8 });
  if (rule.shuklaPreferred && l.paksha === "shukla") parts.push({ label: "Shukla paksha", points: 8 });
  parts.push({ label: "Length of the window", points: Math.min(10, Math.floor(Math.min(minutes, 180) / 18)) });
  return { score: parts.reduce((a, p) => a + p.points, 0), parts };
};

/* ---------------- windows ---------------- */

const bisect = (lo: Date, hi: Date, okAt: (t: Date) => boolean): Date => {
  // lo and hi differ in suitability; return the first instant (to the second) on hi's side of the flip.
  const loOk = okAt(lo);
  let a = lo.getTime(), b = hi.getTime();
  while (b - a > 1000) {
    const mid = Math.floor((a + b) / 2);
    if (okAt(new Date(mid)) === loOk) a = mid; else b = mid;
  }
  return new Date(b);
};

const panchangValues = (l: Limbs): PanchangValues => ({
  tithi: tithiName(l.paksha, inWithin(l)).name,
  paksha: l.paksha === "shukla" ? "Shukla" : "Krishna",
  nakshatra: l.nakshatra.name,
  pada: l.nakshatra.pada,
  yoga: l.yoga,
  karana: l.karana,
});

const KEYS: { label: string; of: (l: Limbs) => string }[] = [
  { label: "Tithi", of: (l) => `${l.paksha}-${inWithin(l)}` },
  { label: "Nakshatra", of: (l) => l.nakshatra.name },
  { label: "Yoga", of: (l) => l.yoga },
  { label: "Karana", of: (l) => l.karana },
];
const display = (label: string, l: Limbs) => (label === "Tithi" ? tithiName(l.paksha, inWithin(l)).name : label === "Nakshatra" ? l.nakshatra.name : label === "Yoga" ? l.yoga : l.karana);

const changesWithin = (start: Date, end: Date, tz: string): string[] => {
  const out: string[] = [];
  for (const k of KEYS) {
    let prev = limbsAt(start);
    for (let t = start.getTime() + SAMPLE_MIN * MIN; ; t += SAMPLE_MIN * MIN) {
      const at = new Date(Math.min(t, end.getTime()));
      const cur = limbsAt(at);
      if (k.of(cur) !== k.of(prev)) {
        const flip = bisect(new Date(at.getTime() - SAMPLE_MIN * MIN), at, (x) => k.of(limbsAt(x)) === k.of(prev));
        out.push(`${k.label} ${display(k.label, prev)} until ${hm(tz, flip)}, then ${display(k.label, cur)}`);
      }
      prev = cur;
      if (at.getTime() >= end.getTime()) break;
    }
  }
  return out;
};

const fmtPeriod = (label: string, p: Period, tz: string): AvoidedPeriod => ({ label, startLocal: hm(tz, p.start), endLocal: hm(tz, p.end) });

const whyLines = (rule: EventRule, weekdayIndex: number, l: Limbs, w: { tithiChanged: boolean }): string[] => {
  const n = inWithin(l);
  const tn = tithiName(l.paksha, n).name;
  const lines: string[] = [];
  lines.push(`Nakshatra ${l.nakshatra.name} ${rule.nakshatras.best.includes(l.nakshatra.name) ? "is a first-choice nakshatra" : "is an accepted nakshatra"} for ${rule.label.replace(" Muhurat", "").toLowerCase()}.`);
  lines.push(rule.tithis.allowed ? `${l.paksha === "shukla" ? "Shukla" : "Krishna"} ${tn} is one of the tithis this tradition accepts for it.` : `${tn} is not a Rikta tithi (4, 9, 14) and is not Amavasya.`);
  lines.push(`${WEEKDAYS[weekdayIndex]} is ${rule.weekdays.best.includes(weekdayIndex) ? "a first-choice" : "an accepted"} weekday.`);
  lines.push(`Yoga ${l.yoga} and the ${l.karana} karana are not among the avoided ones.`);
  lines.push("The window lies outside Rahu Kalam, Yamaganda and Gulika Kalam for this place and date.");
  if (w.tithiChanged) lines.push("The tithi changes inside this window; both tithis are suitable.");
  return lines;
};

/* ---------------- search ---------------- */

export const describeRules = (rule: EventRule, prefs?: MuhuratRequest["preferences"]): string[] => {
  const out: string[] = [];
  out.push(`Nakshatra, first choice: ${rule.nakshatras.best.join(", ")}.`);
  out.push(`Nakshatra, also accepted: ${rule.nakshatras.good.join(", ")}.`);
  out.push(rule.tithis.allowed ? `Tithi (within each paksha): ${rule.tithis.allowed.join(", ")} only.` : `Tithi: all except ${(rule.tithis.avoid ?? UNIVERSAL.defaultAvoidTithis).join(", ")} (Rikta) and Amavasya.`);
  out.push(`Weekday, first choice: ${rule.weekdays.best.map((d) => WEEKDAYS[d]).join(", ")}; also accepted: ${rule.weekdays.ok.length ? rule.weekdays.ok.map((d) => WEEKDAYS[d]).join(", ") : "none"}.`);
  out.push(`Always avoided: ${UNIVERSAL.avoidYogas.join(", ")} yogas; Vishti (Bhadra) karana; Amavasya; ${UNIVERSAL.periods.join(", ")}.`);
  const seasons = [rule.avoid.kharmas && "Kharmas", rule.avoid.adhika && "Adhika masa", rule.avoid.chaturmas && "Chaturmas", rule.avoid.pitruPaksha && "Pitru Paksha", ...rule.avoid.asta.map((p) => `${p === "Venus" ? "Shukra" : "Guru"} asta`)].filter(Boolean);
  out.push(seasons.length ? `Seasons and conditions avoided: ${seasons.join(", ")}.` : "No seasonal restriction is applied to this event.");
  if (prefs?.weekdays?.length) out.push(`Your weekday preference: ${prefs.weekdays.map((d) => WEEKDAYS[d]).join(", ")}.`);
  if (prefs?.timeOfDay && prefs.timeOfDay !== "any") out.push(`Your time of day preference: ${prefs.timeOfDay}.`);
  if (prefs?.direction) out.push(`Travel direction: ${prefs.direction} (Dishashool applied).`);
  return out;
};

/** What the engine actually looked at for this event: only things that were really evaluated are listed. */
export const describeEvaluated = (rule: EventRule, prefs?: MuhuratRequest["preferences"]): string[] => {
  const out = ["Tithi and paksha", "Nakshatra", "Yoga", "Karana", "Vedic weekday (Vara), from local sunrise", "Sunrise and sunset at the event location", "Rahu Kalam", "Yamaganda", "Gulika Kalam"];
  if (rule.avoid.kharmas) out.push("Kharmas (the Sun's sidereal sign)");
  if (rule.avoid.adhika || rule.avoid.chaturmas || rule.avoid.pitruPaksha) out.push("Hindu lunar month (Adhika masa" + (rule.avoid.chaturmas ? ", Chaturmas" : "") + (rule.avoid.pitruPaksha ? ", Pitru Paksha" : "") + ")");
  for (const p of rule.avoid.asta) out.push(`${p === "Venus" ? "Shukra" : "Guru"} (${p}) combustion`);
  if (rule.id === "travel" && prefs?.direction) out.push("Dishashool for the chosen direction");
  return out;
};

export const searchMuhurat = (req: MuhuratRequest): MuhuratResult => {
  const rule = EVENT_BY_ID[req.event];
  if (!rule) throw new MuhuratInputError("Unknown event.");
  const tz = req.place.timezone;
  const timeOfDay = req.preferences?.timeOfDay ?? "any";
  const count = daysBetween(req.startDate, req.endDate) + 1;
  const days: DayResult[] = [];
  const notes: string[] = [];

  for (let i = 0; i < count; i++) {
    const date = addDays(req.startDate, i);
    const ctx = dayContext(rule, req, date);
    if ("noSun" in ctx) {
      days.push({ date, weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()], sunrise: null, sunset: null, windows: [], bestScore: 0, blockers: ["No sunrise or sunset could be calculated here on this date"], avoidedPeriods: [], abhijit: null });
      notes.push(`${date}: no sunrise or sunset could be calculated at this latitude, so the day was skipped.`);
      continue;
    }
    const avoidedPeriods = [fmtPeriod("Rahu Kalam", ctx.periods.rahuKalam, tz), fmtPeriod("Yamaganda", ctx.periods.yamaganda, tz), fmtPeriod("Gulika Kalam", ctx.periods.gulika, tz)];
    const base: Omit<DayResult, "windows" | "bestScore" | "blockers"> = {
      date, weekday: WEEKDAYS[ctx.weekdayIndex], sunrise: hm(tz, ctx.rise), sunset: hm(tz, ctx.set), avoidedPeriods,
      abhijit: { startLocal: hm(tz, ctx.periods.abhijit.start), endLocal: hm(tz, ctx.periods.abhijit.end) },
    };
    if (ctx.dayFails.length) { days.push({ ...base, windows: [], bestScore: 0, blockers: ctx.dayFails }); continue; }

    const okAt = (t: Date) => evaluate(rule, ctx, t, tz, timeOfDay).length === 0;
    const failCounts = new Map<string, number>();
    const times: Date[] = [];
    for (let t = ctx.rise.getTime(); t < ctx.set.getTime(); t += SAMPLE_MIN * MIN) times.push(new Date(t));
    times.push(ctx.set);
    const ok = times.map((t) => {
      const f = evaluate(rule, ctx, t, tz, timeOfDay);
      for (const r of f) failCounts.set(r, (failCounts.get(r) ?? 0) + 1);
      return f.length === 0;
    });

    const windows: MuhuratWindow[] = [];
    for (let a = 0; a < times.length; a++) {
      if (!ok[a]) continue;
      let b = a;
      while (b + 1 < times.length && ok[b + 1]) b++;
      // Every edge is rounded INWARD to a whole minute, including sunrise and sunset, so a window never shows a time outside what qualifies.
      const start = ceilMinute(a === 0 ? ctx.rise : bisect(times[a - 1], times[a], okAt));
      const end = floorMinute(b === times.length - 1 ? ctx.set : bisect(times[b], times[b + 1], okAt));
      a = b;
      const minutes = Math.round((end.getTime() - start.getTime()) / MIN);
      if (minutes < MIN_WINDOW_MIN) continue;
      const l = limbsAt(start);
      const changes = changesWithin(start, end, tz);
      const { score, parts } = scoreWindow(rule, ctx.weekdayIndex, l, minutes);
      windows.push({
        date, weekday: base.weekday, startLocal: hm(tz, start), endLocal: hm(tz, end), startUtc: start.toISOString(), endUtc: end.toISOString(),
        durationMinutes: minutes, score, scoreParts: parts, panchang: panchangValues(l), changes, avoidedPeriods,
        why: whyLines(rule, ctx.weekdayIndex, l, { tithiChanged: changes.some((c) => c.startsWith("Tithi")) }),
      });
    }
    windows.sort((x, y) => y.score - x.score || x.startUtc.localeCompare(y.startUtc));
    const blockers = windows.length ? [] : [...failCounts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([r]) => r);
    days.push({ ...base, windows, bestScore: windows[0]?.score ?? 0, blockers });
  }

  const bestPerDay = days.filter((d) => d.windows.length).map((d) => d.windows[0]);
  const ranked = [...bestPerDay].sort((x, y) => y.score - x.score || x.date.localeCompare(y.date) || x.startUtc.localeCompare(y.startUtc));
  const withWindows = days.filter((d) => d.windows.length);
  return {
    event: { id: rule.id, label: rule.label, confidence: rule.confidence, basis: rule.basis, limitations: rule.limitations },
    place: req.place,
    startDate: req.startDate,
    endDate: req.endDate,
    method: METHOD,
    evaluated: describeEvaluated(rule, req.preferences),
    rules: describeRules(rule, req.preferences),
    best: ranked[0] ?? null,
    others: ranked.slice(1, 6),
    days,
    totals: { days: days.length, daysWithWindows: withWindows.length, windows: withWindows.reduce((a, d) => a + d.windows.length, 0) },
    notes,
  };
};

