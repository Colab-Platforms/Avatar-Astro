-- Weekly Sun-sign horoscopes (one stored reading per sign per Monday-Sunday week, Asia/Kolkata). Additive: a new table only.
CREATE TABLE IF NOT EXISTS "weekly_horoscopes" (
    "id" TEXT NOT NULL,
    "sign" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_horoscopes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_horoscopes_sign_week_start_key" ON "weekly_horoscopes"("sign", "week_start");
