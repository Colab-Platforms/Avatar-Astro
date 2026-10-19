import axios from "axios";
import DarshanService from "./darshan.service.js";

const darshanService = new DarshanService();

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
// YouTube's hub caps leases around 5 days; we ask for 4 and renew with a day
// to spare so a subscription never silently lapses.
const LEASE_SECONDS = 60 * 60 * 24 * 4;

function topicUrl(channelId: string): string {
  return `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
}

function callbackUrl(): string {
  const base = process.env.BACKEND_PUBLIC_URL;
  if (!base) {
    throw new Error(
      "BACKEND_PUBLIC_URL is not set — required so YouTube's WebSub hub can reach this server's webhook",
    );
  }
  return `${base.replace(/\/$/, "")}/api/darshan/websub/callback`;
}

/** Subscribes (or renews — re-subscribing before expiry just extends the lease) one channel's video feed. */
export async function subscribeChannel(channelId: string): Promise<void> {
  if (!channelId) return;

  await axios.post(
    HUB_URL,
    new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.topic": topicUrl(channelId),
      "hub.callback": callbackUrl(),
      "hub.verify": "async",
      "hub.lease_seconds": String(LEASE_SECONDS),
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
}

/** Subscribes every tracked temple's channel. Safe to re-run anytime. */
export async function subscribeAllChannels(): Promise<void> {
  const channels = await darshanService.listTrackedChannels();

  for (const channel of channels) {
    try {
      await subscribeChannel(channel.youtubeChannelId);
      console.log(`[darshan] WebSub subscribed: ${channel.slug}`);
    } catch (err: any) {
      console.error(
        `[darshan] WebSub subscribe failed for "${channel.slug}":`,
        err?.response?.data || err.message,
      );
    }
  }
}

let renewalTimer: NodeJS.Timeout | null = null;

/** Subscribes on startup, then re-subscribes on a timer so leases never lapse. */
export function startWebSubRenewalLoop(): void {
  subscribeAllChannels().catch((err) =>
    console.error("[darshan] Initial WebSub subscribe failed:", err.message),
  );

  const renewalIntervalMs = (LEASE_SECONDS - 60 * 60 * 24) * 1000; // renew 1 day before lease expiry
  if (renewalTimer) clearInterval(renewalTimer);
  renewalTimer = setInterval(() => {
    subscribeAllChannels().catch((err) =>
      console.error("[darshan] WebSub renewal failed:", err.message),
    );
  }, renewalIntervalMs);
}

export function stopWebSubRenewalLoop(): void {
  if (renewalTimer) {
    clearInterval(renewalTimer);
    renewalTimer = null;
  }
}
