/**
 * Frontend presentation data for the nine Navaratna, keyed by the backend's
 * stone key. The Hindi name here is only a fallback: the API supplies it too.
 * Photographs live in public/images/ratna (credits in CREDITS.md there).
 */
export interface RatnaAsset {
  image: string;
  hindi: string;
  /** Roman transliteration shown after the Devanagari name. */
  translit: string;
  english: string;
  planet: string;
}

export const RATNA_ASSETS: Record<string, RatnaAsset> = {
  ruby: { image: "/images/ratna/manikya-ruby.webp", hindi: "माणिक", translit: "Manik", english: "Ruby", planet: "Sun" },
  pearl: { image: "/images/ratna/moti-pearl.webp", hindi: "मोती", translit: "Moti", english: "Pearl", planet: "Moon" },
  "red-coral": { image: "/images/ratna/moonga-red-coral.webp", hindi: "मूंगा", translit: "Moonga", english: "Red Coral", planet: "Mars" },
  emerald: { image: "/images/ratna/panna-emerald.webp", hindi: "पन्ना", translit: "Panna", english: "Emerald", planet: "Mercury" },
  "yellow-sapphire": { image: "/images/ratna/pukhraj-yellow-sapphire.webp", hindi: "पुखराज", translit: "Pukhraj", english: "Yellow Sapphire", planet: "Jupiter" },
  diamond: { image: "/images/ratna/heera-diamond.webp", hindi: "हीरा", translit: "Heera", english: "Diamond", planet: "Venus" },
  "blue-sapphire": { image: "/images/ratna/neelam-blue-sapphire.webp", hindi: "नीलम", translit: "Neelam", english: "Blue Sapphire", planet: "Saturn" },
  hessonite: { image: "/images/ratna/gomed-hessonite.webp", hindi: "गोमेद", translit: "Gomed", english: "Hessonite", planet: "Rahu" },
  "cats-eye": { image: "/images/ratna/lehsunia-cats-eye.webp", hindi: "लहसुनिया", translit: "Lehsunia", english: "Cat's Eye", planet: "Ketu" },
};

interface NamedStone {
  key: string;
  name: string;
  sanskrit?: string;
  hindi?: string;
}

/** "पुखराज · Pukhraj". The API's Hindi name wins; the catalogue fills any gap. */
export const hindiLine = (stone: NamedStone): string => {
  const a = RATNA_ASSETS[stone.key];
  const hindi = stone.hindi || a?.hindi || "";
  const translit = (stone.sanskrit?.split("/")[0].trim() || a?.translit || "").trim();
  return [hindi, translit].filter(Boolean).join(" · ");
};

/** One-line label for tooltips, alt text and plain-text contexts: "Yellow Sapphire (पुखराज · Pukhraj)". */
export const stoneLabel = (stone: NamedStone): string => {
  const line = hindiLine(stone);
  return line ? `${stone.name} (${line})` : stone.name;
};

export const ratnaImageSrc = (key: string): string | null => RATNA_ASSETS[key]?.image ?? null;
