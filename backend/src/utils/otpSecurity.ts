import crypto from "node:crypto";
import { ApiError } from "./ApiError.js";
import STATUS_CODES from "./statusCodes.js";

/**
 * Email-OTP primitives.
 *
 * Stored value: "h2:" + HMAC-SHA256(OTP_HMAC_SECRET, "<type>\n<email>\n<otp>") as hex.
 * - The server-side secret means a database leak alone cannot be brute-forced (a 6-digit code has only 900k
 *   possibilities, so an unkeyed hash is recoverable in under a second).
 * - Binding the email and type means equal codes never produce equal stored values and a stored value cannot be
 *   replayed for another account or flow.
 * - There is deliberately NO fallback to an unkeyed hash: without a secret, issuing and verifying OTPs fails closed.
 */
export const OTP_HASH_PREFIX = "h2:";
export const MIN_OTP_SECRET_LENGTH = 32;

export const OTP_TTL_MINUTES = 10;
/** Wrong guesses allowed per issued OTP; the OTP is burned on the last one. */
export const MAX_OTP_ATTEMPTS = 5;
/** OTPs that may be issued per e-mail + flow per rolling hour (login and resend share this budget). */
export const MAX_OTPS_PER_HOUR = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

const UNAVAILABLE = "OTP verification is temporarily unavailable. Please try again later.";
let reportedMisconfig = false;

export function isOtpSecretConfigured(): boolean {
  return (process.env.OTP_HMAC_SECRET ?? "").trim().length >= MIN_OTP_SECRET_LENGTH;
}

/** Returns the HMAC key, or throws a generic 500 (never the reason in the response, never the value in a log). */
function getOtpSecret(): Buffer {
  const secret = (process.env.OTP_HMAC_SECRET ?? "").trim();
  if (secret.length < MIN_OTP_SECRET_LENGTH) {
    if (!reportedMisconfig) {
      reportedMisconfig = true;
      console.error(
        `[otp] OTP_HMAC_SECRET is missing or shorter than ${MIN_OTP_SECRET_LENGTH} characters — OTPs cannot be issued or verified until it is set.`,
      );
    }
    throw new ApiError(UNAVAILABLE, STATUS_CODES.SERVER_ERROR);
  }
  return Buffer.from(secret, "utf8");
}

/** Fails closed up-front, before any database work, if the secret is not configured. */
export function assertOtpSecretConfigured(): void {
  getOtpSecret();
}

/** Cryptographically secure 6-digit code (replaces Math.random, which is predictable). */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string, email: string, type: string): string {
  const mac = crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${type}\n${email.trim().toLowerCase()}\n${otp}`)
    .digest("hex");
  return OTP_HASH_PREFIX + mac;
}

/**
 * Constant-time comparison against a stored value. Legacy unkeyed SHA-256 rows (no "h2:" prefix) are never
 * accepted: they are brute-forceable, expire within minutes, and are scrubbed by the migration.
 */
export function verifyOtpHash(stored: string, otp: string, email: string, type: string): boolean {
  const expected = Buffer.from(hashOtp(otp, email, type), "utf8");
  if (!stored.startsWith(OTP_HASH_PREFIX)) return false;
  const actual = Buffer.from(stored, "utf8");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
