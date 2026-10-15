import axios from "axios";
import type { VideoLiveStatus } from "./darshan.types.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Cheap (1 quota unit) check of a single known video's live/embeddable
 * status via videos.list?part=snippet,status. Used by the WebSub webhook
 * (to confirm a push notification is really a live broadcast before trusting
 * it) and by the stale-live safety-net poll (to detect when a broadcast that
 * was live has ended) — never by a channel-wide scan, which is what made the
 * old search.list-based polling cost 100 quota units per check.
 */
export async function getVideoLiveStatus(
  videoId: string,
  apiKey: string,
): Promise<VideoLiveStatus> {
  const { data } = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
    params: {
      key: apiKey,
      id: videoId,
      part: "snippet,status",
    },
  });

  const item = data?.items?.[0];
  if (!item) return { isLive: false, embeddable: false, channelId: null };

  return {
    isLive: item.snippet?.liveBroadcastContent === "live",
    embeddable: item.status?.embeddable !== false,
    channelId: item.snippet?.channelId ?? null,
  };
}
