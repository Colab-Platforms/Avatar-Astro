-- Coin-wallet buckets (purchased/promotional/reserved), split-bucket ledger allocations, and the
-- one-time signup bonus grant table. Checkpoint 1 of the coin-wallet billing plan
-- (see C:\Users\USER\.claude\plans\zesty-knitting-sprout.md, Sections 1-4).
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database yet (per explicit instruction:
-- "do not run database migrations without my approval"). It was checked by hand against a live
-- `information_schema`/`pg_enum` introspection of the current Neon dev database on 2026-11-10 —
-- `wallets` currently has exactly (id, user_id, balance_paise, created_at, updated_at) and
-- `wallet_transactions` currently has exactly (id, wallet_id, type, reason, amount_paise,
-- balance_after_paise, reference_id, created_at), with no idempotency_key/reversal_of_id columns —
-- confirming every ADD COLUMN below is genuinely additive, not a rename of something that already
-- exists under a different name.
--
-- Scope: ONLY the tables/columns Checkpoint 1 touches (Wallet buckets, WalletTransaction additions,
-- WalletLedgerAllocation, SignupBonusGrant). WalletReservation, ToolPrice, ToolExecution, and every
-- chat.prisma change (REQUESTED/PAUSED, partial unique indexes) are deliberately deferred to their
-- own later migrations (Checkpoints 2-3) to keep this one reviewable and low-risk.
--
-- HOW TO APPLY (when approved, on a dev/staging branch first — never production without a prior
-- successful dry run): `cd backend && npx prisma migrate deploy` (this repo uses real migration
-- history, confirmed via `_prisma_migrations` — NOT `prisma db push`). Immediately after, run the
-- reconciliation SELECTs at the bottom of this file and confirm both return zero rows before
-- considering the migration verified.

-- ============================================================================
-- 1. New enum
-- ============================================================================
CREATE TYPE "WalletBalanceBucket" AS ENUM ('PURCHASED', 'PROMOTIONAL');

-- ============================================================================
-- 2. Extend the existing WalletTransactionReason enum (additive labels only)
-- ============================================================================
ALTER TYPE "WalletTransactionReason" ADD VALUE 'SIGNUP_BONUS';
ALTER TYPE "WalletTransactionReason" ADD VALUE 'TOOL_EXECUTION';
ALTER TYPE "WalletTransactionReason" ADD VALUE 'RESERVATION_RELEASE';

-- ============================================================================
-- 3. Wallet: add bucket columns, defaulting to 0 (backfilled correctly in step 6)
-- ============================================================================
ALTER TABLE "wallets" ADD COLUMN "purchased_balance_paise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN "promotional_balance_paise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN "reserved_balance_paise" INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- 4. WalletTransaction: add idempotency key + reversal pointer
-- ============================================================================
ALTER TABLE "wallet_transactions" ADD COLUMN "idempotency_key" TEXT;
ALTER TABLE "wallet_transactions" ADD COLUMN "reversal_of_id" TEXT;
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet_transactions"("idempotency_key");
CREATE INDEX "wallet_transactions_reference_id_idx" ON "wallet_transactions"("reference_id");

-- ============================================================================
-- 5. New tables: WalletLedgerAllocation, SignupBonusGrant
-- ============================================================================
CREATE TABLE "wallet_ledger_allocations" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "bucket" "WalletBalanceBucket" NOT NULL,
    "amount_paise" INTEGER NOT NULL,

    CONSTRAINT "wallet_ledger_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wallet_ledger_allocations_transaction_id_idx" ON "wallet_ledger_allocations"("transaction_id");
ALTER TABLE "wallet_ledger_allocations"
  ADD CONSTRAINT "wallet_ledger_allocations_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_ledger_allocations" ADD CONSTRAINT "wallet_ledger_allocations_amount_positive" CHECK ("amount_paise" > 0);

CREATE TABLE "signup_bonus_grants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_bonus_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "signup_bonus_grants_user_id_key" ON "signup_bonus_grants"("user_id");
ALTER TABLE "signup_bonus_grants"
  ADD CONSTRAINT "signup_bonus_grants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 6. Data backfill — classify 100% of existing wallet money as PURCHASED.
--
-- Why this is correct, not an assumption: the only WalletTransactionReason values that have
-- EVER existed before step 2 above are RECHARGE and CHAT_CONSUMPTION (confirmed by a direct
-- GROUP BY query against the live dev database on 2026-11-10 — see the plan document's Context
-- section for the exact counts: 295 wallet_transactions, all RECHARGE or CHAT_CONSUMPTION, all
-- against PaymentOrder.provider = 'MOCK'). SIGNUP_BONUS did not exist until step 2 of this very
-- migration, so no historical row can possibly have earned promotional money. Every rupee of
-- every existing wallet's balance is therefore provably purchased-origin.
-- ============================================================================
UPDATE "wallets" SET "purchased_balance_paise" = "balance_paise", "promotional_balance_paise" = 0, "reserved_balance_paise" = 0;

INSERT INTO "wallet_ledger_allocations" ("id", "transaction_id", "bucket", "amount_paise")
SELECT 'wla_' || "id", "id", 'PURCHASED', "amount_paise"
FROM "wallet_transactions"
WHERE "amount_paise" > 0; -- defensive guard matching the new CHECK constraint; no historical row is expected to violate this

-- ============================================================================
-- 7. Invariant CHECK constraints — added LAST, after the backfill, so ADD CONSTRAINT's automatic
-- validation of all existing rows is the final proof the backfill was correct, not a guess.
-- ============================================================================
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_purchased_nonneg" CHECK ("purchased_balance_paise" >= 0);
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_promotional_nonneg" CHECK ("promotional_balance_paise" >= 0);
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_reserved_nonneg" CHECK ("reserved_balance_paise" >= 0);
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_bucket_sum_check" CHECK ("balance_paise" = "purchased_balance_paise" + "promotional_balance_paise");
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_reserved_within_balance" CHECK ("reserved_balance_paise" <= "balance_paise");

-- ============================================================================
-- VERIFICATION — run these manually right after applying, BEFORE marking the migration as
-- successfully reconciled. Both must return zero rows.
-- ============================================================================
-- SELECT id, balance_paise, purchased_balance_paise, promotional_balance_paise
--   FROM wallets WHERE purchased_balance_paise + promotional_balance_paise <> balance_paise;
--
-- SELECT wt.id, wt.amount_paise, COALESCE(SUM(a.amount_paise), 0) AS allocated
--   FROM wallet_transactions wt LEFT JOIN wallet_ledger_allocations a ON a.transaction_id = wt.id
--   GROUP BY wt.id, wt.amount_paise HAVING COALESCE(SUM(a.amount_paise), 0) <> wt.amount_paise;
