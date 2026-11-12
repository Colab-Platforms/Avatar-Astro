-- Checkpoint 3 of the coin-wallet billing plan, part 1 of 2: ONLY the new ChatSessionStatus/
-- ChatEndReason enum labels — nothing else. Every other change (new columns, the changed
-- default, the partial unique indexes) is deferred to the next migration,
-- 20261111100100_add_chat_session_uniqueness, because Postgres disallows using a brand-new enum
-- label (even as a column DEFAULT, not just in an index predicate) within the SAME transaction
-- that added it. A single migration.sql always runs as one transaction, so this file must do
-- nothing else — confirmed experimentally: a first draft that also ran
-- `ALTER TABLE ... ALTER COLUMN status SET DEFAULT 'REQUESTED'` in this same file failed with
-- "unsafe use of new value REQUESTED of enum type ChatSessionStatus" when applied.
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database without explicit approval.

ALTER TYPE "ChatSessionStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "ChatSessionStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ChatEndReason" ADD VALUE 'REJECTED';
ALTER TYPE "ChatEndReason" ADD VALUE 'DISCONNECTED';

-- ============================================================================
-- VERIFICATION — run manually right after applying.
-- ============================================================================
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ChatSessionStatus'::regtype ORDER BY enumsortorder;
--   expect: ACTIVE, ENDED, REQUESTED, PAUSED (order reflects append order, not alphabetical)
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ChatEndReason'::regtype ORDER BY enumsortorder;
--   expect: USER_ENDED, ASTROLOGER_ENDED, BALANCE_EXHAUSTED, FREE_LIMIT_REACHED, TIMEOUT, REJECTED, DISCONNECTED
