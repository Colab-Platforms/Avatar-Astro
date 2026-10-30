// Shared constants for the LOCAL test environment. Everything here is hard-wired to a local, throwaway
// database on this computer. Nothing reads DATABASE_URL from your shell or from backend/.env, so these
// scripts cannot reach production (Neon) even by accident.
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

export const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FRONTEND_DIR = path.resolve(BACKEND_DIR, "..", "frontend");

export const DB_PORT = 5544;
export const BACKEND_PORT = 5001;
export const FRONTEND_PORT = 8082;

/** Local-only database URL (embedded PGlite). Not a secret: it only exists on this machine. */
export const LOCAL_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`;

/** Data folder of the local test database. Outside the repository. Delete it to start from scratch. */
export const DB_DIR = process.env.MYBHAGYA_LOCAL_DB_DIR || path.join(os.homedir(), ".mybhagya-local-testdb");

/** Temporary TEST credentials. They exist only in the local throwaway database. */
export const TEST_PASSWORD = "LocalTest#2026";
export const TEST_ACCOUNTS = [
  { email: "local.admin@example.com", first: "Local", last: "Admin", roles: ["USER", "SUPERADMIN"], active: true, note: "main admin (SUPERADMIN)" },
  { email: "local.user@example.com", first: "Local", last: "User", roles: ["USER"], active: true, note: "normal user" },
  { email: "local.user2@example.com", first: "Second", last: "User", roles: ["USER"], active: true, note: "second normal user (to test that users cannot see each other)" },
  { email: "local.legacyadmin@example.com", first: "Legacy", last: "Admin", roles: ["USER", "ADMIN"], active: true, note: "old ADMIN role (must be refused)" },
  { email: "local.deactivated@example.com", first: "Gone", last: "User", roles: ["USER"], active: false, note: "deactivated user (must be refused)" },
];

export const LOCAL_BACKEND_ENV = {
  DATABASE_URL: LOCAL_DATABASE_URL,
  DB_POOL_MAX: "1",
  PORT: String(BACKEND_PORT),
  NODE_ENV: "development",
  JWT_SECRET: "local-test-only-jwt-secret-0123456789abcdef",
  // Every external service is switched OFF so local testing can never email, SMS, upload or call a provider.
  OPENROUTER_API_KEY: "", GROQ_API_KEY: "", SARVAM_API_KEY: "", RESEND_API_KEY: "", SMTP_FROM_EMAIL: "", SUPPORT_EMAIL: "",
  YOUTUBE_API_KEY: "", BACKEND_PUBLIC_URL: "", DARSHAN_WEBSUB_SECRET: "",
  CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "",
  GOOGLE_CLIENT_ID: "", MSG91_AUTH_KEY: "", MSG91_WIDGET_ID: "", MSG91_TOKEN_AUTH: "",
  MAIN_ADMIN_EMAIL: "",
};

/**
 * OPT-IN: let the local backend use providers you already configured in backend/.env.
 *   npm run local:backend -- --with=openrouter,groq
 * Only the variables listed below are copied (values are never printed), and never DATABASE_URL, so the database
 * stays the local throwaway one. Using a provider means REAL external calls (and real cost / real emails).
 * Deliberately not offered: YouTube / WebSub, Cloudinary (they would subscribe or upload from your local machine).
 */
export const PROVIDER_VARS = {
  openrouter: ["OPENROUTER_API_KEY", "OPENROUTER_MODEL"],
  groq: ["GROQ_API_KEY", "GROQ_MODEL"],
  sarvam: ["SARVAM_API_KEY"],
  google: ["GOOGLE_CLIENT_ID"],
  email: ["RESEND_API_KEY", "SMTP_FROM_EMAIL", "SUPPORT_EMAIL"],
  msg91: ["MSG91_AUTH_KEY", "MSG91_WIDGET_ID", "MSG91_TOKEN_AUTH"],
};

export function requestedProviders(argv = process.argv.slice(2)) {
  const arg = argv.find((a) => a.startsWith("--with="));
  if (!arg) return [];
  return arg.slice("--with=".length).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

/** Reads ONLY the allow-listed variables of the requested providers from backend/.env. */
export function loadProviderEnv(names) {
  const unknown = names.filter((n) => !PROVIDER_VARS[n]);
  if (unknown.length) throw new Error(`Unknown provider(s): ${unknown.join(", ")}. Allowed: ${Object.keys(PROVIDER_VARS).join(", ")}`);
  const file = path.join(BACKEND_DIR, ".env");
  const parsed = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  const env = {};
  const report = [];
  for (const n of names) {
    const found = PROVIDER_VARS[n].filter((k) => parsed[k]);
    for (const k of found) env[k] = parsed[k];
    report.push(`${n}: ${found.length ? "using " + found.join(", ") : "NOT FOUND in backend/.env (stays off)"}`);
  }
  return { env, report };
}
