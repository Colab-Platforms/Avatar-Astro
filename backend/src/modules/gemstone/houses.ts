/**
 * Per-house facts for a chart (D1 or D9), derived only from the placements the engine already produced:
 * the sign in each whole-sign house, the planets in it, its lord and where that lord sits, and the Parashari
 * graha drishti it receives. Nothing is estimated and nothing is hardcoded about any particular chart.
 *
 * Convention (the same table used for planet aspects in analysis.ts):
 *  - every classical planet aspects the 7th house from where it stands;
 *  - Mars also the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th;
 *  - Rahu and Ketu cast NO aspects (schools disagree, so none is invented). They still appear as occupants.
 *  - Houses are whole-sign: the Lagna sign is the 1st house.
 */
import { wholeSignHouse } from "./chart.engine.js";
import { PLANETS, SIGNS, SIGN_LORD, type Planet, type Sign } from "./gemstone.catalogue.js";
import { ASPECTS } from "./analysis.js";

export interface HouseAspect {
  planet: Planet;
  /** The house the aspecting planet occupies in this chart. */
  fromHouse: number;
  /** Which aspect it is, counted from the planet's own house (7, or 3/4/5/8/9/10 for the special aspects). */
  aspect: number;
}

export interface HouseInfo {
  house: number;
  sign: Sign;
  lord: Planet;
  /** Where the lord stands in this same chart. */
  lordPlacement: { house: number; sign: Sign };
  planets: Planet[];
  aspectedBy: HouseAspect[];
}

export interface HousePlacement { planet: Planet; signIndex: number }

/** The twelve houses of a chart, from the Lagna sign index and every planet's sign index in that same chart. */
export function buildHouseInfo(lagnaSignIndex: number, placements: readonly HousePlacement[]): HouseInfo[] {
  const where = new Map<Planet, { house: number; signIndex: number }>();
  for (const p of placements) where.set(p.planet, { house: wholeSignHouse(lagnaSignIndex, p.signIndex), signIndex: p.signIndex });

  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const signIndex = (lagnaSignIndex + i) % 12;
    const sign = SIGNS[signIndex];
    const lord = SIGN_LORD[sign];
    const lordAt = where.get(lord);
    const aspectedBy: HouseAspect[] = [];
    for (const planet of PLANETS) {
      const set = ASPECTS[planet];
      const at = where.get(planet);
      if (!set || !at) continue;
      const aspect = ((house - at.house + 12) % 12) + 1; // this house counted from the planet's house
      if (aspect !== 1 && set.includes(aspect)) aspectedBy.push({ planet, fromHouse: at.house, aspect });
    }
    return {
      house,
      sign,
      lord,
      lordPlacement: { house: lordAt!.house, sign: SIGNS[lordAt!.signIndex] },
      planets: PLANETS.filter((p) => where.get(p)?.house === house),
      aspectedBy,
    };
  });
}
