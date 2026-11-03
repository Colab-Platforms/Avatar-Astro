/**
 * Jodi Jyotish: Ashtakoota (Guna Milan) plus Mangal Dosha for two people, both from real sidereal charts.
 * Both people must have an exact birth time and place: the Moon changes Nakshatra roughly every day, so without a time
 * the score would be a guess. In that case this throws a validation error and the caller shows an "unavailable" state.
 */
import { computePlanets } from "./chart.engine.js";
import { resolveBirthInstant } from "./birth.time.js";
import { buildKundali, parseKundaliInput, type KundaliResult } from "./kundali.js";
import { koota, type AshtakootaResult } from "./ashtakoota.js";
import { ValidationError } from "./gemstone.service.js";

export interface MangalCheck {
  present: boolean;
  marsHouse: number;
  note: string;
}

export interface MatchResult {
  a: KundaliResult;
  b: KundaliResult;
  ashtakoota: AshtakootaResult;
  mangal: { a: MangalCheck; b: MangalCheck; verdict: string };
}

const MANGAL_HOUSES = [1, 2, 4, 7, 8, 12];

const mangal = (k: KundaliResult): MangalCheck => {
  const mars = k.planets?.find((p) => p.planet === "Mars");
  if (!mars) return { present: false, marsHouse: 0, note: "Not calculated." };
  const present = MANGAL_HOUSES.includes(mars.house);
  return {
    present,
    marsHouse: mars.house,
    note: present
      ? `Mars is in house ${mars.house} from the Lagna, one of the houses (1, 2, 4, 7, 8, 12) that tradition calls Mangal Dosha.`
      : `Mars is in house ${mars.house} from the Lagna, which is not one of the Mangal Dosha houses (1, 2, 4, 7, 8, 12).`,
  };
};

export const buildMatch = (bodyA: unknown, bodyB: unknown, now: Date = new Date()): MatchResult => {
  const inA = parseKundaliInput(bodyA);
  const inB = parseKundaliInput(bodyB);
  for (const [who, i] of [["first", inA], ["second", inB]] as const) {
    if (i.timeUnknown || !i.timeOfBirth) {
      throw new ValidationError(
        `Ashtakoota needs the exact birth time of both people. The ${who} person's birth time is missing, so no Guna score was calculated.`,
      );
    }
  }
  const moonLon = (i: typeof inA) => {
    const [y, m, d] = i.dateOfBirth.split("-").map(Number);
    const [hh, mm] = i.timeOfBirth!.split(":").map(Number);
    const inst = resolveBirthInstant({ year: y, month: m, day: d, hour: hh, minute: mm }, i.place!.timezone);
    return computePlanets(inst.utc).Moon.longitude;
  };
  const a = buildKundali(inA, now);
  const b = buildKundali(inB, now);
  const ma = mangal(a);
  const mb = mangal(b);
  const verdict =
    ma.present && mb.present
      ? "Both charts show Mangal Dosha. Tradition commonly treats this as balancing out."
      : ma.present || mb.present
        ? "Only one chart shows Mangal Dosha. Tradition suggests consulting an astrologer about remedies and exceptions."
        : "Neither chart shows Mangal Dosha.";
  return { a, b, ashtakoota: koota(moonLon(inA), moonLon(inB)), mangal: { a: ma, b: mb, verdict } };
};
