/** 7 minutes, once per (user, astrologer) — enforced at the DB level by ChatFreeTrialUsage's unique index. */
export const FREE_TRIAL_SECONDS = 7 * 60;

/** A paid session may only start if the wallet can cover at least this much time, so a
 * session never starts only to be immediately ended for insufficient balance. */
export const MIN_BILLABLE_SECONDS = 60;

/** The single low-balance/low-time warning fires once this many seconds remain. */
export const LOW_BALANCE_WARNING_SECONDS = 60;

/** How often the server-side billing loop advances each active session. */
export const BILLING_TICK_MS = 5_000;

/** Rolling reservation window for PAID chat sessions — re-topped every tick (see chat/billing.ts).
 * Decided value: 30 seconds, with graceful degradation to a smaller reservation when the wallet
 * can't cover the full window (see wallet.service.ts's createReservation/topUpReservation). */
export const CHAT_RESERVATION_LOOKAHEAD_SECONDS = 30;

export const MAX_MESSAGE_LENGTH = 2_000;

/** Decided value: the astrologer has exactly this long to accept a REQUESTED chat before it
 * auto-expires (ChatEndReason.TIMEOUT). Zero billing happens before a session reaches ACTIVE. */
export const REQUEST_ACCEPT_TIMEOUT_MS = 60_000;

/** Decided presence constants (chat.constants.ts, kept adjustable in one place without a schema
 * change). A participant is "present" if the server received a `chat:heartbeat` within
 * PRESENCE_TIMEOUT_MS. The heartbeat is tied to the chat window being mounted and
 * socket-connected — NOT to document/tab focus; an unfocused tab must not pause billing. */
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const PRESENCE_TIMEOUT_MS = 15_000;
/** How much time one heartbeat vouches for: the interval it opens. Billing runs only through
 * min(now, slower side's last confirmed heartbeat + this window), so a participant who vanishes is billed for at
 * most one confirmed interval after their last heartbeat, and the PRESENCE_TIMEOUT_MS detection wait is never
 * billed. Setting this to 0 would bill only up to the exact last heartbeat instant, but then billing would lag the
 * clock by up to a heartbeat period in every healthy chat — letting a user outrun their funds (unpaid seconds)
 * and under-billing every chat end. */
export const CONFIRMED_PRESENCE_WINDOW_MS = HEARTBEAT_INTERVAL_MS;
/** Window after either side's presence lapses during which billing is PAUSED, not ended —
 * reconnecting within this window resumes billing with lastBilledAt reset to the resume moment
 * (the paused interval is never billed). Expiring without reconnect auto-ends the session
 * (ChatEndReason.DISCONNECTED) using only the billable time accrued up to the pause. */
export const RECONNECT_GRACE_MS = 60_000;

/** How often the periodic sweep (billing.ts's sweepExpiredState) checks for REQUESTED sessions
 * past their requestExpiresAt and PAUSED sessions past their presenceGraceEndsAt. This is the
 * durable backstop — the actual deadlines are always read from the database columns, never from
 * an in-memory timer, so a backend restart can never lose track of an expiry. */
export const SWEEP_INTERVAL_MS = 10_000;

/** Decided value: 15 minutes. Used when a COMPLIMENTARY astrologer has no per-profile
 * `complimentaryMaxSeconds` override and no PlatformSetting row exists yet for the
 * "chat.complimentaryMaxSeconds" key — see chat.service.ts's resolveComplimentaryMaxSeconds. */
export const DEFAULT_COMPLIMENTARY_MAX_SECONDS = 15 * 60;
