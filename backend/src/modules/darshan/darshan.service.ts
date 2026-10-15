import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import type { DarshanChannelDTO } from "./darshan.types.js";

const toDTO = (channel: {
  name: string;
  slug: string;
  youtubeChannelId: string;
  currentLiveVideoId: string | null;
  isLive: boolean;
  lastCheckedAt: Date | null;
}): DarshanChannelDTO => ({
  name: channel.name,
  slug: channel.slug,
  youtubeChannelId: channel.youtubeChannelId,
  currentLiveVideoId: channel.currentLiveVideoId,
  isLive: channel.isLive,
  lastCheckedAt: channel.lastCheckedAt,
});

class DarshanService {
  // ── Public reads ─────────────────────────────────────────────────────────

  async listTemples(): Promise<DarshanChannelDTO[]> {
    const channels = await prisma.darshanChannel.findMany({
      orderBy: { name: "asc" },
    });
    return channels.map(toDTO);
  }

  async getTempleBySlug(slug: string): Promise<DarshanChannelDTO> {
    const channel = await prisma.darshanChannel.findUnique({ where: { slug } });
    if (!channel) throw new ApiError("Temple not found", STATUS_CODES.NOT_FOUND);
    return toDTO(channel);
  }

  // ── Used by the WebSub subscriber / webhook / safety-net poll ──────────────

  async listTrackedChannels() {
    return prisma.darshanChannel.findMany({
      where: { youtubeChannelId: { not: "" } },
      select: { id: true, slug: true, youtubeChannelId: true },
    });
  }

  async listCurrentlyLiveChannels() {
    return prisma.darshanChannel.findMany({
      where: { isLive: true, currentLiveVideoId: { not: null } },
    });
  }

  async findByYoutubeChannelId(youtubeChannelId: string) {
    return prisma.darshanChannel.findFirst({ where: { youtubeChannelId } });
  }

  async markLive(id: string, videoId: string): Promise<void> {
    await prisma.darshanChannel.update({
      where: { id },
      data: { isLive: true, currentLiveVideoId: videoId, lastCheckedAt: new Date() },
    });
  }

  async markOffline(id: string): Promise<void> {
    await prisma.darshanChannel.update({
      where: { id },
      data: { isLive: false, currentLiveVideoId: null, lastCheckedAt: new Date() },
    });
  }

  async touchLastChecked(id: string): Promise<void> {
    await prisma.darshanChannel.update({
      where: { id },
      data: { lastCheckedAt: new Date() },
    });
  }

  // ── Seeding ──────────────────────────────────────────────────────────────

  async upsertChannel(slug: string, name: string, youtubeChannelId: string) {
    return prisma.darshanChannel.upsert({
      where: { slug },
      update: { name, youtubeChannelId },
      create: { slug, name, youtubeChannelId },
    });
  }
}

export default DarshanService;
