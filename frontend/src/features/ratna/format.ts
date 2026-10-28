const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "1990-05-05" -> "5 May 1990". Pure string work, so no time zone can shift the day. */
export const formatBirthDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
};

export const ordinal = (n: number) =>
  n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

export const utcLabel = (offsetMinutes: number | null): string => {
  if (offsetMinutes == null) return "";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
};

/** The notice shown with every result. */
export const SCIENCE_NOTICE =
  "Gemstone associations and wearing practices are traditional astrological interpretations. There is no established scientific evidence that a gemstone changes life outcomes, and no outcome is guaranteed. Buying or wearing any gemstone is optional.";
