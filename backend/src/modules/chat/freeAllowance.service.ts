import prisma from "@root/prisma.js";

/**
 * Creates a 60-second allowance on first use — never by migration seed, same idiom as Wallet.
 *
 * `upsert` alone is NOT safe here: two concurrent calls for the same brand-new user (e.g. two
 * requests racing to chat for the first time — a real scenario `startSession`/`acceptSession`
 * both hit) can both decide the row doesn't exist yet and both attempt to create it, and the
 * loser surfaces a raw `P2002` instead of Prisma reconciling it internally. The fix mirrors
 * Checkpoint 1's signup-bonus lesson: a conflict on create is an EXPECTED outcome of a race, not
 * an exceptional one — catch it and simply read back the row the winner created.
 */
export async function getOrCreateFreeAllowance(userId: string) {
  try {
    return await prisma.chatFreeAllowance.upsert({ where: { userId }, update: {}, create: { userId } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return prisma.chatFreeAllowance.findUniqueOrThrow({ where: { userId } });
    }
    throw err;
  }
}

/**
 * Atomically claims up to `maxSeconds` from the user's GLOBAL free-chat allowance — not a
 * per-session or per-astrologer quota. Returns exactly how much was actually claimed, which may
 * be less than requested, or 0 if nothing remains. Locks the row for the duration of the claim
 * so two concurrent calls for the same user can never together claim more than totalSeconds
 * (defense-in-depth: the one-live-session-per-user DB constraint from Checkpoint 3 already makes
 * concurrent claims for the same user essentially impossible in practice).
 */
export async function claimFreeSeconds(userId: string, maxSeconds: number): Promise<number> {
  if (maxSeconds <= 0) return 0;
  await getOrCreateFreeAllowance(userId); // ensure the row exists before locking it

  return prisma.$transaction(async (tx) => {
    // $queryRaw bypasses Prisma's @map aliasing — every selected column is aliased to its
    // camelCase name explicitly (the exact bug caught and fixed in wallet.service.ts's
    // lockWallet during Checkpoint 2: an unaliased raw SELECT silently reads back as `undefined`).
    const rows = await tx.$queryRaw<{ totalSeconds: number; consumedSeconds: number }[]>`
      SELECT total_seconds AS "totalSeconds", consumed_seconds AS "consumedSeconds"
      FROM chat_free_allowances WHERE user_id = ${userId} FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return 0; // shouldn't happen after the upsert above, but stay safe rather than throw

    const remaining = Math.max(0, row.totalSeconds - row.consumedSeconds);
    const claimed = Math.min(maxSeconds, remaining);
    if (claimed <= 0) return 0;

    await tx.$executeRaw`UPDATE chat_free_allowances SET consumed_seconds = consumed_seconds + ${claimed}, updated_at = now() WHERE user_id = ${userId}`;
    return claimed;
  });
}

/** Read-only view for eligibility checks and the future `GET /chat/free-allowance` UI endpoint. */
export async function getRemainingFreeSeconds(userId: string): Promise<number> {
  const allowance = await getOrCreateFreeAllowance(userId);
  return Math.max(0, allowance.totalSeconds - allowance.consumedSeconds);
}
