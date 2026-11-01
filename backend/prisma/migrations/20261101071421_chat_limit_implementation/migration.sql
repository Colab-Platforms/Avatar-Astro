-- CreateTable
CREATE TABLE "daily_chat_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "daily_chat_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_chat_usages_user_id_idx" ON "daily_chat_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_chat_usages_user_id_usage_date_key" ON "daily_chat_usages"("user_id", "usage_date");

-- AddForeignKey
ALTER TABLE "daily_chat_usages" ADD CONSTRAINT "daily_chat_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
