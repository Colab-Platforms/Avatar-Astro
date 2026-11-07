import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "astrologer"
  );
}

/**
 * Appends a short random suffix only if the base slug is already taken, so most
 * astrologers get a clean "acharya-vihaan-sharma" slug and collisions (same display
 * name) still resolve deterministically without a retry loop.
 */
export async function generateUniqueAstrologerSlug(
  displayName: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const base = slugify(displayName);
  const existing = await db.astrologerProfile.findUnique({ where: { slug: base }, select: { id: true } });
  if (!existing) return base;
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
