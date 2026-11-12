/**
 * Display names for calculated astrology and Hindu-calendar values.
 *
 * THE CALCULATED VALUE NEVER CHANGES. The engine returns "Rohini", "Shukla Panchami", "Vyatipata" and so on, in English, in every
 * language. This module only decides what name is SHOWN: it looks the English name up in the glossary of the chosen language and
 * falls back to the English name itself, never to a raw key.
 *
 * The glossary lives in the same dictionaries as the rest of the text, under glossary.<kind>.<English name>.
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export type GlossaryKind =
  | "weekday" | "tithi" | "paksha" | "nakshatra" | "yoga" | "karana" | "masa" | "rashi" | "planet" | "festival" | "term";

/** Names as the engine returns them, where they need a small normalisation to match a glossary entry. */
const normalise = (kind: GlossaryKind, name: string): string => {
  if (kind === "tithi") return name.replace(/^(Shukla|Krishna)\s+/, "").replace("Dvitiya", "Dwitiya").replace("Dvadashi", "Dwadashi");
  if (kind === "karana") return name.replace(/\s*\(Bhadra\)$/, "");
  return name;
};

import i18n from "./index";

/** The same lookup as useGlossary().g, for code that is not a component (share text, calendar files). */
export function glossName(kind: GlossaryKind, name: string, fallback?: string): string {
  if (!name) return name;
  const n = normalise(kind, name);
  const shown = fallback ?? n;
  const key = `glossary.${kind}.${n}`;
  const out = i18n.t(key, { defaultValue: shown });
  return out === key || !out ? shown : out;
}

export function useGlossary() {
  const { t } = useTranslation();
  /** The displayed name of a calculated value; the English name if the chosen language has none. */
  const g = useCallback(
    (kind: GlossaryKind, name: string, fallback?: string): string => {
      if (!name) return name;
      const n = normalise(kind, name);
      const shown = fallback ?? n;
      const key = `glossary.${kind}.${n}`;
      const out = t(key, { defaultValue: shown });
      return out === key || !out ? shown : out;
    },
    [t],
  );
  /** "Shukla Panchami" shown as "<paksha> <tithi>" in the chosen language. */
  const tithiFull = useCallback(
    (full: string): string => {
      const m = /^(Shukla|Krishna)\s+(.+)$/.exec(full);
      return m ? `${g("paksha", m[1])} ${g("tithi", m[2])}` : g("tithi", full);
    },
    [g],
  );
  return { g, tithiFull };
}
