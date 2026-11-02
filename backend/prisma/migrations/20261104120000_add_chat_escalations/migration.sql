-- CreateTable
CREATE TABLE "chat_escalations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "handled_by_id" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_escalations_status_created_at_idx" ON "chat_escalations"("status", "created_at");

-- CreateIndex
CREATE INDEX "chat_escalations_user_id_idx" ON "chat_escalations"("user_id");

-- AddForeignKey
ALTER TABLE "chat_escalations" ADD CONSTRAINT "chat_escalations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
