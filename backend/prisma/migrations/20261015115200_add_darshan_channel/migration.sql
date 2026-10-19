-- CreateTable
CREATE TABLE "darshan_channels" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "youtube_channel_id" TEXT NOT NULL DEFAULT '',
    "current_live_video_id" TEXT,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "darshan_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "darshan_channels_slug_key" ON "darshan_channels"("slug");

-- CreateIndex
CREATE INDEX "darshan_channels_youtube_channel_id_idx" ON "darshan_channels"("youtube_channel_id");

-- CreateIndex
CREATE INDEX "darshan_channels_is_live_idx" ON "darshan_channels"("is_live");
