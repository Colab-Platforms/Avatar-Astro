import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

const SIGNUP_BONUS_PAISE = 5000; // 50 coins, promotional

/**
 * Grants the one-time signup bonus, if (and only if) this user hasn't already received one.
 *
 * MUST be called from inside the SAME `prisma.$transaction` that marks the account as newly
 * activated (email-verified via OTP, or newly created via Google sign-in) — never on its own.
 * That activation write always commits unconditionally; this function's bonus grant is the only
 * conditional part, and its condition is "did my own INSERT actually land a row," never "did I
 * catch an error":
 *
 *   `INSERT INTO signup_bonus_grants (...) VALUES (...) ON CONFLICT (user_id) DO NOTHING RETURNING id`
 *
 * never throws on a conflict — a conflict is a normal statement that affects zero rows, not a
 * Postgres error, so the surrounding transaction never enters an aborted state. Contrast with
 * catching a unique-violation exception inside an interactive transaction, which leaves Postgres's
 * transaction in an aborted state and can silently roll back the activation write alongside it —
 * that failure mode is exactly what this function avoids by construction, not by exception handling.
 *
 * Verified concurrency behavior: two simultaneous calls for the same user both reach the INSERT;
 * Postgres serializes them against the unique index on `user_id` — the second blocks briefly until
 * the first commits, then correctly observes 0 rows returned and grants nothing. No error, no lost
 * update, no double grant.
 */
export async function grantSignupBonusIfEligible(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const granted = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO signup_bonus_grants (id, user_id, amount_paise, granted_at)
    VALUES (${randomUUID()}, ${userId}, ${SIGNUP_BONUS_PAISE}, now())
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id
  `;
  if (granted.length === 0) return; // another request already granted it — nothing else to do

  const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
  const newBalance = wallet.balancePaise + SIGNUP_BONUS_PAISE;
  const newPromo = wallet.promotionalBalancePaise + SIGNUP_BONUS_PAISE;

  await tx.$executeRaw`
    UPDATE wallets
    SET balance_paise = ${newBalance}, promotional_balance_paise = ${newPromo}, updated_at = now()
    WHERE id = ${wallet.id}
  `;
  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "CREDIT",
      reason: "SIGNUP_BONUS",
      amountPaise: SIGNUP_BONUS_PAISE,
      balanceAfterPaise: newBalance,
      idempotencyKey: `signup-bonus:${userId}`,
    },
  });
  await tx.walletLedgerAllocation.create({
    data: { transactionId: transaction.id, bucket: "PROMOTIONAL", amountPaise: SIGNUP_BONUS_PAISE },
  });
}
