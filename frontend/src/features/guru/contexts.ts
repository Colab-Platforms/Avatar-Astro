/**
 * Short plain-text summaries of a user's own result, handed to Divya Margdarshak with their question.
 * Each one lists only values that were calculated or chosen for that user.
 */
import type { KundaliResult } from "@/features/kundali/types";
import type { RatnaResult } from "@/features/ratna/types";

const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join("\n");

export const kundaliContext = (k: KundaliResult): string => {
  const rashi = (r: { name: string; sign: string } | null, alt: { name: string }[]) =>
    r ? `${r.name} (${r.sign})` : `${alt.map((a) => a.name).join(" or ")} (depends on birth time)`;
  const p = k.panchang;
  return join([
    `Born ${k.birth.dateOfBirth}${k.birth.timeOfBirth ? ` at ${k.birth.timeOfBirth}` : " (birth time unknown)"} in ${k.birth.place}.`,
    `Surya Rashi: ${rashi(k.sun.rashi, k.sun.candidates)}. Chandra Rashi: ${rashi(k.moon.rashi, k.moon.candidates)}.`,
    k.moon.nakshatra && `Janma Nakshatra: ${k.moon.nakshatra.name}${k.moon.nakshatra.pada ? `, pada ${k.moon.nakshatra.pada}` : ""}.`,
    k.lagna ? `Lagna: ${k.lagna.rashi.name}.` : "Lagna and houses are not known because the birth time is unknown.",
    k.planets && `Grahas: ${k.planets.map((g) => `${g.planet} in ${g.rashi.name} (house ${g.house})`).join("; ")}.`,
    k.dasha && `Running dasha: ${k.dasha.mahadasha.lord} Mahadasha, ${k.dasha.antardasha.lord} Antardasha.`,
    `Panchang: Vikram Samvat ${p.vikramSamvat}, ${p.masa.name} masa, ${p.paksha} paksha, ${p.tithi.name} tithi, ${p.vara.name}.`,
  ]);
};

export const ratnaContext = (r: RatnaResult): string => {
  const a = r.recommendation?.analysis;
  return join([
    `Primary Ratna: ${r.primary.stone.name} (${r.primary.stone.hindi}), associated with ${r.primary.planet}. Method: ${r.method.name}.`,
    a && `Lagna: ${a.lagna.sign}. Chandra Rashi: ${a.moon.sign}, Nakshatra ${a.moon.nakshatra}.`,
    a?.dasha && `Running dasha: ${a.dasha.mahadasha.lord} Mahadasha, ${a.dasha.antardasha.lord} Antardasha.`,
    r.recommendation?.secondary.length ? `Alternative Ratnas: ${r.recommendation.secondary.map((s) => s.stone.name).join(", ")}.` : "",
    r.status === "date_based" && "Birth time was unknown, so no Lagna or houses were calculated.",
  ]);
};
