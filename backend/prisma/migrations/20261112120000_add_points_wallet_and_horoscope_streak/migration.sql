-- CreateTable
CREATE TABLE "horoscope_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "local_date" DATE NOT NULL,
    "sign" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horoscope_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horoscope_streaks" (
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "last_date" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horoscope_streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "points_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ref_key" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "horoscope_completions_user_id_local_date_key" ON "horoscope_completions"("user_id", "local_date");

-- CreateIndex
CREATE INDEX "points_ledger_user_id_created_at_idx" ON "points_ledger"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "points_ledger_user_id_source_ref_key_key" ON "points_ledger"("user_id", "source", "ref_key");

-- AddForeignKey
ALTER TABLE "horoscope_completions" ADD CONSTRAINT "horoscope_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horoscope_streaks" ADD CONSTRAINT "horoscope_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
