import i18n from "@/i18n";
import { glossName } from "@/i18n/glossary";
import type { LocaleCode } from "@/i18n/languages";
import { calendarFacts, type TodayCalendar } from "@/lib/karmaCalendar";

/**
 * Know Your Karma has no language of its own: every label, the calendar explanation and the reply follow the ONE site language
 * (i18n.language; the reply language is replyLanguage()). The fixed texts live in the dictionary under `karma.*`.
 *
 * Calendar VALUES come from the verified calendar service; only their displayed NAMES go through the glossary
 * (a name that has no entry stays as the service returned it).
 */

/** What the model is told about the reply language (the server also adds its own instruction for the chosen language). */
export function replyDirective(lang: LocaleCode): string {
  return lang === "en"
    ? "Write in very simple English that a 10-year-old can follow."
    : "Write the whole reply in the chosen language, in its own script, in very simple words that a 10-year-old can follow.";
}

const ordinalEn = (n: number): string => {
  const v = n % 100;
  return `${n}${v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

const FACT_KIND = { Tithi: "tithi", Paksha: "paksha", Nakshatra: "nakshatra", Day: "weekday", Month: "masa", Yoga: "yoga", Karana: "karana" } as const;

/** The calendar chips in the chosen language. The label comes from the dictionary, the value from the glossary. */
export function localizedFacts(c: TodayCalendar): { label: string; value: string }[] {
  return calendarFacts(c).map((f) => {
    const kind = FACT_KIND[f.label as keyof typeof FACT_KIND];
    return {
      label: i18n.t(`karma.fact.${f.label}`, { defaultValue: f.label }),
      value: kind ? glossName(kind, f.value) : f.value,
    };
  });
}

/**
 * "What it means": built here from the verified calendar, never written by a model, so it is always exact.
 * Day, tithi, which half of the Moon's month it is (and what the Moon is doing), and the nakshatra.
 */
export function calendarMeaning(c: TodayCalendar): string {
  const n = c.tithi.numberInPaksha;
  return i18n.t(c.paksha === "Krishna" ? "karma.calendar.meaningDark" : "karma.calendar.meaningBright", {
    vara: glossName("weekday", c.vara),
    tithi: glossName("tithi", c.tithi.name),
    nakshatra: glossName("nakshatra", c.nakshatra.name),
    n,
    ordinal: ordinalEn(n),
  });
}

/** The idea the model may use about today's Moon half: a standard, simple reading of waxing and waning. (An instruction to the model, never shown.) */
export const PAKSHA_IDEA: Record<"Shukla" | "Krishna", string> = {
  Shukla: "bright half (the Moon grows bigger each night): starting, building, growing",
  Krishna: "dark half (the Moon grows smaller each night): reflecting, finishing, letting go",
};

/** Dictionary keys of the suggested questions that need no calendar. */
export const BASE_QUESTION_KEYS = ["karma.questions.0", "karma.questions.1", "karma.questions.2", "karma.questions.3", "karma.questions.4"];

/** The question about today's tithi, with the tithi shown by its glossary name. */
export function tithiQuestion(c: TodayCalendar): string {
  return i18n.t("karma.questions.tithi", { tithi: glossName("tithi", c.tithi.name) });
}
