// Read-only comparison of the disposable test database's schema objects against the real database's
// catalog. Proves the test database enforces the SAME CHECK constraints, indexes (incl. partial unique
// ones), triggers, functions and views as production — so a green test run means something.
//
// The real database is opened in a READ ONLY transaction and only catalog views are queried; nothing is
// written and no table data is read. Exit code 0 = identical, 1 = mismatch.
//   npm run test:db:verify
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { BACKEND_DIR, TEST_DATABASE_URL, assertSafeTestDatabase } from "./config.mjs";

const QUERIES = {
  checks: `select conrelid::regclass::text as tbl, conname as name, pg_get_constraintdef(oid) as def from pg_constraint where contype='c' and connamespace='public'::regnamespace order by 1,2`,
  indexes: `select tablename as tbl, indexname as name, indexdef as def from pg_indexes where schemaname='public' and indexname <> '_prisma_migrations_pkey' order by 1,2`,
  triggers: `select tgrelid::regclass::text as tbl, tgname as name, pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal order by 1,2`,
  functions: `select 'fn' as tbl, p.proname as name, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 2`,
  views: `select 'view' as tbl, viewname as name, definition as def from pg_views where schemaname='public' order by 2`,
};

function realUrl() {
  const file = path.join(BACKEND_DIR, ".env");
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, "utf8").match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  return m ? m[1] : null;
}

const testUrl = assertSafeTestDatabase(process.env.TEST_DATABASE_URL || TEST_DATABASE_URL, "test database");
const real = realUrl();
if (!real) { console.error("No DATABASE_URL in backend/.env — cannot compare against the real catalog."); process.exit(2); }

const local = new pg.Client({ connectionString: testUrl });
const remote = new pg.Client({ connectionString: real, ssl: { rejectUnauthorized: false } });
await local.connect();
await remote.connect();
let mismatches = 0;
try {
  await remote.query("BEGIN READ ONLY");
  for (const [kind, sql] of Object.entries(QUERIES)) {
    const a = (await remote.query(sql)).rows;
    const b = (await local.query(sql)).rows;
    const am = new Map(a.map((r) => [`${r.tbl}.${r.name}`, r.def]));
    const bm = new Map(b.map((r) => [`${r.tbl}.${r.name}`, r.def]));
    const missing = [...am.keys()].filter((k) => !bm.has(k));
    const extra = [...bm.keys()].filter((k) => !am.has(k));
    const different = [...am.keys()].filter((k) => bm.has(k) && am.get(k) !== bm.get(k));
    const bad = missing.length + extra.length + different.length;
    mismatches += bad;
    console.log(`${bad === 0 ? "OK  " : "FAIL"} ${kind.padEnd(9)} real=${a.length} test=${b.length}`);
    for (const k of missing) console.log(`       missing in test DB : ${k}`);
    for (const k of extra) console.log(`       extra in test DB   : ${k}`);
    for (const k of different) console.log(`       definition differs : ${k}\n         real: ${am.get(k)}\n         test: ${bm.get(k)}`);
  }
  await remote.query("ROLLBACK");
} finally {
  await remote.end();
  await local.end();
}
console.log(mismatches === 0 ? "\nVERIFIED: test database matches the real database's constraints, indexes, triggers, functions and views." : `\n${mismatches} mismatch(es).`);
process.exit(mismatches === 0 ? 0 : 1);
