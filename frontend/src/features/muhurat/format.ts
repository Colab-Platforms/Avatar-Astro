import i18n from "@/i18n";
import { localeInfo } from "@/i18n/languages";
import { glossName } from "@/i18n/glossary";
import type { MuhuratPlace, MuhuratWindow } from "./types";

const isEnglish = (): boolean => !i18n.language || i18n.language === "en";
/** The Intl locale for the chosen language, always with Latin digits. English keeps the en-GB layout used before. */
export const intlTag = (): string => (isEnglish() ? "en-GB" : `${localeInfo(i18n.language).tag}-u-nu-latn`);

/** "13:05" -> "1:05 PM". */
export const time12 = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  if (!isEnglish()) return new Intl.DateTimeFormat(intlTag(), { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const range12 = (start: string, end: string): string => `${time12(start)} – ${time12(end)}`;

const ymd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** "Friday, 18 December 2026". The date is a calendar date, so it is formatted in UTC and never shifts with the viewer's zone. */
export const longDate = (s: string): string =>
  new Intl.DateTimeFormat(intlTag(), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(ymd(s));

export const shortDate = (s: string): string =>
  new Intl.DateTimeFormat(intlTag(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(ymd(s));

export const placeLabel = (p: MuhuratPlace): string => [p.name, p.admin1, p.country].filter(Boolean).join(", ");

/** Today's date at a place (YYYY-MM-DD). */
export const todayAt = (timezone: string, now: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

export const addDays = (s: string, n: number): string => {
  const d = ymd(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const addMonths = (s: string, n: number): string => {
  const d = ymd(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (a: string, b: string): number => Math.round((ymd(b).getTime() - ymd(a).getTime()) / 86_400_000);

/** One line that says everything needed to act on a window. */
export const windowText = (w: MuhuratWindow, eventLabel: string, place: MuhuratPlace): string =>
  i18n.t("muhurat.share.text", {
    event: eventLabel, date: longDate(w.date), range: range12(w.startLocal, w.endLocal), place: placeLabel(place),
    paksha: glossName("paksha", w.panchang.paksha), tithi: glossName("tithi", w.panchang.tithi), nakshatra: glossName("nakshatra", w.panchang.nakshatra),
  });
