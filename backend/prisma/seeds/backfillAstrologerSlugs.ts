import prisma from "../../prisma.js";
import { generateUniqueAstrologerSlug } from "../../src/utils/slug.js";

/**
 * One-off backfill: gives every AstrologerProfile row created before the `slug` column
 * existed a real slug, so `slug` can then be made required (NOT NULL) in the schema.
 * Idempotent — rows that already have a slug are skipped.
 *
 *   npm run db:seed:astrologer-backfill-slugs
 */
async function main() {
  const rows = await prisma.astrologerProfile.findMany({ where: { slug: null }, select: { id: true, displayName: true } });
  if (rows.length === 0) {
    console.log("Nothing to backfill — every profile already has a slug.");
    return;
  }
  for (const row of rows) {
    const slug = await generateUniqueAstrologerSlug(row.displayName);
    await prisma.astrologerProfile.update({ where: { id: row.id }, data: { slug } });
    console.log(`✓ ${row.displayName} -> /astrologers/${slug}`);
  }
  console.log(`\n✓ Backfilled ${rows.length} profile(s). You can now change "slug String? @unique" back to "slug String @unique" in astrologer.prisma and run "npx prisma db push" again.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
