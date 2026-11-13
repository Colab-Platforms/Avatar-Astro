import type {
  Prisma,
  Wallet,
  WalletTransaction,
  WalletTransactionReason,
  WalletBalanceBucket,
  WalletReservation,
  WalletReservationPurpose,
} from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Every mutating function below accepts an optional `db`, defaulting to the top-level `prisma`
 * client. When a caller is already inside its own `prisma.$transaction` (e.g. a chat settlement that also
 * touches `ChatSession` and the free allowance in the same transaction) and passes that transaction's
 * client through, we must run inside IT, not open a new sibling transaction — a sibling would commit
 * independently of the caller's transaction (breaking atomicity) and would block forever on any row lock the
 * caller already holds.
 *
 * How the two are told apart: a transaction client has NO `$connect` / `$disconnect` / `$on` / `$extends`;
 * only the top-level client does. (Do NOT test for `$transaction`: Prisma 7's interactive transaction client
 * still exposes one, so that test misclassified every transaction client as the top-level client and made every
 * "joined" call silently open a sibling transaction.)
 */
function isOpenTransaction(db: Db): db is Prisma.TransactionClient {
  return typeof (db as { $connect?: unknown }).$connect !== "function";
}

async function withTransaction<T>(db: Db, run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return isOpenTransaction(db) ? run(db) : prisma.$transaction(run);
}

/**
 * Creates a zero-balance wallet on first read — never by migration seed.
 *
 * `upsert` alone is NOT safe against two concurrent calls for the same brand-new user (e.g. two
 * chat requests racing to be the first to ever touch this user's wallet) — the loser can surface
 * a raw `P2002` instead of Prisma reconciling it internally. Caught here the same way
 * `freeAllowance.service.ts`'s `getOrCreateFreeAllowance` handles the identical race: a conflict
 * on create is an expected outcome of the race, not an exceptional one.
 */
export async function getOrCreateWallet(userId: string, db: Db = prisma) {
  try {
    return await db.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return db.wallet.findUniqueOrThrow({ where: { userId } });
    }
    throw err;
  }
}

export async function getWalletSummary(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { allocations: true },
  });
  return {
    balancePaise: wallet.balancePaise,
    purchasedBalancePaise: wallet.purchasedBalancePaise,
    promotionalBalancePaise: wallet.promotionalBalancePaise,
    reservedBalancePaise: wallet.reservedBalancePaise,
    transactions,
  };
}

/**
 * Takes a `SELECT ... FOR UPDATE` row lock on the wallet, inside the caller's transaction, and
 * returns the just-locked, current-as-of-now row. Every balance mutation in this file reads the
 * wallet via this function — never via a plain `findUnique` — specifically so that two concurrent
 * operations against the SAME wallet with DIFFERENT idempotency keys (so neither short-circuits the
 * other) cannot both plan their bucket split off the same stale pre-lock numbers and overspend a
 * bucket. The lock is held until the surrounding `prisma.$transaction` commits or rolls back.
 */
export async function lockWallet(tx: Prisma.TransactionClient, walletId: string): Promise<Wallet> {
  // $queryRaw bypasses Prisma's @map column aliasing entirely — it returns the literal Postgres
  // column names (balance_paise), not the camelCase field names (balancePaise) the rest of this
  // file assumes. Every selected column is aliased to its camelCase name explicitly so the result
  // actually matches the `Wallet` type; without this, every field silently reads back as
  // `undefined` and arithmetic on it silently produces NaN, which Postgres then rejects as NULL.
  const rows = await tx.$queryRaw<Wallet[]>`
    SELECT
      id,
      user_id AS "userId",
      balance_paise AS "balancePaise",
      purchased_balance_paise AS "purchasedBalancePaise",
      promotional_balance_paise AS "promotionalBalancePaise",
      reserved_balance_paise AS "reservedBalancePaise",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM wallets WHERE id = ${walletId} FOR UPDATE
  `;
  if (!rows[0]) throw new ApiError("Wallet not found", STATUS_CODES.NOT_FOUND);
  return rows[0];
}

type Allocation = { bucket: WalletBalanceBucket; amountPaise: number };

/** Promotional coins are spent before purchased coins (Rule C). Never used for refunds — those mirror the original allocation instead. */
function planDebitAllocations(wallet: Pick<Wallet, "promotionalBalancePaise">, amountPaise: number): Allocation[] {
  const fromPromo = Math.min(wallet.promotionalBalancePaise, amountPaise);
  const fromPurchased = amountPaise - fromPromo;
  const allocations: Allocation[] = [];
  if (fromPromo > 0) allocations.push({ bucket: "PROMOTIONAL", amountPaise: fromPromo });
  if (fromPurchased > 0) allocations.push({ bucket: "PURCHASED", amountPaise: fromPurchased });
  return allocations;
}

function sumBucket(allocations: Allocation[], bucket: WalletBalanceBucket): number {
  return allocations.find((a) => a.bucket === bucket)?.amountPaise ?? 0;
}

export interface WalletMutationResult {
  wallet: Wallet;
  transaction: WalletTransaction;
}

/**
 * Credits `amountPaise` into a single named bucket (e.g. RECHARGE -> PURCHASED, SIGNUP_BONUS ->
 * PROMOTIONAL). Idempotent via `idempotencyKey`: a retried call with the same key is a no-op that
 * returns the wallet/transaction state recorded the first time, never a second credit.
 */
export async function creditToBucket(
  walletId: string,
  amountPaise: number,
  bucket: WalletBalanceBucket,
  reason: WalletTransactionReason,
  opts: { referenceId?: string; idempotencyKey?: string } = {},
  db: Db = prisma,
): Promise<WalletMutationResult> {
  if (amountPaise <= 0) throw new ApiError("Credit amount must be positive", STATUS_CODES.BAD_REQUEST);

  const run = async (tx: Prisma.TransactionClient) => {
    if (opts.idempotencyKey) {
      const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
      if (existing) return { wallet: await tx.wallet.findUniqueOrThrow({ where: { id: walletId } }), transaction: existing };
    }

    const wallet = await lockWallet(tx, walletId);
    const newBalance = wallet.balancePaise + amountPaise;
    const newPromo = wallet.promotionalBalancePaise + (bucket === "PROMOTIONAL" ? amountPaise : 0);
    const newPurchased = wallet.purchasedBalancePaise + (bucket === "PURCHASED" ? amountPaise : 0);

    await tx.$executeRaw`
      UPDATE wallets
      SET balance_paise = ${newBalance}, promotional_balance_paise = ${newPromo}, purchased_balance_paise = ${newPurchased}, updated_at = now()
      WHERE id = ${walletId}
    `;
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId,
        type: "CREDIT",
        reason,
        amountPaise,
        balanceAfterPaise: newBalance,
        referenceId: opts.referenceId,
        idempotencyKey: opts.idempotencyKey,
        allocations: { create: [{ bucket, amountPaise }] },
      },
    });
    const updated = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
    return { wallet: updated, transaction };
  };

  return withTransaction(db, run);
}

/**
 * Debits `amountPaise`, spending promotional coins first (Rule C). Clamped so the wallet can never
 * go negative or dip into coins reserved for another operation — throws `409 Insufficient balance` rather than overdrafting, so callers must catch
 * this and react (end a chat session, reject a tool execution) instead of assuming success.
 * Idempotent via `idempotencyKey`.
 */
export async function debitWithAllocations(
  walletId: string,
  amountPaise: number,
  reason: WalletTransactionReason,
  opts: { referenceId?: string; idempotencyKey?: string } = {},
  db: Db = prisma,
): Promise<WalletMutationResult> {
  if (amountPaise <= 0) throw new ApiError("Debit amount must be positive", STATUS_CODES.BAD_REQUEST);

  const run = async (tx: Prisma.TransactionClient) => {
    if (opts.idempotencyKey) {
      const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
      if (existing) return { wallet: await tx.wallet.findUniqueOrThrow({ where: { id: walletId } }), transaction: existing };
    }

    const wallet = await lockWallet(tx, walletId);
    // Only coins NOT held by another operation are spendable: a plain debit must never eat into a running
    // chat's or tool's reservation (the wallet_reserved_within_balance CHECK would reject it with a raw 500).
    if (wallet.balancePaise - wallet.reservedBalancePaise < amountPaise) {
      throw new ApiError("Insufficient balance", STATUS_CODES.CONFLICT);
    }
    const allocations = planDebitAllocations(wallet, amountPaise);
    const newBalance = wallet.balancePaise - amountPaise;
    const newPromo = wallet.promotionalBalancePaise - sumBucket(allocations, "PROMOTIONAL");
    const newPurchased = wallet.purchasedBalancePaise - sumBucket(allocations, "PURCHASED");

    await tx.$executeRaw`
      UPDATE wallets
      SET balance_paise = ${newBalance}, promotional_balance_paise = ${newPromo}, purchased_balance_paise = ${newPurchased}, updated_at = now()
      WHERE id = ${walletId}
    `;
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId,
        type: "DEBIT",
        reason,
        amountPaise,
        balanceAfterPaise: newBalance,
        referenceId: opts.referenceId,
        idempotencyKey: opts.idempotencyKey,
        allocations: { create: allocations },
      },
    });
    const updated = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
    return { wallet: updated, transaction };
  };

  return withTransaction(db, run);
}

/**
 * Reverses a DEBIT transaction, crediting back the EXACT original bucket split — never re-runs the
 * promotional-first policy a fresh debit would use. Idempotent (`refund:<originalTransactionId>`),
 * so refunding the same transaction twice is a safe no-op.
 */
export async function refundTransaction(
  originalTransactionId: string,
  reason: Extract<WalletTransactionReason, "REFUND"> = "REFUND",
  db: Db = prisma,
): Promise<WalletMutationResult> {
  const idempotencyKey = `refund:${originalTransactionId}`;

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: existing.walletId } });
      return { wallet, transaction: existing };
    }

    const original = await tx.walletTransaction.findUniqueOrThrow({
      where: { id: originalTransactionId },
      include: { allocations: true },
    });
    const wallet = await lockWallet(tx, original.walletId);
    const promoBack = sumBucket(original.allocations, "PROMOTIONAL");
    const purchasedBack = sumBucket(original.allocations, "PURCHASED");

    const newBalance = wallet.balancePaise + original.amountPaise;
    const newPromo = wallet.promotionalBalancePaise + promoBack;
    const newPurchased = wallet.purchasedBalancePaise + purchasedBack;

    await tx.$executeRaw`
      UPDATE wallets
      SET balance_paise = ${newBalance}, promotional_balance_paise = ${newPromo}, purchased_balance_paise = ${newPurchased}, updated_at = now()
      WHERE id = ${wallet.id}
    `;
    const allocations: Allocation[] = [
      ...(promoBack > 0 ? ([{ bucket: "PROMOTIONAL", amountPaise: promoBack }] as Allocation[]) : []),
      ...(purchasedBack > 0 ? ([{ bucket: "PURCHASED", amountPaise: purchasedBack }] as Allocation[]) : []),
    ];
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        reason,
        amountPaise: original.amountPaise,
        balanceAfterPaise: newBalance,
        referenceId: original.referenceId,
        idempotencyKey,
        reversalOfId: original.id,
        allocations: { create: allocations },
      },
    });
    const updated = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    return { wallet: updated, transaction };
  };

  return withTransaction(db, run);
}

// ============================================================================
// Reservations — database-backed holds against Wallet.reservedBalancePaise. Creating a
// reservation never moves money between buckets; it only shrinks what
// `balancePaise - reservedBalancePaise` reports as truly available to every OTHER concurrent
// operation on the same wallet. Money only actually leaves the wallet at settlement time, via
// the same promotional-first bucket-split policy a normal debit uses.
// ============================================================================

/**
 * Reserves up to `amountPaise`, degrading gracefully to whatever is actually available rather
 * than failing outright — the caller inspects `reservedAmountPaise` (which may be less than
 * requested, or 0) and decides what a partial/zero reservation means for its own flow (e.g. chat
 * billing rejects session start on 0; a tool execution should treat anything less than the full
 * quoted price as insufficient balance).
 */
export async function createReservation(
  walletId: string,
  amountPaise: number,
  purpose: WalletReservationPurpose,
  referenceId: string,
  db: Db = prisma,
): Promise<{ reservation: WalletReservation | null; reservedAmountPaise: number }> {
  if (amountPaise <= 0) return { reservation: null, reservedAmountPaise: 0 };

  const run = async (tx: Prisma.TransactionClient) => {
    const wallet = await lockWallet(tx, walletId);
    const available = Math.max(0, wallet.balancePaise - wallet.reservedBalancePaise);
    const reserveAmount = Math.min(amountPaise, available);
    if (reserveAmount <= 0) return { reservation: null, reservedAmountPaise: 0 };

    const newReserved = wallet.reservedBalancePaise + reserveAmount;
    await tx.$executeRaw`UPDATE wallets SET reserved_balance_paise = ${newReserved}, updated_at = now() WHERE id = ${walletId}`;
    const reservation = await tx.walletReservation.create({ data: { walletId, amountPaise: reserveAmount, purpose, referenceId } });
    return { reservation, reservedAmountPaise: reserveAmount };
  };

  return withTransaction(db, run);
}

/**
 * Tops a HELD reservation back up toward `targetAmountPaise`, again degrading gracefully — adds
 * as much as the wallet's current true availability allows, which may be less than requested, or
 * nothing. A no-op (returns the reservation unchanged) if it's already at/above target, or if its
 * status is no longer HELD (already settled/released — never resurrected by a late top-up call).
 */
export async function topUpReservation(reservationId: string, targetAmountPaise: number, db: Db = prisma): Promise<WalletReservation> {
  const run = async (tx: Prisma.TransactionClient) => {
    const reservation = await tx.walletReservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.status !== "HELD") return reservation;

    const wallet = await lockWallet(tx, reservation.walletId);
    const needed = targetAmountPaise - reservation.amountPaise;
    if (needed <= 0) return reservation;

    const available = Math.max(0, wallet.balancePaise - wallet.reservedBalancePaise);
    const additional = Math.min(needed, available);
    if (additional <= 0) return reservation;

    const newReserved = wallet.reservedBalancePaise + additional;
    await tx.$executeRaw`UPDATE wallets SET reserved_balance_paise = ${newReserved}, updated_at = now() WHERE id = ${wallet.id}`;
    return tx.walletReservation.update({ where: { id: reservationId }, data: { amountPaise: reservation.amountPaise + additional } });
  };

  return withTransaction(db, run);
}

/**
 * Settles up to `amountPaise` against a HELD reservation: draws from the reservation's currently
 * held amount first, and if that's not enough, covers the shortfall directly from the wallet's
 * truly-available balance (never from coins another reservation is holding). Returns exactly how
 * much was actually charged, which may be less than requested — `exhausted: true` tells the
 * caller funds ran out at this exact call, so it can stop billing at the precise boundary instead
 * of overshooting and correcting afterward. Idempotent via `idempotencyKey`.
 *
 * `finalize: true` marks this the LAST settlement against the reservation (a one-shot tool execution): any
 * unspent remainder is given back and the reservation is closed as SETTLED with a timestamp, instead of being
 * left HELD at zero. Rolling reservations (chat lookahead) leave it unset and stay HELD to be topped up.
 */
export async function settleFromReservation(
  reservationId: string,
  amountPaise: number,
  reason: WalletTransactionReason,
  opts: { referenceId?: string; idempotencyKey?: string; finalize?: boolean } = {},
  db: Db = prisma,
): Promise<{ wallet: Wallet; transaction: WalletTransaction | null; charged: number; exhausted: boolean }> {
  const run = async (tx: Prisma.TransactionClient) => {
    if (opts.idempotencyKey) {
      const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
      if (existing) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: existing.walletId } });
        return { wallet, transaction: existing, charged: existing.amountPaise, exhausted: false };
      }
    }

    const reservation = await tx.walletReservation.findUniqueOrThrow({ where: { id: reservationId } });
    const wallet = await lockWallet(tx, reservation.walletId);

    const fromReservation = Math.min(amountPaise, reservation.amountPaise);
    const remainder = amountPaise - fromReservation;
    // reservedBalancePaise already counts this reservation's current hold, so the balance beyond
    // it (not yet touched by this call) is what's left for any shortfall this reservation can't cover.
    const availableBeyondReservation = Math.max(0, wallet.balancePaise - wallet.reservedBalancePaise);
    const fromWalletDirect = Math.min(remainder, availableBeyondReservation);
    const charged = fromReservation + fromWalletDirect;
    const exhausted = charged < amountPaise;

    if (charged <= 0) {
      return { wallet, transaction: null, charged: 0, exhausted: true };
    }

    const allocations = planDebitAllocations(wallet, charged);
    const newBalance = wallet.balancePaise - charged;
    const newPromo = wallet.promotionalBalancePaise - sumBucket(allocations, "PROMOTIONAL");
    const newPurchased = wallet.purchasedBalancePaise - sumBucket(allocations, "PURCHASED");
    const leftover = reservation.amountPaise - fromReservation;
    const finalize = opts.finalize === true && reservation.status === "HELD";
    // On finalize the unspent remainder is released in the same statement, so the wallet's reserved total
    // always equals the sum of its HELD reservations.
    const newReserved = wallet.reservedBalancePaise - fromReservation - (finalize ? leftover : 0);

    await tx.$executeRaw`
      UPDATE wallets
      SET balance_paise = ${newBalance}, promotional_balance_paise = ${newPromo}, purchased_balance_paise = ${newPurchased},
          reserved_balance_paise = ${newReserved}, updated_at = now()
      WHERE id = ${wallet.id}
    `;
    await tx.walletReservation.update({
      where: { id: reservationId },
      data: finalize ? { amountPaise: 0, status: "SETTLED", resolvedAt: new Date() } : { amountPaise: leftover },
    });
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        reason,
        amountPaise: charged,
        balanceAfterPaise: newBalance,
        referenceId: opts.referenceId,
        idempotencyKey: opts.idempotencyKey,
        allocations: { create: allocations },
      },
    });
    const updatedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    return { wallet: updatedWallet, transaction, charged, exhausted };
  };

  return withTransaction(db, run);
}

/**
 * Releases whatever a reservation still holds — making those coins immediately visible to every
 * other concurrent operation on the wallet. Idempotent: calling it again on an already-resolved
 * reservation is a safe no-op. Marked SETTLED if the reservation had nothing left to free (fully
 * consumed by settlement already) or RELEASED if it's giving back an unused remainder.
 */
export async function releaseReservation(reservationId: string, db: Db = prisma): Promise<WalletReservation> {
  const run = async (tx: Prisma.TransactionClient) => {
    const reservation = await tx.walletReservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.status !== "HELD") return reservation;

    const wallet = await lockWallet(tx, reservation.walletId);
    const newReserved = wallet.reservedBalancePaise - reservation.amountPaise;
    await tx.$executeRaw`UPDATE wallets SET reserved_balance_paise = ${newReserved}, updated_at = now() WHERE id = ${wallet.id}`;
    return tx.walletReservation.update({
      where: { id: reservationId },
      data: { amountPaise: 0, status: reservation.amountPaise > 0 ? "RELEASED" : "SETTLED", resolvedAt: new Date() },
    });
  };

  return withTransaction(db, run);
}

/**
 * Legacy-shaped credit kept for `payment.service.ts`'s current call site
 * (`credit(walletId, amountPaise, reason, referenceId)` returning the updated `Wallet`). All new
 * callers should use `creditToBucket` directly, which is bucket-aware and idempotent.
 */
export async function credit(walletId: string, amountPaise: number, reason: WalletTransactionReason, referenceId?: string): Promise<Wallet> {
  const bucket: WalletBalanceBucket = reason === "SIGNUP_BONUS" ? "PROMOTIONAL" : "PURCHASED";
  const { wallet } = await creditToBucket(walletId, amountPaise, bucket, reason, { referenceId });
  return wallet;
}
