-- Checkpoint 3 of the coin-wallet billing plan, part 2 of 2. Runs AFTER
-- 20261111100000_add_chat_state_machine has committed, so it's safe to use the new
-- 'REQUESTED'/'PAUSED' enum labels freely here (as a column DEFAULT and in index predicates).
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database without explicit approval.
--
-- Contains: the new ChatSession columns for the acceptance handshake and the presence-based
-- pause/resume mechanism, a backfill for existing rows, the changed default, and the two
-- partial unique indexes enforcing "at most one REQUESTED/ACTIVE/PAUSED session per user" and
-- "...per astrologer" — mirroring the exact established pattern already in this repo at
-- prisma/sql/astrologer_partial_indexes.sql (astrologer_applications_one_active_per_user).
-- Purely additive to an existing table: new nullable columns, a changed default for NEW rows
-- only (existing rows keep whatever status they already have), two new indexes.

-- ============================================================================
-- 1. New ChatSession columns
-- ============================================================================
ALTER TABLE "chat_sessions" ADD COLUMN "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "chat_sessions" ADD COLUMN "request_expires_at" TIMESTAMP(3);
ALTER TABLE "chat_sessions" ADD COLUMN "accepted_at" TIMESTAMP(3);
ALTER TABLE "chat_sessions" ADD COLUMN "paused_at" TIMESTAMP(3);
ALTER TABLE "chat_sessions" ADD COLUMN "presence_grace_ends_at" TIMESTAMP(3);

-- Every pre-existing row skipped the REQUESTED phase entirely (it didn't exist yet) — its
-- request and its start were the same moment, so backfill requested_at from started_at rather
-- than leaving every historical row stamped with this migration's own apply time.
UPDATE "chat_sessions" SET "requested_at" = "started_at";

-- ============================================================================
-- 2. Change the column default for NEW rows going forward (existing rows are untouched —
-- ALTER COLUMN ... SET DEFAULT never rewrites existing data, only future inserts that omit
-- the column). Safe here because migration 1 (above) already committed the new enum label.
-- ============================================================================
ALTER TABLE "chat_sessions" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

-- ============================================================================
-- 3. Database-enforced session uniqueness
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "chat_sessions_one_active_per_user"
  ON "chat_sessions" ("user_id")
  WHERE "status" IN ('REQUESTED', 'ACTIVE', 'PAUSED');

CREATE UNIQUE INDEX IF NOT EXISTS "chat_sessions_one_active_per_astrologer"
  ON "chat_sessions" ("astrologer_profile_id")
  WHERE "status" IN ('REQUESTED', 'ACTIVE', 'PAUSED');

-- ============================================================================
-- VERIFICATION — run manually right after applying.
-- ============================================================================
-- SELECT count(*) FROM chat_sessions WHERE requested_at IS NULL; -- must be 0 (NOT NULL with default)
-- SELECT count(*) FROM chat_sessions WHERE status NOT IN ('ACTIVE','ENDED'); -- must be 0 — no
--   existing row's status should have silently changed; only the DEFAULT for future inserts changed.
-- SELECT indexname FROM pg_indexes WHERE tablename = 'chat_sessions' AND indexname LIKE '%one_active%';
--   expect both index names listed.
-- SELECT user_id, count(*) FROM chat_sessions WHERE status IN ('REQUESTED','ACTIVE','PAUSED')
--   GROUP BY user_id HAVING count(*) > 1; -- must return 0 rows.
