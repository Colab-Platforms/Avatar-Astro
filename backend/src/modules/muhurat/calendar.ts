/**
 * The Panchang of one Vedic day (local sunrise to the next local sunrise) at a place, with the exact local time at which each element
 * changes. A tithi or nakshatra is NEVER presented as one fixed value for a civil date: each element is a list of segments.
 *
 * Everything comes from the shared engine: `limbsAt` for the five limbs, `computePanchang` at sunrise for the lunar month and
 * Vikram Samvat. Transition times are found by bisection to the second and shown to the minute.
 */
import { computePanchang, limbsAt, tithiName, type Limbs } from "../gemstone/panchang.js";
import { addDays, sunTimes, type SunPlace } from "./sun.js";

const MIN = 60_000;
const STEP = 10 * MIN;

export interface Segment {
  name: string;
  /** Local time (HH:mm) at which it ends, or null when it is still running at the next sunrise. */
  until: string | null;
  /** True when `until` is after midnight, on the next civil date. */
  untilNextDay: boolean;
}

export interface DayPanchang {
  vikramSamvat: number;
  masa: { name: string; adhika: boolean };
  purnimantaMasa: { name: string; adhika: boolean };
  paksha: "Shukla" | "Krishna";
  vara: string;
  tithi: Segment[];
  nakshatra: Segment[];
  yoga: Segment[];
  karana: Segment[];
  /** Panchak (Moon from Dhanishta pada 3 to the end of Revati) during this Vedic day, in local times; null when not running. */
  panchak: { from: string | null; until: string | null } | null;
}

/** Panchak: the Moon in the second half of Dhanishta (pada 3 and 4), Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada or Revati. */
export const isPanchak = (l: Limbs): boolean => (l.nakshatra.index === 22 && l.nakshatra.pada >= 3) || l.nakshatra.index >= 23;

const hmFmt = new Map<string, Intl.DateTimeFormat>();
const hm = (tz: string, d: Date): string => {
  let f = hmFmt.get(tz);
  if (!f) { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); hmFmt.set(tz, f); }
  return f.format(d);
};
const ymdOf = (tz: string, d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const tithiLabel = (l: Limbs) => { const n = ((l.tithiNumber - 1) % 15) + 1; return `${l.paksha === "shukla" ? "Shukla" : "Krishna"} ${tithiName(l.paksha, n).name}`; };

type Key = "tithi" | "nakshatra" | "yoga" | "karana";
const keyOf: Record<Key, (l: Limbs) => string> = {
  tithi: (l) => String(l.tithiNumber),
  nakshatra: (l) => l.nakshatra.name,
  yoga: (l) => l.yoga,
  karana: (l) => l.karana,
};
const labelOf: Record<Key, (l: Limbs) => string> = { tithi: tithiLabel, nakshatra: (l) => l.nakshatra.name, yoga: (l) => l.yoga, karana: (l) => l.karana };

/** First instant, to the second, at which `same(t)` becomes false, between `lo` (true) and `hi` (false). */
const flip = (lo: number, hi: number, same: (t: number) => boolean): Date => {
  while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (same(mid)) lo = mid; else hi = mid; }
  return new Date(hi);
};

export const dayPanchang = (place: SunPlace, date: string): DayPanchang | null => {
  const today = sunTimes(place, date), next = sunTimes(place, addDays(date, 1));
  if (!today || !next) return null;
  const tz = place.timezone;
  const t0 = today.rise.getTime(), t1 = next.rise.getTime();

  const samples: { t: number; l: Limbs }[] = [];
  for (let t = t0; t < t1; t += STEP) samples.push({ t, l: limbsAt(new Date(t)) });
  samples.push({ t: t1, l: limbsAt(next.rise) });

  const segments = (key: Key): Segment[] => {
    const out: Segment[] = [];
    let cur = samples[0].l;
    for (let i = 1; i < samples.length; i++) {
      const l = samples[i].l;
      if (keyOf[key](l) !== keyOf[key](cur)) {
        const at = flip(samples[i - 1].t, samples[i].t, (t) => keyOf[key](limbsAt(new Date(t))) === keyOf[key](cur));
        out.push({ name: labelOf[key](cur), until: hm(tz, at), untilNextDay: ymdOf(tz, at) !== date });
        cur = l;
      }
    }
    out.push({ name: labelOf[key](cur), until: null, untilNextDay: false });
    return out;
  };

  // Panchak within this Vedic day.
  let panchak: DayPanchang["panchak"] = null;
  const active = samples.map((s) => isPanchak(s.l));
  if (active.some(Boolean)) {
    let from: string | null = null, until: string | null = null;
    if (!active[0]) { const i = active.findIndex(Boolean); from = hm(tz, flip(samples[i - 1].t, samples[i].t, (t) => !isPanchak(limbsAt(new Date(t))))); }
    if (!active[active.length - 1]) { const i = active.lastIndexOf(true); until = hm(tz, flip(samples[i].t, samples[i + 1].t, (t) => isPanchak(limbsAt(new Date(t))))); }
    panchak = { from, until };
  }

  const p = computePanchang({ localDate: date, time: null, place, allowFuture: true });
  const first = samples[0].l;
  return {
    vikramSamvat: p.vikramSamvat,
    masa: { name: p.masa.name, adhika: p.masa.adhika },
    purnimantaMasa: { name: p.purnimantaMasa.name, adhika: p.purnimantaMasa.adhika },
    paksha: first.paksha === "shukla" ? "Shukla" : "Krishna",
    vara: p.vara.name,
    tithi: segments("tithi"),
    nakshatra: segments("nakshatra"),
    yoga: segments("yoga"),
    karana: segments("karana"),
    panchak,
  };
};
