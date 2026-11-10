-- Checkpoint 4 of the coin-wallet billing plan: the global lifetime free-chat allowance
-- (ChatFreeAllowance, 60 seconds once per user across all astrologers, replacing the old
-- per-astrologer 7-minute mechanism for all NEW sessions), the COMPLIMENTARY session type, and
-- the superadmin-only AstrologerProfile.isComplimentary flag + per-astrologer cap override.
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database without explicit approval.
--
-- Safe to add the new ChatSessionType enum label in this same migration (unlike Checkpoint 3's
-- ChatSessionStatus/ChatEndReason labels) because nothing in this file uses 'COMPLIMENTARY' as a
-- literal value anywhere — no column default references it, no data is written with it. The
-- restriction is specifically about USING a new label within its own adding transaction, not
-- about adding it.
--
-- "Historical free-trial migration: Option A" (every user gets the new 60-second allowance from
-- zero) needs NO backfill UPDATE here, unlike Checkpoint 1's wallet-bucket backfill: unlike
-- Wallet, ChatFreeAllowance is a brand-new table with ZERO pre-existing rows — every user's
-- allowance is created lazily (upsert, same idiom as Wallet) the first time they ever claim
-- free seconds, always starting at consumedSeconds=0. There is nothing to classify or migrate;
-- the "start from zero" policy is the natural behavior of a table that didn't exist before.
-- ChatFreeTrialUsage itself is untouched — kept, read-only, as historical record.

-- ============================================================================
-- 1. New enum label — safe here, see header.
-- ============================================================================
ALTER TYPE "ChatSessionType" ADD VALUE 'COMPLIMENTARY';

-- ============================================================================
-- 2. ChatSession: track how many of this session's elapsed seconds were drawn from the
-- GLOBAL allowance (not a per-session quota).
-- ============================================================================
ALTER TABLE "chat_sessions" ADD COLUMN "free_seconds_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_free_seconds_nonneg" CHECK ("free_seconds_used" >= 0);

-- ============================================================================
-- 3. AstrologerProfile: complimentary flag + per-astrologer cap override.
-- ============================================================================
ALTER TABLE "astrologer_profiles" ADD COLUMN "is_complimentary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "astrologer_profiles" ADD COLUMN "complimentary_max_seconds" INTEGER;
ALTER TABLE "astrologer_profiles" ADD CONSTRAINT "astrologer_profiles_complimentary_max_seconds_positive" CHECK ("complimentary_max_seconds" IS NULL OR "complimentary_max_seconds" > 0);

-- ============================================================================
-- 4. New table: chat_free_allowances
-- ============================================================================
CREATE TABLE "chat_free_allowances" (
    "user_id" TEXT NOT NULL,
    "total_seconds" INTEGER NOT NULL DEFAULT 60,
    "consumed_seconds" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_free_allowances_pkey" PRIMARY KEY ("user_id")
);
ALTER TABLE "chat_free_allowances"
  ADD CONSTRAINT "chat_free_allowances_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_total_nonneg" CHECK ("total_seconds" >= 0);
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_consumed_nonneg" CHECK ("consumed_seconds" >= 0);
ALTER TABLE "chat_free_allowances" ADD CONSTRAINT "chat_free_allowances_consumed_within_total" CHECK ("consumed_seconds" <= "total_seconds");

-- ============================================================================
-- VERIFICATION — run manually right after applying.
-- ============================================================================
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = '"ChatSessionType"'::regtype ORDER BY enumsortorder;
--   expect: PAID, FREE_TRIAL, COMPLIMENTARY
-- SELECT count(*) FROM chat_free_allowances; -- expect 0 (brand new, lazily created on first use)
-- SELECT count(*) FROM astrologer_profiles WHERE is_complimentary = true; -- expect 0 — nobody is
--   complimentary until a superadmin explicitly flips this.
-- SELECT conname FROM pg_constraint WHERE conrelid = 'chat_free_allowances'::regclass;
