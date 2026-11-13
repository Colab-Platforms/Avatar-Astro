import type { Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Creates a 60-second allowance on first use — never by migration seed, same idiom as Wallet.
 *
 * `upsert` alone is NOT safe here: two concurrent calls for the same brand-new user (e.g. two
 * requests racing to chat for the first time — a real scenario `startSession`/`acceptSession`
 * both hit) can both decide the row doesn't exist yet and both attempt to create it, and the
 * loser surfaces a raw `P2002` instead of Prisma reconciling it internally. The fix mirrors
 * Checkpoint 1's signup-bonus lesson: a conflict on create is an EXPECTED outcome of a race, not
 * an exceptional one — catch it and simply read back the row the winner created.
 *
 * Inside an open transaction a failed INSERT would poison the whole transaction, so callers that are
 * about to open one (settlement, accept) call this FIRST, outside it.
 */
export async function getOrCreateFreeAllowance(userId: string, db: Db = prisma) {
  try {
    return await db.chatFreeAllowance.upsert({ where: { userId }, update: {}, create: { userId } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return db.chatFreeAllowance.findUniqueOrThrow({ where: { userId } });
    }
    throw err;
  }
}

/**
 * Atomically claims up to `maxSeconds` from the user's GLOBAL free-chat allowance — not a
 * per-session or per-astrologer quota. Runs INSIDE the caller's transaction (`tx`) so the claim commits or
 * rolls back together with the session counters and the wallet charge it belongs to; a failed settlement
 * can never leave free seconds consumed with nothing to show for them. Locks the allowance row for the rest
 * of the transaction. Returns what was claimed and what remains afterwards. The allowance row must already
 * exist (see getOrCreateFreeAllowance).
 */
export async function claimFreeSecondsTx(tx: Prisma.TransactionClient, userId: string, maxSeconds: number): Promise<{ claimed: number; remaining: number }> {
  // $queryRaw bypasses Prisma's @map aliasing — every selected column is aliased to its
  // camelCase name explicitly (an unaliased raw SELECT silently reads back as `undefined`).
  const rows = await tx.$queryRaw<{ totalSeconds: number; consumedSeconds: number }[]>`
    SELECT total_seconds AS "totalSeconds", consumed_seconds AS "consumedSeconds"
    FROM chat_free_allowances WHERE user_id = ${userId} FOR UPDATE
  `;
  const row = rows[0];
  if (!row) return { claimed: 0, remaining: 0 }; // cannot happen once the row exists; stay safe rather than throw

  const remaining = Math.max(0, row.totalSeconds - row.consumedSeconds);
  const claimed = Math.max(0, Math.min(maxSeconds, remaining));
  if (claimed > 0) {
    await tx.$executeRaw`UPDATE chat_free_allowances SET consumed_seconds = consumed_seconds + ${claimed}, updated_at = now() WHERE user_id = ${userId}`;
  }
  return { claimed, remaining: remaining - claimed };
}

/** Standalone claim in its own transaction. Returns exactly how much was claimed (0 if nothing remains). */
export async function claimFreeSeconds(userId: string, maxSeconds: number): Promise<number> {
  if (maxSeconds <= 0) return 0;
  await getOrCreateFreeAllowance(userId); // ensure the row exists before locking it
  return prisma.$transaction(async (tx) => (await claimFreeSecondsTx(tx, userId, maxSeconds)).claimed);
}

/** Read-only view for eligibility checks and the future `GET /chat/free-allowance` UI endpoint. */
export async function getRemainingFreeSeconds(userId: string, db: Db = prisma): Promise<number> {
  const allowance = await getOrCreateFreeAllowance(userId, db);
  return Math.max(0, allowance.totalSeconds - allowance.consumedSeconds);
}
