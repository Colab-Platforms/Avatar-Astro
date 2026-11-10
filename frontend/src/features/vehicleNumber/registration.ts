/**
 * Indian vehicle registration parsing. Pure functions, no UI.
 *
 * A registration looks like  MH 12 AB 0007  (state, RTO, letter series, number) or, for the Bharat series, 22 BH 0007 AB.
 * The number is the last one to four digits. Leading zeros are kept: 0007 stays 0007 (it is never read as 7). A shorter number
 * typed on its own ("7", "07") is shown padded to four digits, as registration numbers are printed, and the page says so.
 */
import i18n from "@/i18n";


export type Scope = "number" | "rto-number" | "all";

export const SCOPE_LABEL: Record<Scope, string> = {
  number: "The registration number only (last four digits)",
  "rto-number": "RTO code and registration number",
  all: "Every digit in the registration",
};

export interface Registration {
  kind: "standard" | "bh" | "number";
  /** Two-letter state code, when entered. */
  state?: string;
  /** RTO digits (one or two), when entered. */
  rto?: string;
  /** Letter series, when entered. */
  series?: string;
  /** Bharat series: the two-digit year of first registration. */
  bhYear?: string;
  /** The four-digit registration number, leading zeros kept. */
  number: string;
  /** True when fewer than four digits were typed and the number was padded with zeros. */
  padded: boolean;
  /** How the whole registration reads, e.g. "MH 12 AB 0007". */
  display: string;
}

export interface ParseResult { ok: boolean; value?: Registration; error?: string }

const STANDARD = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/;
const BH = /^(\d{2})BH(\d{4})([A-Z]{1,2})$/;

const EXAMPLES = "Examples: MH 12 AB 0007, DL 3C 1234, 22 BH 0007 AB, or just 0007.";

export function parseRegistration(raw: string): ParseResult {
  const clean = (raw || "").toUpperCase().replace(/[\s\-._/]/g, "");
  if (!clean) return { ok: false, error: i18n.t("vehicle.error.regEmpty") };
  if (!/^[A-Z0-9]+$/.test(clean)) return { ok: false, error: `${i18n.t("vehicle.error.regChars")} ${EXAMPLES}` };

  const finish = (v: Omit<Registration, "padded" | "display"> & { digits: string }): ParseResult => {
    const { digits, ...rest } = v;
    if (/^0+$/.test(digits)) return { ok: false, error: i18n.t("vehicle.error.regZero") };
    const number = digits.padStart(4, "0");
    const display = rest.kind === "bh" ? `${rest.bhYear} BH ${number}${rest.series ? ` ${rest.series}` : ""}` : [rest.state, rest.rto, rest.series, number].filter(Boolean).join(" ");
    return { ok: true, value: { ...rest, number, padded: digits.length < 4, display } };
  };

  if (/^\d{1,4}$/.test(clean)) return finish({ kind: "number", number: "", digits: clean });

  const bh = BH.exec(clean);
  if (bh) return finish({ kind: "bh", bhYear: bh[1], series: bh[3], number: "", digits: bh[2] });

  const m = STANDARD.exec(clean);
  if (m) return finish({ kind: "standard", state: m[1], rto: m[2], series: m[3] || undefined, number: "", digits: m[4] });

  return { ok: false, error: `${i18n.t("vehicle.error.regUnreadable")} ${EXAMPLES}` };
}

/** The digits that are evaluated for a registration, and a note when the chosen scope could not be applied in full. */
export function digitsFor(reg: Registration, scope: Scope): { digits: string; note?: string } {
  if (scope === "number") return { digits: reg.number };
  const rto = reg.rto ?? "";
  const bh = reg.bhYear ?? "";
  if (scope === "rto-number") {
    if (!rto) return { digits: reg.number, note: "No RTO code was entered, so only the registration number was evaluated." };
    return { digits: rto + reg.number };
  }
  const all = bh + rto + reg.number;
  return all === reg.number ? { digits: reg.number, note: "Only the registration number was entered, so only its digits were evaluated." } : { digits: all };
}

/** Whether a four-digit string is a usable registration number (0001 to 9999). */
export const isValidNumber = (n: string): boolean => /^\d{4}$/.test(n) && n !== "0000";
