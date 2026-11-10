-- Checkpoint 2 of the coin-wallet billing plan: WalletReservation (the rolling-reservation
-- mechanism used by chat billing and, later, premium tool executions), and the ToolPrice/
-- ToolExecution tables for premium AI tool billing (schema only in this checkpoint — every
-- ToolPrice.is_active defaults to false; no route is wired to charge coins yet).
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database without explicit approval.
-- Purely additive: three new tables, zero changes to any existing table or column (unlike
-- Checkpoint 1, Wallet.reserved_balance_paise already exists — this migration only starts
-- actually using it).

-- ============================================================================
-- 1. New enums
-- ============================================================================
CREATE TYPE "WalletReservationPurpose" AS ENUM ('TOOL_EXECUTION', 'CHAT_LOOKAHEAD');
CREATE TYPE "WalletReservationStatus" AS ENUM ('HELD', 'SETTLED', 'RELEASED', 'RECONCILIATION_REQUIRED');
CREATE TYPE "ToolExecutionStatus" AS ENUM ('PRICE_QUOTED', 'COINS_RESERVED', 'EXECUTING', 'COMPLETED', 'SETTLED', 'FAILED', 'CANCELLED', 'RELEASED', 'RECONCILIATION_REQUIRED');

-- ============================================================================
-- 2. wallet_reservations
-- ============================================================================
CREATE TABLE "wallet_reservations" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "purpose" "WalletReservationPurpose" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "status" "WalletReservationStatus" NOT NULL DEFAULT 'HELD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "wallet_reservations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wallet_reservations_wallet_id_status_idx" ON "wallet_reservations"("wallet_id", "status");
CREATE INDEX "wallet_reservations_reference_id_idx" ON "wallet_reservations"("reference_id");
ALTER TABLE "wallet_reservations"
  ADD CONSTRAINT "wallet_reservations_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_amount_nonneg" CHECK ("amount_paise" >= 0);

-- ============================================================================
-- 3. tool_prices
-- ============================================================================
CREATE TABLE "tool_prices" (
    "tool_key" TEXT NOT NULL,
    "coin_price_subunits" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_prices_pkey" PRIMARY KEY ("tool_key")
);
ALTER TABLE "tool_prices" ADD CONSTRAINT "tool_prices_price_nonneg" CHECK ("coin_price_subunits" >= 0);

-- ============================================================================
-- 4. tool_executions
-- ============================================================================
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_key" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "quoted_price_subunits" INTEGER NOT NULL,
    "reservation_id" TEXT,
    "status" "ToolExecutionStatus" NOT NULL DEFAULT 'PRICE_QUOTED',
    "result_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tool_executions_execution_id_key" ON "tool_executions"("execution_id");
CREATE UNIQUE INDEX "tool_executions_reservation_id_key" ON "tool_executions"("reservation_id");
CREATE INDEX "tool_executions_user_id_status_idx" ON "tool_executions"("user_id", "status");

-- No FK from tool_executions to wallet_reservations/users/tool_prices deliberately: this
-- checkpoint only establishes the shape (matches the existing convention elsewhere in this
-- schema of using a loosely-typed referenceId/foreign id rather than a hard FK for
-- cross-domain references — see WalletTransaction.referenceId's own comment).

-- ============================================================================
-- VERIFICATION — run manually right after applying.
-- ============================================================================
-- SELECT count(*) FROM wallet_reservations; -- expect 0 (brand-new table)
-- SELECT count(*) FROM tool_prices WHERE is_active = true; -- MUST be 0 until prices are approved
-- SELECT conname FROM pg_constraint WHERE conrelid = 'wallet_reservations'::regclass; -- expect the FK + nonneg check
