import { zodiacSigns } from "@/data/zodiacData";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Mar 21 - Apr 19" -> { from: [3, 21], to: [4, 19] } */
const parse = (range: string) => {
  const m = range.match(/^(\w{3}) (\d{1,2}) - (\w{3}) (\d{1,2})$/);
  if (!m) return null;
  const a = MONTHS.indexOf(m[1].toLowerCase()) + 1;
  const b = MONTHS.indexOf(m[3].toLowerCase()) + 1;
  return a && b ? { from: [a, Number(m[2])] as const, to: [b, Number(m[4])] as const } : null;
};

/**
 * The Sun sign (as the Horoscope page defines its signs, by calendar date) for a saved "YYYY-MM-DD" date of birth.
 * Returns null when the date is missing or malformed: nothing is guessed.
 */
export function sunSignForDate(dob: string | null | undefined): string | null {
  const m = dob?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const key = Number(m[1]) * 100 + Number(m[2]);
  for (const z of zodiacSigns) {
    const r = parse(z.dates);
    if (!r) continue;
    const from = r.from[0] * 100 + r.from[1];
    const to = r.to[0] * 100 + r.to[1];
    if (from <= to ? key >= from && key <= to : key >= from || key <= to) return z.name;
  }
  return null;
}
