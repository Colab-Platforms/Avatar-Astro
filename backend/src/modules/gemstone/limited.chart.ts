/**
 * Unknown-birth-time path. Without a birth time the Ascendant, houses and
 * Lagna lord cannot be determined, so no gemstone is recommended. We only
 * report planetary signs that stay the same at every sampled moment of the
 * local birth date.
 */
import { computePlanets } from "./chart.engine.js";
import { resolveBirthInstant, BirthTimeError, type LocalDateTime } from "./birth.time.js";
import type { Planet, Sign } from "./gemstone.catalogue.js";

export interface StableSign {
  planet: Planet;
  sign: Sign;
}

export const stableSignsForDate = (
  date: Pick<LocalDateTime, "year" | "month" | "day">,
  timeZone: string,
): StableSign[] => {
  const samples: Record<string, Sign>[] = [];
  const minutes = [...Array.from({ length: 24 }, (_, h) => h * 60), 23 * 60 + 59];
  for (const m of minutes) {
    try {
      const { utc } = resolveBirthInstant(
        { ...date, hour: Math.floor(m / 60), minute: m % 60 },
        timeZone,
      );
      const planets = computePlanets(utc);
      const snap: Record<string, Sign> = {};
      for (const p of Object.values(planets)) snap[p.planet] = p.sign;
      samples.push(snap);
    } catch (e) {
      if (!(e instanceof BirthTimeError)) throw e; // skip non-existent local times
    }
  }
  if (samples.length === 0) return [];
  const out: StableSign[] = [];
  for (const planet of Object.keys(samples[0]) as Planet[]) {
    const first = samples[0][planet];
    if (samples.every((s) => s[planet] === first)) out.push({ planet, sign: first });
  }
  return out;
};
