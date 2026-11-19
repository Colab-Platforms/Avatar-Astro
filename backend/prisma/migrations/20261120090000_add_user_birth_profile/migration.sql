-- Central user profile: birth details + preferred language on users.
--
-- WRITTEN BY HAND, NOT GENERATED, and NOT APPLIED to any database without explicit approval.
-- Purely additive: nine nullable columns and one boolean with a constant default. No data is
-- rewritten and no existing column or index changes. Until it is applied, the /me/profile/central
-- endpoints answer 503 ("pending migration") and every other route is unaffected.
-- Date of birth stays in the existing users.date_of_birth column.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "birth_time"               TEXT,
  ADD COLUMN IF NOT EXISTS "birth_time_unknown"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "birth_place_name"         TEXT,
  ADD COLUMN IF NOT EXISTS "birth_place_region"       TEXT,
  ADD COLUMN IF NOT EXISTS "birth_place_country"      TEXT,
  ADD COLUMN IF NOT EXISTS "birth_latitude"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "birth_longitude"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "birth_timezone"           TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_language"       TEXT,
  ADD COLUMN IF NOT EXISTS "birth_details_updated_at" TIMESTAMP(3);
