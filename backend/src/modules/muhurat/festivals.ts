/**
 * Hindu festivals and observances, CALCULATED from the shared Panchang engine for the place and date. Nothing is looked up,
 * and no festival date is typed in.
 *
 * HOW A FESTIVAL DATE IS FOUND (the usual Panchang method). Each festival is a tithi of a lunar month, and the traditional texts
 * name the part of the day in which that tithi must be present for that day to be the festival day:
 *   sunrise (udaya), madhyahna (the middle fifth of the daytime), aparahna (the fourth fifth), pradosha (the 2 h 24 min after
 *   sunset), nishita (the 48 minutes around local midnight), arunodaya (the 96 minutes before sunrise), sunset, moonrise.
 * The festival falls on the civil date whose window contains the tithi. If the tithi is present on two consecutive dates, the
 * rule's `tie` says which one (first or last). If it is present on neither, NO date is reported (never a guess).
 *
 * CALENDAR CONVENTION (shown to the user). Dates follow the Drik Panchang (astronomical, Lahiri) convention and the Smarta
 * reading of the tithi rules. Months in the table below carry the North Indian PURNIMANTA names, as Drik prints them (Diwali is
 * Kartika Krishna Amavasya). The date of a festival does not depend on Amanta or Purnimanta naming, only the label does. The
 * Muhurat rules use Amanta months (for Adhika masa and Chaturmas); they are separate. Festivals in an Adhika month are not
 * listed. Vaishnava (ISKCON) variants, Gauna dates and regional festivals are NOT included.
 *
 * VERIFIED against Drik Panchang (New Delhi), every date from 1 Jan 2026 to 2 Nov 2028: see __tests__/festivals.reference.test.ts. A
 * festival is in this module only if its rule reproduced EVERY reference date. NOT included because the rule could not be
 * reproduced: Holika Dahan and Holi (Drik accepts Bhadra Punchha, which is not modelled), Krishna Janmashtami (Drik reckons it with
 * Rohini nakshatra), Dhanteras, Ekadashi and the Purnima and Amavasya vrat days (Smarta and Vaishnava viddha rules), and regional
 * festivals. The Panchang timeline still shows every tithi, including Ekadashi, Purnima and Amavasya, with exact times.
 */
import * as Astronomy from "astronomy-engine";
import { computePanchang, limbsAt } from "../gemstone/panchang.js";
import { siderealSunLongitude } from "../gemstone/chart.engine.js";
import { addDays, sunTimes, type SunPlace } from "./sun.js";

export type Kala = "sunrise" | "madhyahna" | "aparahna" | "pradosh" | "nishita" | "arunodaya" | "sunset" | "moonrise";

export interface FestivalDef {
  id: string;
  name: string;
  kind: "festival" | "vrat";
  /** Purnimanta month name as Drik prints it; null = any month. */
  masa: string | null;
  paksha: "shukla" | "krishna";
  /** 1-15 within the paksha (15 = Purnima in Shukla, Amavasya in Krishna). */
  tithi: number;
  kala: Kala;
  tie: "first" | "last";
  note: string;
}

export interface Festival { id: string; name: string; kind: "festival" | "vrat"; note: string }

const F = (id: string, name: string, masa: string | null, paksha: "shukla" | "krishna", tithi: number, kala: Kala, tie: "first" | "last", note: string, kind: "festival" | "vrat" = "festival"): FestivalDef => ({ id, name, kind, masa, paksha, tithi, kala, tie, note });

export const FESTIVALS: FestivalDef[] = [
  F("vasant-panchami", "Vasant Panchami", "Magha", "shukla", 5, "madhyahna", "first", "Magha Shukla Panchami, present in the madhyahna."),
  F("maha-shivaratri", "Maha Shivaratri", "Phalguna", "krishna", 14, "nishita", "first", "Phalguna Krishna Chaturdashi, present at nishita (midnight)."),
  F("ugadi", "Ugadi / Gudi Padwa", "Chaitra", "shukla", 1, "sunrise", "first", "Chaitra Shukla Pratipada at sunrise."),
  F("rama-navami", "Rama Navami", "Chaitra", "shukla", 9, "madhyahna", "first", "Chaitra Shukla Navami, present in the madhyahna (Smarta)."),
  F("guru-purnima", "Guru Purnima", "Ashadha", "shukla", 15, "sunrise", "first", "Ashadha Purnima at sunrise."),
  F("ganesh-chaturthi", "Ganesh Chaturthi", "Bhadrapada", "shukla", 4, "madhyahna", "first", "Bhadrapada Shukla Chaturthi, present in the madhyahna."),
  F("navratri", "Sharad Navratri begins", "Ashvina", "shukla", 1, "sunrise", "first", "Ashwina Shukla Pratipada at sunrise."),
  F("dussehra", "Dussehra", "Ashvina", "shukla", 10, "aparahna", "first", "Ashwina Shukla Dashami, present in the aparahna."),
  F("karwa-chauth", "Karwa Chauth", "Kartika", "krishna", 4, "moonrise", "first", "Kartika Krishna Chaturthi, present at moonrise."),
  F("narak-chaturdashi", "Narak Chaturdashi", "Kartika", "krishna", 14, "arunodaya", "first", "Kartika Krishna Chaturdashi, present at arunodaya (before sunrise)."),
  F("diwali", "Diwali (Lakshmi Puja)", "Kartika", "krishna", 15, "pradosh", "first", "Kartika Amavasya, present in the pradosha."),
  F("govardhan-puja", "Govardhan Puja", "Kartika", "shukla", 1, "sunrise", "first", "Kartika Shukla Pratipada at sunrise."),
  F("bhai-dooj", "Bhai Dooj", "Kartika", "shukla", 2, "aparahna", "last", "Kartika Shukla Dwitiya, present in the aparahna."),
  F("chhath", "Chhath Puja", "Kartika", "shukla", 6, "sunset", "first", "Kartika Shukla Shashthi, present at sunset."),
  F("kartika-purnima", "Kartika Purnima (Guru Nanak Jayanti)", "Kartika", "shukla", 15, "sunrise", "first", "Kartika Purnima at sunrise."),
  F("buddha-purnima", "Buddha Purnima", "Vaishakha", "shukla", 15, "sunrise", "first", "Vaishakha Purnima at sunrise."),
];

export const FESTIVAL_CONVENTION = {
  id: "drik-smarta-purnimanta-labels",
  label: "Drik Panchang · Smarta tithi rules · festival months labelled Purnimanta",
  note: "A festival falls on the date whose traditional time window (sunrise, madhyahna, pradosha, nishita and so on) contains the festival's tithi, calculated for this place. Month names on festivals are the North Indian Purnimanta names, as Drik prints them; Muhurat rules use Amanta months. Vaishnava and regional variants are not included, and a festival date is never treated as auspicious or inauspicious by itself.",
};

const MIN = 60_000;
const tithi30 = (paksha: "shukla" | "krishna", t: number) => (paksha === "shukla" ? t : 15 + t);

interface DayWindows { rise: Date; set: Date; nextRise: Date }

const windowOf = (kala: Kala, w: DayWindows, place: SunPlace): [Date, Date] | null => {
  const d = w.set.getTime() - w.rise.getTime();
  const r = w.rise.getTime();
  switch (kala) {
    case "sunrise": return [w.rise, w.rise];
    case "madhyahna": return [new Date(r + 0.4 * d), new Date(r + 0.6 * d)];
    case "aparahna": return [new Date(r + 0.6 * d), new Date(r + 0.8 * d)];
    case "pradosh": return [w.set, new Date(w.set.getTime() + 144 * MIN)];
    case "nishita": { const mid = (w.set.getTime() + w.nextRise.getTime()) / 2; return [new Date(mid - 24 * MIN), new Date(mid + 24 * MIN)]; }
    case "arunodaya": return [new Date(r - 96 * MIN), w.rise];
    case "sunset": return [w.set, w.set];
    case "moonrise": {
      const t = Astronomy.SearchRiseSet(Astronomy.Body.Moon, new Astronomy.Observer(place.latitude, place.longitude, 0), +1, w.rise, 1);
      return t ? [t.date, t.date] : null;
    }
  }
};

const presentIn = (target: number, a: Date, b: Date): boolean => {
  for (let t = a.getTime(); t < b.getTime(); t += 5 * MIN) if (limbsAt(new Date(t)).tithiNumber === target) return true;
  return limbsAt(b).tithiNumber === target;
};

export class FestivalCalendar {
  private win = new Map<string, DayWindows | null>();
  private masa = new Map<string, { name: string; adhika: boolean } | null>();
  private pres = new Map<string, boolean>();
  constructor(private place: SunPlace) {}

  private windows(date: string): DayWindows | null {
    if (this.win.has(date)) return this.win.get(date)!;
    const today = sunTimes(this.place, date), next = sunTimes(this.place, addDays(date, 1));
    const v = today && next ? { rise: today.rise, set: today.set, nextRise: next.rise } : null;
    this.win.set(date, v);
    return v;
  }

  /** Purnimanta month at sunrise on `date`. */
  private purnimanta(date: string): { name: string; adhika: boolean } | null {
    if (this.masa.has(date)) return this.masa.get(date)!;
    let v: { name: string; adhika: boolean } | null = null;
    try { const p = computePanchang({ localDate: date, time: null, place: this.place, allowFuture: true }); v = { name: p.purnimantaMasa.name, adhika: p.purnimantaMasa.adhika }; } catch { v = null; }
    this.masa.set(date, v);
    return v;
  }

  private present(kala: Kala, paksha: "shukla" | "krishna", tithi: number, date: string): boolean {
    const key = `${kala}|${paksha}|${tithi}|${date}`;
    const hit = this.pres.get(key);
    if (hit !== undefined) return hit;
    const w = this.windows(date);
    const win = w ? windowOf(kala, w, this.place) : null;
    let v = !!win && presentIn(tithi30(paksha, tithi), win[0], win[1]);
    // Sunrise rule, when the tithi begins after one sunrise and ends before the next (present at neither): it belongs to the date it occurs in.
    if (!v && kala === "sunrise" && w) {
      const next = this.windows(addDays(date, 1));
      const target = tithi30(paksha, tithi);
      if (next && limbsAt(next.rise).tithiNumber !== target && presentIn(target, new Date(w.rise.getTime() + 5 * MIN), new Date(next.rise.getTime() - 5 * MIN))) v = true;
    }
    this.pres.set(key, v);
    return v;
  }

  /** The (paksha, tithi) pairs that occur anywhere around this date, so most rules can be skipped cheaply. */
  private tithisAround(date: string): Set<number> {
    const w = this.windows(date);
    const s = new Set<number>();
    if (!w) return s;
    const span = w.nextRise.getTime() - (w.rise.getTime() - 96 * MIN);
    for (let i = 0; i <= 8; i++) s.add(limbsAt(new Date(w.rise.getTime() - 96 * MIN + (span * i) / 8)).tithiNumber);
    return s;
  }

  private dayOf(def: { kala: Kala; paksha: "shukla" | "krishna"; tithi: number; tie: "first" | "last" }, date: string): boolean {
    if (!this.present(def.kala, def.paksha, def.tithi, date)) return false;
    const other = addDays(date, def.tie === "first" ? -1 : 1);
    return !this.present(def.kala, def.paksha, def.tithi, other);
  }

  private sankranti(date: string): Festival | null {
    const w = this.windows(date);
    if (!w) return null;
    const lon = (t: Date) => siderealSunLongitude(t);
    const a = lon(w.rise), b = lon(w.nextRise);
    if (!(a < 270 && b >= 270)) return null;
    let lo = w.rise.getTime(), hi = w.nextRise.getTime();
    while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (lon(new Date(mid)) >= 270) hi = mid; else lo = mid; }
    // The Sankranti moment falls between this sunrise and the next. After sunset, the festival day is the following date.
    if (hi > w.set.getTime()) return null;
    return { id: "makar-sankranti", name: "Makar Sankranti", kind: "festival", note: "The Sun enters sidereal Makara (Lahiri)." };
  }

  /** Sankranti on the previous date, carried to this one when the moment fell after that date's sunset. */
  private sankrantiCarried(date: string): Festival | null {
    const prev = addDays(date, -1);
    const w = this.windows(prev);
    if (!w) return null;
    const lon = (t: Date) => siderealSunLongitude(t);
    if (!(lon(w.rise) < 270 && lon(w.nextRise) >= 270)) return null;
    let lo = w.rise.getTime(), hi = w.nextRise.getTime();
    while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (lon(new Date(mid)) >= 270) hi = mid; else lo = mid; }
    return hi > w.set.getTime() ? { id: "makar-sankranti", name: "Makar Sankranti", kind: "festival", note: "The Sun enters sidereal Makara (Lahiri); the moment falls after sunset, so the festival day is this date." } : null;
  }

  /**
   * Purnima festivals tied to a Bhadra-free window (Raksha Bandhan: aparahna). The date is the first one whose
   * window holds Purnima without Bhadra (Vishti karana) covering all of it. If Bhadra covers the whole window on the first date, the
   * next date is used while Purnima still prevails at its sunrise.
   */
  private bhadraFree(id: string, name: string, masa: string, kala: Kala, date: string): Festival | null {
    const ok = (d: string): boolean => {
      const w = this.windows(d);
      const win = w ? windowOf(kala, w, this.place) : null;
      if (!win || !presentIn(15, win[0], win[1])) return false;
      for (let t = win[0].getTime(); t <= win[1].getTime(); t += 5 * MIN) { const l = limbsAt(new Date(t)); if (l.tithiNumber === 15 && l.karana !== "Vishti (Bhadra)") return true; }
      return false;
    };
    const month = (d: string) => { const m = this.purnimanta(d); return !!m && !m.adhika && m.name === masa; };
    const prev = addDays(date, -1);
    if (ok(date) && month(date) && !ok(prev)) return { id, name, kind: "festival", note: `${masa} Purnima in the ${kala === "pradosh" ? "pradosha" : "aparahna"}, outside Bhadra.` };
    if (!ok(prev) && month(prev) && this.present(kala, "shukla", 15, prev) && this.present("sunrise", "shukla", 15, date))
      return { id, name, kind: "festival", note: `${masa} Purnima; Bhadra covers the whole ${kala === "pradosh" ? "pradosha" : "aparahna"} of the previous date, so the next date is used while Purnima still prevails at sunrise.` };
    return null;
  }

  /** Festivals and observances on one local date at the place. */
  on(date: string): Festival[] {
    const w = this.windows(date);
    if (!w) return [];
    const around = this.tithisAround(date);
    const out: Festival[] = [];

    for (const f of FESTIVALS) {
      if (!around.has(tithi30(f.paksha, f.tithi))) continue;
      if (!this.dayOf(f, date)) continue;
      const m = this.purnimanta(date);
      if (!m || m.adhika || (f.masa && m.name !== f.masa)) continue;
      out.push({ id: f.id, name: f.name, kind: f.kind, note: f.note });
    }
    if (around.has(15) || this.tithisAround(addDays(date, -1)).has(15)) {
      const rb = this.bhadraFree("raksha-bandhan", "Raksha Bandhan", "Shravana", "aparahna", date);
      if (rb) out.push(rb);
    }
    const sk = this.sankranti(date) ?? this.sankrantiCarried(date);
    if (sk) out.push(sk);
    return out;
  }
}
