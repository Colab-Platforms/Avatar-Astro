-- Additive only: the signed-in user's personal library (saved AI readings, conversations, personal activity timeline).
-- New tables, indexes and foreign keys; no existing table or column is changed or rewritten.
CREATE TABLE "generated_readings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "input_meta" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "saved_at" TIMESTAMP(3),
    "client_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "generated_readings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preview" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "user_activity_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "feature" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activity_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "generated_readings_user_id_created_at_idx" ON "generated_readings"("user_id", "created_at");
CREATE INDEX "generated_readings_user_id_feature_created_at_idx" ON "generated_readings"("user_id", "feature", "created_at");
CREATE INDEX "generated_readings_user_id_is_saved_created_at_idx" ON "generated_readings"("user_id", "is_saved", "created_at");
CREATE UNIQUE INDEX "generated_readings_user_id_client_request_id_key" ON "generated_readings"("user_id", "client_request_id");
CREATE INDEX "conversations_user_id_last_message_at_idx" ON "conversations"("user_id", "last_message_at");
CREATE INDEX "conversations_user_id_feature_last_message_at_idx" ON "conversations"("user_id", "feature", "last_message_at");
CREATE INDEX "conversation_messages_conversation_id_created_at_idx" ON "conversation_messages"("conversation_id", "created_at");
CREATE INDEX "user_activity_events_user_id_created_at_idx" ON "user_activity_events"("user_id", "created_at");
CREATE INDEX "user_activity_events_user_id_feature_created_at_idx" ON "user_activity_events"("user_id", "feature", "created_at");
CREATE INDEX "user_activity_events_user_id_kind_created_at_idx" ON "user_activity_events"("user_id", "kind", "created_at");
ALTER TABLE "generated_readings" ADD CONSTRAINT "generated_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_activity_events" ADD CONSTRAINT "user_activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
