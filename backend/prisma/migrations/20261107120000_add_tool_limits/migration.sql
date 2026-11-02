-- CreateTable
CREATE TABLE "tool_limits" (
    "tool_key" TEXT NOT NULL,
    "per_user_limit" INTEGER,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_limits_pkey" PRIMARY KEY ("tool_key"),
    CONSTRAINT "tool_limits_per_user_limit_check" CHECK ("per_user_limit" IS NULL OR "per_user_limit" BETWEEN 1 AND 100000)
);

-- CreateTable
CREATE TABLE "tool_usage_attempts" (
    "id" TEXT NOT NULL,
    "tool_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_usage_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_usage_attempts_tool_key_user_id_created_at_idx" ON "tool_usage_attempts"("tool_key", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "tool_usage_attempts_created_at_idx" ON "tool_usage_attempts"("created_at");
