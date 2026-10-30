-- Additive: extends the existing usage_events table so it can also record auth and feature-open events.
-- Existing rows keep working: they become event_type = 'feature.request' (the column default).
ALTER TABLE "usage_events" ADD COLUMN "event_type" TEXT NOT NULL DEFAULT 'feature.request',
ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "usage_events_event_type_created_at_idx" ON "usage_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_status_created_at_idx" ON "usage_events"("status", "created_at");
