// Shared by Express's CORS config (index.ts) and Socket.IO's CORS config
// (realtime/socketServer.ts) — one allow-list, not two, so a browser that's allowed to
// call the REST API is also allowed to open a WebSocket.

// Origins allowed in EVERY environment: the deployed frontend, plus CORS_ORIGIN from env.
const PRODUCTION_ALLOWED_ORIGINS = [
  "https://avatar-astro.vercel.app",
  "https://www.mybhagya.in",
  "https://mybhagya.in",
];

// Development conveniences — local Vite/Expo ports and LAN IPs (192.168.x.x / 10.x.x.x /
// 172.16-31.x.x) so phones on the same WiFi can hit a locally-running backend. These are
// ONLY honoured outside production: a deployed API must not accept credentialed requests
// from any attacker-chosen localhost/LAN origin.
const DEV_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",
  "http://192.168.1.126:8081",
];
const LOCAL_DEV_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

// Optional extra production origin, set via env.
const PRODUCTION_ORIGIN = process.env.CORS_ORIGIN;

const isProduction = () => process.env.NODE_ENV === "production";

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser clients (curl, server-to-server) send no Origin; CORS is a browser control
  if (PRODUCTION_ALLOWED_ORIGINS.includes(origin)) return true;
  if (PRODUCTION_ORIGIN && origin === PRODUCTION_ORIGIN) return true;
  if (!isProduction()) {
    if (DEV_ALLOWED_ORIGINS.includes(origin)) return true;
    if (LOCAL_DEV_ORIGIN_REGEX.test(origin)) return true;
  }
  return false;
}
