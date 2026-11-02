-- CreateTable
CREATE TABLE "daily_horoscopes" (
    "id" TEXT NOT NULL,
    "sign" TEXT NOT NULL,
    "horoscope_date" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_horoscopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_horoscopes_sign_horoscope_date_key" ON "daily_horoscopes"("sign", "horoscope_date");
