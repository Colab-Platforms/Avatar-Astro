import DarshanService from "./darshan.service.js";
import { getVideoLiveStatus } from "./darshan.youtube.js";
import { startWebSubRenewalLoop, stopWebSubRenewalLoop } from "./darshan.websub.js";

const darshanService = new DarshanService();

let liveCheckTimer: NodeJS.Timeout | null = null;

/**
 * Safety net for detecting when a broadcast ends: WebSub pushes us the
 * "went live" event for free, but YouTube doesn't reliably push a distinct
 * "went offline" event, so we still poll — just the single known-live
 * videoId per channel (1 quota unit each) instead of a channel-wide
 * search.list scan (100 units). For N currently-live temples this costs
 * N units per run instead of 100*N.
 */
async function refreshStaleLiveChannels(): Promise<void> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return;

  const liveChannels = await darshanService.listCurrentlyLiveChannels();

  for (const channel of liveChannels) {
    try {
      const status = await getVideoLiveStatus(channel.currentLiveVideoId!, apiKey);
      const stillLive = status.isLive && status.embeddable;

      if (!stillLive) {
        await darshanService.markOffline(channel.id);
        console.log(`[darshan] "${channel.slug}" stream ended`);
      } else {
        await darshanService.touchLastChecked(channel.id);
      }
    } catch (err: any) {
      console.error(`[darshan] Stale-live check failed for "${channel.slug}":`, err.message);
    }
  }
}

/**
 * Starts the WebSub subscriptions (push-based "went live" detection) plus a
 * lightweight polling safety net (only for channels already marked live, to
 * catch "went offline"). Replaces the old search.list-based 15-minute full
 * scan, which cost ~100 quota units per temple per check.
 */
export function startDarshanRefreshLoop(): void {
  startWebSubRenewalLoop();

  const seconds = Number(process.env.DARSHAN_LIVE_CHECK_INTERVAL_SECONDS) || 120;
  const intervalMs = seconds * 1000;

  if (liveCheckTimer) clearInterval(liveCheckTimer);
  liveCheckTimer = setInterval(() => {
    refreshStaleLiveChannels().catch((err) =>
      console.error("[darshan] Live-check loop failed:", err.message),
    );
  }, intervalMs);

  console.log(`✓ Darshan WebSub subscriptions active; stale-live safety check every ${seconds}s`);
}

export function stopDarshanRefreshLoop(): void {
  stopWebSubRenewalLoop();
  if (liveCheckTimer) {
    clearInterval(liveCheckTimer);
    liveCheckTimer = null;
  }
}
