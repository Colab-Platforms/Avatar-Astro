/**
 * Wearing guidance: the traditional weekday for the stone plus, where it can
 * be computed, the real sunrise time of the next such weekday at the
 * birthplace. No "auspicious" claim is made about the moment itself.
 */
import * as Astronomy from "astronomy-engine";
import type { GemstoneInfo } from "./gemstone.catalogue.js";

export interface WeightGuidance {
  weightKg: number;
  rattiApprox: number;
  caratApprox: number;
  text: string;
  disclaimer: string;
}

export interface WearingGuidance {
  weekday: string;
  metal: string;
  finger: string;
  customNote: string;
  sunrise: {
    iso: string;
    local: string; // e.g. "Thursday, 5 Nov 2026, 06:41"
    timeZone: string;
    locationLabel: string;
  } | null;
  sunriseNote: string;
  /** Present only when the user entered a weight. Traditional guidance, never the basis for choosing the stone. */
  weight: WeightGuidance | null;
}

const RATTI_IN_CARATS = 0.91;

/**
 * Traditional rule of thumb only: about one ratti for every 10 kg of body
 * weight. Lineages differ (many use a fixed minimum instead), and there is
 * no scientific basis for it, so the text says so and makes no health claim.
 */
export const buildWeightGuidance = (stone: GemstoneInfo, weightKg: number): WeightGuidance => {
  const ratti = Math.round((weightKg / 10) * 10) / 10;
  const carat = Math.round(ratti * RATTI_IN_CARATS * 10) / 10;
  return {
    weightKg,
    rattiApprox: ratti,
    caratApprox: carat,
    text: `A commonly quoted traditional rule of thumb is about one ratti (roughly 0.9 carat) for every 10 kg of body weight. For ${weightKg} kg that is about ${ratti} ratti (roughly ${carat} carat) of ${stone.name}. Practitioners and lineages differ, and many prefer a fixed minimum weight instead.`,
    disclaimer:
      "This is traditional guidance only. It is not a scientific formula, was not used to choose your Ratna, and makes no claim about health or any life outcome. Please consult a qualified gemologist and astrologer before buying.",
  };
};

const weekdayIn = (tz: string, d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(d);

const localString = (tz: string, d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

/** Next sunrise (strictly after `from`) that falls on the given weekday. */
export const nextSunriseOnWeekday = (
  weekday: string,
  latitude: number,
  longitude: number,
  timeZone: string,
  from: Date,
): Date | null => {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  let cursor = from;
  for (let i = 0; i < 9; i++) {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, cursor, 2);
    if (!rise) return null;
    const date = rise.date;
    if (weekdayIn(timeZone, date) === weekday) return date;
    cursor = new Date(date.getTime() + 60_000);
  }
  return null;
};

export const buildWearingGuidance = (
  stone: GemstoneInfo,
  place: { label: string; latitude: number; longitude: number; timeZone: string },
  now: Date = new Date(),
  weightKg: number | null = null,
): WearingGuidance => {
  const rise = nextSunriseOnWeekday(
    stone.weekday,
    place.latitude,
    place.longitude,
    place.timeZone,
    now,
  );
  return {
    weekday: stone.weekday,
    metal: stone.customs.metal,
    finger: stone.customs.finger,
    customNote:
      "Metal, finger and weekday are customs commonly cited in the Vedic tradition; they differ between lineages and are not scientifically established.",
    sunrise: rise
      ? {
          iso: rise.toISOString(),
          local: localString(place.timeZone, rise),
          timeZone: place.timeZone,
          locationLabel: `${place.label} (your birthplace)`,
        }
      : null,
    sunriseNote: rise
      ? `Sunrise on the next ${stone.weekday} at your birthplace, calculated astronomically. Morning is customarily preferred, but this is a convention, not a guarantee of any outcome. It may differ from sunrise where you live now.`
      : `No exact time was calculated; only the traditional weekday (${stone.weekday}) is shown.`,
    weight: weightKg != null ? buildWeightGuidance(stone, weightKg) : null,
  };
};
