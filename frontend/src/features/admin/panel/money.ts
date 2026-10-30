/** Costs are stored in USD. Small per-request amounts need more decimals than normal currency formatting. */
export function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "$0.00";
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `${n < 0 ? "-" : ""}$${abs.toFixed(digits)}`;
}

export const fmtInr = (usd: number | null | undefined, rate: number | null | undefined): string | null =>
  usd === null || usd === undefined || !rate ? null : `₹${(usd * rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const fmtNum = (n: number | null | undefined): string => (n === null || n === undefined ? "—" : n.toLocaleString());

export const BASIS_LABEL: Record<string, string> = { actual: "Actual", estimated: "Estimated" };
