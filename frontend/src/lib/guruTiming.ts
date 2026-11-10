/**
 * Visual timing for Divya Margdarshak. Everything here is presentation only: the real work (finding an
 * available profile, asking the model) starts immediately and is never delayed by these numbers. They are
 * minimum times, so a slow search or a slow reply is never cut short, and they are in one place so they are
 * easy to change (tests set them to 0).
 */
export const guruTiming = {
  /** Minimum time the "searching for a Guru" screen stays up once an eligible Guru has been found. */
  searchMinMs: 5000,
  /** How often the status line under the lotus changes while searching. */
  statusEveryMs: 1700,
  /** Typing indicator: time for the shortest message, the growth per character, and the cap. */
  typingMinMs: 1000,
  typingPerCharMs: 18,
  typingMaxMs: 5000,
};

/** The wording shown while searching, in order. It only describes steps the screen is going through. */
export const SEARCH_STATUSES = [
  "Finding an available Guru...",
  "Checking the right guidance...",
  "Preparing your conversation...",
] as const;

/**
 * How long the typing indicator shows at least, from the length of the user's message:
 * about 1-2 s for a short message, 2-3 s for a medium one, 3-5 s for a long one.
 */
export function typingDelayMs(message: string, t: Pick<typeof guruTiming, "typingMinMs" | "typingPerCharMs" | "typingMaxMs"> = guruTiming): number {
  const ms = t.typingMinMs + message.trim().length * t.typingPerCharMs;
  return Math.round(Math.min(t.typingMaxMs, Math.max(t.typingMinMs, ms)));
}

/** Which status line to show after `elapsedMs` of searching (it stays on the last one if the search runs long). */
export function statusAt(elapsedMs: number, every = guruTiming.statusEveryMs): string {
  const i = Math.min(SEARCH_STATUSES.length - 1, Math.floor(Math.max(0, elapsedMs) / Math.max(1, every)));
  return SEARCH_STATUSES[i];
}

/** The same step as statusAt, as a 0-based index, so the screen can show it in the visitor's language. */
export function statusIndexAt(elapsedMs: number, every = guruTiming.statusEveryMs): number {
  return Math.min(SEARCH_STATUSES.length - 1, Math.floor(Math.max(0, elapsedMs) / Math.max(1, every)));
}
