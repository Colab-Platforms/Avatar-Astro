/**
 * Maps the recommended stone onto the live shop catalogue. Pure functions
 * over the public product list; nothing is invented, and no other gemstone
 * is ever substituted.
 */
import type { GemstoneInfo, Planet } from "./gemstone.catalogue.js";
import { STONE_FOR_PLANET } from "./gemstone.catalogue.js";

export interface CatalogueProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number | null;
  description: string;
  image: string | null;
  category: { id: string; name: string; slug: string };
}

export interface MatchedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  categoryName: string;
  categorySlug: string;
  url: string;
  /** Seller-supplied text, shown as such and never as established fact. */
  sellerDescription: string;
  reason?: string;
}

export interface ShopMatches {
  stone: { key: string; name: string; planet: Planet };
  gemstones: MatchedProduct[];
  jewellery: MatchedProduct[];
  chartLinked: MatchedProduct[];
  complementary: MatchedProduct[];
}

export const COMPLEMENTARY_LIMIT = 6;
const GEM_CATEGORY = /gem/;
const JEWELLERY_WORDS = /\b(ring|pendant|bracelet|earring|necklace|locket|mala|jewel)/;
const COMPLEMENTARY_CATEGORIES = new Set(["rudraksha", "bracelets", "yantras"]);

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'");

const containsAlias = (text: string, aliases: string[]) =>
  aliases.some((a) => new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(text));

const MUKHI_WORDS: Record<string, number> = {
  ek: 1, eka: 1, do: 2, dwi: 2, teen: 3, tri: 3, char: 4, chatur: 4,
  panch: 5, pancha: 5, chhe: 6, chha: 6, shat: 6, saat: 7, sapta: 7,
  aath: 8, ashta: 8, nau: 9, nav: 9, nava: 9,
};

/** Mukhi count from a product name (e.g. "5 Mukhi", "Panchmukhi"), else null. */
export const parseMukhi = (name: string): number | null => {
  const t = norm(name);
  const num = t.match(/(\d{1,2})\s*[- ]?\s*mukhi/);
  if (num) return Number(num[1]);
  const word = t.match(/\b(ek|eka|do|dwi|teen|tri|char|chatur|panch|pancha|chhe|chha|shat|saat|sapta|aath|ashta|nau|nav|nava)\s*-?\s*mukhi/);
  return word ? MUKHI_WORDS[word[1]] : null;
};

const toMatched = (p: CatalogueProduct, reason?: string): MatchedProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  price: p.price,
  originalPrice: p.originalPrice,
  image: p.image,
  categoryName: p.category.name,
  categorySlug: p.category.slug,
  url: `/shop/${p.slug}`,
  sellerDescription: p.description.length > 220 ? `${p.description.slice(0, 217)}…` : p.description,
  ...(reason ? { reason } : {}),
});

export const matchShop = (
  stone: GemstoneInfo,
  products: CatalogueProduct[],
): ShopMatches => {
  const used = new Set<string>();
  const take = (list: CatalogueProduct[], reason?: string) =>
    list.map((p) => {
      used.add(p.id);
      return toMatched(p, reason);
    });

  const nameOf = (p: CatalogueProduct) => norm(`${p.name} ${p.slug.replace(/-/g, " ")}`);
  const isGemCategory = (p: CatalogueProduct) =>
    GEM_CATEGORY.test(norm(p.category.slug)) || GEM_CATEGORY.test(norm(p.category.name));

  const gemstones = take(
    products.filter((p) => isGemCategory(p) && containsAlias(nameOf(p), stone.aliases)),
  );

  const jewellery = take(
    products.filter(
      (p) =>
        !used.has(p.id) &&
        !isGemCategory(p) &&
        containsAlias(nameOf(p), stone.aliases) &&
        (JEWELLERY_WORDS.test(nameOf(p)) || JEWELLERY_WORDS.test(norm(p.category.slug))),
    ),
  );

  const chartLinked: MatchedProduct[] = [];
  if (stone.rudrakshaMukhi) {
    const reason = `In one common convention, the ${stone.rudrakshaMukhi}-mukhi Rudraksha is linked to ${stone.planet}, your Lagna lord. Traditions differ on this map.`;
    chartLinked.push(
      ...take(
        products.filter(
          (p) =>
            !used.has(p.id) &&
            norm(p.category.slug).includes("rudraksha") &&
            parseMukhi(p.name) === stone.rudrakshaMukhi,
        ),
        reason,
      ),
    );
  }

  const complementary = take(
    products
      .filter((p) => !used.has(p.id) && COMPLEMENTARY_CATEGORIES.has(p.category.slug))
      .slice(0, COMPLEMENTARY_LIMIT),
  );

  return {
    stone: { key: stone.key, name: stone.name, planet: stone.planet },
    gemstones,
    jewellery,
    chartLinked,
    complementary,
  };
};

export { STONE_FOR_PLANET };
