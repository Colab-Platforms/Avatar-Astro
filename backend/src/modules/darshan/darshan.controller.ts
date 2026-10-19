import { Request, Response } from "express";
import DarshanService from "./darshan.service.js";
import { getVideoLiveStatus } from "./darshan.youtube.js";
import { darshanEvents, DARSHAN_STATUS_EVENT, broadcastDarshanStatus } from "./darshan.events.js";
import type { DarshanChannelDTO } from "./darshan.types.js";

const darshanService = new DarshanService();

// Response envelope kept as { success, data/error } (not the module
// convention's sendResponse/{status,...} shape) because the frontend's
// ApiService already depends on this exact shape for the darshan endpoints
// (frontend/src/lib/api.ts — DarshanTempleStatus / getDarshanTemples).

// ── Public reads ────────────────────────────────────────────────────────────

export const listTemples = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await darshanService.listTemples();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Error listing darshan temples:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch temples" });
  }
};

export const getTempleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await darshanService.getTempleBySlug(req.params.slug);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching darshan temple:", error);
    res
      .status(error.statusCode ?? 500)
      .json({ success: false, error: error.message || "Failed to fetch temple" });
  }
};

// ── Live status stream (Server-Sent Events) ─────────────────────────────────

/**
 * GET /api/darshan/events
 * Pushes every live-status change to connected browsers the instant it
 * happens (WebSub notification or the stale-live safety poll flipping a
 * channel offline) — the frontend patches its TanStack Query cache directly
 * from these events instead of polling this endpoint or /temples.
 */
export const streamEvents = (req: Request, res: Response): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const send = (channel: DarshanChannelDTO) => {
    res.write(`data: ${JSON.stringify(channel)}\n\n`);
  };
  darshanEvents.on(DARSHAN_STATUS_EVENT, send);

  // Keeps the connection open through idle-timeout proxies (e.g. Render).
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    darshanEvents.off(DARSHAN_STATUS_EVENT, send);
  });
};

// ── YouTube WebSub (PubSubHubbub) webhook ───────────────────────────────────

/**
 * GET /api/darshan/websub/callback
 * WebSub's verification handshake: whenever we (re-)subscribe to a channel,
 * the hub calls back here to confirm we actually control this URL before
 * activating the subscription. Echoing hub.challenge back is the entire
 * protocol — see https://pubsubhubbub.appspot.com docs.
 */
export const verifyWebSubCallback = (req: Request, res: Response): void => {
  const challenge = req.query["hub.challenge"];
  if (typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.status(400).send("Missing hub.challenge");
};

const VIDEO_ID_RE = /<yt:videoId>([^<]+)<\/yt:videoId>/g;

/**
 * POST /api/darshan/websub/callback
 * Google POSTs an Atom feed entry here the instant a subscribed channel
 * publishes or updates a video — including a stream going live. The
 * notification body itself isn't trusted for the live/embeddable verdict;
 * we confirm it with one cheap (1 quota unit) videos.list call before
 * writing anything.
 */
export const handleWebSubNotification = async (req: Request, res: Response): Promise<void> => {
  // Ack immediately — the hub expects a fast 2xx and will retry with backoff
  // if we're slow or non-2xx; it doesn't wait for us to finish processing.
  res.status(204).end();

  try {
    const body = typeof req.body === "string" ? req.body : "";
    const videoIds = [...body.matchAll(VIDEO_ID_RE)].map((m) => m[1]);
    if (videoIds.length === 0) return;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn("[darshan] WebSub notification received but YOUTUBE_API_KEY not set — skipping");
      return;
    }

    for (const videoId of videoIds) {
      const status = await getVideoLiveStatus(videoId, apiKey);
      if (!status.channelId) continue;

      const channel = await darshanService.findByYoutubeChannelId(status.channelId);
      if (!channel) continue; // notification for a channel we don't track

      const isLive = status.isLive && status.embeddable;
      const updated = isLive
        ? await darshanService.markLive(channel.id, videoId)
        : await darshanService.markOffline(channel.id);
      broadcastDarshanStatus(updated);
      console.log(`[darshan] WebSub update: ${channel.slug} isLive=${isLive}`);
    }
  } catch (err: any) {
    console.error("[darshan] WebSub notification handling failed:", err.message);
  }
};
