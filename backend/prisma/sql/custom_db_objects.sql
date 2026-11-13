-- Database objects that `prisma db push` cannot represent from the Prisma schema: CHECK constraints and
-- the chat partial unique indexes. (The two astrologer partial unique indexes live in
-- astrologer_partial_indexes.sql, which is applied together with this file.)
--
-- This project builds its schema with `prisma db push`. After a push into a NEW/EMPTY database (the
-- disposable test database — see scripts/test-db), run this file so the database enforces the same rules
-- as production:  node scripts/test-db/init.mjs   does both steps.
--
-- The definitions were read from the live catalog (read-only) and verified identical; scripts/test-db/verify.mjs
-- re-checks that on demand. Every statement is idempotent. NEVER run this against a database you did not
-- create for testing without reviewing it first — production already has all of these objects.

-- ---- wallet integrity -------------------------------------------------------------------------------
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_purchased_nonneg";
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_purchased_nonneg" CHECK ((purchased_balance_paise >= 0));
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_promotional_nonneg";
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_promotional_nonneg" CHECK ((promotional_balance_paise >= 0));
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_reserved_nonneg";
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_reserved_nonneg" CHECK ((reserved_balance_paise >= 0));
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_bucket_sum_check";
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_bucket_sum_check" CHECK ((balance_paise = (purchased_balance_paise + promotional_balance_paise)));
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_reserved_within_balance";
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_reserved_within_balance" CHECK ((reserved_balance_paise <= balance_paise));

ALTER TABLE "wallet_ledger_allocations" DROP CONSTRAINT IF EXISTS "wallet_ledger_allocations_amount_positive";
ALTER TABLE "wallet_ledger_allocations" ADD CONSTRAINT "wallet_ledger_allocations_amount_positive" CHECK ((amount_paise > 0));

ALTER TABLE "wallet_reservations" DROP CONSTRAINT IF EXISTS "wallet_reservations_amount_nonneg";
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_amount_nonneg" CHECK ((amount_paise >= 0));

-- ---- pricing / limits -------------------------------------------------------------------------------
ALTER TABLE "tool_prices" DROP CONSTRAINT IF EXISTS "tool_prices_price_nonneg";
ALTER TABLE "tool_prices" ADD CONSTRAINT "tool_prices_price_nonneg" CHECK ((coin_price_subunits >= 0));

ALTER TABLE "tool_limits" DROP CONSTRAINT IF EXISTS "tool_limits_per_user_limit_check";
ALTER TABLE "tool_limits" ADD CONSTRAINT "tool_limits_per_user_limit_check" CHECK (((per_user_limit IS NULL) OR ((per_user_limit >= 1) AND (per_user_limit <= 100000))));

-- ---- chat / free allowance --------------------------------------------------------------------------
ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_free_seconds_nonneg";
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_free_seconds_nonneg" CHECK ((free_seconds_used >= 0));

ALTER TABLE "astrologer_profiles" DROP CONSTRAINT IF EXISTS "astrologer_profiles_complimentary_max_seconds_positive";
ALTER TABLE "astrologer_profiles" ADD CONSTRAINT "astrologer_profiles_complimentary_max_seconds_positive" CHECK (((complimentary_max_seconds IS NULL) OR (complimentary_max_seconds > 0)));

ALTER TABLE "chat_free_allowances" DROP CONSTRAINT IF EXISTS "chat_free_allowances_total_nonneg";
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_total_nonneg" CHECK ((total_seconds >= 0));
ALTER TABLE "chat_free_allowances" DROP CONSTRAINT IF EXISTS "chat_free_allowances_consumed_nonneg";
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_consumed_nonneg" CHECK ((consumed_seconds >= 0));
ALTER TABLE "chat_free_allowances" DROP CONSTRAINT IF EXISTS "chat_free_allowances_consumed_within_total";
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_consumed_within_total" CHECK ((consumed_seconds <= total_seconds));

-- ---- chat session uniqueness (one live session per user / per astrologer) ---------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "chat_sessions_one_active_per_user"
  ON "chat_sessions" ("user_id")
  WHERE "status" IN ('REQUESTED', 'ACTIVE', 'PAUSED');

CREATE UNIQUE INDEX IF NOT EXISTS "chat_sessions_one_active_per_astrologer"
  ON "chat_sessions" ("astrologer_profile_id")
  WHERE "status" IN ('REQUESTED', 'ACTIVE', 'PAUSED');
