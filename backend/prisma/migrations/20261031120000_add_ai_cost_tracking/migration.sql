-- Additive only: nullable AI usage/cost columns on usage_events. No data is rewritten; existing rows stay NULL
-- (old activity is never back-filled with invented costs).
ALTER TABLE "usage_events"
  ADD COLUMN "ai_provider" TEXT,
  ADD COLUMN "ai_model" TEXT,
  ADD COLUMN "ai_calls" INTEGER,
  ADD COLUMN "input_tokens" INTEGER,
  ADD COLUMN "output_tokens" INTEGER,
  ADD COLUMN "total_tokens" INTEGER,
  ADD COLUMN "cost_usd" DECIMAL(14,8),
  ADD COLUMN "cost_basis" TEXT,
  ADD COLUMN "served_from_cache" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "usage_events_ai_provider_created_at_idx" ON "usage_events"("ai_provider", "created_at");
