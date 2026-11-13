// Initialises the disposable test database exactly the way production's schema is built:
//   1. `prisma db push`   (the project's schema workflow)
//   2. the SQL objects db push cannot express (CHECK constraints + partial unique indexes)
// Refuses to run against anything but the dedicated local container. Never uses `migrate`.
//   npm run test:db:init
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { BACKEND_DIR, TEST_DATABASE_URL, assertSafeTestDatabase } from "./config.mjs";

const url = assertSafeTestDatabase(process.env.TEST_DATABASE_URL || TEST_DATABASE_URL, "test database");

console.log("1/2 prisma db push (test database only)…");
// DATABASE_URL is overridden explicitly for the child; dotenv never overrides an already-set variable.
const push = spawnSync("npx", ["prisma", "db", "push", "--accept-data-loss"], {
  cwd: BACKEND_DIR,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: url,
    DB_POOL_MAX: "1",
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "(Recommended) Yes, proceed with prisma db push on the local test database (127.0.0.1:54329)",
  },
});
if (push.status !== 0) { console.error("db push failed"); process.exit(1); }

console.log("2/2 applying custom SQL objects…");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  // Re-assert the target on the live connection, not just on the string.
  const who = (await client.query("select current_database() db, inet_server_addr()::text addr")).rows[0];
  if (who.db !== "mybhagya_test") throw new Error(`REFUSING: connected database is "${who.db}".`);
  for (const file of ["custom_db_objects.sql", "astrologer_partial_indexes.sql"]) {
    await client.query(fs.readFileSync(path.join(BACKEND_DIR, "prisma", "sql", file), "utf8"));
    console.log(`   applied ${file}`);
  }
} finally { await client.end(); }
console.log("done. Verify with: npm run test:db:verify");
