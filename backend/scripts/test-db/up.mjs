// Starts (or reuses) the disposable PostgreSQL 17 container, bound to 127.0.0.1 only.
//   npm run test:db:up
import { spawnSync } from "node:child_process";
import { CONTAINER_NAME, IMAGE, TEST_HOST, TEST_PORT, TEST_USER, TEST_PASSWORD, TEST_DB_NAME, TEST_DATABASE_URL, assertSafeTestDatabase } from "./config.mjs";

assertSafeTestDatabase(TEST_DATABASE_URL, "test database");
const docker = (...args) => spawnSync("docker", args, { encoding: "utf8" });

const info = docker("info", "--format", "{{.ServerVersion}}");
if (info.status !== 0) { console.error("Docker is not running. Start Docker Desktop and retry."); process.exit(1); }

const existing = docker("ps", "-a", "--filter", `name=^${CONTAINER_NAME}$`, "--format", "{{.Status}}").stdout.trim();
if (!existing) {
  const run = docker("run", "-d", "--name", CONTAINER_NAME,
    "-e", `POSTGRES_USER=${TEST_USER}`, "-e", `POSTGRES_PASSWORD=${TEST_PASSWORD}`, "-e", `POSTGRES_DB=${TEST_DB_NAME}`,
    "-p", `${TEST_HOST}:${TEST_PORT}:5432`, IMAGE);
  if (run.status !== 0) { console.error(run.stderr); process.exit(1); }
  console.log(`created container ${CONTAINER_NAME} (${IMAGE}) on ${TEST_HOST}:${TEST_PORT}`);
} else if (!/^Up/.test(existing)) {
  const start = docker("start", CONTAINER_NAME);
  if (start.status !== 0) { console.error(start.stderr); process.exit(1); }
  console.log(`started existing container ${CONTAINER_NAME}`);
} else {
  console.log(`container ${CONTAINER_NAME} already running`);
}

for (let i = 0; i < 40; i++) {
  if (docker("exec", CONTAINER_NAME, "pg_isready", "-U", TEST_USER, "-d", TEST_DB_NAME).status === 0) { console.log("PostgreSQL is ready."); process.exit(0); }
  await new Promise((r) => setTimeout(r, 1500));
}
console.error("PostgreSQL did not become ready in time."); process.exit(1);
