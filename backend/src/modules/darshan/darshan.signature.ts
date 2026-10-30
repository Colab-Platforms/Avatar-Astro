import crypto from "crypto";

/**
 * WebSub (PubSubHubbub) authenticated distribution. When DARSHAN_WEBSUB_SECRET is set we subscribe
 * with `hub.secret` and the hub signs every notification body: `X-Hub-Signature: sha1=<hmac>`.
 * Without the secret the webhook stays open (the previous behaviour); notifications are never trusted
 * on their own either way, since live status is confirmed with a YouTube API call.
 */
export function websubSecret(): string | undefined {
  const s = process.env.DARSHAN_WEBSUB_SECRET?.trim();
  return s ? s : undefined;
}

export function verifyWebSubSignature(secret: string, body: string, header: string | undefined): boolean {
  if (!header) return false;
  const m = /^(sha1|sha256|sha384|sha512)=([0-9a-f]+)$/i.exec(header.trim());
  if (!m) return false;
  const expected = crypto.createHmac(m[1].toLowerCase(), secret).update(body, "utf8").digest("hex");
  const given = m[2].toLowerCase();
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
