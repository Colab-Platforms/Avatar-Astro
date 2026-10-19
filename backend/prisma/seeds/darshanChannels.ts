/**
 * Seeds/updates the DarshanChannel table from src/config/temples.json.
 * Safe to re-run any time — upserts by slug, so editing a channelId in the
 * JSON file and re-running this script updates the DB without duplicating
 * records or touching any application code.
 *
 * Usage: npm run db:seed:darshan   (from backend/)
 */

import "dotenv/config";
import prisma from "../../prisma.js";
import temples from "../../src/config/temples.json" with { type: "json" };

async function main() {
  let upserted = 0;
  for (const t of temples) {
    await prisma.darshanChannel.upsert({
      where: { slug: t.slug },
      update: { name: t.name, youtubeChannelId: t.youtubeChannelId },
      create: { slug: t.slug, name: t.name, youtubeChannelId: t.youtubeChannelId },
    });
    upserted++;
  }

  console.log(`✓ Seeded/updated ${upserted} darshan channels from config/temples.json`);
  const missingChannelId = temples.filter((t) => !t.youtubeChannelId).map((t) => t.slug);
  if (missingChannelId.length > 0) {
    console.log(
      `⚠ ${missingChannelId.length} temple(s) still need a real youtubeChannelId: ${missingChannelId.join(", ")}`,
    );
    console.log("  Edit backend/src/config/temples.json and re-run this script.");
  }
}

main()
  .catch((e) => {
    console.error("Darshan channel seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
