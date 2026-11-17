/** Whole paise to rupees. Never rounded to a different unit: ₹1,234.50 stays ₹1,234.50. */
export const fmtRupees = (paise: number): string => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const fmtCount = (n: number): string => n.toLocaleString("en-IN");
export const fmtPercent = (part: number, whole: number): string => (whole > 0 ? `${((part / whole) * 100).toFixed(part > 0 && part / whole < 0.01 ? 2 : 1)}%` : "—");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Axis label for a bucket key: "2026-11-16" -> "16 Nov", "2026-11-16T14" -> "14:00". */
export function bucketLabel(key: string, bucket: "hour" | "day"): string {
  if (bucket === "hour") return `${key.slice(11, 13)}:00`;
  return `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1] ?? ""}`;
}
