export interface DarshanChannelDTO {
  name: string;
  slug: string;
  youtubeChannelId: string;
  currentLiveVideoId: string | null;
  isLive: boolean;
  lastCheckedAt: Date | null;
}

export interface VideoLiveStatus {
  isLive: boolean;
  embeddable: boolean;
  channelId: string | null;
}
