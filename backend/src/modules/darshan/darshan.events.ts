import { EventEmitter } from "node:events";
import type { DarshanChannelDTO } from "./darshan.types.js";

export const DARSHAN_STATUS_EVENT = "status-change";

export const darshanEvents = new EventEmitter();
// Unbounded on purpose — one listener per connected SSE client, not a leak.
darshanEvents.setMaxListeners(0);

export function broadcastDarshanStatus(channel: DarshanChannelDTO): void {
  darshanEvents.emit(DARSHAN_STATUS_EVENT, channel);
}
