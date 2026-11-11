import i18n from "@/i18n";

/**
 * The spelling engine (lib/nameSpelling.ts, lib/namePronunciation.ts) writes fixed English sentences. These helpers map each
 * exact sentence to its dictionary key for display; anything that does not match stays as the engine wrote it (English).
 */

const label = (l: string): string => (l === "Birth Number" ? i18n.t("namank.engine.birthNumber") : l === "Life Path" ? i18n.t("namank.engine.lifePath") : l);

/** `Adds “i”`, `Removes “h”`, `Replaces “sh” with “s”`, joined by "; ". */
export function changeText(summary: string): string {
  if (!summary) return summary;
  return summary
    .split("; ")
    .map((part) => {
      let m = /^Replaces “(.*)” with “(.*)”$/.exec(part);
      if (m) return i18n.t("namank.engine.replaces", { rem: m[1], add: m[2] });
      m = /^Adds “(.*)”$/.exec(part);
      if (m) return i18n.t("namank.engine.adds", { add: m[1] });
      m = /^Removes “(.*)”$/.exec(part);
      if (m) return i18n.t("namank.engine.removes", { rem: m[1] });
      return part;
    })
    .join("; ");
}

export function reasonText(r: string): string {
  let m = /^Its Chaldean name number is (\d+), which matches your (Birth Number|Life Path) \((\d+)\)\.$/.exec(r);
  if (m) return i18n.t("namank.engine.reasonChaldean", { n: m[1], label: label(m[2]), value: m[3] });
  m = /^Its Destiny number is (\d+), which reduces to (\d+) and matches your (Birth Number|Life Path)\.$/.exec(r);
  if (m) return i18n.t("namank.engine.reasonDestiny", { n: m[1], value: m[2], label: label(m[3]) });
  return r;
}

const PRON: Record<string, string> = {
  "The pronunciation stays the same. Only the written spelling changes.": "namank.engine.pronSame",
  "The suggested spelling may sound slightly different. Compare the syllables and use Listen where it is available.": "namank.engine.pronDiff",
};
export const pronunciationText = (text: string): string => (PRON[text] ? i18n.t(PRON[text]) : text);
