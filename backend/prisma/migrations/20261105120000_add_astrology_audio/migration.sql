-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED', 'OUTDATED');

-- CreateTable
CREATE TABLE "astrology_narrations" (
    "id" TEXT NOT NULL,
    "tool_slug" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "translation_status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "astrology_narrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "astrology_voice_configs" (
    "id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "language_name" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "voice_name" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "astrology_voice_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "astrology_audio_assets" (
    "id" TEXT NOT NULL,
    "narration_id" TEXT NOT NULL,
    "tool_slug" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content_version" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "model_id" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL,
    "cloudinary_url" TEXT,
    "cloudinary_public_id" TEXT,
    "duration_seconds" DOUBLE PRECISION,
    "bytes" INTEGER,
    "status" "AudioStatus" NOT NULL DEFAULT 'PENDING',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "astrology_audio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "astrology_narrations_tool_slug_language_key" ON "astrology_narrations"("tool_slug", "language");

-- CreateIndex
CREATE UNIQUE INDEX "astrology_voice_configs_language_code_voice_id_key" ON "astrology_voice_configs"("language_code", "voice_id");

-- CreateIndex
CREATE INDEX "astrology_voice_configs_language_code_is_active_idx" ON "astrology_voice_configs"("language_code", "is_active");

-- CreateIndex
CREATE INDEX "astrology_audio_assets_tool_slug_language_is_published_idx" ON "astrology_audio_assets"("tool_slug", "language", "is_published");

-- CreateIndex
CREATE INDEX "astrology_audio_assets_narration_id_status_idx" ON "astrology_audio_assets"("narration_id", "status");

-- CreateIndex
CREATE INDEX "astrology_audio_assets_tool_slug_language_created_at_idx" ON "astrology_audio_assets"("tool_slug", "language", "created_at");

-- AddForeignKey
ALTER TABLE "astrology_audio_assets" ADD CONSTRAINT "astrology_audio_assets_narration_id_fkey" FOREIGN KEY ("narration_id") REFERENCES "astrology_narrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
