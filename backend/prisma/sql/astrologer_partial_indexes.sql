-- Astrologer domain: two partial (conditional) unique indexes that Prisma's schema
-- language cannot express. Run this file manually, once, right after you've applied
-- the astrologer.prisma models (see README note below for exactly how).
--
-- WHY THIS IS A SEPARATE FILE, NOT A PRISMA MIGRATION:
-- This repository's `backend/prisma/migrations/` folder has no prior migration history
-- (only migration_lock.toml exists) — the existing schema was evidently applied with
-- `prisma db push`, not `prisma migrate`. Generating a brand-new "first" migration now
-- would make Prisma believe migration history == "just the astrologer tables", while the
-- real database already has every other table from schema.prisma. The next time anyone
-- runs `prisma migrate dev` for an unrelated change, Prisma would try to re-create every
-- pre-existing table from scratch and fail. So: keep using `prisma db push` for this
-- addition too (safe — it diffs the live schema, not a migration history), and apply the
-- two indexes below by hand afterward, since `db push` also can't express partial
-- uniqueness declaratively.
--
-- HOW TO APPLY (on a dev/staging Neon branch — never production):
--   1. cd backend
--   2. npx prisma validate
--   3. npx prisma db push                 # creates every new astrologer_* table/enum
--   4. npx prisma generate                 # regenerates the Prisma Client
--   5. Run this file's SQL against the same database, e.g.:
--        psql "$DATABASE_URL" -f prisma/sql/astrologer_partial_indexes.sql
--      or paste its contents into the Neon SQL editor for that branch.
--   6. npm run db:seed:astrologer           # seeds the ASTROLOGER role + starter config
--
-- Re-running this file is safe: both statements use IF NOT EXISTS.

-- Rule: a user may have at most one AstrologerApplication row outside the two
-- "reappliable" terminal statuses (REJECTED, WITHDRAWN). This is the exact same
-- predicate the service layer checks before creating a new attempt (see
-- astrologer.service.ts, ASTROLOGER_TRANSITIONS / assertCanStartNewAttempt) — the DB
-- constraint and the application rule are provably the same rule, not two copies that
-- can drift apart.
CREATE UNIQUE INDEX IF NOT EXISTS astrologer_applications_one_active_per_user
  ON astrologer_applications (user_id)
  WHERE status NOT IN ('REJECTED', 'WITHDRAWN');

-- Rule: at most one "current" document per (application, requirement) slot, so two
-- concurrent document-replacement requests can't both end up marked current. The loser
-- gets a Postgres unique-violation (23505), which the service turns into a 409.
CREATE UNIQUE INDEX IF NOT EXISTS astrologer_documents_one_current_per_requirement
  ON astrologer_documents (application_id, requirement_id)
  WHERE is_current = true;
