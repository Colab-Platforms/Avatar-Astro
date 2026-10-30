import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";

/**
 * Platform settings with a short in-memory cache. Reads fail OPEN: if the
 * database is unreachable the public features keep working with defaults.
 */
const TTL_MS = 15_000;
let cache = new Map<string, unknown>();
let loadedAt = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await prisma.platformSetting.findMany();
      cache = new Map(rows.map((r) => [r.key, r.value as unknown]));
      loadedAt = Date.now();
    } catch (err: any) {
      // Keep serving the previous cache; retry after the TTL.
      loadedAt = Date.now();
      console.warn("[settings] refresh failed:", err?.message);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function getAllSettings(): Promise<Map<string, unknown>> {
  if (Date.now() - loadedAt > TTL_MS) await refresh();
  return cache;
}

export async function isFeatureEnabled(settingKey: string): Promise<boolean> {
  const all = await getAllSettings();
  return all.get(settingKey) !== false;
}

/** Writes the setting. Pass a transaction client to commit it together with its audit row; call cacheSetting after commit. */
export async function setSetting(key: string, value: unknown, updatedBy: string, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
  await db.platformSetting.upsert({
    where: { key },
    update: { value: value as any, updatedBy },
    create: { key, value: value as any, updatedBy },
  });
}

/** Make a committed change visible to this process immediately (other instances pick it up within the TTL). */
export function cacheSetting(key: string, value: unknown): void {
  cache.set(key, value);
}

/** Test hook. */
export function resetSettingsCache(): void {
  cache = new Map();
  loadedAt = 0;
}
