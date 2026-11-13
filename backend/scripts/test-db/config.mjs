// Shared constants and — more importantly — the SAFETY GUARD for the disposable test database.
//
// Everything that creates, resets or runs tests against the test database goes through
// assertSafeTestDatabase(). It refuses anything that is not the dedicated local container, and it
// refuses any URL that points at the same server as backend/.env (Neon / Render). It is deliberately
// strict: a wrong URL fails loudly instead of being "close enough".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const CONTAINER_NAME = "mybhagya-test-pg";
export const IMAGE = "postgres:17-alpine";
export const TEST_HOST = "127.0.0.1";
export const TEST_PORT = 54329;
export const TEST_USER = "mybhagya_test";
export const TEST_PASSWORD = "mybhagya_test_pw"; // throwaway credential; the container only listens on 127.0.0.1
export const TEST_DB_NAME = "mybhagya_test";

export const TEST_DATABASE_URL = `postgresql://${TEST_USER}:${TEST_PASSWORD}@${TEST_HOST}:${TEST_PORT}/${TEST_DB_NAME}`;

const FORBIDDEN_HOST_FRAGMENTS = ["neon.tech", "render.com", "onrender", "amazonaws", "supabase", "azure", "gcp", "googleapis", "railway", "planetscale", "digitalocean"];

/** "host:port/db" of every database configured in backend/.env* (read only to REFUSE them; passwords are never kept or printed). */
function configuredRealTargets() {
  const hosts = new Set();
  const add = (raw) => { try { const u = new URL(raw); hosts.add(`${u.hostname.toLowerCase()}:${u.port || 5432}/${decodeURIComponent(u.pathname.replace(/^\//, ""))}`); } catch { /* ignore unparsable */ } };
  for (const file of [".env", ".env.local", ".env.production"]) {
    const full = path.join(BACKEND_DIR, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:DATABASE_URL|DIRECT_URL)\s*=\s*"?([^"\s]+)"?/);
      if (!m) continue;
      add(m[1]);
    }
  }
  return hosts;
}

/**
 * Throws unless `url` is EXACTLY the dedicated local test database. Returns the url when safe.
 * Checks, all of which must hold:
 *   - parses as a postgres URL
 *   - host is 127.0.0.1 or localhost
 *   - port is the dedicated test port
 *   - database name is the dedicated test database name
 *   - host is not (or contain) a known cloud/database provider fragment
 *   - target (host:port/db) is not the database configured in backend/.env
 */
export function assertSafeTestDatabase(url, label = "database") {
  if (!url || typeof url !== "string") throw new Error(`REFUSING: no ${label} URL supplied.`);
  let u;
  try { u = new URL(url); } catch { throw new Error(`REFUSING: ${label} URL is not parseable.`); }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error(`REFUSING: ${label} is not a postgres URL.`);

  const host = u.hostname.toLowerCase();
  const port = Number(u.port || 5432);
  const dbName = decodeURIComponent(u.pathname.replace(/^\//, ""));

  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`REFUSING: ${label} host "${host}" is not localhost.`);
  if (port !== TEST_PORT) throw new Error(`REFUSING: ${label} port ${port} is not the dedicated test port ${TEST_PORT}.`);
  if (dbName !== TEST_DB_NAME) throw new Error(`REFUSING: ${label} name "${dbName}" is not "${TEST_DB_NAME}".`);
  for (const frag of FORBIDDEN_HOST_FRAGMENTS) {
    if (host.includes(frag)) throw new Error(`REFUSING: ${label} host contains forbidden fragment "${frag}".`);
  }
  if (configuredRealTargets().has(`${host}:${port}/${dbName}`)) throw new Error(`REFUSING: ${label} is the same database configured in backend/.env.`);
  return url;
}
