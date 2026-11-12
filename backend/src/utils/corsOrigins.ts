// Shared by Express's CORS config (index.ts) and Socket.IO's CORS config
// (realtime/socketServer.ts) — one allow-list, not two, so a browser that's allowed to
// call the REST API is also allowed to open a WebSocket.
const EXPLICIT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",
  "http://192.168.1.126:8081",
  "https://avatar-astro.vercel.app",
];

// This project's actual Vite dev port (see frontend/vite.config.ts) — kept in addition to
// the explicit list above since that's what's really running. Also allows LAN IPs
// (192.168.x.x / 10.x.x.x / 172.16-31.x.x) so phones and other devices on the same WiFi
// can hit a locally-running backend during dev.
const LOCAL_DEV_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

// Optional production origin, set via env — unrelated to local dev, unchanged.
const PRODUCTION_ORIGIN = process.env.CORS_ORIGIN;

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (EXPLICIT_ALLOWED_ORIGINS.includes(origin)) return true;
  if (LOCAL_DEV_ORIGIN_REGEX.test(origin)) return true;
  if (PRODUCTION_ORIGIN && origin === PRODUCTION_ORIGIN) return true;
  return false;
}
